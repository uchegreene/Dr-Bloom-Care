import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@/lib/scopedAsyncStorage';

export type ReminderType = 'appointment' | 'medication';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  datetime?: string; // appointment: ISO datetime string
  time?: string; // medication: 'HH:mm' daily time
  notes?: string;
  notificationId?: string;
}

export type NewReminder = Omit<Reminder, 'id' | 'notificationId'>;

interface RemindersContextType {
  reminders: Reminder[];
  isLoading: boolean;
  addReminder: (r: NewReminder) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
}

const RemindersContext = createContext<RemindersContextType | null>(null);

const STORAGE_KEY = 'bloom_reminders';

async function scheduleNotification(r: Reminder): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  try {
    const Notifications = await import('expo-notifications');
    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return undefined;

    if (r.type === 'appointment' && r.datetime) {
      const date = new Date(r.datetime);
      if (isNaN(date.getTime()) || date.getTime() <= Date.now()) return undefined;
      return await Notifications.scheduleNotificationAsync({
        content: { title: 'Appointment reminder', body: r.title, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }

    if (r.type === 'medication' && r.time) {
      const [h, m] = r.time.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return undefined;
      return await Notifications.scheduleNotificationAsync({
        content: { title: 'Medication reminder', body: r.title, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m },
      });
    }
  } catch (e) {
    console.warn('Failed to schedule notification', e);
  }
  return undefined;
}

async function cancelNotification(notificationId?: string) {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.warn('Failed to cancel notification', e);
  }
}

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(data => {
      if (data) setReminders(JSON.parse(data));
      setIsLoading(false);
    });

    if (Platform.OS !== 'web') {
      import('expo-notifications')
        .then(Notifications => {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
            }),
          });
        })
        .catch(() => {});
    }
  }, []);

  const persist = (next: Reminder[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addReminder = async (r: NewReminder) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 8);
    const base: Reminder = { ...r, id };
    const notificationId = await scheduleNotification(base);
    const reminder: Reminder = { ...base, notificationId };
    setReminders(prev => {
      const next = [...prev, reminder];
      persist(next);
      return next;
    });
  };

  const removeReminder = async (id: string) => {
    const target = reminders.find(r => r.id === id);
    await cancelNotification(target?.notificationId);
    setReminders(prev => {
      const next = prev.filter(r => r.id !== id);
      persist(next);
      return next;
    });
  };

  return (
    <RemindersContext.Provider value={{ reminders, isLoading, addReminder, removeReminder }}>
      {children}
    </RemindersContext.Provider>
  );
}

export const useReminders = () => {
  const context = useContext(RemindersContext);
  if (!context) throw new Error('useReminders must be used within RemindersProvider');
  return context;
};
