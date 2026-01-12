import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { api } from "../../lib/api";
import { setTokens, getDeviceId } from "../../lib/auth";
import { extractErrorMessage } from "../../lib/errors";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string })?.from ?? "/user/chat/new";
  const currentThreadId = (location.state as { threadId?: string })?.threadId;
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [feedback, setFeedback] = useState<{ error: string }>({ error: "" });

  const login = useMutation({
    mutationFn: async () => {
      const deviceId = getDeviceId();
      const payload: any = {
        email: credentials.email,
        password: credentials.password,
        deviceId,
      };
      // Include currentThreadId if provided (for guest user migration)
      if (currentThreadId) {
        payload.currentThreadId = currentThreadId;
      }
      const res = await api.post("/auth/login", payload);
      return res.data;
    },
    onSuccess: (data) => {
      console.log("[LoginPage] Login response received:", data);
      const responseData = data.data || data;
      console.log("[LoginPage] Response data extracted:", responseData);
      
      if (!responseData.accessToken) {
        console.error("[LoginPage] No accessToken in response:", responseData);
        toast.error("Login failed: No access token received");
        return;
      }
      
      // Check if email is verified
      if (responseData.user && !responseData.user.isEmailVerified) {
        // Email not verified - redirect to verification page
        setTokens(responseData.accessToken, responseData.refreshToken, false);
        toast("Please verify your email to continue", { icon: "ℹ️" });
        navigate(`/verify-email?email=${encodeURIComponent(credentials.email)}`, { replace: true });
        return;
      }
      
      setTokens(responseData.accessToken, responseData.refreshToken, false);
      toast.success("Welcome back!");
      // If currentThreadId is provided, redirect to that thread, otherwise use redirectTo
      if (currentThreadId) {
        window.location.href = `/user/chat/${currentThreadId}`;
      } else {
        navigate(redirectTo, { replace: true });
      }
    },
    onError: (error) => {
      const message = extractErrorMessage(error, "Invalid credentials");
      setFeedback({ error: message });
      toast.error(message);
    },
  });

  const socialLogin = useMutation({
    mutationFn: async ({ provider, providerToken, name }: { provider: "google" | "apple"; providerToken: string; name?: string }) => {
      const deviceId = getDeviceId();
      const payload: any = {
        provider,
        providerToken,
        name,
        deviceId,
      };
      // Include currentThreadId if provided (for guest user migration)
      if (currentThreadId) {
        payload.currentThreadId = currentThreadId;
      }
      const res = await api.post("/auth/social", payload);
      return res.data;
    },
    onSuccess: (data) => {
      const responseData = data.data || data;
      if (!responseData.accessToken) {
        toast.error("Login failed: No access token received");
        return;
      }
      setTokens(responseData.accessToken, responseData.refreshToken, false);
      toast.success("Welcome back!");
      // If currentThreadId is provided, redirect to that thread, otherwise use redirectTo
      if (currentThreadId) {
        window.location.href = `/user/chat/${currentThreadId}`;
      } else {
        navigate(redirectTo, { replace: true });
      }
    },
    onError: (error) => {
      const message = extractErrorMessage(error, "Social login failed");
      toast.error(message);
    },
  });

  const handleGuestLogin = () => {
    // Navigate to /guest route which will generate token and create thread
    navigate("/guest", { replace: true });
  };

  // Handle Google OAuth - use popup flow
  const handleGoogleLogin = () => {
    console.log("Google login button clicked");
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    console.log("Google Client ID:", clientId ? "Found" : "Not found");
    if (!clientId) {
      toast.error("Google Client ID not configured. Please check your .env file.");
      console.error("VITE_GOOGLE_CLIENT_ID is not set in environment variables");
      return;
    }
    
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'openid email profile';
    const nonce = Math.random().toString(36).substring(2, 15);
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state and nonce for verification
    sessionStorage.setItem('google_oauth_state', state);
    sessionStorage.setItem('google_oauth_nonce', nonce);
    sessionStorage.setItem('google_oauth_redirect', redirectTo);
    if (currentThreadId) {
      sessionStorage.setItem('google_oauth_threadId', currentThreadId);
    }
    
    // Use implicit flow to get ID token directly via popup
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&response_type=id_token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&nonce=${encodeURIComponent(nonce)}&state=${encodeURIComponent(state)}`;
    
    console.log("Opening Google OAuth popup:", googleAuthUrl);
    const popup = window.open(
      googleAuthUrl,
      'Google Sign In',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    if (!popup) {
      toast.error("Popup blocked. Please allow popups for this site.");
      console.error("Popup was blocked by browser");
      return;
    }
    
    // Listen for message from popup
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOOGLE_OAUTH_SUCCESS' && event.data.id_token) {
        window.removeEventListener('message', messageListener);
        popup?.close();
        
        // Verify state
        const storedState = sessionStorage.getItem('google_oauth_state');
        if (event.data.state !== storedState) {
          toast.error("Security error: Invalid state");
          return;
        }
        
        // Send token to backend (backend extracts email/name from token)
        socialLogin.mutate({
          provider: "google",
          providerToken: event.data.id_token,
        });
        
        // Clean up
        sessionStorage.removeItem('google_oauth_state');
        sessionStorage.removeItem('google_oauth_nonce');
        sessionStorage.removeItem('google_oauth_redirect');
        sessionStorage.removeItem('google_oauth_threadId');
      } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
        window.removeEventListener('message', messageListener);
        popup?.close();
        toast.error("Google login failed");
      }
    };
    
    window.addEventListener('message', messageListener);
    
    // Check if popup was closed
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
      }
    }, 1000);
  };

  // Handle Apple OAuth
  const handleAppleLogin = () => {
    const clientId = import.meta.env.VITE_APPLE_CLIENT_ID || '';
    if (!clientId) {
      toast.error("Apple Client ID not configured. Please check your .env file.");
      console.error("VITE_APPLE_CLIENT_ID is not set in environment variables");
      return;
    }

    // Load Apple Sign In SDK if not already loaded
    const scriptId = 'apple-signin-script';
    const existingScript = document.getElementById(scriptId);
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.onload = () => {
        // Wait a bit for the SDK to initialize
        setTimeout(() => initAppleSignIn(), 100);
      };
      script.onerror = () => {
        toast.error("Failed to load Apple Sign In SDK. Please try again.");
        console.error("Apple Sign In SDK script failed to load");
      };
      document.head.appendChild(script);
    } else {
      // Script exists, wait a bit and try
      setTimeout(() => initAppleSignIn(), 100);
    }

    function initAppleSignIn() {
      // Check if SDK is available
      if (typeof window !== 'undefined' && (window as any).AppleID && (window as any).AppleID.auth) {
        try {
          (window as any).AppleID.auth.init({
            clientId: clientId,
            scope: 'name email',
            redirectURI: `${window.location.origin}/auth/apple/callback`,
            usePopup: true,
          });

          // Trigger sign in
          (window as any).AppleID.auth.signIn().then((response: any) => {
            if (response.id_token) {
              // Extract name from user object if available
              let name: string | undefined;
              
              if (response.user?.name) {
                const user = response.user;
                const firstName = user.name.firstName || '';
                const lastName = user.name.lastName || '';
                name = `${firstName} ${lastName}`.trim() || undefined;
              }

              // Send token to backend (backend extracts email from token)
              socialLogin.mutate({
                provider: "apple",
                providerToken: response.id_token,
                name,
              });
            } else {
              toast.error("Apple login failed: No ID token received");
            }
          }).catch((error: any) => {
            console.error("Apple sign in error:", error);
            if (error.error !== 'popup_closed_by_user' && error.error !== 'user_cancelled_authorize') {
              toast.error("Apple login failed. Please try again.");
            }
          });
        } catch (error: any) {
          console.error("Apple Sign In initialization error:", error);
          toast.error("Apple Sign In initialization failed. Please try again.");
        }
      } else {
        console.error("Apple Sign In SDK not available. Window.AppleID:", (window as any).AppleID);
        toast.error("Apple Sign In SDK not ready. Please wait a moment and try again.");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          {/* Logo and Branding */}
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-3 flex items-center gap-2">
              <img src="/logo.png" alt="MetaMindful" className="h-8 w-auto" />
              <span className="text-2xl font-semibold text-gray-800">MetaMindful</span>
            </div>
          </div>
          
          <p className="mb-6 text-center text-sm font-medium text-gray-700">Choose a log-in method</p>

          {/* Social Login Buttons */}
          <div className="mb-6 flex gap-3">
            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={socialLogin.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#000000">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </button>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={socialLogin.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </div>

          {/* OR Divider */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="text-xs font-medium text-gray-500">OR</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Email and Password Fields */}
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              login.mutate();
            }}
          >
            <label className="relative block">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                className={`w-full rounded-xl border bg-white px-4 py-3 pl-11 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  feedback.error ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-yellow-400"
                }`}
                value={credentials.email}
                onChange={(event) => {
                  setCredentials((prev) => ({ ...prev, email: event.target.value }));
                  setFeedback({ error: "" }); // Clear error when typing
                }}
                placeholder="Email"
                required
                autoComplete="username"
              />
            </label>

            <label className="relative block">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                className={`w-full rounded-xl border bg-white px-4 py-3 pl-11 pr-11 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  feedback.error ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-yellow-400"
                }`}
                value={credentials.password}
                onChange={(event) => {
                  setCredentials((prev) => ({ ...prev, password: event.target.value }));
                  setFeedback({ error: "" }); // Clear error when typing
                }}
                placeholder="Password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </label>

            {feedback.error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{feedback.error}</p>
              </div>
            )}

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-yellow-400 focus:ring-yellow-400"
                />
                <span className="text-sm text-gray-700">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-gray-600 hover:text-gray-800 hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Log in Button */}
            <button
              type="submit"
              className="w-full rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-yellow-500 disabled:opacity-50"
              disabled={login.isPending}
            >
              {login.isPending ? "Signing in..." : "Log in"}
            </button>

            {/* Continue as Guest Button */}
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full rounded-xl border-2 border-yellow-400 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Continue as Guest
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-gray-800 hover:underline">
              Sign up
            </Link>
          </p>

          {/* Privacy Policy Link */}
          <p className="mt-4 text-center text-xs text-gray-500">
            By continuing, you agree to our{" "}
            <Link to="/terms" target="_blank" className="font-medium text-gray-700 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy-policy" target="_blank" className="font-medium text-gray-700 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
