import { Router, type IRouter, type Request, type Response } from "express";
import { SpeechClient } from "@google-cloud/speech";
import multer from "multer";
import { getAI } from "./ai.js";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
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

function getGoogleSpeechClient(): SpeechClient {
  if (googleSpeechClient) return googleSpeechClient;
  const rawCredentials = process.env.GOOGLE_CLOUD_TTS_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) {
    throw new Error("GOOGLE_CLOUD_TTS_SERVICE_ACCOUNT_JSON is not configured");
  }
  const credentials = JSON.parse(rawCredentials) as {
    client_email: string;
    private_key: string;
  };
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
      // Candidate turns are bounded by the client VAD and need to return
      // quickly enough for a conversational reply. The short-form model avoids
      // the long-form recognizer's multi-second tail on ordinary answers.
      model: "latest_short",
      enableAutomaticPunctuation: true,
      speechContexts: [{ phrases: WORKPLACE_PHRASES, boost: 8 }],
      // Preserve word boundaries and improve clarity for names, tools, and
      // interview terminology without changing the authoritative server STT
      // path or reintroducing browser SpeechRecognition.
      useEnhanced: true,
    },
  }, {});
  return (response.results ?? [])
    .map((result) => result.alternatives?.[0]?.transcript ?? "")
    .join(" ")
    .trim();
}

function getDeepgramLanguage(language: string): string {
  // Deepgram accepts the Indian English locale directly. For the Indian
  // language names used by the app, use Deepgram's base language identifiers.
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
  return data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
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
  const providers = language === "English" ? [deepgram, google] : [google, deepgram];

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

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
       model: "gemini-3.6-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              data: req.file.buffer.toString("base64"),
              mimeType,
            },
          },
          {
            text: `Transcribe this short microphone utterance exactly. Return only the spoken words, with no labels, commentary, or punctuation added. The speaker is using ${language}.`,
          },
        ],
      }],
      config: { maxOutputTokens: 512 },
    });
    res.json({ text: response.text?.trim() ?? "" });
  } catch (geminiError) {
    console.error("[stt] all transcription providers failed:", geminiError);
    res.status(502).json({ error: "Speech transcription is temporarily unavailable." });
  }
});

export default router;