import { Router, type IRouter, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { AiChatBody } from "@workspace/api-zod";
import {
  applyNativeLanguagePolicy,
  isDeterministicLanguageSwitch,
  nativeLanguageConfirmation,
} from "../lib/native-language-policy";

const router: IRouter = Router();

function parseAiRequest(req: Request, res: Response): {
  prompt: string;
  system?: string | null;
  maxTokens?: number | null;
} | null {
  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return null;
  }
  const { prompt, system, maxTokens } = parsed.data;
  if (prompt.length > 20_000 || (system?.length ?? 0) > 10_000) {
    res.status(413).json({ error: "AI request is too large." });
    return null;
  }
  if (maxTokens != null && (!Number.isFinite(maxTokens) || maxTokens < 1 || maxTokens > 4_000)) {
    res.status(400).json({ error: "maxTokens must be between 1 and 4000." });
    return null;
  }
  return { prompt, system, maxTokens };
}

// These stable model IDs are available through Vertex AI and are billed to the
// Google Cloud project attached to the service account. The API-key path is
// retained only as a compatibility fallback for environments without Vertex.
const GEMINI_MODEL_CHAIN = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;
const ANTHROPIC_MODEL_CHAIN = ["claude-haiku-4-5", "claude-sonnet-4-5"] as const;
const GROQ_MODEL = process.env["GROQ_MODEL"] || "openai/gpt-oss-20b";
const MISTRAL_MODEL = process.env["MISTRAL_MODEL"] || "mistral-small-latest";

// Apply language-quality guidance at the shared AI boundary so Journey, Tools,
// Rozgar, interviews, and Live Conversation all receive the same native-
// language rules. Client prompts remain free to choose the language; this only
// activates when an Indian language is actually requested.
const INDIAN_LANGUAGE_QUALITY_RULE = `Language quality rule: When producing an Indian-language response, write natural conversational language in its standard native script. Preserve every vowel sign, matra, diacritic, and word boundary. Never drop vowel marks, split words into isolated consonants, invent phonetic spellings, or mix grammar from another Indian language. For Hindi or Marathi, use complete, correctly joined Devanagari words. If you cannot form a correct native-script sentence, answer in clear English rather than emitting broken script.`;

function applyLanguageQuality(prompt: string, system?: string | null): string | null | undefined {
  const requestedText = `${prompt}\n${system ?? ""}`;
  const nativePolicy = applyNativeLanguagePolicy(prompt, system);
  if (!/(?:Hindi|Marathi|Tamil|Telugu|Bengali|Gujarati|Kannada|Malayalam|Punjabi|Odia|Assamese|Urdu|हिंदी|हिन्दी|मराठी|देवनागरी|matra|मात्रा|বাংলা|తెలుగు|தமிழ்|ગુજરાતી|ಕನ್ನಡ|മലയാളം|ਪੰਜਾਬੀ|ଓଡ଼ିଆ|اردو|অসমীয়া)/iu.test(requestedText)) {
    return nativePolicy;
  }
  return `${nativePolicy ? `${nativePolicy}\n\n` : ""}${INDIAN_LANGUAGE_QUALITY_RULE}`;
}

function setSseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
}

