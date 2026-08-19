---
name: Interview turn recovery
description: Live interview turns need a deterministic local question fallback when AI generation stalls.
---

Every submitted interview answer must have a bounded recovery path: if the AI follow-up does not commit promptly, advance with an unused local question and ignore the late response.

**Why:** Speech transcription and AI generation can complete independently; an exception or slow stream otherwise leaves the candidate stuck on the same question with no visible error.

**How to apply:** Keep the recovery timeout longer than the normal stream deadline but shorter than a frustrating wait, guard against duplicate late commits, and preserve the same competency rotation when selecting the fallback.