export const B2B_PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One number", test: (value: string) => /\d/.test(value) },
  { label: "One special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export function passwordMeetsB2BRequirements(value: string): boolean {
  return B2B_PASSWORD_REQUIREMENTS.every(({ test }) => test(value));
}

/**
 * Returns the canonical 10-digit Indian mobile number, or null when invalid.
 * The UI may accept spaces, dashes, a leading 0, or the +91 country code.
 */
export function normalizeIndianMobile(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const normalized =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) :
    digits.length === 11 && digits.startsWith("0") ? digits.slice(1) :
    digits;

  if (!/^[6-9]\d{9}$/.test(normalized)) return null;
  if (/^(\d)\1{9}$/.test(normalized)) return null;
  return normalized;
}

export function formatIndianMobile(value: string): string {
  const digits = normalizeIndianMobile(value);
  return digits ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : value;
}