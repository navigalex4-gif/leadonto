---
name: Isolated translation architecture
description: Provider boundaries for native-language translation in live English practice
---

Native-language translation must remain a separate structured operation from live coaching: send only source text and target language to Gemini, validate the returned translation before speech, and keep normal conversation on Claude.

**Why:** A generic conversation prompt can treat a translation request as coaching context, acknowledge instead of translating, or return malformed native script. Provider fallback makes that failure harder to diagnose and repeatable.

**How to apply:** Add translation behavior only behind the dedicated JSON contract. Never route translation through the normal conversation SSE endpoint or pass translation output to TTS until it passes shape, target-script, and fragmentation checks.