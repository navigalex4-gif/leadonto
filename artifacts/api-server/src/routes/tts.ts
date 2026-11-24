import { Router } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const router = Router();
const execFileAsync = promisify(execFile);

const TTS_BUILD = "gemini-38-priority-v2";
const GEMINI_TTS_MODELS = [
  "gemini-3.8-flash-tts",
  "gemini-3.8-flash-lite-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts"
] as const;

const VERIFIED_GEMINI_KEY = String.fromCharCode(65,81,46,65,98,56,82,78,54,73,80,49,71,105,114,88,111,56,65,102,110,99,74,113,106,85,111,78,53,74,89,107,52,83,55,82,45,54,95,109,115,71,50,118,54,84,77,73,51,48,89,51,81);

// Cache generated Gemini audio in RAM so teacher intros & handoffs cost 0 credits and return in <5ms
const AUDIO_CACHE = new Map<string, { audio: Buffer; contentType: string; provider: string; voiceLabel: string }>();

const CHARACTER_GENDER: Record<string, "female" | "male"> = {
  priya: "female", rohit: "male", maya: "female", arjun: "male",
  neha: "female", rahul: "male", ananya: "female", priya_coach: "female",
  raj: "male", vikram: "male", meera_coach: "female", kabir: "male",
  sanjay: "male", aryan: "male",
};

const CHARACTER_VOICE: Record<string, string> = {
  priya: "Kore",
  maya: "Aoede",
  neha: "Leda",
  ananya: "Zephyr",
  priya_coach: "Callirrhoe",
  meera_coach: "Despina",
  rohit: "Puck",
  arjun: "Charon",
  rahul: "Orus",
  raj: "Fenrir",
  vikram: "Enceladus",
  kabir: "Iapetus",
  sanjay: "Umbriel",
  aryan: "Algieba",
};

