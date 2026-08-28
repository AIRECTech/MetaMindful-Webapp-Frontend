import { useState, useEffect, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { ArrowUp, Mic } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { logAnalyticsEvent } from "../../lib/firebase";
import { useTimeOnScreen } from "../../hooks/useTimeOnScreen";
import { ensureToken, isGuestUser } from "../../lib/auth";
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

    if (suggestion.includes("Something else")) {
      setSuggestionUsed(true);
      localStorage.setItem("suggestion_used_user_new", "true");
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
      return;
    }

    const cleanSuggestion = suggestion.replace(/^[\s\S]*?\s/, '');
    setMessage(cleanSuggestion);
    setSuggestionUsed(true);
    localStorage.setItem("suggestion_used_user_new", "true");

    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }

    createThread(cleanSuggestion);
  };

  // Note: retry is handled by simply refreshing the page / reloading the route.

  return (
    <div className="flex flex-col h-full relative bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center pt-0 md:pt-4 pb-0 md:pb-4 px-4 min-h-min">
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
          <div className="w-full max-w-lg flex flex-col items-center mx-auto my-auto py-2">
            {/* MetaMindful logo profile avatar outline with heart inside */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <svg className="w-10 h-10" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M38 12C31.5 12 26 15.5 23 21C22 23 20 23.5 18 24.5C16.5 25.2 15 26.5 15.5 28.5C16 30 18 30.5 19 32C20.2 33.8 19.5 35 19 36C18.5 37 17.5 37.5 18 39C18.5 40.5 20.5 41 21.5 42C23.5 44 26 47 30 48.5C34 50 36 52 38 52C46.8366 52 54 44.8366 54 36C54 27.1634 46.8366 12 38 12Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M36 24C34.5 22.5 32 22.5 30.5 24C29 25.5 29 28 30.5 29.5L36 35L41.5 29.5C43 28 43 25.5 41.5 24C40 22.5 37.5 22.5 36 24Z" fill="currentColor" opacity="0.8" />
                </svg>
              </div>
            </div>

            {/* Header */}
            <div className="text-center space-y-1.5 mb-6 md:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                Welcome back!
              </h2>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                How would you like to start?
              </p>
            </div>

            {/* Suggested prompts - Vertical Stack left-aligned pill layout */}
            {!suggestionUsed && (
              <div className="flex flex-col items-start gap-2.5 w-full max-w-sm mx-auto mb-6">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-blue-50/70 hover:bg-blue-100/90 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-gray-700 dark:text-gray-300 rounded-2xl border-0 text-sm leading-normal font-normal transition text-left flex items-center gap-2"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Text input area */}
            <div className="w-full max-w-md mx-auto mb-6 relative">
              <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-end gap-3 p-3 sm:p-4">
                <textarea
                  ref={messageInputRef}
                  className="flex-1 min-w-0 px-4 sm:px-6 py-2.5 sm:py-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm sm:text-base border-0 bg-gray-100 dark:bg-gray-700 rounded-xl resize-none min-h-[44px] max-h-[150px] overflow-y-auto"
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
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 mb-0.5">
                  <button
                    type="button"
                    className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                    title="Voice input (Not active)"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || isLoading}
                    className="bg-yellow-300 hover:bg-yellow-400 p-2.5 sm:p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
                  >
                    <ArrowUp className="h-5 w-5 text-gray-900" strokeWidth={2.5} fill="none" />
                  </button>
                </div>
              </div>
            </div>

            {/* Continue where you left card */}
            {latestThreadDetail && (
              <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 text-left w-full max-w-md mx-auto mt-2 shadow-sm">
                <div className="mb-4 text-left ml-1">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    Continue where you left off
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Let's build on that instead of starting from scratch
                  </p>
                </div>

                {/* Yellow embedded thread card */}
                <div className="bg-[#FCD34D] rounded-xl p-5 text-left text-gray-900 shadow-sm">
                  <h4 className="font-bold text-[16px] mb-1">{threadCard?.title_name || latestThreadDetail.title || "New Thread"}</h4>
                  {theSign && (
                    <p className="text-[12px] font-medium opacity-90 mb-4 truncate">
                      <span className="italic font-normal">The Sign:</span> {theSign}
                    </p>
                  )}
                  
                  {toDo ? (
                    <button 
                      onClick={() => navigate(`/user/chat/${latestThreadDetail.threadId || latestThreadDetail.id}`)}
                      className="w-full bg-white text-gray-900 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition shadow-sm"
                    >
                      <div className="flex items-center gap-2 truncate pr-4">
                        <span className="text-yellow-400 text-xl leading-none font-bold pb-0.5">•</span>
                        <span className="font-bold text-[13px] truncate">To do : {toDo}</span>
                      </div>
                      <span className="text-[15px] font-semibold">↗</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate(`/user/chat/${latestThreadDetail.threadId || latestThreadDetail.id}`)}
                      className="w-full bg-white text-gray-900 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition shadow-sm"
                    >
                      <div className="flex items-center gap-2 truncate pr-4">
                        <span className="font-bold text-[13px] truncate">Continue chat</span>
                      </div>
                      <span className="text-[15px] font-semibold">↗</span>
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