/**
 * CNIC privacy helpers (server-only).
 *
 * A CNIC is directly identifying personal data. Storing and querying it in
 * plaintext means a single database read is a full PII disclosure, and it makes
 * the lookup endpoint an enumeration target. Instead we store a *keyed blind
 * index*:
 *
 *   cnic_hmac = HMAC-SHA256(CNIC_HMAC_KEY, "cnic:v1:" + 13_digit_cnic)
 *
 * Properties:
 *   - Deterministic → equality lookup still works via an index.
 *   - Keyed → a database dump alone cannot recover or brute-force the CNIC
 *     (the 13-digit space is small enough that an unkeyed hash would be
 *     trivially reversible in hours).
 *   - Versioned prefix → the key/algorithm can be rotated without ambiguity.
 *
 * The key MUST live in the environment (CNIC_HMAC_KEY), never in the database
 * and never in client code. Rotating it requires re-ingesting filer datasets.
 */

import crypto from "node:crypto";

/** Bump only when the digest construction changes. */
const HMAC_VERSION = "cnic:v1";

export class CnicConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CnicConfigError";
  }
}

/**
 * Normalizes any CNIC-ish string to exactly 13 digits.
 * Handles "42101-1234567-1", "42101 1234567 1", "4210112345671".
 * Returns null when the input is not 13 digits.
 *
 * `number` is accepted because spreadsheet cells (ATL imports) parse CNICs as
 * numeric; rejecting them would silently drop valid rows.
 */
export function normalizeCnicDigits(
  raw: string | number | null | undefined
): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const digits = String(raw).replace(/[^0-9]/g, "");
  return digits.length === 13 ? digits : null;
}

/** Formats 13 digits as XXXXX-XXXXXXX-X for display. */
export function formatCnicForDisplay(digits: string): string {
  const clean = digits.replace(/[^0-9]/g, "");
  if (clean.length !== 13) return digits;
  return `${clean.slice(0, 5)}-${clean.slice(5, 12)}-${clean.slice(12)}`;
}

/** Masks a CNIC for logs/audit: 42101-*******-1 */
export function maskCnic(digits: string): string {
  const clean = digits.replace(/[^0-9]/g, "");
  if (clean.length !== 13) return "***";
  return `${clean.slice(0, 5)}-*******-${clean.slice(12)}`;
}

function getKey(): Buffer {
  const raw = process.env.CNIC_HMAC_KEY?.trim();
  if (!raw) {
    throw new CnicConfigError(
      "CNIC_HMAC_KEY is not configured. CNIC lookups are disabled until a strong, " +
        "server-only key is set (openssl rand -hex 32)."
    );
  }
  if (raw.length < 32) {
    throw new CnicConfigError(
      "CNIC_HMAC_KEY is too short. Use at least 32 characters of high-entropy data."
    );
  }
  return Buffer.from(raw, "utf8");
}

/**
 * Computes the blind index for a CNIC.
 * @throws CnicConfigError when the key is missing/weak, or the CNIC is invalid.
 */
export function hashCnic(raw: string | null | undefined): string {
  const digits = normalizeCnicDigits(raw);
  if (!digits) {
    throw new CnicConfigError("A valid 13-digit CNIC is required.");
  }
  return hashCnicDigits(digits);
}

/** Same as {@link hashCnic} but takes already-normalized digits. */
export function hashCnicDigits(digits: string): string {
  const key = getKey();
  return crypto
    .createHmac("sha256", key)
    .update(`${HMAC_VERSION}:${digits}`, "utf8")
    .digest("hex");
}

/** True when CNIC lookup is usable (key present and long enough). */
export function isCnicLookupConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}
