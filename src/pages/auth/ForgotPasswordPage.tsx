import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";
import { Mail } from "lucide-react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const requestReset = useMutation({
    mutationFn: async () => {
      setError(""); // Clear previous error
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      return res.data;
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success("If that email exists, a reset link was sent.");
    },
    onError: (error) => {
      const message = extractErrorMessage(error, "Failed to send reset link");
      setError(message);
      toast.error(message);
    },
  });

  if (isSubmitted) {
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
              <h2 className="mb-2 text-2xl font-semibold text-gray-800">Check your email</h2>
              <p className="text-sm text-gray-600">
                We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions to reset your password.
              </p>
            </div>

            <div className="space-y-4">
              <Link
                to="/login"
                className="block w-full rounded-xl bg-yellow-400 px-5 py-3 text-center text-sm font-semibold text-gray-800 transition hover:bg-yellow-500"
              >
                Back to Login
              </Link>
              <p className="text-center text-sm text-gray-600">
                Didn't receive the email?{" "}
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    requestReset.mutate();
                  }}
                  className="font-medium text-gray-800 hover:underline"
                >
                  Resend
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Forgot Password Card */}
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          {/* Logo and Branding */}
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-3 flex items-center gap-2">
              <img src="/logo.png" alt="MetaMindful" className="h-8 w-auto" />
              <span className="text-2xl font-semibold text-gray-800">MetaMindful</span>
            </div>
          </div>
          
          <h2 className="mb-2 text-center text-2xl font-semibold text-gray-800">Forgot Password?</h2>
          <p className="mb-6 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              requestReset.mutate();
            }}
          >
            <label className="relative block">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                className={`w-full rounded-xl border bg-white px-4 py-3 pl-11 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  error ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-yellow-400"
                }`}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(""); // Clear error when typing
                }}
                placeholder="Email"
                required
                autoComplete="email"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-yellow-500 disabled:opacity-50"
              disabled={requestReset.isPending}
            >
              {requestReset.isPending ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{" "}
            <Link to="/login" className="font-medium text-gray-800 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

