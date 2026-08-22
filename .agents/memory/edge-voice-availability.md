---
name: Edge voice availability in this env
description: Which Edge Neural voices produce audio vs zero-byte streams from this Replit environment.
---

Rule: before mapping any persona to an Edge Neural voice, verify it returns non-empty audio from THIS environment — several voices return HTTP 200 with a zero-byte MP3 stream.

**Verified DEAD (0 bytes, 2026-08-16):** pa-IN-Vaani, or-IN-Sukant, as-IN-Priyom, and ALL hi-IN v2 voices (Aarav, Ananya, Kavya, Kunal, Rehaan).
**Verified WORKING:** en-IN Neerja/Prabhat, hi-IN Swara/Madhur, bn-IN Tanishaa/Bashkar, kn-IN Gagan/Sapna, mr-IN Aarohi/Manohar, gu-IN Niranjan/Dhwani, ta-IN Valluvar/Pallavi, te-IN Shruti/Mohan, ml-IN Midhun/Sobhana, ur-IN Salman/Gul.

**Why:** user-uploaded zips repeatedly re-map personas to dead voices (pa/or/as); applying them blindly silences the persona.
**How to apply:** run a quick msedge-tts stream byte-count test (script pattern: pipe toStream, count bytes, >1000 = OK) before changing TUTOR_VOICE_MAP; keep the dead-voice warning comment in tts.ts.

## Google native voice catalog
For Google Cloud native-language TTS, query and cache the provider's actual locale voice catalog instead of hardcoding Wavenet or Chirp names across Indian languages.

**Why:** a plausible Telugu Wavenet name returned `VOICE_DOES_NOT_EXIST` in this environment while other locale voices worked.

**How to apply:** select a valid locale voice from `listVoices(languageCode)`, fall back to a valid Hindi voice for locales without a dedicated entry, and verify every supported language with a non-empty audio response.

## Hindi recognition model
Hindi audio needs Google's `latest_long` recognition model in this app. The faster `latest_short` model has been observed to drop Devanagari vowel signs, producing fragments such as “क स” instead of “कैसे”; keep English on `latest_short` for latency.

## Shared Devanagari routing
Hindi and Marathi both use Devanagari, so script detection alone cannot choose the TTS language. When the selected native language is either Hindi or Marathi, Devanagari runs must retain that selected language rather than defaulting to Hindi or English.
