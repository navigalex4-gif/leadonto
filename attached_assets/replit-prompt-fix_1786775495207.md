# Replit Agent Prompt — LeadOnto / EduBharat Fix

## CONTEXT
This is a full-stack edtech app (React/Vite frontend in `artifacts/edubharat/`, Express backend in `artifacts/api-server/`). Two core features — **Interview Ace** and **English Guru** — are broken and not responding. Fix them completely, and while doing so, give every AI coach and tutor a distinct Indian-accented voice using the existing Microsoft Edge TTS neural voice infrastructure already wired in `artifacts/api-server/src/routes/tts.ts`.

---

## TASK 1 — Diagnose and fix Interview Ace and English Guru not responding

Work through this checklist in order. Do not skip steps.

### Step 1 — Check if the backend API server is actually running
- Open the Shell tab. Run `cd artifacts/api-server && node -e "require('dotenv').config(); console.log('ANTHROPIC_KEY:', !!process.env.ANTHROPIC_API_KEY, 'GEMINI_KEY:', !!process.env.GEMINI_API_KEY)"`.
- If either key is missing, check `.env` or Replit Secrets and add the missing key.
- Run `pnpm --filter api-server dev` in one shell and confirm it starts without errors on port 3001 (or whatever PORT is set).

### Step 2 — Check the TTS route is reachable
- In the Shell, run: `curl -s -X POST http://localhost:3001/api/tts -H "Content-Type: application/json" -d '{"text":"Hello, I am Priya","voiceStyle":"priya","gender":"female"}' --output /tmp/test.mp3 && ls -lh /tmp/test.mp3`
- If the file is under 1 KB or the command errors, the TTS service is broken. Fix `artifacts/api-server/src/routes/tts.ts` — check that `msedge-tts` is installed (`pnpm --filter api-server add msedge-tts` if missing) and that the `streamVoice` function is actually piping the audio stream correctly.
- If `msedge-tts` fails with a WebSocket error, replace it with the `edge-tts` npm package as a drop-in (same API surface): `pnpm --filter api-server add edge-tts`.

### Step 3 — Check the AI stream route
- Run: `curl -s -X POST http://localhost:3001/api/ai/stream -H "Content-Type: application/json" -d '{"prompt":"Say hello in one sentence","system":"You are a helpful assistant"}' --no-buffer | head -5`
- If this errors or returns nothing, open `artifacts/api-server/src/routes/ai.ts` and check the primary model call. The app tries Claude first then falls back to Gemini. If Claude is erroring, check the Anthropic API key and that the model string is exactly `claude-haiku-4-5` or `claude-sonnet-4-6` (not an old model name).

### Step 4 — Check the frontend proxy
- Open `artifacts/edubharat/vite.config.ts`. Confirm there is a proxy entry that forwards `/api` to `http://localhost:3001`. If the proxy target is wrong or missing, fix it. Example:
  ```ts
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  }
  ```

### Step 5 — Check mic/speech recognition permissions in Interview Ace
- Open `artifacts/edubharat/src/lib/use-speech-recognition.ts`. Confirm the `SpeechRecognition` setup calls `recognition.start()` only after a user gesture (button click), not on mount. If it calls `start()` on mount, it will silently fail on most browsers. Move `start()` to be triggered by the user pressing the microphone button.
- Also confirm `recognition.continuous = true` and `recognition.interimResults = true` are set.

### Step 6 — Fix the conversation loop if still broken
- In `artifacts/edubharat/src/pages/interview-ace.tsx`, find the function that submits the candidate's answer and calls the AI stream. Add a `console.error` catch block around the stream call if one is not present — errors may be swallowing silently.
- In `artifacts/edubharat/src/pages/english-guru.tsx`, do the same around the `synth.speak()` call chain and the AI fetch.
- Open the browser console while running the app and paste any errors here if the issue is still not clear.

---

## TASK 2 — Give every AI coach and tutor a distinct, differentiated Indian-accented voice

The voice infrastructure already exists in `artifacts/api-server/src/routes/tts.ts`. The current `TUTOR_VOICE_MAP` assigns neural voices, but several voices are reused across personas making them sound identical. Reassign so each persona sounds genuinely different in tone, pace, and regional Indian accent.

### Update `TUTOR_VOICE_MAP` in `artifacts/api-server/src/routes/tts.ts`

Replace the existing `TUTOR_VOICE_MAP` with the following. All voices are verified Microsoft Edge Neural voices with Indian accents:

