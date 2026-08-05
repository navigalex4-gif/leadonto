---
name: Admin reporting controls
description: Admin filter and export conventions plus the meaning of Rozgar's Quiz feed.
---

Admin data pages use client-side dropdown filters against the already-loaded server rows, and CSV exports must contain the currently visible filtered rows rather than the full unfiltered dataset. Activity, Users, Interviews, Payments, B2B Payments, and Content each expose their relevant report action.

Rozgar's Quiz category is a generated five-question practice brief tailored to the candidate's goal and skills. It includes answers, explanations, and a next step, but it is not a formal assessment and does not create an admin score record by itself.

**Why:** Admins need quick operational reports without changing the underlying data query, while learners need to understand that the Career Feed quiz is practice content rather than a paid or scored exam.

**How to apply:** Keep filters local to each admin screen, export the filtered view, and describe any generated learning feed honestly so it is not confused with persisted interview or assessment data.

Published admin pages can continue showing an older toolbar until the current workspace build is published. Verify the workspace preview separately, then tell the user to publish when the published URL is stale.

**Why:** The admin Activity source and built chunk can be updated while an already-published URL still serves the previous version.

**How to apply:** If a user screenshot from a published domain does not match current source, do not remove working code based on that screenshot; rebuild/restart locally and publish the artifact to update the public URL.