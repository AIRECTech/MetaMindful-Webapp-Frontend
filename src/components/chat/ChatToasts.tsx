import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useChatToast } from "../../contexts/ChatToastContext";
import { useLocation } from "react-router-dom";

const IOS_APP_URL = "https://apps.apple.com/us/app/metamindful/id6569248759";

export function ChatToasts() {
  const { 
    userMessageCount,
    hasThreadCard, 
    hasExercise, 
    hasAction,
    hasExerciseCompleted,
    hasActionCompleted,
    onOpenThreadCard,
  } = useChatToast();
  
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith("/chat") || location.pathname.startsWith("/guest");

  const [activeBadgeIndex, setActiveBadgeIndex] = useState(0);

  // Priority: completions first, then active, then thread card
  const activeBadges: string[] = [];
  if (hasActionCompleted) activeBadges.push('action_completed');
  if (hasExerciseCompleted) activeBadges.push('exercise_completed');
  if (hasThreadCard) activeBadges.push('thread');
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

  // If no dynamic badges, show the default static toast
  if (activeBadges.length === 0) {
    if (userMessageCount === 0) return null;
    
    return (
      <div className="flex justify-center items-center w-full">
        <div className="badge-style transition-all duration-500">
          Collecting your small wins
        </div>
      </div>
    );
  }

  const currentBadge = activeBadges[activeBadgeIndex];

  return (
    <div className="flex justify-center items-center w-full">
      {currentBadge === 'action_completed' && (
        <div className="badge-style-yellow animate-border-gradient text-center transition-all duration-500">
          Nice work completing that action!
        </div>
      )}
      {currentBadge === 'exercise_completed' && (
        <a
          href={IOS_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="badge-style-yellow animate-border-gradient flex items-center gap-2 hover:opacity-90 transition-all duration-500 text-center"
        >
          Nice work! Download the app to find this in your Exercise Library
        </a>
      )}
      {currentBadge === 'thread' && (
        <button
          onClick={() => onOpenThreadCard?.()}
          className="badge-style-yellow animate-border-gradient flex items-center gap-2 hover:opacity-90 transition-all duration-500"
        >
          Your Thread Card is ready to view <ChevronDown className="h-4 w-4" />
        </button>
      )}
      {currentBadge === 'exercise' && (
        <a
          href={IOS_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="badge-style-yellow animate-border-gradient hover:opacity-90 transition-all duration-500 text-center"
        >
          New exercise added! Try it anytime from exercise library
        </a>
      )}
      {currentBadge === 'action' && (
        <div className="badge-style-yellow animate-border-gradient text-center transition-all duration-500">
          You have successfully created a new action
        </div>
      )}
    </div>
  );
}
