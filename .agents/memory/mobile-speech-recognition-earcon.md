---
name: Mobile Speech Recognition earcon
description: Android Chrome/Web Speech start-stop chimes are browser/OS audio, not app audio.
---

Android Chrome can play a short two-note earcon when the Web Speech Recognition service starts or stops listening. It does not come from the page's HTMLAudioElement, TTS response, AudioContext, or an in-app sound asset.

**Why:** The conversation code contains no notification sound effect, while the recorded tone aligns with recognition lifecycle boundaries and the page uses `webkitSpeechRecognition`.

**How to apply:** Web Live Conversation, Interview Ace, and Communication Check must use MediaRecorder/VAD plus server STT, with recorder-based provisional text if needed. Never invoke SpeechRecognition or `webkitSpeechRecognition` for these web flows. Expo/mobile-native behavior is a separate decision.