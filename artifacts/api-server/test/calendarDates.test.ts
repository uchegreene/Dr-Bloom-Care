import test from "node:test";
import assert from "node:assert/strict";
import { isValidDateOfBirth } from "../src/lib/calendarDates.ts";

const today = new Date("2026-10-28T12:00:00.000Z");

test("valid birth dates and serialized date-only SDK values retain their calendar day", () => {
  for (const value of ["1995-03-17", "2000-02-29", "1995-03-17T00:00:00.000Z"]) {
    assert.equal(isValidDateOfBirth(value, today), true);
  }
});

test("raw input cannot use date coercion to normalize impossible dates", () => {
  for (const value of ["1995-02-29", "2000-02-30", "1995-04-31", "1995-00-01", "1995-13-01",
    "1995-01-00", "1995-01-32", "1995", "1995-1-1", "0000-01-01", null, 0, {}, "1995-02-30T00:00:00.000Z"]) {
    assert.equal(isValidDateOfBirth(value, today), false, String(value));
  }
});

test("server enforces the same future-date and 13–120 age limits as onboarding", () => {
  assert.equal(isValidDateOfBirth("2013-10-28", today), true);
  assert.equal(isValidDateOfBirth("2013-10-29", today), false);
  assert.equal(isValidDateOfBirth("1906-10-28", today), true);
  assert.equal(isValidDateOfBirth("1905-10-29", today), true);
  assert.equal(isValidDateOfBirth("1905-10-28", today), false);
  assert.equal(isValidDateOfBirth("2026-10-29", today), false);
});
