import React, { ReactNode } from "react";
import { ProfileProvider } from "@/hooks/useProfileContext";
import { CycleProvider } from "@/hooks/useCycleContext";
import { PregnancyProvider } from "@/hooks/usePregnancyContext";
import { RemindersProvider } from "@/hooks/useRemindersContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <CycleProvider>
        <PregnancyProvider>
          <RemindersProvider>
            {children}
          </RemindersProvider>
        </PregnancyProvider>
      </CycleProvider>
    </ProfileProvider>
  );
}
