import { useNavigate, useParams } from "react-router-dom";
import { cn } from "../../lib/utils";
import { MessageSquare, User, Settings, Plus, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useLocation } from "react-router-dom";

interface Thread {
  id: string;
  title: string;
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: currentThreadId } = useParams<{ id?: string }>();
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  const { data: threads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const res = await api.get("/threads");
      return res.data.data as Thread[];
    },
  });

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo at top */}
      <div className="p-4 border-b border-gray-200">
        <div 
          className="flex items-center cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img 
            src="/logo.png" 
            alt="MetaMindful" 
            className="h-8 w-auto"
          />
        </div>
      </div>

      {/* Threads section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {/* New Thread button */}
          <button
            onClick={() => navigate("/chat/new")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-sm font-medium text-gray-700 mb-2"
          >
            <Plus className="h-4 w-4" />
            New Thread
          </button>

          {/* Threads list */}
          <div className="space-y-1 mt-2">
            {threads && threads.length > 0 ? (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => navigate(`/chat/${thread.id}`)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-left truncate",
                    currentThreadId === thread.id
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                  title={thread.title}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate flex-1">{thread.title}</span>
                </button>
              ))
            ) : (
              <div className="text-xs text-gray-400 px-3 py-2 text-center">
                No threads yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Bottom section: Profile, Theme, Settings */}
      <div className="p-2 space-y-1">
        <button
          onClick={() => navigate("/profile")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
            location.pathname === "/profile"
              ? "bg-gray-100 text-gray-900 font-medium"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <User className="h-4 w-4" />
          Profile
        </button>

        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
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
          onClick={() => navigate("/settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
            location.pathname === "/settings"
              ? "bg-gray-100 text-gray-900 font-medium"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}