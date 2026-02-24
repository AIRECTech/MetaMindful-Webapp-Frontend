import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { logAnalyticsEvent } from "../../lib/firebase";
import { useTimeOnScreen } from "../../hooks/useTimeOnScreen";
import { ensureToken, isGuestUser } from "../../lib/auth";

const suggestions = [
  "I can't sleep",
  "I am not feeling well",
  "I am stuck",
  "I am overthinking everything",
  "I am having anxiety",
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
  const [threadId, setThreadId] = useState<string | null>(null); // externalThreadId (UUID)
  const [threadTitle, setThreadTitle] = useState<string>("New Chat");
  const [threadDesc, setThreadDesc] = useState<string | null>(null);
  const hasCreatedThreadRef = useRef(false);
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

  // Create a thread on page load so the initial assistant message is dynamic
  useEffect(() => {
    if (hasCreatedThreadRef.current) return;
    hasCreatedThreadRef.current = true;

    const run = async () => {
      try {
        setIsLoading(true);
        console.log("[NewChatPage] Ensuring token...");
        await ensureToken();
        console.log("[NewChatPage] Token ensured, creating thread...");

        const res = await api.post("/threads", { title: "New Chat" });
        console.log("[NewChatPage] Thread creation response:", res.data);

        const thread = res.data.data as ThreadResponse;
        console.log("[NewChatPage] Thread data:", thread);

        if (!thread?.threadId) {
          console.error("[NewChatPage] Thread created but threadId (UUID) missing from response:", thread);
          throw new Error("Thread created but threadId (UUID) missing from response");
        }

        logAnalyticsEvent("thread_created", {
          thread_id: thread.threadId,
          title: thread.title
        });
        setThreadId(thread.threadId);
        setThreadTitle(thread.title || "New Chat");
        setThreadDesc(thread.desc ?? null);

        const firstAssistant = thread.messages?.find((m) => m.role === "assistant")?.content;
        console.log("[NewChatPage] First assistant message:", firstAssistant);

        if (firstAssistant) {
          // Store as the first message in our flow (thread response)
          setMessages([{ role: "assistant", content: firstAssistant, isError: false }]);
          console.log("[NewChatPage] Set greeting message:", firstAssistant);
        } else {
          console.warn("[NewChatPage] No assistant message found in thread response");
          // Still set a default message so the UI shows something
          setMessages([{ role: "assistant", content: "Hi, I'm MetaMindful. How are you feeling right now?", isError: false }]);
        }
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
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, []);

  const navigateToChatWithFirstUserMessage = (userMessage: string) => {
    if (!threadId) return;

    navigate(`/user/chat/${threadId}`, {
      state: {
        // Provide thread data so ChatPage can render without calling /threads/:id
        bootstrapThread: {
          id: "0",
          threadId,
          title: threadTitle,
          desc: threadDesc ?? undefined,
          messages: [
            {
              id: `bootstrap-assistant-${Date.now()}`,
              role: "assistant",
              content: messages[0]?.content || "Hi, I'm MetaMindful. How are you feeling right now?",
              createdAt: new Date().toISOString(),
            },
          ],
        },
        // The second message should be what the user typed/selected
        autoSendText: userMessage,
      },
      replace: true,
    });
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || !threadId) return;

    // Clear input immediately
    const userMessage = trimmedMessage;
    setMessage("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Pass to the chat screen: first message = thread response, second = user message
    navigateToChatWithFirstUserMessage(userMessage);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading || !threadId) return;

    setMessage(suggestion);

    // Focus textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    logAnalyticsEvent("suggestion_selected", {
      thread_id: threadId,
      suggestion
    });

    try {
      await api.post("/threads/suggestion-click", {
        suggestion,
        threadId,
      });
    } catch (error) {
      console.error("[NewChatPage] Error logging suggestion click:", error);
    }
  };

  // Note: retry is handled by simply refreshing the page / reloading the route.

  return (
    <div className="flex flex-col h-full relative bg-gray-50 dark:bg-gray-900">
      {/* Initial greeting view */}
      <>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-4xl w-full">
            {/* Greeting text */}
            {isLoading && !messages[0] ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            ) : (
              <h2 className="text-3xl md:text-4xl font-normal text-gray-700 dark:text-gray-300 leading-relaxed">
                {messages[0]?.content || "Hi, im Metamindful, how are you feeling right now?"}
              </h2>
            )}
          </div>
        </div>

        {/* Input area with suggestions */}
        <div className="pb-4 px-4">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Suggested prompts */}
            <div className="flex flex-col items-center gap-3">
              {/* First row */}
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => handleSuggestionClick(suggestions[0])}
                  disabled={isLoading || !threadId}
                  className="px-5 py-3 w-[190px] bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-[12px] leading-normal font-normal transition disabled:opacity-50 disabled:cursor-not-allowed text-left [text-wrap-mode:wrap]"
                >
                  {suggestions[0]}
                </button>
                <button
                  onClick={() => handleSuggestionClick(suggestions[1])}
                  disabled={isLoading || !threadId}
                  className="px-5 py-3 w-[190px] bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-[12px] leading-normal font-normal transition disabled:opacity-50 disabled:cursor-not-allowed text-left [text-wrap-mode:wrap]"
                >
                  {suggestions[1]}
                </button>
                <button
                  onClick={() => handleSuggestionClick(suggestions[2])}
                  disabled={isLoading || !threadId}
                  className="px-5 py-3 w-[190px] bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-[12px] leading-normal font-normal transition disabled:opacity-50 disabled:cursor-not-allowed text-left [text-wrap-mode:wrap]"
                >
                  {suggestions[2]}
                </button>
              </div>

              {/* Second row */}
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => handleSuggestionClick(suggestions[3])}
                  disabled={isLoading || !threadId}
                  className="px-5 py-3 w-[190px] bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-[12px] leading-normal font-normal transition disabled:opacity-50 disabled:cursor-not-allowed text-left [text-wrap-mode:wrap]"
                >
                  {suggestions[3]}
                </button>
                <button
                  onClick={() => handleSuggestionClick(suggestions[4])}
                  disabled={isLoading || !threadId}
                  className="px-5 py-3 w-[190px] bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-[12px] leading-normal font-normal transition disabled:opacity-50 disabled:cursor-not-allowed text-left [text-wrap-mode:wrap]"
                >
                  {suggestions[4]}
                </button>
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
                disabled={isLoading || !threadId}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isLoading || !threadId}
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
                    state={{ threadId: threadId || undefined }}
                    className="underline text-gray-800 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    log in
                  </Link>{" "}
                  or{" "}
                  <Link
                    to="/signup"
                    state={{ threadId: threadId || undefined }}
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
      </>
    </div>
  );
}