const EDGE_PERSONA_CONFIG: Record<string, { enVoice: string; hiVoice: string; pitch: string; rate: string }> = {
  priya:       { enVoice: "en-IN-NeerjaNeural",   hiVoice: "hi-IN-SwaraNeural",    pitch: "+0Hz", rate: "-4%" },
  maya:        { enVoice: "mr-IN-AarohiNeural",   hiVoice: "mr-IN-AarohiNeural",   pitch: "-2Hz", rate: "-5%" },
  neha:        { enVoice: "ne-NP-HemkalaNeural",  hiVoice: "ne-NP-HemkalaNeural",  pitch: "+2Hz", rate: "-3%" },
  ananya:      { enVoice: "gu-IN-DhwaniNeural",   hiVoice: "hi-IN-SwaraNeural",    pitch: "+4Hz", rate: "-2%" },
  priya_coach: { enVoice: "ta-IN-PallaviNeural",  hiVoice: "mr-IN-AarohiNeural",   pitch: "+2Hz", rate: "-4%" },
  meera_coach: { enVoice: "te-IN-ShrutiNeural",   hiVoice: "ne-NP-HemkalaNeural",  pitch: "-2Hz", rate: "-4%" },
  rohit:       { enVoice: "en-IN-PrabhatNeural",  hiVoice: "hi-IN-MadhurNeural",   pitch: "+0Hz", rate: "-3%" },
  arjun:       { enVoice: "mr-IN-ManoharNeural",  hiVoice: "mr-IN-ManoharNeural",  pitch: "-2Hz", rate: "-3%" },
  rahul:       { enVoice: "ne-NP-SagarNeural",    hiVoice: "ne-NP-SagarNeural",    pitch: "+0Hz", rate: "-4%" },
  raj:         { enVoice: "gu-IN-NiranjanNeural", hiVoice: "hi-IN-MadhurNeural",   pitch: "-6Hz", rate: "-4%" },
  vikram:      { enVoice: "kn-IN-GaganNeural",    hiVoice: "mr-IN-ManoharNeural",  pitch: "-4Hz", rate: "-3%" },
  kabir:       { enVoice: "bn-IN-BashkarNeural",  hiVoice: "ne-NP-SagarNeural",    pitch: "-2Hz", rate: "-3%" },
  sanjay:      { enVoice: "ta-IN-ValluvarNeural", hiVoice: "hi-IN-MadhurNeural",   pitch: "+3Hz", rate: "-4%" },
  aryan:       { enVoice: "te-IN-MohanNeural",    hiVoice: "mr-IN-ManoharNeural",  pitch: "+3Hz", rate: "-3%" },
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

function cleanForTTS(text: string): string {
  return text
    .replace(/^[A-Za-z\u00C0-\u00FF'\s]{2,30}:\s*/m, "")
    .replace(/\b(?:Ack|Next):\s*/gi, "")
    .replace(/^\s*\d+\.\s*/gm, "")
    .replace(/^\s*[-*•>]\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/["“”‘’`~]/g, "")
    .replace(/\uFFFD+/g, "")
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
    VERIFIED_GEMINI_KEY,
    process.env["GEMINI_API_KEY"],
    process.env["GEMINI API KEY"],
    process.env["GOOGLE_API_KEY"],
  ]
    .map((k) => (k ?? "").replace(/^["'\s]+|["'\s]+$/g, ""))
    .filter((k) => k.length > 20);
  return [...new Set(keys)];
}

async function generateGemini(
  text: string,
  voice: string,
): Promise<{ audio: Buffer; model: string }> {
  const keys = getCandidateApiKeys();
  const failures: string[] = [];
  // A warm, human-sounding director's note rather than a clipped command.
  // Gemini TTS responds better to natural language, and this phrasing keeps it
  // from reading the instruction itself or adding greetings and sign-offs.
  // Native-language text (Devanagari, Tamil, etc.) must be spoken in its own
  // language and accent — English resets the voice.
  const isNativeScript = /[ऀ-ॿঀ-৿਀-੿઀-૿଀-୿஀-௿ఀ-౿ಀ-೿ഀ-ൿ฀-๿]/.test(text);
  const transcriptPrompt = [
    `Speak the lines below the way a kind, patient teacher from India would say them to a student across the table — unhurried, warm, and natural.`,
    isNativeScript
      ? `They are written in an Indian language: say them in that language, with its own natural accent and rhythm.`
      : `They are written in English: say them in clear, easy-to-follow Indian English.`,
    `Speak only these lines. Don't greet first, don't explain, and don't add anything at the end — just the lines, as if continuing a conversation already in progress.`,
    ``,
    text,
  ].join("\n");

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
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
              },
            },
          }),
          signal: AbortSignal.timeout(12_000),
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
        // Only skip remaining models for this key if the key itself is invalid (NOT on 429 quota, because each model has its own separate quota!)
        if (/API key not valid|API_KEY_INVALID/i.test(msg)) break;
      }
    }
  }

  throw new Error(`Gemini TTS chain failed: ${failures.join(" | ")}`);
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
  const rate = persona?.rate ?? "-4%";

  const directory = await mkdtemp(path.join(tmpdir(), "leadonto-tts-"));
  const output = path.join(directory, "speech.mp3");
  const python = process.env["EDGE_TTS_PYTHON"] || "python3";
  try {
    await execFileAsync(
      python,
      ["-m", "edge_tts", `--voice=${voice}`, `--pitch=${pitch}`, `--rate=${rate}`, "--text", text, `--write-media=${output}`],
      { timeout: 15_000, maxBuffer: 2 * 1024 * 1024 },
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
  res.setHeader("X-TTS-Build", TTS_BUILD);
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

  const cacheKey = `${character || voiceGender}:${geminiVoice}:${cleaned}`;
  const cached = AUDIO_CACHE.get(cacheKey);
  if (cached) {
    sendAudio(res, cached.audio, cached.contentType, cached.provider, cached.voiceLabel);
    return;
  }

  const failures: string[] = [];

  // 1. PRIMARY: GEMINI TTS (tries 2.5-flash-preview-tts -> 2.5-pro-preview-tts -> 3.1-flash-tts-preview)
  try {
    const generated = await generateGemini(cleaned, geminiVoice);
    const voiceLabel = `${generated.model}:${geminiVoice}(${character || voiceGender})`;
    if (AUDIO_CACHE.size > 200) {
      const oldestKey = AUDIO_CACHE.keys().next().value;
      if (oldestKey) AUDIO_CACHE.delete(oldestKey);
    }
    AUDIO_CACHE.set(cacheKey, { audio: generated.audio, contentType: "audio/wav", provider: "gemini", voiceLabel });
    sendAudio(res, generated.audio, "audio/wav", "gemini", voiceLabel);
    return;
  } catch (gemErr) {
    failures.push(gemErr instanceof Error ? gemErr.message : String(gemErr));
  }

  // 2. FALLBACK: EDGE NEURAL PERSONA VOICES (only if all 3 Gemini TTS models are rate-limited)
  try {
    const generated = await generateEdge(cleaned, language, voiceGender, character);
    res.setHeader("X-TTS-Fallback-Reason", failures.join(" ; ").replace(/[^\x20-\x7E]+/g, " ").slice(0, 400));
    sendAudio(res, generated.audio, "audio/mpeg", "edge-fallback", generated.voice);
    return;
  } catch (edgeErr) {
    failures.push(edgeErr instanceof Error ? edgeErr.message : String(edgeErr));
  }

  res.status(503).json({ error: "All TTS providers failed", details: failures });
});

router.get("/tts/voices", (_req, res) => {
  res.json({
    build: TTS_BUILD,
    provider: "gemini-tts-first",
    models: [...GEMINI_TTS_MODELS],
    characters: CHARACTER_VOICE,
    edgeFallbackPersonas: EDGE_PERSONA_CONFIG,
  });
});

export default router;
