import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ChatToastProvider } from "./contexts/ChatToastContext";
import "./index.css";
import { initDarkMode } from "./lib/darkMode";

// Initialize dark mode before rendering
initDarkMode();

// Get Google Client ID from environment variable
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
import App from "./App";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { RequireAuth } from "./components/RequireAuth";
import { RedirectIfAuth } from "./components/RedirectIfAuth";
import { ThreadsPage } from "./pages/chat/ThreadsPage";
import { ChatPage } from "./pages/chat/ChatPage";
import { NewChatPage } from "./pages/chat/NewChatPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { SettingsPage } from "./pages/profile/SettingsPage";
import { StartChatPage } from "./pages/chat/StartChatPage";
import { GuestChatPage } from "./pages/chat/GuestChatPage";
import { GoogleCallbackPage } from "./pages/auth/GoogleCallbackPage";
import { PrivacyPolicyPage } from "./pages/legal/PrivacyPolicyPage";
import { TermsPage } from "./pages/legal/TermsPage";

const router = createBrowserRouter([
  { 
    path: "/", 
    element: (
      <RedirectIfAuth>
        <LoginPage />
      </RedirectIfAuth>
    ) 
  },
  { 
    path: "/signup", 
    element: (
      <RedirectIfAuth>
        <SignupPage />
      </RedirectIfAuth>
    ) 
  },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/start-chat", element: <StartChatPage /> },
  { path: "/auth/google/callback", element: <GoogleCallbackPage /> },
  { path: "/privacy-policy", element: <PrivacyPolicyPage /> },
  { path: "/terms", element: <TermsPage /> },
  // Guest routes
  {
    path: "/guest",
    element: <App />,
    children: [
      { index: true, element: <GuestChatPage /> },
      { path: ":id", element: <GuestChatPage /> },
    ]
  },
  // Authenticated user routes
  {
    path: "/user",
    element: (
      <RequireAuth>
        <App />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <NewChatPage /> },
      { path: "threads", element: <ThreadsPage /> },
      { path: "chat/new", element: <NewChatPage /> },
      { path: "chat/:id", element: <ChatPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  // Apple App Site Association
  {
    path: "/.well-known/apple-app-site-association",
    element: (
      <pre style={{ padding: '20px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify({
          "appclips": {
            "apps": [ "BB45CSH5W3.com.AIREC.MetaMindful.Clip" ]
          }
        }, null, 2)}
      </pre>
    )
  },
  // Catch-all route for 404 - redirect to root
  { path: "*", element: <Navigate to="/" replace /> },
]);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <ChatToastProvider>
          <RouterProvider router={router} />
        </ChatToastProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);
