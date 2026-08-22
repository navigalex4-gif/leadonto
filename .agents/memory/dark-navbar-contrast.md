---
name: Dark navbar contrast
description: Contrast rule for shared dark navigation with light menus and panels
---

Shared navigation can use light text on a dark background, but dropdown menus and mobile drawers are separate light surfaces and must explicitly reset link and muted text colours.

**Why:** A broad descendant selector on the dark navbar made the white suite menus appear empty because their labels also became white.

**How to apply:** Scope dark-nav text rules to the navigation surface, add a dedicated menu class, and restore readable dark text inside every light menu or drawer.