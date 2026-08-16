import { Router, type Response } from "express";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const router = Router();

/**
 * Every AI persona has a unique Indian neural voice. Do not reuse a voiceStyle
 * mapping: sharing Neerja/Prabhat was the reason all female/male characters
 * sounded identical. Regional Indian neural voices still speak English
 * naturally, while providing a clearly different accent and timbre.
 */
const TUTOR_VOICE_MAP: Record<string, string> = {
  // English Guru — six distinct voices. Maya remains the default landing
  // persona. English-capable Indian regional voices are used where Edge only
  // exposes two en-IN voices, keeping every persona distinct.
  priya:  "mr-IN-AarohiNeural",
  rohit:  "gu-IN-NiranjanNeural",
  maya:   "hi-IN-SwaraNeural",
  arjun:  "te-IN-MohanNeural",
  neha:   "bn-IN-TanishaaNeural",
  rahul:  "kn-IN-GaganNeural",

  // Interview Ace — eight distinct voices not used by the teachers. Sanjay
  // and Aryan are intentionally on the two clearest en-IN voices so English
  // remains crisp and natural for enterprise sales and BFSI interviews.
  priya_coach: "ta-IN-PallaviNeural",
  raj:         "ta-IN-ValluvarNeural",
  // Restored from Vikram's previous clear, technical voice.
  vikram:      "en-US-AndrewNeural",
  ananya:      "te-IN-ShrutiNeural",
  meera_coach: "bn-IN-BashkarNeural",
  // NOTE: pa-IN, or-IN, as-IN and all hi-IN v2 voices return ZERO-BYTE audio
  // from this environment — never map a persona to them.
  kabir:       "mr-IN-ManoharNeural",
  sanjay:      "en-IN-PrabhatNeural",
  // Aryan is a male BFSI interviewer; keep his voice clearly masculine.
  // Salman is a distinct, verified Indian male neural voice.
  aryan:       "ur-IN-SalmanNeural",
};

// Microsoft Edge Neural voices for all 13 Indian languages + English
// Sourced from verified Microsoft voice list (all -Neural suffix voices)
const EDGE_VOICES: Record<string, { male: string; female: string }> = {
  English:   { male: "en-IN-PrabhatNeural",   female: "en-IN-NeerjaNeural" },
  Hindi:     { male: "hi-IN-MadhurNeural",    female: "hi-IN-SwaraNeural" },
  Tamil:     { male: "ta-IN-ValluvarNeural",  female: "ta-IN-PallaviNeural" },
  Telugu:    { male: "te-IN-MohanNeural",     female: "te-IN-ShrutiNeural" },
  Bengali:   { male: "bn-IN-BashkarNeural",   female: "bn-IN-TanishaaNeural" },
  Marathi:   { male: "mr-IN-ManoharNeural",   female: "mr-IN-AarohiNeural" },
  Gujarati:  { male: "gu-IN-NiranjanNeural",  female: "gu-IN-DhwaniNeural" },
  Kannada:   { male: "kn-IN-GaganNeural",     female: "kn-IN-SapnaNeural" },
  Malayalam: { male: "ml-IN-MidhunNeural",    female: "ml-IN-SobhanaNeural" },
  Urdu:      { male: "ur-IN-SalmanNeural",    female: "ur-IN-GulNeural" },
  // pa-IN / or-IN / as-IN Edge voices return HTTP 200 with ZERO-BYTE audio from
  // this environment (verified 2026-08-16) — route these languages to the
  // closest verified-working voices instead of silently failing.
  Punjabi:   { male: "hi-IN-MadhurNeural",    female: "hi-IN-SwaraNeural" },   // Gurmukhi ~ Devanagari-adjacent; hi-IN reads Punjabi-accented Hindi/English
  Odia:      { male: "bn-IN-BashkarNeural",   female: "bn-IN-TanishaaNeural" }, // closest working eastern-Indic voice
  Assamese:  { male: "bn-IN-BashkarNeural",   female: "bn-IN-TanishaaNeural" }, // Assamese script ≈ Bengali script
};

/**
 * Strip AI role-label artifacts that sometimes leak into the spoken text.
 * e.g. "Priya Ma'am: Hello there!" → "Hello there!"
 *      "Ack: Right, I see."        → "Right, I see."
 * Also collapses multiple spaces.
 * Note: Edge TTS rejects SSML <break> tags when passed through toStream(),
 * so we rely solely on the neural voice's built-in punctuation-aware prosody.
 */
