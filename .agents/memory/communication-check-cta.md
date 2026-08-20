---
name: Homepage communication check CTA
description: The homepage conversion CTA is a free 90-second voice assessment with candidate capture, concise feedback, and admin reporting.
---

The homepage CTA routes to a dedicated 90-second voice communication check rather than the metered full Interview Ace flow. It collects candidate contact/profile data, keeps the interviewer conversational for the full timer, stores answers and scorecard feedback, and exposes completed leads to admins.

**Why:** the CTA must be low-friction for traffic conversion while still producing useful lead data and a clear next action.

**How to apply:** keep the result short and honest, preserve guest completion, keep candidate data separate from full interview sessions, and maintain the immediate acknowledgement plus strict response deadline for live voice turns.

The API validation must allow multiple short answers during the complete 90-second session; limiting the transcript to only a couple of turns can reject the final save and prevent both feedback persistence and email delivery.

**Why:** conversational voice sessions naturally produce more turns than a two-question prototype, and the final save is the trigger point for the result email.

The live check uses a finite, varied topic bank plus normalized word-overlap checks against every asked question. AI-generated prompts remain personalized, but repeated or near-duplicate prompts are replaced with the next unused topic.

**Why:** a 90-second voice flow can ask many short prompts; relying on the model alone makes repetition visible and reduces trust.

**How to apply:** keep the hard 90-second timer, preserve the full asked-question history, and use the existing `AnimatedAvatar` portrait with `isSpeaking` bound to the TTS hook. Never connect the lip animation to the audio analyser graph.

## Final response window and communication-signal question bank
The Communication Check keeps the final 10 seconds as a real response window. It must not stop the microphone or reject the candidate's answer when the countdown reaches 10; one answer received during that window is captured and sent directly to feedback, while the timer still finishes the session if the candidate stays silent.

**Why:** stopping at 10 seconds made the interviewer announce the wrap-up before the candidate could answer the last question, so the check lost its most recent communication signal.

**How to apply:** use a dedicated final-window ref separate from the overall ending guard. The question bank should sample observable communication dimensions — structure, clarity, explanation, listening/empathy, collaboration, persuasion, adaptability, confidence and self-awareness — rather than generic small talk. Keep interviewer TTS brisk and energetic but intelligible.

## Grounded feedback and transcription
Communication-check feedback must distinguish AI-grounded analysis from an indicative fallback. Require concrete evidence from captured answers and a response-specific practice plan; generic fallback wording must never be presented as personalized feedback. Browser WebM/Opus speech uses Google Cloud Speech-to-Text first, then Deepgram Nova-3, then Gemini recovery; preview chunks are display-only.

**Why:** the provider fallback chain can take longer than a short feedback timeout, causing a generic scorecard to be shown even when answers were captured successfully.

**How to apply:** allow enough time for the full AI fallback chain, include a source label in the result, reject AI JSON without evidence, and show fallback results as indicative only.