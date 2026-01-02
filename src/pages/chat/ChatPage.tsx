import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Send } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { ensureToken } from "../../lib/auth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Thread {
  id: string;
  title: string;
  desc?: string;
  messages: Message[];
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: thread, isLoading } = useQuery({
    queryKey: ["thread", id],
    queryFn: async () => {
      // Ensure token before fetching thread
      await ensureToken();
      const res = await api.get(`/threads/${id}`);
      return res.data.data as Thread;
    },
    enabled: !!id,
  });

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      // Ensure user has a token (generate guest token if needed)
      await ensureToken();
      
      const res = await api.post("/threads/chat", {
        threadId: id,
        message: text,
      });
      
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread", id] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      setPendingUserMessage(null);
      setIsSending(false);
    },
    onError: (error: any) => {
      const errorMessage = extractErrorMessage(error, "Failed to send message");
      
      // Clear pending message on error
      setPendingUserMessage(null);
      setIsSending(false);
      
      // Check if it's a connection/communication error
      if (errorMessage.includes("ECONNRESET") || errorMessage.includes("502") || errorMessage.includes("Failed to communicate")) {
        toast.error("Failed to communicate with server. Please try again.");
      } else {
        toast.error(errorMessage);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages, pendingUserMessage]);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMessage.isPending || isSending) return;
    
    // Clear input immediately
    setMessage("");
    
    // Show user message immediately
    setPendingUserMessage(trimmedMessage);
    setIsSending(true);
    
    // Send message (will clear pending state on success/error)
    sendMessage.mutate(trimmedMessage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Thread not found</p>
          <button
            onClick={() => navigate("/threads")}
            className="text-blue-600 hover:underline"
          >
            Back to threads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Centered header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">{thread.title}</h1>
            {thread.desc && thread.desc !== "None" && (
              <p className="text-sm text-gray-600">{thread.desc}</p>
            )}
          </div>
          {thread.messages.length === 0 && !pendingUserMessage ? (
            <div className="text-center text-gray-500 py-12">
              <p>Start a conversation by sending a message below.</p>
            </div>
          ) : (
            <>
              {thread.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-2 ${
                      msg.role === "user" ? "text-blue-100" : "text-gray-400"
                    }`}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Show pending user message immediately */}
              {pendingUserMessage && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 shadow-sm bg-blue-500 text-white">
                    <p className="whitespace-pre-wrap leading-relaxed">{pendingUserMessage}</p>
                  </div>
                </div>
              )}
              
              {/* Loading indicator while waiting for response */}
              {isSending && (
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
            </>
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
              disabled={sendMessage.isPending || isSending}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending || isSending}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 p-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex-shrink-0"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}