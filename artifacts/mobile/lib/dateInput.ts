/** Format any typed or pasted calendar date without changing validation. */
export function formatDateInput(value: string, previous = ""): string {
  let digits = value.replace(/\D/g, "").slice(0, 8);
  // Allow backspace through automatic separators instead of reinserting them.
  if (previous.endsWith("-") && value === previous.slice(0, -1)) {
    digits = digits.slice(0, -1);
  }
  if (digits.length < 4) return digits;
  if (digits.length < 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}
