import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { extractErrorMessage } from "../../lib/errors";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get("email");
  const [email, setEmail] = useState(emailFromQuery || "");
  const [code, setCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");

  const verifyEmail = useMutation({
    mutationFn: async () => {
      // Clear previous error
      setError("");
      const res = await api.post("/auth/verify-email", { code: code.trim(), email: email.trim() });
      return res.data;
    },
    onSuccess: () => {
      setIsVerified(true);
      toast.success("Email verified successfully!");
    },
    onError: (error: any) => {
      const message = extractErrorMessage(error, "Verification failed");
      setError(message);
      toast.error(message);
    },
  });

  const resendCode = useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/resend-verification-code", { email });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Verification code sent!");
    },
    onError: (error) => {
      const message = extractErrorMessage(error, "Failed to resend code");
      toast.error(message);
    },
  });

  if (isVerified) {
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
              <h2 className="mb-2 text-2xl font-semibold text-gray-800">Email Verified!</h2>
              <p className="text-sm text-gray-600">
                Your email has been successfully verified. You can now log in to your account.
              </p>
            </div>

            <Link
              to="/login"
              className="block w-full rounded-xl bg-yellow-400 px-5 py-3 text-center text-sm font-semibold text-gray-800 transition hover:bg-yellow-500"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Verify Email Card */}
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          {/* Logo and Branding */}
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-3 flex items-center gap-2">
              <img src="/logo.png" alt="MetaMindful" className="h-8 w-auto" />
              <span className="text-2xl font-semibold text-gray-800">MetaMindful</span>
            </div>
          </div>
          
          <h2 className="mb-2 text-center text-2xl font-semibold text-gray-800">Verify Email</h2>
          <p className="mb-6 text-center text-sm text-gray-600">
            We've sent a verification code to <strong>{email || "your email"}</strong>. Please enter it below.
          </p>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              verifyEmail.mutate();
            }}
          >
            {!emailFromQuery && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
                <input
                  type="email"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError(""); // Clear error when typing
                  }}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Verification Code</span>
              <input
                type="text"
                className={`w-full rounded-xl border px-4 py-3 text-center text-2xl tracking-widest text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  error
                    ? "border-red-300 bg-red-50 focus:ring-red-400"
                    : "border-gray-200 bg-white focus:ring-yellow-400"
                }`}
                value={code}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(value);
                  setError(""); // Clear error when typing
                }}
                placeholder="000000"
                maxLength={6}
                required
                autoComplete="one-time-code"
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
              disabled={verifyEmail.isPending || !code || code.length !== 6 || !email}
            >
              {verifyEmail.isPending ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => resendCode.mutate()}
              disabled={resendCode.isPending || !email}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {resendCode.isPending ? "Sending..." : "Resend Code"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-gray-800 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

