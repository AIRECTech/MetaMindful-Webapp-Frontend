import { ChevronDown } from "lucide-react";

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
  const isChatRoute = location.pathname.includes("/chat") || location.pathname.includes("/guest");

  // Only show on chat routes
  if (!isChatRoute) return null;

  // Hiding toasts for now as requested
  return null;

  if (hasThreadCard) {
    return (
      <div className="flex justify-center items-center w-full">
        <button
          onClick={() => onOpenThreadCard?.()}
          className="badge-style-yellow animate-border-gradient flex items-center gap-2 hover:opacity-90 transition-all duration-500"
        >
          Your Thread Card is ready to view <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (hasActionCompleted) {
    return (
      <div className="flex justify-center items-center w-full">
        <div className="badge-style-yellow animate-border-gradient text-center transition-all duration-500">
          Nice work completing that action!
        </div>
      </div>
    );
  }

  if (hasExerciseCompleted) {
    return (
      <div className="flex justify-center items-center w-full">
        <a
          href={IOS_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="badge-style-yellow animate-border-gradient flex items-center gap-2 hover:opacity-90 transition-all duration-500 text-center"
        >
          Nice work! Download the app to find this in your Exercise Library
        </a>
      </div>
    );
  }

  if (hasAction) {
    return (
      <div className="flex justify-center items-center w-full">
        <div className="badge-style-yellow animate-border-gradient text-center transition-all duration-500">
          You have successfully created a new action
        </div>
      </div>
    );
  }

  if (hasExercise) {
    return (
      <div className="flex justify-center items-center w-full">
        <a
          href={IOS_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="badge-style-yellow animate-border-gradient hover:opacity-90 transition-all duration-500 text-center"
        >
          New exercise added! Try it anytime from exercise library
        </a>
      </div>
    );
  }

  if (userMessageCount > 0) {
    return (
      <div className="flex justify-center items-center w-full">
        <div className="badge-style transition-all duration-500">
          Collecting your small wins
        </div>
      </div>
    );
  }

  return null;
}
