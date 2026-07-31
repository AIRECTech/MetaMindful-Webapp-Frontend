import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getDeviceId } from "../../lib/auth";
import { api } from "../../lib/api";

export function PageTracker() {
  const location = useLocation();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = location.pathname;
    // Prevent duplicate tracks on double rendering/strict mode
    if (lastTrackedPath.current === currentPath) return;
    lastTrackedPath.current = currentPath;

    const trackView = async () => {
      try {
        const deviceId = getDeviceId();
        await api.post("/track/page-view", {
          pagePath: currentPath,
          deviceId,
        });
      } catch (err) {
        // Silently capture tracking errors to prevent UX issues
        console.error("Failed to track page view:", err);
      }
    };

    trackView();
  }, [location.pathname]);

  return null;
}
