---
name: Publish package firewall
description: Replit publish dependency-install behavior for Expo's tar dependency
---

Replit's package firewall can reject the npm `tar` package across all versions during the publish install, even when the local development store already contains it. Expo CLI imports `tar` only as a fallback for archive extraction; on Linux it invokes the system `tar` executable first.

**Why:** A workspace-wide publish install fails before the web artifact builds because the mobile Expo workspace pulls `tar` transitively, even though the deployed artifact is the web app.

**How to apply:** Keep the workspace override pointed at the local `vendor/tar-shim` package, which exposes the `extract()` method and delegates to the system `tar` command. Re-test with `pnpm install --frozen-lockfile` after Expo or pnpm dependency updates.