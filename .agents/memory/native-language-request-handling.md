---
name: Native language request handling
description: Why direct helper-language requests need deterministic handling in live English Guru conversations
---

Direct requests such as “Can you speak in Hindi properly?” must be handled locally rather than sent to the short live-chat model. This applies even when that helper language is already selected; otherwise the model can answer with malformed or irrelevant native-script text.

**Why:** The visible chat bubble is created from the AI response before TTS runs. Google Cloud TTS can successfully synthesize a response while the model response itself is still linguistically wrong, so a TTS quota investigation does not fix this symptom.

**How to apply:** Keep direct language-setting requests separate from “translate this into …” requests. Use a deterministic, correctly scripted confirmation for the requested language, then return to the normal mostly-English coaching flow.

Natural learner phrasing needs the same deterministic path: “What is this? Hindi?”, a
meaning question written in the selected native script, and mixed-language questions
such as “Immediately को Marathi में क्या बोलते हैं?” are translation requests even
when they do not contain the exact English phrase “translate this”.

**Why:** The saved conversation showed these forms repeatedly falling through to the
short coaching model, which returned the generic native acknowledgement instead of
the requested meaning.

**How to apply:** Detect the target language from English or native-script aliases,
extract an explicit English word/phrase when present, otherwise use the latest real
English teacher sentence, and never use a generic native recovery reply as the source.