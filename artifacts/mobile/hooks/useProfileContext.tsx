import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProfileMode = 'cycle' | 'pregnant' | 'none';

export interface Profile {
  name: string;
  bio: string;
  mode: ProfileMode;
}

interface ProfileContextType {
  profile: Profile | null;
  isLoading: boolean;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  completeOnboarding: (data: Profile) => Promise<void>;
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

  return (
    <ProfileContext.Provider value={{ profile, isLoading, updateProfile, completeOnboarding }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within ProfileProvider");
  return context;
}
