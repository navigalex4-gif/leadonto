import { GoogleGenAI } from "@google/genai";

import { Router } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const router = Router();
const execFileAsync = promisify(execFile);
// Try Gemini 3.8 first, then 3.8 Flash-Lite, with Gemini 2.5 as the third fallback.
const GEMINI_TTS_MODELS = ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"] as const;
const GEMINI_MODEL = GEMINI_TTS_MODELS[0];

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
const EDGE_PERSONA_VOICES: Record<string, string> = {
  // Keep fallback voices one-to-one across tutor personas; gender-only fallback
  // made every male teacher and every female teacher sound identical.
  priya: "en-IN-NeerjaNeural",
  rohit: "en-IN-PrabhatNeural",
  maya: "hi-IN-SwaraNeural",
  arjun: "hi-IN-MadhurNeural",
  neha: "bn-IN-TanishaaNeural",
  rahul: "bn-IN-BashkarNeural",
  ananya: "kn-IN-SapnaNeural",
  priya_coach: "mr-IN-AarohiNeural",
  raj: "kn-IN-GaganNeural",
  vikram: "mr-IN-ManoharNeural",
  meera_coach: "gu-IN-DhwaniNeural",
  kabir: "gu-IN-NiranjanNeural",
  sanjay: "ta-IN-ValluvarNeural",
  aryan: "te-IN-MohanNeural",
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
    .replace(/["“”‘’`~]/g, "")
    .replace(/\s*[।|]\s*/g, ", ")
    .replace(/\s*\.\s+(?=[A-Za-z\u0900-\u097F])/g, ", ")
    .replace(/\s*[;:—–-]+\s*/g, ", ")
    .replace(/(,\s*){2,}/g, ", ")
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
    .replace(/\s{2,}/g, " ")
    .trim();
}

function styleForLanguage(language: string, nativeLanguage?: string): string {
  const cadence = "Speak in a natural live conversation, not as a narrator reading prepared text. Use a moderately brisk, connected rhythm. Commas should have almost no pause; use only a short natural breath at sentence endings. Vary pitch and emphasis subtly, and avoid exaggerated enunciation or long silences.";
  if (nativeLanguage && nativeLanguage !== "English") {
    const mainLanguage = language === nativeLanguage ? nativeLanguage : language;
    return `The learner's helper language is ${nativeLanguage}; English is also being practised. The primary spoken language for this audio is ${mainLanguage}. Only use both languages when the transcript itself contains both. Move naturally between English and ${nativeLanguage} in the same conversational flow, with the same speaker identity and rhythm. Do not insert, translate, repeat or announce either language. ${cadence}`;
  }
  if (language === "English") return `Speak in natural Indian English with a warm, personal teacher tone. ${cadence}`;
  if (language === "Hindi") return `Speak in natural conversational Hindi with standard Indian pronunciation and a warm, personal teacher tone. ${cadence}`;
  return `Speak naturally in ${language}, with fluent pronunciation and a warm, personal tone. ${cadence}`;
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

async function generateGemini(
  text: string,
  voice: string,
  language: string,
  nativeLanguage?: string,
  requestedStyle?: string,
): Promise<{ audio: Buffer; model: string }> {
  const failures: string[] = [];
  const rawKey = (
    process.env["GEMINI_API_KEY"] ??
    process.env["GEMINI API KEY"] ??
    process.env["GOOGLE_API_KEY"] ??
    process.env["AI_INTEGRATIONS_GEMINI_API_KEY"] ??
    ""
  ).replace(/^["'\s]+|["'\s]+$/g, "");

  const rawSa = process.env["GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON"];

  // Helper to extract inlineData audio from @google/genai response
  const extractAudio = (resp: any, label: string): Buffer => {
    const parts = resp?.candidates?.[0]?.content?.parts ?? [];
    const inline = parts.find((p: any) => p?.inlineData?.data)?.inlineData?.data;
    if (!inline) throw new Error(`${label} returned no inlineData`);
    const wav = pcmToWav(Buffer.from(inline, "base64"));
    if (wav.length < 100) throw new Error(`${label} returned empty audio`);
    return wav;
  };

  // A. Try Vertex AI Service Account first (since GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON is active on Railway)
  if (rawSa) {
    try {
      const creds = JSON.parse(rawSa);
      for (const loc of ["us-central1", process.env["GOOGLE_VERTEX_LOCATION"] || "global"]) {
        const vertexClient = new GoogleGenAI({
          vertexai: true,
          project: creds.project_id,
          location: loc,
          googleAuthOptions: {
            credentials: creds,
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
          },
        });
        for (const model of ["gemini-2.5-flash-preview-tts", "gemini-2.5-flash"]) {
          try {
            const resp = await vertexClient.models.generateContent({
              model,
              contents: text,
              config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
                },
              },
            });
            return { audio: extractAudio(resp, `vertex-${loc}-${model}`), model: `vertex:${model}` };
          } catch (vErr) {
            failures.push(`vertex(${loc}/${model}): ${vErr instanceof Error ? vErr.message : String(vErr)}`);
          }
        }
      }
    } catch (saErr) {
      failures.push(`vertex-init: ${saErr instanceof Error ? saErr.message : String(saErr)}`);
    }
  }

  // B. Try Google AI Studio API Key if present and valid AIza* format
  if (rawKey) {
    for (const model of ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"]) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(rawKey)}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Read the following transcript aloud verbatim with natural Indian pronunciation and no extra words:\n\n${text}` }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
              },
            },
          }),
          signal: AbortSignal.timeout(20_000),
        });
        const payload = await response.json().catch(() => null) as any;
        if (!response.ok) throw new Error(payload?.error?.message ?? `${model} HTTP ${response.status}`);
        return { audio: extractAudio(payload, model), model };
      } catch (err) {
        failures.push(`apikey(${model}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  throw new Error(`Gemini TTS failed: ${failures.join(" | ")}`);
}

async function generateEdge(text: string, language: string, gender: "male" | "female", character: string): Promise<{ audio: Buffer; voice: string }> {
  const voices = EDGE_VOICES[language];
  const voice = EDGE_PERSONA_VOICES[character] ?? voices?.[gender] ?? (gender === "male" ? "en-IN-PrabhatNeural" : "en-IN-NeerjaNeural");
  if (!voice) throw new Error(`Edge TTS has no configured voice for ${language}`);
  const directory = await mkdtemp(path.join(tmpdir(), "leadonto-tts-"));
  const output = path.join(directory, "speech.mp3");
  const python = process.env["EDGE_TTS_PYTHON"] || "python3";
  try {
    await execFileAsync(python, [
      "-m", "edge_tts", "--voice", voice, "--text", text, "--write-media", output,
    ], { timeout: 45_000, maxBuffer: 2 * 1024 * 1024 });
    const audio = await readFile(output);
    if (audio.length < 100) throw new Error("Edge TTS returned an empty audio file");
    return { audio, voice };
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

function sendAudio(res: any, audio: Buffer, contentType: string, provider: string, model?: string) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", audio.length);
  res.setHeader("X-TTS-Provider", provider);
  if (model) {
    res.setHeader("X-TTS-Model", model);
    res.setHeader("X-TTS-Voice", model);
  }
  res.end(audio);
}

router.post("/tts", async (req, res) => {
  const { text, language = "English", voiceStyle, gender, speechStyle, nativeLanguage } = req.body as {
    text?: string; language?: string; voiceStyle?: string; gender?: "male" | "female"; speechStyle?: string; nativeLanguage?: string;
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
        const generated = await generateGemini(cleaned, geminiVoice, language, typeof nativeLanguage === "string" ? nativeLanguage : undefined, typeof speechStyle === "string" ? speechStyle : undefined);
        req.log.info({ provider, model: generated.model, voice: geminiVoice, bytes: generated.audio.length }, "TTS generated");
        sendAudio(res, generated.audio, "audio/wav", provider, `${generated.model}:${geminiVoice}`); return;
      }
      if (provider === "edge") {
        const generated = await generateEdge(cleaned, language, voiceGender, character);
        req.log.info({ provider, voice: generated.voice, bytes: generated.audio.length }, "TTS generated");
        if (failures.length > 0) res.setHeader("X-TTS-Fallback-Reason", failures.join(" ; ").replace(/[^\x20-\x7E]+/g, " ").slice(0, 500));
        sendAudio(res, generated.audio, "audio/mpeg", provider, generated.voice); return;
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
    availableModels: [...GEMINI_TTS_MODELS],
    legacyGeminiTtsFallbackDisabled: false,
    configured: {
      gemini: Boolean(apiKey),
      edge: true,
      kokoro: Boolean(process.env["KOKORO_TTS_URL"]),
    },
    audioFormats: ["audio/wav", "audio/mpeg"],
    languages: [...GEMINI_LANGUAGES],
    englishVoices: { female: "Kore / en-IN-NeerjaNeural", male: "Puck / en-IN-PrabhatNeural" },
    characters: CHARACTER_VOICE,
    edgeFallbackCharacters: EDGE_PERSONA_VOICES,
    googleCloudBillingRequired: false,
    edgeApiKeyRequired: false,
    kokoroRequiresSelfHostedService: true,
  });
});

export default router;

