import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';

export interface CycleLog {
  date: string; // YYYY-MM-DD
  flow?: 'light' | 'medium' | 'heavy';
  symptoms: string[];
  mood?: string;
}

export interface IntimacyLog {
  date: string; // YYYY-MM-DD
  protectedSex: boolean;
}

export interface FertileWindow {
  start: Date;
  end: Date;
  ovulation: Date;
}

export type PregnancyChanceLevel = 'High' | 'Moderate' | 'Low' | 'Unknown';

export interface PregnancyChance {
  level: PregnancyChanceLevel;
  date: string;
  protectedSex: boolean;
  message: string;
}

interface CycleContextType {
  logs: Record<string, CycleLog>;
  intimacyLogs: Record<string, IntimacyLog>;
  isLoading: boolean;
  addLog: (log: CycleLog) => Promise<void>;
  logPeriodStart: (date: string) => Promise<void>;
  logIntimacy: (date: string, protectedSex: boolean) => Promise<void>;
  removeIntimacy: (date: string) => Promise<void>;
  getLastUnprotectedSex: () => IntimacyLog | null;
  getPregnancyChance: () => PregnancyChance | null;
  getDaysPeriodLate: () => number;
  getLastPeriodStart: () => string | null;
  getPredictedNextPeriod: () => Date | null;
  getFertileWindow: () => FertileWindow | null;
  getCyclePhase: (date: string) => string;
  getRecentSymptoms: () => string[];
}

const CycleContext = createContext<CycleContextType | null>(null);

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;

// Walk backwards from the most recent flow day while days stay consecutive,
// so a multi-day period resolves to the day it actually STARTED, not the latest
// day that was logged.
function computeLastPeriodStart(logs: Record<string, CycleLog>): string | null {
  const flowDates = Object.values(logs)
    .filter(l => l.flow)
    .map(l => l.date)
    .sort(); // ascending YYYY-MM-DD

  if (flowDates.length === 0) return null;

  let runStart = flowDates[flowDates.length - 1];
  for (let i = flowDates.length - 1; i > 0; i--) {
    const prev = parseISO(flowDates[i - 1]);
    const cur = parseISO(flowDates[i]);
    if (differenceInDays(cur, prev) === 1) {
      runStart = flowDates[i - 1];
    } else {
      break;
    }
  }
  return runStart;
}

