---
name: Live turn cancellation
description: Cancellation semantics for voice sessions that combine fetch streaming, TTS, and continuous recognition.
---

Pause and end actions must invalidate the active turn generation before aborting the AI request, stopping TTS, or stopping recognition. Every await continuation and TTS release callback must verify that generation and paused/session state before mutating history, state, or audio.

**Why:** Aborting a fetch is asynchronous; a response can still resolve between await points. Without an invalidation guard, pausing can appear immediate while a late reply is appended or spoken afterward.

**How to apply:** Use a monotonic ref per live session/turn. Increment it synchronously on pause, end, or session replacement; capture its value when accepting a phrase; reject stale work after every awaited enrichment/stream and inside delayed callbacks.