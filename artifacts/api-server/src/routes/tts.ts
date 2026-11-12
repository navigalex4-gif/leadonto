import { Router } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const router = Router();
const execFileAsync = promisify(execFile);
const GEMINI_TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts"] as const; const GEMINI_MODEL = GEMINI_TTS_MODELS[0];

const CHARACTER_GENDER: Record<string, "female" | "male"> = {
  priya: "female", rohit: "male", maya: "female", arjun: "male",
  neha: "female", rahul: "male", ananya: "female", priya_coach: "female",
  raj: "male", vikram: "male", meera_coach: "female", kabir: "male",
  sanjay: "male", aryan: "male",
};
const CHARACTER_VOICE: Record<string, string> = {
  priya: "Kore", rohit: "Puck", maya: "Aoede", arjun: "Charon",
  neha: "Leda", rahul: "Orus", ananya: "Achird", priya_coach: "Sulafat",
  raj: "Fenrir", vikram: "Alnilam", meera_coach: "Despina",
  kabir: "Rasalgethi", sanjay: "Sadaltager", aryan: "Laomedeia",
};
const GEMINI_LANGUAGES = new Set([
  "English", "Hindi", "Bangla", "Bengali", "Gujarati", "Filipino", "Finnish",
  "Dutch", "Galician", "Georgian", "French", "Greek", "German", "Haitian Creole",
  "Indonesian", "Hebrew", "Italian", "Hungarian", "Japanese", "Icelandic", "Korean",
  "Javanese", "Marathi", "Kannada", "Polish", "Konkani", "Portuguese", "Lao",
  "Romanian", "Latin", "Russian", "Latvian", "Spanish", "Lithuanian", "Tamil",
  "Luxembourgish", "Telugu", "Macedonian", "Thai", "Malagasy", "Turkish", "Malay",
  "Ukrainian", "Vietnamese", "Afrikaans", "Mongolian", "Albanian", "Nepali",
  "Amharic", "Norwegian", "Armenian", "Azerbaijani", "Persian", "Punjabi",
  "Bulgarian", "Serbian", "Burmese", "Sinhala", "Catalan", "Swahili", "Croatian",
  "Slovak", "Czech", "Slovenian", "Danish", "Swedish", "Estonian", "Urdu",
]);
const EDGE_VOICES: Record<string, { female: string; male: string }> = {
  English: { female: "en-IN-NeerjaNeural", male: "en-IN-PrabhatNeural" },
  Hindi: { female: "hi-IN-SwaraNeural", male: "hi-IN-MadhurNeural" },
  Bengali: { female: "bn-IN-TanishaaNeural", male: "bn-IN-BashkarNeural" },
  Bangla: { female: "bn-IN-TanishaaNeural", male: "bn-IN-BashkarNeural" },
  Tamil: { female: "ta-IN-PallaviNeural", male: "ta-IN-ValluvarNeural" },
  Telugu: { female: "te-IN-ShrutiNeural", male: "te-IN-MohanNeural" },
  Marathi: { female: "mr-IN-AarohiNeural", male: "mr-IN-ManoharNeural" },
  Gujarati: { female: "gu-IN-DhwaniNeural", male: "gu-IN-NiranjanNeural" },
  Kannada: { female: "kn-IN-SapnaNeural", male: "kn-IN-GaganNeural" },
  Malayalam: { female: "ml-IN-SobhanaNeural", male: "ml-IN-MidhunNeural" },
  Punjabi: { female: "pa-IN-VaaniNeural", male: "pa-IN-OjasNeural" },
  Odia: { female: "or-IN-SubhasiniNeural", male: "or-IN-SukantNeural" },
  Assamese: { female: "as-IN-YashicaNeural", male: "as-IN-PriyomNeural" },
  Urdu: { female: "ur-PK-UzmaNeural", male: "ur-PK-AsadNeural" },
  French: { female: "fr-FR-DeniseNeural", male: "fr-FR-HenriNeural" },
  German: { female: "de-DE-KatjaNeural", male: "de-DE-ConradNeural" },
  Spanish: { female: "es-ES-ElviraNeural", male: "es-ES-AlvaroNeural" },
  Italian: { female: "it-IT-ElsaNeural", male: "it-IT-DiegoNeural" },
  Japanese: { female: "ja-JP-NanamiNeural", male: "ja-JP-KeitaNeural" },
  Korean: { female: "ko-KR-SunHiNeural", male: "ko-KR-InJoonNeural" },
  Portuguese: { female: "pt-BR-FranciscaNeural", male: "pt-BR-AntonioNeural" },
  Dutch: { female: "nl-NL-FennaNeural", male: "nl-NL-MaartenNeural" },
  Russian: { female: "ru-RU-SvetlanaNeural", male: "ru-RU-DmitryNeural" },
  Turkish: { female: "tr-TR-EmelNeural", male: "tr-TR-AhmetNeural" },
};

