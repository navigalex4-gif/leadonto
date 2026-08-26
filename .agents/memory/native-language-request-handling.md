---
name: Native language request handling
description: Why direct helper-language requests need deterministic handling in live English Guru conversations
---

Direct requests such as “Can you speak in Hindi properly?” must be handled locally rather than sent to the short live-chat model. This applies even when that helper language is already selected; otherwise the model can answer with malformed or irrelevant native-script text.

**Why:** The visible chat bubble is created from the AI response before TTS runs. Google Cloud TTS can successfully synthesize a response while the model response itself is still linguistically wrong, so a TTS quota investigation does not fix this symptom.

**How to apply:** Keep direct language-setting requests separate from “translate this into …” requests. Use a deterministic, correctly scripted confirmation for the requested language, then return to the normal mostly-English coaching flow.