function cleanForTTS(text: string): string {
  return text
    // Strip AI role-label prefixes — "TeacherName: " or "Ack:" / "Next:" at line start
    .replace(/^[A-Za-zÀ-ÿ'\s]{2,30}:\s*/m, "")
    .replace(/\bAck:\s*/gi, "")
    .replace(/\bNext:\s*/gi, "")
    // Strip markdown action/emote words in asterisks — *smiles warmly*, *chuckles*, etc.
    .replace(/\*[^*]{1,40}\*/g, "")
    // Strip markdown bold (**text**) and italic (*text* or _text_)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Strip markdown headers — ## Heading → Heading
    .replace(/^#{1,6}\s+/gm, "")
    // Strip parenthetical stage directions — (smiles), (pause), (laughs)
    .replace(/\([^)]{1,30}\)/g, "")
    // Strip leading/trailing quote marks the model sometimes wraps around output
    .replace(/^\s*["'"]/m, "")
    .replace(/["'"]\s*$/m, "")
  // Give common workplace acronyms a pronounceable spoken form.
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
  // Collapse extra whitespace
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Indic (Devanagari … Malayalam) + Arabic (Urdu) script char counts.
// Used to decide which voice dominates a mixed-script reply.
const NATIVE_SCRIPT_G = /[\u0900-\u0D7F\u0600-\u06FF]/g;
const LATIN_G = /[A-Za-z]/g;

/** Stream a single voice straight to the response (default, low-latency path). */
async function streamVoice(res: Response, voiceName: string, text: string): Promise<void> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  // msedge-tts can return HTTP 200 with a zero-byte stream for wrapped SSML.
  // Keep the reliable plain-text path; persona rate profiles are applied to
  // playback in the browser where they cannot make the server response silent.
  const { audioStream } = tts.toStream(text);
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  audioStream.pipe(res);
  audioStream.on("error", () => {
    if (!res.headersSent) res.status(500).json({ error: "TTS stream error" });
    else res.end();
  });
}

router.post("/tts", async (req, res) => {
  const {
    text,
    language = "English",
    gender = "female",
    voiceStyle,
    nativeLanguage,
  } = req.body as {
    text?: string;
    language?: string;
    gender?: "male" | "female";
    voiceStyle?: string;
    nativeLanguage?: string;
  };

  if (!text?.trim()) {
    res.status(400).json({ error: "Missing 'text' field" });
    return;
  }
  // Cap input length — Edge TTS handles ~3000 chars reliably; reject oversized payloads
  if (text.trim().length > 3000) {
    res.status(400).json({ error: "Text too long (max 3000 characters)" });
    return;
  }

  // cleanForTTS strips role-label echoes / stage directions; the neural voices
  // pause naturally at punctuation.
  const cleaned = cleanForTTS(text.trim());
  if (!cleaned) {
    res.status(400).json({ error: "No speakable text" });
    return;
  }

  // Use the persona mapping whenever the caller supplies a voiceStyle.
  // Previously this value was ignored, so every male persona fell back to the
  // same Prabhat voice despite having a distinct map entry.
  const englishVoice =
    (voiceStyle ? TUTOR_VOICE_MAP[voiceStyle] : undefined) ??
    (gender === "male" ? EDGE_VOICES["English"]!.male : EDGE_VOICES["English"]!.female);

  // Voice for native-script runs: only when a real, supported native language is
  // supplied (absent for greetings / Interview Ace / English-only mode).
  const nativeVoices =
    nativeLanguage && nativeLanguage !== "English" ? EDGE_VOICES[nativeLanguage] : undefined;
  const nativeVoice = nativeVoices
    ? (gender === "male" ? nativeVoices.male : nativeVoices.female)
    : undefined;

  try {
    if (nativeVoice) {
      // ── Single-voice selection ────────────────────────────────────────────
      // Per-character segment stitching (previous approach) rendered each
      // script-boundary fragment — often just 1–3 words — without surrounding
      // sentence context.  Each clip therefore had its own prosodic ramp,
      // causing a mechanical, "robotic" quality on concatenation.
      //
      // Microsoft's Indian Neural voices are trained on code-switched data and
      // pronounce English words naturally in an Indian accent, so one voice
      // reading the full sentence always sounds more natural than two voices
      // stitched at character boundaries.
      //
      // Choice rule:  native-script chars ≥ 25 % of total script chars
      //               → native voice  (handles English code-switches naturally)
      //               < 25 %          → tutor English voice (mostly English reply)
      const nativeCount = cleaned.match(NATIVE_SCRIPT_G)?.length ?? 0;
      const latinCount  = cleaned.match(LATIN_G)?.length ?? 0;
      const totalScript = nativeCount + latinCount;
      const useNative   = totalScript > 0 && nativeCount / totalScript >= 0.25;
       await streamVoice(res, useNative ? nativeVoice : englishVoice, cleaned);
      return;
    }

    // ── Default single-voice path (unchanged behaviour) ────────────────────
    const langVoices = EDGE_VOICES[language] ?? EDGE_VOICES["English"]!;
    const primaryVoice = language === "English"
      ? englishVoice
      : (gender === "male" ? langVoices.male : langVoices.female);
    await streamVoice(res, primaryVoice, cleaned);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: String(err) });
    } else {
      res.end();
    }
  }
});

// Return the list of supported languages
router.get("/tts/voices", (_req, res) => {
  res.json(Object.keys(EDGE_VOICES));
});

export default router;
