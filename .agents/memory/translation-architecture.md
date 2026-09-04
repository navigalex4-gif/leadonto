---
name: Isolated translation architecture
description: Provider boundaries for native-language translation in live English practice
---

Native-language translation and explanation must remain separate structured operations from live coaching: send only the exact source text, target language, and operation to Gemini, validate the returned text before speech, and keep normal conversation on Claude.

**Why:** A generic conversation prompt can treat a translation/explanation request as coaching context, acknowledge instead of answering, or return malformed native script. Deictic requests such as “explain this question” also fail unless “this” is resolved before the model call.

**How to apply:** Use the dedicated JSON contract for both translate and explain. Resolve “this/that/it” to the latest substantive utterance first; immediate follow-ups reuse that source/language. Never send these tasks through conversation SSE or TTS before validation.

Treat a successful structured endpoint result as terminal. Native-text sanitizers must preserve Unicode combining marks (`\p{M}`), because removing Indic vowel signs corrupts valid text and can falsely trigger generic recovery copy.

**Why:** The endpoint returned valid, readable Hindi, but a second client-side sanitizer stripped Devanagari marks and replaced the good result with a clarification. Nearest-message lookup also selected the learner’s starter prompt instead of the tutor’s question.

**How to apply:** Store the latest substantive tutor question as an authoritative referent at the AI-response boundary. Use it for “the question you asked” and fresh “explain this” follow-ups; clear it when the conversation resets or the tutor changes.