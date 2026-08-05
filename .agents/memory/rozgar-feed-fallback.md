---
name: Rozgar feed fallback
description: Rendering and filtering rules for Rozgar's job and career feed categories.
---

Every feed tile must have a visible completion path: show source-backed items when available, otherwise generate a clearly labeled fallback mentor brief. Vacancy sections must never turn missing live records into an empty tile or fabricated job card. Job filters should be strict for known metadata, and city searches must not mix in worldwide remote results.

**Why:** External feeds are uneven—government, internship, and scholarship searches can legitimately return no records even while other sections work. Leaving those sections blank makes the category filter look broken.

**How to apply:** Keep news separate from vacancies, allow vacancy-section AI fallback only when no real vacancy items exist, and make provider/cache keys include every filter that affects the request.