function cleanForTTS(text: string): string {
  return text
    .replace(/^[A-Za-z\u00C0-\u00FF'\s]{2,30}:\s*/m, "")
    .replace(/\b(?:Ack|Next):\s*/gi, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\([^)]{1,30}\)/g, "")
    .replace(/\bBFSI\b/gi, "B F S I")
    .replace(/\bCEFR\b/gi, "C E F R")
    .replace(/\bRBI\b/gi, "R B I")
    .replace(/\bB2B\b/gi, "business to business")
    .replace(/\bUPI\b/gi, "U P I")
    .replace(/\bAPI\b/gi, "A P I")
    .replace(/\bSQL\b/gi, "S Q L")
    .replace(/\bKPI\b/gi, "K P I")
    .replace(/\bATS\b/gi, "A T S")
    .replace(/\bMBA\b/gi, "M B A")
    .replace(/\bHR\b/gi, "H R")
    .replace(/\bAI\b/gi, "A I")
    .replace(/(\u0939\u093E\u0901|\u0939\u093E\u0902)(?![,\u0964!?])/gu, "$1,")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function styleForLanguage(language: string): string {
  if (language === "English") return "Speak in natural Indian English, with clear pronunciation, a warm professional tone and conversational pacing.";
  if (language === "Hindi") return "Speak in natural conversational Hindi with standard Indian pronunciation, a warm professional tone and natural pacing.";
  return `Speak naturally in ${language}, with fluent pronunciation, clear diction and conversational pacing.`;
}

function pcmToWav(pcm: Buffer): Buffer {
  if (pcm.length >= 44 && pcm.subarray(0, 4).toString("ascii") === "RIFF") return pcm;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24_000, 24);
  header.writeUInt32LE(48_000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function extractGeminiAudio(response: any): string | null {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  const audio = parts.find((part: any) => part?.inlineData?.data && String(part.inlineData.mimeType ?? "").startsWith("audio/"));
  return audio?.inlineData?.data ?? parts.find((part: any) => part?.inlineData?.data)?.inlineData?.data ?? null;
}

async function generateGemini(text: string, voice: string): Promise<Buffer> {
  const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["GEMINI API KEY"];
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      },
    },
  });
  const audioBase64 = extractGeminiAudio(response);
  if (!audioBase64) throw new Error("Gemini returned no audio data");
  const audio = pcmToWav(Buffer.from(audioBase64, "base64"));
  if (audio.length < 100) throw new Error("Gemini returned an empty audio file");
  return audio;
}

