---
name: Persona voice uniqueness
description: Every English Guru teacher and Interview Ace interviewer must have a unique Indian neural voice.
---

## Rule
Never map two persona `voiceStyle` keys to the same Edge Neural voice. Use the verified Indian regional voice families when the two en-IN voices are already assigned.

**Why:** Reusing Neerja for every female persona and Prabhat for every male persona makes all AI characters sound identical, regardless of their names or speaking prompts.

**How to apply:** Keep the one-to-one mapping in `artifacts/api-server/src/routes/tts.ts` and test every persona with `/api/tts` after changing it. Do not use SSML prosody wrappers with `msedge-tts`; they can return zero-byte audio. Apply only subtle client playback-rate differences in `use-edge-tts.ts`.