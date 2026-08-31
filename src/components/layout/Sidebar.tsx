import { useNavigate, useParams } from "react-router-dom";
import { cn } from "../../lib/utils";
import { MessageSquare, Settings, Search, Columns, ListTodo, Edit2, Trash2, MoreVertical, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useLocation } from "react-router-dom";
import { clearTokens, isRealUser, isAuthenticated, isGuestUser } from "../../lib/auth";
import { logAnalyticsEvent } from "../../lib/firebase";
import { LoginPopup } from "../LoginPopup";
import { SignupPopup } from "../SignupPopup";
import { extractErrorMessage } from "../../lib/errors";
import { toast } from "react-hot-toast";
import { useLayout } from "../../contexts/LayoutContext";

interface Thread {
  id: string;
  threadId: string; // externalThreadId (UUID)
  title: string;
  createdAt: string;
  updatedAt: string;
  actionsCount?: number;
  exercisesCount?: number;
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: currentThreadId } = useParams<{ id?: string }>();
  const isGuest = isGuestUser();
  const queryClient = useQueryClient();
  const { isSidebarOpen, closeSidebar } = useLayout();
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const [signupPopupText, setSignupPopupText] = useState<string | undefined>(undefined);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);
  const [showMenuThreadId, setShowMenuThreadId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Only fetch threads if user is authenticated (not guest)
  const isAuthenticatedUser = isAuthenticated() && isRealUser();

  const { data: threads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const res = await api.get("/threads");
      // The API returns { data: [...], total, page, pageSize }
      // Extract the threads array from the response
      return (res.data.data?.data || res.data.data || []) as Thread[];
    },
    enabled: isAuthenticatedUser, // Only fetch if user is authenticated
  });

  const { data: currentThread } = useQuery({
    queryKey: ["thread", currentThreadId || (isGuest ? localStorage.getItem("last_guest_thread_id") : null)],
    queryFn: async () => {
      const targetId = currentThreadId || localStorage.getItem("last_guest_thread_id");
      const res = await api.get(`/threads/${targetId}`);
      return res.data.data as Thread;
    },
    enabled: isGuest && (!!currentThreadId || !!localStorage.getItem("last_guest_thread_id")),
  });

  // Track the last guest thread ID
  useEffect(() => {
    if (isGuest && currentThreadId) {
      localStorage.setItem("last_guest_thread_id", currentThreadId);
    }
  }, [isGuest, currentThreadId]);

  const threadsToDisplay = isGuest
    ? (currentThread ? [currentThread] : [])
    : [...(threads || [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Update thread mutation
  const updateThread = useMutation({
    mutationFn: async ({ threadId, title }: { threadId: string; title: string }) => {
      const res = await api.put(`/threads/${threadId}`, { title });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      if (currentThreadId) {
        queryClient.invalidateQueries({ queryKey: ["thread", currentThreadId] });
      }
      setEditingThreadId(null);
      setEditingTitle("");
      logAnalyticsEvent("thread_renamed", { threadId: editingThreadId });
      toast.success("Thread renamed successfully");
    },
    onError: (error: Error) => {
      toast.error(extractErrorMessage(error, "Failed to rename thread"));
    },
  });

  // Delete thread mutation
  const deleteThread = useMutation({
    mutationFn: async (threadId: string) => {
      await api.delete(`/threads/${threadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      logAnalyticsEvent("thread_deleted", { threadId: showMenuThreadId });
      setShowMenuThreadId(null);
      toast.success("Thread deleted successfully");
      // If we deleted the current thread, navigate to new chat
      if (currentThreadId === showMenuThreadId) {
        navigate(isGuest ? "/guest" : "/user/chat/new");
      }
    },
    onError: (error: Error) => {
      toast.error(extractErrorMessage(error, "Failed to delete thread"));
    },
  });

  // Handle start editing
  const handleStartEdit = (thread: Thread) => {
    setEditingThreadId(thread.threadId || thread.id); // Use threadId (externalThreadId) for editing
    setEditingTitle(thread.title);
    setShowMenuThreadId(null);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (editingThreadId && editingTitle.trim()) {
      updateThread.mutate({ threadId: editingThreadId, title: editingTitle.trim() });
    } else {
      setEditingThreadId(null);
      setEditingTitle("");
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingThreadId(null);
    setEditingTitle("");
  };

  // Clear edit state when location changes (navigation)
  useEffect(() => {
    setEditingThreadId(null);
    setEditingTitle("");

    // Auto-close sidebar on mobile when navigating
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
  }, [location.pathname, closeSidebar]);

  // Handle delete with confirmation
  const handleDelete = (threadId: string) => {
    if (confirm("Are you sure you want to delete this thread? This action cannot be undone.")) {
      deleteThread.mutate(threadId);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenuThreadId && !(event.target as Element).closest(`[data-thread-menu="${showMenuThreadId}"]`)) {
        setShowMenuThreadId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenuThreadId]);

  // formatDate removed

  const handleLogout = async () => {
    try {
      if (isRealUser()) {
        logAnalyticsEvent("logout");
        await api.post("/auth/logout");
      }
    } catch (error) {
      console.error("Logout API call failed:", error);
    }
    clearTokens();
    navigate("/");
  };


  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[70] w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 h-full lg:relative",
        isSidebarOpen 
          ? "translate-x-0 lg:w-64 lg:border-r" 
          : "-translate-x-full lg:w-0 lg:border-r-0 lg:overflow-hidden lg:-translate-x-full"
      )}>
        {/* Logo and toggle/search at top */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => {
              navigate(isGuest ? "/guest" : "/user");
              if (window.innerWidth < 1024) closeSidebar();
            }}
          >
            <img
              src="/logo.png"
              alt="MetaMindful"
              className="h-7 w-auto"
            />
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-gray-800">MetaMindful</span>
              {isGuest && (
                <span className="text-[10px] text-gray-400 font-medium">Guest mode</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                toast.success("Search is coming soon!");
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={closeSidebar}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition"
              title="Close sidebar"
            >
              <Columns className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="p-2 space-y-1 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => {
              if (isGuest) {
                navigate("/guest");
              } else {
                navigate("/user/chat/new");
              }
              if (window.innerWidth < 1024) closeSidebar();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left",
              location.pathname === "/guest" || location.pathname === "/user/chat/new" || location.pathname === "/user"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-650 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <MessageSquare className="h-4.5 w-4.5 text-gray-500" />
            <span>New chat</span>
          </button>

          <button
            onClick={() => {
              if (isGuest) {
                setSignupPopupText("Create your free account to view and complete actions");
                setShowSignupPopup(true);
              } else {
                navigate("/user/actions");
              }
              if (window.innerWidth < 1024) closeSidebar();
            }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition",
              location.pathname === "/user/actions"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-650 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <div className="flex items-center gap-3">
              <ListTodo className="h-4.5 w-4.5 text-gray-500" />
              <span>Actions</span>
            </div>
            <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              New
            </span>
          </button>
        </div>

        {/* Threads section */}
        <div className="flex-1 overflow-y-auto mt-2">
          <div className="px-5 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Chats
          </div>
          <div className="p-2 space-y-1">
            {threadsToDisplay && threadsToDisplay.length > 0 ? (
              threadsToDisplay.map((thread) => (
                <div
                  key={thread.id}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-xl transition",
                    currentThreadId === (thread.threadId || thread.id)
                      ? "bg-gray-100"
                      : "hover:bg-gray-50/70"
                  )}
                  onMouseEnter={() => setHoveredThreadId(thread.threadId || thread.id)}
                  onMouseLeave={() => {
                    if (!showMenuThreadId) {
                      setHoveredThreadId(null);
                    }
                  }}
                >
                  {editingThreadId === (thread.threadId || thread.id) ? (
                    // Edit mode
                    <div className="flex-1 px-3 py-2 min-w-0">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveEdit();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            handleCancelEdit();
                          }
                        }}
                        onBlur={() => {
                          if (editingThreadId && editingTitle.trim() && editingTitle.trim() !== thread.title) {
                            handleSaveEdit();
                          } else {
                            handleCancelEdit();
                          }
                        }}
                        className="w-full px-2 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden"
                        disabled={updateThread.isPending}
                      />
                    </div>
                  ) : (
                    // Normal mode
                    <>
                      <button
                        onClick={() => navigate(isGuest ? `/guest/${thread.threadId || thread.id}` : `/user/chat/${thread.threadId || thread.id}`)}
                        className={cn(
                          "flex-1 px-4 py-2.5 text-sm transition text-left min-w-0 font-medium",
                          currentThreadId === (thread.threadId || thread.id)
                            ? "text-gray-900"
                            : "text-gray-650"
                        )}
                        title={thread.title}
                      >
                        <span className="truncate block">{thread.title}</span>
                      </button>

                      {/* Menu button - show on hover */}
                      {hoveredThreadId === (thread.threadId || thread.id) && (
                        <div className="relative" data-thread-menu={thread.threadId || thread.id}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const threadIdentifier = thread.threadId || thread.id;
                              setShowMenuThreadId(showMenuThreadId === threadIdentifier ? null : threadIdentifier);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-650 hover:bg-gray-100 rounded mr-2"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {/* Dropdown menu */}
                          {showMenuThreadId === (thread.threadId || thread.id) && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(thread);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-750 hover:bg-gray-50",
                                  isGuest ? "rounded-lg" : "rounded-t-lg"
                                )}
                              >
                                  <Edit2 className="h-3 w-3" />
                                  Rename
                                </button>
                                {!isGuest && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(thread.threadId || thread.id);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                                    disabled={deleteThread.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 px-3 py-2 text-center">
                  No chats yet
                </div>
              )}
            </div>
          </div>

        {/* Bottom section: Settings, Logout */}
        <div className="p-2 space-y-1 border-t border-gray-150 flex-shrink-0">
          <button
            onClick={() => {
              navigate("/user/settings");
              if (window.innerWidth < 1024) closeSidebar();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-left",
              location.pathname === "/user/settings"
                ? "bg-gray-100 text-gray-900 font-semibold"
                : "text-gray-650 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Settings className="h-4.5 w-4.5 text-gray-500" />
            <span>Settings</span>
          </button>

          {/* Logout button - only show if user is logged in */}
          {isRealUser() && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-650 hover:bg-red-50 transition text-left"
            >
              <LogOut className="h-4.5 w-4.5 text-red-500" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>

      <LoginPopup
        isOpen={showLoginPopup}
        onClose={() => {
          setShowLoginPopup(false);
          setShowSignupPopup(false);
          setSignupPopupText(undefined);
        }}
        currentThreadId={signupPopupText ? undefined : (currentThreadId || undefined)}
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
          setSignupPopupText(undefined);
        }}
        currentThreadId={signupPopupText ? undefined : (currentThreadId || undefined)}
        buttonText={signupPopupText}
        onSwitchToLogin={() => {
          setShowSignupPopup(false);
          setShowLoginPopup(true);
        }}
      />
    </>
  );
}