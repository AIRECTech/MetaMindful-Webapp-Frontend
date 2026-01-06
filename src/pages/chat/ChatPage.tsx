import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowUp } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { ensureToken, isGuestUser } from "../../lib/auth";

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
    // Only fetch once on mount, don't refetch automatically
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
    onSuccess: (data) => {
      // Update thread data from chat API response instead of refetching
      if (data && thread) {
        // Update thread title if changed
        if (data.title_name && data.title_name !== thread.title) {
          queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
            if (!old) return old;
            return { ...old, title: data.title_name };
          });
        }
        
        // Add assistant message to the thread
        queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
          if (!old) return old;
          
          // Add assistant message if available
          if (data.assistantMessage) {
            const newMessages: Message[] = [
              ...old.messages,
              {
                id: `temp-assistant-${Date.now()}`,
                role: "assistant",
                content: data.assistantMessage,
                createdAt: new Date().toISOString(),
              },
            ];
            return { ...old, messages: newMessages };
          }
          
          return old;
        });
      }
      
      // Only invalidate threads list (for sidebar) if user is not a guest
      // Guest users don't have a sidebar, so no need to refetch threads
      if (!isGuestUser()) {
        queryClient.invalidateQueries({ queryKey: ["threads"] });
      }
      setIsSending(false);
    },
    onError: (error: any) => {
      const errorMessage = extractErrorMessage(error, "Failed to send message");
      
      // Remove the last user message on error (the one we just added)
      queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
        if (!old) return old;
        // Remove the last message if it's a temp user message
        const newMessages = old.messages.filter((msg, index) => {
          // Keep all messages except the last temp user message
          if (index === old.messages.length - 1 && msg.id?.startsWith("temp-user-")) {
            return false;
          }
          return true;
        });
        return { ...old, messages: newMessages };
      });
      
      setIsSending(false);
      
      // Check if it's a 401 error (handled by interceptor, but show message)
      if (error.response?.status === 401 || error.response?.data?.code === 401) {
        // Redirect is handled by interceptor, just show message
        toast.error("Session expired. Please log in again.");
      } else if (errorMessage.includes("ECONNRESET") || errorMessage.includes("502") || errorMessage.includes("Failed to communicate")) {
        toast.error("Failed to communicate with server. Please try again.");
      } else {
        toast.error(errorMessage);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMessage.isPending || isSending) return;
    
    // Clear input immediately
    setMessage("");
    
    // Add user message to thread immediately
    queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
      if (!old) return old;
      const newMessages: Message[] = [
        ...old.messages,
        {
          id: `temp-user-${Date.now()}`,
          role: "user",
          content: trimmedMessage,
          createdAt: new Date().toISOString(),
        },
      ];
      return { ...old, messages: newMessages };
    });
    
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
    <div className="flex flex-col h-full relative bg-gray-50 dark:bg-gray-900">
      {/* Green status dot at top left */}
      <div className="absolute top-4 left-4 w-3 h-3 bg-green-500 rounded-full z-10"></div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Centered header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">{thread.title}</h1>
            {thread.desc && thread.desc !== "None" && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{thread.desc}</p>
            )}
          </div>
          {thread.messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
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
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-900/30"
                        : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator while waiting for response */}
              {isSending && (
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
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="pb-4 px-4">
        <div className="max-w-4xl mx-auto space-y-3">
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
              disabled={sendMessage.isPending || isSending}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending || isSending}
              className="bg-yellow-300 hover:bg-yellow-400 p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
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
                  to="/login" 
                  state={{ threadId: id }}
                  className="underline text-gray-800 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  log in
                </Link>{" "}
                or{" "}
                <Link 
                  to="/signup" 
                  state={{ threadId: id }}
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