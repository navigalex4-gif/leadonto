import { Router, type Response } from "express";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

const router = Router();

type SupportedLanguage =
  | "English"
  | "Hindi"
  | "Tamil"
  | "Telugu"
  | "Bengali"
  | "Marathi"
  | "Gujarati"
  | "Kannada"
  | "Malayalam"
  | "Punjabi"
  | "Odia"
  | "Assamese"
  | "Urdu";

/**
 * Permanent character → Google Cloud voice identity.
 *
 * These are Google Chirp 3 HD English voices, deliberately assigned once and
 * never selected by gender, browser availability, or randomness.
 */
export const CHARACTER_VOICE_MAP: Record<string, string> = {
  priya: "en-IN-Chirp3-HD-Aoede",
  rohit: "en-IN-Chirp3-HD-Algieba",
  maya: "en-IN-Chirp3-HD-Callirrhoe",
  arjun: "en-IN-Chirp3-HD-Fenrir",
  neha: "en-IN-Chirp3-HD-Kore",
  rahul: "en-IN-Chirp3-HD-Orus",
  ananya: "en-IN-Chirp3-HD-Leda",
  priya_coach: "en-IN-Chirp3-HD-Achernar",
  raj: "en-IN-Chirp3-HD-Algenib",
  vikram: "en-IN-Chirp3-HD-Charon",
  meera_coach: "en-IN-Chirp3-HD-Despina",
  kabir: "en-IN-Chirp3-HD-Enceladus",
  sanjay: "en-IN-Chirp3-HD-Iapetus",
  // Gacrux is a feminine timbre; Aryan must use a clearly masculine voice.
  aryan: "en-IN-Chirp3-HD-Rasalgethi",
};

const LANGUAGE_CODES: Record<SupportedLanguage, string> = {
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
  // Google currently publishes no or-IN/as-IN voice catalog entries. These
  // two scripts use Google's hi-IN Chirp voice as the server-side fallback
  // rather than a silent response.
  Odia: "hi-IN",
  Assamese: "hi-IN",
  Urdu: "ur-IN",
};

const CHARACTER_ORDER = [
  "priya", "rohit", "maya", "arjun", "neha", "rahul", "ananya",
  "priya_coach", "raj", "vikram", "meera_coach", "kabir", "sanjay", "aryan",
] as const;

let googleTtsClient: TextToSpeechClient | null = null;

function getGoogleTtsClient(): TextToSpeechClient {
  if (googleTtsClient) return googleTtsClient;
  const rawCredentials = process.env.GOOGLE_CLOUD_TTS_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) {
    throw new Error("GOOGLE_CLOUD_TTS_SERVICE_ACCOUNT_JSON is not configured");
  }
  const credentials = JSON.parse(rawCredentials) as {
    client_email: string;
    private_key: string;
  };
  googleTtsClient = new TextToSpeechClient({ credentials });
  return googleTtsClient;
}

