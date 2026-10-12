import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeReminder, parseLocalAppointment, medicineTimes, nextReminderTime,
  checkReminderCapacity, reminderAlerts, type Reminder,
} from "../lib/pregnancyReminders";
import {
  createReminderScheduler, serializeReminderWork, type ReminderNotificationDriver,
  type PendingReminderAlert, type ReminderPermission,
} from "../lib/reminderScheduler";

function fixture() {
  let permission: ReminderPermission = "granted";
  let pending: PendingReminderAlert[] = [];
  let calls = 0;
  let failAt = -1;
  let afterSchedule = () => {};
  const asked: boolean[] = [];
  const driver: ReminderNotificationDriver = {
    async permission(ask) { asked.push(ask); return permission; },
    async pending() { return [...pending]; },
    async schedule(ownerId, reminder) {
      calls++;
      if (calls === failAt) throw new Error("Synthetic phone failure");
      const id = `TEST_alert_${calls}`;
      pending.push({ id, ownerId, reminderId: reminder.id, isBloom: true });
      afterSchedule();
      return id;
    },
    async cancel(id) { pending = pending.filter(item => item.id !== id); },
  };
  return {
    scheduler: createReminderScheduler(driver), driver, asked,
    pending: () => pending, calls: () => calls,
    permission: (next: ReminderPermission) => { permission = next; },
    failAt: (next: number) => { failAt = next; },
    afterSchedule: (fn: () => void) => { afterSchedule = fn; },
    seed: (next: PendingReminderAlert[]) => { pending = next; },
  };
}
const appointment = (): Reminder => ({
  id: "TEST_appointment", type: "appointment", title: "TEST checkup",
  datetime: new Date(Date.now() + 7_200_000).toISOString(), advanceMinutes: 30,
});
const medicine: Reminder = { id: "TEST_medicine", type: "medication", title: "TEST prescribed medicine", times: ["08:00", "20:00"] };

