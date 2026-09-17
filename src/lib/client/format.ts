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

/** Client-side formatter mirroring src/lib/money.ts for values already serialized as strings. */
export function formatCurrencyMinor(minorStr: string, currency: string): string {
  const decimals = CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
  const negative = minorStr.startsWith("-");
  const digits = negative ? minorStr.slice(1) : minorStr;
  const padded = digits.padStart(decimals + 1, "0");
  const whole = decimals > 0 ? padded.slice(0, -decimals) : padded;
  const fraction = decimals > 0 ? padded.slice(-decimals) : "";
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${currency.toUpperCase()} ${grouped}${fraction ? "." + fraction : ""}`;
}

export function formatHoursDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const days = Math.floor(hours / 24);
  const remHours = Math.round(hours % 24);
  if (days === 0) return `${remHours}h`;
  return `${days}d ${remHours}h`;
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function relativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
