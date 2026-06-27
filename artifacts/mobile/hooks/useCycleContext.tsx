import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';

export interface CycleLog {
  date: string; // YYYY-MM-DD
  flow?: 'light' | 'medium' | 'heavy';
  symptoms: string[];
  mood?: string;
}

interface CycleContextType {
  logs: Record<string, CycleLog>;
  isLoading: boolean;
  addLog: (log: CycleLog) => Promise<void>;
  getPredictedNextPeriod: () => Date | null;
  getCyclePhase: (date: string) => string;
}

const CycleContext = createContext<CycleContextType | null>(null);

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;

export function CycleProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Record<string, CycleLog>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('bloom_cycle_logs').then(data => {
      if (data) {
        setLogs(JSON.parse(data));
      } else {
        // Seed some data: a period that started 14 days ago
        const seedDate = format(addDays(new Date(), -14), 'yyyy-MM-dd');
        const seedLogs = {
          [seedDate]: { date: seedDate, flow: 'medium', symptoms: ['cramps'] },
          [format(addDays(new Date(), -13), 'yyyy-MM-dd')]: { date: format(addDays(new Date(), -13), 'yyyy-MM-dd'), flow: 'heavy', symptoms: ['cramps', 'fatigue'] },
          [format(addDays(new Date(), -12), 'yyyy-MM-dd')]: { date: format(addDays(new Date(), -12), 'yyyy-MM-dd'), flow: 'light', symptoms: [] },
        } as Record<string, CycleLog>;
        setLogs(seedLogs);
        AsyncStorage.setItem('bloom_cycle_logs', JSON.stringify(seedLogs));
      }
      setIsLoading(false);
    });
  }, []);

  const addLog = async (log: CycleLog) => {
    const updated = { ...logs, [log.date]: log };
    setLogs(updated);
    await AsyncStorage.setItem('bloom_cycle_logs', JSON.stringify(updated));
  };

  const getPredictedNextPeriod = () => {
    const periodDays = Object.values(logs)
      .filter(l => l.flow)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (periodDays.length === 0) return null;
    
    const lastPeriodStart = periodDays[0].date;
    return addDays(parseISO(lastPeriodStart), DEFAULT_CYCLE_LENGTH);
  };

  const getCyclePhase = (dateStr: string) => {
    const date = parseISO(dateStr);
    const periodDays = Object.values(logs)
      .filter(l => l.flow)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (periodDays.length === 0) return 'Unknown';

    const lastPeriodStart = parseISO(periodDays[0].date);
    const daysSince = differenceInDays(date, lastPeriodStart);

    if (daysSince >= 0 && daysSince < DEFAULT_PERIOD_LENGTH) return 'Menstruation';
    if (daysSince >= DEFAULT_PERIOD_LENGTH && daysSince < 12) return 'Follicular';
    if (daysSince >= 12 && daysSince <= 16) return 'Ovulation';
    if (daysSince > 16 && daysSince < DEFAULT_CYCLE_LENGTH) return 'Luteal';
    return 'Unknown';
  };

  return (
    <CycleContext.Provider value={{ logs, isLoading, addLog, getPredictedNextPeriod, getCyclePhase }}>
      {children}
    </CycleContext.Provider>
  );
}

export const useCycle = () => {
  const context = useContext(CycleContext);
  if (!context) throw new Error("useCycle must be used within CycleProvider");
  return context;
};
