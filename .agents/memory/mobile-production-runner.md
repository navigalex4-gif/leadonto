---
name: Mobile production runner
description: Production startup behavior for the Expo artifact's standalone static server
---

The Expo artifact's production server is a zero-dependency Node process. In autoscale artifact images, invoke its workspace-root script directly rather than relying on `pnpm --filter ... run serve`; the wrapper can hide a Node loader crash until the deployment times out waiting for the mobile port.

**Why:** The build can complete successfully while the pnpm-wrapped serve process exits before binding, leaving autoscale to report only that the configured port was never opened.

**How to apply:** Keep the artifact's production run command pointed at `node artifacts/edubharat-mobile/server/serve.js`, with the artifact-provided `PORT` and `BASE_PATH` environment variables unchanged.