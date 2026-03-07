import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowUp, X, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { logAnalyticsEvent } from "../../lib/firebase";
import { useTimeOnScreen } from "../../hooks/useTimeOnScreen";
import { ensureToken, isGuestUser } from "../../lib/auth";
import { GuestTopbar } from "../../components/layout/GuestTopbar";
import { LoginPopup } from "../../components/LoginPopup";
import { SignupPopup } from "../../components/SignupPopup";
import { Toaster } from "react-hot-toast";
import { MessageFormatter } from "../../components/chat/MessageFormatter";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  isError?: boolean;
  originalUserMessage?: string; // Store the original user message for retry
  replies?: string[];
  feedback?: any[]; // To track if feedback was given
}

interface Thread {
  id: string;
  threadId: string; // externalThreadId (UUID)
  title: string;
  desc?: string;
  messages: Message[];
  chatCount?: number;
  chatLimit?: number;
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  // Check if user is guest by auth status OR by route path (/guest/:id)
  const isGuestRoute = location.pathname.startsWith("/guest");
  const isGuest = isGuestUser() || isGuestRoute;
  const hasAutoSentRef = useRef(false);

  useTimeOnScreen("chat", "ChatPage", { thread_id: id });

  useEffect(() => {
    logAnalyticsEvent("chat_screen_view", { thread_id: id });
  }, [id]);

