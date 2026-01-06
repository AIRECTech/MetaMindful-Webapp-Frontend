import type { PropsWithChildren } from "react";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "./Sidebar";
import { isRealUser } from "../../lib/auth";

export function AppShell({ children }: PropsWithChildren) {
  const showSidebar = isRealUser();

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <div className="flex h-full">
        {showSidebar ? <Sidebar /> : null}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}