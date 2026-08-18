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
      // MediaRecorder commonly emits WEBM/Opus without a reliable container
      // sample-rate header. Supplying the capture rate prevents Google Cloud
      // from rejecting valid audio with "Opus sample rate (0)".
      sampleRateHertz: 48000,
      languageCode: LANGUAGE_CODES[language] ?? "en-IN",
      model: "latest_short",
      enableAutomaticPunctuation: true,
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
    const ai = getAI();
    const response = await ai.models.generateContent({
      // Keep Gemini first while it is available; Google Cloud below is the
      // reliable fallback when the Gemini project is quota-exhausted.
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
      config: { maxOutputTokens: 8192 },
    });
    res.json({ text: response.text?.trim() ?? "" });
    return;
  } catch (geminiError) {
    console.warn("[stt] Gemini unavailable; trying Google Cloud Speech-to-Text:", geminiError);
  }

  try {
    const text = await transcribeWithGoogleCloud(req.file.buffer, mimeType, language);
    res.json({ text });
  } catch (googleError) {
    console.error("[stt] all transcription providers failed:", googleError);
    res.status(502).json({ error: "Speech transcription is temporarily unavailable." });
  }
});

export default router;