test("strict local dates, leap years and clocks; invalid input is not normalized away", () => {
  assert.equal(new Date(parseLocalAppointment("2028-02-29", "09:30")).getDate(), 29);
  assert.throws(() => parseLocalAppointment("2027-02-29", "09:30"));
  assert.throws(() => parseLocalAppointment("2026-04-31", "09:30"));
  assert.throws(() => parseLocalAppointment("2026-10-12", "24:00"));
  assert.throws(() => normalizeReminder({ ...medicine, times: ["08:60"] }));
  assert.throws(() => normalizeReminder({ ...medicine, times: [] }));
  assert.throws(() => normalizeReminder({ ...appointment(), advanceMinutes: 42 }));
  assert.deepEqual(normalizeReminder({ ...medicine, times: ["20:00", "08:00", "08:00"] }).times, ["08:00", "20:00"]);
  assert.deepEqual(medicineTimes({ time: "07:00" }), ["07:00"]);
});
test("daily next-dose times roll over in local time; appointments include both alerts", () => {
  const morning = new Date(2026, 9, 12, 9);
  assert.equal(nextReminderTime(medicine, morning)?.getHours(), 20);
  const evening = new Date(2026, 9, 12, 21);
  assert.equal(nextReminderTime(medicine, evening)?.getDate(), 13);
  assert.equal(nextReminderTime(medicine, evening)?.getHours(), 8);
  const alerts = reminderAlerts(appointment());
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].kind, "date");
  assert.equal(nextReminderTime({ ...appointment(), datetime: new Date(0).toISOString() }), null);
});
test("permission denial and web support never report a scheduled notification", async () => {
  const f = fixture();
  f.permission("denied");
  const blocked = await f.scheduler.schedule("TEST_owner", medicine, true);
  assert.equal(blocked.reminder.notificationStatus, "blocked");
  assert.equal(f.calls(), 0);
  assert.equal(f.asked[0], true);
  f.permission("unsupported");
  const web = await f.scheduler.schedule("TEST_owner", medicine);
  assert.equal(web.reminder.notificationStatus, "unsupported");
  assert.deepEqual(web.reminder.notificationIds, []);
});
test("past appointment is history and never prompts for notification access", async () => {
  const f = fixture();
  const result = await f.scheduler.schedule("TEST_owner", { ...appointment(), datetime: new Date(0).toISOString() }, true);
  assert.equal(result.reminder.notificationStatus, "past");
  assert.deepEqual(f.asked, [false]);
  assert.equal(f.calls(), 0);
});
test("multiple daily medicine times and advance appointment alerts are all queued", async () => {
  const f = fixture();
  assert.equal((await f.scheduler.schedule("TEST_owner", medicine)).reminder.notificationIds?.length, 2);
  assert.equal((await f.scheduler.schedule("TEST_owner", appointment())).reminder.notificationIds?.length, 2);
  assert.equal(f.pending().length, 4);
});
test("partial failure cancels partial alerts and can be retried without duplicates", async () => {
  const f = fixture();
  f.failAt(2);
  const failed = await f.scheduler.schedule("TEST_owner", medicine);
  assert.equal(failed.reminder.notificationStatus, "error");
  assert.equal(f.pending().length, 0);
  f.failAt(-1);
  assert.equal((await f.scheduler.schedule("TEST_owner", medicine)).reminder.notificationStatus, "scheduled");
  assert.equal(f.pending().length, 2);
});
test("reopening keeps existing schedules; retry recreates them without duplication", async () => {
  const f = fixture();
  const scheduled = await f.scheduler.schedule("TEST_owner", medicine);
  const restored = await f.scheduler.restore("TEST_owner", [scheduled.reminder]);
  assert.equal(restored.reminders[0].notificationStatus, "scheduled");
  assert.equal(f.calls(), 2);
  await f.scheduler.restore("TEST_owner", restored.reminders, true);
  assert.equal(f.calls(), 4);
  assert.equal(f.pending().length, 2);
});
test("retry reports service errors globally as well as on the affected reminder", async () => {
  const f = fixture();
  f.failAt(2);
  const result = await f.scheduler.restore("TEST_owner", [medicine], true);
  assert.equal(result.permission, "error");
  assert.equal(result.reminders[0].notificationStatus, "error");
  assert.equal(f.pending().length, 0);
});
test("editing removes the old times but preserves replacement alert IDs", async () => {
  const f = fixture();
  const old = (await f.scheduler.schedule("TEST_owner", medicine)).reminder;
  const replacement = (await f.scheduler.schedule("TEST_owner", { ...medicine, times: ["09:00"] })).reminder;
  await f.scheduler.cancelReminder("TEST_owner", old, replacement.notificationIds);
  assert.deepEqual(f.pending().map(alert => alert.id), replacement.notificationIds);
  await f.scheduler.cancelReminder("TEST_owner", replacement);
  assert.equal(f.pending().length, 0);
});
test("cross-account and legacy alerts are removed; unrelated app alerts are preserved", async () => {
  const f = fixture();
  f.seed([
    { id: "old", ownerId: "TEST_old", isBloom: true },
    { id: "legacy", isBloom: true },
    { id: "current", ownerId: "TEST_current", isBloom: true },
    { id: "unrelated", isBloom: false },
  ]);
  await f.scheduler.clearOtherOwners("TEST_current");
  assert.deepEqual(f.pending().map(alert => alert.id), ["current", "unrelated"]);
  await f.scheduler.clearOwner("TEST_current");
  assert.deepEqual(f.pending().map(alert => alert.id), ["unrelated"]);
});
test("an account switch during scheduling cancels every newly created alert", async () => {
  const f = fixture();
  let alive = true;
  f.afterSchedule(() => { alive = false; });
  await assert.rejects(f.scheduler.schedule("TEST_owner", medicine, true, () => alive), /cancelled/);
  assert.equal(f.pending().length, 0);
});
test("cancellation errors are explicit instead of pretending deletion succeeded", async () => {
  const f = fixture();
  const scheduled = await f.scheduler.schedule("TEST_owner", medicine);
  f.driver.cancel = async () => { throw new Error("Synthetic cancellation failure"); };
  await assert.rejects(f.scheduler.cancelReminder("TEST_owner", scheduled.reminder), /retry notifications/);
});
test("notification budgets prevent silent iOS eviction and preserve existing logs", async () => {
  const rows = Array.from({ length: 18 }, (_, i) => ({ ...medicine, id: `TEST_${i}`, times: ["08:00", "12:00", "20:00"] }));
  assert.throws(() => checkReminderCapacity(rows, { ...medicine, id: "extra" }), /too many scheduled/);
  const f = fixture();
  const result = await f.scheduler.restore("TEST_owner", [...rows, { ...medicine, id: "extra" }]);
  assert.equal(result.reminders.length, 19);
  assert.equal(result.permission, "error");
  assert.equal(f.calls(), 0);
});
test("serialized account cleanup waits for old work and survives failed operations", async () => {
  const order: string[] = [];
  const first = serializeReminderWork(async () => { order.push("old"); throw new Error("Synthetic failure"); });
  const second = serializeReminderWork(async () => { order.push("cleanup"); });
  const third = serializeReminderWork(async () => { order.push("new"); });
  await assert.rejects(first);
  await Promise.all([second, third]);
  assert.deepEqual(order, ["old", "cleanup", "new"]);
});
