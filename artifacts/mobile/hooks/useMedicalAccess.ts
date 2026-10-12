import { useProfile } from "@/hooks/useProfileContext";

export const POLL_MS = 15_000;

/** Server-backed access flags. Role and advisorId come from the account API. */
export function useMedicalAccess() {
  const { profile } = useProfile();
  const role = profile?.role;
  const advisorId = profile?.advisorId ?? null;
  const userId = profile?.userId ?? "";
  const ready = Boolean(profile?.profileComplete && userId);
  const isAdmin = role === "admin";
  const isTeam = role === "medical_team" && advisorId != null;
  const isStaff = isAdmin || isTeam;
  const isPaid = profile?.subscriptionActive === true;
  return {
    profile,
    userId,
    ready,
    isAdmin,
    isTeam,
    isStaff,
    isPaid,
    canInteract: ready && (isPaid || isStaff),
    ownAdvisorId: isTeam ? advisorId : null,
  };
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error && typeof error === "object" && "data" in error && error.data && typeof error.data === "object" &&
      "error" in error.data && typeof error.data.error === "string" && error.data.error.length < 220) {
    return error.data.error;
  }
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    const m = (error as { message: string }).message;
    if (m && m.length < 220) return m;
  }
  return fallback;
}
