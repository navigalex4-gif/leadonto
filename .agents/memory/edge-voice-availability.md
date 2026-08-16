---
name: Edge voice availability in this env
description: Which Edge Neural voices produce audio vs zero-byte streams from this Replit environment.
---

Rule: before mapping any persona to an Edge Neural voice, verify it returns non-empty audio from THIS environment — several voices return HTTP 200 with a zero-byte MP3 stream.

**Verified DEAD (0 bytes, 2026-08-16):** pa-IN-Vaani, or-IN-Sukant, as-IN-Priyom, and ALL hi-IN v2 voices (Aarav, Ananya, Kavya, Kunal, Rehaan).
**Verified WORKING:** en-IN Neerja/Prabhat, hi-IN Swara/Madhur, bn-IN Tanishaa/Bashkar, kn-IN Gagan/Sapna, mr-IN Aarohi/Manohar, gu-IN Niranjan/Dhwani, ta-IN Valluvar/Pallavi, te-IN Shruti/Mohan, ml-IN Midhun/Sobhana, ur-IN Salman/Gul.

**Why:** user-uploaded zips repeatedly re-map personas to dead voices (pa/or/as); applying them blindly silences the persona.
**How to apply:** run a quick msedge-tts stream byte-count test (script pattern: pipe toStream, count bytes, >1000 = OK) before changing TUTOR_VOICE_MAP; keep the dead-voice warning comment in tts.ts.
