import { Bell, LogOut, Moon, Sun } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { clearTokens, isGuestUser, isAuthenticated } from "../../lib/auth";
import { toast } from "react-hot-toast";
import { getDarkMode, toggleDarkMode as toggleDarkModeUtil } from "../../lib/darkMode";
import { LoginPopup } from "../LoginPopup";
import { SignupPopup } from "../SignupPopup";

export function Topbar() {
  const navigate = useNavigate();
  const params = useParams();
  const authenticated = isAuthenticated();
  const isGuest = isGuestUser();
  // Get threadId from URL params if on a chat page
  const threadId = params.id;
  
  const [darkMode, setDarkMode] = useState(() => {
    return getDarkMode();
  });
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showSignupPopup, setShowSignupPopup] = useState(false);

  // Sync dark mode state with DOM changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark !== darkMode) {
        setDarkMode(isDark);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newMode = toggleDarkModeUtil();
    setDarkMode(newMode);
  };
  
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // Continue with logout even if API call fails
      console.error("Logout error:", error);
    }
    clearTokens();
    toast.success("Logged out successfully");
    navigate("/", { replace: true });
  };

  const handleLogoClick = () => {
    navigate("/");
  };

  return (
    <header className="flex items-center justify-between px-4 py-3">
      <button
        onClick={handleLogoClick}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <img 
          src="/logo.png" 
          alt="MetaMindful" 
          className="h-8 w-auto"
        />
        <div className="flex flex-col items-start">
          <span className="text-lg font-bold text-gray-800 dark:text-gray-200">MetaMindful</span>
          {isGuest && (
            <span className="text-xs text-gray-500 dark:text-gray-400">Guest mode</span>
          )}
        </div>
      </button>
      <div className="flex items-center gap-3">
        {/* Dark mode toggle - show for all users including guests */}
        <button
          onClick={toggleDarkMode}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? (
            <Sun className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          ) : (
            <Moon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          )}
        </button>
        
        {isGuest ? (
          // Guest users: Show login and signup buttons
          <>
            <button
              onClick={() => setShowLoginPopup(true)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-yellow-400 text-gray-800 dark:text-gray-200 font-medium rounded-lg text-sm transition hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Log in
            </button>
            <button
              onClick={() => setShowSignupPopup(true)}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg text-sm transition"
            >
              Sign up
            </button>
          </>
        ) : authenticated ? (
          // Real authenticated users: Show notifications and sign out
          <>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <Bell className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </>
        ) : (
          // Not authenticated and not guest (edge case)
          <button
            onClick={() => navigate("/signup")}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg text-sm transition"
          >
            Sign up
          </button>
        )}
      </div>

      {/* Popups */}
      <LoginPopup
        isOpen={showLoginPopup}
        onClose={() => {
          setShowLoginPopup(false);
          setShowSignupPopup(false);
        }}
        currentThreadId={threadId || undefined}
        onSwitchToSignup={() => {
          setShowLoginPopup(false);
          setShowSignupPopup(true);
        }}
      />
      <SignupPopup
        isOpen={showSignupPopup}
        onClose={() => {
          setShowLoginPopup(false);
          setShowSignupPopup(false);
        }}
        currentThreadId={threadId || undefined}
        onSwitchToLogin={() => {
          setShowSignupPopup(false);
          setShowLoginPopup(true);
        }}
      />
    </header>
  );
}