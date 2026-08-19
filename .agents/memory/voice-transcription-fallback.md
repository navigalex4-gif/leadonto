---
name: Voice transcription provider fallback
description: Shared silent MediaRecorder/VAD STT behavior and provider fallback when transcription services are unavailable.
---

The shared voice hook uses MediaRecorder/VAD and sends utterances to `/api/stt`. The API uses Google Cloud Speech-to-Text first, then Gemini. Web live products do not use browser SpeechRecognition.

**Why:** Android Chrome's browser SpeechRecognition service emits an unavoidable system earcon and can create competing recognition sessions. The silent server path avoids that sound.

**How to apply:** Do not add Web Speech Recognition back to web live products. Keep MediaRecorder/VAD as the single web capture path and treat final server transcription as authoritative.

Google Speech-to-Text V2 Chirp 3 was tested in production and rejected with `PERMISSION_DENIED` for `speech.recognizers.recognize` on the implicit recognizer. Do not make Chirp 3 the sole transcription path unless that IAM permission and recognizer configuration are verified in the deployed project.

**Why:** A successful local build did not imply deployed recognizer permission; the resulting failure made all voice turns appear unresponsive.

## Accuracy-first retry policy
The shared hook should stay on server STT after a provider error.

**Why:** browser recognition is noticeably less reliable for Indian English and mixed-accent answers and reintroduces Android's external earcon.

**How to apply:** reset the consecutive-failure counter on any non-empty server transcript and keep the MediaRecorder path active for the next turn.