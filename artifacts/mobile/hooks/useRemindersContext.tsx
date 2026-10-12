import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { AppState } from "react-native";
import { useAuth } from "@clerk/expo";
import { useScopedStorage } from "@/lib/scopedAsyncStorage";
import { useProfile } from "@/hooks/useProfileContext";
import { checkReminderCapacity, normalizeReminder, type Reminder, type NewReminder } from "@/lib/pregnancyReminders";
import { reminderScheduler } from "@/lib/reminderNotifications";
import { serializeReminderWork, type ReminderPermission } from "@/lib/reminderScheduler";
export type { Reminder, NewReminder, ReminderType } from "@/lib/pregnancyReminders";

interface RemindersContextType {
  reminders: Reminder[];
  isLoading: boolean;
  isBusy: boolean;
  loadError: string | null;
  notificationPermission: ReminderPermission | "unknown";
  canManage: boolean;
  addReminder: (reminder: NewReminder) => Promise<Reminder>;
  updateReminder: (id: string, reminder: NewReminder) => Promise<Reminder>;
  removeReminder: (id: string) => Promise<void>;
  retryNotifications: () => Promise<void>;
}
const RemindersContext = createContext<RemindersContextType | null>(null);
const STORAGE_KEY = "bloom_reminders";

function decodeReminders(data: string | null): Reminder[] {
  if (!data) return [];
  const value: unknown = JSON.parse(data);
  if (!Array.isArray(value) || value.some(item => !item || typeof item !== "object" ||
      typeof item.id !== "string" || typeof item.title !== "string" ||
      !["appointment", "medication"].includes(item.type) ||
      ["datetime", "time", "notes", "notificationId"].some(key =>
        item[key] != null && typeof item[key] !== "string") ||
      ["times", "notificationIds"].some(key => item[key] != null &&
        (!Array.isArray(item[key]) || item[key].some((part: unknown) => typeof part !== "string"))) ||
      (item.advanceMinutes != null && !Number.isFinite(item.advanceMinutes)))) {
    throw new Error("Saved reminders could not be read. Your existing records have not been changed.");
  }
  return value as Reminder[];
}

export function RemindersProvider({ children }: { children: ReactNode }) {
  const storage = useScopedStorage();
  const { userId, isSignedIn } = useAuth();
  const { profile } = useProfile();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notificationPermission, setPermission] = useState<ReminderPermission | "unknown">("unknown");
  const records = useRef<Reminder[]>([]);
  const alive = useRef(false);
  const pending = useRef(0);
  const loaded = useRef(false);
  const canManage = Boolean(isSignedIn && profile?.profileComplete && profile.mode === "pregnant" &&
    profile.subscriptionActive && profile.subscriptionPlan === "pregnancy");

  const commit = async (next: Reminder[]) => {
    if (!alive.current) throw new Error("The account changed. Please reopen reminders.");
    await storage.setItem(STORAGE_KEY, JSON.stringify(next));
    records.current = next;
    if (alive.current) setReminders(next);
  };
  const restore = async (ask = false) => {
    if (!userId || !alive.current || !loaded.current) return;
    try {
      const result = await reminderScheduler.restore(userId, records.current, ask, () => alive.current);
      if (!alive.current) return;
      await commit(result.reminders);
      setPermission(result.permission);
    } catch {
      if (alive.current) {
        setPermission("error");
        setReminders(records.current.map(reminder => ({
          ...reminder, notificationStatus: "error",
          notificationError: "Could not restore phone alerts. Retry notifications.",
        })));
      }
      if (ask) throw new Error("Could not restore phone alerts. Check device Settings and try again.");
    }
  };
  useEffect(() => {
    alive.current = true;
    void serializeReminderWork(async () => {
      if (!userId || !isSignedIn) {
        await reminderScheduler.clearOtherOwners();
        if (alive.current) setIsLoading(false);
        return;
      }
      try {
        const saved = decodeReminders(await storage.getItem(STORAGE_KEY));
        if (!alive.current) return;
        records.current = saved;
        loaded.current = true;
        setReminders(saved);
        await restore();
      } catch {
        if (alive.current) setLoadError("Could not load saved reminders. Existing records have not been changed. Reopen this screen or app.");
      } finally {
        if (alive.current) setIsLoading(false);
      }
    }).catch(() => { if (alive.current) { setPermission("error"); setIsLoading(false); } });
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void serializeReminderWork(() => restore()).catch(() => {
        if (alive.current) setPermission("error");
      });
    });
    return () => {
      alive.current = false;
      subscription.remove();
      if (userId) void serializeReminderWork(() => reminderScheduler.clearOwner(userId))
        .catch(() => console.warn("Bloom phone alerts could not be cleared. They will be checked on next sign-in."));
    };
  }, [storage, userId, isSignedIn]);

  const run = async <T,>(work: () => Promise<T>): Promise<T> => {
    if (!canManage || !userId) throw new Error("Switch to pregnancy mode with an active pregnancy plan to manage reminders.");
    if (!loaded.current || loadError) throw new Error("Wait for saved reminders to load before making changes.");
    pending.current++;
    setIsBusy(true);
    try { return await serializeReminderWork(async () => {
      if (!alive.current) throw new Error("The account changed. Please reopen reminders.");
      return work();
    }); }
    finally {
      pending.current--;
      if (alive.current) setIsBusy(pending.current > 0);
    }
  };
  const save = async (input: NewReminder, id?: string): Promise<Reminder> => run(async () => {
    const original = id ? records.current.find(reminder => reminder.id === id) : undefined;
    if (id && !original) throw new Error("This reminder no longer exists.");
    const base: Reminder = {
      ...normalizeReminder(input), id: id ?? `${Date.now()}${Math.random().toString(36).slice(2, 10)}`,
    };
    checkReminderCapacity(records.current, base);
    let result: Awaited<ReturnType<typeof reminderScheduler.schedule>>;
    try { result = await reminderScheduler.schedule(userId!, base, true, () => alive.current); }
    catch (error) {
      if (alive.current) setPermission("error");
      throw error;
    }
    try {
      await commit([...records.current.filter(reminder => reminder.id !== base.id), result.reminder]);
    } catch {
      await reminderScheduler.cancelIds(result.reminder.notificationIds ?? []);
      throw new Error("The reminder could not be saved. Please try again.");
    }
    if (original) {
      try { await reminderScheduler.cancelReminder(userId!, original, result.reminder.notificationIds); }
      catch {
        const warning: Reminder = { ...result.reminder, notificationStatus: "error",
          notificationError: "Updated, but previous phone alerts could not be removed. Retry notifications." };
        await commit(records.current.map(reminder => reminder.id === base.id ? warning : reminder));
        setPermission("error");
        return warning;
      }
    }
    setPermission(result.permission);
    return result.reminder;
  });
  const removeReminder = (id: string) => run(async () => {
    const reminder = records.current.find(item => item.id === id);
    if (!reminder) return;
    try { await reminderScheduler.cancelReminder(userId!, reminder); }
    catch (error) { if (alive.current) setPermission("error"); throw error; }
    await commit(records.current.filter(item => item.id !== id));
  });
  return <RemindersContext.Provider value={{
    reminders, isLoading, isBusy, loadError, notificationPermission, canManage,
    addReminder: input => save(input), updateReminder: (id, input) => save(input, id),
    removeReminder, retryNotifications: () => run(() => restore(true)),
  }}>{children}</RemindersContext.Provider>;
}
export function useReminders() {
  const context = useContext(RemindersContext);
  if (!context) throw new Error("useReminders must be used within RemindersProvider");
  return context;
}
