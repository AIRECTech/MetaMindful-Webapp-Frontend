import { Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { clearTokens, isGuestUser, isAuthenticated } from "../../lib/auth";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";

export function Topbar() {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();
  const isGuest = isGuestUser();
  
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

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex-1">
        {/* No title for new chat page - it's shown in the center of the chat area */}
      </div>
      <div className="flex items-center gap-3">
        {isGuest ? (
          // Guest users: Show login and signup buttons
          <>
            <Link
              to="/login"
              className="px-4 py-2 bg-white border-2 border-yellow-400 text-gray-800 font-medium rounded-lg text-sm transition hover:bg-gray-50"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg text-sm transition"
            >
              Sign up
            </Link>
          </>
        ) : authenticated ? (
          // Real authenticated users: Show notifications and sign out
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
          // Not authenticated and not guest (edge case)
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