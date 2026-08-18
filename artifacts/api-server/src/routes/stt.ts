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
       // latest_long is more reliable for complete candidate answers, which
       // commonly contain pauses and several clauses. The client-side VAD
       // already bounds the utterance, so this does not create an open-ended
       // recognition request.
       model: "latest_long",
      enableAutomaticPunctuation: true,
      enableSpokenPunctuation: true,
    },
  }, {});
  return (response.results ?? [])
    .map((result) => result.alternatives?.[0]?.transcript ?? "")
    .join(" ")
    .trim();
}

router.post("/stt", upload.single("audio"), async (req: Request, res: Response) => {
  if (!req.file?.buffer?.length) {
    res.status(400).json({ error: "No microphone audio was received." });
    return;
  }
  const language = String(req.body.language || "English");
  const mimeType = req.file.mimetype || "audio/webm";
  try {
    // Google Cloud is the low-latency primary for Interview Ace. Gemini's
    // project is currently quota-exhausted, and trying it first adds 5–6
    // seconds before this same reliable fallback can return the transcript.
    const text = await transcribeWithGoogleCloud(req.file.buffer, mimeType, language);
    res.json({ text });
    return;
  } catch (googleError) {
    console.warn("[stt] Google Cloud Speech-to-Text unavailable; trying Gemini:", googleError);
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
  } catch (googleError) {
    console.error("[stt] all transcription providers failed:", googleError);
    res.status(502).json({ error: "Speech transcription is temporarily unavailable." });
  }
});

export default router;