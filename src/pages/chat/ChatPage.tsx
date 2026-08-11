import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowUp, X, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { logAnalyticsEvent } from "../../lib/firebase";
import { useTimeOnScreen } from "../../hooks/useTimeOnScreen";
import { ensureToken, isGuestUser, getDeviceId, getAccessToken, setTokens } from "../../lib/auth";
import { LoginPopup } from "../../components/LoginPopup";
import { SignupPopup } from "../../components/SignupPopup";
import { useChatToast } from "../../contexts/ChatToastContext";
import { MessageFormatter } from "../../components/chat/MessageFormatter";
import { InlineThreadCard } from "../../components/chat/InlineThreadCard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  isError?: boolean;
  originalUserMessage?: string; // Store the original user message for retry
  retry?: boolean; // Show retry button when backend signals ui_element.retry = true
  replies?: string[];
  feedback?: any[]; // To track if feedback was given
  requiresSignup?: boolean;
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
  const isSendingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Check if user is guest by auth status OR by route path (/guest/:id)
  const isGuestRoute = location.pathname.startsWith("/guest");
  const isGuest = isGuestUser() || isGuestRoute;
  const hasAutoSentRef = useRef(false);

  useTimeOnScreen("chat", "ChatPage", { thread_id: id });

  useEffect(() => {
    logAnalyticsEvent("chat_screen_view", { thread_id: id });
    setShowThreadCard(false);
    
    if (id) {
      const saved = localStorage.getItem(`toast_thread_card_${id}`);
      setThreadCardDetails(saved ? JSON.parse(saved) : []);
    } else {
      setThreadCardDetails([]);
    }
  }, [id]);

  const {
    setToastData,
    resetToasts,
    setOnOpenThreadCard,
    setOnOpenSignupPopup
  } = useChatToast();

  // For guest users, manage messages in local state instead of fetching thread
  const [guestMessages, setGuestMessages] = useState<Message[]>([]);
  const [guestThreadTitle, setGuestThreadTitle] = useState<string>("New Chat");

  const [guestChatLimit, setGuestChatLimit] = useState<number | null>(null);
  const [lastPopupCount, setLastPopupCount] = useState<number>(0); // Track count when popup was last shown
  const [showGuestAuthPrompt, setShowGuestAuthPrompt] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const [isAuthGate, setIsAuthGate] = useState(false);
  const [showThreadCard, setShowThreadCard] = useState(false);
  const [hasExercise, setHasExercise] = useState(() => {
    if (!id) return false;
    return localStorage.getItem(`toast_has_exercise_${id}`) === 'true';
  });
  const [hasExerciseCompleted, setHasExerciseCompleted] = useState(() => {
    if (!id) return false;
    return localStorage.getItem(`toast_exercise_completed_${id}`) === 'true';
  });
  const [hasAction, setHasAction] = useState(() => {
    if (!id) return false;
    return localStorage.getItem(`toast_has_action_${id}`) === 'true';
  });
  const [hasActionCompleted, setHasActionCompleted] = useState(() => {
    if (!id) return false;
    return localStorage.getItem(`toast_action_completed_${id}`) === 'true';
  });
  const [threadCardDetails, setThreadCardDetails] = useState<{ label: string; value: string }[]>(() => {
    if (!id) return [];
    const saved = localStorage.getItem(`toast_thread_card_${id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null); // Store last failed message for retry
  // Only show disclaimer for guest users
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    // Only show for new guest users on initial load
    return isGuestUser() && !document.cookie.includes("mm_has_chat=1");
  });
  const [suggestionUsed, setSuggestionUsed] = useState(false);

  // Restore guest auth prompt state on reload
  useEffect(() => {
    if (isGuest && id) {
      const shouldShow = localStorage.getItem(`guest_auth_prompt_${id}`);
      if (shouldShow === 'true') {
        setShowGuestAuthPrompt(true);
      }
    }
  }, [id, isGuest]);

  const state = (location.state || {}) as {
    bootstrapThread?: Thread;
    autoSendText?: string;
  };

  // Check if we have bootstrap data from navigation state
  // Only trust bootstrap data if it's NOT a reload
  const hasBootstrapData = !!(state.bootstrapThread && (state.bootstrapThread.threadId === id || state.bootstrapThread.id === id));
  // After window.location.href (full page reload), router state is lost and React Query cache is cleared
  // So hasBootstrapData is always false and cache is empty, which means we always fetch
  // Only skip fetching if we have bootstrap data (from router state, not cache)
  // After signup/login with window.location.href, there's no bootstrap data, so we always fetch

  const {
    data: thread,
    isLoading,
    isFetching
  } = useQuery({
    queryKey: ["thread", id],
    queryFn: async () => {
      // Ensure token before fetching thread
      await ensureToken();
      const res = await api.get(`/threads/${id}`);
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
    // If we have bootstrap data, we still want to fetch in the background to get 
    // any messages that might be in the database but not in the bootstrap data (like the initial greeting)
    // or to get the latest chat counts/limits.
    enabled: !!id,
    refetchOnMount: true,
    staleTime: 0, // Always refetch on mount to ensure fresh data
    gcTime: Infinity,
  });

  // Use guest messages for guest users, thread messages for authenticated users
  const displayMessages = isGuest ? guestMessages : (thread?.messages || []);

  // Sync with ChatToastContext
  useEffect(() => {
    setToastData({
      hasExercise,
      hasExerciseCompleted,
      hasAction,
      hasActionCompleted,
      hasThreadCard: threadCardDetails.length > 0,
      userMessageCount: displayMessages.filter(m => m.role === 'user').length
    });
  }, [hasExercise, hasExerciseCompleted, hasAction, hasActionCompleted, threadCardDetails, displayMessages, setToastData]);

  // Set modal trigger callbacks
  useEffect(() => {
    setOnOpenThreadCard(() => setShowThreadCard(true));
    setOnOpenSignupPopup(() => setShowSignupPopup(true));

    return () => {
      setOnOpenThreadCard(null);
      setOnOpenSignupPopup(null);
    };
  }, [setOnOpenThreadCard, setOnOpenSignupPopup]);

  // Reset toasts on unmount
  useEffect(() => {
    return () => {
      resetToasts();
    };
  }, [resetToasts]);

  // If we navigated here from NewChatPage, we can prefill the cache and avoid /threads/:id
  useEffect(() => {
    if (!id || !state.bootstrapThread || state.bootstrapThread.threadId !== id) return;

    queryClient.setQueryData(["thread", id], state.bootstrapThread);

    if (isGuest) {
      setGuestMessages((prev) => prev.length === 0 ? (state.bootstrapThread!.messages || []) : prev);
      setGuestThreadTitle(state.bootstrapThread.title || "New Chat");

      if (state.bootstrapThread.chatCount !== undefined) {
        setLastPopupCount((prev) => prev === 0 ? state.bootstrapThread!.chatCount! : prev);
      }
      if (state.bootstrapThread.chatLimit !== undefined) {
        setGuestChatLimit(state.bootstrapThread.chatLimit);
      }
    }
  }, [id, isGuest, queryClient, state.bootstrapThread]);



  // Diagnostic logs
  console.log("[ChatPage Render Log]", {
    id,
    isGuest,
    hasThread: !!thread,
    isLoading,
    isFetching,
    hasBootstrapData,
    displayMessagesLength: displayMessages.length,
    locationState: location.state,
  });

  // When thread data is loaded (from API or cache), update guest state if needed
  useEffect(() => {
    if (!id) return;
    if (!isGuest) return;
    if (!thread) return;

    // Sync guest messages if they are empty (page reload) OR 
    // if the thread has more messages than local state (background sync)
    if (thread.messages && thread.messages.length > 0) {
      if (guestMessages.length === 0) {
        setGuestMessages(thread.messages);
      } else if (thread.messages.length !== guestMessages.length) {
        // Sync if counts differ and we don't have active temp messages that are about to be replaced
        const hasTempMessages = guestMessages.some(m => m.id?.startsWith("temp-"));
        if (!hasTempMessages) {
          setGuestMessages(thread.messages);
        }
      }

      if (thread.title && thread.title !== guestThreadTitle) {
        setGuestThreadTitle(thread.title);
      }
    }

    // Update chat count and limit from thread data
    if (thread.chatCount !== undefined) {
      const count = thread.chatCount;
      // Initialize lastPopupCount if not already set
      if (lastPopupCount === 0 && count > 0) {
        setLastPopupCount(count);
      }
    }
    if (thread.chatLimit !== undefined) {
      setGuestChatLimit(thread.chatLimit);
    }
  }, [id, isGuest, thread, guestMessages.length]);

  // Sync threadCardDetails when thread data is loaded/updated
  useEffect(() => {
    if (!thread) return;
    const threadCardData = (thread as any).thread_card;
    const threadCard = threadCardData?.thread_card;
    if (threadCard && threadCardData?.show_thread_card) {
      const details = [
        { label: "Thread name", value: threadCardData.title_name || thread.title || "" },
        { label: "What’s the sign?", value: threadCard.trigger || threadCard.primary_trigger || "" },
        { label: "What to do differently?", value: threadCard.move_that_helped || threadCard.primary_move || "" },
      ].filter(item => item.value !== "");

      if (details.length > 0) {
        setThreadCardDetails(details);
        if (id) {
          localStorage.setItem(`toast_thread_card_${id}`, JSON.stringify(details));
        }
      }
    }
  }, [thread, id]);

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      // Ensure user has a token (generate guest token if needed)
      await ensureToken();

      const res = await api.post("/threads/chat", {
        threadId: id,
        message: text,
      }, {
        timeout: 300000 // 5 minute timeout for AI response
      });

      return res.data.data;
    },
    onSuccess: (data, variables) => {
      setIsSending(false);
      isSendingRef.current = false;

      logAnalyticsEvent("chat_message_sent", {
        thread_id: id,
        message_length: variables.length
      });
      // Update thread data from chat API response instead of refetching
      // Update thread data from chat API response instead of refetching
      if (data) {
        const assistantMsgId = data.message?.id || `local-assistant-${Date.now()}`;
        if (data.message?.suggested_replies && data.message.suggested_replies.length > 0) {
          localStorage.setItem(
            `suggested_replies_${id}_${assistantMsgId}`,
            JSON.stringify(data.message.suggested_replies)
          );
        }

        const shouldRetry = data.ui_element?.retry === true;

        const assistantMsg: Message = {
          id: assistantMsgId,
          role: "assistant" as const,
          content: data.message?.assistantMessage,
          replies: data.message?.suggested_replies || [],
          requiresSignup: data.message?.auth_gate?.should_show || false,
          createdAt: new Date().toISOString(),
          ...(shouldRetry ? { retry: true, originalUserMessage: variables } : {}),
        };

        const userMsg: Message = {
          id: `local-user-${Date.now()}-confirmed`,
          role: "user" as const,
          content: variables,
          createdAt: new Date().toISOString(),
        };

        if (isGuest) {
          // Update query cache for guests too, so it's ready on reload
          queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
            if (!old) return old;
            const updated = { ...old };
            updated.messages = [
              ...old.messages.filter(m => !m.id?.startsWith("temp-")),
              userMsg,
              assistantMsg,
            ];
            if (data.thread_card?.title_name) updated.title = data.thread_card.title_name;
            if (data.chatCount !== undefined) updated.chatCount = data.chatCount;
            if (data.chatLimit !== undefined) updated.chatLimit = data.chatLimit;
            return updated;
          });

          // For guest users, update local state
          if (data.message?.assistantMessage) {
            setGuestMessages((prev) => {
              console.log("BEFORE:", prev);
              const newMessages: Message[] = [
                ...prev.filter(m => !m.id?.startsWith("temp-")),
                userMsg,
                assistantMsg,
              ];
              console.log("AFTER:", newMessages);
              logAnalyticsEvent("chat_message_received", {
                thread_id: id,
                response_length: data.message.assistantMessage.length
              });
              return newMessages;
            });
          }

          // Update title if changed
          if (data.thread_card?.title_name && data.thread_card.title_name !== guestThreadTitle) {
            setGuestThreadTitle(data.thread_card.title_name);
          }

          if (isGuest) {
            let isExerciseCompleted = localStorage.getItem(`exercise_completed_for_${id}`) === 'true';
            if (data.ui_element?.user_wants_to_skip_exercise || data.ui_element?.exercise_completed) {
              isExerciseCompleted = true;
              localStorage.setItem(`exercise_completed_for_${id}`, 'true');
            }

            if (isExerciseCompleted) {
              const dismissedAt = localStorage.getItem(`guest_auth_prompt_dismissed_at_${id}`);
              const currentChatCount = data.chatCount || displayMessages.filter(m => m.role === 'user').length + 1;

              if (!dismissedAt) {
                setShowGuestAuthPrompt(true);
                localStorage.setItem(`guest_auth_prompt_${id}`, 'true');
              } else {
                const dismissedAtCount = parseInt(dismissedAt, 10);
                if (currentChatCount - dismissedAtCount >= 2) {
                  setShowGuestAuthPrompt(true);
                  localStorage.removeItem(`guest_auth_prompt_dismissed_at_${id}`);
                  localStorage.setItem(`guest_auth_prompt_${id}`, 'true');
                }
              }
            } else {
              // Normal guestChatLimit logic
              if (data.chatCount !== undefined) {
                // Check if we should show popup after count update
                if (guestChatLimit !== null && guestChatLimit > 0) {
                  const messagesSinceLastPopup = data.chatCount - lastPopupCount;
                  if (messagesSinceLastPopup >= guestChatLimit) {
                    setShowGuestAuthPrompt(true);
                    localStorage.setItem(`guest_auth_prompt_${id}`, 'true');
                    setLastPopupCount(data.chatCount);
                  }
                }
              }
            }
          }
          if (data.chatLimit !== undefined) {
            setGuestChatLimit(data.chatLimit);
          }

          // Update URL to /guest/:threadId if this is the first message and we're on /guest
          if (isGuest && data.threadId && window.location.pathname === "/guest") {
            navigate(`/guest/${data.threadId}`, { replace: true });
          }
        }

        // Handle Conditional Toasts (Detect created vs completed)
        if (data.ui_element?.show_reminder_card) {
          setHasAction(true);
          setHasActionCompleted(false);
          if (id) {
            localStorage.setItem(`toast_has_action_${id}`, 'true');
            localStorage.removeItem(`toast_action_completed_${id}`);
          }
        } else {
          setHasAction(false);
          if (id) {
            localStorage.removeItem(`toast_has_action_${id}`);
          }
        }
        const isActionCompleted = !!data.ui_element?.action?.completed_at;
        if (data.ui_element?.action && isActionCompleted) {
          setHasAction(false);
          setHasActionCompleted(true);
          if (id) {
            localStorage.removeItem(`toast_has_action_${id}`);
            localStorage.setItem(`toast_action_completed_${id}`, 'true');
          }
        } else {
          setHasActionCompleted(false);
          if (id) {
            localStorage.removeItem(`toast_action_completed_${id}`);
          }
        }

        if (data.ui_element?.show_exercise_card) {
          setHasExercise(true);
          setHasExerciseCompleted(false);
          if (id) {
            localStorage.setItem(`toast_has_exercise_${id}`, 'true');
            localStorage.removeItem(`toast_exercise_completed_${id}`);
          }
        } else {
          setHasExercise(false);
          if (id) {
            localStorage.removeItem(`toast_has_exercise_${id}`);
          }
        }
        if (data.ui_element?.exercise_completed === true) {
          setHasExercise(false);
          setHasExerciseCompleted(true);
          if (id) {
            localStorage.removeItem(`toast_has_exercise_${id}`);
            localStorage.setItem(`toast_exercise_completed_${id}`, 'true');
          }
        } else if (data.ui_element?.exercise_completed === false) {
          setHasExerciseCompleted(false);
          if (id) {
            localStorage.removeItem(`toast_exercise_completed_${id}`);
          }
        }

        // Handle Thread Card Data
        const threadCard = data.thread_card?.thread_card;
        if (threadCard && data.ui_element?.show_thread_card) {
          const details = [
            { label: "Thread name", value: data.thread_card.title_name || thread?.title || "" },
            { label: "What’s the sign?", value: threadCard.trigger || threadCard.primary_trigger || "" },
            { label: "What to do differently?", value: threadCard.move_that_helped || threadCard.primary_move || "" },
          ].filter(item => item.value !== "");

          if (details.length > 0) {
            setThreadCardDetails(details);
            if (id) localStorage.setItem(`toast_thread_card_${id}`, JSON.stringify(details));
          }
        }

        if (!isGuest) {
          // For authenticated users, update query cache
          if (thread) {
            // Update thread detail cache (title and/or messages)
            queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
              if (!old) return old;

              const updated = { ...old };

              // Update title if changed
              if (data.thread_card?.title_name && data.thread_card.title_name !== thread.title) {
                updated.title = data.thread_card.title_name;
              }

              // Add confirmed user message and assistant message
              const newMessages = [
                ...old.messages.filter(m => !m.id?.startsWith("temp-")),
                userMsg,
              ];

              // Add assistant message if available
              if (data.message?.assistantMessage) {
                newMessages.push({
                  id: data.message.id || `local-assistant-${Date.now()}`,
                  role: "assistant",
                  content: data.message.assistantMessage,
                  replies: data.message.suggested_replies || [],
                  requiresSignup: data.message.auth_gate?.should_show || false,
                  createdAt: new Date().toISOString(),
                  ...(shouldRetry ? { retry: true, originalUserMessage: variables } : {}),
                });
                logAnalyticsEvent("chat_message_received", {
                  thread_id: id,
                  response_length: data.message.assistantMessage.length
                });
              }

              updated.messages = newMessages;
              return updated;
            });

            // If title changed, invalidate threads list to ensure sidebar updates
            if (data.thread_card?.title_name && data.thread_card.title_name !== thread.title) {
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
        if (window.innerWidth > 768) {
          messageInputRef.current?.focus();
        }
      }, 0);
      setIsSending(false);
      isSendingRef.current = false;
    },
    onSettled: () => {
      setIsSending(false);
      isSendingRef.current = false;
    },
    onError: (error: any, variables: string) => {
      setIsSending(false);
      isSendingRef.current = false;

      const statusCode = error.response?.status || error.response?.data?.code;
      const isRetryable = statusCode === 502;
      const isInternalError = statusCode === 500;

      let errorMessage = extractErrorMessage(error, "Failed to send message");
      if (isInternalError) {
        errorMessage = "Service currently not working. Please check again after sometime.";
      }

      // Store the failed message for retry (use the message that was sent)
      const failedMessage = variables || lastFailedMessage || message.trim();
      setLastFailedMessage(failedMessage);

      logAnalyticsEvent("chat_messsagefailedToSend", {
        thread_id: id,
        error: errorMessage
      });

      const errorPayload: any = {
        id: `error-${Date.now()}`,
        role: "assistant" as const,
        content: errorMessage,
        createdAt: new Date().toISOString(),
        isError: true,
      };

      // Only add originalUserMessage if it's retryable (502)
      if (isRetryable) {
        errorPayload.originalUserMessage = failedMessage;
      }

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
            errorPayload,
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
          return { ...old, messages: [...filteredMessages, errorPayload] };
        });
      }

      // Refocus input after error
      setTimeout(() => {
        if (window.innerWidth > 768) {
          messageInputRef.current?.focus();
        }
      }, 0);

      // Check if it's a 401 error (handled by interceptor, but show message)
      if (error.response?.status === 401 || error.response?.data?.code === 401) {
        // Redirect is handled by interceptor, just show message
        toast.error("Session expired. Please log in again.");
      } else {
        // More descriptive error messaging
        const isTimeout = error.code === 'ECONNABORTED' || errorMessage.toLowerCase().includes('timeout');
        if (isTimeout) {
          toast.error("Message is taking longer than expected. It might still be processing. Please wait or refresh the page.");
        } else if (errorMessage.includes("502") || errorMessage.includes("504")) {
          toast.error("The server is taking too long to respond. Your message might still be sent.");
        } else {
          toast.error(errorMessage || "Message failed to send");
        }
      }
      setIsSending(false);
      isSendingRef.current = false;
    },
  });

  const socialSignup = useMutation({
    mutationFn: async ({ provider, providerToken, name }: { provider: "google" | "apple"; providerToken: string; name?: string }) => {
      const deviceId = getDeviceId();
      await ensureToken();
      const token = getAccessToken();

      const payload: any = {
        provider,
        providerToken,
        name,
        deviceId,
      };
      if (id) {
        payload.currentThreadId = id;
      }
      const res = await api.post(
        "/auth/social",
        payload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      return res.data;
    },
    onSuccess: (data) => {
      const responseData = data.data || data;
      if (!responseData.accessToken) {
        toast.error("Signup failed: No access token received");
        return;
      }
      setTokens(responseData.accessToken, responseData.refreshToken, false);
      toast.success("Welcome!");
      // Store pending auto-send message to send after reload
      // sessionStorage.setItem("pending_auto_send_message", "I signed up");
      // Force reload to current thread as authenticated user with a small delay
      // to ensure database migrations fully commit and the toast is visible
      setTimeout(() => {
        window.location.href = `/user/chat/${id}`;
      }, 800);
    },
    onError: (error) => {
      const message = extractErrorMessage(error, "Social signup failed");
      toast.error(message);
    },
  });

  const handleGoogleSignup = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      toast.error("Google Client ID not configured.");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'openid email profile';
    const nonce = Math.random().toString(36).substring(2, 15);
    const state = Math.random().toString(36).substring(2, 15);

    sessionStorage.setItem('google_oauth_state', state);
    sessionStorage.setItem('google_oauth_nonce', nonce);
    if (id) {
      sessionStorage.setItem('google_oauth_threadId', id);
    }

    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&response_type=id_token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&nonce=${encodeURIComponent(nonce)}&state=${encodeURIComponent(state)}`;

    const popup = window.open(googleAuthUrl, 'Google Sign Up', `width=${width},height=${height},left=${left},top=${top}`);

    if (!popup) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }

    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'GOOGLE_OAUTH_SUCCESS' && event.data.id_token) {
        window.removeEventListener('message', messageListener);
        popup?.close();

        const storedState = sessionStorage.getItem('google_oauth_state');
        if (event.data.state !== storedState) {
          toast.error("Security error: Invalid state");
          return;
        }

        socialSignup.mutate({
          provider: "google",
          providerToken: event.data.id_token,
        });

        sessionStorage.removeItem('google_oauth_state');
        sessionStorage.removeItem('google_oauth_nonce');
        sessionStorage.removeItem('google_oauth_threadId');
      } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
        window.removeEventListener('message', messageListener);
        popup?.close();
        toast.error("Google signup failed");
      }
    };

    window.addEventListener('message', messageListener);
  };

  const handleAppleSignup = () => {
    const clientId = import.meta.env.VITE_APPLE_CLIENT_ID || '';
    if (!clientId) {
      toast.error("Apple Client ID not configured.");
      return;
    }

    const scriptId = 'apple-signin-script';
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.onload = () => {
        setTimeout(() => initAppleSignIn(), 100);
      };
      document.head.appendChild(script);
    } else {
      setTimeout(() => initAppleSignIn(), 100);
    }

    function initAppleSignIn() {
      if (typeof window !== 'undefined' && (window as any).AppleID && (window as any).AppleID.auth) {
        try {
          (window as any).AppleID.auth.init({
            clientId: clientId,
            scope: 'name email',
            redirectURI: `${window.location.origin}/auth/apple/callback`,
            usePopup: true,
          });

          (window as any).AppleID.auth.signIn().then((response: any) => {
            const idToken = response.id_token || response.authorization?.id_token;
            if (idToken) {
              let name: string | undefined;
              const userObject = response.user || response.authorization?.user;
              if (userObject?.name) {
                const firstName = userObject.name.firstName || '';
                const lastName = userObject.name.lastName || '';
                name = `${firstName} ${lastName}`.trim() || undefined;
              }
              socialSignup.mutate({ provider: "apple", providerToken: idToken, name });
            }
          }).catch((error: any) => {
            if (error?.error !== 'popup_closed_by_user' && error?.error !== 'user_cancelled_authorize') {
              toast.error(error?.message || "Apple signup failed");
            }
          });
        } catch (error) {
          toast.error("Apple Sign In failed");
        }
      }
    }
  };


  // Auto-focus input when sending finishes
  useEffect(() => {
    if (!isSending) {
      setTimeout(() => {
        const input = messageInputRef.current;
        if (input && document.activeElement !== input && window.innerWidth > 768) {
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
    const scrollToBottom = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }
    };

    scrollToBottom();
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [displayMessages, isSending]);

  const sendText = (text: string) => {
    const trimmedMessage = text.trim();
    if (!trimmedMessage || isSending || isSendingRef.current) {
      return;
    }

    // Mark suggestions as used for the last assistant message
    const lastAssistant = [...displayMessages]
      .reverse()
      .find(m => m.role === "assistant" && !m.isError);
    if (lastAssistant && id) {
      localStorage.setItem(`suggestion_used_${id}_${lastAssistant.id}`, "true");
    }
    setSuggestionUsed(true);

    setIsSending(true);
    isSendingRef.current = true;

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
        return newMessages;
      });
    } else {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      // Only cancel if we actually have data in the cache, otherwise we cancel the initial load request
      if (queryClient.getQueryData(["thread", id])) {
        queryClient.cancelQueries({ queryKey: ["thread", id] });
      }

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
        return { ...old, messages: newMessages };
      });
    }

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
    const sessionKey = `has_sent_auto_message_${id}`;
    const alreadySentInSession = !!id && sessionStorage.getItem(sessionKey) === 'true';

    // Check if there is a pending auto-send message from signup/login
    const pendingAutoSendText = sessionStorage.getItem("pending_auto_send_message");
    const autoSendTextToUse = state.autoSendText || pendingAutoSendText;

    // DIAGNOSTIC LOGS - useful for debugging auto-send issues
    console.log("[ChatPage] Auto-send check:", {
      id,
      autoSendText: autoSendTextToUse,
      hasAutoSent: hasAutoSentRef.current,
      alreadySentInSession,
      isGuest,
      hasBootstrapData,
      isSending
    });

    if (alreadySentInSession) {
      hasAutoSentRef.current = true;
      if (pendingAutoSendText) {
        sessionStorage.removeItem("pending_auto_send_message");
      }
      return;
    }

    if (!autoSendTextToUse || hasAutoSentRef.current) return;

    // As long as we have an ID and we're not currently sending, we should trigger the auto-send
    // This is more resilient than waiting for bootstrap data or cache synchronization
    /*
    if (id && !isSending) {
      console.log("[ChatPage] Conditions met, triggering auto-send");
      hasAutoSentRef.current = true;
      sessionStorage.setItem(sessionKey, 'true');
      if (pendingAutoSendText) {
        sessionStorage.removeItem("pending_auto_send_message");
      }
      sendText(autoSendTextToUse);
    }
    */
  }, [id, state.autoSendText, hasBootstrapData, isGuest, queryClient, isSending]);

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

  // Reset/Load suggestionUsed when a new assistant message arrives or displays
  useEffect(() => {
    const lastAssistantMessage = [...displayMessages]
      .reverse()
      .find(m => m.role === "assistant" && !m.isError);

    if (lastAssistantMessage && id) {
      const key = `suggestion_used_${id}_${lastAssistantMessage.id}`;
      const isUsed = localStorage.getItem(key) === "true";
      setSuggestionUsed(isUsed);
    } else {
      setSuggestionUsed(false);
    }
  }, [id, displayMessages.filter(m => m.role === "assistant").length]);

  // Show loading indicator while fetching thread data
  // Use isFetching (not just isLoading) so we cover the full network request duration.
  // After signup via window.location.href, isLoading can briefly be false before the
  // query transitions to pending — isFetching stays true the whole time.
  if ((isLoading || isFetching) && !hasBootstrapData && displayMessages.length === 0) {
    return (
      <div className="flex flex-col h-full relative bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
            <p className="text-gray-500 dark:text-gray-400">Loading your chat...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state for authenticated users if thread not found.
  // Guard against isFetching too — avoids a false "Thread not found" while the
  // request is still in flight (e.g. immediately after signup redirect).
  if (!isGuest && !thread && !isLoading && !isFetching && !hasBootstrapData) {
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 space-y-6">
          {(displayMessages.length === 0 && (isLoading || isSending || (state.autoSendText && !hasAutoSentRef.current))) ? (
            <div className="text-center py-12">
              {/* Show different spinner for different states */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                {(state.autoSendText && !hasAutoSentRef.current) || isSending ? "Setting up your chat..." : "Loading messages..."}
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
                    {!msg.retry && <MessageFormatter content={msg.content} />}

                    {msg.role === "assistant" && isGuest && msg.requiresSignup && (() => {
                      const isLastMessage = displayMessages[displayMessages.length - 1]?.id === msg.id;
                      if (!isLastMessage) return null;

                      return (
                        <div className="mt-6 mb-6 flex flex-col items-start gap-4 w-full">
                          <button
                            onClick={handleGoogleSignup}
                            disabled={socialSignup.isPending}
                            className="w-[60%] flex items-center justify-center gap-3 py-3 px-6 rounded-full border border-yellow-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm disabled:opacity-50"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-gray-700 dark:text-gray-200 text-sm font-medium">Continue with Google account</span>
                          </button>

                          <button
                            onClick={handleAppleSignup}
                            disabled={socialSignup.isPending}
                            className="w-[60%] flex items-center justify-center gap-3 py-3 px-6 rounded-full border border-yellow-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm disabled:opacity-50"
                          >
                            <svg className="h-5 w-5 dark:fill-white" viewBox="0 0 24 24" fill="#000000">
                              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                            </svg>
                            <span className="text-gray-700 dark:text-gray-200 text-sm font-medium">Continue with Apple account</span>
                          </button>

                          <div className="w-[60%] flex justify-center">
                            <button
                              onClick={() => {
                                setIsAuthGate(true);
                                setShowSignupPopup(true);
                              }}
                              className="text-gray-600 dark:text-gray-400 underline hover:text-gray-800 dark:hover:text-gray-200 transition text-sm text-center"
                            >
                              Continue with multi-step email verification
                            </button>
                          </div>

                          <button
                            onClick={() => sendText("No, I don't want to signup")}
                            className="mt-2 w-[60%] py-3 px-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition border border-gray-200 dark:border-gray-600"
                          >
                            No, I don't want to signup
                          </button>
                        </div>
                      );
                    })()}

                    {msg.role === "assistant" && !msg.isError && !msg.retry && !msg.id.startsWith("temp-") && (
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

                    {!msg.isError && msg.retry && msg.originalUserMessage && displayMessages[displayMessages.length - 1]?.id === msg.id && (
                      <button
                        onClick={() => {
                          if (!msg.originalUserMessage) return;
                          // Remove the assistant retry-bubble AND the preceding user message
                          const removeRetryMessages = (messages: Message[]) => {
                            const assistantIdx = messages.findIndex((m) => m.id === msg.id);
                            const filtered = messages.filter((m, i) => {
                              if (m.id === msg.id) return false; // remove assistant retry bubble
                              // remove the user message immediately before this assistant message
                              if (i === assistantIdx - 1 && m.role === "user") return false;
                              return true;
                            });
                            return filtered;
                          };
                          if (isGuest) {
                            setGuestMessages((prev) => removeRetryMessages(prev));
                          } else {
                            queryClient.setQueryData(["thread", id], (old: Thread | undefined) => {
                              if (!old) return old;
                              return { ...old, messages: removeRetryMessages(old.messages) };
                            });
                          }
                          logAnalyticsEvent("thread_refreshed", { thread_id: id });
                          sendText(msg.originalUserMessage);
                        }}
                        disabled={isSending}
                        className="mt-3 flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600"
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
          <div ref={messagesEndRef} className="h-0" />
        </div>
      </div>

      <div className="pb-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 w-full">
          {/* Suggested replies from the last assistant message */}
          {(() => {
            // Find the last assistant message
            const lastAssistantMessage = [...displayMessages]
              .reverse()
              .find(m => m.role === "assistant" && !m.isError);

            let replies: string[] = [];
            if (lastAssistantMessage) {
              if (lastAssistantMessage.replies && lastAssistantMessage.replies.length > 0) {
                replies = lastAssistantMessage.replies;
              } else if (id) {
                const stored = localStorage.getItem(`suggested_replies_${id}_${lastAssistantMessage.id}`);
                if (stored) {
                  try {
                    replies = JSON.parse(stored);
                  } catch (e) {
                    console.error("Failed to parse suggested replies from localStorage", e);
                  }
                }
              }
            }

            // Only show suggestions if the last message is from the assistant and hasn't been used yet
            const isLastMessageAssistant = displayMessages.length > 0 && displayMessages[displayMessages.length - 1].role === "assistant";

            const messageLimit = parseInt(import.meta.env.VITE_MESSAGE_LIMIT || "0", 10);
            const userMessageCount = displayMessages.filter(msg => msg.role === 'user').length;
            const isLimitReached = messageLimit > 0 && userMessageCount >= messageLimit;

            if (replies.length > 0 && !suggestionUsed && isLastMessageAssistant && !isLimitReached) {
              const lastMessage = displayMessages[displayMessages.length - 1];
              const requiresSignup = isGuest && lastMessage?.role === "assistant" && lastMessage?.requiresSignup;

              if (requiresSignup) return null;

              return (
                <div className="flex flex-col items-center gap-3 mb-8 mt-2 w-full">
                  <div className="flex overflow-x-auto gap-3 pb-2 w-full no-scrollbar">
                    {replies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={async () => {
                          if (isSending || requiresSignup) return;
                          
                          // Mark as used in localStorage
                          const lastAssistant = [...displayMessages]
                            .reverse()
                            .find(m => m.role === "assistant" && !m.isError);
                          if (lastAssistant && id) {
                            localStorage.setItem(`suggestion_used_${id}_${lastAssistant.id}`, "true");
                          }
                          setSuggestionUsed(true);

                          logAnalyticsEvent("suggestion_selected", {
                            thread_id: id,
                            suggestion: reply
                          });

                          // Place text in input instead of auto-sending
                          setMessage(reply);

                          // Focus input
                          setTimeout(() => {
                            if (window.innerWidth > 768) {
                              messageInputRef.current?.focus();
                            }
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
                        disabled={isSending || !!requiresSignup}
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
          {!isGuest && showDisclaimer && (
            <div className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 pr-8 flex items-center">
              <button
                onClick={() => setShowDisclaimer(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                aria-label="Close disclaimer"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pr-6 text-center w-full">
                By messaging MetaMindful, you confirm you are 16+ and agree to our{" "}
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

          {(() => {
            const lastMessage = displayMessages[displayMessages.length - 1];
            const requiresSignup = isGuest && lastMessage?.role === "assistant" && lastMessage?.requiresSignup;
            const messageLimit = parseInt(import.meta.env.VITE_MESSAGE_LIMIT || "0", 10);
            const userMessageCount = displayMessages.filter(msg => msg.role === 'user').length;
            const isLimitReached = messageLimit > 0 && userMessageCount >= messageLimit;

            console.log("[ChatPage] Message limit check:", {
              importMetaLimit: import.meta.env.VITE_MESSAGE_LIMIT,
              messageLimit,
              userMessageCount,
              isLimitReached,
              isSending
            });

            if (isLimitReached && !isSending) {
              return (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-2xl border border-yellow-200 dark:border-yellow-800 shadow-sm p-6 text-center">
                  <p className="font-medium text-lg mb-2">Message Limit Reached</p>
                  <p className="mb-4">You have reached the maximum number of messages for this thread.</p>
                  {isGuest ? (
                    <button
                      onClick={() => {
                        setIsAuthGate(true);
                        setShowSignupPopup(true);
                      }}
                      className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-6 py-2 rounded-full font-medium transition"
                    >
                      Sign up to continue
                    </button>
                  ) : (
                    <Link to="/user" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-6 py-2 rounded-full font-medium transition">
                      Create a new thread to continue
                    </Link>
                  )}
                </div>
              );
            }

            if (requiresSignup) {
              return null;
            }

            return (
              <div className="relative">
                <InlineThreadCard
                  details={requiresSignup ? [] : threadCardDetails}
                  isOpen={showThreadCard}
                  onToggle={() => setShowThreadCard(!showThreadCard)}
                />
                <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-end gap-3 p-4">
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
                    disabled={isSending || !!requiresSignup}
                    rows={1}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || isSending || !!requiresSignup}
                    className="bg-yellow-300 hover:bg-yellow-400 p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0 mb-1"
                  >
                    <ArrowUp className="h-5 w-5 text-gray-900" strokeWidth={2.5} fill="none" />
                  </button>
                </div>
              </div>
            );
          })()}

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

      {/* Guest Auth Prompt Popup */}
      {false && showGuestAuthPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-xl relative">
            <button
              onClick={() => {
                setShowGuestAuthPrompt(false);
                localStorage.removeItem(`guest_auth_prompt_${id}`);
                if (localStorage.getItem(`exercise_completed_for_${id}`) === 'true') {
                  const currentChatCount = thread?.chatCount ?? displayMessages.filter(m => m.role === 'user').length;
                  localStorage.setItem(`guest_auth_prompt_dismissed_at_${id}`, currentChatCount.toString());
                }
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              aria-label="Close popup"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-4 text-center mt-2">
              Sign up or Login for free
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-center text-[15px] leading-relaxed">
              Guest chats don't stay forever. Log in or sign up to continue this thread and create more.
            </p>
            <button
              onClick={() => {
                setShowGuestAuthPrompt(false);
                setIsAuthGate(true);
                setShowSignupPopup(true);
              }}
              className="w-full rounded-full bg-[#facc15] px-5 py-3 text-[15px] font-medium text-gray-900 transition hover:bg-[#eab308]"
            >
              Sign up or Login
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {chatContent}
      <LoginPopup
        isOpen={showLoginPopup}
        onClose={() => {
          setShowLoginPopup(false);
          setShowSignupPopup(false);
          setIsAuthGate(false);
        }}
        currentThreadId={id}
        autoSend={isAuthGate}
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
          setIsAuthGate(false);
        }}
        currentThreadId={id}
        autoSend={isAuthGate}
        onSwitchToLogin={() => {
          setShowSignupPopup(false);
          setShowLoginPopup(true);
        }}
      />
    </>
  );
}