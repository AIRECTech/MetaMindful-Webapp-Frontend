import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { useTimeOnScreen } from "../../hooks/useTimeOnScreen";
import { Lock, Eye, EyeOff } from "lucide-react";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useTimeOnScreen("reset-password", "ResetPasswordPage");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid reset link. Please request a new one.");
      navigate("/forgot-password");
    }
  }, [token, navigate]);

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error("Reset token is missing");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      const res = await api.post("/auth/reset-password", { token, password });
      return res.data;
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast.success("Password reset successful!");
    },
    onError: (error) => {
      const message = extractErrorMessage(error, "Failed to reset password");
      toast.error(message);
    },
  });

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md">
          {/* Success Card */}
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            {/* Logo and Branding */}
            <div className="mb-4 flex flex-col items-center">
              <div className="mb-3 flex items-center gap-2">
                <img src="/logo.png" alt="MetaMindful" className="h-8 w-auto" />
                <span className="text-2xl font-semibold text-gray-800">MetaMindful</span>
              </div>
            </div>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-2xl font-semibold text-gray-800">Password Reset Successful</h2>
              <p className="text-sm text-gray-600">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
            </div>

            <Link
              to="/"
              className="block w-full rounded-xl bg-yellow-400 px-5 py-3 text-center text-sm font-semibold text-gray-800 transition hover:bg-yellow-500"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Reset Password Card */}
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          {/* Logo and Branding */}
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-3 flex items-center gap-2">
              <img src="/logo.png" alt="MetaMindful" className="h-8 w-auto" />
              <span className="text-2xl font-semibold text-gray-800">MetaMindful</span>
            </div>
          </div>

          <h2 className="mb-2 text-center text-2xl font-semibold text-gray-800">Reset Password</h2>
          <p className="mb-6 text-center text-sm text-gray-600">Enter your new password below.</p>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              resetPassword.mutate();
            }}
          >
            <label className="relative block">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pl-11 pr-11 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New Password"
                required
                autoComplete="new-password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </label>

            <label className="relative block">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pl-11 pr-11 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm New Password"
                required
                autoComplete="new-password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-yellow-500 disabled:opacity-50"
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{" "}
            <Link to="/" className="font-medium text-gray-800 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

