import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/expo";
import {
  useGetAccount,
  useUpdateAccount,
  type MemberAccount,
} from "@workspace/api-client-react";

export type ProfileMode = "cycle" | "pregnant" | "none";
export type SubscriptionPlan = "cycle" | "pregnancy";

export interface Profile {
  userId: string;
  email: string;
  username: string;
  name: string;
  dateOfBirth: string;
  bio: string;
  femaleOnlyConfirmed: boolean;
  mode: ProfileMode;
  role: "member" | "admin";
  subscriptionPlan: SubscriptionPlan | null;
  subscriptionStatus: "free" | "active" | "expired";
  subscriptionExpiresAt: string | null;
  requestedPlan: SubscriptionPlan | null;
  requestedAt: string | null;
  subscriptionActive: boolean;
  profileComplete: boolean;
}

interface ProfileContextType {
  profile: Profile | null;
  isLoading: boolean;
  profileError: string | null;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  completeOnboarding: (data: Pick<Profile, "username" | "name" | "dateOfBirth" | "bio" | "mode">) => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

function mapAccount(account: MemberAccount): Profile {
  return {
    userId: account.userId,
    email: account.email,
    username: account.username ?? "",
    name: account.name ?? "",
    dateOfBirth: account.dateOfBirth ?? "",
    bio: account.bio,
    femaleOnlyConfirmed: account.femaleOnlyConfirmed,
    mode: account.mode,
    role: account.role,
    subscriptionPlan: account.subscriptionPlan,
    subscriptionStatus: account.subscriptionStatus,
    subscriptionExpiresAt: account.subscriptionExpiresAt
      ? String(account.subscriptionExpiresAt)
      : null,
    requestedPlan: account.requestedPlan,
    requestedAt: account.requestedAt ? String(account.requestedAt) : null,
    subscriptionActive: account.subscriptionActive,
    profileComplete: account.profileComplete,
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const accountQuery = useGetAccount({
    query: {
      enabled: Boolean(isLoaded && isSignedIn),
      retry: 1,
      staleTime: 15_000,
    },
  });
  const updateAccount = useUpdateAccount();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setProfile(null);
      return;
    }
    if (accountQuery.data) setProfile(mapAccount(accountQuery.data));
  }, [accountQuery.data, isLoaded, isSignedIn]);

  const saveAccount = useCallback(
    async (
      value: Pick<
        Profile,
        | "username"
        | "name"
        | "dateOfBirth"
        | "bio"
        | "femaleOnlyConfirmed"
        | "mode"
      >,
    ) => {
      const result = await updateAccount.mutateAsync({
        data: {
          username: value.username.trim(),
          name: value.name.trim(),
          dateOfBirth: value.dateOfBirth,
          bio: value.bio.trim(),
          femaleOnlyConfirmed: value.femaleOnlyConfirmed,
          mode: value.mode,
        },
      });
      setProfile(mapAccount(result));
      return result;
    },
    [updateAccount],
  );

  const updateProfile = useCallback(
    async (data: Partial<Profile>) => {
      if (!profile?.userId) throw new Error("Your account is still loading.");
      await saveAccount({
        username: data.username ?? profile.username,
        name: data.name ?? profile.name,
        dateOfBirth: data.dateOfBirth ?? profile.dateOfBirth,
        bio: data.bio ?? profile.bio,
        femaleOnlyConfirmed: profile.femaleOnlyConfirmed,
        mode: data.mode ?? profile.mode,
      });
    },
    [profile, saveAccount],
  );

  const completeOnboarding = useCallback(
    async (
      data: Pick<
        Profile,
        | "username"
        | "name"
        | "dateOfBirth"
        | "bio"
        | "femaleOnlyConfirmed"
        | "mode"
      >,
    ) => {
      await saveAccount(data);
    },
    [saveAccount],
  );

  const refreshAccount = useCallback(async () => {
    await accountQuery.refetch();
  }, [accountQuery]);

  const value = useMemo<ProfileContextType>(
    () => ({
      profile,
      isLoading:
        !isLoaded ||
        Boolean(isSignedIn && accountQuery.isLoading) ||
        Boolean(updateAccount.isPending),
      profileError: accountQuery.error
        ? "Bloom couldn’t load your account. Check your connection and try again."
        : null,
      updateProfile,
      completeOnboarding,
      refreshAccount,
    }),
    [
      profile,
      isLoaded,
      isSignedIn,
      accountQuery.isLoading,
      accountQuery.error,
      updateAccount.isPending,
      updateProfile,
      completeOnboarding,
      refreshAccount,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within ProfileProvider");
  return context;
}
