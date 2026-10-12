import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useScopedStorage } from '@/lib/scopedAsyncStorage';
import { useProfile } from '@/hooks/useProfileContext';
import { addDays, differenceInWeeks, differenceInDays, parseISO } from 'date-fns';

export interface PregnancyLog {
  date: string; // YYYY-MM-DD
  symptoms: string[];
  notes: string;
  weight?: number;
}

export interface PregnancyData {
  lmpDate?: string;
  dueDate?: string;
  logs: Record<string, PregnancyLog>;
}

interface PregnancyContextType {
  data: PregnancyData | null;
  isLoading: boolean;
  updateDates: (lmpDate?: string, dueDate?: string) => Promise<void>;
  addLog: (log: PregnancyLog) => Promise<void>;
  getStats: () => { edd: Date | null, week: number, day: number, trimester: number, daysRemaining: number };
}

const PregnancyContext = createContext<PregnancyContextType | null>(null);

export function PregnancyProvider({ children }: { children: ReactNode }) {
  const AsyncStorage = useScopedStorage();
  const { profile } = useProfile();
  const requirePregnancyPlan = () => {
    if (!profile?.subscriptionActive || profile.subscriptionPlan !== "pregnancy" || profile.mode !== "pregnant") {
      throw new Error("An active pregnancy plan is required to log pregnancy information.");
    }
  };
  const [data, setData] = useState<PregnancyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('bloom_pregnancy').then(stored => {
      if (stored) {
        setData(JSON.parse(stored));
      } else {
        setData({ logs: {} });
      }
      setIsLoading(false);
    });
  }, []);

  const updateDates = async (lmpDate?: string, dueDate?: string) => {
    requirePregnancyPlan();
    const updated = { ...data, lmpDate, dueDate, logs: data?.logs || {} };
    setData(updated);
    await AsyncStorage.setItem('bloom_pregnancy', JSON.stringify(updated));
  };

  const addLog = async (log: PregnancyLog) => {
    requirePregnancyPlan();
    if (!data) return;
    const updatedLogs = { ...data.logs, [log.date]: log };
    const updated = { ...data, logs: updatedLogs };
    setData(updated);
    await AsyncStorage.setItem('bloom_pregnancy', JSON.stringify(updated));
  };

  const getStats = () => {
    if (!data || (!data.lmpDate && !data.dueDate)) {
      return { edd: null, week: 0, day: 0, trimester: 0, daysRemaining: 0 };
    }

    let edd: Date;
    if (data.dueDate) {
      edd = parseISO(data.dueDate);
    } else {
      edd = addDays(parseISO(data.lmpDate!), 280);
    }

    const today = new Date();
    const daysRemaining = Math.max(0, differenceInDays(edd, today));
    const totalDays = 280 - daysRemaining;
    
    const week = Math.floor(totalDays / 7);
    const day = totalDays % 7;
    const trimester = week < 13 ? 1 : week < 27 ? 2 : 3;

    return { edd, week, day, trimester, daysRemaining };
  };

  return (
    <PregnancyContext.Provider value={{ data, isLoading, updateDates, addLog, getStats }}>
      {children}
    </PregnancyContext.Provider>
  );
}

export const usePregnancy = () => {
  const context = useContext(PregnancyContext);
  if (!context) throw new Error("usePregnancy must be used within PregnancyProvider");
  return context;
};
