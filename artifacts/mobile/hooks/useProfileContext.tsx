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
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { paidAccessAt } from "@/lib/subscriptionAccess";
import {
  useGetAccount,
  useUpdateAccount,
  useUpdateStaffProfile,
  type StaffProfileInput,
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
  role: "member" | "admin" | "medical_team";
  isSuperAdmin: boolean;
  advisorId: number | null;
  assignedProfileName: string | null;
  subscriptionPlan: SubscriptionPlan | null;
  subscriptionStatus: "free" | "active" | "expired";
  subscriptionExpiresAt: string | null;
  requestedPlan: SubscriptionPlan | null;
  requestedAt: string | null;
  subscriptionActive: boolean;
  profileComplete: boolean;
  staffProfile: { name: string; gender: "female" | "male" | "other"; age: number } | null;
}

interface ProfileContextType {
  profile: Profile | null;
  isLoading: boolean;
  profileError: string | null;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  completeOnboarding: (data: Pick<Profile, "username" | "name" | "dateOfBirth" | "bio" | "femaleOnlyConfirmed" | "mode">) => Promise<void>;
  completeStaffOnboarding: (data: StaffProfileInput) => Promise<void>;
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
    isSuperAdmin: account.isSuperAdmin === true,
    advisorId: account.advisorId,
    assignedProfileName: account.assignedProfileName ?? null,
    subscriptionPlan: account.subscriptionPlan,
    subscriptionStatus: account.subscriptionStatus === "active" && !paidAccessAt(true, account.subscriptionExpiresAt ? String(account.subscriptionExpiresAt) : null)
      ? "expired" : account.subscriptionStatus,
    subscriptionExpiresAt: account.subscriptionExpiresAt
      ? String(account.subscriptionExpiresAt)
      : null,
    requestedPlan: account.requestedPlan,
    requestedAt: account.requestedAt ? String(account.requestedAt) : null,
    subscriptionActive: paidAccessAt(account.subscriptionActive, account.subscriptionExpiresAt ? String(account.subscriptionExpiresAt) : null),
    profileComplete: account.profileComplete,
    staffProfile: account.staffProfile ?? null,
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const accountQuery = useGetAccount({
    query: {
      queryKey: ["/account", userId],
      enabled: Boolean(isLoaded && isSignedIn),
      retry: 1,
      staleTime: 15_000,
      refetchInterval: 60_000,
    },
  });
  const updateAccount = useUpdateAccount();
  const updateStaff = useUpdateStaffProfile();

  useEffect(() => {
    const listener = AppState.addEventListener("change", state => {
      if (state === "active" && isSignedIn) void accountQuery.refetch();
    });
    return () => listener.remove();
  }, [isSignedIn, accountQuery.refetch]);

  useEffect(() => {
    if (!profile?.subscriptionActive || !profile.subscriptionExpiresAt) return;
    let timer: ReturnType<typeof setTimeout>;
    const expiry = Date.parse(profile.subscriptionExpiresAt);
    const check = () => {
      const remaining = expiry - Date.now();
      if (remaining > 0) {
        timer = setTimeout(check, Math.min(remaining, 2_147_483_647));
      } else {
        setProfile(current => current ? { ...current, subscriptionActive: false, subscriptionStatus: "expired" } : current);
        void accountQuery.refetch();
      }
    };
    check();
    return () => clearTimeout(timer);
  }, [profile?.subscriptionActive, profile?.subscriptionExpiresAt, accountQuery.refetch]);

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
      // Prevent an older incomplete-account response from winning the save.
      await queryClient.cancelQueries({ queryKey: ["/account", userId] });
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
      queryClient.setQueryData(["/account", userId], result);
      setProfile(mapAccount(result));
      return result;
    },
    [updateAccount, queryClient, userId],
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

  const completeStaffOnboarding = useCallback(async (data: StaffProfileInput) => {
    const result = await updateStaff.mutateAsync({ data });
    // Update the same profile state that admin gates actually consume.
    setProfile(mapAccount(result));
  }, [updateStaff]);

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
        ? "Dr Bloom Care couldn’t load your account. Check your connection and try again."
        : null,
      updateProfile,
      completeOnboarding,
      completeStaffOnboarding,
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
      completeStaffOnboarding,
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
