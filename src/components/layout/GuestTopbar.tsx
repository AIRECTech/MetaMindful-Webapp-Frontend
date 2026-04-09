import { ChevronDown } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { LoginPopup } from "../LoginPopup";
import { SignupPopup } from "../SignupPopup";

interface GuestTopbarProps {
  userMessageCount?: number;
  onOpenThreadCard?: () => void;
}


export function GuestTopbar({ userMessageCount = 0, onOpenThreadCard }: GuestTopbarProps) {
  const navigate = useNavigate();
  const params = useParams();
  // Get threadId from URL params if on a chat page
  const threadId = params.id;

  // Force light mode for guest users
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const handleLogoClick = () => {
    navigate("/");
  };

  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showSignupPopup, setShowSignupPopup] = useState(false);

  return (
    <header className="flex items-center justify-between px-4 py-3 min-h-[64px] mt-[1rem] bg-transparent">
      <button
        onClick={handleLogoClick}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-[200px]"
      >
        <img
          src="/guest_logo.png"
          alt="Guest Mode"
          className="h-[5rem] w-auto"
        />
      </button>

      {/* Center content - Toasts */}
      <div className="flex-1 flex justify-center items-center px-4">
        {userMessageCount === 1 && (
          <div className="px-6 py-2 bg-white dark:bg-gray-800 rounded-[10px] shadow-sm text-sm font-medium text-gray-600 dark:text-gray-300 transition-all">
            Collecting your small wins
          </div>
        )}
        {userMessageCount === 2 && (
          <div className="px-6 py-2 bg-white dark:bg-gray-800 border-[1.5px] border-yellow-400 rounded-[10px] shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 transition-all">
            You have successfully created a new action
          </div>
        )}
        {userMessageCount === 3 && (
          <div className="px-6 py-2 bg-white dark:bg-gray-800 border-[1.5px] border-yellow-400 rounded-[10px] shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 transition-all">
            Nice work completing that action!
          </div>
        )}
        {userMessageCount === 4 && (
          <div className="px-6 py-2 bg-white dark:bg-gray-800 border-[1.5px] border-yellow-400 rounded-[10px] shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 transition-all">
            Reminder saved. One less thing for your mind to carry.
          </div>
        )}
        {userMessageCount >= 5 && (
          <button
            onClick={onOpenThreadCard}
            className="px-6 py-2 flex items-center gap-2 bg-white dark:bg-gray-800 border-[1.5px] border-yellow-400 hover:bg-yellow-50 dark:hover:bg-gray-700 rounded-[10px] shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 transition-all"
          >
            Your Thread Card is ready to view
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 w-[200px]">

        {/* Guest users: Show signup button only */}
        <button
          onClick={() => setShowSignupPopup(true)}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg text-sm transition"
        >
          Sign up
        </button>
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

