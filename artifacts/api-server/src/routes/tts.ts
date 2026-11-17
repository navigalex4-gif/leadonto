import { Router } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const router = Router();
const execFileAsync = promisify(execFile);

const GEMINI_TTS_MODELS = ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"] as const;
const GEMINI_MODEL = GEMINI_TTS_MODELS[0];
const FALLBACK_GEMINI_KEY = ": \"Iapetus\",";

const CHARACTER_GENDER: Record<string, "female" | "male"> = {
  priya: "female", rohit: "male", maya: "female", arjun: "male",
  neha: "female", rahul: "male", ananya: "female", priya_coach: "female",
  raj: "male", vikram: "male", meera_coach: "female", kabir: "male",
  sanjay: "male", aryan: "male",
};

// Every AI teacher has a unique Gemini prebuilt voice
const CHARACTER_VOICE: Record<string, string> = {
  priya: "Kore",
  maya: "Aoede",
  neha: "Leda",
  ananya: "Zephyr",
  priya_coach: "Callirhoe",
  meera_coach: "Despina",
  rohit: "Puck",
  arjun: "Charon",
  rahul: "Orus",
  raj: "Fenrir",
  vikram: "Enceladus",
  kabir  sanjay: "Umbriel",
  aryan: "Algieba",
};

// Distinct neural voice + prosody tuning per teacher so no two teachers ever sound the same
const EDGE_PERSONA_CONFIG: Record<string, { enVoice: string; hiVoice: string; pitch: string; rate: string }> = {
  priya:       { enVoice: "en-IN-NeerjaNeural",  hiVoice: "hi-IN-SwaraNeural",  pitch: "+0Hz",  rate: "+0%" },
  maya:        { enVoice: "en-IN-NeerjaNeural",  hiVoice: "hi-IN-SwaraNeural",  pitch: "-4Hz",  rate: "-3%" },
  neha:        { enVoice: "en-IN-NeerjaNeural",  hiVoice: "hi-IN-SwaraNeural",  pitch: "+5Hz",  rate: "+2%" },
  ananya:      { enVoice: "en-IN-NeerjaNeural",  hiVoice: "hi-IN-SwaraNeural",  pitch: "+3Hz",  rate: "+4%" },
  priya_coach: { enVoice: "mr-IN-AarohiNeural",  hiVoice: "mr-IN-AarohiNeural", pitch: "+0Hz",  rate: "+0%" },
  meera_coach: { enVoice: "gu-IN-DhwaniNeural",  hiVoice: "gu-IN-DhwaniNeural", pitch: "+2Hz",  rate: "+0%" },
  rohit:       { enVoice: "en-IN-PrabhatNeural", hiVoice: "hi-IN-MadhurNeural", pitch: "+0Hz",  rate: "+0%" },
  arjun:       { enVoice: "hi-IN-MadhurNeural",  hiVoice: "hi-IN-MadhurNeural", pitch: "-5Hz",  rate: "+2%" },
  rahul:       { enVoice: "en-IN-PrabhatNeural", hiVoice: "hi-IN-MadhurNeural", pitch: "+4Hz",  rate: "-2%" },
  raj:         { enVoice: "en-IN-PrabhatNeural", hiVoice: "hi-IN-MadhurNeural", pitch: "-8Hz",  rate: "-2%" },
  vikram:      { enVoice: "mr-IN-ManoharNeural", hiVoice: "hi-IN-MadhurNeural", pitch: "-3Hz",  rate: "+0%" },
  kabir:       { enVoice: "gu-IN-NiranjanNeural",hiVoice: "hi-IN-MadhurNeural", pitch: "+2Hz",  rate: "+2%" },
  sanjay:      { enVoice: "ta-IN-ValluvarNeural",hiVoice: "hi-IN-MadhurNeural", pitch: "-2Hz",  rate: "+0%" },
  aryan:       { enVoice: "te-IN-MohanNeural",   hiVoice: "hi-IN-MadhurNeural", pitch: "+3Hz",  rate: "+1%" },
};

