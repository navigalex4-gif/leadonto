---
name: Live learning exports
description: Shared download behavior and live conversation pause semantics across English learning surfaces.
---

Generated learning content uses a browser-side plain-text download helper, while authenticated admin and B2B data uses the same escaped CSV helper. Live Conversation Pause stops recognition and TTS without ending the metered session; End clears the session and metering state.

**Why:** Users need portable summaries and reports, while pausing a live lesson should not unexpectedly discard or charge away the ongoing session.

**How to apply:** Reuse the shared export helpers for new generated-content or admin/B2B report surfaces. Keep pause and end as separate actions when changing conversational voice UI.