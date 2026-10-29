/** Validate completed segments while still allowing normal partial typing. */
export function dateInputError(value: string): string | null {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length < 4) return null;
  const year = Number(digits.slice(0, 4));
  if (year < 1) return "Year must be 0001 or later.";
  const monthDigits = digits.slice(4, 6);
  if (monthDigits.length === 1 && Number(monthDigits) > 1) return "Month must be 01–12. Use a leading zero.";
  if (monthDigits.length < 2) return null;
  const month = Number(monthDigits);
  if (month < 1 || month > 12) return "Month must be 01–12.";
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const maxDay = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  const dayDigits = digits.slice(6, 8);
  if ((dayDigits.length === 1 && Number(dayDigits) > Math.floor(maxDay / 10)) ||
    (dayDigits.length === 2 && (Number(dayDigits) < 1 || Number(dayDigits) > maxDay))) {
    return `Day must be 01–${maxDay} for this month and year.`;
  }
  return null;
}

export function isValidCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && dateInputError(value) === null;
}

/** Keep automatic separators, but reject impossible calendar segments. */
export function formatDateInput(value: string, previous = ""): string {
  let digits = value.replace(/\D/g, "").slice(0, 8);
  // Allow backspace through automatic separators instead of reinserting them.
  if (previous.endsWith("-") && value === previous.slice(0, -1)) {
    digits = digits.slice(0, -1);
  }
  if (dateInputError(digits)) return previous;
  if (digits.length < 4) return digits;
  if (digits.length < 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}
