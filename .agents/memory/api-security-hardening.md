---
name: API security hardening
description: Production startup, CORS, and cost-bearing endpoint safeguards for the EduBharat API.
---

Production API instances must have a persistent database-backed session store and a strong session secret; CORS must be an explicit origin allowlist rather than reflective origin mirroring. Cost-bearing anonymous endpoints need bounded request size and per-IP throttling even when guest access is intentional.

**Why:** The app serves authenticated browser flows and expensive AI, speech, and voice requests. A permissive CORS policy or in-memory production sessions can turn a browser bug or instance restart into a security and reliability issue. Replit's local preview proxy currently presents as `http://127.0.0.1:80`, which must be allowed only in development or browser previews.

**How to apply:** Keep canonical production origins explicit, add only known development proxy origins outside production, and verify health plus browser-origin requests after changing middleware order or workflow ports.

Authentication rate limits must separate credential-bearing mutations from
read-only session/config checks and OAuth handoffs. Repeated `/auth/me` polling
must not consume the same bucket that starts Google OAuth or sends an OTP; the
general API limiter can still protect the harmless routes.

**Why:** Browser layout mounts and preview reloads can legitimately issue many
session checks in a short period. Sharing their bucket with the OAuth start
route caused the sign-in button to return a JSON 429 instead of redirecting to
Google.

**How to apply:** Scope auth write limits by method and route (and email where
relevant), exempt only read/redirect paths from that auth-specific limiter, and
verify both repeated session reads and the OAuth start response after restart.