const EDGE_VOICES: Record<string, { female: string; male: string }> = {
  English:   { female: "en-IN-NeerjaNeural",   male: "en-IN-PrabhatNeural" },
  Hindi:     { female: "hi-IN-SwaraNeural",    male: "hi-IN-MadhurNeural" },
  Bengali:   { female: "bn-IN-TanishaaNeural", male: "bn-IN-BashkarNeural" },
  Bangla:    { female: "bn-IN-TanishaaNeural", male: "bn-IN-BashkarNeural" },
  Tamil:     { female: "ta-IN-PallaviNeural",  male: "ta-IN-ValluvarNeural" },
  Telugu:    { female: "te-IN-ShrutiNeural",   male: "te-IN-MohanNeural" },
  Marathi:   { female: "mr-IN-AarohiNeural",   male: "mr-IN-ManoharNeural" },
  Gujarati:  { female: "gu-IN-DhwaniNeural",   male: "gu-IN-NiranjanNeural" },
  Kannada:   { female: "kn-IN-SapnaNeural",    male: "kn-IN-GaganNeural" },
  Malayalam: { female: "ml-IN-SobhanaNeural",  male: "ml-IN-MidhunNeural" },
  Punjabi:   { female: "pa-IN-VaaniNeural",    male: "pa-IN-OjasNeural" },
  Odia:      { female: "or-IN-SubhasiniNeural",male: "or-IN-SukantNeural" },
  Assamese:  { female: "as-IN-YashicaNeural",  male: "as-IN-PriyomNeural" },
  Urdu:      { female: "ur-PK-UzmaNeural",     male: "ur-PK-AsadNeural" },
};

const GEMINI_LANGUAGES = new Set([
  "English", "Hindi", "Bangla", "Bengali", "Gujarati", "Marathi", "Kannada",
  "Tamil", "Telugu", "Malayalam", "Punjabi", "Odia", "Assamese", "Urdu",
  "French", "German", "Spanish", "Italian", "Japanese", "Korean", "Portuguese",
  "Dutch", "Russian", "Turkish", "Indonesian", "Vietnamese", "Thai",
]);

function cleanForTTS(text: string): string {
  return text
    .replace(/^[A-Za-z\u00C0-\u00FF'\s]{2,30}:\s*/m, "")
    .replace(/\b(?:Ack|Next):\s*/gi, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/["“”‘’`~]/g, "")
    .replace(/\s*[।|]\s*/g, ". ")
    .replace(/\s*[;:—–]+\s*/g, ", ")
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

function getCandidateApiKeys(): string[] {
  const keys = [
    process.env["GEMINI_API_KEY"],
    process.env["GEMINI API KEY"],
    process.env["GOOGLE_API_KEY"],
    FALLBACK_GEMINI_KEY,
  ]
    .map((k) => (k ?? "").replace(/^["'\s]+|["'\s]+$/g, ""))
    .filter(Boolean);
  return [...new Set(keys)];
}

async function generateGemini(
  text: string,
  voice: string,
): Promise<{ audio: Buffer; model: string }> {
  const keys = getCandidateApiKeys();
  if (keys.length === 0) throw new Error("GEMINI_API_KEY is not configured");

  const failures: string[] = [];
  const transcriptPrompt = `Read the following transcript aloud exactly as written, in a warm, natural Indian conversational tone with smooth transitions between languages and no extra words:\n\n${text}`;

  for (const apiKey of keys) {
    for (const model of GEMINI_TTS_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: transcriptPrompt }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
            },
          }),
          signal: AbortSignal.timeout(14_000),
        });

        const payload = (await response.json().catch(() => null)) as any;
        if (!response.ok) {
          const msg = payload?.error?.message ?? `${model} HTTP ${response.status}`;
          throw new Error(msg);
        }

        const encoded = payload?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data)?.inlineData?.data;
        if (!encoded) throw new Error(`${model} returned no inlineData`);

        const audio = pcmToWav(Buffer.from(encoded, "base64"));
        if (audio.length > 100) return { audio, model };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push(`${model}: ${msg}`);
        if (/API key not valid|API_KEY_INVALID|quota|429/i.test(msg)) break;
      }
    }
  }

  throw new Error(`Gemini TTS failed: ${failures.join(" | ")}`);
}

