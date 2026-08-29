---
name: API security hardening
description: Production startup, CORS, and cost-bearing endpoint safeguards for the EduBharat API.
---

Production API instances must have a persistent database-backed session store and a strong session secret; CORS must be an explicit origin allowlist rather than reflective origin mirroring. Cost-bearing anonymous endpoints need bounded request size and per-IP throttling even when guest access is intentional.

**Why:** The app serves authenticated browser flows and expensive AI, speech, and voice requests. A permissive CORS policy or in-memory production sessions can turn a browser bug or instance restart into a security and reliability issue. Replit's local preview proxy currently presents as `http://127.0.0.1:80`, which must be allowed only in development or browser previews.

**How to apply:** Keep canonical production origins explicit, add only known development proxy origins outside production, and verify health plus browser-origin requests after changing middleware order or workflow ports.