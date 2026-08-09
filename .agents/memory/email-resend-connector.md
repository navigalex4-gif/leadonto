---
name: Email via Resend connector
description: How Lead Onto sends email through the Replit Resend connector and the domain-verification requirement
---

- Email is sent through the **Replit Resend connector** (the `@replit/connectors-sdk` proxy), NOT a raw `RESEND_API_KEY`. Whether email is "configured" is inferred from the connector runtime being present, not from an API key — there is no email API key to set. The connector handles auth/token refresh.

- **Domain verification is required for arbitrary recipients.** The Lead Onto mailer uses `Lead Onto <email@leadonto.com>`, but the connected Resend account currently has no domains configured. Add and verify `leadonto.com` at resend.com/domains before expecting OTPs to reach users other than the Resend account owner.

- **Diagnose "email not arriving" by the logged status:** a **403** from the mailer = sandbox/unverified-domain restriction (verify a domain). A **401 / network error** = connector attachment/identity problem. They are distinct — read the status before assuming the pipeline is broken.

- **Security invariant — never leak the OTP code on a real send failure.** The OTP `dev` code is returned in the send response **only** when the connector runtime is absent (off-Replit dev). When email IS configured but the send fails, respond with an error (5xx) and do NOT include the code — otherwise anyone could harvest login codes by forcing a send failure.

- **Why:** the connector can be healthy while Resend still rejects an unverified sender domain; separating connection status from domain status avoids misdiagnosing delivery failures. Returning the dev code on failure would also be a silent auth bypass.
