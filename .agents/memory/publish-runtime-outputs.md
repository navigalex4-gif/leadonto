---
name: Publish runtime outputs
description: Generated output retention required by this workspace's multi-artifact autoscale publish
---

In this workspace, the web artifact's Vite `dist/public/` output and the Expo artifact's `static-build/` output must remain available after the publish build phase. If broad ignore rules remove them, promotion reports a missing static public directory and the mobile service never opens its configured port.

**Why:** Autoscale starts the published artifact services from the post-build image; successful compilation alone does not prove that generated files survived into that image.

**How to apply:** When publish reaches service creation but reports a missing `publicDir` or missing artifact port, inspect the deployment runtime logs first. Preserve only the required web and Expo output paths with narrow ignore exceptions rather than changing artifact commands or deployment type.