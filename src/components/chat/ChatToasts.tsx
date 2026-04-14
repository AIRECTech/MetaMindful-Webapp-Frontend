import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useChatToast } from "../../contexts/ChatToastContext";
import { useLocation } from "react-router-dom";

export function ChatToasts() {
  const { 
    userMessageCount, 
    hasThreadCard, 
    hasExercise, 
    hasAction, 
    onOpenThreadCard,
    onOpenSignupPopup
  } = useChatToast();
  
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith("/chat") || location.pathname.startsWith("/guest");

  const [activeBadgeIndex, setActiveBadgeIndex] = useState(0);

  const activeBadges: string[] = [];
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

  // Only show on chat routes
  if (!isChatRoute) return null;

  if (activeBadges.length === 0 && userMessageCount === 0) return null;

  return (
    <div className="w-full md:w-auto md:flex-1 flex justify-center items-center px-4 min-h-[44px]">
      {activeBadges.length > 0 ? (
        <>
          {activeBadges[activeBadgeIndex] === 'thread' && (
            <button
              onClick={() => onOpenThreadCard?.()}
              className="badge-style-yellow animate-border-gradient flex items-center gap-2 hover:opacity-90 transition-all duration-500"
            >
              Your Thread Card is ready to view <ChevronDown className="h-4 w-4" />
            </button>
          )}
          {activeBadges[activeBadgeIndex] === 'exercise' && (
            <button
              onClick={() => onOpenSignupPopup?.()}
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
  );
}
