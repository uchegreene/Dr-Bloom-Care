import React, { ReactNode } from "react";
import { ProfileProvider } from "@/hooks/useProfileContext";
import { CycleProvider } from "@/hooks/useCycleContext";
import { PregnancyProvider } from "@/hooks/usePregnancyContext";
import { SocialProvider } from "@/hooks/useSocialContext";
import { ChatProvider } from "@/hooks/useChatContext";
import { RemindersProvider } from "@/hooks/useRemindersContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <CycleProvider>
        <PregnancyProvider>
          <RemindersProvider>
            <SocialProvider>
              <ChatProvider>
                {children}
              </ChatProvider>
            </SocialProvider>
          </RemindersProvider>
        </PregnancyProvider>
      </CycleProvider>
    </ProfileProvider>
  );
}
