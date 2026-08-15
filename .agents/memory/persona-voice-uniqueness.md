---
name: Persona voice uniqueness
description: Every English Guru tutor and Interview Ace coach must use a different Microsoft Edge Neural voice to sound distinct.
---

## Rule
Never assign the same Edge Neural voice to two personas. With only 2 en-IN voices (Neerja/Prabhat), regional Indian language voices fill the remaining slots — they speak English with distinctly different accents and timbres.

**Why:** Before this fix, all female personas shared NeerjaNeural and all males shared PrabhatNeural, making every AI teacher/interviewer sound identical despite different names and styles.

## Current assignment (TUTOR_VOICE_MAP in api-server/src/routes/tts.ts)

### English Guru tutors
| key | voice | accent |
|-----|-------|--------|
| priya | en-IN-NeerjaNeural | clear Indian English female |
| rohit | en-IN-PrabhatNeural | clear Indian English male |
| maya | hi-IN-SwaraNeural | Hindi-accented female |
| arjun | hi-IN-MadhurNeural | Hindi-accented male |
| neha | bn-IN-TanishaaNeural | Bengali-accented female |
| rahul | kn-IN-GaganNeural | Kannada-accented male |

### Interview Ace coaches
| key | voice | accent |
|-----|-------|--------|
| priya_coach | mr-IN-AarohiNeural | Marathi-accented female |
| raj | gu-IN-NiranjanNeural | Gujarati-accented male |
| vikram | ta-IN-ValluvarNeural | Tamil-accented male |
| ananya | ta-IN-PallaviNeural | Tamil-accented female |
| meera_coach | te-IN-ShrutiNeural | Telugu-accented female |
| kabir | bn-IN-BashkarNeural | Bengali-accented male |
| sanjay | ml-IN-MidhunNeural | Malayalam-accented male |
| aryan | mr-IN-ManoharNeural | Marathi-accented male |

## How to apply
- When adding a new persona, pick a voice NOT already in this table.
- If a regional language voice is assigned, the `nativeLanguage` field must NOT be set to that language for that persona (it's an English-teaching context) — the voice still speaks English text naturally but with the regional accent.
- SSML prosody wrapping silently produces 0-byte audio from msedge-tts — do not use it. Persona pacing is applied client-side via VOICE_STYLE_RATES in use-edge-tts.ts.
- Available female voices not yet used: kn-IN-SapnaNeural, ml-IN-SobhanaNeural, gu-IN-DhwaniNeural
- Available male voices not yet used: te-IN-MohanNeural, ur-IN-SalmanNeural, or-IN-SukantNeural
