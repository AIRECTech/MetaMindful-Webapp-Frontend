import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { ensureToken, isGuestUser } from "../../lib/auth";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  originalUserMessage?: string;
}

export function StartChatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  
  // Check if there's a query parameter on initial render
  const initialQueryMessage = searchParams.get("q");
  const [messages, setMessages] = useState<Message[]>(() => {
    // If there's a query parameter, immediately add the user message to show chat view
    if (initialQueryMessage) {
      const decodedMessage = decodeURIComponent(initialQueryMessage);
      return [{ role: "user" as const, content: decodedMessage }];
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    // If there's a query parameter, immediately set loading to true to show chat view
    return !!initialQueryMessage;
  });
  const [threadId, setThreadId] = useState<string | null>(null);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }
    };
    handleScroll();
    setTimeout(handleScroll, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAutoSend = (text: string) => {
    const trimmedMessage = text.trim();
    if (!trimmedMessage || startChat.isPending) return;
    
    // Message is already added to state in initial render, just start the chat
    setIsLoading(true);
    
    // Start chat (this will add assistant response when done)
    startChat.mutate(trimmedMessage);
  };

  // Auto-send message from query parameter on mount
  useEffect(() => {
    const queryMessage = searchParams.get("q");
    if (queryMessage && !hasAutoSent) {
      setHasAutoSent(true);
      // Decode the message (in case it's URL encoded)
      const decodedMessage = decodeURIComponent(queryMessage);
      // Auto-send the message (message is already in state, just trigger the API call)
      handleAutoSend(decodedMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hasAutoSent]);

  const startChat = useMutation({
    mutationFn: async (text: string) => {
      // Ensure user has a token (generate guest token if needed)
      await ensureToken();
      
      const payload: any = {
        message: text,
      };
      
      // If we have a threadId (for guest users continuing conversation), include it
      if (threadId) {
        payload.threadId = threadId;
      } else {
        payload.title = "New Chat";
      }
      
      const res = await api.post("/threads/chat", payload);
      
      return res.data.data;
    },
    onSuccess: (data) => {
      setIsLoading(false);
      if (data && data.threadId) {
        // Invalidate threads query so the sidebar updates immediately
        queryClient.invalidateQueries({ queryKey: ["threads"] });

        // Store threadId for guest users (so we can continue the conversation)
        if (!threadId) {
          setThreadId(data.threadId);
        }
        
        // Add assistant message if available
        if (data.assistantMessage) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.assistantMessage,
              isError: false,
            },
          ]);
        }
        
        // Only navigate to chat page if user is NOT a guest
        // Guest users should stay on /start-chat
        if (!isGuestUser()) {
          setTimeout(() => {
            navigate(`/user/chat/${data.threadId}`);
          }, 500);
        }
      } else {
        console.error("No threadId in response:", data);
        setMessages((prev) => {
          const lastUserMessage = [...prev].reverse().find(msg => msg.role === "user")?.content || "";
          return [
            ...prev,
            {
              role: "assistant",
              content: "I'm sorry, there was an error starting the chat. Please try again.",
              isError: true,
              originalUserMessage: lastUserMessage,
            },
          ];
        });
      }
    },
    onError: (error: any, variables: string) => {
      setIsLoading(false);
      const errorMessage = extractErrorMessage(error, "Failed to start chat");
      
      let errorContent = "I'm sorry, I'm having trouble communicating right now. Please try again.";
      if (errorMessage.includes("ECONNRESET") || errorMessage.includes("502") || errorMessage.includes("Failed to communicate")) {
        errorContent = "I'm having trouble connecting to the server. Please try again in a moment.";
      }
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorContent,
          isError: true,
          originalUserMessage: variables,
        },
      ]);
    },
  });

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || startChat.isPending || isLoading) return;
    
    // Clear input immediately
    const userMessage = trimmedMessage;
    setMessage("");
    
    // Add user message to chat immediately
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    
    // Set loading state immediately
    setIsLoading(true);
    
    // Start chat (this will add assistant response when done)
    startChat.mutate(userMessage);
  };

  const handleRetry = (originalMessage: string) => {
    if (startChat.isPending || isLoading) return;
    
    // Remove the last error message
    setMessages((prev) => {
      const filtered = prev.filter((msg, index) => !(index === prev.length - 1 && msg.isError));
      return filtered;
    });
    
    setIsLoading(true);
    startChat.mutate(originalMessage);
  };

  // Show chat interface if messages exist, loading, or if there's a query parameter
  // If there's a query parameter, always show chat view (skip greeting)
  const showChat = !!initialQueryMessage || messages.length > 0 || isLoading;

  return (
    <div className="flex flex-col h-full relative bg-gray-50 dark:bg-gray-900">
      {!showChat ? (
        // Initial greeting view (shouldn't show if auto-sending, but just in case)
        <>
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center max-w-4xl w-full">
              <h2 className="text-3xl md:text-4xl font-normal text-gray-700 dark:text-gray-300 leading-relaxed">
                Hi, im Metamindful, how are you feeling right now?
              </h2>
            </div>
          </div>

          {/* Input area */}
          <div className="pb-4">
            <div className="max-w-4xl mx-auto px-4 space-y-3">
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
                  disabled={startChat.isPending || isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || startChat.isPending || isLoading}
                  className="bg-yellow-300 hover:bg-yellow-400 p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
                >
                  <ArrowUp className="h-5 w-5 text-gray-900" strokeWidth={2.5} fill="none" />
                </button>
              </div>
              
              {/* Guest user login/signup prompt */}
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
      ) : (
        // Chat conversation view
        <>
          {/* Messages area */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 space-y-6">
              {/* Centered header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">New Chat</h1>
              </div>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-900/30"
                        : msg.isError
                        ? "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                        : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.isError && msg.originalUserMessage && (
                      <button
                        onClick={() => handleRetry(msg.originalUserMessage!)}
                        disabled={startChat.isPending || isLoading}
                        className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-800 dark:text-red-300 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed border border-red-300 dark:border-red-800"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="text-gray-600 dark:text-gray-400 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="pb-4">
            <div className="max-w-4xl mx-auto px-4 space-y-3">
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
                  disabled={startChat.isPending || isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || startChat.isPending || isLoading}
                  className="bg-yellow-300 hover:bg-yellow-400 p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
                >
                  <ArrowUp className="h-5 w-5 text-gray-900" strokeWidth={2.5} fill="none" />
                </button>
              </div>
              
              {/* Guest user login/signup prompt */}
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
      )}
    </div>
  );
}

