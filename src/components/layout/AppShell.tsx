import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { GuestTopbar } from "./GuestTopbar";
import { LayoutProvider } from "../../contexts/LayoutContext";
import { isAuthenticated, isGuestUser } from "../../lib/auth";
import { initializePushNotifications } from "../../lib/notifications";
import { toast } from "react-hot-toast";
import { SmartAppBanner } from "./SmartAppBanner";
import { AppClipBanner } from "./AppClipBanner";
import { isClipSession } from "../../lib/clipDetection";


export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const queryClient = useQueryClient();

  // Re-evaluate auth state on every route change so navigating from login→guest
  // picks up the freshly-set guest token without requiring a full page reload.
  const [showSidebar, setShowSidebar] = useState(() => isAuthenticated());
  const [isGuest, setIsGuest] = useState(() => isGuestUser());
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());

  useEffect(() => {
    setShowSidebar(isAuthenticated());
    setIsGuest(isGuestUser());
    setAuthenticated(isAuthenticated());
  }, [location.pathname]);

  // Initialize push notifications when user is authenticated (only for real users)
  useEffect(() => {
    if (authenticated && !isGuest) {
      initializePushNotifications((notification) => {
        // Show toast notification when received in foreground
        toast.success(notification.title + ": " + notification.body, {
          duration: 5000,
        });

        // Trigger a refetch of notifications to update the bell
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }).catch((error) => {
        console.error("Failed to initialize push notifications:", error);
      });
    }
  }, [authenticated, isGuest, queryClient]);

  return (
    <LayoutProvider>
      <div className="h-screen bg-background text-foreground overflow-hidden">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: "!bg-white dark:!bg-[#2f364a] !text-[#8f8f8f] dark:!text-white !rounded-xl !shadow-lg border border-gray-100 dark:border-none",
            style: {
              padding: '12px 24px',
            },
          }}
        />
        <div className="flex h-full relative flex-col">
          {/* Show App Clip banner OR Smart App Banner — never both */}
          {isClipSession() ? <AppClipBanner /> : <SmartAppBanner />}
          <div className="flex flex-1 relative overflow-hidden">
            {showSidebar ? <Sidebar /> : null}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isGuest ? <GuestTopbar /> : <Topbar />}
            <main className="flex-1 overflow-hidden">{children}</main>
          </div>
            </div>
          </div>
        </div>
    </LayoutProvider>
  );
}