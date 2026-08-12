import { useState, useEffect, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { ArrowUp, ChevronRight } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { logAnalyticsEvent } from "../../lib/firebase";
import { useTimeOnScreen } from "../../hooks/useTimeOnScreen";
import { ensureToken, isGuestUser } from "../../lib/auth";
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
  originalUserMessage?: string; // Store the original user message for retry
}



export function NewChatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [suggestionUsed, setSuggestionUsed] = useState(() => {
    return localStorage.getItem("suggestion_used_user_new") === "true";
  });

  useTimeOnScreen("new-chat", "NewChatPage");

  const isGuest = isGuestUser();
  
  const { data: recentThreads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const res = await api.get("/threads");
      return (res.data.data?.data || res.data.data || []) as any[];
    },
    enabled: !isGuest,
  });

  const latestThreadId = recentThreads && recentThreads.length > 0 ? recentThreads[0].id : null;

  const { data: latestThreadDetail } = useQuery({
    queryKey: ["thread", latestThreadId],
    queryFn: async () => {
      const res = await api.get(`/threads/${latestThreadId}`);
      return res.data.data || null;
    },
    enabled: !!latestThreadId && !isGuest,
  });

  const threadCard = latestThreadDetail?.thread_card;
  const theSign = threadCard?.thread_card?.trigger || threadCard?.thread_card?.primary_trigger || null;
  const toDo = threadCard?.thread_card?.move_that_helped || threadCard?.thread_card?.primary_move || null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = messageInputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`; // Max height of 200px
    }
  }, [message]);

  // Create a thread on page load - REMOVED: Now created on first message
  // useEffect(() => {
  //   if (hasCreatedThreadRef.current) return;
  //   hasCreatedThreadRef.current = true;
  //   ...
  // }, []);

  const createThread = async (initialMessage: string) => {
    try {
      setIsLoading(true);
      await ensureToken();

      const res = await api.post("/threads/chat", { message: initialMessage }, {
        timeout: 300000 // 5 minute timeout for AI response
      });
      const chatResponse = res.data.data;

      if (!chatResponse?.threadId) {
        throw new Error("Thread created but threadId (UUID) missing from response");
      }

      // Invalidate threads query so the sidebar updates immediately
      queryClient.invalidateQueries({ queryKey: ["threads"] });

      logAnalyticsEvent("thread_created", {
        thread_id: chatResponse.threadId,
        title: chatResponse.thread_card?.title_name || "New Chat"
      });

      setMmHasChatCookie();

      const assistantMsgId = chatResponse.message?.id || `local-assistant-${Date.now()}`;
      if (chatResponse.message?.suggested_replies && chatResponse.message.suggested_replies.length > 0) {
        localStorage.setItem(
          `suggested_replies_${chatResponse.threadId}_${assistantMsgId}`,
          JSON.stringify(chatResponse.message.suggested_replies)
        );
      }

      // Construct bootstrapped messages including user message and assistant reply
      const bootstrappedMessages = [
        {
          id: `local-user-${Date.now()}`,
          role: "user" as const,
          content: initialMessage,
          createdAt: new Date().toISOString(),
        },
        {
          id: assistantMsgId,
          role: "assistant" as const,
          content: chatResponse.message?.assistantMessage || "",
          replies: chatResponse.message?.suggested_replies || [],
          requiresSignup: chatResponse.message?.auth_gate?.should_show || false,
          createdAt: new Date().toISOString(),
        }
      ];

      navigateToChatWithFirstUserMessage(
        chatResponse.threadId,
        chatResponse.thread_card?.title_name || "New Chat",
        chatResponse.thread_card?.stuck_situation || undefined,
        bootstrappedMessages
      );
      localStorage.removeItem("suggestion_used_user_new");
    } catch (error: any) {
      localStorage.removeItem("suggestion_used_user_new");
      console.error("[NewChatPage] Error creating thread:", error);
      const statusCode = error.response?.status || error.response?.data?.code;
      const isInternalError = statusCode === 500;
      
      let errorMessage = extractErrorMessage(error, "Failed to create thread");
      if (isInternalError) {
        errorMessage = "Service currently not working. Please check again after sometime.";
      }

      setMessages([
        {
          role: "assistant",
          content: errorMessage,
          isError: true,
        },
      ]);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToChatWithFirstUserMessage = (tid: string, title?: string, desc?: string, initialMessages: any[] = []) => {
    navigate(`/user/chat/${tid}`, {
      state: {
        bootstrapThread: {
          id: "0",
          threadId: tid,
          title: title || "New Chat",
          desc: desc || undefined,
          messages: initialMessages,
        },
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
    localStorage.setItem("suggestion_used_user_new", "true");

    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
    }

    createThread(userMessage);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;

    setMessage(suggestion);
    setSuggestionUsed(true);
    localStorage.setItem("suggestion_used_user_new", "true");

    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }

    createThread(suggestion);
  };

  // Note: retry is handled by simply refreshing the page / reloading the route.

  return (
    <div className="flex flex-col h-full relative bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center pt-1 md:pt-6 pb-4 md:pb-6 px-4 min-h-min">
        {isLoading ? (
          <div className="text-center mt-32">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
            <p className="text-gray-500 dark:text-gray-400">Setting up your chat...</p>
          </div>
        ) : messages.some(m => m.isError) ? (
          <div className="text-center max-w-4xl w-full mt-32">
            <div className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-6 rounded-2xl border border-red-200 dark:border-red-800 mb-6">
              <p className="text-lg font-medium mb-2">Oops! Something went wrong.</p>
              <p>{messages.find(m => m.isError)?.content}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Refresh and try again
            </button>
          </div>
        ) : (
          <div className="w-full max-w-3xl flex flex-col items-center">
            {/* Header */}
            <div className="text-center space-y-0.5 md:space-y-1 mb-2 md:mb-4">
              <h2 className="text-2xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
                Welcome back
              </h2>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
                How would you like to start?
              </p>
            </div>

            {/* Talk about something new card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-3.5 md:p-4 w-full max-w-2xl mb-2 md:mb-3">
              <h3 className="text-[15px] md:text-[17px] font-medium text-gray-700 dark:text-gray-200 mb-2 md:mb-3 text-left ml-2">
                Talk about something new
              </h3>
              
              {!suggestionUsed && (
                <div className="flex flex-wrap gap-2 md:gap-3 justify-center mb-3 md:mb-4">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={isLoading}
                      className="px-3 py-2.5 md:px-4 md:py-3 w-[calc(50%-4px)] md:w-[calc(50%-6px)] bg-blue-50/50 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[11px] md:text-[12px] leading-relaxed font-normal transition disabled:opacity-50 disabled:cursor-not-allowed text-center [text-wrap-mode:wrap]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 flex items-end gap-3 p-2">
                <textarea
                  ref={messageInputRef}
                  className="flex-1 px-4 py-2.5 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-[15px] border-0 bg-transparent resize-none min-h-[44px] max-h-[150px] overflow-y-auto"
                  placeholder="Start with something new..."
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
                  className="bg-yellow-300 hover:bg-yellow-400 p-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
                >
                  <ArrowUp className="h-4 w-4 text-gray-900" strokeWidth={2.5} fill="none" />
                </button>
              </div>
            </div>

            {/* Separator */}
            {latestThreadDetail && (
              <div className="flex items-center w-full max-w-[200px] my-0">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                <span className="px-4 text-gray-400 dark:text-gray-500 text-[14px]">or</span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
              </div>
            )}

            {/* Continue where you left card */}
            {latestThreadDetail && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 md:p-5 w-full max-w-2xl">
                <div className="mb-3 text-left ml-2">
                  <h3 className="text-[17px] font-medium text-gray-700 dark:text-gray-200">
                    Continue where you left
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Let's build on that instead of starting from scratch
                  </p>
                </div>

                {/* Yellow embedded thread card */}
                <div className="bg-yellow-400 rounded-[14px] p-5 text-left text-gray-900">
                  <h4 className="font-bold text-[17px] mb-1">{threadCard?.title_name || latestThreadDetail.title || "New Thread"}</h4>
                  {theSign && (
                    <p className="text-[13px] font-medium opacity-90 mb-4 truncate">
                      <span className="italic font-normal">The Sign:</span> {theSign}
                    </p>
                  )}
                  
                  {toDo ? (
                    <button 
                      onClick={() => navigate(`/user/chat/${latestThreadDetail.threadId || latestThreadDetail.id}`)}
                      className="w-full bg-white text-gray-900 rounded-lg px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition shadow-sm"
                    >
                      <div className="flex items-center gap-2 truncate pr-4">
                        <span className="text-yellow-400 text-xl leading-none font-bold pb-0.5">•</span>
                        <span className="font-bold text-[13px] truncate">To do : {toDo}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate(`/user/chat/${latestThreadDetail.threadId || latestThreadDetail.id}`)}
                      className="w-full bg-white text-gray-900 rounded-lg px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition shadow-sm"
                    >
                      <div className="flex items-center gap-2 truncate pr-4">
                        <span className="font-bold text-[13px] truncate">Continue chat</span>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guest user login/signup prompt - text only */}
      {isGuestUser() && (
        <div className="pb-8 text-center flex-shrink-0">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't lose your progress. Let's{" "}
            <Link
              to="/"
              className="underline text-gray-800 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200"
            >
              log in
            </Link>{" "}
            or{" "}
            <Link
              to="/signup"
              className="underline text-gray-800 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200"
            >
              sign up
            </Link>{" "}
            to save your thread
          </p>
        </div>
      )}
    </div>
  );
}