async function generateEdge(text: string, language: string, gender: "male" | "female"): Promise<Buffer> {
  const voices = EDGE_VOICES[language];
  if (!voices) throw new Error(`Edge TTS has no configured voice for ${language}`);
  const directory = await mkdtemp(path.join(tmpdir(), "leadonto-tts-"));
  const output = path.join(directory, "speech.mp3");
  const python = process.env["EDGE_TTS_PYTHON"] || "python3";
  try {
    await execFileAsync(python, [
      "-m", "edge_tts", "--voice", voices[gender], "--text", text, "--write-media", output,
    ], { timeout: 45_000, maxBuffer: 2 * 1024 * 1024 });
    const audio = await readFile(output);
    if (audio.length < 100) throw new Error("Edge TTS returned an empty audio file");
    return audio;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function generateKokoro(text: string, language: string, gender: "male" | "female"): Promise<Buffer> {
  const baseUrl = process.env["KOKORO_TTS_URL"]?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("KOKORO_TTS_URL is not configured");
  const response = await fetch(`${baseUrl}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text, language, voice: gender === "male" ? "indian_male" : "indian_female",
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`Kokoro service returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "audio/wav";
  if (!contentType.startsWith("audio/")) throw new Error("Kokoro service returned a non-audio response");
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < 100) throw new Error("Kokoro returned an empty audio file");
  return audio;
}

function sendAudio(res: any, audio: Buffer, contentType: string, provider: string) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", audio.length);
  res.setHeader("X-TTS-Provider", provider);
  res.end(audio);
}

router.post("/tts", async (req, res) => {
  const { text, language = "English", voiceStyle, gender } = req.body as {
    text?: string; language?: string; voiceStyle?: string; gender?: "male" | "female";
  };
  if (typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "Missing 'text' field" }); return;
  }
  if (text.trim().length > 3000) {
    res.status(400).json({ error: "Text too long (max 3000 characters)" }); return;
  }
  if (!GEMINI_LANGUAGES.has(language)) {
    res.status(400).json({ error: "Unsupported language", supportedLanguages: [...GEMINI_LANGUAGES] }); return;
  }

  const cleaned = cleanForTTS(text.trim());
  if (!cleaned) { res.status(400).json({ error: "No speakable text" }); return; }
  const character = (voiceStyle ?? "").toLowerCase();
  const voiceGender = gender === "male" || gender === "female"
    ? gender : (CHARACTER_GENDER[character] ?? "female");
  const geminiVoice = CHARACTER_VOICE[character] ?? (voiceGender === "male" ? "Puck" : "Kore");
  const configuredProvider = (process.env["TTS_PROVIDER"] ?? "auto").toLowerCase();
  const providers = configuredProvider === "auto"
    ? ["gemini", "edge", "kokoro"]
    : [configuredProvider];
  const failures: string[] = [];

  for (const provider of providers) {
    try {
      if (provider === "gemini") {
        const audio = await generateGemini(cleaned, geminiVoice, language);
        req.log.info({ provider, model: GEMINI_MODEL, bytes: audio.length }, "TTS generated");
        sendAudio(res, audio, "audio/wav", provider); return;
      }
      if (provider === "edge") {
        const audio = await generateEdge(cleaned, language, voiceGender);
        req.log.info({ provider, bytes: audio.length }, "TTS generated");
        sendAudio(res, audio, "audio/mpeg", provider); return;
      }
      if (provider === "kokoro") {
        const audio = await generateKokoro(cleaned, language, voiceGender);
        const contentType = language === "English" || language === "Hindi" ? "audio/wav" : "audio/wav";
        req.log.info({ provider, bytes: audio.length }, "TTS generated");
        sendAudio(res, audio, contentType, provider); return;
      }
      throw new Error(`Unknown TTS_PROVIDER: ${provider}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error";
      failures.push(`${provider}: ${message.slice(0, 240)}`);
      req.log.warn({ provider, error: message }, "TTS provider failed; trying fallback");
    }
  }

  req.log.error({ failures }, "All TTS providers failed");
  res.status(503).json({
    error: "All configured TTS providers failed.",
    providersTried: providers,
    details: failures,
  });
});

router.get("/tts/voices", (_req, res) => {
  const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["GEMINI API KEY"];
  res.json({
    provider: process.env["TTS_PROVIDER"] ?? "auto",
    fallbackOrder: ["google-gemini", "microsoft-edge-tts", "kokoro-82m"],
    model: GEMINI_MODEL,
    configured: {
      gemini: Boolean(apiKey),
      edge: true,
      kokoro: Boolean(process.env["KOKORO_TTS_URL"]),
    },
    audioFormats: ["audio/wav", "audio/mpeg"],
    languages: [...GEMINI_LANGUAGES],
    englishVoices: { female: "Kore / en-IN-NeerjaNeural", male: "Puck / en-IN-PrabhatNeural" },
    characters: CHARACTER_VOICE,
    googleCloudBillingRequired: false,
    edgeApiKeyRequired: false,
    kokoroRequiresSelfHostedService: true,
  });
});

export default router;

