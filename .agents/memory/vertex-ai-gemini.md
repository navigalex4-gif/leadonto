---
name: Vertex AI Gemini
description: Vertex service-account auth and low-latency response settings for Gemini voice requests
---

Use the dedicated Vertex service-account secret when available, keep Google Cloud TTS credentials separate, and disable Gemini 2.5 thinking for short spoken turns.

**Why:** the Google AI Studio API-key project can exhaust its prepayment quota, while Vertex uses the Google Cloud project billing path; Gemini 2.5 can spend a small voice-turn output budget on hidden thinking and return only a few visible words.

**How to apply:** prefer stable Vertex Flash model IDs, use the JSON service account with Vertex AI User permission, set thinking budget to zero for short conversational requests, and preserve provider fallback for genuine Vertex errors.