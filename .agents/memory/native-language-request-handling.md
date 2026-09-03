---
name: Native language request handling
description: Why direct helper-language requests need deterministic handling in live English Guru conversations
---

Direct requests such as “Can you speak in Hindi properly?” must be handled deterministically at the shared AI API boundary rather than sent to a short live-chat model. This applies even when that helper language is already selected; otherwise the model can answer with malformed or irrelevant native-script text.

**Why:** The visible chat bubble is created from the AI response before TTS runs. Google Cloud TTS can successfully synthesize a response while the model response itself is still linguistically wrong, so a TTS quota investigation does not fix this symptom.

**How to apply:** Keep direct language-setting requests separate from “translate this into …” requests in the shared API policy. Return a correctly scripted deterministic confirmation for a pure switch request, and apply strict native-script instructions to translation/explanation requests across every provider and AI endpoint.

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

For a conversational turn, detect the actual native script in the learner's latest
message even when the saved helper-language preference is English or names another
Indian language. Use that detected language for the turn's native reply, validation,
and TTS voice without silently changing the saved preference.

**Why:** Learners can switch languages mid-session or arrive with an old English
preference; routing only through the saved setting let genuine Hindi/Telugu/etc.
messages reach an English-only prompt and receive vague replies.

**How to apply:** Require a native-script-first answer for detected native turns,
retry once when the provider returns English, foreign script, fragmented text, or
generic acknowledgement. Do not reject useful native-script text only because a
stream timeout left it without terminal punctuation; use the local fallback only
when the response is empty or genuinely malformed. Force the matching native
voice when the valid reply contains a short English practice sentence.

The shared language policy must distinguish an explicit language command in the
learner's message from a helper-language name repeated in the system prompt.

**Why:** Treating the selected helper language as a fresh switch request added a
generic acknowledgement instruction to ordinary native turns, which encouraged
the exact canned reply the client was trying to detect.

**How to apply:** Only explicit language names in the user prompt may trigger
deterministic switch or translation routing. For ordinary native-script turns,
preserve the substantive streamed reply when its script is valid, even if it is
partial or punctuation-free.

The live conversation API should receive the selected response language and a
structured native-input flag in addition to the free-form prompt and system
text.

**Why:** A valid HTTP 200/SSE response can still be English when language intent
is left for a model to infer from a long prompt; explicit routing metadata lets
the server enforce native-first output before provider selection.

**How to apply:** Send `responseLanguage` and `nativeInputDetected` on every
English Guru conversation/retry request, and make the API apply the native
script contract whenever the flag is true.