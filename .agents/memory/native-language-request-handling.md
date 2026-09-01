---
name: Native language request handling
description: Why direct helper-language requests need deterministic handling in live English Guru conversations
---

Direct requests such as “Can you speak in Hindi properly?” must be handled locally rather than sent to the short live-chat model. This applies even when that helper language is already selected; otherwise the model can answer with malformed or irrelevant native-script text.

**Why:** The visible chat bubble is created from the AI response before TTS runs. Google Cloud TTS can successfully synthesize a response while the model response itself is still linguistically wrong, so a TTS quota investigation does not fix this symptom.

**How to apply:** Keep direct language-setting requests separate from “translate this into …” requests. Use a deterministic, correctly scripted confirmation for the requested language, then return to the normal mostly-English coaching flow.

Direct language commands must recognize the command verb in supported native
scripts, not only the language name or English verbs. For example, “पूरा बोलो
मराठी में”, “पूर्ण मराठीत बोला”, and “తెలుగులో మాట్లాడండి” are setting
requests and must take the same deterministic path as “Speak in Marathi”.

**Why:** Detecting the Marathi target while only recognizing English command
verbs still sends these common mixed-script requests to the live model, where
they can produce malformed or fragmented native text.

**How to apply:** Detect native-script speak/talk/reply commands across every
supported helper language. Let explicit translation-source requests keep
translation precedence; otherwise use the named language, or the currently
selected helper language when the command omits its name.

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

Native-script quality checks must cover both over-spaced graphemes and long
concatenated Indic runs with missing word boundaries, with the long-run check before
any token-count shortcut.

**Why:** A provider can return HTTP 200 and valid TTS audio while emitting a
sentence that renders and sounds broken because the words were concatenated.

**How to apply:** Reject or replace clearly malformed native output before it reaches
the chat history or TTS; if a translation has no valid source, ask for the source
deterministically instead of invoking the coach model.