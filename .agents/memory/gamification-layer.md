---
name: Motivational gamification boundary
description: The product-wide XP, badge, streak, and Word Power layer is intentionally local and motivational rather than entitlement-bearing.
---

Local XP, badges, streaks, and Word Power progress are engagement signals only. They must never grant credits, unlock paid features, replace server-authoritative records, or change billing behavior. Repeated clicks, retries, regenerated reports, and rapid save actions should not create duplicate awards for one logical completion.

**Why:** The learning layer was added across existing paid and guest flows without a server migration; keeping it separate avoids turning a client-side counter into an access-control or credit ledger.

**How to apply:** Use the gamification hook for learner feedback and celebrations, but keep credits, payment status, interview charging, and persisted product records on their existing server/API paths. Add idempotency guards where an action can be retried or emitted by more than one UI event.