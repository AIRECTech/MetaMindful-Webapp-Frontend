import { Bell, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../lib/api";
import { clearTokens } from "../../lib/auth";
import { extractErrorMessage } from "../../lib/errors";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { isAuthenticated } from "../../lib/auth";

export function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const authenticated = isAuthenticated();
  
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // Continue with logout even if API call fails
      console.error("Logout error:", error);
    }
    clearTokens();
    toast.success("Logged out successfully");
    navigate("/login", { replace: true });
  };

  const isNewChatPage = location.pathname === "/chat/new";

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex-1">
        {/* No title for new chat page - it's shown in the center of the chat area */}
      </div>
      <div className="flex items-center gap-3">
        {isNewChatPage ? (
          <>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 transition">
              <Bell className="h-4 w-4" />
            </button>
            <Link
              to="/signup"
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg text-sm transition"
            >
              Sign up
            </Link>
          </>
        ) : authenticated ? (
          <>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 transition">
              <Bell className="h-4 w-4" />
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm font-medium hover:bg-gray-100 transition"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </>
        ) : (
          <Link
            to="/signup"
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg text-sm transition"
          >
            Sign up
          </Link>
        )}
      </div>
    </header>
  );
}