---
name: Mobile production runner
description: Production startup behavior for the Expo artifact's standalone static server
---

The Expo artifact's production server is a zero-dependency Node process. In autoscale artifact images, the mobile build must copy that server and its landing template into the retained `static-build/` output, and production should invoke that bundled entry directly.

**Why:** The build can complete successfully while the published image omits source-tree runtime files, leaving Node to crash before binding and autoscale to report only that the configured port was never opened.

**How to apply:** Keep the artifact's production run command pointed at `node artifacts/edubharat-mobile/static-build/serve.js`, with the artifact-provided `PORT` and `BASE_PATH` environment variables unchanged. The bundled server must resolve `static-build/` and `templates/` relative to its copied location.