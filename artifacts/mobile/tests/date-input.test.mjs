import test from "node:test";
import assert from "node:assert/strict";
import { dateInputError, formatDateInput, isValidCalendarDate } from "../lib/dateInput.ts";

test("all calendar-date fields automatically add hyphens after year and month", () => {
  let value = "";
  const expected = ["1", "19", "199", "1995-", "1995-0", "1995-03-", "1995-03-1", "1995-03-17"];
  for (const [index, digit] of [..."19950317"].entries()) {
    value = formatDateInput(value + digit, value);
    assert.equal(value, expected[index]);
  }
  assert.equal(formatDateInput("20261029"), "2026-10-29");
});

test("handles numeric and formatted pastes without duplicate separators", () => {
  assert.equal(formatDateInput("19950317"), "1995-03-17");
  assert.equal(formatDateInput("1995-03-17"), "1995-03-17");
  assert.equal(formatDateInput("1995--03--17"), "1995-03-17");
  assert.equal(formatDateInput("abc"), "");
  assert.equal(formatDateInput("1995031799"), "1995-03-17");
});

test("backspace can pass both automatic separators and clear the entire date", () => {
  let value = "1995-03-17";
  const expected = ["1995-03-1", "1995-03-", "1995-0", "1995-", "199", "19", "1", ""];
  for (const next of expected) {
    value = formatDateInput(value.slice(0, -1), value);
    assert.equal(value, next);
  }
  assert.equal(formatDateInput("", "1995-03-17"), "");
});

test("allows replacing a selected date without retaining the previous value", () => {
  assert.equal(formatDateInput("20000102", "1995-03-17"), "2000-01-02");
  assert.equal(formatDateInput("1995-04-17", "1995-03-17"), "1995-04-17");
});

test("months are 01–12 and days cannot be zero or exceed their calendar month", () => {
  for (const invalid of ["2026-00-01", "2026-13-01", "2026-99-01", "2026-01-00", "2026-01-32",
    "2026-04-31", "2026-06-31", "2026-09-31", "2026-11-31", "2026-02-29", "2026-02-30"]) {
    assert.equal(formatDateInput(invalid), "");
    assert.equal(isValidCalendarDate(invalid), false);
    assert.ok(dateInputError(invalid));
  }
  assert.equal(formatDateInput("2026-13", "2026-1"), "2026-1");
  assert.equal(formatDateInput("2026-04-31", "2026-04-3"), "2026-04-3");
  assert.equal(formatDateInput("2026-3", "2026-"), "2026-");
});

test("leap years include the 100-year and 400-year rules", () => {
  for (const valid of ["2000-02-29", "2024-02-29", "2026-02-28", "2026-04-30", "2026-12-31"]) {
    assert.equal(formatDateInput(valid), valid);
    assert.equal(isValidCalendarDate(valid), true);
  }
  for (const invalid of ["1900-02-29", "2100-02-29", "2025-02-29", "0000-01-01", "1995", "1995-01-"]) {
    assert.equal(isValidCalendarDate(invalid), false);
  }
});

test("every day boundary agrees with the Gregorian calendar across 400 years", () => {
  for (let year = 1800; year < 2200; year++) {
    for (let month = 1; month <= 12; month++) {
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const prefix = `${year}-${String(month).padStart(2, "0")}-`;
      assert.equal(isValidCalendarDate(prefix + "01"), true);
      assert.equal(isValidCalendarDate(prefix + lastDay), true);
      assert.equal(isValidCalendarDate(prefix + String(lastDay + 1)), false);
    }
  }
});
