import { Router, type IRouter, type Request, type Response } from "express";
import { SpeechClient } from "@google-cloud/speech";
import multer from "multer";
import { getAI } from "./ai.js";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

// The realtime endpoint is upgraded by the HTTP server before Express sees it.
// Keep a lightweight HTTP response as well so the artifact health probe does
// not report a false 500/failed service while WebSocket clients are healthy.
router.get("/stt/live", (_req: Request, res: Response) => {
  res.json({
    status: "ready",
    transport: "websocket",
    deepgramConfigured: Boolean(process.env["DEEPGRAM_API_KEY"]),
  });
});

router.get("/stt/health", (_req: Request, res: Response) => {
  const geminiConfigured = Boolean(
    process.env["GEMINI_API_KEY"]
    ?? process.env["GEMINI API KEY"]
    ?? process.env["GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON"],
  );
  const googleSpeechConfigured = Boolean(
    process.env["GOOGLE_CLOUD_SPEECH_SERVICE_ACCOUNT_JSON"]
    ?? process.env["GOOGLE_CLOUD_TTS_SERVICE_ACCOUNT_JSON"],
  );
  const deepgramConfigured = Boolean(process.env["DEEPGRAM_API_KEY"]);
  res.json({
    status: deepgramConfigured || googleSpeechConfigured || geminiConfigured ? "ready" : "misconfigured",
    providers: {
      deepgram: deepgramConfigured,
      googleCloudSpeech: googleSpeechConfigured,
      geminiFallback: geminiConfigured,
    },
  });
});

const LANGUAGE_CODES: Record<string, string> = {
  English: "en-IN",
  Hindi: "hi-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
  Bengali: "bn-IN",
  Marathi: "mr-IN",
  Gujarati: "gu-IN",
  Kannada: "kn-IN",
  Malayalam: "ml-IN",
  Punjabi: "pa-IN",
  Odia: "or-IN",
  Assamese: "as-IN",
  Urdu: "ur-IN",
};

let googleSpeechClient: SpeechClient | null = null;
const WORKPLACE_PHRASES = [
  "CRM", "customer relationship management", "lead generation", "sales pipeline",
  "follow up", "prospect", "conversion", "target", "objection handling",
  "Excel", "dashboard", "KPI", "SLA", "SQL", "KYC", "underwriting",
  "customer service", "business analyst", "software developer",
];

function isLikelyCorruptedIndicTranscript(text: string, language: string): boolean {
  if (language === "English") return false;
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (words.length < 4) return false;
  const singleIndicLetters = words.filter((word) =>
    /^[\u0900-\u0D7F\u0600-\u06FF]$/u.test(word.replace(/[,.!?।॥]/gu, "")),
  ).length;
  return singleIndicLetters >= 3 && singleIndicLetters / words.length >= 0.45;
}

function getGoogleSpeechClient(): SpeechClient {
  if (googleSpeechClient) return googleSpeechClient;
  const rawCredentials =
    process.env["GOOGLE_CLOUD_SPEECH_SERVICE_ACCOUNT_JSON"]
    ?? process.env["GOOGLE_CLOUD_TTS_SERVICE_ACCOUNT_JSON"];
  if (!rawCredentials) {
    throw new Error("GOOGLE_CLOUD_TTS_SERVICE_ACCOUNT_JSON is not configured");
  }
  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(rawCredentials) as { client_email: string; private_key: string };
  } catch {
    // Sanitize any raw carriage returns / unescaped newlines
    const sanitized = rawCredentials.replace(/\r/g, "").replace(/\n/g, "\\n");
    credentials = JSON.parse(sanitized) as { client_email: string; private_key: string };
  }
  googleSpeechClient = new SpeechClient({ credentials });
  return googleSpeechClient;
}

async function transcribeWithGoogleCloud(
  buffer: Buffer,
  mimeType: string,
  language: string,
): Promise<string> {
  const encoding = mimeType.includes("ogg") ? "OGG_OPUS" : "WEBM_OPUS";
  const [response] = await getGoogleSpeechClient().recognize({
    audio: { content: buffer.toString("base64") },
    config: {
      encoding,
      // MediaRecorder emits Opus at the browser's standard 48 kHz rate, but
      // the WebM container often omits that metadata. Google otherwise reads
      // it as 0 Hz and rejects the request before transcription begins.
      sampleRateHertz: 48000,
      languageCode: LANGUAGE_CODES[language] ?? "en-IN",
      // Keep Indian English primary, but allow Google's recognizer to resolve
      // common US/UK pronunciations used inside Indian workplace speech.
      ...(language === "English" ? { alternativeLanguageCodes: ["en-US", "en-GB"] } : {}),
      // Candidate turns are bounded by the client VAD. Hindi needs the
      // long-form recognizer: latest_short frequently drops Devanagari vowel
      // signs and turns "कैसे" into "क स". English can stay on the quicker
      // short-form model for conversational latency.
      model: language === "English" ? "latest_short" : "latest_long",
      enableAutomaticPunctuation: true,
      // These phrases are English workplace vocabulary. Applying them to
      // Hindi/Marathi or another native-language turn biases recognition into
      // unrelated fragments and malformed single-letter output.
      ...(language === "English"
        ? { speechContexts: [{ phrases: WORKPLACE_PHRASES, boost: 8 }] }
        : {}),
      // Preserve word boundaries and improve clarity for names, tools, and
      // interview terminology without changing the authoritative server STT
      // path or reintroducing browser SpeechRecognition.
      useEnhanced: true,
    },
  }, {});
  const transcript = (response.results ?? [])
    .map((result) => result.alternatives?.[0]?.transcript ?? "")
    .join(" ")
    .trim();
  if (isLikelyCorruptedIndicTranscript(transcript, language)) {
    throw new Error("Google Cloud returned a low-quality native-language transcript");
  }
  return transcript;
}

