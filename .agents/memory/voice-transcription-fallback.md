---
name: Voice transcription provider fallback
description: Shared STT behavior when Gemini is quota-exhausted or Cloud Speech is unavailable, including the Chirp 3 permission constraint.
---

The shared web voice hook uses silent MediaRecorder/VAD and sends utterances to `/api/stt`. It also requests best-effort provisional transcripts while an utterance is still active; those previews are display-only and final server STT remains authoritative. The API tries Gemini first, then Google Cloud Speech-to-Text using the existing Google Cloud service-account secret.

**Why:** The Gemini project can return `429 RESOURCE_EXHAUSTED`, while Google Cloud Speech-to-Text may be disabled independently. Without a client fallback, all voice features appear frozen because they share the same transcription endpoint.

**How to apply:** Keep provisional preview requests separate from final `onPhrase` delivery, invalidate them at utterance boundaries, and never restore browser SpeechRecognition on the web live-service path because Android Chrome emits an external start/stop earcon.

Google Speech-to-Text V2 Chirp 3 was tested in production and rejected with `PERMISSION_DENIED` for `speech.recognizers.recognize` on the implicit recognizer. Do not make Chirp 3 the sole transcription path unless that IAM permission and recognizer configuration are verified in the deployed project.

**Why:** A successful local build did not imply deployed recognizer permission; the resulting failure made all voice turns appear unresponsive.

## Accuracy-first retry policy
The shared hook should keep the silent MediaRecorder/server path active after transient STT failures. Do not switch to browser SpeechRecognition as a recovery path on web live services.

**Why:** browser recognition is noticeably less reliable for Indian English and mixed-accent answers, and Android Chrome adds a system earcon at recognition lifecycle boundaries.

**How to apply:** reset the consecutive-failure counter on any non-empty server transcript, keep MediaRecorder active for the next turn, and show a recoverable message without stranding the conversation.