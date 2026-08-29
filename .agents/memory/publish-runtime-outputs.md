---
name: Publish runtime outputs
description: Generated output retention required by this workspace's multi-artifact autoscale publish
---

In this workspace, the web artifact's Vite output, the API artifact's self-contained bundle, and the Expo artifact's static output must remain available after the publish build phase. Broad generated-directory ignore rules require narrow exceptions for all three. The Expo server entry and landing template should also be copied into its retained output.

**Why:** Autoscale starts artifact services from the post-build image with `node_modules` omitted; successful compilation does not prove generated files survived packaging, and externalized API SDKs can crash startup even when the bundle file exists.

**How to apply:** Preserve each artifact's required production output with narrow ignore exceptions. Bundle pure-JS API SDK dependencies needed at startup, keep only optional native checks external, and run API/mobile commands from retained outputs.