```typescript
const TUTOR_VOICE_MAP: Record<string, string> = {
  // ── English Guru tutors ────────────────────────────────────────────────────
  // Each tutor has a completely different voice — accent, cadence, and warmth
  // all vary so a user switching teachers hears an immediately different person.

  priya:  "en-IN-NeerjaNeural",      // Warm, friendly Indian female — beginner-friendly pace
  rohit:  "en-IN-PrabhatNeural",     // Confident Indian male — steady, corporate cadence
  maya:   "en-IN-NeerjaNeural",      // Keep Neerja but add rate adjustment via SSML (see below)
  arjun:  "hi-IN-MadhurNeural",      // Hindi-accented male — energetic, interview coaching feel
  neha:   "en-IN-NeerjaNeural",      // Same base but pronunciation-focused (rate slowed in SSML)
  rahul:  "en-IN-PrabhatNeural",     // Indian male — methodical grammar teacher cadence

  // ── Interview Ace coaches ──────────────────────────────────────────────────
  // Coaches must sound like real Indian HR / tech / finance professionals,
  // not like a generic neutral English voice. Use Indian-accented voices throughout.

  priya_coach: "en-IN-NeerjaNeural", // Campus placement — warm, encouraging, Indian female
  raj:         "en-IN-PrabhatNeural",// Senior HR — authoritative Indian male, measured pace
  vikram:      "hi-IN-MadhurNeural", // Technical — crisp Hindi-accented male, direct tone
  ananya:      "en-IN-NeerjaNeural", // Sales & marketing — energetic Indian female
  aryan:       "en-IN-PrabhatNeural",// Finance/BFSI — formal Indian male, slower deliberate pace
};
```

**Important note on voice distinctiveness:** Because `en-IN-NeerjaNeural` is used for multiple female personas, differentiate them at the prompt/system level (see Task 3 below) — the *character* of what they say creates the distinctiveness even when the raw voice model is shared. If the budget allows adding additional real Microsoft voices, these two are alternatives:
- `en-IN-RehaanNeural` — lighter Indian male voice (good for Arjun / Vikram)
- `en-IN-AashiNeural` — younger-sounding Indian female (good for Ananya)

Add them to `TUTOR_VOICE_MAP` if they are available via `msedge-tts` in this environment.

### Add speaking-rate and style modulation

Edge TTS supports SSML. Update the `streamVoice` function in `tts.ts` to wrap the text in SSML `<prosody>` tags based on the voice style, so each tutor has a different speaking pace and pitch even when sharing the same neural model:

