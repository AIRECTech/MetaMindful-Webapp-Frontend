import { useState, useEffect, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Send, ArrowRight } from "lucide-react";
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
  showAppCard?: boolean;
}



export function NewChatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [suggestionUsed, setSuggestionUsed] = useState(false);

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
          showAppCard: chatResponse.ui_element?.show_app_card || false,
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
    <div className="flex flex-col h-full relative bg-white overflow-y-auto pb-12">
      <div className="flex-1 flex flex-col items-center pt-6 pb-12 px-4 min-h-min">
        {isLoading ? (
          <div className="text-center mt-32">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
            <p className="text-gray-500">Setting up your chat...</p>
          </div>
        ) : messages.some(m => m.isError) ? (
          <div className="text-center max-w-4xl w-full mt-32">
            <div className="bg-red-50 text-red-800 p-6 rounded-2xl border border-red-200 mb-6">
              <p className="text-lg font-medium mb-2">Oops! Something went wrong.</p>
              <p>{messages.find(m => m.isError)?.content}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh and try again
            </button>
          </div>
        ) : (
          <div className="w-full max-w-lg md:max-w-2xl flex flex-col items-start mx-auto py-2">
            {/* Profile logo on top */}
            <div className="mb-4">
              <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 overflow-hidden shadow-sm border border-blue-50/50">
                <img src="/logo.png" alt="MetaMindful Logo" className="w-9 h-9 object-contain" />
              </div>
            </div>

            {/* Text underneath the logo */}
            <div className="space-y-1 mb-6">
              <h2 className="text-3xl font-bold text-gray-800 leading-tight">
                Welcome back!
              </h2>
              <p className="text-sm text-gray-500 font-semibold">
                How would you like to start?
              </p>
            </div>

            {/* Suggested prompts - Vertical Stack left-aligned pill layout, no indentation */}
            {!suggestionUsed && (
              <div className="flex flex-col items-start gap-2.5 w-full mb-6">
                {suggestions.map((suggestion, idx) => (
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
            )}

            {/* Text input area */}
            <div className="w-full mb-6 relative">
              <div className="relative z-10 bg-gray-100 rounded-full border border-gray-200/50 flex items-center gap-2 p-1.5 pl-4 pr-1.5 shadow-sm">
                <textarea
                  ref={messageInputRef}
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
                <div className="text-center mt-3 w-full mb-1">
                  <p className="text-[12px] text-gray-400 font-medium">Your data stays 100% private</p>
                </div>
              </div>

            {/* Continue where you left card */}
            {latestThreadDetail && (
              <div className="bg-gray-50/50 rounded-2xl border border-gray-150 p-5 text-left w-full mt-6 shadow-sm">
                <div className="mb-4 text-left ml-1">
                  <h3 className="text-base font-semibold text-gray-800">
                    Continue where you left off
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
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
                      <ArrowRight className="w-4 h-4 flex-shrink-0" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate(`/user/chat/${latestThreadDetail.threadId || latestThreadDetail.id}`)}
                      className="w-full bg-white text-gray-900 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition shadow-sm"
                    >
                      <div className="flex items-center gap-2 truncate pr-4">
                        <span className="font-bold text-[13px] truncate">Continue chat</span>
                      </div>
                      <ArrowRight className="w-4 h-4 flex-shrink-0" />
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