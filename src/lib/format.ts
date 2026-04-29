/**
 * Auto-format a US-style phone number with dashes as the user types.
 * Strips non-digits, pads to xxx-xxx-xxxx layout, never shows trailing
 * dashes (so "555" stays "555", not "555-").
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Format a number as USD with commas, no decimal places by default.
 * Returns "" when input is null/undefined/NaN.
 */
export function formatCurrency(
  amount: number | null | undefined,
  opts?: { decimals?: number }
): string {
  if (amount == null || Number.isNaN(amount)) return "";
  const decimals = opts?.decimals ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Parse a currency input string ("$50,000" / "50000" / "50,000.50") into a
 * number. Returns null for empty / invalid input.
 */
export function parseCurrencyInput(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Format an ISO datetime string with the day of the week shown alongside
 * the calendar date. Used for keyed_date and occ_health_appt fields.
 *
 * Example: "2026-04-26T10:00" -> "Sunday, Apr 26, 2026 · 10:00 AM"
 */
export function formatDateTimeWithDayOfWeek(
  iso: string | null | undefined
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  // Show time only when it isn't midnight (the date-only case)
  const isMidnight = d.getHours() === 0 && d.getMinutes() === 0;
  if (isMidnight) {
    return `${dayName}, ${datePart}`;
  }
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dayName}, ${datePart} · ${timePart}`;
}

/**
 * Convert a value from a datetime-local input ("2026-04-26T10:00") to an
 * ISO-ish string suitable for storing in the DB. We just preserve the
 * local-time string as-is — same approach the rest of the app uses.
 */
export function datetimeLocalToISO(local: string): string | null {
  if (!local) return null;
  return local;
}

/**
 * Reverse of datetimeLocalToISO: produce a value the input element will accept.
 * The DB stores either YYYY-MM-DDTHH:MM (from datetime-local) or full ISO
 * (from datetime('now')). Both are fine to pass back; only the seconds/Z
 * suffix needs trimming for the input.
 */
export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  // Strip trailing Z and seconds if present.
  return iso.replace(/Z$/, "").replace(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}).*/, "$1");
}

// ============================================================
// Date validation helpers
// ============================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Days between two ISO dates/datetimes (positive when end > start).
 * Returns null if either side is missing or unparseable.
 */
export function daysBetween(
  start: string | null | undefined,
  end: string | null | undefined
): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  // Round to whole days for friendlier UX (avoids "13.97 days" weirdness)
  return Math.round((e - s) / MS_PER_DAY);
}

/**
 * Days elapsed since the given ISO datetime (positive when in the past).
 * Returns null if missing/unparseable.
 */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / MS_PER_DAY);
}

/**
 * Validation: warn when the offer letter signed date is fewer than 14 days
 * before the target start date. Returns null if neither/both can't be checked.
 */
export function validateOfferToStartGap(
  offerSigned: string | null | undefined,
  targetStart: string | null | undefined
): { ok: true } | { ok: false; days: number } | null {
  const gap = daysBetween(offerSigned, targetStart);
  if (gap == null) return null;
  if (gap >= 14) return { ok: true };
  return { ok: false, days: gap };
}

/**
 * Validation: warn when the occ-health appointment is older than 30 days.
 * Returns null when no appointment is set. The 30-day window means a
 * cleared appointment gets stale and needs to be redone.
 */
export function validateOccHealthFreshness(
  apptDate: string | null | undefined
): { ok: true } | { ok: false; days: number } | null {
  const since = daysSince(apptDate);
  if (since == null) return null;
  if (since <= 30) return { ok: true };
  return { ok: false, days: since };
}

// ============================================================
// Length of Employment (LoE) calculator
// ============================================================

/**
 * Day-precise duration between two ISO dates (YYYY-MM-DD).
 * Returns null if either date is missing/invalid or end is before start.
 *
 * Algorithm: year-by-year then month-by-month then day-by-day, borrowing
 * from the next-larger unit when needed. Matches how humans subtract
 * dates by hand and produces stable results regardless of leap years.
 *
 * Example: 2020-01-15 → 2023-08-10 = 3 years, 6 months, 26 days
 */
export interface LoEDuration {
  years: number;
  months: number;
  days: number;
  /** Total days, useful for comparison + summing without rounding loss. */
  totalDays: number;
}

export function calcLoE(
  startISO: string | null | undefined,
  endISO: string | null | undefined
): LoEDuration | null {
  if (!startISO || !endISO) return null;
  const start = parseDateOnly(startISO);
  const end = parseDateOnly(endISO);
  if (!start || !end) return null;
  if (end < start) return null;

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    // Borrow from months. Use the day count of the previous month at end's
    // location (i.e., the month that just ended).
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0); // day 0 = last day of previous month
    days += prevMonth.getDate();
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  const totalDays = Math.round(
    (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  );

  return { years, months, days, totalDays };
}

/**
 * Sum a list of LoE durations using totalDays (avoids rounding errors),
 * then convert back to years/months/days approximately. The conversion uses
 * 365.25 days/year and 30.4375 days/month — close enough for HR display.
 */
export function sumLoE(durations: LoEDuration[]): LoEDuration {
  const totalDays = durations.reduce((acc, d) => acc + d.totalDays, 0);
  const years = Math.floor(totalDays / 365.25);
  const remAfterYears = totalDays - years * 365.25;
  const months = Math.floor(remAfterYears / 30.4375);
  const days = Math.round(remAfterYears - months * 30.4375);
  return { years, months, days, totalDays };
}

/** Format a duration as "3 years, 11 months, 12 days" (omits zero parts). */
export function formatLoE(d: LoEDuration | null): string {
  if (!d) return "—";
  const parts: string[] = [];
  if (d.years > 0) parts.push(`${d.years} year${d.years === 1 ? "" : "s"}`);
  if (d.months > 0) parts.push(`${d.months} month${d.months === 1 ? "" : "s"}`);
  if (d.days > 0 || parts.length === 0)
    parts.push(`${d.days} day${d.days === 1 ? "" : "s"}`);
  return parts.join(", ");
}

/**
 * Parse a YYYY-MM-DD string into a local-midnight Date. Avoids the timezone
 * footgun where `new Date("2020-01-15")` is interpreted as UTC midnight,
 * which can shift by a day in negative-offset timezones.
 */
function parseDateOnly(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
}
