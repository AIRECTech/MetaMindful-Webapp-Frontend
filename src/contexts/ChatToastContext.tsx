import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ToastState {
  userMessageCount: number;
  hasThreadCard: boolean;
  hasExercise: boolean;
  hasAction: boolean;
  hasExerciseCompleted: boolean;
  hasActionCompleted: boolean;
}

interface ChatToastContextType extends ToastState {
  setToastData: (data: Partial<ToastState>) => void;
  resetToasts: () => void;
  
  // Modal triggers
  onOpenThreadCard: (() => void) | null;
  onOpenSignupPopup: (() => void) | null;
  setOnOpenThreadCard: (fn: (() => void) | null) => void;
  setOnOpenSignupPopup: (fn: (() => void) | null) => void;
}

const ChatToastContext = createContext<ChatToastContextType | undefined>(undefined);

export function ChatToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({
    userMessageCount: 0,
    hasThreadCard: false,
    hasExercise: false,
    hasAction: false,
    hasExerciseCompleted: false,
    hasActionCompleted: false,
  });

  const [onOpenThreadCard, setOnOpenThreadCard] = useState<(() => void) | null>(null);
  const [onOpenSignupPopup, setOnOpenSignupPopup] = useState<(() => void) | null>(null);

  const setToastData = useCallback((data: Partial<ToastState>) => {
    setState(prev => ({ ...prev, ...data }));
  }, []);

  const resetToasts = useCallback(() => {
    setState({
      userMessageCount: 0,
      hasThreadCard: false,
      hasExercise: false,
      hasAction: false,
      hasExerciseCompleted: false,
      hasActionCompleted: false,
    });
  }, []);

  const value = {
    ...state,
    setToastData,
    resetToasts,
    onOpenThreadCard,
    onOpenSignupPopup,
    setOnOpenThreadCard,
    setOnOpenSignupPopup,
  };

  return (
    <ChatToastContext.Provider value={value}>
      {children}
    </ChatToastContext.Provider>
  );
}

export function useChatToast() {
  const context = useContext(ChatToastContext);
  if (context === undefined) {
    throw new Error('useChatToast must be used within a ChatToastProvider');
  }
  return context;
}
