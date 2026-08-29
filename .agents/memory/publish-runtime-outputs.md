---
name: Publish runtime outputs
description: Generated output retention required by this workspace's multi-artifact autoscale publish
---

In this workspace, the web artifact's Vite `dist/public/` output and the Expo artifact's `static-build/` output must remain available after the publish build phase. If broad ignore rules remove them, promotion reports a missing static public directory. The Expo server entry and landing template should also be copied into `static-build/`, so the runnable image does not depend on source-tree files surviving packaging.

**Why:** Autoscale starts the published artifact services from the post-build image; successful compilation alone does not prove that generated files survived into that image, and the mobile service's standalone Node entry previously failed to load from the published source tree.

**How to apply:** Preserve only the required web and Expo output paths with narrow ignore exceptions. Run the copied mobile entry from `static-build/` and make its path resolution support the bundled location; do not change deployment type or API configuration for this symptom.