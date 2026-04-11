import { ChevronDown } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { LoginPopup } from "../LoginPopup";
import { SignupPopup } from "../SignupPopup";

interface GuestTopbarProps {
  userMessageCount?: number;
  hasThreadCard?: boolean;
  hasExercise?: boolean;
  hasAction?: boolean;
  onOpenThreadCard?: () => void;
}


export function GuestTopbar({ 
  userMessageCount = 0, 
  hasThreadCard = false, 
  hasExercise = false,
  hasAction = false,
  onOpenThreadCard 
}: GuestTopbarProps) {
  const navigate = useNavigate();
  const params = useParams();
  const threadId = params.id;

  const [activeBadgeIndex, setActiveBadgeIndex] = useState(0);

  const activeBadges = [];
  if (hasThreadCard || userMessageCount >= 5) activeBadges.push('thread');
  if (hasExercise) activeBadges.push('exercise');
  if (hasAction) activeBadges.push('action');

  useEffect(() => {
    if (activeBadges.length > 1) {
      const interval = setInterval(() => {
        setActiveBadgeIndex((prev) => (prev + 1) % activeBadges.length);
      }, 6000);
      return () => clearInterval(interval);
    } else {
      setActiveBadgeIndex(0);
    }
  }, [activeBadges.length]);

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
          className="h-[3rem] md:h-[5rem] w-auto"
        />
      </button>

      {/* Center content - Toasts */}
      <div className="w-full md:w-auto md:flex-1 flex justify-center items-center px-4 order-3 md:order-2 mt-4 md:mt-0 min-h-[44px]">
        {activeBadges.length > 0 ? (
          <>
            {activeBadges[activeBadgeIndex] === 'thread' && (
              <button
                onClick={onOpenThreadCard}
                className="badge-style-yellow animate-border-gradient flex items-center gap-2 hover:opacity-90 transition-all duration-500"
              >
                Your Thread Card is ready to view <ChevronDown className="h-4 w-4" />
              </button>
            )}
            {activeBadges[activeBadgeIndex] === 'exercise' && (
              <button
                onClick={() => setShowSignupPopup(true)}
                className="badge-style-yellow animate-border-gradient hover:opacity-90 transition-all duration-500 text-center"
              >
                Nice work! <span className="font-bold underline">Sign up</span> to store this exercise in Exercise library
              </button>
            )}
            {activeBadges[activeBadgeIndex] === 'action' && (
              <div className="badge-style-yellow animate-border-gradient text-center transition-all duration-500">
                You have successfully created a new action
              </div>
            )}
          </>
        ) : (
          <>
            {userMessageCount === 1 && (
              <div className="badge-style transition-all duration-500">
                Collecting your small wins
              </div>
            )}
            {userMessageCount === 2 && (
              <div className="badge-style-yellow animate-border-gradient transition-all duration-500">
                You have successfully created a new action
              </div>
            )}
            {userMessageCount === 3 && (
              <div className="badge-style-yellow animate-border-gradient transition-all duration-500">
                Nice work completing that action!
              </div>
            )}
            {userMessageCount === 4 && (
              <div className="badge-style-yellow animate-border-gradient text-center transition-all duration-500">
                Reminder saved. One less thing for your mind to carry.
              </div>
            )}
          </>
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

