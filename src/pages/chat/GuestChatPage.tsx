import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowUp, X, ChevronRight, Lock } from "lucide-react";
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
  "I’m overwhelmed by something coming up",
  "I feel stuck and keep avoiding things",
  "I feel anxious in my body and I don’t know why",
  "My mind won’t slow down and I can’t sleep",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  replies?: string[];
  requiresSignup?: boolean;
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
  const [showDisclaimer, setShowDisclaimer] = useState(true); // Always show for guest users
  const hasCreatedThreadRef = useRef(false);
  const hasAutoSentQueryMessageRef = useRef(false); // Track if we've auto-sent the query message
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [suggestionUsed, setSuggestionUsed] = useState(() => {
    return localStorage.getItem("suggestion_used_guest_new") === "true";
  });

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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor(diffMs / 60000);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    return "Just now";
  };

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
    setMessage(suggestion);
    setSuggestionUsed(true);
    localStorage.setItem("suggestion_used_guest_new", "true");

    // Focus textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    if (!threadId) {
      setPendingMessage(suggestion);
      setIsLoading(true);
      createThread.mutate(suggestion);
      return;
    }

    try {
      await api.post("/threads/suggestion-click", {
        suggestion,
        threadId,
      });
    } catch (error) {
      console.error("[GuestChatPage] Error logging suggestion click:", error);
    }

    navigateToChatWithFirstUserMessage(suggestion);
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
      <div className="h-full flex flex-col relative bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* Initial greeting view / Loading view */}
        <div className="flex-1 flex items-center justify-center px-4">
          {(generateToken.isLoading || (isLoading && !messages[0])) ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Setting up your chat...</p>
            </div>
          ) : (
            <div className="text-center max-w-4xl w-full">
              <div className="space-y-2 md:space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold text-gray-800 dark:text-gray-100">
                  Get unstuck in 90 seconds.
                </h2>
                <p className="text-lg md:text-2xl text-gray-500 dark:text-gray-400">
                  Tell me what's happening. I'll suggest one small step you can try now.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input area with suggestions */}
        <div className="pb-4 px-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Suggested prompts */}
            {/* Suggested prompts - Dynamic mapping */}
            <div className="flex flex-col items-center gap-2 md:gap-3 mb-4 md:mb-8 mt-2 w-full">
              {!suggestionUsed && (() => {
                // Try to find the last assistant message with replies first
                const lastAssistantMessageWithReplies = [...messages]
                  .reverse()
                  .find(m => m.role === "assistant" && m.replies && m.replies.length > 0);

                if (lastAssistantMessageWithReplies?.replies) {
                  const lastMessage = messages[messages.length - 1];
                  const requiresSignup = lastMessage?.role === "assistant" && lastMessage?.requiresSignup;

                  if (requiresSignup) return null;

                  // Show assistant replies in a horizontal scrollable container
                  return (
                    <div className="flex overflow-x-auto gap-3 pb-2 w-full no-scrollbar">
                      {lastAssistantMessageWithReplies.replies.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(reply)}
                          disabled={isLoading || requiresSignup}
                          className="px-5 py-3 w-[190px] bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-[12px] leading-normal font-normal transition disabled:opacity-50 disabled:cursor-not-allowed text-left [text-wrap-mode:wrap] flex-shrink-0"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  );
                }

                // Show initial suggestions in the old wrapping layout
                return (
                  <div className="flex flex-wrap gap-2 md:gap-3 justify-center w-full">
                    {currentSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        disabled={isLoading}
                        className="px-3 py-3 md:px-5 md:py-3 w-[calc(50%-4px)] md:w-[190px] bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-[11px] md:text-[12px] leading-normal font-normal transition disabled:opacity-50 disabled:cursor-not-allowed text-left [text-wrap-mode:wrap]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Recent Guest Chat Banner */}
            {lastThread && !id && !threadId && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-yellow-300 dark:border-yellow-500/50 p-4 mb-4 text-left shadow-sm">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">On this Browser</div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                  <div className="text-base font-medium text-gray-800 dark:text-gray-200 truncate">
                    {lastThread.title || "New Thread"}
                  </div>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 ml-3.5 mb-3">
                  Last visited {formatTimeAgo(lastThread.updatedAt || lastThread.createdAt)}
                </div>
                <button
                  onClick={() => navigate(`/guest/${lastThread.threadId || lastThread.id}`)}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-colors mb-2"
                >
                  Pick it up <ChevronRight className="h-4 w-4 ml-1" />
                </button>
                <div className="flex items-center justify-center text-[11px] text-gray-500 dark:text-gray-400 gap-1">
                  <Lock className="h-3 w-3" />
                  Saved on this browser only. No one else can see it
                </div>
              </div>
            )}

            {/* Terms and Privacy Disclaimer - Above input field */}
            {showDisclaimer && (
              <div className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 pr-8 flex items-center">
                <button
                  onClick={() => setShowDisclaimer(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  aria-label="Close disclaimer"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pr-6 text-center w-full">
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
              {/* Inline Thread Card */}
              <InlineThreadCard
                details={requiresSignup ? [] : threadCardDetails}
                isOpen={showThreadCard}
                onToggle={() => setShowThreadCard(!showThreadCard)}
              />

              <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-end gap-3 p-4">
                <textarea
                  ref={textareaRef}
                  className="flex-1 min-w-0 px-6 py-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base border-0 bg-gray-100 dark:bg-gray-700 rounded-xl resize-none min-h-[48px] max-h-[200px] overflow-y-auto"
                  placeholder="Type here ....."
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
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || isLoading}
                  className="bg-yellow-300 hover:bg-yellow-400 p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0 mb-1"
                >
                  <ArrowUp className="h-5 w-5 text-gray-900" strokeWidth={2.5} fill="none" />
                </button>
              </div>
            </div>

            {/* Guest user message */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't lose your chat history. <button
                  onClick={() => { setIsAuthGate(true); setShowLoginPopup(true); }}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Log in
                </button> or <button
                  onClick={() => { setIsAuthGate(true); setShowSignupPopup(true); }}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Sign up
                </button> to save your conversations.
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
