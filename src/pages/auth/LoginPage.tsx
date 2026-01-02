import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { setTokens, getDeviceId } from "../../lib/auth";
import { extractErrorMessage } from "../../lib/errors";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string })?.from ?? "/";
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [feedback, setFeedback] = useState<{ error: string }>({ error: "" });

  const login = useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/login", credentials);
      return res.data;
    },
    onSuccess: (data) => {
      console.log("[LoginPage] Login response received:", data);
      // Handle both wrapped and unwrapped responses
      const responseData = data.data || data;
      console.log("[LoginPage] Response data extracted:", responseData);
      console.log("[LoginPage] accessToken present:", !!responseData.accessToken);
      console.log("[LoginPage] refreshToken present:", !!responseData.refreshToken);
      
      if (!responseData.accessToken) {
        console.error("[LoginPage] No accessToken in response:", responseData);
        toast.error("Login failed: No access token received");
        return;
      }
      
      // Mark as real user (not guest) when logging in
      setTokens(responseData.accessToken, responseData.refreshToken, false);
      toast.success("Welcome back!");
      navigate(redirectTo, { replace: true });
    },
    onError: (error) => {
      const message = extractErrorMessage(error, "Invalid credentials");
      setFeedback({ error: message });
      toast.error(message);
    },
  });

  const guestLogin = useMutation({
    mutationFn: async () => {
      const deviceId = getDeviceId();
      const res = await api.post("/auth/guest-token", { deviceId });
      return res.data;
    },
    onSuccess: (data) => {
      // Handle both wrapped and unwrapped responses
      const responseData = data.data || data;
      if (!responseData.accessToken) {
        console.error("No accessToken in response:", responseData);
        toast.error("Failed to get access token");
        return;
      }
      // Mark as guest user when continuing as guest
      setTokens(responseData.accessToken, responseData.refreshToken, true);
      toast.success("Signed in as guest");
      navigate(redirectTo, { replace: true });
    },
    onError: (error) => {
      const message = extractErrorMessage(error, "Failed to sign in as guest");
      toast.error(message);
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card title="Sign In" className="w-full max-w-md">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            login.mutate();
          }}
        >
          <label className="space-y-1 text-sm font-medium">
            Email
            <input
              type="email"
              className="w-full rounded-xl border border-border bg-background px-3 py-2"
              value={credentials.email}
              onChange={(event) => setCredentials((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="your@email.com"
              required
              autoComplete="username"
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Password
            <input
              type="password"
              className="w-full rounded-xl border border-border bg-background px-3 py-2"
              value={credentials.password}
              onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="********"
              required
              autoComplete="current-password"
            />
          </label>
          {feedback.error && <p className="text-sm text-red-500">{feedback.error}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={login.isPending}
          >
            {login.isPending ? "Signing in..." : "Sign In"}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-border"></div>
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 border-t border-border"></div>
          </div>
          <button
            type="button"
            onClick={() => guestLogin.mutate()}
            className="w-full rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-secondary"
            disabled={guestLogin.isPending}
          >
            {guestLogin.isPending ? "Signing in..." : "Continue as Guest"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}