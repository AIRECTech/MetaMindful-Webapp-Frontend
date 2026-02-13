import { api } from "./api";
import { requestNotificationPermission, setupForegroundMessageHandler, registerServiceWorker, logAnalyticsEvent } from "./firebase";

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
    // Register service worker for background notifications FIRST
    // This must be done before requesting notification permission
    const swRegistration = await registerServiceWorker();

    if (!swRegistration) {
      console.warn("Service worker registration failed. Push notifications may not work in background.");
    }

    // Wait a bit for service worker to be fully ready
    if (swRegistration) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

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
          logAnalyticsEvent("notification_received", { notificationId: notification.id, type: notification.type });
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
  try {
    console.log("Fetching notifications...", { page, limit });
    const response = await api.get("/notifications", {
      params: { page, limit },
      timeout: 10000, // 10 second timeout
    });
    console.log("Notifications fetched successfully:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    console.error("Error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    // Return empty response on error instead of throwing
    return {
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  }
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
  try {
    const response = await api.get("/notifications/unread/count");
    return response.data.data.count;
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    // Return 0 on error instead of throwing
    return 0;
  }
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

