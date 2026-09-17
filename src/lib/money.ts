/**
 * Currency-precision-aware, integer-minor-unit money handling.
 *
 * All monetary amounts are persisted as BigInt minor units (e.g. fils for
 * BHD, which — like KWD and OMR — has three decimal places, not the two
 * most currencies use). Never do arithmetic on floating-point major-unit
 * amounts and never combine amounts across currencies; both are explicitly
 * disallowed by the product spec.
 *
 * Cross-currency conversion and routing are TBC (see the requirements
 * register) — `assertSameCurrency` exists specifically to fail loudly
 * instead of silently combining currencies until that is confirmed and
 * implemented.
 */

// ISO 4217 minor-unit exponents for currencies this deployment is expected
// to encounter. Extend deliberately — an unknown currency should fail
// validation rather than silently default to 2 decimals.
const CURRENCY_DECIMALS: Record<string, number> = {
  BHD: 3,
  KWD: 3,
  OMR: 3,
  USD: 2,
  EUR: 2,
  GBP: 2,
  SAR: 2,
  AED: 2,
  QAR: 2,
  JPY: 0,
};

export function isKnownCurrency(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(CURRENCY_DECIMALS, code.toUpperCase());
}

export function currencyDecimals(code: string): number {
  const decimals = CURRENCY_DECIMALS[code.toUpperCase()];
  if (decimals === undefined) {
    throw new MoneyError(
      `Unsupported currency "${code}" — no minor-unit precision configured. ` +
        `Add it to CURRENCY_DECIMALS in src/lib/money.ts rather than guessing.`
    );
  }
  return decimals;
}

export class MoneyError extends Error {}

/**
 * Parses a user-entered major-unit amount (e.g. "9500000.500") into integer
 * minor units for a given currency. Rejects more fractional digits than the
 * currency supports, negative amounts, non-numeric input and scientific
 * notation — all of which would otherwise silently corrupt exposure figures.
 */
export function parseMajorToMinor(input: string | number, currency: string): bigint {
  const decimals = currencyDecimals(currency);
  const raw = typeof input === "number" ? input.toString() : input.trim();

  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new MoneyError(`"${input}" is not a valid non-negative decimal amount.`);
  }

  const [wholePart, fractionPartRaw = ""] = raw.split(".");
  if (fractionPartRaw.length > decimals) {
    throw new MoneyError(
      `${currency} supports ${decimals} decimal place(s); "${input}" has ${fractionPartRaw.length}.`
    );
  }
  const fractionPart = fractionPartRaw.padEnd(decimals, "0");
  const combined = `${wholePart}${fractionPart}` || "0";
  return BigInt(combined);
}

/** Formats integer minor units back to a major-unit decimal string. */
export function formatMinorToMajor(minor: bigint, currency: string): string {
  const decimals = currencyDecimals(currency);
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const str = abs.toString().padStart(decimals + 1, "0");
  if (decimals === 0) return (negative ? "-" : "") + str;
  const whole = str.slice(0, str.length - decimals);
  const fraction = str.slice(str.length - decimals);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/** Formats for display with thousands separators, e.g. "BHD 9,500,000.000". */
export function formatCurrency(minor: bigint, currency: string): string {
  const decimals = currencyDecimals(currency);
  const major = formatMinorToMajor(minor, currency);
  const [whole, fraction] = major.split(".");
  const negative = whole.startsWith("-");
  const unsignedWhole = negative ? whole.slice(1) : whole;
  const grouped = unsignedWhole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const withFraction = decimals > 0 ? `${grouped}.${fraction}` : grouped;
  return `${negative ? "-" : ""}${currency.toUpperCase()} ${withFraction}`;
}

export function assertSameCurrency(a: string, b: string, context: string): void {
  if (a.toUpperCase() !== b.toUpperCase()) {
    throw new MoneyError(
      `${context}: cannot combine ${a} and ${b} — cross-currency conversion is TBC ` +
        `and not implemented. Provide amounts in a single currency.`
    );
  }
}

/**
 * Approval-Routing Exposure = Total Group Exposure + Related-Party Exposure.
 * This is the ONLY place this formula is implemented; every caller
 * (creation, amendment, display, routing) must go through it so the figure
 * can never silently drift from its definition.
 */
export function computeApprovalRoutingExposure(
  totalGroupExposureMinor: bigint,
  relatedPartyExposureMinor: bigint,
  currency: string,
  relatedPartyCurrency: string
): bigint {
  assertSameCurrency(currency, relatedPartyCurrency, "Approval-Routing Exposure");
  if (totalGroupExposureMinor < 0n || relatedPartyExposureMinor < 0n) {
    throw new MoneyError("Exposure amounts cannot be negative.");
  }
  return totalGroupExposureMinor + relatedPartyExposureMinor;
}

/** JSON.stringify replacer that renders BigInt as a decimal string. */
export function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

/** Deep-converts BigInt fields to strings for safe JSON API responses. */
export function serializeBigInts<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, bigIntReplacer));
}
