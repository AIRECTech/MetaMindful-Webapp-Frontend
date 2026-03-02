import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { logAnalyticsEvent } from "../../lib/firebase";
import { useTimeOnScreen } from "../../hooks/useTimeOnScreen";
import { ensureToken, isGuestUser } from "../../lib/auth";

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

interface ThreadResponseMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ThreadResponse {
  id: string;
  threadId: string; // externalThreadId (UUID)
  userId: string;
  title: string;
  desc?: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  messages: ThreadResponseMessage[];
}

export function NewChatPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useTimeOnScreen("new-chat", "NewChatPage");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
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

      const res = await api.post("/threads", { title: "New Chat" });
      const thread = res.data.data as ThreadResponse;

      if (!thread?.threadId) {
        throw new Error("Thread created but threadId (UUID) missing from response");
      }

      logAnalyticsEvent("thread_created", {
        thread_id: thread.threadId,
        title: thread.title
      });

      navigateToChatWithFirstUserMessage(initialMessage, thread.threadId, thread.title, thread.desc ?? undefined);
    } catch (error: any) {
      console.error("[NewChatPage] Error creating thread:", error);
      const errorMessage = extractErrorMessage(error, "Failed to create thread");
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

  const navigateToChatWithFirstUserMessage = (userMessage: string, tid: string, title?: string, desc?: string) => {
    navigate(`/user/chat/${tid}`, {
      state: {
        bootstrapThread: {
          id: "0",
          threadId: tid,
          title: title || "New Chat",
          desc: desc || undefined,
          messages: [],
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

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    createThread(userMessage);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;

    setMessage(suggestion);

    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    createThread(suggestion);
  };

  // Note: retry is handled by simply refreshing the page / reloading the route.

  return (
    <div className="flex flex-col h-full relative bg-gray-50 dark:bg-gray-900">
      {/* Initial greeting view / Loading view */}
      <div className="flex-1 flex items-center justify-center px-4">
        {isLoading ? (
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
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex flex-wrap gap-3 justify-center w-full">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading}
                  className="px-5 py-3 w-[190px] bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-[12px] leading-normal font-normal transition disabled:opacity-50 disabled:cursor-not-allowed text-left [text-wrap-mode:wrap] flex-shrink-0"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-end gap-3 p-4">
            <textarea
              ref={textareaRef}
              className="flex-1 px-6 py-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base border-0 bg-gray-100 dark:bg-gray-700 rounded-xl resize-none min-h-[48px] max-h-[200px] overflow-y-auto"
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

          {/* Guest user login/signup prompt - text only */}
          {isGuestUser() && (
            <div className="text-center">
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
      </div>
    </div>
  );
}