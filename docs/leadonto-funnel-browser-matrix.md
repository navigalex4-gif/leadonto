# Lead Onto funnel browser/device matrix

This matrix records what was actually verified for the acquisition funnel. A
physical-device or in-app-browser result is not marked as passing based on a
desktop user-agent simulation.

| Environment | Result | Exact reason / coverage |
| --- | --- | --- |
| Desktop Chromium preview | PASS | Homepage loaded; Communication Check loaded with “No sign-up before you start”; admin funnel route redirected unauthenticated visitors instead of exposing admin data. |
| Desktop Chrome OAuth | NOT RUN | Requires a real Google account consent/callback round trip; no live consent was performed in this validation run. |
| Chrome on Android | NOT RUN | No Android device/browser session is attached to this workspace. |
| Instagram Android in-app browser | NOT RUN | No Instagram webview session is attached; the code path is covered by user-agent detection and the external-browser/email fallback. |
| Facebook Android in-app browser | NOT RUN | No Facebook webview session is attached; the code path is covered by user-agent detection and the external-browser/email fallback. |
| iPhone Safari | NOT RUN | No iPhone/Safari device session is attached to this workspace. |
| Instagram/Facebook iOS webview | NOT RUN | No iOS social-app webview session is attached; the iOS external-browser handoff remains a code-path check only. |

Automated checks completed for this change:

- Web TypeScript check
- API TypeScript check
- `git diff --check`
- API and web workflow restart
- Unauthenticated `/api/admin/funnel` request returns `403 Admin access required`