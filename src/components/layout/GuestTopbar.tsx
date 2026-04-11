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
    <header className="flex flex-wrap items-center justify-between px-4 py-3 min-h-[64px] bg-transparent">
      <button
        onClick={handleLogoClick}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-auto md:w-[200px] order-1"
      >
        <img
          src="/guest_logo.png"
          alt="Guest Mode"
          className="h-[5rem] w-auto"
        />
      </button>

      {/* Center content - Toasts */}
      <div className="w-full md:w-auto md:flex-1 flex justify-center items-center px-4 order-3 md:order-2 mt-4 md:mt-0">
        {userMessageCount === 1 && (
          <div className="badge-style">
            Collecting your small wins
          </div>
        )}
        {userMessageCount === 2 && (
          <div className="badge-style-yellow animate-border-gradient">
            You have successfully created a new action
          </div>
        )}
        {userMessageCount === 3 && (
          <div className="badge-style-yellow animate-border-gradient">
            Nice work completing that action!
          </div>
        )}
        {userMessageCount === 4 && (
          <div className="badge-style-yellow animate-border-gradient text-center">
            Reminder saved. One less thing for your mind to carry.
          </div>
        )}
        {userMessageCount >= 5 && (
          <button
            onClick={onOpenThreadCard}
            className="badge-style-yellow animate-border-gradient flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            Your Thread Card is ready to view <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex justify-end items-center gap-3 w-auto md:w-[200px] order-2 md:order-3 ml-auto md:ml-0">
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

