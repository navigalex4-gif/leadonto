import { Router, type IRouter, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { AiChatBody } from "@workspace/api-zod";

const router: IRouter = Router();

// Keep the current Gemini model first. Older model IDs can return NOT_FOUND
// for newer API projects, which otherwise makes every short live turn appear
// stuck after Claude falls through.
const GEMINI_MODEL_CHAIN = ["gemini-3.6-flash", "gemini-3.5-flash-lite"] as const;
const ANTHROPIC_MODEL_CHAIN = ["claude-haiku-4-5", "claude-sonnet-4-5"] as const;
const GROQ_MODEL = process.env["GROQ_MODEL"] || "openai/gpt-oss-20b";
const MISTRAL_MODEL = process.env["MISTRAL_MODEL"] || "mistral-small-latest";

function getAnthropicModelChain(_maxTokens: number) {
  // Always try haiku first; fall back to sonnet on rate-limit regardless of token count.
  // Previously, ≤160-token calls only tried haiku with no fallback, so any haiku hiccup
  // silently returned empty text in live chat and interview ace.
  return ANTHROPIC_MODEL_CHAIN;
}

export function getAI() {
  // Support both underscore and space variants (Replit sometimes stores secrets with spaces)
  const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["GEMINI API KEY"];
  if (!apiKey) throw new Error("Gemini API key is not configured. Set GEMINI_API_KEY in secrets.");
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

  for (let i = 0; i < GEMINI_MODEL_CHAIN.length; i++) {
    const model = GEMINI_MODEL_CHAIN[i]!;
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: { maxOutputTokens: maxTokens },
      });
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) { state.wrote = true; res.write(`data: ${JSON.stringify({ content: text })}\n\n`); }
      }
      if (!state.wrote) throw new Error(`${model} returned an empty response`);
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
) {
  const anthropic = getAnthropic();
  if (!anthropic) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const messages: Array<{ role: "user"; content: string }> = [{ role: "user", content: prompt }];
  const systemPrompt = system ?? undefined;
  const modelChain = getAnthropicModelChain(maxTokens);

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
  const parseResult = AiChatBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { prompt, system, maxTokens } = parseResult.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const hasClaudeKey = Boolean(process.env["ANTHROPIC_API_KEY"]);
  const tokens = maxTokens ?? 8192;
  const state = { wrote: false };
  const preferGroq = req.query.provider === "groq";

  try {
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
  const parseResult = AiChatBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { prompt, system, maxTokens } = parseResult.data;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
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
  const parseResult = AiChatBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { prompt, maxTokens, system } = parseResult.data;

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
            config: { maxOutputTokens: maxTokens ?? 8192 },
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
      if (!text.trim()) throw new Error("Groq returned an empty response");
      res.json({ text });
      return;
    } catch (groqErr) {
      req.log.warn({ err: groqErr }, "Groq chat provider unavailable — trying Mistral");
    }
    try {
      const text = await requestMistralStream(prompt, system, maxTokens ?? 8192, () => {});
      if (!text.trim()) throw new Error("Mistral returned an empty response");
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
}): Promise<string> {
  const { prompt, system, maxTokens = 4096, onDelta, log } = opts;
  let full = "";

  // ── Anthropic / Claude chain (reliable primary) ──
  const anthropic = getAnthropic();
  if (anthropic) {
    const modelChain = getAnthropicModelChain(maxTokens);
    for (let i = 0; i < modelChain.length; i++) {
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
        log?.warn({ model, err }, "Claude model failed in generateTextWithFallback");
        continue;
      }
    }
  }
  if (full.trim()) return full;

  // ── Gemini fallback (free tier often 429/404) ──
  try {
    const ai = getAI();
    const contents = buildContents(prompt, system);
    for (let i = 0; i < GEMINI_MODEL_CHAIN.length; i++) {
      const model = GEMINI_MODEL_CHAIN[i]!;
      try {
        const stream = await ai.models.generateContentStream({
          model, contents, config: { maxOutputTokens: maxTokens },
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
