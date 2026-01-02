import { useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Send } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
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

export function NewChatPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null); // Store threadId for guest users
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        // Guest users should stay on /chat/new
        if (!isGuestUser()) {
          setTimeout(() => {
            navigate(`/chat/${data.threadId}`);
          }, 500);
        }
      } else {
        console.error("No threadId in response:", data);
        // Show error in chat - find the last user message for retry
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
      
      // Show error message in chat
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
          originalUserMessage: variables, // Store the original message for retry
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

  const handleSuggestionClick = (suggestion: string) => {
    if (startChat.isPending || isLoading) return;
    
    setMessage("");
    
    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: suggestion }]);
    setIsLoading(true);
    
    // Start chat
    startChat.mutate(suggestion);
  };

  const handleRetry = (originalMessage: string) => {
    if (startChat.isPending || isLoading) return;
    
    // Remove the last error message
    setMessages((prev) => {
      const filtered = prev.filter((msg, index) => !(index === prev.length - 1 && msg.isError));
      // Don't add user message again - it should already be in the list before the error
      return filtered;
    });
    
    setIsLoading(true);
    startChat.mutate(originalMessage);
  };

  // Show chat interface if messages exist or loading
  const showChat = messages.length > 0 || isLoading;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {!showChat ? (
        // Initial greeting view
        <>
          <div className="flex-1 flex items-center justify-center px-4 pb-24">
            <div className="text-center max-w-4xl w-full">
              {/* Greeting text */}
              <h2 className="text-3xl md:text-4xl font-normal text-gray-700 mb-12 leading-relaxed">
                Hi, im Metamindful, how are you feeling right now?
              </h2>
              
              {/* Suggested prompts */}
              <div className="flex flex-col items-center gap-4">
                {/* First row */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={() => handleSuggestionClick(suggestions[0])}
                    disabled={startChat.isPending}
                    className="px-5 py-3 bg-blue-100 text-gray-700 rounded-xl border border-blue-200 hover:bg-blue-200 text-base font-normal transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestions[0]}
                  </button>
                  <button
                    onClick={() => handleSuggestionClick(suggestions[1])}
                    disabled={startChat.isPending}
                    className="px-5 py-3 bg-blue-100 text-gray-700 rounded-xl border border-blue-200 hover:bg-blue-200 text-base font-normal transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestions[1]}
                  </button>
                  <button
                    onClick={() => handleSuggestionClick(suggestions[2])}
                    disabled={startChat.isPending}
                    className="px-5 py-3 bg-blue-100 text-gray-700 rounded-xl border border-blue-200 hover:bg-blue-200 text-base font-normal transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestions[2]}
                  </button>
                </div>
                
                {/* Second row */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={() => handleSuggestionClick(suggestions[3])}
                    disabled={startChat.isPending}
                    className="px-5 py-3 bg-blue-100 text-gray-700 rounded-xl border border-blue-200 hover:bg-blue-200 text-base font-normal transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestions[3]}
                  </button>
                  <button
                    onClick={() => handleSuggestionClick(suggestions[4])}
                    disabled={startChat.isPending}
                    className="px-5 py-3 bg-blue-100 text-gray-700 rounded-xl border border-blue-200 hover:bg-blue-200 text-base font-normal transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestions[4]}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Input area */}
          <div className="pb-4 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl p-3 flex gap-3 items-center shadow-sm">
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base"
                  placeholder="Type here ....."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={startChat.isPending}
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || startChat.isPending}
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 p-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex-shrink-0"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Chat conversation view
        <>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
              {/* Centered header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">New Chat</h1>
              </div>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : msg.isError
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.isError && msg.originalUserMessage && (
                      <button
                        onClick={() => handleRetry(msg.originalUserMessage!)}
                        disabled={startChat.isPending || isLoading}
                        className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed border border-red-300"
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
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="pb-4 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl p-3 flex gap-3 items-center shadow-sm">
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base"
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
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 p-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex-shrink-0"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}