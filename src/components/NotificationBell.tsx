import { Bell } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUnreadCount, markNotificationRead, markAllNotificationsRead, getNotifications, type Notification } from "../lib/notifications";
import { toast } from "react-hot-toast";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch all notifications when dropdown is open (to show both read and unread)
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => getNotifications(1, 20),
    enabled: isOpen,
  });
  
  const notifications = notificationsData?.data || [];

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
      setIsOpen(false);
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }

    // Navigate based on notification type
    if (notification.data?.threadId) {
      window.location.href = `/user/chat/${notification.data.threadId}`;
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-96 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  disabled={markAllReadMutation.isPending}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Loading...
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                        !notification.isRead ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.body}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No notifications
                </div>
              )}
            </div>

            {notificationsData?.pagination && notificationsData.pagination.totalPages > 1 && (
              <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    // Navigate to full notifications page if you have one
                    setIsOpen(false);
                  }}
                  className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline py-2"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

