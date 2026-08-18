---
name: Voice transcription provider fallback
description: Shared STT behavior when Gemini is quota-exhausted or Cloud Speech is unavailable, including the Chirp 3 permission constraint.
---

The shared voice hook uses MediaRecorder/VAD and sends utterances to `/api/stt`. The API tries Gemini first, then Google Cloud Speech-to-Text using the existing Google Cloud service-account secret. If both providers fail, the browser SpeechRecognition API is used as a recovery path so Live Conversation, Interview Ace, and Communication Check can keep listening.

**Why:** The Gemini project can return `429 RESOURCE_EXHAUSTED`, while Google Cloud Speech-to-Text may be disabled independently. Without a client fallback, all voice features appear frozen because they share the same transcription endpoint.

**How to apply:** Preserve the fallback in the shared hook and keep browser recognition lifecycle-aware: stop it during TTS blocking, pause, and end; do not let it overlap MediaRecorder; restart it only while continuity is active.

Google Speech-to-Text V2 Chirp 3 was tested in production and rejected with `PERMISSION_DENIED` for `speech.recognizers.recognize` on the implicit recognizer. Do not make Chirp 3 the sole transcription path unless that IAM permission and recognizer configuration are verified in the deployed project.

**Why:** A successful local build did not imply deployed recognizer permission; the resulting failure made all voice turns appear unresponsive.