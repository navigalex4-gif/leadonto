/**
 * normalizeEmailForAbuseCheck — collapses an email address to the canonical
 * form that determines "is this actually the same inbox" for the purpose of
 * one-signup-bonus-per-person. This is intentionally MORE aggressive than
 * normal email equality: it is used ONLY to decide signup-bonus eligibility,
 * never as the account's stored/login email (that stays exactly as entered).
 *
 * Handles the two well-known free-bonus abuse tricks:
 *   - Gmail/Googlemail dot-insensitivity: "j.ane.doe@gmail.com" delivers to
 *     the same inbox as "janedoe@gmail.com".
 *   - "+" sub-addressing (Gmail, Outlook, and most modern providers):
 *     "jane+anything@gmail.com" also delivers to "jane@gmail.com".
 *
 * Only applied to gmail.com/googlemail.com for the dot rule, since that is
 * Gmail-specific behaviour — stripping dots from other providers (where the
 * dot IS a meaningful part of the address) would incorrectly merge distinct
 * real inboxes.
 */
export function normalizeEmailForAbuseCheck(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return email;

  let local = email.slice(0, atIndex);
  let domain = email.slice(atIndex + 1);

  // Plus sub-addressing — universal across providers, always the same inbox.
  const plusIndex = local.indexOf("+");
  if (plusIndex !== -1) local = local.slice(0, plusIndex);

  // Gmail-specific: dots in the local part are ignored, and googlemail.com
  // is the same service as gmail.com.
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
    domain = "gmail.com";
  }

  return `${local}@${domain}`;
}
