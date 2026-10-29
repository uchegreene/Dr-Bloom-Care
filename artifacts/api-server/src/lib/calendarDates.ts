/** Check the raw date before schema coercion can roll February 30 into March. */
export function isValidDateOfBirth(value: unknown, today = new Date()): boolean {
  if (typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(value)) return false;
  const date = value.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  const year = parsed.getUTCFullYear();
  if (year < 1 || date > today.toISOString().slice(0, 10)) return false;
  const birthMonthDay = date.slice(5);
  const currentMonthDay = today.toISOString().slice(5, 10);
  const age = today.getUTCFullYear() - year - (currentMonthDay < birthMonthDay ? 1 : 0);
  return age >= 13 && age <= 120;
}
