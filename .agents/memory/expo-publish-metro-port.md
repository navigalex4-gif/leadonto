---
name: Expo publish Metro port
description: Expo Launch static builds must avoid fixed Metro port conflicts in the multi-artifact workspace.
---

The mobile production bundler must select an available localhost Metro port and use that same port for bundle, manifest, and asset requests. A fixed 8081 can collide with the mockup preview and trigger Expo's non-interactive “use another port?” prompt.

**Why:** Expo Launch cannot answer interactive Metro port prompts, so a harmless local port collision becomes a failed publish bundle.

**How to apply:** Keep Metro startup non-interactive and prefer `METRO_PORT` when supplied, otherwise probe a short range beginning at 8081.