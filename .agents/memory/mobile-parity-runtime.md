---
name: Mobile parity runtime
description: Expo mobile parity routes, safe-area behavior, and API host resolution across tabs, stack screens, web, and native builds.
---

Standalone Expo Router stack screens are not inside the bottom-tab navigator. Shared scroll shells must treat tab-bar height as optional and fall back to safe-area padding, otherwise every feature route can crash before rendering.

**Why:** Mobile feature parity added several top-level routes outside `(tabs)`, and `useBottomTabBarHeight()` throws when called without a tab navigator context.

**How to apply:** Keep tab-bar height access guarded in shared layout hooks. For API calls, prefer the injected `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_DOMAIN`; do not infer the API host from the browser's Expo preview host.