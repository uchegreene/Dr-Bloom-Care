export type ReminderType = "appointment" | "medication";
export type NotificationStatus = "scheduled" | "blocked" | "unsupported" | "error" | "past";
export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  datetime?: string;
  time?: string; // Preserves previously saved single-time medicine reminders.
  times?: string[];
  advanceMinutes?: number;
  notes?: string;
  notificationId?: string;
  notificationIds?: string[];
  notificationStatus?: NotificationStatus;
  notificationError?: string;
}
export type NewReminder = Omit<Reminder,
  "id" | "notificationId" | "notificationIds" | "notificationStatus" | "notificationError">;
export const ADVANCE_MINUTES = [0, 15, 30, 60, 1440] as const;
export const MAX_REMINDERS = 20;
export const MAX_ALERTS = 54; // Leave room under iOS's 64-pending-alert limit while editing.
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function medicineTimes(reminder: Pick<Reminder, "times" | "time">): string[] {
  return [...new Set(reminder.times ?? (reminder.time ? [reminder.time] : []))].sort();
}
export function normalizeReminder(input: NewReminder): NewReminder {
  const title = input.title?.trim();
  if (!title || title.length > 120) throw new Error("Enter a title of 1–120 characters.");
  const notes = input.notes?.trim() ?? "";
  if (notes.length > 1000) throw new Error("Notes must be 1,000 characters or fewer.");
  if (input.type === "appointment") {
    const date = new Date(input.datetime ?? "");
    if (!Number.isFinite(date.getTime())) throw new Error("Enter a valid appointment date and time.");
    const advanceMinutes = input.advanceMinutes ?? 0;
    if (!(ADVANCE_MINUTES as readonly number[]).includes(advanceMinutes)) throw new Error("Choose a valid advance alert.");
    return { type: "appointment", title, datetime: date.toISOString(), advanceMinutes, notes };
  }
  if (input.type !== "medication") throw new Error("Choose appointment or medicine.");
  const times = medicineTimes(input);
  if (times.length < 1 || times.length > 6 || times.some(time => !CLOCK.test(time))) {
    throw new Error("Enter 1–6 daily times using HH:mm, for example 08:00 and 20:00.");
  }
  return { type: "medication", title, times, notes };
}
export function parseLocalAppointment(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !CLOCK.test(time)) {
    throw new Error("Use YYYY-MM-DD for the date and HH:mm for the time.");
  }
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hour, minute);
  if (year < 2000 || year > 2100 || value.getFullYear() !== year ||
      value.getMonth() !== month - 1 || value.getDate() !== day ||
      value.getHours() !== hour || value.getMinutes() !== minute) {
    throw new Error("That date or local time does not exist. Please check it.");
  }
  return value.toISOString();
}
export type ReminderAlert = { kind: "date"; date: Date } | { kind: "daily"; hour: number; minute: number };
export function reminderAlerts(reminder: Reminder, now = new Date()): ReminderAlert[] {
  if (reminder.type === "appointment") {
    const date = new Date(reminder.datetime ?? "");
    if (!Number.isFinite(date.getTime()) || date.getTime() <= now.getTime()) return [];
    const advance = new Date(date.getTime() - (reminder.advanceMinutes ?? 0) * 60_000);
    return [
      ...(advance.getTime() < date.getTime() && advance.getTime() > now.getTime()
        ? [{ kind: "date" as const, date: advance }] : []),
      { kind: "date", date },
    ];
  }
  return medicineTimes(reminder).filter(time => CLOCK.test(time)).map(time => {
    const [hour, minute] = time.split(":").map(Number);
    return { kind: "daily", hour, minute };
  });
}
export function nextReminderTime(reminder: Reminder, now = new Date()): Date | null {
  const next = reminderAlerts(reminder, now).map(alert => {
    if (alert.kind === "date") return alert.date;
    const date = new Date(now);
    date.setHours(alert.hour, alert.minute, 0, 0);
    if (date.getTime() <= now.getTime()) date.setDate(date.getDate() + 1);
    return date;
  }).sort((a, b) => a.getTime() - b.getTime());
  return next[0] ?? null;
}
export function checkReminderCapacity(reminders: Reminder[], candidate: Reminder, now = new Date()): void {
  const next = [...reminders.filter(r => r.id !== candidate.id), candidate];
  if (next.length > MAX_REMINDERS) throw new Error("You can save up to 20 reminders. Remove an old one first.");
  if (next.reduce((count, r) => count + reminderAlerts(r, now).length, 0) > MAX_ALERTS) {
    throw new Error("There are too many scheduled times. Remove a time or old reminder first.");
  }
}
