import test from "node:test";
import assert from "node:assert/strict";
import { formatDateInput } from "../lib/dateInput.ts";

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
