import { Navigate } from "react-router-dom";
import { isAuthenticated, isRealUser } from "../lib/auth";

interface RedirectIfAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Redirect authenticated users away from auth pages (like login/signup)
 * If user is authenticated and is a real user (not guest), redirect to user screen
 */
export function RedirectIfAuth({ children, redirectTo = "/user/chat/new" }: RedirectIfAuthProps) {
  // Check if user is authenticated and is a real user (not guest)
  if (isAuthenticated() && isRealUser()) {
    return <Navigate to={redirectTo} replace />;
  }
  
  // User is not authenticated or is a guest, show the children (login/signup page)
  return <>{children}</>;
}




