import { api } from "./api";
import { requestNotificationPermission, setupForegroundMessageHandler, registerServiceWorker } from "./firebase";

export interface Notification {
  id: string;
  type: "thread_created" | "message_received" | "system";
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadNotificationResponse extends NotificationListResponse {
  unreadCount: number;
}

/**
 * Register device token for push notifications
 */
export async function registerDeviceToken(token: string, deviceType: string = "web"): Promise<void> {
  try {
    // Update user session with device token
    await api.post("/users/sessions/device-token", {
      deviceToken: token,
      deviceType,
    });
  } catch (error) {
    console.error("Failed to register device token:", error);
    // Don't throw - token registration failure shouldn't break the app
  }
}

/**
 * Initialize push notifications
 */
export async function initializePushNotifications(
  onNotificationReceived?: (notification: Notification) => void
): Promise<void> {
  try {
    // Register service worker for background notifications
    await registerServiceWorker();

    // Request notification permission
    const token = await requestNotificationPermission();
    if (token) {
      // Register token with backend
      await registerDeviceToken(token, "web");

      // Set up foreground message handler
      if (onNotificationReceived) {
        await setupForegroundMessageHandler((payload) => {
          // Convert Firebase payload to our notification format
          const notification: Notification = {
            id: payload.data?.notificationId || "",
            type: (payload.data?.type as any) || "system",
            title: payload.notification?.title || payload.data?.title || "",
            body: payload.notification?.body || payload.data?.body || "",
            data: payload.data,
            isRead: false,
            readAt: null,
            createdAt: new Date().toISOString(),
          };
          onNotificationReceived(notification);
        });
      }
    }
  } catch (error) {
    console.error("Failed to initialize push notifications:", error);
  }
}

/**
 * Get all notifications
 */
export async function getNotifications(page: number = 1, limit: number = 20): Promise<NotificationListResponse> {
  const response = await api.get("/notifications", {
    params: { page, limit },
  });
  return response.data.data;
}

/**
 * Get unread notifications
 */
export async function getUnreadNotifications(page: number = 1, limit: number = 20): Promise<UnreadNotificationResponse> {
  const response = await api.get("/notifications/unread", {
    params: { page, limit },
  });
  return response.data.data;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const response = await api.get("/notifications/unread/count");
  return response.data.data.count;
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(id: string): Promise<void> {
  await api.put(`/notifications/${id}/read`);
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<void> {
  await api.put("/notifications/read-all");
}

