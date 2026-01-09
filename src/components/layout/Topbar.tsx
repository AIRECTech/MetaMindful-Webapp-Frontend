import { LogOut } from "lucide-react";
import { NotificationBell } from "../NotificationBell";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { clearTokens, isAuthenticated } from "../../lib/auth";
import { toast } from "react-hot-toast";

export function Topbar() {
  const navigate = useNavigate();
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
    navigate("/", { replace: true });
  };

  return (
    <header className="flex items-center justify-between px-4 py-3">
    
        <div className="flex flex-col items-start">
        </div>
      <div className="flex items-center gap-3">
   
        
        {authenticated ? (
          // Authenticated users: Show notifications and sign out
          <>
            <NotificationBell />
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </>
        ) : (
          // Not authenticated (edge case - should not happen in AppShell)
          <button
            onClick={() => navigate("/signup")}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg text-sm transition"
          >
            Sign up
          </button>
        )}
      </div>
    </header>
  );
}