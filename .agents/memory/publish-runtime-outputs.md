---
name: Publish runtime outputs
description: Generated output retention required by this workspace's multi-artifact autoscale publish
---

In this workspace, the web artifact's Vite `dist/public/` output and the Expo artifact's `static-build/` output must remain available after the publish build phase. If broad ignore rules remove them, promotion reports a missing static public directory. A missing Expo `static-build/` alone does not prevent `serve.js` from binding; a missing mobile port requires checking the Node startup error separately.

**Why:** Autoscale starts the published artifact services from the post-build image; successful compilation alone does not prove that generated files survived into that image, and the mobile service is independently sensitive to how its production command is launched.

**How to apply:** When publish reaches service creation, first preserve only the required web and Expo output paths with narrow ignore exceptions. If the web handler is registered but the Expo port is missing, inspect the Node loader stack and prefer a direct workspace-root Node command for the zero-dependency static server instead of a pnpm filter wrapper.