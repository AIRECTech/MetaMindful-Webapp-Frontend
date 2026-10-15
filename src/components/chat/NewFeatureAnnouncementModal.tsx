import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AlarmClock, ChevronRight } from "lucide-react";
import { api } from "../../lib/api";

const FEATURE_NAME = "Reminders";
const STORAGE_DISMISSED_KEY = "airec_reminder_feature_dismissed";
const STORAGE_VISIT_COUNT_KEY = "airec_reminder_feature_visits";
const SESSION_SHOWN_KEY = "airec_reminder_feature_shown_session";
const MAX_VISITS = 3;

export function NewFeatureAnnouncementModal() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check if current route is a chat page
    const pathname = location.pathname;
    const isChatPage =
      pathname === "/user" ||
      pathname.startsWith("/user/chat") ||
      pathname.startsWith("/guest") ||
      pathname === "/start-chat";

    if (!isChatPage) return;

    // Check if user already dismissed / acknowledged this feature
    const isDismissed = localStorage.getItem(STORAGE_DISMISSED_KEY) === "true";
    if (isDismissed) return;

    // Check total visits/impressions shown so far
    const currentVisits = parseInt(localStorage.getItem(STORAGE_VISIT_COUNT_KEY) || "0", 10);
    if (currentVisits >= MAX_VISITS) return;

    // Check if already shown in this browser session (1 per visit)
    const shownThisSession = sessionStorage.getItem(SESSION_SHOWN_KEY) === "true";
    if (shownThisSession) return;

    // Mark as shown for this visit and increment visit counter
    sessionStorage.setItem(SESSION_SHOWN_KEY, "true");
    localStorage.setItem(STORAGE_VISIT_COUNT_KEY, String(currentVisits + 1));

    // Display modal after a brief delay for smooth entrance
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleGotIt = async () => {
    // Hide popup immediately
    setIsOpen(false);

    // Persist dismissal so it will never appear again
    localStorage.setItem(STORAGE_DISMISSED_KEY, "true");

    // Send tracking request to backend to save feature click with user IP
    try {
      await api.post("/track/feature-click", {
        featureName: FEATURE_NAME,
      });
    } catch (err) {
      // Non-blocking error handling
      console.error("Failed to log feature click:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] transition-all duration-300">
      {/* Modal Dialog Card */}
      <div 
        className="relative bg-white dark:bg-[#1E232F] rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.18)] border border-gray-100 dark:border-gray-800 max-w-[360px] sm:max-w-[395px] w-full flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-modal-title"
      >
        {/* Visual Mockup Card Container */}
        <div className="w-full p-2.5 rounded-[22px] bg-gradient-to-b from-[#EEF2F6] to-[#F8FAFC] dark:from-gray-800 dark:to-gray-800/60 border border-[#E2E8F0] dark:border-gray-700/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          {/* Inner Reminder Preview Card */}
          <div className="bg-white dark:bg-gray-850 rounded-[16px] px-3.5 py-3 flex items-center gap-3 border border-gray-100 dark:border-gray-700/80 shadow-sm">
            {/* Alarm Clock Icon Box */}
            <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-750 flex items-center justify-center text-gray-700 dark:text-gray-200 border border-gray-200/70 dark:border-gray-700 flex-shrink-0">
              <AlarmClock className="w-5 h-5 text-gray-700 dark:text-gray-200" strokeWidth={1.75} />
            </div>

            {/* Notification Text */}
            <div className="flex-1 text-left min-w-0 pr-1">
              <div className="text-[13px] sm:text-[13.5px] font-semibold text-gray-900 dark:text-gray-100 truncate tracking-tight">
                Reminder to reach out to your friend
              </div>
              <div className="text-[11.5px] sm:text-[12px] text-gray-400 dark:text-gray-400 mt-0.5">
                Tomorrow · 9:00 PM
              </div>
            </div>

            {/* Chevron Right */}
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" strokeWidth={2} />
          </div>
        </div>

        {/* Feature Tag Pill */}
        <div className="inline-flex items-center justify-center bg-[#E8F1FA] text-[#1E3A8A] dark:bg-blue-950/60 dark:text-blue-300 text-[12.5px] font-medium px-3.5 py-1 rounded-full mt-6 tracking-tight">
          What’s new: Reminders
        </div>

        {/* Headline */}
        <h2 
          id="feature-modal-title" 
          className="text-[21px] sm:text-[23px] font-bold text-gray-900 dark:text-white mt-4 tracking-tight leading-snug"
        >
          Come back when it matters
        </h2>

        {/* Subtitle / Description */}
        <p className="text-[13.5px] sm:text-[14px] text-gray-500 dark:text-gray-400 mt-2.5 leading-relaxed max-w-[280px] sm:max-w-[310px] text-center">
          Set a reminder and return to the same conversation when you’re ready.
        </p>

        {/* Got it! Button */}
        <button
          onClick={handleGotIt}
          type="button"
          className="mt-6 mb-1 px-8 py-2.5 rounded-full bg-[#F5C242] hover:bg-[#ebba3b] active:scale-[0.98] text-[#1E1E1E] font-medium text-[14.5px] shadow-sm transition-all duration-150 cursor-pointer"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
