import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { X, Send, ArrowRight } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { logAnalyticsEvent } from "../../lib/firebase";
import { useTimeOnScreen } from "../../hooks/useTimeOnScreen";
import { ensureToken, isGuestUser } from "../../lib/auth";
import { ChatPage } from "./ChatPage";
import { LoginPopup } from "../../components/LoginPopup";
import { SignupPopup } from "../../components/SignupPopup";
import { InlineThreadCard } from "../../components/chat/InlineThreadCard";
import { useChatToast } from "../../contexts/ChatToastContext";
import { setMmHasChatCookie } from "../../lib/cookies";

const suggestions = [
  "😔 I'm feeling stressed",
  "🧠 My mind feels overwhelmed",
  "😴 I'm having trouble sleeping",
  "🌿 I just want to feel calmer",
  "✨ Something else",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  replies?: string[];
  requiresSignup?: boolean;
  showAppCard?: boolean;
}

/**
 * GuestChatPage - Handles guest user chat flow
 * - On /guest: Generates token on load, creates thread, shows greeting page
 * - On /guest/:id: Shows ChatPage with guest-specific handling
 */
export function GuestChatPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryMessage = searchParams.get("q"); // Get message from query parameter
  const [message, setMessage] = useState("");
  const [messages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useTimeOnScreen("guest-chat", "GuestChatPage");
  const [threadId] = useState<string | null>(null);
  const [threadTitle] = useState<string>("New Chat");
  const [threadDesc] = useState<string | null>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const [isAuthGate, setIsAuthGate] = useState(false);
  const [showThreadCard, setShowThreadCard] = useState(false);
  const [hasExercise, setHasExercise] = useState(() => {
    const tid = id || threadId;
    if (!tid) return false;
    return localStorage.getItem(`toast_has_exercise_${tid}`) === 'true';
  });
  const [hasExerciseCompleted, setHasExerciseCompleted] = useState(() => {
    const tid = id || threadId;
    if (!tid) return false;
    return localStorage.getItem(`toast_exercise_completed_${tid}`) === 'true';
  });
  const [hasAction, setHasAction] = useState(() => {
    const tid = id || threadId;
    if (!tid) return false;
    return localStorage.getItem(`toast_has_action_${tid}`) === 'true';
  });
  const [hasActionCompleted, setHasActionCompleted] = useState(() => {
    const tid = id || threadId;
    if (!tid) return false;
    return localStorage.getItem(`toast_action_completed_${tid}`) === 'true';
  });
  const [threadCardDetails, setThreadCardDetails] = useState<{ label: string; value: string }[]>(() => {
    const tid = id || threadId;
    if (!tid) return [];
    const saved = localStorage.getItem(`toast_thread_card_${tid}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    return !document.cookie.includes("mm_has_chat=1");
  });
  const hasCreatedThreadRef = useRef(false);
  const hasAutoSentQueryMessageRef = useRef(false); // Track if we've auto-sent the query message
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [suggestionUsed, setSuggestionUsed] = useState(false);

  // Default suggestions provided as constant
  const [currentSuggestions] = useState<string[]>(suggestions);

  const {
    setToastData,
    resetToasts,
    setOnOpenThreadCard,
    setOnOpenSignupPopup
  } = useChatToast();

  const userMessageCount = pendingMessage ? 1 : messages.filter((m) => m.role === "user").length;
  const lastMessage = messages[messages.length - 1];
  const requiresSignup = lastMessage?.role === "assistant" && lastMessage?.requiresSignup;

  // Sync with ChatToastContext
  useEffect(() => {
    if (id) return;
    setToastData({
      hasExercise,
      hasExerciseCompleted,
      hasAction,
      hasActionCompleted,
      hasThreadCard: threadCardDetails.length > 0,
      userMessageCount
    });
  }, [id, hasExercise, hasExerciseCompleted, hasAction, hasActionCompleted, threadCardDetails, userMessageCount, setToastData]);

  // Set modal trigger callbacks
  useEffect(() => {
    if (id) return;
    setOnOpenThreadCard(() => setShowThreadCard(true));
    setOnOpenSignupPopup(() => setShowSignupPopup(true));

    return () => {
      setOnOpenThreadCard(null);
      setOnOpenSignupPopup(null);
    };
  }, [id, setOnOpenThreadCard, setOnOpenSignupPopup]);

  // Reset toasts on unmount
  useEffect(() => {
    return () => {
      if (!id) resetToasts();
    };
  }, [id, resetToasts]);

  // Generate guest token and create thread on page load
  const generateToken = useQuery({
    queryKey: ["guest-token"],
    queryFn: async () => {
      await ensureToken();
      // Since ensureToken doesn't return user, we just log it happened
      logAnalyticsEvent("guest_login_completed", {
        is_guest: true
      });
      console.log("[GuestChatPage] Guest token ensured");
      return true;
    },
    enabled: !id && !hasCreatedThreadRef.current,
    retry: false,
  });

  const isGuest = isGuestUser();
  const { data: recentThreads } = useQuery({
    queryKey: ["guest-threads"],
    queryFn: async () => {
      const res = await api.get("/threads?type=guest");
      return (res.data.data?.data || res.data.data || []) as any[];
    },
    enabled: !!generateToken.isSuccess && !id && isGuest,
  });

  const lastThread = recentThreads && recentThreads.length > 0 ? recentThreads[0] : null;

  // formatTimeAgo removed

  // Create thread after token is generated
  const createThread = useMutation({
    mutationFn: async (messageToSend?: string) => {
      const msg = messageToSend || pendingMessage;
      const res = await api.post("/threads/chat", { message: msg }, {
        timeout: 300000 // 5 minute timeout for AI response
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data?.threadId) {
        setMmHasChatCookie();
        // Handle Conditional Toasts (Detect created vs completed) using explicit show_reminder_card flag
        if (data.ui_element?.show_reminder_card) {
          setHasAction(true);
          setHasActionCompleted(false);
          localStorage.setItem(`toast_has_action_${data.threadId}`, 'true');
          localStorage.removeItem(`toast_action_completed_${data.threadId}`);
        } else {
          setHasAction(false);
          localStorage.removeItem(`toast_has_action_${data.threadId}`);
        }
        const isActionCompleted = !!data.ui_element?.action?.completed_at;
        if (data.ui_element?.action && isActionCompleted) {
          setHasAction(false);
          setHasActionCompleted(true);
          localStorage.removeItem(`toast_has_action_${data.threadId}`);
          localStorage.setItem(`toast_action_completed_${data.threadId}`, 'true');
        } else {
          setHasActionCompleted(false);
          localStorage.removeItem(`toast_action_completed_${data.threadId}`);
        }

        // Handle Conditional Toasts using explicit show_exercise_card flag
        if (data.ui_element?.show_exercise_card) {
          setHasExercise(true);
          setHasExerciseCompleted(false);
          localStorage.setItem(`toast_has_exercise_${data.threadId}`, 'true');
          localStorage.removeItem(`toast_exercise_completed_${data.threadId}`);
        } else {
          setHasExercise(false);
          localStorage.removeItem(`toast_has_exercise_${data.threadId}`);
        }
        if (data.ui_element?.exercise_completed === true) {
          setHasExercise(false);
          setHasExerciseCompleted(true);
          localStorage.removeItem(`toast_has_exercise_${data.threadId}`);
          localStorage.setItem(`toast_exercise_completed_${data.threadId}`, 'true');
        } else if (data.ui_element?.exercise_completed === false) {
          setHasExerciseCompleted(false);
          localStorage.removeItem(`toast_exercise_completed_${data.threadId}`);
        }

        // Handle Thread Card Data using explicit show_thread_card flag
        const threadCard = data.thread_card?.thread_card;
        if (threadCard && data.ui_element?.show_thread_card) {
          const details = [
            { label: "Thread name", value: data.thread_card.title_name || threadTitle || "" },
            { label: "What’s the sign?", value: threadCard.trigger || threadCard.primary_trigger || "" },
            { label: "What to do differently?", value: threadCard.move_that_helped || threadCard.primary_move || "" },
          ].filter(item => item.value !== "");

          if (details.length > 0) {
            setThreadCardDetails(details);
            localStorage.setItem(`toast_thread_card_${data.threadId}`, JSON.stringify(details));
          }
        }

        const assistantMsgId = data.message?.id || `local-assistant-${Date.now()}`;
        if (data.message?.suggested_replies && data.message.suggested_replies.length > 0) {
          localStorage.setItem(
            `suggested_replies_${data.threadId}_${assistantMsgId}`,
            JSON.stringify(data.message.suggested_replies)
          );
        }

        // Construct bootstrapped messages including user message and assistant reply
        const bootstrappedMessages = [
          {
            id: `local-user-${Date.now()}`,
            role: "user" as const,
            content: pendingMessage || "",
            createdAt: new Date().toISOString(),
          },
          {
            id: assistantMsgId,
            role: "assistant" as const,
            content: data.message?.assistantMessage || "",
            replies: data.message?.suggested_replies || [],
            requiresSignup: data.message?.auth_gate?.should_show || false,
            showAppCard: data.ui_element?.show_app_card || false,
            createdAt: new Date().toISOString(),
          }
        ];

        navigateToChatWithFirstUserMessage(null, data.threadId, data.thread_card?.title_name, data.thread_card?.stuck_situation || undefined, bootstrappedMessages);
        localStorage.removeItem("suggestion_used_guest_new");
      } else {
        toast.error("Failed to create thread");
        localStorage.removeItem("suggestion_used_guest_new");
      }
      setIsLoading(false);
      setPendingMessage(null);
    },
    onError: (error: any) => {
      localStorage.removeItem("suggestion_used_guest_new");
      const statusCode = error.response?.status || error.response?.data?.code;
      let errorMessage = extractErrorMessage(error, "Failed to create thread");
      if (statusCode === 500) {
        errorMessage = "Service currently not working. Please check again after sometime.";
      }
      toast.error(errorMessage);
      setIsLoading(false);
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`; // Max height of 200px
    }
  }, [message]);

  // Handle query parameter message: auto-fill and auto-send after thread is created
  useEffect(() => {
    if (queryMessage && !threadId && !hasAutoSentQueryMessageRef.current && !isLoading && !id) {
      if (generateToken.isSuccess) {
        hasAutoSentQueryMessageRef.current = true;
        const trimmedQueryMessage = queryMessage.trim();
        if (trimmedQueryMessage) {
          searchParams.delete("q");
          setSearchParams(searchParams, { replace: true });
          setPendingMessage(trimmedQueryMessage);
          setIsLoading(true);
          createThread.mutate(trimmedQueryMessage);
        }
      }
    }
  }, [queryMessage, threadId, isLoading, generateToken.isSuccess, id, searchParams, setSearchParams]);

  const navigateToChatWithFirstUserMessage = (userMessage: string | null, tid?: string, title?: string, desc?: string, initialMessages: any[] = []) => {
    const finalThreadId = tid || threadId;
    if (!finalThreadId) return;

    const statePayload: any = {
      bootstrapThread: {
        id: "0",
        threadId: finalThreadId,
        title: title || threadTitle,
        desc: desc || threadDesc || undefined,
        messages: initialMessages.length > 0 ? initialMessages : messages.map((m, i) => ({
          id: `initial-${i}`,
          role: m.role,
          content: m.content,
          requiresSignup: m.requiresSignup,
          createdAt: new Date().toISOString(),
        })),
      }
    };

    if (userMessage) {
      statePayload.autoSendText = userMessage;
    }

    navigate(`/guest/${finalThreadId}`, {
      state: statePayload,
      replace: true,
    });
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    const userMessage = trimmedMessage;
    setMessage("");
    setSuggestionUsed(true);
    localStorage.setItem("suggestion_used_guest_new", "true");

    if (!threadId) {
      setPendingMessage(userMessage);
      setIsLoading(true);
      createThread.mutate(userMessage);
    } else {
      navigateToChatWithFirstUserMessage(userMessage);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;

    if (suggestion.includes("Something else")) {
      setSuggestionUsed(true);
      localStorage.setItem("suggestion_used_guest_new", "true");
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      return;
    }

    // Clean suggestion text to remove leading emoji
    const cleanSuggestion = suggestion.replace(/^[\s\S]*?\s/, '');
    setMessage(cleanSuggestion);
    setSuggestionUsed(true);
    localStorage.setItem("suggestion_used_guest_new", "true");

    // Focus textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    if (!threadId) {
      setPendingMessage(cleanSuggestion);
      setIsLoading(true);
      createThread.mutate(cleanSuggestion);
      return;
    }

    try {
      await api.post("/threads/suggestion-click", {
        suggestion: cleanSuggestion,
        threadId,
      });
    } catch (error) {
      console.error("[GuestChatPage] Error logging suggestion click:", error);
    }

    navigateToChatWithFirstUserMessage(cleanSuggestion);
  };

  // If we have a thread ID, show the ChatPage (after all hooks)
  if (id) {
    return <ChatPage />;
  }

  // Loading state moved inside the main return to keep Topbar visible

  // If token generation failed
  if (generateToken.isError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {extractErrorMessage(generateToken.error as any, "Failed to initialize chat")}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }


  return (
    <>
      <div className="h-full flex flex-col relative bg-white overflow-hidden">
        {/* Main scrollable content view */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center justify-start md:justify-center min-h-0">
          {(generateToken.isLoading || (isLoading && !messages[0])) ? (
            <div className="text-center my-auto">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
              <p className="text-gray-500">Setting up your chat...</p>
            </div>
          ) : (
            <div className="text-left max-w-lg md:max-w-2xl w-full mx-auto my-auto flex flex-col items-start py-2">
              {/* Profile logo on top */}
              <div className="mb-4">
                <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 overflow-hidden shadow-sm border border-blue-50/50">
                  <img src="/logo.png" alt="MetaMindful Logo" className="w-9 h-9 object-contain" />
                </div>
              </div>

              {/* Text underneath the logo */}
              <div className="space-y-1 mb-6">
                <h2 className="text-3xl font-bold text-gray-850 leading-tight">
                  Welcome back!
                </h2>
                <p className="text-sm text-gray-500 font-semibold">
                  How would you like to start?
                </p>
              </div>

              {/* Suggested prompts - Vertical Stack left-aligned pill layout, no indentation */}
              {!suggestionUsed && (() => {
                const lastAssistantMessageWithReplies = [...messages]
                  .reverse()
                  .find(m => m.role === "assistant" && m.replies && m.replies.length > 0);

                if (lastAssistantMessageWithReplies?.replies) {
                  const lastMessage = messages[messages.length - 1];
                  const requiresSignup = lastMessage?.role === "assistant" && lastMessage?.requiresSignup;

                  if (requiresSignup) return null;

                  return (
                    <div className="flex flex-col gap-2 w-full">
                      {lastAssistantMessageWithReplies.replies.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(reply)}
                          disabled={isLoading || requiresSignup}
                          className="px-5 py-2.5 bg-blue-50/70 hover:bg-blue-100/90 text-gray-700 rounded-2xl border-0 text-sm leading-normal font-semibold transition text-left"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-start gap-2.5 w-full">
                    {currentSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        disabled={isLoading}
                        className="px-5 py-2.5 bg-blue-50/70 hover:bg-blue-100/90 text-gray-700 rounded-2xl border-0 text-sm leading-normal font-semibold transition text-left flex items-center gap-2"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Input area with recent thread card floating above it */}
        <div className="pb-10 sm:pb-4 px-4 flex-shrink-0 z-20 relative bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent dark:from-gray-900 dark:via-gray-900/90 pt-2">
          <div className="max-w-lg md:max-w-2xl mx-auto flex flex-col gap-3">
            {lastThread && !id && !threadId && (
              <div className="bg-gray-50/50 rounded-2xl border border-gray-150 p-5 text-left w-full mt-6 shadow-sm">
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  Continue where you left off
                </h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Your previous conversation is saved on this browser only. No one else can see it
                </p>
                <button
                  onClick={() => navigate(`/guest/${lastThread.threadId || lastThread.id}`)}
                  className="w-full bg-[#FCD34D] hover:bg-[#FBBF24] text-gray-900 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-1 transition shadow-sm text-sm"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Terms and Privacy Disclaimer - Above input field */}
            {!isGuest && showDisclaimer && (
              <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 pr-8 flex items-center shadow-sm">
                <button
                  onClick={() => setShowDisclaimer(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  aria-label="Close disclaimer"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pr-4 text-center w-full">
                  By messaging MetaMindful, you confirm you are 16+ and agree to our{" "}
                  <Link
                    to="/terms"
                    target="_blank"
                    className="font-semibold underline hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    terms
                  </Link>{" "}
                  and have read our{" "}
                  <Link
                    to="/privacy-policy"
                    target="_blank"
                    className="font-semibold underline hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    privacy policy
                  </Link>
                </p>
              </div>
            )}

            <div className="relative">
              <div className="w-full flex justify-start mb-5 pl-2">
                <InlineThreadCard
                  details={requiresSignup ? [] : threadCardDetails}
                  isOpen={showThreadCard}
                  onToggle={() => setShowThreadCard(!showThreadCard)}
                />
              </div>

              <div className="relative z-10 bg-gray-100 rounded-full border border-gray-200/50 flex items-center gap-2 p-1.5 pl-4 pr-1.5 shadow-sm">
                <textarea
                  ref={textareaRef}
                  className="flex-1 min-w-0 px-2 sm:px-4 py-2 m-0 text-gray-800 placeholder-gray-500 !outline-none !ring-0 focus:outline-none focus:ring-0 focus:border-transparent border-0 bg-transparent resize-none overflow-y-auto max-h-[120px] leading-normal"
                  placeholder="Write something"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isLoading}
                  rows={1}
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-gray-650 transition"
                    title="Voice input (Not active)"
                  >
                    <Mic className="h-5 w-5" />
                  </button> */}
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || isLoading}
                    className="bg-gray-200 hover:bg-gray-300 p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0 flex items-center justify-center h-9 w-9"
                  >
                    <Send className="h-4.5 w-4.5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Guest user message */}
            <div className="text-center mt-1 sm:mt-2">
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                Your data stays 100% private
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Popups */}
      <LoginPopup
        isOpen={showLoginPopup}
        onClose={() => {
          setShowLoginPopup(false);
          setShowSignupPopup(false);
          setIsAuthGate(false);
        }}
        currentThreadId={id || threadId || undefined}
        autoSend={isAuthGate}
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
          setIsAuthGate(false);
        }}
        currentThreadId={id || threadId || undefined}
        autoSend={isAuthGate}
        onSwitchToLogin={() => {
          setShowSignupPopup(false);
          setShowLoginPopup(true);
        }}
      />
    </>
  );
}
