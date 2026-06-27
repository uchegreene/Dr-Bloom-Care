---
name: Cycle period-start anchoring
description: How cycle phase/prediction math must choose the period start day from flow logs
---

# Cycle period-start anchoring

Cycle phase, next-period prediction, and fertile-window math must anchor on the
**START of the most recent consecutive flow run**, not the latest logged flow day.

**Why:** A period spans multiple days. Sorting flow days descending and taking
index 0 (the latest logged day) treats the *end* of a period as its start, which
shifts every downstream prediction by the period length. This was a real bug.

**How to apply:** Sort flow dates ascending, then walk backward from the latest
flow day while consecutive (`differenceInDays(cur, prev) === 1`); the first day of
that contiguous run is the period start. All phase/prediction helpers derive from
this single computed anchor.
