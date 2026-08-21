---
name: Voice transcription provider fallback
description: Shared silent MediaRecorder/VAD STT path, provider ordering, recovery behavior, and WebM upload compatibility.
---

The shared web voice hook uses silent MediaRecorder/VAD and sends complete utterances to `/api/stt`. Display-only server previews are disabled because duplicate STT requests can delay or exhaust final answer transcription. The API uses Deepgram Nova for conversational English first, Google Cloud Speech-to-Text as recovery, and reverses that ordering for Indian languages.

**Why:** Duplicate preview uploads competed with final transcription, while model quotas could make the old AI-first fallback path appear frozen.

**How to apply:** Prioritize one complete final utterance, reject an empty successful response as a failed transcription, preserve the typed-answer recovery path, and never restore browser SpeechRecognition on the web live-service path because Android Chrome emits an external start/stop earcon.

Google Speech-to-Text V2 Chirp 3 was tested in production and rejected with `PERMISSION_DENIED` for `speech.recognizers.recognize` on the implicit recognizer. Do not make Chirp 3 the sole transcription path unless that IAM permission and recognizer configuration are verified in the deployed project.

**Why:** A successful local build did not imply deployed recognizer permission; the resulting failure made all voice turns appear unresponsive.

## Accuracy-first retry policy
The shared hook should keep the silent MediaRecorder/server path active after transient STT failures. Do not switch to browser SpeechRecognition as a recovery path on web live services.

**Why:** browser recognition is noticeably less reliable for Indian English and mixed-accent answers, and Android Chrome adds a system earcon at recognition lifecycle boundaries.

**How to apply:** reset the consecutive-failure counter on any non-empty server transcript, keep MediaRecorder active for the next turn, and show a recoverable message without stranding the conversation.

## Browser upload compatibility
Normalize browser MediaRecorder MIME strings before sending audio to external STT providers: Chromium commonly reports `audio/webm;codecs=opus`, while some provider upload endpoints accept only the container MIME. Preserve the first WebM chunk when assembling rolling/pre-roll utterances; it contains the container initialization segment.

**Why:** A valid browser recording can otherwise be rejected as corrupt or unsupported by the provider, leaving the interview waiting for a transcript and falling through to an unavailable AI transcription fallback. Keeping only a capped tail of chunks can discard the WebM header even when the MIME type is normalized.

**How to apply:** Preserve the original MIME for local Blob/file handling, but send a provider-compatible `Content-Type` such as `audio/webm` to strict upload APIs.