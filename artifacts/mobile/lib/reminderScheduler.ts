import {
  MAX_ALERTS, normalizeReminder, reminderAlerts, type Reminder, type ReminderAlert,
} from "./pregnancyReminders";

export type ReminderPermission = "granted" | "denied" | "unsupported" | "error";
export interface PendingReminderAlert {
  id: string;
  ownerId?: string;
  reminderId?: string;
  isBloom: boolean;
}
export interface ReminderNotificationDriver {
  permission: (ask: boolean) => Promise<ReminderPermission>;
  pending: () => Promise<PendingReminderAlert[]>;
  schedule: (ownerId: string, reminder: Reminder, alert: ReminderAlert) => Promise<string>;
  cancel: (id: string) => Promise<void>;
}
export interface ScheduledReminder {
  reminder: Reminder;
  permission: ReminderPermission;
}
// Serialize across provider unmounts so an old account cannot schedule after a
// new account has cleared its alerts.
let serial = Promise.resolve();
export function serializeReminderWork<T>(work: () => Promise<T>): Promise<T> {
  const result = serial.then(work);
  serial = result.then(() => undefined, () => undefined);
  return result;
}
export function createReminderScheduler(driver: ReminderNotificationDriver) {
  const cancelIds = async (ids: string[]) => {
    const results = await Promise.allSettled([...new Set(ids)].map(id => driver.cancel(id)));
    if (results.some(result => result.status === "rejected")) {
      throw new Error("Could not remove previous phone alerts. Please retry notifications.");
    }
  };
  const clearOtherOwners = async (ownerId?: string) => {
    const pending = await driver.pending();
    await cancelIds(pending.filter(alert => alert.isBloom &&
      (!ownerId || alert.ownerId !== ownerId)).map(alert => alert.id));
  };
  const clearOwner = async (ownerId: string) => {
    const pending = await driver.pending();
    await cancelIds(pending.filter(alert => alert.isBloom && alert.ownerId === ownerId).map(alert => alert.id));
  };
  const cancelReminder = async (ownerId: string, reminder: Reminder, keep: string[] = []) => {
    const pending = await driver.pending();
    const ids = [
      ...(reminder.notificationIds ?? []),
      ...(reminder.notificationId ? [reminder.notificationId] : []),
      ...pending.filter(alert => alert.ownerId === ownerId && alert.reminderId === reminder.id).map(alert => alert.id),
    ].filter(id => !keep.includes(id));
    await cancelIds(ids);
  };
  const schedule = async (
    ownerId: string, original: Reminder, ask = false, alive: () => boolean = () => true,
  ): Promise<ScheduledReminder> => {
    const reminder = { ...original, notificationId: undefined, notificationIds: [] as string[], notificationError: undefined };
    const ids: string[] = [];
    try {
      normalizeReminder(reminder);
      if (!alive()) throw new Error("Reminder operation was cancelled.");
      const permission = await driver.permission(ask && reminderAlerts(reminder).length > 0);
      if (!alive()) throw new Error("Reminder operation was cancelled.");
      const alerts = reminderAlerts(reminder);
      if (alerts.length === 0) return { reminder: { ...reminder, notificationStatus: "past" }, permission };
      if (permission !== "granted") {
        return {
          permission,
          reminder: { ...reminder, notificationStatus: permission === "unsupported" ? "unsupported" : permission === "denied" ? "blocked" : "error",
            notificationError: permission === "denied"
              ? "Saved, but phone notifications are disabled. Enable them in device Settings and retry."
              : permission === "unsupported" ? "Saved on this device. Background phone alerts are not available in the web preview."
              : "Saved, but the phone notification service is unavailable. Retry notifications." },
        };
      }
      for (const alert of alerts) {
        if (!alive()) throw new Error("Reminder operation was cancelled.");
        ids.push(await driver.schedule(ownerId, reminder, alert));
      }
      if (!alive()) throw new Error("Reminder operation was cancelled.");
      return { reminder: { ...reminder, notificationIds: ids, notificationStatus: "scheduled" }, permission };
    } catch {
      await cancelIds(ids);
      if (!alive()) throw new Error("Reminder operation was cancelled.");
      return { permission: "error", reminder: { ...reminder, notificationStatus: "error",
        notificationError: "Saved, but alerts could not be scheduled. Check your device notification settings and retry." } };
    }
  };
  const restore = async (ownerId: string, reminders: Reminder[], ask = false, alive: () => boolean = () => true) => {
    await clearOtherOwners(ownerId);
    const permission = await driver.permission(ask);
    if (reminders.reduce((count, reminder) => count + reminderAlerts(reminder).length, 0) > MAX_ALERTS) {
      await clearOwner(ownerId);
      return { permission: "error" as const, reminders: reminders.map(reminder => ({
        ...reminder, notificationIds: [], notificationId: undefined, notificationStatus: "error" as const,
        notificationError: "Too many reminder times for this phone. Remove old reminders or some daily times and retry.",
      })) };
    }
    const pending = await driver.pending();
    const known = new Set(reminders.map(reminder => reminder.id));
    await cancelIds(pending.filter(alert => alert.isBloom && alert.ownerId === ownerId && !known.has(alert.reminderId ?? ""))
      .map(alert => alert.id));
    const restored: Reminder[] = [];
    for (const reminder of reminders) {
      const ids = pending.filter(alert => alert.isBloom && alert.ownerId === ownerId && alert.reminderId === reminder.id).map(alert => alert.id);
      const count = reminderAlerts(reminder).length;
      if (alive() && permission === "granted" && count > 0 && ids.length === count && !ask) {
        restored.push({ ...reminder, notificationId: undefined, notificationIds: ids, notificationStatus: "scheduled", notificationError: undefined });
      } else {
        await cancelReminder(ownerId, reminder);
        const result = await schedule(ownerId, reminder, false, alive);
        restored.push(result.reminder);
      }
    }
    return { reminders: restored, permission: restored.some(reminder => reminder.notificationStatus === "error")
      ? "error" as const : permission };
  };
  return { schedule, restore, clearOwner, clearOtherOwners, cancelReminder, cancelIds };
}
