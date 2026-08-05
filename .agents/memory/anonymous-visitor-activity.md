---
name: Anonymous visitor activity
description: How EduBharat records unsigned visitor activity and exposes it to admins.
---

Anonymous page views are persisted as analytics events even before a visitor signs in. The server derives the client IP from trusted proxy headers, stores the route, user agent, timestamp, anonymous browser ID, and optional signed-in user link. Admins review these rows in a separate Activity view rather than mixing anonymous visitors into the users directory.

**Why:** The users table cannot represent visitors who never create an account, and client-supplied IPs are not trustworthy. Keeping the append-only activity stream separate preserves both anonymous traffic history and account sign-in history.

**How to apply:** Keep visitor writes unauthenticated but admin reads protected. Any new production schema columns must be included in the development schema and applied through the normal Publish flow.