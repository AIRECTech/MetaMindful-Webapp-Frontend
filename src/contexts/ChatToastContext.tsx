import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

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

  // Use refs to store callbacks to avoid the React useState functional-updater pitfall
  // (passing a function to useState setter calls it as an updater, not stores it)
  const onOpenThreadCardRef = useRef<(() => void) | null>(null);
  const onOpenSignupPopupRef = useRef<(() => void) | null>(null);

  // Expose reactive versions so consumers can re-render when they change
  const [, forceUpdate] = useState(0);

  const setOnOpenThreadCard = useCallback((fn: (() => void) | null) => {
    onOpenThreadCardRef.current = fn;
    forceUpdate(n => n + 1);
  }, []);

  const setOnOpenSignupPopup = useCallback((fn: (() => void) | null) => {
    onOpenSignupPopupRef.current = fn;
    forceUpdate(n => n + 1);
  }, []);

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
    onOpenThreadCard: onOpenThreadCardRef.current,
    onOpenSignupPopup: onOpenSignupPopupRef.current,
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