function writeDeterministicSseResponse(res: Response, text: string) {
  res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

function getAnthropicModelChain(_maxTokens: number, qualityFirst = false) {
  // Live coaching, interview evaluation, and generated lessons can opt into
  // the faster Haiku model first so spoken replies begin promptly. Sonnet
  // remains the stronger model fallback. The default uses the same order.
  return qualityFirst
    ? [ANTHROPIC_MODEL_CHAIN[0], ANTHROPIC_MODEL_CHAIN[1]]
    : ANTHROPIC_MODEL_CHAIN;
}

type VertexServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

let vertexAI: GoogleGenAI | null = null;

function isVertexAIConfigured(): boolean {
  return Boolean(process.env["GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON"]);
}

function getGeminiConfig(maxOutputTokens: number) {
  return {
    maxOutputTokens,
    ...(isVertexAIConfigured() ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
  };
}

function getVertexAI(): GoogleGenAI {
  if (vertexAI) return vertexAI;
  const rawCredentials = process.env["GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON"];
  if (!rawCredentials) {
    throw new Error("GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON is not configured");
  }

  let credentials: VertexServiceAccount;
  try {
    credentials = JSON.parse(rawCredentials) as VertexServiceAccount;
  } catch {
    throw new Error("GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  if (!credentials.project_id || !credentials.client_email || !credentials.private_key) {
    throw new Error("GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON is missing required service-account fields");
  }

  vertexAI = new GoogleGenAI({
    vertexai: true,
    project: credentials.project_id,
    location: process.env["GOOGLE_VERTEX_LOCATION"] || "global",
    googleAuthOptions: {
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    },
  });
  return vertexAI;
}

export function getAI() {
  // Vertex AI is preferred when the service-account secret is present. The
  // API-key path remains available for older environments and local setups.
  if (process.env["GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON"]) return getVertexAI();

  // Support both underscore and space variants (Replit sometimes stores secrets with spaces)
  const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["GEMINI API KEY"];
  if (!apiKey) {
    throw new Error("Neither Vertex AI service account nor GEMINI_API_KEY is configured");
  }
  return new GoogleGenAI({ apiKey });
}

function getAnthropic() {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

function buildContents(prompt: string, system?: string | null) {
  const contents: { role: string; parts: { text: string }[] }[] = [];
  if (system) {
    contents.push({ role: "user", parts: [{ text: system }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions." }] });
  }
  contents.push({ role: "user", parts: [{ text: prompt }] });
  return contents;
}

function isRateLimit(err: unknown): boolean {
  const e = err as { status?: number };
  return e?.status === 429 || e?.status === 503 || e?.status === 529;
}

function isAuthError(err: unknown): boolean {
  const e = err as { status?: number };
  return e?.status === 401 || e?.status === 403;
}

function retryDelayMs(err: unknown): number {
  try {
    const msg = (err as { message?: string }).message ?? "";
    const match = msg.match(/"retryDelay":\s*"(\d+)s"/);
    if (match) return Math.min(parseInt(match[1]) * 1000, 8000);
  } catch { /* ignore */ }
  return 3000;
}

type QualityProvider = "claude" | "groq" | "mistral";
const qualityProviderBackoffUntil = new Map<QualityProvider, number>();

function isQualityProviderReady(provider: QualityProvider): boolean {
  return (qualityProviderBackoffUntil.get(provider) ?? 0) <= Date.now();
}

function pauseQualityProvider(provider: QualityProvider, err: unknown) {
  const message = ((err as { message?: string }).message ?? "").toLowerCase();
  const unavailable = isRateLimit(err)
    || isAuthError(err)
    || /credit balance|insufficient credit|empty response/.test(message);
  if (!unavailable) return;

  const cooldownMs = isRateLimit(err)
    ? Math.max(retryDelayMs(err), 120_000)
    : provider === "claude" ? 15 * 60_000 : 2 * 60_000;
  qualityProviderBackoffUntil.set(provider, Date.now() + cooldownMs);
}

function userFriendlyError(err: unknown): string {
  const e = err as { status?: number; message?: string };
  if (e?.status === 429) {
    const match = e.message?.match(/retry in ([\d.]+)s/i);
    const secs = match ? Math.ceil(parseFloat(match[1])) : 30;
    return `AI quota reached — please wait ${secs} seconds and try again.`;
  }
  if (e?.status === 503) return "AI is temporarily busy — please try again in a moment.";
  return "AI request failed — please try again.";
}

async function streamGemini(
  req: Request,
  res: Response,
  prompt: string,
  system: string | null | undefined,
  maxTokens: number,
  state: { wrote: boolean },
) {
  const ai = getAI();
  const contents = buildContents(prompt, system);

  // Vertex streaming has occasionally closed after only the first few words
  // in this runtime. A complete Vertex response is safer for voice turns than
  // forwarding an incomplete sentence; it is still emitted as SSE so clients
  // keep the same response contract.
  if (isVertexAIConfigured()) {
    for (let i = 0; i < GEMINI_MODEL_CHAIN.length; i++) {
      const model = GEMINI_MODEL_CHAIN[i]!;
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: getGeminiConfig(maxTokens),
        });
        const text = response.text?.trim();
        if (!text) {
          if (i < GEMINI_MODEL_CHAIN.length - 1) {
            req.log.warn({ model }, "Vertex Gemini returned an empty response — trying next model");
            continue;
          }
          throw new Error(`${model} returned an empty response`);
        }
        state.wrote = true;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      } catch (err) {
        const isLast = i === GEMINI_MODEL_CHAIN.length - 1;
        if ((isRateLimit(err) || isAuthError(err)) && !isLast) {
          req.log.warn({ model, err }, "Vertex Gemini issue — trying next model");
          continue;
        }
        throw err;
      }
    }
    return;
  }

  for (let i = 0; i < GEMINI_MODEL_CHAIN.length; i++) {
    const model = GEMINI_MODEL_CHAIN[i]!;
    try {
      const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: getGeminiConfig(maxTokens),
      });
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) { state.wrote = true; res.write(`data: ${JSON.stringify({ content: text })}\n\n`); }
      }
      if (!state.wrote) {
        // Vertex can occasionally close a stream without exposing its text
        // chunks. Retry the same request through the non-streaming method
        // before treating the model as unavailable; this also avoids sending
        // a harmless transient empty stream to the slower provider fallback.
        const response = await ai.models.generateContent({
          model,
          contents,
          config: getGeminiConfig(maxTokens),
        });
        const text = response.text?.trim();
        if (text) {
          state.wrote = true;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        } else if (i < GEMINI_MODEL_CHAIN.length - 1) {
          req.log.warn({ model }, "Gemini returned an empty streaming and non-streaming response — trying next model");
          continue;
        } else {
          throw new Error(`${model} returned an empty response`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    } catch (err) {
      const isLast = i === GEMINI_MODEL_CHAIN.length - 1;
      if (isRateLimit(err) && !isLast) {
        req.log.warn({ model, err }, "Rate limited — trying fallback model");
        const delay = retryDelayMs(err);
        if (delay < 5000) await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

async function streamAnthropic(
  req: Request,
  res: Response,
  prompt: string,
  system: string | null | undefined,
  maxTokens: number,
  state: { wrote: boolean },
  qualityFirst = false,
) {
  const anthropic = getAnthropic();
  if (!anthropic) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const messages: Array<{ role: "user"; content: string }> = [{ role: "user", content: prompt }];
  const systemPrompt = system ?? undefined;
  const modelChain = getAnthropicModelChain(maxTokens, qualityFirst);

  for (let i = 0; i < modelChain.length; i++) {
    const model = modelChain[i]!;
    try {
      const stream = anthropic.messages.stream({
        model,
        max_tokens: maxTokens,
        messages,
        ...(systemPrompt ? { system: systemPrompt } : {}),
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          state.wrote = true;
          res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    } catch (err) {
      const isLast = i === modelChain.length - 1;
      if ((isRateLimit(err) || isAuthError(err)) && !isLast) {
        req.log.warn({ model, err }, "Claude issue — trying fallback model");
        continue;
      }
      throw err;
    }
  }
}

function getMistralApiKey(): string {
  const apiKey = process.env["MISTRAL_API_KEY"] ?? process.env["MISTRAL API KEY"];
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured");
  return apiKey;
}

async function requestMistralStream(
  prompt: string,
  system: string | null | undefined,
  maxTokens: number,
  onText: (text: string) => void,
): Promise<string> {
  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ];
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getMistralApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Mistral returned ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
  }
  return readGroqStream(response, onText);
}

async function streamMistral(
  req: Request,
  res: Response,
  prompt: string,
  system: string | null | undefined,
  maxTokens: number,
  state: { wrote: boolean },
) {
  const text = await requestMistralStream(prompt, system, maxTokens, (text) => {
    state.wrote = true;
    res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
  });
  if (!text.trim()) throw new Error("Mistral returned an empty response");
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

function getGroqApiKey(): string {
  const apiKey = process.env["GROQ_API_KEY"] ?? process.env["GROQ API KEY"];
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
  return apiKey;
}

type OpenAIStreamChunk = {
  choices?: Array<{ delta?: { content?: string } }>;
};

async function readGroqStream(
  response: globalThis.Response,
  onText: (text: string) => void,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Groq returned an empty response stream");
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  const processLine = (line: string) => {
    if (!line.startsWith("data: ")) return;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") return;
    const chunk = JSON.parse(payload) as OpenAIStreamChunk;
    const text = chunk.choices?.[0]?.delta?.content ?? "";
    if (text) {
      full += text;
      onText(text);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) processLine(line.trim());
    }
    if (buffer.trim()) processLine(buffer.trim());
  } finally {
    reader.releaseLock();
  }
  return full;
}

async function requestGroqStream(
  prompt: string,
  system: string | null | undefined,
  maxTokens: number,
  onText: (text: string) => void,
): Promise<string> {
  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ];
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGroqApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      ...(GROQ_MODEL.startsWith("openai/gpt-oss-") ? { reasoning_effort: "low" } : {}),
      stream: true,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Groq returned ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
  }
  return readGroqStream(response, onText);
}

async function streamGroq(
  req: Request,
  res: Response,
  prompt: string,
  system: string | null | undefined,
  maxTokens: number,
  state: { wrote: boolean },
) {
  const text = await requestGroqStream(prompt, system, maxTokens, (text) => {
    state.wrote = true;
    res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
  });
  if (!text.trim()) throw new Error("Groq returned an empty response");
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

router.post("/ai/stream", async (req, res) => {
  const parsed = parseAiRequest(req, res);
  if (!parsed) return;
  const { prompt, system: rawSystem, maxTokens } = parsed;
  const system = applyLanguageQuality(prompt, rawSystem);

  setSseHeaders(res);
  const directLanguage = isDeterministicLanguageSwitch(prompt);
  if (directLanguage) {
    writeDeterministicSseResponse(res, nativeLanguageConfirmation(directLanguage));
    return;
  }

  const hasClaudeKey = Boolean(process.env["ANTHROPIC_API_KEY"]);
  const tokens = maxTokens ?? 8192;
  const state = { wrote: false };
  const preferGroq = req.query.provider === "groq";
  const preferQuality = req.query.provider === "quality";

  try {
    // Quality live turns prioritise Claude Sonnet, then Claude Haiku. Gemini is
    // intentionally skipped here: this project has repeatedly seen its quota
    // fail before any bytes stream, which adds dead air to voice interactions.
    // Mistral is tried before Groq because it remains available when Groq's
    // daily allowance is exhausted. Short provider cooldowns avoid retrying a
    // known unavailable service on every spoken turn.
    if (preferQuality) {
      if (hasClaudeKey && isQualityProviderReady("claude")) {
        try {
          await streamAnthropic(req, res, prompt, system, tokens, state, true);
          return;
        } catch (claudeErr) {
          if (state.wrote) throw claudeErr;
          pauseQualityProvider("claude", claudeErr);
          req.log.warn({ err: claudeErr }, "Claude quality stream failed — falling back to Mistral");
        }
      }
      if (isQualityProviderReady("mistral")) {
        try {
          await streamMistral(req, res, prompt, system, tokens, state);
          return;
        } catch (mistralErr) {
          if (state.wrote) throw mistralErr;
          pauseQualityProvider("mistral", mistralErr);
          req.log.warn({ err: mistralErr }, "Mistral quality fallback failed — falling back to Groq");
        }
      }
      await streamGroq(req, res, prompt, system, tokens, state);
      return;
    }
    // Live Conversation opts into Groq directly so unavailable Claude/Gemini
    // providers cannot consume the browser's short live-turn timeout first.
    if (preferGroq) {
      try {
        await streamGroq(req, res, prompt, system, tokens, state);
        return;
      } catch (groqErr) {
        if (state.wrote) throw groqErr;
        req.log.warn({ err: groqErr }, "Groq live stream failed — falling back to Mistral");
        await streamMistral(req, res, prompt, system, tokens, state);
        return;
      }
    }
    // Claude is the reliable primary. Gemini's free tier is frequently quota-
    // exhausted (429) or 404s on unavailable models, which adds a multi-second
    // dead delay before every answer and makes live chat feel broken. Try Claude
    // first when a key is present; fall back to Gemini only if Claude fails
    // BEFORE any bytes were streamed (we can't safely restart a live stream).
    if (hasClaudeKey) {
      try {
        await streamAnthropic(req, res, prompt, system, tokens, state);
        return;
      } catch (claudeErr) {
        if (state.wrote) throw claudeErr;
        req.log.warn({ err: claudeErr }, "Claude streaming failed — falling back to Gemini");
         try {
           await streamGemini(req, res, prompt, system, tokens, state);
         } catch (geminiErr) {
           if (state.wrote) throw geminiErr;
            req.log.warn({ err: geminiErr }, "Gemini streaming failed — falling back to Groq");
            try {
              await streamGroq(req, res, prompt, system, tokens, state);
            } catch (groqErr) {
              if (state.wrote) throw groqErr;
              req.log.warn({ err: groqErr }, "Groq streaming failed — falling back to Mistral");
              await streamMistral(req, res, prompt, system, tokens, state);
            }
         }
      }
    } else {
       try {
         await streamGemini(req, res, prompt, system, tokens, state);
       } catch (geminiErr) {
         if (state.wrote) throw geminiErr;
          req.log.warn({ err: geminiErr }, "Gemini streaming failed — falling back to Groq");
          try {
            await streamGroq(req, res, prompt, system, tokens, state);
          } catch (groqErr) {
            if (state.wrote) throw groqErr;
            req.log.warn({ err: groqErr }, "Groq streaming failed — falling back to Mistral");
            await streamMistral(req, res, prompt, system, tokens, state);
          }
       }
    }
  } catch (err) {
    req.log.error({ err }, "AI streaming error");
    if (!state.wrote) {
      res.write(`data: ${JSON.stringify({ error: userFriendlyError(err) })}\n\n`);
    }
    res.end();
  }
});

// Gemini-only streaming endpoint for feeds that explicitly need Gemini
// enrichment. The normal /ai/stream endpoint intentionally keeps its
// Claude-first fallback for low-latency tutoring and interview turns.
router.post("/ai/gemini-stream", async (req, res) => {
  const parsed = parseAiRequest(req, res);
  if (!parsed) return;
  const { prompt, system: rawSystem, maxTokens } = parsed;
  const system = applyLanguageQuality(prompt, rawSystem);
  setSseHeaders(res);
  const directLanguage = isDeterministicLanguageSwitch(prompt);
  if (directLanguage) {
    writeDeterministicSseResponse(res, nativeLanguageConfirmation(directLanguage));
    return;
  }
  const state = { wrote: false };

  try {
    await streamGemini(req, res, prompt, system, maxTokens ?? 8192, state);
  } catch (err) {
    req.log.error({ err }, "Gemini feed streaming error");
    // Rozgar should remain useful during Gemini quota/model outages. If Gemini
    // failed before emitting any content, use the normal fallback providers
    // server-side while keeping this endpoint Gemini-first.
    if (!state.wrote && process.env["ANTHROPIC_API_KEY"]) {
      try {
        await streamAnthropic(req, res, prompt, system, maxTokens ?? 8192, state);
        return;
      } catch (fallbackErr) {
        req.log.error({ err: fallbackErr }, "Gemini feed fallback error");
      }
    }
    if (!state.wrote) {
      try {
        await streamGroq(req, res, prompt, system, maxTokens ?? 8192, state);
        return;
      } catch (fallbackErr) {
        req.log.warn({ err: fallbackErr }, "Gemini feed Groq fallback unavailable");
      }
    }
    if (!state.wrote) {
      try {
        await streamMistral(req, res, prompt, system, maxTokens ?? 8192, state);
        return;
      } catch (fallbackErr) {
        req.log.warn({ err: fallbackErr }, "Gemini feed Mistral fallback unavailable");
      }
    }
    if (!state.wrote) {
      res.write(`data: ${JSON.stringify({ error: userFriendlyError(err) })}\n\n`);
    }
    res.end();
  }
});

router.post("/ai/chat", async (req, res) => {
  const parsed = parseAiRequest(req, res);
  if (!parsed) return;
  const { prompt, maxTokens, system: rawSystem } = parsed;
  const system = applyLanguageQuality(prompt, rawSystem);
  const directLanguage = isDeterministicLanguageSwitch(prompt);
  if (directLanguage) {
    res.json({ text: nativeLanguageConfirmation(directLanguage) });
    return;
  }

  const hasClaudeKey = Boolean(process.env["ANTHROPIC_API_KEY"]);

  try {
    // Try Claude first; fall back to Gemini if the entire Claude chain fails
    // (auth error, quota, etc.) just like /ai/stream does.
    let claudeFailed = false;
    if (hasClaudeKey) {
      const anthropic = getAnthropic();
      if (!anthropic) throw new Error("ANTHROPIC_API_KEY is not configured");
      const modelChain = getAnthropicModelChain(maxTokens ?? 8192);

      for (let i = 0; i < modelChain.length; i++) {
        const model = modelChain[i]!;
        try {
          const response = await anthropic.messages.create({
            model,
            max_tokens: maxTokens ?? 1024,
            messages: [{ role: "user", content: prompt }],
            ...(system ? { system } : {}),
          });
          const block = response.content.find((part) => part.type === "text");
          if (!block?.text?.trim()) {
            req.log.warn({ model }, "Claude returned an empty chat response");
            if (i === modelChain.length - 1) {
              claudeFailed = true;
              break;
            }
            continue;
          }
          res.json({ text: block?.text ?? "" });
          return;
        } catch (err) {
          const isLast = i === modelChain.length - 1;
          if ((isRateLimit(err) || isAuthError(err)) && !isLast) {
            req.log.warn({ model, err }, "Claude issue — trying fallback model");
            continue;
          }
          if (isLast) {
            req.log.warn({ model, err }, "Claude chain exhausted — falling back to Gemini");
            claudeFailed = true;
            break;
          }
          throw err;
        }
      }
    }

    if (!hasClaudeKey || claudeFailed) {
      const ai = getAI();
      const contents = buildContents(prompt, system);

      for (let i = 0; i < GEMINI_MODEL_CHAIN.length; i++) {
        const model = GEMINI_MODEL_CHAIN[i]!;
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: getGeminiConfig(maxTokens ?? 8192),
          });
          if (!response.text?.trim()) {
            req.log.warn({ model }, "Gemini returned an empty chat response");
            if (i === GEMINI_MODEL_CHAIN.length - 1) {
              throw new Error(`${model} returned an empty response`);
            }
            continue;
          }
          res.json({ text: response.text });
          return;
        } catch (err) {
          const isLast = i === GEMINI_MODEL_CHAIN.length - 1;
          if (isRateLimit(err) && !isLast) {
            req.log.warn({ model, err }, "Rate limited — trying fallback model");
            continue;
          }
          throw err;
        }
      }
    }
  } catch (err) {
    req.log.warn({ err }, "Claude/Gemini chat providers unavailable — trying Groq");
    try {
      const text = await requestGroqStream(prompt, system, maxTokens ?? 8192, () => {});
      if (!text.trim()) throw new Error("Groq returned an empty response", { cause: err });
      res.json({ text });
      return;
    } catch (groqErr) {
      req.log.warn({ err: groqErr }, "Groq chat provider unavailable — trying Mistral");
    }
    try {
      const text = await requestMistralStream(prompt, system, maxTokens ?? 8192, () => {});
      if (!text.trim()) throw new Error("Mistral returned an empty response", { cause: err });
      res.json({ text });
      return;
    } catch (mistralErr) {
      req.log.error({ err: mistralErr }, "All AI chat providers unavailable");
      res.status(503).json({ error: userFriendlyError(err) });
    }
  }
});

/**
 * Generate text with full provider fallback: Claude, Gemini, Groq, then Mistral.
 *
 * `onDelta` is called with each streamed text fragment so callers can forward
 * SSE `content` events; the full accumulated text is returned for parsing.
 * Throws a (user-friendly via userFriendlyError) error only if BOTH providers
 * fail to produce any text.
 */
export async function generateTextWithFallback(opts: {
  prompt: string;
  system?: string | null;
  maxTokens?: number;
  onDelta?: (text: string) => void;
  log?: { warn: (obj: unknown, msg?: string) => void };
  qualityFirst?: boolean;
}): Promise<string> {
  const { prompt, system: rawSystem, maxTokens = 4096, onDelta, log, qualityFirst = false } = opts;
  const system = applyLanguageQuality(prompt, rawSystem);
  let full = "";

  // ── Anthropic / Claude chain (reliable primary) ──
  const anthropic = getAnthropic();
  if (anthropic && (!qualityFirst || isQualityProviderReady("claude"))) {
    const modelChain = getAnthropicModelChain(maxTokens, qualityFirst);
    for (let i = 0; i < modelChain.length; i++) {
      if (qualityFirst && !isQualityProviderReady("claude")) break;
      const model = modelChain[i]!;
      try {
        const stream = anthropic.messages.stream({
          model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
          ...(system ? { system } : {}),
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            full += event.delta.text;
            onDelta?.(event.delta.text);
          }
        }
        if (full.trim()) return full;
      } catch (err) {
        if (qualityFirst) pauseQualityProvider("claude", err);
        log?.warn({ model, err }, "Claude model failed in generateTextWithFallback");
        continue;
      }
    }
  }
  if (full.trim()) return full;

  // Quality-first generation mirrors the low-latency live policy. It bypasses
  // Gemini's depleted quota and prefers the currently healthy Mistral service
  // before attempting Groq.
  if (qualityFirst) {
    if (isQualityProviderReady("mistral")) {
      try {
        full = "";
        const mistralText = await requestMistralStream(prompt, system, maxTokens, (text) => {
          full += text;
          onDelta?.(text);
        });
        if (mistralText.trim()) return mistralText;
      } catch (err) {
        pauseQualityProvider("mistral", err);
        log?.warn({ err }, "Mistral quality provider unavailable");
      }
    }
    if (isQualityProviderReady("groq")) {
      try {
        full = "";
        const groqText = await requestGroqStream(prompt, system, maxTokens, (text) => {
          full += text;
          onDelta?.(text);
        });
        if (groqText.trim()) return groqText;
      } catch (err) {
        pauseQualityProvider("groq", err);
        log?.warn({ err }, "Groq quality provider unavailable");
      }
    }
    return full;
  }

  // ── Gemini fallback (free tier often 429/404) ──
  try {
    const ai = getAI();
    const contents = buildContents(prompt, system);
    for (let i = 0; i < GEMINI_MODEL_CHAIN.length; i++) {
      const model = GEMINI_MODEL_CHAIN[i]!;
      try {
        const stream = await ai.models.generateContentStream({
          model, contents, config: getGeminiConfig(maxTokens),
        });
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) { full += text; onDelta?.(text); }
        }
        if (full.trim()) return full;
      } catch (err) {
        log?.warn({ model, err }, "Gemini model failed in generateTextWithFallback");
        if (isRateLimit(err)) {
          const delay = retryDelayMs(err);
          if (delay < 5000) await new Promise((r) => setTimeout(r, delay));
        }
        continue;
      }
    }
  } catch (err) {
    log?.warn({ err }, "Gemini provider unavailable");
  }
  // ── Groq fallback (fast OpenAI-compatible API) ──
  try {
    full = "";
    const groqText = await requestGroqStream(prompt, system, maxTokens, (text) => {
      full += text;
      onDelta?.(text);
    });
    if (groqText.trim()) return groqText;
  } catch (err) {
    log?.warn({ err }, "Groq provider unavailable");
  }
  // ── Mistral fallback (OpenAI-compatible streaming API) ──
  try {
    full = "";
    const mistralText = await requestMistralStream(prompt, system, maxTokens, (text) => {
      full += text;
      onDelta?.(text);
    });
    if (mistralText.trim()) return mistralText;
  } catch (err) {
    log?.warn({ err }, "Mistral provider unavailable");
  }
  return full;
}

// ---------------------------------------------------------------------------
// GET /ai/web-context?q=<query>
// Fetches a brief web context snippet from DuckDuckGo Instant Answer API
// for news/current-event queries in Live Conversation. Free, no API key.
// Returns { context: string } — empty string when nothing useful is found.
// ---------------------------------------------------------------------------
router.get("/ai/web-context", async (req: Request, res: Response) => {
  const q = ((req.query["q"] as string) || "").slice(0, 200).trim();
  if (!q) { res.json({ context: "" }); return; }

  try {
    // DuckDuckGo Instant Answer API — no key required, returns structured JSON
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(url, { signal: AbortSignal.timeout(3500) });

    if (!ddgRes.ok) { res.json({ context: "" }); return; }

    const data = await ddgRes.json() as {
      AbstractText?: string;
      Answer?: string;
      Definition?: string;
      RelatedTopics?: { Text?: string; Topics?: { Text?: string }[] }[];
    };

    // Pick the best available snippet
    let context =
      (data.AbstractText ?? data.Answer ?? data.Definition ?? "").trim();

    // Fallback: stitch top RelatedTopics snippets (including nested Topics)
    if (!context && data.RelatedTopics?.length) {
      const snippets: string[] = [];
      for (const topic of data.RelatedTopics) {
        if (topic.Text) snippets.push(topic.Text);
        if (topic.Topics) {
          for (const sub of topic.Topics) {
            if (sub.Text) snippets.push(sub.Text);
          }
        }
        if (snippets.length >= 4) break;
      }
      context = snippets.filter(Boolean).join(" ");
    }

    // Cap at 400 chars so the prompt injection stays concise
    res.json({ context: context.slice(0, 400) });
  } catch {
    res.json({ context: "" });
  }
});

export default router;
