import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowUp } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { ensureToken } from "../../lib/auth";
import { ChatPage } from "./ChatPage";
import { LoginPopup } from "../../components/LoginPopup";
import { SignupPopup } from "../../components/SignupPopup";
import { GuestTopbar } from "../../components/layout/GuestTopbar";
import { Toaster } from "react-hot-toast";

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
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string>("New Chat");
  const [threadDesc, setThreadDesc] = useState<string | null>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const hasCreatedThreadRef = useRef(false);

  // Generate guest token and create thread on page load
  const generateToken = useQuery({
    queryKey: ["guest-token"],
    queryFn: async () => {
      await ensureToken();
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
        setThreadId(data.threadId);
        setThreadTitle(data.title || "New Chat");
        setThreadDesc(data.desc ?? null);
        const firstAssistant = data.messages?.find((m: ThreadResponseMessage) => m.role === "assistant")?.content;
        if (firstAssistant) {
          setMessages([{ role: "assistant", content: firstAssistant, isError: false }]);
        } else {
          setMessages([{ role: "assistant", content: "Hi, I'm MetaMindful. I'm here to listen and support you. How are you feeling today?", isError: false }]);
        }
      } else {
        toast.error("Failed to create thread");
      }
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create thread"));
      setIsLoading(false);
    },
  });

  // Create thread when token is ready
  useEffect(() => {
    if (generateToken.isSuccess && !threadId && !hasCreatedThreadRef.current && !createThread.isPending && !id) {
      hasCreatedThreadRef.current = true;
      setIsLoading(true);
      createThread.mutate();
    }
  }, [generateToken.isSuccess, threadId, createThread, id]);

  const navigateToChatWithFirstUserMessage = (userMessage: string) => {
    if (!threadId) return;
    navigate(`/guest/${threadId}`, {
      state: {
        bootstrapThread: {
          id: "0",
          threadId,
          title: threadTitle,
          desc: threadDesc ?? undefined,
          messages: [
            {
              id: `bootstrap-assistant-${Date.now()}`,
              role: "assistant",
              content: messages[0]?.content || "Hi, I'm MetaMindful. I'm here to listen and support you. How are you feeling today?",
              createdAt: new Date().toISOString(),
            },
          ],
        },
        autoSendText: userMessage,
      },
      replace: true,
    });
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || !threadId) return;
    const userMessage = trimmedMessage;
    setMessage("");
    navigateToChatWithFirstUserMessage(userMessage);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading || !threadId) return;
    setMessage("");
    navigateToChatWithFirstUserMessage(suggestion);
  };

  // If we have a thread ID, show the ChatPage (after all hooks)
  if (id) {
    return <ChatPage />;
  }

  // Show loading while generating token and creating thread
  if (generateToken.isLoading || (isLoading && !messages[0])) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Setting up your chat...</p>
        </div>
      </div>
    );
  }

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
            {/* Initial greeting view */}
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center max-w-4xl w-full">
                <h2 className="text-3xl md:text-4xl font-normal text-gray-700 dark:text-gray-300 leading-relaxed">
                  {messages[0]?.content || "Hi, I'm MetaMindful. I'm here to listen and support you. How are you feeling today?"}
                </h2>
              </div>
            </div>

            {/* Input area with suggestions */}
            <div className="pb-4 px-4">
              <div className="max-w-4xl mx-auto space-y-3">
                {/* Suggested prompts */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      onClick={() => handleSuggestionClick(suggestions[0])}
                      disabled={isLoading || !threadId}
                      className="px-5 py-3 bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-base font-normal transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {suggestions[0]}
                    </button>
                    <button
                      onClick={() => handleSuggestionClick(suggestions[1])}
                      disabled={isLoading || !threadId}
                      className="px-5 py-3 bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-base font-normal transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {suggestions[1]}
                    </button>
                    <button
                      onClick={() => handleSuggestionClick(suggestions[2])}
                      disabled={isLoading || !threadId}
                      className="px-5 py-3 bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-base font-normal transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {suggestions[2]}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      onClick={() => handleSuggestionClick(suggestions[3])}
                      disabled={isLoading || !threadId}
                      className="px-5 py-3 bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-base font-normal transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {suggestions[3]}
                    </button>
                    <button
                      onClick={() => handleSuggestionClick(suggestions[4])}
                      disabled={isLoading || !threadId}
                      className="px-5 py-3 bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-base font-normal transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {suggestions[4]}
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3 p-4">
                  <input
                    type="text"
                    className="flex-1 px-6 py-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base border-0 bg-gray-100 dark:bg-gray-700 rounded-full"
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
                  />
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || isLoading || !threadId}
                    className="bg-yellow-300 hover:bg-yellow-400 p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
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
        currentThreadId={threadId || undefined}
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
        currentThreadId={threadId || undefined}
        onSwitchToLogin={() => {
          setShowSignupPopup(false);
          setShowLoginPopup(true);
        }}
      />
    </>
  );
}
