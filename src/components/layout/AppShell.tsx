import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { isRealUser, isAuthenticated } from "../../lib/auth";
import { initializePushNotifications } from "../../lib/notifications";
import { toast } from "react-hot-toast";


export function AppShell({ children }: PropsWithChildren) {
  const showSidebar = isRealUser();
  const authenticated = isAuthenticated();
  const queryClient = useQueryClient();

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (authenticated) {
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
  }, [authenticated, queryClient]);

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: "animate-border-gradient",
          style: {
            background: "transparent",
            padding: "0", // Let the class handle padding/inset
          },
        }}
      />
      <div className="flex h-full">
        {showSidebar ? <Sidebar /> : null}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}