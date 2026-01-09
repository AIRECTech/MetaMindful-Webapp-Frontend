import { Navigate } from "react-router-dom";
import { isAuthenticated, isRealUser } from "../lib/auth";

/**
 * Redirect root route based on authentication status:
 * - If authenticated (real user) → redirect to /user/chat/new
 * - If not authenticated → redirect to /guest
 */
export function RedirectRoot() {
  if (isAuthenticated() && isRealUser()) {
    return <Navigate to="/user/chat/new" replace />;
  }
  
  // First-time visitors and non-authenticated users → redirect to guest route
  return <Navigate to="/guest" replace />;
}