function cleanForTTS(text: string): string {
  return text
    .replace(/^[A-Za-zÀ-ÿ'\s]{2,30}:\s*/m, "")
    .replace(/\b(?:Ack|Next):\s*/gi, "")
    .replace(/\*[^*]{1,40}\*/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\([^)]{1,30}\)/g, "")
    .replace(/^\s*["'"]/m, "")
    .replace(/["'"]\s*$/m, "")
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
    // Give the Hindi affirmative a clean word boundary. Without punctuation
    // before the following word, some voices blur हाँ into “हान”.
    .replace(/(हाँ|हां)(?![,\u0964।!?])/gu, "$1,")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return value in LANGUAGE_CODES;
}

type VoiceSelection = { languageCode: string; name: string };
const nativeVoiceCache = new Map<string, VoiceSelection>();

async function chooseVoice(language: SupportedLanguage, voiceStyle?: string): Promise<VoiceSelection> {
  if (language === "English") {
    return {
      languageCode: LANGUAGE_CODES.English,
      name: CHARACTER_VOICE_MAP[voiceStyle ?? ""] ?? CHARACTER_VOICE_MAP.maya!,
    };
  }

  const requestedCode = LANGUAGE_CODES[language];
  const cached = nativeVoiceCache.get(requestedCode);
  if (cached) return cached;

  const client = getGoogleTtsClient();
  const [catalog] = await client.listVoices({ languageCode: requestedCode });
  const available = (catalog.voices ?? [])
    .filter((voice) => voice.name && voice.languageCodes?.includes(requestedCode))
    .sort((a, b) => {
      const quality = (name: string) => name.includes("Wavenet") ? 0 : name.includes("Neural2") ? 1 : 2;
      return quality(a.name ?? "") - quality(b.name ?? "") || (a.name ?? "").localeCompare(b.name ?? "");
    });

  // Odia and Assamese do not have a dedicated catalog entry in this
  // environment. A valid Hindi voice is preferable to a silent/500 response.
  const fallbackCode = available.length > 0 ? requestedCode : "hi-IN";
  const fallbackCatalog = available.length > 0
    ? available
    : ((await client.listVoices({ languageCode: fallbackCode }))[0]?.voices ?? [])
      .filter((voice) => voice.name && voice.languageCodes?.includes(fallbackCode))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  if (fallbackCatalog.length === 0 || !fallbackCatalog[0]?.name) {
    throw new Error(`No Google Cloud TTS voice is available for ${language}`);
  }

  const index = CHARACTER_ORDER.indexOf(
    (voiceStyle ?? "maya") as (typeof CHARACTER_ORDER)[number],
  );
  const selected = fallbackCatalog[Math.max(0, index) % fallbackCatalog.length]!;
  const selection = { languageCode: fallbackCode, name: selected.name! };
  nativeVoiceCache.set(requestedCode, selection);
  return selection;
}

async function synthesize(
  res: Response,
  text: string,
  language: SupportedLanguage,
  voiceName: string,
  voiceLanguageCode: string,
): Promise<void> {
  const client = getGoogleTtsClient();
  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: { languageCode: voiceLanguageCode, name: voiceName },
    audioConfig: {
      audioEncoding: "MP3",
      // Leave a little room around Indic punctuation; the client applies the
      // persona-specific playback rate on top of this synthesis rate.
      speakingRate: 0.96,
      pitch: 0,
    },
  });
  if (!response.audioContent) {
    throw new Error(`Google Cloud TTS returned no audio for ${voiceName}`);
  }
  const audio = Buffer.isBuffer(response.audioContent)
    ? response.audioContent
    : Buffer.from(response.audioContent as Uint8Array);
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", audio.length);
  res.end(audio);
}

router.post("/tts", async (req, res) => {
  const {
    text,
    language = "English",
    voiceStyle,
  } = req.body as {
    text?: string;
    language?: string;
    voiceStyle?: string;
  };

  if (!text?.trim()) {
    res.status(400).json({ error: "Missing 'text' field" });
    return;
  }
  if (text.trim().length > 3000) {
    res.status(400).json({ error: "Text too long (max 3000 characters)" });
    return;
  }
  const targetLanguage = isSupportedLanguage(language) ? language : "English";
  const cleaned = cleanForTTS(text.trim());
  if (!cleaned) {
    res.status(400).json({ error: "No speakable text" });
    return;
  }

  try {
    const voice = await chooseVoice(targetLanguage, voiceStyle);
    await synthesize(res, cleaned, targetLanguage, voice.name, voice.languageCode);
  } catch (err) {
    req.log.error({ err, language: targetLanguage, voiceStyle }, "Google Cloud TTS failed");
    if (!res.headersSent) res.status(500).json({ error: "Google Cloud TTS failed" });
    else res.end();
  }
});

router.get("/tts/voices", (_req, res) => {
  res.json({
    provider: "google-cloud-text-to-speech",
    languages: Object.keys(LANGUAGE_CODES),
    characters: CHARACTER_VOICE_MAP,
  });
});

export default router;