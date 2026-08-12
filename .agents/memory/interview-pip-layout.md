---
name: Interview Ace PiP layout
description: Live video-call stage must guard the interviewer picture-in-picture tile against being taller than the stage.
---

The live interview call screen (`interview-ace.tsx`, "Interview — Video Call Mode") uses a single relative black stage with `overflow-hidden`, with the interviewer's picture-in-picture (PiP) card absolutely positioned bottom-right inside it. Because it's anchored from the bottom, any time the PiP's rendered content is taller than the stage, the excess gets clipped off its TOP (not bottom) — showing a half-cropped avatar/name, which is easy to miss in a tall test viewport but reliably reproduces on shorter laptop windows.

**Why:** `AnimatedAvatar` always renders its own internal name+subtitle caption below the photo — a second, independent copy of the interviewer's name was rendering inside the PiP in addition to the PiP's own name label underneath, silently doubling the vertical space needed. Combined with a "lg" (128px) avatar size and generous padding, the PiP could easily exceed a compressed stage's height.

**How to apply:** Keep the stage's `min-h-[170px]` floor and the PiP's compact sizing (`size="sm"` avatar, tight padding/gaps). Pass `hideCaption` to any `AnimatedAvatar` used inside a cramped PiP/tile that already shows the name itself, to avoid the duplicate caption re-inflating the tile's height. Verify PiP layout with an actual in-session interview screenshot (Playwright), not just the setup screen — the bug only exists once `phase === "interview"`.

The surrounding live-call shell now uses a soft light palette while the actual video stage stays black for camera contrast. The answer panel should remain compact (`48px` minimum, `16vh` maximum) so the bottom microphone, submit, and hang-up controls stay visible at 100% browser zoom.
