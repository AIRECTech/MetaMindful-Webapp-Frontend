import { Outlet } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";

import { useEffect } from "react";
import { logAnalyticsEvent } from "./lib/firebase";

function App() {
  useEffect(() => {
    logAnalyticsEvent("session_start");
  }, []);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default App;
