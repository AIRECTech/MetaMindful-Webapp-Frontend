import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
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
  threadId: string; // externalThreadId (UUID)
  title: string;
  desc?: string;
  messages: Message[];
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isGuest = isGuestUser();
  const hasAutoSentRef = useRef(false);
  
  // For guest users, manage messages in local state instead of fetching thread
  const [guestMessages, setGuestMessages] = useState<Message[]>([]);
  const [guestThreadTitle, setGuestThreadTitle] = useState<string>("New Chat");

  const state = (location.state || {}) as {
    bootstrapThread?: Thread;
    autoSendText?: string;
  };

  // If we navigated here from NewChatPage, we can prefill the cache and avoid /threads/:id
  useEffect(() => {
    if (!id) return;
    if (!state.bootstrapThread) return;
    if (state.bootstrapThread.threadId !== id) return;

    queryClient.setQueryData(["thread", id], state.bootstrapThread);

    if (isGuest) {
      setGuestMessages(state.bootstrapThread.messages || []);
      setGuestThreadTitle(state.bootstrapThread.title || "New Chat");
    }
  }, [id, isGuest, queryClient, state.bootstrapThread]);

  // Check if we have bootstrap data from navigation state
  const hasBootstrapData = !!(state.bootstrapThread && state.bootstrapThread.threadId === id);
  const hasCachedThread = !!(id && queryClient.getQueryData(["thread", id]));

  const { data: thread, isLoading } = useQuery({
    queryKey: ["thread", id],
    queryFn: async () => {
      // Ensure token before fetching thread
      await ensureToken();
      const res = await api.get(`/threads/${id}`);
      return res.data.data as Thread;
    },
    initialData: () => {
      if (!id) return undefined;
      // Use bootstrap data if available, otherwise check cache
      if (hasBootstrapData && state.bootstrapThread) {
        return state.bootstrapThread;
      }
      return queryClient.getQueryData(["thread", id]) as Thread | undefined;
    },
    // Fetch if:
    // 1. We have an id
    // 2. We don't have bootstrap data (direct page load/reload)
    // 3. We don't have cached data
    // Note: For guest users, we still fetch on page reload to get the thread data
    enabled: !!id && !hasBootstrapData && !hasCachedThread,
    // Allow refetch on mount if there's no data (for page reloads)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: !hasCachedThread && !hasBootstrapData, // Refetch on mount if no cached/bootstrap data
    refetchInterval: false, // Don't refetch on interval
    staleTime: Infinity, // Never consider data stale, so it won't refetch automatically
    gcTime: Infinity, // Keep data in cache forever
  });

  // When thread data is loaded (from API or cache), update guest state if needed
  useEffect(() => {
    if (!id) return;
    if (!isGuest) return;
    if (!thread) return;
    
    // Only update if guestMessages is empty (page reload scenario)
    if (guestMessages.length === 0 && thread.messages && thread.messages.length > 0) {
      console.log("[ChatPage] Loading thread data into guest state:", thread);
      setGuestMessages(thread.messages);
      setGuestThreadTitle(thread.title || "New Chat");
    }
  }, [id, isGuest, thread, guestMessages.length]);

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
      console.log("[ChatPage] sendMessage.onSuccess: received data:", data);
      // Update thread data from chat API response instead of refetching
      if (data) {
        if (isGuest) {
          // For guest users, update local state
          if (data.assistantMessage) {
            console.log("[ChatPage] sendMessage.onSuccess: adding assistant message to guestMessages:", data.assistantMessage);
            setGuestMessages((prev) => {
              const newMessages: Message[] = [
                ...prev,
                {
                  id: `temp-assistant-${Date.now()}`,
                  role: "assistant" as const,
                  content: data.assistantMessage,
                  createdAt: new Date().toISOString(),
                },
              ];
              console.log("[ChatPage] sendMessage.onSuccess: updated guestMessages:", newMessages);
              return newMessages;
            });
          } else {
            console.warn("[ChatPage] sendMessage.onSuccess: no assistantMessage in response for guest");
          }
          
          // Update title if changed
          if (data.title_name && data.title_name !== guestThreadTitle) {
            setGuestThreadTitle(data.title_name);
          }
        } else {
          // For authenticated users, update query cache
          if (thread) {
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
        }
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
      
      if (isGuest) {
        // For guest users, remove the last user message from local state
        setGuestMessages((prev) => {
          return prev.filter((msg, index) => {
            // Keep all messages except the last temp user message
            if (index === prev.length - 1 && msg.id?.startsWith("temp-user-")) {
              return false;
            }
            return true;
          });
        });
      } else {
        // For authenticated users, remove the last user message on error
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
      }
      
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
  }, [thread?.messages, guestMessages]);

  const sendText = (text: string) => {
    const trimmedMessage = text.trim();
    if (!trimmedMessage || sendMessage.isPending || isSending) {
      console.log("[ChatPage] sendText: skipping - trimmed:", trimmedMessage, "pending:", sendMessage.isPending, "sending:", isSending);
      return;
    }

    console.log("[ChatPage] sendText: sending message:", trimmedMessage, "isGuest:", isGuest);

    if (isGuest) {
      setGuestMessages((prev) => {
        const newMessages: Message[] = [
          ...prev,
          {
            id: `temp-user-${Date.now()}`,
            role: "user" as const,
            content: trimmedMessage,
            createdAt: new Date().toISOString(),
          },
        ];
        console.log("[ChatPage] sendText: updated guestMessages:", newMessages);
        return newMessages;
      });
    } else {
      queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
        if (!old) {
          console.warn("[ChatPage] sendText: no thread data in cache");
          return old;
        }
        const newMessages: Message[] = [
          ...old.messages,
          {
            id: `temp-user-${Date.now()}`,
            role: "user",
            content: trimmedMessage,
            createdAt: new Date().toISOString(),
          },
        ];
        console.log("[ChatPage] sendText: updated thread messages:", newMessages);
        return { ...old, messages: newMessages };
      });
    }

    setIsSending(true);
    console.log("[ChatPage] sendText: calling sendMessage.mutate");
    sendMessage.mutate(trimmedMessage);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    setMessage("");
    sendText(trimmedMessage);
  };

  // Auto-send the first user message when coming from NewChatPage
  useEffect(() => {
    if (!id) {
      console.log("[ChatPage] Auto-send: no id");
      return;
    }
    if (!state.autoSendText) {
      console.log("[ChatPage] Auto-send: no autoSendText");
      return;
    }
    if (hasAutoSentRef.current) {
      console.log("[ChatPage] Auto-send: already sent");
      return;
    }
    
    console.log("[ChatPage] Auto-send: setting up auto-send for:", state.autoSendText, "isGuest:", isGuest);
    
    // Ensure bootstrap thread is set up first (especially for guest users)
    const checkAndSend = () => {
      if (isGuest) {
        // For guest users, wait until guestMessages are set (should have at least the greeting)
        if (guestMessages.length === 0) {
          console.log("[ChatPage] Auto-send: waiting for guestMessages to be set...");
          setTimeout(checkAndSend, 50);
          return;
        }
        console.log("[ChatPage] Auto-send: guestMessages ready, count:", guestMessages.length);
      } else {
        // For authenticated users, wait until thread is cached
        const cachedThread = queryClient.getQueryData(["thread", id]);
        if (!cachedThread) {
          console.log("[ChatPage] Auto-send: waiting for thread to be cached...");
          setTimeout(checkAndSend, 50);
          return;
        }
        console.log("[ChatPage] Auto-send: thread cached");
      }
      
      // Now we can send
      console.log("[ChatPage] Auto-send: calling sendText");
      hasAutoSentRef.current = true;
      sendText(state.autoSendText!);
    };
    
    // Start checking after a short delay to let bootstrap complete
    const timer = setTimeout(checkAndSend, 200);
    
    return () => clearTimeout(timer);
  }, [id, state.autoSendText, state.bootstrapThread, isGuest, guestMessages.length, queryClient]);

  // Use guest messages for guest users, thread messages for authenticated users
  const displayMessages = isGuest ? guestMessages : (thread?.messages || []);
  const displayTitle = isGuest ? guestThreadTitle : (thread?.title || "New Chat");
  const displayDesc = isGuest ? undefined : thread?.desc;

  // Show loading indicator while fetching thread data
  if (isLoading && !hasBootstrapData && displayMessages.length === 0) {
    return (
      <div className="flex flex-col h-full relative bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
            <p className="text-gray-500 dark:text-gray-400">Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state for authenticated users if thread not found
  if (!isGuest && !thread && !isLoading && !hasBootstrapData) {
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
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Centered header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">{displayTitle}</h1>
            {displayDesc && displayDesc !== "None" && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{displayDesc}</p>
            )}
          </div>
          {displayMessages.length === 0 && !isLoading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <p>Start a conversation by sending a message below.</p>
            </div>
          ) : displayMessages.length === 0 && isLoading ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
            </div>
          ) : (
            <>
              {displayMessages.map((msg) => (
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