async function transcribeWithGemini(
  buffer: Buffer,
  mimeType: string,
  language: string,
): Promise<string> {
  const audioMimeType = mimeType.toLowerCase().includes("mp4")
    ? "audio/mp4"
    : mimeType.toLowerCase().includes("ogg")
      ? "audio/ogg"
      : "audio/webm";
  const languageInstruction = language === "English"
    ? "The learner may code-switch between English and an Indian language. Preserve every spoken language and use its normal written script."
    : `The selected language is ${language}. Preserve the words as spoken; do not translate them into English.`;
  const prompt = [
    "Transcribe the attached microphone recording exactly as spoken.",
    languageInstruction,
    "Do not translate, summarize, correct grammar, answer questions, or invent missing words.",
    "Return only the transcript. If no intelligible speech is present, return an empty response.",
  ].join(" ");

  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: audioMimeType,
            data: buffer.toString("base64"),
          },
        },
      ],
    }],
    config: {
      maxOutputTokens: 1024,
      temperature: 0,
    },
  });
  return (response.text ?? "")
    .trim()
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function getDeepgramLanguage(language: string): string {
  // Deepgram accepts the Indian English locale directly. For the Indian
  // language names used by the app, use Deepgram's base language identifiers.
  // English turns may contain a native-language help phrase, so use Nova-3's
  // multilingual mode instead of forcing the whole utterance into en-IN.
  if (language === "English") return "multi";
  const languages: Record<string, string> = {
    English: "en-IN",
    Hindi: "hi",
    Tamil: "ta",
    Telugu: "te",
    Bengali: "bn",
    Marathi: "mr",
    Gujarati: "gu",
    Kannada: "kn",
    Malayalam: "ml",
    Punjabi: "pa",
    Odia: "or",
    Assamese: "as",
    Urdu: "ur",
  };
  return languages[language] ?? "en-IN";
}

async function transcribeWithDeepgram(
  buffer: Buffer,
  mimeType: string,
  language: string,
): Promise<string> {
  const apiKey = process.env["DEEPGRAM_API_KEY"];
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY is not configured");

  const params = new URLSearchParams({
    model: "nova-3",
    language: getDeepgramLanguage(language),
    smart_format: "true",
    punctuate: "true",
    utterances: "true",
    filler_words: "true",
    numerals: "true",
    paragraphs: "false",
  });
  // MediaRecorder commonly reports `audio/webm;codecs=opus`. Deepgram's
  // upload endpoint is stricter than browsers and can reject the codec
  // parameter as corrupt even though the container is valid. The container
  // type is sufficient here; Google remains the primary Indian-language path.
  const contentType = mimeType.toLowerCase().startsWith("audio/webm")
    ? "audio/webm"
    : mimeType.toLowerCase().startsWith("audio/ogg")
      ? "audio/ogg"
      : mimeType || "audio/webm";
  const response = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": contentType,
    },
    body: buffer,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Deepgram returned ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
  }
  const data = await response.json() as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{ transcript?: string }>;
      }>;
    };
  };
  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
  if (isLikelyCorruptedIndicTranscript(transcript, language)) {
    throw new Error("Deepgram returned a low-quality native-language transcript");
  }
  return transcript;
}

router.post("/stt", upload.single("audio"), async (req: Request, res: Response) => {
  if (!req.file?.buffer?.length) {
    res.status(400).json({ error: "No microphone audio was received." });
    return;
  }
  const language = String(req.body.language || "English");
  const mimeType = req.file.mimetype || "audio/webm";
  const isPreview = req.body.mode === "preview";
  // Nova is particularly reliable for natural conversational English. Google
  // remains first for Indian-language input, where its locale support is
  // stronger. Both providers are attempted before the AI fallback.
  const google = { name: "Google Cloud", run: () => transcribeWithGoogleCloud(req.file!.buffer, mimeType, language) };
  const deepgram = { name: "Deepgram Nova-3", run: () => transcribeWithDeepgram(req.file!.buffer, mimeType, language) };
  // Gemini uses the same API key already used by chat and TTS, so it remains
  // a working transcription fallback even when Deepgram or Cloud Speech
  // credentials have not been added to Railway.
  const gemini = { name: "Gemini Flash audio transcription", run: () => transcribeWithGemini(req.file!.buffer, mimeType, language) };
  const providers = language === "English"
    ? [deepgram, google, gemini]
    : [google, deepgram, gemini];

  for (const provider of providers) {
    try {
      const text = await provider.run();
      if (!text.trim()) throw new Error(`${provider.name} returned an empty transcript`);
      res.json({ text });
      return;
    } catch (error) {
      console.warn(`[stt] ${provider.name} unavailable; trying next provider:`, error);
    }
  }

  // Partial preview blobs can be too short or lack a complete container
  // header. They are display-only and must never turn a working microphone
  // session into a failed final transcription.
  if (isPreview) {
    res.json({ text: "" });
    return;
  }

  // Do not ask a general-purpose chat model to guess at failed microphone
  // audio. It can turn silence or a malformed WebM fragment into plausible
  // text, which then enters the conversation as a fake student turn.
  console.warn("[stt] all transcription providers returned no reliable transcript", {
    bytes: req.file.buffer.length,
    mimeType,
    language,
  });
  res.status(502).json({ error: "Speech transcription is temporarily unavailable. Please try speaking again." });
});

export default router;