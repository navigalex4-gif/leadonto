---
name: Publish runtime outputs
description: Generated output retention required by this workspace's multi-artifact autoscale publish
---

In this workspace, the web artifact's Vite output, the API artifact's bundled output, and the Expo artifact's static output must remain available after the publish build phase. Broad generated-directory ignore rules require narrow exceptions for all three. The Expo server entry and landing template should also be copied into its retained output, so the runnable image does not depend on source-tree files surviving packaging.

**Why:** Autoscale starts artifact services from the post-build image; successful compilation does not prove generated files survived packaging. Missing web output breaks static registration, while missing API or mobile runtime output crashes before ports open.

**How to apply:** Preserve only each artifact's required production output with narrow ignore exceptions. Keep API and mobile run commands pointed at files inside those retained outputs; do not change deployment type for a missing-built-file symptom.