  // For guest users, manage messages in local state instead of fetching thread
  const [guestMessages, setGuestMessages] = useState<Message[]>([]);
  const [guestThreadTitle, setGuestThreadTitle] = useState<string>("New Chat");
  const [guestChatCount, setGuestChatCount] = useState<number>(0);
  const [guestChatLimit, setGuestChatLimit] = useState<number | null>(null);
  const [lastPopupCount, setLastPopupCount] = useState<number>(0); // Track count when popup was last shown
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null); // Store last failed message for retry
  // Only show disclaimer for guest users
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    // Only show for guest users on initial load
    return isGuestUser();
  });
  const [suggestionUsed, setSuggestionUsed] = useState(false);

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
      // Only set from bootstrap if guestMessages are empty to avoid resetting after auto-send
      setGuestMessages((prev) => prev.length === 0 ? (state.bootstrapThread!.messages || []) : prev);
      setGuestThreadTitle(state.bootstrapThread.title || "New Chat");
      // Initialize chat count and limit from bootstrap thread if available
      if (state.bootstrapThread.chatCount !== undefined) {
        const count = state.bootstrapThread.chatCount;
        setGuestChatCount(count);
        // Initialize lastPopupCount to current count so popup shows after next 10 messages
        setLastPopupCount(count);
      }
      if (state.bootstrapThread.chatLimit !== undefined) {
        setGuestChatLimit(state.bootstrapThread.chatLimit);
      }
    }
  }, [id, isGuest, queryClient, state.bootstrapThread]);

  // Check if we have bootstrap data from navigation state
  const hasBootstrapData = !!(state.bootstrapThread && state.bootstrapThread.threadId === id);
  const cachedThread = id ? queryClient.getQueryData(["thread", id]) as Thread | undefined : undefined;

  // After window.location.href (full page reload), router state is lost and React Query cache is cleared
  // So hasBootstrapData is always false and cache is empty, which means we always fetch
  // Only skip fetching if we have bootstrap data (from router state, not cache)
  // After signup/login with window.location.href, there's no bootstrap data, so we always fetch
  const shouldFetch = !!id && !hasBootstrapData;

  const { data: thread, isLoading } = useQuery({
    queryKey: ["thread", id],
    queryFn: async () => {
      // Ensure token before fetching thread
      await ensureToken();
      console.log("[ChatPage] Fetching thread with ID:", id);
      const res = await api.get(`/threads/${id}`);
      console.log("[ChatPage] Thread fetched:", res.data.data);
      const fetchedThread = res.data.data as Thread;
      logAnalyticsEvent("thread_opened", {
        thread_id: id,
        message_count: fetchedThread.messages?.length || 0
      });
      return fetchedThread;
    },
    initialData: () => {
      // Only use bootstrap data if available (from router state)
      // Don't use cache here - let the query always fetch fresh data after signup/login (window.location.href)
      if (!id) return undefined;
      if (hasBootstrapData && state.bootstrapThread) {
        return state.bootstrapThread;
      }
      // After window.location.href, no bootstrap data, so return undefined to trigger fetch
      return undefined;
    },
    // Fetch if:
    // 1. We have an id
    // 2. We don't have bootstrap data (from router state) - always false after window.location.href
    // Note: After signup/login with window.location.href, router state is lost, cache is cleared, so we always fetch
    enabled: shouldFetch,
    // Always refetch on mount if we should fetch (after full page reload)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: shouldFetch, // Always refetch on mount if no bootstrap data
    refetchInterval: false, // Don't refetch on interval
    staleTime: hasBootstrapData ? Infinity : 0, // If bootstrap data, never stale; otherwise always stale to allow refetch
    gcTime: Infinity, // Keep data in cache forever
  });
 
  // Use guest messages for guest users, thread messages for authenticated users
  const displayMessages = isGuest ? guestMessages : (thread?.messages || []);


  // Debug logging
  useEffect(() => {
    console.log("[ChatPage] Query state:", {
      id,
      hasBootstrapData,
      hasCachedThread: !!cachedThread,
      shouldFetch,
      enabled: shouldFetch,
      isLoading,
      thread: thread ? { id: thread.id, threadId: thread.threadId, messageCount: thread.messages?.length } : null,
    });
  }, [id, hasBootstrapData, cachedThread, shouldFetch, isLoading, thread]);

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

    // Update chat count and limit from thread data
    if (thread.chatCount !== undefined) {
      const count = thread.chatCount;
      setGuestChatCount(count);
      // Initialize lastPopupCount if not already set
      if (lastPopupCount === 0 && count > 0) {
        setLastPopupCount(count);
      }
    }
    if (thread.chatLimit !== undefined) {
      setGuestChatLimit(thread.chatLimit);
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
    onSuccess: (data, variables) => {
      console.log("[ChatPage] sendMessage.onSuccess: entered", { data: !!data, variables });
      setIsSending(false);

      logAnalyticsEvent("chat_message_sent", {
        thread_id: id,
        message_length: variables.length
      });
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
                  id: data.message_id || `temp-assistant-${Date.now()}`,
                  role: "assistant" as const,
                  content: data.assistantMessage,
                  replies: data.replies || [],
                  createdAt: new Date().toISOString(),
                },
              ];
              logAnalyticsEvent("chat_message_received", {
                thread_id: id,
                response_length: data.assistantMessage.length
              });
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

          // Update chat count from API response if available, otherwise increment
          if (data.chatCount !== undefined) {
            const newCount = data.chatCount;
            setGuestChatCount(newCount);

            // Check if we should show popup after count update
            if (isGuest && guestChatLimit !== null && guestChatLimit > 0) {
              const messagesSinceLastPopup = newCount - lastPopupCount;
              if (messagesSinceLastPopup >= guestChatLimit) {
                setShowLimitPopup(true);
                setLastPopupCount(newCount);
              }
            }
          } else {
            setGuestChatCount((prev) => {
              const newCount = prev + 1;
              // Check if we should show popup after increment
              if (isGuest && guestChatLimit !== null && guestChatLimit > 0) {
                const messagesSinceLastPopup = newCount - lastPopupCount;
                if (messagesSinceLastPopup >= guestChatLimit) {
                  setShowLimitPopup(true);
                  setLastPopupCount(newCount);
                }
              }
              return newCount;
            });
          }
          if (data.chatLimit !== undefined) {
            setGuestChatLimit(data.chatLimit);
          }

          // Update URL to /guest/:threadId if this is the first message and we're on /guest
          if (isGuest && data.threadId && window.location.pathname === "/guest") {
            navigate(`/guest/${data.threadId}`, { replace: true });
          }
        } else {
          // For authenticated users, update query cache
          if (thread) {
            // Update thread detail cache (title and/or messages)
            queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
              if (!old) return old;

              const updated = { ...old };

              // Update title if changed
              if (data.title_name && data.title_name !== thread.title) {
                updated.title = data.title_name;
              }

              // Add assistant message if available
              if (data.assistantMessage) {
                updated.messages = [
                  ...old.messages,
                  {
                    id: data.message_id || `temp-assistant-${Date.now()}`,
                    role: "assistant",
                    content: data.assistantMessage,
                    replies: data.replies || [],
                    createdAt: new Date().toISOString(),
                  },
                ];
                logAnalyticsEvent("chat_message_received", {
                  thread_id: id,
                  response_length: data.assistantMessage.length
                });
                return updated;
              }

              return updated;
            });

            // If title changed, invalidate threads list to ensure sidebar updates
            if (data.title_name && data.title_name !== thread.title) {
              queryClient.invalidateQueries({ queryKey: ["threads"] });
            }
          }
        }
      }

      // Only invalidate threads list (for sidebar) if user is not a guest
      // Guest users don't have a sidebar, so no need to refetch threads
      if (!isGuestUser()) {
        queryClient.invalidateQueries({ queryKey: ["threads"] });
      }
      // Refocus input after sending
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 0);
      setIsSending(false);
    },
    onSettled: () => {
      console.log("[ChatPage] sendMessage.onSettled");
      setIsSending(false);
    },
    onError: (error: any, variables: string) => {
      console.log("[ChatPage] sendMessage.onError:", error);
      setIsSending(false);
      const errorMessage = extractErrorMessage(error, "Failed to send message");

      // Store the failed message for retry (use the message that was sent)
      const failedMessage = variables || lastFailedMessage || message.trim();
      setLastFailedMessage(failedMessage);

      logAnalyticsEvent("chat_messsagefailedToSend", {
        thread_id: id,
        error: errorMessage
      });

      if (isGuest) {
        // For guest users, add error message instead of removing user message
        setGuestMessages((prev) => {
          // Remove the last temp user message
          const filtered = prev.filter((msg, index) => {
            if (index === prev.length - 1 && msg.id?.startsWith("temp-user-")) {
              return false;
            }
            return true;
          });

          // Add error message
          return [
            ...filtered,
            {
              id: `error-${Date.now()}`,
              role: "assistant" as const,
              content: errorMessage.includes("ECONNRESET") || errorMessage.includes("502") || errorMessage.includes("Failed to communicate")
                ? "Failed to communicate with external API: " + errorMessage
                : errorMessage,
              createdAt: new Date().toISOString(),
              isError: true,
              originalUserMessage: failedMessage,
            },
          ];
        });
      } else {
        // For authenticated users, add error message to thread
        queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
          if (!old) return old;

          // Remove the last temp user message
          const filteredMessages = old.messages.filter((msg, index) => {
            if (index === old.messages.length - 1 && msg.id?.startsWith("temp-user-")) {
              return false;
            }
            return true;
          });

          // Add error message
          const errorMsg: Message = {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: errorMessage.includes("ECONNRESET") || errorMessage.includes("502") || errorMessage.includes("Failed to communicate")
              ? "Failed to communicate with external API: " + errorMessage
              : errorMessage,
            createdAt: new Date().toISOString(),
            isError: true,
            originalUserMessage: failedMessage,
          };

          return { ...old, messages: [...filteredMessages, errorMsg] };
        });
      }

      // Refocus input after error
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 0);

      // Check if it's a 401 error (handled by interceptor, but show message)
      if (error.response?.status === 401 || error.response?.data?.code === 401) {
        // Redirect is handled by interceptor, just show message
        toast.error("Session expired. Please log in again.");
      } else {
        // Error is already shown in chat, just show a brief toast
        toast.error("Message failed to send");
      }
      setIsSending(false);
    },
  });


  // Auto-focus input when sending finishes
  useEffect(() => {
    if (!isSending) {
      setTimeout(() => {
        const input = messageInputRef.current;
        if (input && document.activeElement !== input) {
          input.focus();
        }
      }, 100);
    }
  }, [isSending]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = messageInputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`; // Max height of 200px
    }
  }, [message]);
 
  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, isSending]);

  const sendText = (text: string) => {
    const trimmedMessage = text.trim();
    if (!trimmedMessage || isSending) {
      console.log("[ChatPage] sendText: skipping - trimmed:", trimmedMessage, "isSending:", isSending);
      return;
    }

    console.log("[ChatPage] sendText: sending message:", trimmedMessage, "isGuest:", isGuest);
    setIsSending(true);

    // Store message for potential retry
    setLastFailedMessage(trimmedMessage);

    if (isGuest) {
      // Remove any previous error messages
      setGuestMessages((prev) => {
        return prev.filter((msg) => !msg.isError).map(msg => ({
          ...msg,
          replies: undefined
        }));
      });

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
      // Remove any previous error messages
      queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
        if (!old) return old;
        const filteredMessages = old.messages
          .filter((msg) => !msg.isError)
          .map(msg => ({
            ...msg,
            replies: undefined
          }));
        return { ...old, messages: filteredMessages };
      });
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

    console.log("[ChatPage] sendText: calling sendMessage.mutate");
    sendMessage.mutate(trimmedMessage);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    setMessage("");
    sendText(trimmedMessage);
    // Reset textarea height
    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
    }
  };

  const handleFeedback = async (messageId: string, stars: number) => {
    if (!messageId || messageId.startsWith("temp-")) {
      toast.error("Cannot give feedback on this message yet");
      return;
    }

    try {
      await api.post("/feedback", {
        type: "message",
        messageId,
        stars,
        comment: stars === 5 ? "Liked" : "Disliked"
      });

      if (stars === 5) {
        toast.success("Thanks for your feedback.");
      } else {
        toast.success("Thanks for the feedback, we’ll improve this.");
      }

      // Update local state to show feedback was given (optional UI feedback)
      const updateMsg = (msgs: Message[]) =>
        msgs.map(m => m.id === messageId ? { ...m, feedback: [{ stars }] } : m);

      if (isGuest) {
        setGuestMessages(prev => updateMsg(prev));
      } else {
        queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
          if (!old) return old;
          return { ...old, messages: updateMsg(old.messages) };
        });
      }
    } catch (error) {
      console.error("[ChatPage] Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
    }
  };

  useEffect(() => {
    if (!state.autoSendText || hasAutoSentRef.current) return;

    const checkAndSend = () => {
      if (hasAutoSentRef.current) return;

      // Don't use setTimeout unless necessary, but check if we are ready
      if (isGuest) {
        // Wait until location state is ready and hasBootstrapData is true
        if (!id || !hasBootstrapData) {
          setTimeout(checkAndSend, 10);
          return;
        }
      } else {
        const cachedThread = queryClient.getQueryData(["thread", id]);
        if (!id || !cachedThread) {
          setTimeout(checkAndSend, 10);
          return;
        }
      }

      console.log("[ChatPage] Auto-send: ready, calling sendText");
      hasAutoSentRef.current = true;
      sendText(state.autoSendText!);
    };

    checkAndSend();
  }, [id, state.autoSendText, state.bootstrapThread, isGuest, guestMessages.length, queryClient]);

  // Hide disclaimer after 2 user messages are sent
  useEffect(() => {
    if (displayMessages.length > 0) {
      // Count user messages
      const userMessageCount = displayMessages.filter(msg => msg.role === "user").length;
      // Hide disclaimer after 2 user messages
      if (userMessageCount >= 2 && showDisclaimer) {
        setShowDisclaimer(false);
      }
    }
  }, [displayMessages, showDisclaimer]);

  // Reset suggestionUsed when a new assistant message arrives
  useEffect(() => {
    const lastAssistantMessage = [...displayMessages]
      .reverse()
      .find(m => m.role === "assistant" && !m.isError);

    if (lastAssistantMessage) {
      setSuggestionUsed(false);
    }
  }, [displayMessages.filter(m => m.role === "assistant").length]);

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
            onClick={() => navigate("/user/threads")}
            className="text-blue-600 hover:underline"
          >
            Back to threads
          </button>
        </div>
      </div>
    );
  }

  const chatContent = (
    <div className="flex flex-col h-full relative bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {(displayMessages.length === 0 && (isLoading || (state.autoSendText && !hasAutoSentRef.current))) ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                {state.autoSendText ? "Setting up your chat..." : "Loading messages..."}
              </p>
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <p>Start a conversation by sending a message below.</p>
            </div>
          ) : (
            <>
              {displayMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user"
                      ? "text-gray-800 dark:text-gray-200 bg-blue-100 dark:bg-blue-900/30"
                      : msg.isError
                        ? "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                        : "text-gray-600 dark:text-gray-300"
                      }`}
                  >
                    <MessageFormatter content={msg.content} />

                    {msg.role === "assistant" && !msg.isError && !msg.id.startsWith("temp-") && (
                      <div className="mt-2 flex items-center gap-2">
                        {(() => {
                          const isLastAssistantMessage = [...displayMessages]
                            .reverse()
                            .find(m => m.role === "assistant" && !m.isError)?.id === msg.id;

                          if (!isLastAssistantMessage) return null;

                          const hasLiked = msg.feedback?.some(f => f.stars === 5);
                          const hasDisliked = msg.feedback?.some(f => f.stars === 2);

                          return (
                            <>
                              <button
                                onClick={() => handleFeedback(msg.id, 5)}
                                className={`p-1.5 rounded-lg transition ${hasLiked
                                  ? "text-blue-600 bg-blue-50 dark:bg-blue-900/40"
                                  : "text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                  }`}
                                title="Like"
                                disabled={hasLiked || hasDisliked}
                              >
                                <ThumbsUp className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, 2)}
                                className={`p-1.5 rounded-lg transition ${hasDisliked
                                  ? "text-red-600 bg-red-50 dark:bg-red-900/40"
                                  : "text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                  }`}
                                title="Dislike"
                                disabled={hasLiked || hasDisliked}
                              >
                                <ThumbsDown className={`h-4 w-4 ${hasDisliked ? "fill-current" : ""}`} />
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {msg.isError && msg.originalUserMessage && (
                      <button
                        onClick={() => {
                          if (!msg.originalUserMessage) return;
                          // Remove error message and retry
                          if (isGuest) {
                            setGuestMessages((prev) => prev.filter((m) => m.id !== msg.id));
                          } else {
                            queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
                              if (!old) return old;
                              return { ...old, messages: old.messages.filter((m) => m.id !== msg.id) };
                            });
                          }
                          // Retry sending the message
                          logAnalyticsEvent("thread_refreshed", { thread_id: id });
                          sendText(msg.originalUserMessage);
                        }}
                        disabled={isSending}
                        className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-800 dark:text-red-300 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed border border-red-300 dark:border-red-800"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Try again
                      </button>
                    )}
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
          {/* Suggested replies from the last assistant message */}
          {(() => {
            // Find the last assistant message that has replies
            const lastAssistantMessageWithReplies = [...displayMessages]
              .reverse()
              .find(m => m.role === "assistant" && m.replies && m.replies.length > 0);

            // Only show suggestions if the last message is from the assistant and hasn't been used yet
            const isLastMessageAssistant = displayMessages.length > 0 && displayMessages[displayMessages.length - 1].role === "assistant";

            if (lastAssistantMessageWithReplies?.replies && lastAssistantMessageWithReplies.replies.length > 0 && !suggestionUsed && isLastMessageAssistant) {
              return (
                <div className="flex flex-col items-center gap-3 mb-2 mt-[10px] w-full">
                  <div className="flex overflow-x-auto gap-3 pb-2 w-full no-scrollbar">
                    {lastAssistantMessageWithReplies.replies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={async () => {
                          if (isSending) return;
                          setSuggestionUsed(true);

                          logAnalyticsEvent("suggestion_selected", {
                            thread_id: id,
                            suggestion: reply
                          });

                          // Place text in input instead of auto-sending
                          setMessage(reply);

                          // Focus input
                          setTimeout(() => {
                            messageInputRef.current?.focus();
                          }, 0);

                          try {
                            await api.post("/threads/suggestion-click", {
                              suggestion: reply,
                              threadId: id,
                            });
                          } catch (error) {
                            console.error("[ChatPage] Error logging suggestion click:", error);
                          }
                        }}
                        disabled={isSending}
                        className="px-5 py-3 w-[190px] bg-blue-100 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-[12px] leading-normal font-normal transition disabled:opacity-50 disabled:cursor-not-allowed text-left [text-wrap-mode:wrap] flex-shrink-0"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Terms and Privacy Disclaimer - Above input field */}
          {showDisclaimer && (
            <div className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 pr-8 flex items-center">
              <button
                onClick={() => setShowDisclaimer(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                aria-label="Close disclaimer"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pr-6 text-center w-full">
                By messaging MetaMindful, an AI mental wellness chatbot, you agree to our{" "}
                <Link
                  to="/terms"
                  target="_blank"
                  className="font-semibold underline hover:text-gray-700 dark:hover:text-gray-300"
                >
                  terms
                </Link>{" "}
                and have read our{" "}
                <Link
                  to="/privacy-policy"
                  target="_blank"
                  className="font-semibold underline hover:text-gray-700 dark:hover:text-gray-300"
                >
                  privacy policy
                </Link>
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-end gap-3 p-4">
            <textarea
              ref={messageInputRef}
              className="flex-1 min-w-0 px-6 py-3 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base border-0 bg-gray-100 dark:bg-gray-700 rounded-xl resize-none min-h-[48px] max-h-[200px] overflow-y-auto"
              placeholder="Type here ....."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isSending}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || isSending}
              className="bg-yellow-300 hover:bg-yellow-400 p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0 mb-1"
            >
              <ArrowUp className="h-5 w-5 text-gray-900" strokeWidth={2.5} fill="none" />
            </button>
          </div>

          {/* Guest user login/signup prompt - text only */}
          {isGuest && (
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
          )}
        </div>
      </div>

      {/* Chat Limit Popup */}
      {showLimitPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">
              Save your progress
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
              Guest chats don't stay forever. Log in or sign up to save this thread and create more.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLimitPopup(false);
                  // Reset counter when skipped - next popup will show after another 10 messages
                  setLastPopupCount(guestChatCount);
                }}
                className="flex-1 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 px-5 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  setShowLimitPopup(false);
                  // Reset counter when login clicked - next popup will show after another 10 messages
                  setLastPopupCount(guestChatCount);
                  setShowLoginPopup(true);
                }}
                className="flex-1 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-yellow-500 disabled:opacity-50"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // For guest users, wrap with GuestTopbar and Toaster
  if (isGuest) {
    return (
      <>
        <div className="h-screen bg-background text-foreground overflow-hidden">
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <div className="flex h-full flex-col">
            <GuestTopbar />
            <main className="flex-1 overflow-hidden">{chatContent}</main>
          </div>
        </div>
        <LoginPopup
          isOpen={showLoginPopup}
          onClose={() => {
            setShowLoginPopup(false);
            setShowSignupPopup(false);
          }}
          currentThreadId={id}
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
          currentThreadId={id}
          onSwitchToLogin={() => {
            setShowSignupPopup(false);
            setShowLoginPopup(true);
          }}
        />
      </>
    );
  }

  // For authenticated users, return content directly (AppShell will wrap it)
  return chatContent;
}