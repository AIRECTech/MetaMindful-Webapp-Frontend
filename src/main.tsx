import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { initDarkMode } from "./lib/darkMode";

// Initialize dark mode before rendering
initDarkMode();
import App from "./App";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { RequireAuth } from "./components/RequireAuth";
import { ThreadsPage } from "./pages/chat/ThreadsPage";
import { ChatPage } from "./pages/chat/ChatPage";
import { NewChatPage } from "./pages/chat/NewChatPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { SettingsPage } from "./pages/profile/SettingsPage";
import { StartChatPage } from "./pages/chat/StartChatPage";
import { GuestChatPage } from "./pages/chat/GuestChatPage";

const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/start-chat", element: <StartChatPage /> },
  // Guest routes
  { path: "/guest", element: <GuestChatPage /> },
  { path: "/guest/:id", element: <GuestChatPage /> },
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
  // Catch-all route for 404 - redirect to root
  { path: "*", element: <Navigate to="/" replace /> },
]);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
