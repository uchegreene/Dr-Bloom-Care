import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProfileMode = 'cycle' | 'pregnant' | 'none';

export type SubscriptionPlan = 'cycle' | 'pregnancy';

export interface Subscription {
  plan: SubscriptionPlan;
  priceNaira: number;
  cardBrand: string;
  cardLast4: string;
  autoRenew: boolean;
  startedAt: string;
  status: 'active' | 'canceled';
}

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  cycle: 7000,
  pregnancy: 20000,
};

export interface Profile {
  name: string;
  dateOfBirth: string;
  bio: string;
  mode: ProfileMode;
  subscription?: Subscription;
}

interface ProfileContextType {
  profile: Profile | null;
  isLoading: boolean;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  completeOnboarding: (data: Profile) => Promise<void>;
  updateSubscription: (patch: Partial<Subscription>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('bloom_profile').then(data => {
      if (data) setProfile(JSON.parse(data));
      setIsLoading(false);
    });
  }, []);

  const updateProfile = async (data: Partial<Profile>) => {
    const updated = { ...profile, ...data } as Profile;
    setProfile(updated);
    await AsyncStorage.setItem('bloom_profile', JSON.stringify(updated));
  };

  const completeOnboarding = async (data: Profile) => {
    setProfile(data);
    await AsyncStorage.setItem('bloom_profile', JSON.stringify(data));
  };

  const updateSubscription = async (patch: Partial<Subscription>) => {
    setProfile(prev => {
      if (!prev || !prev.subscription) return prev;
      const updated: Profile = {
        ...prev,
        subscription: { ...prev.subscription, ...patch },
      };
      AsyncStorage.setItem('bloom_profile', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <ProfileContext.Provider value={{ profile, isLoading, updateProfile, completeOnboarding, updateSubscription }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within ProfileProvider");
  return context;
}
