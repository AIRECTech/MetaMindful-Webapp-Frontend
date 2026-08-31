import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useTimeOnScreen } from "../../hooks/useTimeOnScreen";
import { CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ThreadAction {
  id: string;
  threadId: string;
  action: string;
  description?: string;
  actionStatus?: string;
  howItHelps?: string;
  threadTitle?: string;
  createdAt: string;
}

export function ActionsPage() {
  const navigate = useNavigate();
  useTimeOnScreen("actions-list", "ActionsPage");

  const { data, isLoading } = useQuery({
    queryKey: ["actions"],
    queryFn: async () => {
      const res = await api.get("/threads/all/actions");
      return (res.data.data || []) as ThreadAction[];
    },
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Actions</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading actions...</div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((actionItem) => (
            <div
              key={actionItem.id}
              onClick={() => navigate(`/user/chat/${actionItem.threadId}`)}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {actionItem.actionStatus === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {actionItem.description || actionItem.action}
                  </h3>
                  {actionItem.howItHelps && (
                    <p className="text-sm text-gray-600 mb-3">{actionItem.howItHelps}</p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-md">
                      {actionItem.threadTitle || "Thread"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(actionItem.createdAt))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-xl">
          <p>No actions found.</p>
          <p className="text-sm mt-2">Start chatting and committing to actions to see them here.</p>
        </div>
      )}
    </div>
  );
}
