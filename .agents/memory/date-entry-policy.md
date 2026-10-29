---
name: Automatic date-entry formatting
description: User-required automatic separators for all typed calendar dates.
---
All typed calendar-date fields should insert the year/month/day separators automatically, not only date of birth.

Typed dates must also enforce months 01–12 and the correct number of days for the chosen month and year, including leap years. Automatic separators alone are insufficient.

**Why:** The owner extended date-entry rules to last-period dates, pregnancy dates and all applicable fields, then explicitly required valid calendar numbering after testing member onboarding.

**How to apply:** Use YYYY-MM-DD consistently and support typing, paste and backspace. Reject impossible dates with clear feedback rather than silently changing their meaning. Preserve field-specific rules, calendar selection, medical calculations and reminder timezones.
