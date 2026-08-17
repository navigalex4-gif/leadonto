---
name: Mobile Speech Recognition earcon
description: Android Chrome/Web Speech start-stop chimes are browser/OS audio, not app audio.
---

Android Chrome can play a short two-note earcon when the Web Speech Recognition service starts or stops listening. It does not come from the page's HTMLAudioElement, TTS response, AudioContext, or an in-app sound asset.

**Why:** The conversation code contains no notification sound effect, while the recorded tone aligns with recognition lifecycle boundaries and the page uses `webkitSpeechRecognition`.

**How to apply:** Do not alter TTS, audio muting, timing, or microphone lifecycle to chase this tone. Suppressing it requires replacing or changing the recognition implementation, which is a microphone-behavior change; communicate that limitation instead.