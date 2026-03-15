import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowUp } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { logAnalyticsEvent } from "../../lib/firebase";
import { useTimeOnScreen } from "../../hooks/useTimeOnScreen";
import { X } from "lucide-react";
import { ensureToken } from "../../lib/auth";
import { ChatPage } from "./ChatPage";
import { LoginPopup } from "../../components/LoginPopup";
import { SignupPopup } from "../../components/SignupPopup";
import { GuestTopbar } from "../../components/layout/GuestTopbar";
import { Toaster } from "react-hot-toast";

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
}

interface ThreadResponseMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useTimeOnScreen("guest-chat", "GuestChatPage");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string>("New Chat");
  const [threadDesc, setThreadDesc] = useState<string | null>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true); // Always show for guest users
  const hasCreatedThreadRef = useRef(false);
  const hasAutoSentQueryMessageRef = useRef(false); // Track if we've auto-sent the query message
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [suggestionUsed, setSuggestionUsed] = useState(false);

  // Default suggestions provided as constant
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>(suggestions);

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

  // Create thread after token is generated
  const createThread = useMutation({
    mutationFn: async () => {
      const res = await api.post("/threads", { title: "New Chat" });
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data?.threadId) {
        if (pendingMessage) {
          navigateToChatWithFirstUserMessage(pendingMessage, data.threadId, data.title, data.desc);
        } else {
          setThreadId(data.threadId);
          setThreadTitle(data.title || "New Chat");
          setThreadDesc(data.desc ?? null);
          const firstAssistant = data.messages?.find((m: ThreadResponseMessage) => m.role === "assistant")?.content;
          const replies = data.replies || [];

          if (replies.length > 0) {
            setCurrentSuggestions(replies);
          }

          if (firstAssistant) {
            setMessages([{ role: "assistant", content: firstAssistant, isError: false, replies }]);
          } else {
            setMessages([{ role: "assistant", content: "Hi, I'm MetaMindful. I'm here to listen and support you. How are you feeling today?", isError: false, replies }]);
          }
        }
      } else {
        toast.error("Failed to create thread");
      }
      setIsLoading(false);
      setPendingMessage(null);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create thread"));
      setIsLoading(false);
    },
  });

  // Create thread when token is ready - REMOVED: Now created on first message
  // useEffect(() => {
  //   if (generateToken.isSuccess && !threadId && !hasCreatedThreadRef.current && !createThread.isPending && !id) {
  //     hasCreatedThreadRef.current = true;
  //     setIsLoading(true);
  //     createThread.mutate();
  //   }
  // }, [generateToken.isSuccess, threadId, createThread, id]);

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
          createThread.mutate();
        }
      }
    }
  }, [queryMessage, threadId, isLoading, generateToken.isSuccess, id, searchParams, setSearchParams]);

  const navigateToChatWithFirstUserMessage = (userMessage: string, tid?: string, title?: string, desc?: string) => {
    const finalThreadId = tid || threadId;
    if (!finalThreadId) return;

    navigate(`/guest/${finalThreadId}`, {
      state: {
        bootstrapThread: {
          id: "0",
          threadId: finalThreadId,
          title: title || threadTitle,
          desc: desc || threadDesc || undefined,
          messages: messages.map((m, i) => ({
            id: `initial-${i}`,
            role: m.role,
            content: m.content,
            createdAt: new Date().toISOString(),
          })),
        },
        autoSendText: userMessage,
      },
      replace: true,
    });
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    const userMessage = trimmedMessage;
    setMessage("");
    setSuggestionUsed(true);

    if (!threadId) {
      setPendingMessage(userMessage);
      setIsLoading(true);
      createThread.mutate();
    } else {
      navigateToChatWithFirstUserMessage(userMessage);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;
    setMessage(suggestion);
    setSuggestionUsed(true);

    // Focus textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    if (!threadId) {
      setPendingMessage(suggestion);
      setIsLoading(true);
      createThread.mutate();
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
      <div className="h-screen bg-background text-foreground overflow-hidden">
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <div className="flex h-full flex-col">
          <GuestTopbar />
          <div className="flex-1 flex flex-col relative bg-gray-50 dark:bg-gray-900 overflow-hidden">
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
                  <div className="space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100">
                      Get unstuck in 90 seconds.
                    </h2>
                    <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400">
                      Tell me what's happening. I'll suggest one small step you can try now.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Input area with suggestions */}
            <div className="pb-4 px-4">
              <div className="max-w-4xl mx-auto space-y-3">
                {/* Suggested prompts */}
                {/* Suggested prompts - Dynamic mapping */}
                <div className="flex flex-col items-center gap-3 mt-[10px] w-full">
                  {!suggestionUsed && (() => {
                    // Try to find the last assistant message with replies first
                    const lastAssistantMessageWithReplies = [...messages]
                      .reverse()
                      .find(m => m.role === "assistant" && m.replies && m.replies.length > 0);

                    if (lastAssistantMessageWithReplies?.replies) {
                      // Show assistant replies in a horizontal scrollable container
                      return (
                        <div className="flex overflow-x-auto gap-3 pb-2 w-full no-scrollbar">
                          {lastAssistantMessageWithReplies.replies.map((reply, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(reply)}
                              disabled={isLoading}
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
                      <div className="flex flex-wrap gap-3 justify-center w-full">
                        {currentSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            disabled={isLoading}
                            className="px-5 py-3 w-[190px] bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-[12px] leading-normal font-normal transition disabled:opacity-50 disabled:cursor-not-allowed text-left [text-wrap-mode:wrap]"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>

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
                      By messaging MetaMindful, an AI mental wellness chatbot, you agree to our{" "}
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

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-end gap-3 p-4">
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

                {/* Guest user message */}
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Don't lose your chat history. <button
                      onClick={() => setShowLoginPopup(true)}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Log in
                    </button> or <button
                      onClick={() => setShowSignupPopup(true)}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Sign up
                    </button> to save your conversations.
                  </p>
                </div>
              </div>
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
        }}
        currentThreadId={id || threadId || undefined}
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
        currentThreadId={id || threadId || undefined}
        onSwitchToLogin={() => {
          setShowSignupPopup(false);
          setShowLoginPopup(true);
        }}
      />
    </>
  );
}
