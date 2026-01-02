import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { setTokens, getDeviceId, getAccessToken } from "../../lib/auth";
import { extractErrorMessage } from "../../lib/errors";

export function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"signup" | "verify">("signup");

  const register = useMutation({
    mutationFn: async () => {
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match");
      }
      if (formData.password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      const deviceId = getDeviceId();
      const guestToken = getAccessToken();
      const res = await api.post(
        "/auth/register",
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          deviceId,
        },
        {
          headers: guestToken ? { Authorization: `Bearer ${guestToken}` } : {},
        }
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success("Registration successful! Please verify your email.");
      setStep("verify");
    },
    onError: (error) => {
      const message = extractErrorMessage(error, "Registration failed");
      toast.error(message);
    },
  });

  const verifyEmail = useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/verify-email", {
        email: formData.email,
        code: verificationCode,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      toast.success("Email verified! Welcome!");
      navigate("/", { replace: true });
    },
    onError: (error) => {
      const message = extractErrorMessage(error, "Verification failed");
      toast.error(message);
    },
  });

  const resendCode = useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/resend-verification-code", {
        email: formData.email,
      });
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

  if (step === "verify") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card title="Verify Email" className="w-full max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We've sent a verification code to <strong>{formData.email}</strong>. Please enter it below.
            </p>
            <label className="space-y-1 text-sm font-medium">
              Verification Code
              <input
                type="text"
                className="w-full rounded-xl border border-border bg-background px-3 py-2"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder="123456"
                maxLength={6}
                required
              />
            </label>
            <button
              type="button"
              onClick={() => verifyEmail.mutate()}
              className="w-full rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={verifyEmail.isPending || !verificationCode}
            >
              {verifyEmail.isPending ? "Verifying..." : "Verify Email"}
            </button>
            <button
              type="button"
              onClick={() => resendCode.mutate()}
              className="w-full rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-secondary"
              disabled={resendCode.isPending}
            >
              {resendCode.isPending ? "Sending..." : "Resend Code"}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card title="Sign Up" className="w-full max-w-md">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            register.mutate();
          }}
        >
          <label className="space-y-1 text-sm font-medium">
            Name
            <input
              type="text"
              className="w-full rounded-xl border border-border bg-background px-3 py-2"
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Your name"
              required
              autoComplete="name"
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Email
            <input
              type="email"
              className="w-full rounded-xl border border-border bg-background px-3 py-2"
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Password
            <input
              type="password"
              className="w-full rounded-xl border border-border bg-background px-3 py-2"
              value={formData.password}
              onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="At least 8 characters"
              required
              autoComplete="new-password"
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Confirm Password
            <input
              type="password"
              className="w-full rounded-xl border border-border bg-background px-3 py-2"
              value={formData.confirmPassword}
              onChange={(event) => setFormData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={register.isPending}
          >
            {register.isPending ? "Creating account..." : "Sign Up"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
