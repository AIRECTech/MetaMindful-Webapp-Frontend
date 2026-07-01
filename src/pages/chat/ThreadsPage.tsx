import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowRight, X, Send, User, Cloud, Trophy } from "lucide-react";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { logAnalyticsEvent } from "../../lib/firebase";
import { useTimeOnScreen } from "../../hooks/useTimeOnScreen";

interface Thread {
  id: string;
  threadId: string; // externalThreadId (UUID)
  title: string;
  desc?: string;
  next_action?: string;
  actions?: Array<{ id: string; action: string; description?: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

const suggestedTags = ["I am stuck", "Facing stress", "Work Issues", "Balance diet"];

export function ThreadsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useTimeOnScreen("threads-list", "ThreadsPage");

  const { data, isLoading } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const res = await api.get("/threads");
      return res.data.data as Thread[];
    },
  });

  useEffect(() => {
    if (data) {
      logAnalyticsEvent("thread_list_viewed", { thread_count: data.length });
    } else if (!isLoading) {
      logAnalyticsEvent("thread_list_viewed", { thread_count: 0 });
    }
  }, [data, isLoading]);

  const createThread = useMutation({
    mutationFn: async (title: string) => {
      const res = await api.post("/threads", { title });
      return res.data.data;
    },
    onSuccess: (thread, title) => {
      logAnalyticsEvent("thread_created", {
        thread_id: thread.threadId || thread.id,
        title
      });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      setNewThreadTitle("");
      setSelectedTags([]);
      navigate(`/user/chat/${thread.threadId || thread.id}`, {
        state: {
          bootstrapThread: {
            ...thread,
            messages: thread.messages || [],
          }
        }
      });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create thread"));
    },
  });

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCreateThread = () => {
    const title = newThreadTitle.trim() || selectedTags.join(", ") || "New Thread";
    if (!title) return;
    createThread.mutate(title);
  };

  const getValuedActionsCount = (thread: Thread) => {
    return thread.actions?.length || 0;
  };

  const getLastStepText = (thread: Thread) => {
    if (thread.actions && thread.actions.length > 0) {
      const lastAction = thread.actions[thread.actions.length - 1];
      return `Last step: ${lastAction.description || lastAction.action}`;
    }
    return "Last step: You just created this thread. That's a step toward change.";
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Threads</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading threads...</div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {data.map((thread) => {
            const valuedActionsCount = getValuedActionsCount(thread);
            return (
              <div
                key={thread.id}
                className="bg-blue-50 border border-blue-100 rounded-xl p-5 hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/user/chat/${thread.threadId || thread.id}`)}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 flex-1">{thread.title}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/chat/${thread.threadId || thread.id}`);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                    {valuedActionsCount > 0
                      ? `${String(valuedActionsCount).padStart(2, "0")} valued actions`
                      : "-valued actions"}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4">{getLastStepText(thread)}</p>

                <div className="flex items-center gap-2 mb-4">
                  <User className="h-4 w-4 text-gray-400" />
                  <Cloud className="h-4 w-4 text-gray-400" />
                  {valuedActionsCount > 0 && <Trophy className="h-4 w-4 text-gray-400" />}
                </div>

                {thread.next_action ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/chat/${thread.threadId || thread.id}`);
                    }}
                    className="w-full text-left bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium px-4 py-2 rounded-lg text-sm transition"
                  >
                    Next step: {thread.next_action}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    <span>Next step: Choose a small task</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200"
              >
                {tag}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Start a new thread here..."
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateThread();
              }
            }}
          />
          <button
            onClick={handleCreateThread}
            disabled={(!newThreadTitle.trim() && selectedTags.length === 0) || createThread.isPending}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {suggestedTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedTags.includes(tag)
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}