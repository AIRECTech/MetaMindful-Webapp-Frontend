import { useNavigate, useParams } from "react-router-dom";
import { cn } from "../../lib/utils";
import { MessageSquare, Settings, Plus, Moon, Sun, LogOut, Edit2, Trash2, MoreVertical, X, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useLocation } from "react-router-dom";
import { clearTokens, isRealUser, isAuthenticated, isGuestUser } from "../../lib/auth";
import { extractErrorMessage } from "../../lib/errors";
import { toast } from "react-hot-toast";
import { getDarkMode, toggleDarkMode as toggleDarkModeUtil } from "../../lib/darkMode";

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
  const queryClient = useQueryClient();
  const [darkMode, setDarkMode] = useState(() => {
    return getDarkMode();
  });

  // Sync dark mode state with DOM changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark !== darkMode) {
        setDarkMode(isDark);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [darkMode]);
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

  // Update thread mutation
  const updateThread = useMutation({
    mutationFn: async ({ threadId, title }: { threadId: string; title: string }) => {
      const res = await api.put(`/threads/${threadId}`, { title });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      setEditingThreadId(null);
      setEditingTitle("");
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
      setShowMenuThreadId(null);
      toast.success("Thread deleted successfully");
      // If we deleted the current thread, navigate to new chat
      if (currentThreadId === showMenuThreadId) {
        navigate("/user/chat/new");
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
  }, [location.pathname]);

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

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // For older dates, show formatted date
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  };

  const toggleDarkMode = () => {
    const newMode = toggleDarkModeUtil();
    setDarkMode(newMode);
  };

  const handleLogout = async () => {
    try {
      // Try to call logout endpoint if user is logged in
      if (isRealUser()) {
        await api.post("/auth/logout");
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.error("Logout API call failed:", error);
    }
    // Clear tokens and redirect to login
    clearTokens();
    navigate("/");
  };

  const isGuest = isGuestUser();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200 dark:border-gray-700">
      {/* Logo at top */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img 
            src="/logo.png" 
            alt="MetaMindful" 
            className="h-8 w-auto"
          />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 dark:text-gray-200">MetaMindful</span>
            {isGuest && (
              <span className="text-xs text-gray-500 dark:text-gray-400">Guest mode</span>
            )}
          </div>
        </div>
      </div>

      {/* Threads section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {/* New Thread button */}
          <button
            onClick={() => navigate("/user/chat/new")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            <Plus className="h-4 w-4" />
            New Thread
          </button>

          {/* Threads list */}
          <div className="space-y-1 mt-2">
            {threads && threads.length > 0 ? (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg transition",
                    currentThreadId === (thread.threadId || thread.id)
                      ? "bg-gray-100 dark:bg-gray-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
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
                          // Auto-save on blur if there's a change
                          if (editingThreadId && editingTitle.trim() && editingTitle.trim() !== thread.title) {
                            handleSaveEdit();
                          } else {
                            handleCancelEdit();
                          }
                        }}
                        className="w-full px-2 py-1 text-sm text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden"
                        disabled={updateThread.isPending}
                      />
                    </div>
                  ) : (
                    // Normal mode
                    <>
                      <button
                        onClick={() => navigate(`/user/chat/${thread.threadId || thread.id}`)}
                        className={cn(
                          "flex-1 flex flex-col gap-1 px-3 py-2 text-sm transition text-left min-w-0",
                          currentThreadId === (thread.threadId || thread.id)
                            ? "text-gray-900 dark:text-gray-100 font-medium"
                            : "text-gray-600 dark:text-gray-400"
                        )}
                        title={thread.title}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MessageSquare className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate flex-1">{thread.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 ml-6">
                          <span>{formatDate(thread.updatedAt || thread.createdAt)}</span>
                          {(thread.actionsCount !== undefined && thread.actionsCount > 0) && (
                            <span>• {thread.actionsCount} action{thread.actionsCount !== 1 ? 's' : ''}</span>
                          )}
                          {(thread.exercisesCount !== undefined && thread.exercisesCount > 0) && (
                            <span>• {thread.exercisesCount} exercise{thread.exercisesCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
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
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded mr-2"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          
                          {/* Dropdown menu */}
                          {showMenuThreadId === (thread.threadId || thread.id) && (
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[120px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(thread);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
                              >
                                <Edit2 className="h-3 w-3" />
                                Rename
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(thread.threadId || thread.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                                disabled={deleteThread.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 dark:text-gray-500 px-3 py-2 text-center">
                No threads yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700"></div>

      {/* Bottom section: Theme, Settings, Logout */}
      <div className="p-2 space-y-1">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          {darkMode ? (
            <>
              <Sun className="h-4 w-4" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              Dark Mode
            </>
          )}
        </button>

        <button
          onClick={() => navigate("/user/settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
            location.pathname === "/user/settings"
              ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>

        {/* Logout button - only show if user is logged in */}
        {isRealUser() && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        )}
      </div>
    </aside>
  );
}