export function CycleProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Record<string, CycleLog>>({});
  const [intimacyLogs, setIntimacyLogs] = useState<Record<string, IntimacyLog>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('bloom_cycle_logs').then(data => {
      if (data) {
        setLogs(JSON.parse(data));
      } else {
        // Seed some data: a period that started 14 days ago
        const seedLogs = {
          [format(addDays(new Date(), -14), 'yyyy-MM-dd')]: { date: format(addDays(new Date(), -14), 'yyyy-MM-dd'), flow: 'medium', symptoms: ['cramps'] },
          [format(addDays(new Date(), -13), 'yyyy-MM-dd')]: { date: format(addDays(new Date(), -13), 'yyyy-MM-dd'), flow: 'heavy', symptoms: ['cramps', 'fatigue'] },
          [format(addDays(new Date(), -12), 'yyyy-MM-dd')]: { date: format(addDays(new Date(), -12), 'yyyy-MM-dd'), flow: 'light', symptoms: [] },
        } as Record<string, CycleLog>;
        setLogs(seedLogs);
        AsyncStorage.setItem('bloom_cycle_logs', JSON.stringify(seedLogs));
      }
      setIsLoading(false);
    });
    AsyncStorage.getItem('bloom_intimacy_logs').then(data => {
      if (data) setIntimacyLogs(JSON.parse(data));
    });
  }, []);

  const addLog = async (log: CycleLog) => {
    setLogs(prev => {
      const updated = { ...prev, [log.date]: log };
      AsyncStorage.setItem('bloom_cycle_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const logPeriodStart = async (date: string) => {
    setLogs(prev => {
      const existing = prev[date];
      const updated = {
        ...prev,
        [date]: {
          date,
          flow: existing?.flow ?? 'medium',
          symptoms: existing?.symptoms ?? [],
          mood: existing?.mood,
        } as CycleLog,
      };
      AsyncStorage.setItem('bloom_cycle_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const logIntimacy = async (date: string, protectedSex: boolean) => {
    setIntimacyLogs(prev => {
      const updated = { ...prev, [date]: { date, protectedSex } };
      AsyncStorage.setItem('bloom_intimacy_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const removeIntimacy = async (date: string) => {
    setIntimacyLogs(prev => {
      const updated = { ...prev };
      delete updated[date];
      AsyncStorage.setItem('bloom_intimacy_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const getLastUnprotectedSex = (): IntimacyLog | null => {
    const unprotected = Object.values(intimacyLogs)
      .filter(l => !l.protectedSex)
      .sort((a, b) => b.date.localeCompare(a.date));
    return unprotected[0] ?? null;
  };

  const getPregnancyChance = (): PregnancyChance | null => {
    // Estimate is driven by the last UNPROTECTED encounter vs the fertile
    // window. A later protected entry must not mask earlier unprotected risk.
    const lastUnprotected = getLastUnprotectedSex();

    if (!lastUnprotected) {
      // No unprotected sex logged. If anything was logged, it was protected.
      const anyLogged = Object.values(intimacyLogs).sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!anyLogged) return null;
      return {
        level: 'Low',
        date: anyLogged.date,
        protectedSex: true,
        message: 'All your logged intimacy was protected, which greatly lowers the chance of pregnancy. No method is perfect, so test if your period is late.',
      };
    }

    const last = lastUnprotected;
    const phase = getCyclePhase(last.date);
    let level: PregnancyChanceLevel;
    let message: string;
    switch (phase) {
      case 'Ovulation':
        level = 'High';
        message = 'This unprotected day fell in your fertile (ovulation) window, when the chance of conceiving is highest.';
        break;
      case 'Follicular':
        level = 'Moderate';
        message = 'This unprotected day was in your follicular phase, approaching your fertile window, so there is a real chance of conceiving. Sperm can survive several days.';
        break;
      case 'Menstruation':
      case 'Luteal':
        level = 'Low';
        message = 'This unprotected day fell outside your typical fertile window, so the chance is lower, though never zero.';
        break;
      default:
        level = 'Unknown';
        message = 'Log a period start so we can map this day to your cycle and estimate the chance of pregnancy.';
    }
    return { level, date: last.date, protectedSex: false, message };
  };

  // How many days past the predicted next period, when no new period has been
  // logged yet (a freshly logged period moves the prediction forward).
  const getDaysPeriodLate = (): number => {
    const next = getPredictedNextPeriod();
    if (!next) return 0;
    const late = differenceInDays(new Date(), next);
    return late > 0 ? late : 0;
  };

  const getLastPeriodStart = () => computeLastPeriodStart(logs);

  const getPredictedNextPeriod = () => {
    const start = computeLastPeriodStart(logs);
    if (!start) return null;
    return addDays(parseISO(start), DEFAULT_CYCLE_LENGTH);
  };

  const getFertileWindow = (): FertileWindow | null => {
    const start = computeLastPeriodStart(logs);
    if (!start) return null;
    const startDate = parseISO(start);
    // Ovulation ~ 14 days before the next period; fertile window spans the
    // 5 days before ovulation through ovulation day.
    const ovulation = addDays(startDate, DEFAULT_CYCLE_LENGTH - 14);
    return {
      ovulation,
      start: addDays(ovulation, -5),
      end: ovulation,
    };
  };

  const getCyclePhase = (dateStr: string) => {
    const start = computeLastPeriodStart(logs);
    if (!start) return 'Unknown';

    const date = parseISO(dateStr);
    const lastPeriodStart = parseISO(start);
    const daysSince = differenceInDays(date, lastPeriodStart);

    if (daysSince < 0) return 'Unknown';
    if (daysSince < DEFAULT_PERIOD_LENGTH) return 'Menstruation';
    if (daysSince < 12) return 'Follicular';
    if (daysSince <= 16) return 'Ovulation';
    if (daysSince < DEFAULT_CYCLE_LENGTH) return 'Luteal';
    return 'Unknown';
  };

  const getRecentSymptoms = () => {
    const recent = Object.values(logs)
      .filter(l => l.symptoms.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    const seen = new Set<string>();
    for (const log of recent) {
      for (const s of log.symptoms) seen.add(s);
    }
    return Array.from(seen);
  };

  return (
    <CycleContext.Provider
      value={{
        logs,
        intimacyLogs,
        isLoading,
        addLog,
        logPeriodStart,
        logIntimacy,
        removeIntimacy,
        getLastUnprotectedSex,
        getPregnancyChance,
        getDaysPeriodLate,
        getLastPeriodStart,
        getPredictedNextPeriod,
        getFertileWindow,
        getCyclePhase,
        getRecentSymptoms,
      }}
    >
      {children}
    </CycleContext.Provider>
  );
}

export const useCycle = () => {
  const context = useContext(CycleContext);
  if (!context) throw new Error("useCycle must be used within CycleProvider");
  return context;
};