async function generateEdge(
  text: string,
  language: string,
  gender: "male" | "female",
  character: string,
): Promise<{ audio: Buffer; voice: string }> {
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const persona = EDGE_PERSONA_CONFIG[character];
  const langVoices = EDGE_VOICES[language] ?? EDGE_VOICES["English"]!;

  let voice: string;
  if (language !== "English" && language !== "Hindi" && EDGE_VOICES[language]) {
    voice = EDGE_VOICES[language]![gender];
  } else if (hasDevanagari || language === "Hindi") {
    voice = persona ? persona.hiVoice : (gender === "male" ? "hi-IN-MadhurNeural" : "hi-IN-SwaraNeural");
  } else {
    voice = persona ? persona.enVoice : (langVoices[gender] ?? (gender === "male" ? "en-IN-PrabhatNeural" : "en-IN-NeerjaNeural"));
  }

  const pitch = persona?.pitch ?? (gender === "male" ? "-2Hz" : "+0Hz");
  const rate = persona?.rate ?? "+0%";

  const directory = await mkdtemp(path.join(tmpdir(), "leadonto-tts-"));
  const output = path.join(directory, "speech.mp3");
  const python = process.env["EDGE_TTS_PYTHON"] || "python3";
  try {
    await execFileAsync(
      python,
      ["-m", "edge_tts", "--voice", voice, "--pitch", pitch, "--rate", rate, "--text", text, "--write-media", output],
      { timeout: 20_000, maxBuffer: 2 * 1024 * 1024 },
    );
    const audio = await readFile(output);
    if (audio.length < 100) throw new Error("Edge TTS returned empty audio");
    return { audio, voice: `${voice}(${character || gender},pitch=${pitch},rate=${rate})` };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function sendAudio(res: any, audio: Buffer, contentType: string, provider: string, voiceLabel: string) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", audio.length);
  res.setHeader("X-TTS-Provider", provider);
  res.setHeader("X-TTS-Model", voiceLabel);
  res.setHeader("X-TTS-Voice", voiceLabel);
  res.end(audio);
}

router.post("/tts", async (req, res) => {
  const { text, language = "English", voiceStyle, gender } = req.body as {
    text?: string; language?: string; voiceStyle?: string; gender?: "male" | "female";
  };
  if (typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "Missing 'text' field" }); return;
  }
  const cleaned = cleanForTTS(text.trim());
  if (!cleaned) {
    res.status(400).json({ error: "No speakable text" }); return;
  }

  const character = (voiceStyle ?? "").trim().toLowerCase();
  const voiceGender: "male" | "female" =
    CHARACTER_GENDER[character] ?? (gender === "male" ? "male" : "female");
  const geminiVoice = CHARACTER_VOICE[character] ?? (voiceGender === "male" ? "Puck" : "Kore");

  const failures: string[] = [];

  try {
    const generated = await generateGemini(cleaned, geminiVoice);
    sendAudio(res, generated.audio, "audio/wav", "gemini", `${generated.model}:${geminiVoice}(${character || voiceGender})`);
    return;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failures.push(msg);
  }

  try {
    const generated = await generateEdge(cleaned, language, voiceGender, character);
    if (failures.length > 0) {
      res.setHeader("X-TTS-Fallback-Reason", failures.join(" ; ").replace(/[^\x20-\x7E]+/g, " ").slice(0, 400));
    }
    sendAudio(res, generated.audio, "audio/mpeg", "edge", generated.voice);
    return;
  } catch (edgeErr) {
    failures.push(edgeErr instanceof Error ? edgeErr.message : String(edgeErr));
  }

  res.status(503).json({ error: "All TTS providers failed", details: failures });
});

router.get("/tts/voices", (_req, res) => {
  res.json({
    provider: "gemini-first",
    model: GEMINI_MODEL,
    availableModels: [...GEMINI_TTS_MODELS],
    characters: CHARACTER_VOICE,
    edgePersonas: EDGE_PERSONA_CONFIG,
  });
});

export default router;
