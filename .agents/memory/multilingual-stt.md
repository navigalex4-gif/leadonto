---
name: Multilingual speech recognition
description: Live English practice transcription must support code-switching between English and Indian languages
---

Use Deepgram Nova-3 multilingual mode for live English practice rather than pinning the stream to en-IN or restarting recognition whenever the helper language changes.

**Why:** learners commonly mix English with a native-language explanation in one utterance; a fixed English locale produces phonetic gibberish before the AI can interpret the turn.

**How to apply:** keep the live websocket on `language=multi`, let the selected helper language guide the AI response and TTS, and preserve native-output validation so malformed generated script is not shown or spoken.