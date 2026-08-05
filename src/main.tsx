import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { markAsClipSession } from "./lib/clipDetection";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ChatToastProvider } from "./contexts/ChatToastContext";
import "./index.css";
import { initDarkMode } from "./lib/darkMode";

// Initialize dark mode before rendering
initDarkMode();

// Handle ChunkLoadError and dynamic import failures by forcing a reload to fetch new assets
window.addEventListener("error", (e) => {
  const isChunkError = e.message && (
    e.message.includes("ChunkLoadError") || 
    e.message.includes("Loading chunk") || 
    e.message.includes("Failed to fetch dynamically imported module")
  );
  if (isChunkError) {
    console.warn("Chunk load error detected. Reloading page to fetch latest assets...");
    window.location.reload();
  }
}, true);

window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason;
  const isChunkError = reason && reason.message && (
    reason.message.includes("ChunkLoadError") ||
    reason.message.includes("Loading chunk") ||
    reason.message.includes("Failed to fetch dynamically imported module")
  );
  if (isChunkError) {
    console.warn("Unhandled chunk load rejection detected. Reloading page...");
    window.location.reload();
  }
});

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
import { Outlet } from "react-router-dom";
import { PageTracker } from "./components/layout/PageTracker";

const router = createBrowserRouter([
  {
    element: (
      <>
        <PageTracker />
        <Outlet />
      </>
    ),
    children: [
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
      {
        path: "/clip",
        element: (() => {
          // Tiny inline component: set clip session flag, then redirect
          function ClipEntry() {
            useEffect(() => { markAsClipSession(); }, []);
            return <Navigate to="/guest" replace />;
          }
          return <ClipEntry />;
        })()
      },
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
              "applinks": {
                "apps": [],
                "details": [
                  {
                    "appID": import.meta.env.VITE_APPLE_TEAM_APP_ID || "BB45CSH5W3.com.AIREC.MetaMindful",
                    "paths": ["*"]
                  }
                ]
              }
            }, null, 2)}
          </pre>
        )
      },
      // Catch-all route for 404 - redirect to root
      { path: "*", element: <Navigate to="/" replace /> },
    ]
  }
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