```typescript
// Add this map above streamVoice()
const VOICE_PROSODY: Record<string, { rate: string; pitch: string }> = {
  priya:       { rate: "medium",  pitch: "+2Hz"  }, // warm, natural pace
  rohit:       { rate: "medium",  pitch: "-3Hz"  }, // lower, professional
  maya:        { rate: "-5%",     pitch: "+0Hz"  }, // slightly slower, precise
  arjun:       { rate: "+8%",     pitch: "+1Hz"  }, // faster, energetic
  neha:        { rate: "-10%",    pitch: "+2Hz"  }, // slow and clear for pronunciation
  rahul:       { rate: "-5%",     pitch: "-2Hz"  }, // methodical, explanatory
  priya_coach: { rate: "medium",  pitch: "+3Hz"  }, // bright, encouraging
  raj:         { rate: "-5%",     pitch: "-5Hz"  }, // authority, measured
  vikram:      { rate: "+5%",     pitch: "-2Hz"  }, // direct, technical
  ananya:      { rate: "+10%",    pitch: "+4Hz"  }, // high-energy, sales-like
  aryan:       { rate: "-8%",     pitch: "-4Hz"  }, // formal, banking panel feel
};

// Update streamVoice() to accept optional prosody
async function streamVoice(
  res: Response,
  voiceName: string,
  text: string,
  prosody?: { rate: string; pitch: string }
): Promise<void> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  // Wrap in SSML prosody if style overrides are provided
  const ssmlText = prosody
    ? `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-IN'>
         <voice name='${voiceName}'>
           <prosody rate='${prosody.rate}' pitch='${prosody.pitch}'>
             ${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
           </prosody>
         </voice>
       </speak>`
    : text;

  const { audioStream } = tts.toStream(ssmlText);
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  audioStream.pipe(res);
  audioStream.on("error", () => {
    if (!res.headersSent) res.status(500).json({ error: "TTS stream error" });
    else res.end();
  });
}
```

Then in the `/tts` route handler, pass prosody when a `voiceStyle` is set:
```typescript
const prosody = voiceStyle ? VOICE_PROSODY[voiceStyle] : undefined;
await streamVoice(res, primaryVoice, cleaned, prosody);
```

---

## TASK 3 — Give each coach/tutor a distinct spoken personality in their AI system prompt

Voice alone is not enough — what makes each tutor feel different is *how they speak*. Update the system prompts (or the character description strings used in prompts) in the following files:

**In `artifacts/edubharat/src/pages/english-guru.tsx`** — find where the tutor's system prompt is assembled and ensure it includes these persona-specific speaking style instructions for each tutor:

```
Priya Ma'am: Speak like a warm Mumbai schoolteacher. Use simple words, give lots of encouragement. Say "very good!", "wah!", "no problem at all". Mix in a Hindi word or two naturally — "haan", "bilkul", "thoda practice karo". Never use jargon.

Rohit Sir: Speak like a no-nonsense Delhi corporate trainer. Be direct and structured. Use phrases like "listen carefully", "in a professional setting", "this is what HR expects". Keep it efficient — no fluff.

Maya Ma'am: Speak like a senior Bengaluru business consultant. Precise and polished. Use examples from Indian MNC culture — TCS, Infosys, client calls. Say "this is how you'd phrase it in a boardroom" or "in a client-facing context".

Arjun Sir: Speak like an energetic Hyderabad interview coach. Fast-paced, pumped up. Use phrases like "absolutely nail it", "practice this 10 times", "you've got this yaar". Push the candidate hard but positively.

Neha Ma'am: Speak like a patient Kolkata pronunciation teacher. Go very slowly when demonstrating. Break words into syllables. Say "now repeat after me", "stress the second syllable", "feel the word in your mouth".

Rahul Sir: Speak like a methodical Pune grammar teacher. Explain rules step by step. Use Indian examples — sentences about chai, cricket, festivals. Say "the rule here is...", "a common mistake Indians make is...", "note this carefully".
```

**In `artifacts/edubharat/src/pages/interview-ace.tsx`** — find where the coach system prompt is built (look for `coach.name` or `typeMeta`) and ensure each coach's speaking style is injected:

```
Priya Ma'am (Campus coach): Speak like a kind college placement officer. Encourage constantly. If the candidate struggles, say "arre no problem, try again" or "take your time". Keep the energy gentle and non-threatening.

Raj Sir (HR coach): Speak like a veteran Delhi HR manager with 15 years experience. Measured, authoritative. Short sentences. Ask follow-up questions like a real panelist. Use "I see", "tell me more", "be specific". Do not over-explain.

Vikram Sir (Technical coach): Speak like a sharp Bengaluru tech lead. Ask precise technical questions. If an answer is vague, push with "can you be more specific?" or "what's the time complexity?". Never accept hand-wavy answers.

Ananya Ma'am (Sales coach): Speak like a high-energy Mumbai sales manager. Fast, enthusiastic. Challenge the candidate to pitch better: "your energy dropped there — say it again with conviction". Use "yaar", "come on", "that's your USP!"

Aryan Sir (Finance coach): Speak like a formal Chennai banking panel interviewer. Slow, deliberate, formal. Ask about regulations, calculations, risk. Use "please elaborate", "from a compliance standpoint", "what does the RBI guideline say?"
```

---

## TASK 4 — Final verification checklist

After all fixes are applied, verify each of the following works end-to-end:

1. **Interview Ace — full loop**: Click Begin, hear the coach's opening question spoken aloud in their distinct Indian-accented voice, speak an answer, see it transcribed, hear the coach's follow-up question within ~2 seconds.

2. **English Guru — full loop**: Select Priya Ma'am, type or speak a message in English, hear Priya respond in a warm Indian-accented voice, switch to Rohit Sir and confirm his voice sounds noticeably different (lower, more formal).

3. **Voice distinctiveness test**: Play the greeting of Priya Ma'am vs Raj Sir vs Vikram Sir back-to-back. They must sound like three different people, not the same voice with different text.

4. **No silent failures**: Open the browser dev tools console. There should be no uncaught errors, no 401/403/500 from `/api/tts` or `/api/ai/stream`.

5. **Mic works**: In Interview Ace, after the coach speaks, the mic indicator should activate automatically and capture speech without requiring a page reload.

If any step fails, read the exact error from the console or server logs and fix it before moving on. Do not mark this task complete until all 5 verification steps pass.
