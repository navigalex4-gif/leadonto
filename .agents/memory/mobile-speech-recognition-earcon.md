---
name: Mobile Speech Recognition earcon
description: Android Chrome/Web Speech start-stop chimes are browser/OS audio, not app audio.
---

Android Chrome can play a short two-note earcon when the Web Speech Recognition service starts or stops listening. It does not come from the page's HTMLAudioElement, TTS response, AudioContext, or an in-app sound asset.

**Why:** The conversation code contains no notification sound effect, while the recorded tone aligns with recognition lifecycle boundaries and the page uses `webkitSpeechRecognition`.

**How to apply:** Do not alter TTS, audio muting, or timing to chase this tone. Web live products use MediaRecorder/VAD plus server-side STT and never browser SpeechRecognition.