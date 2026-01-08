import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging, isSupported } from "firebase/messaging";

// Firebase web app configuration
// TODO: Replace with your actual Firebase web app config from Firebase Console
// You can find this in Firebase Console > Project Settings > General > Your apps > Web app
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "metamindful.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "metamindful",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "metamindful.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id",
};

// Initialize Firebase
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function initializeFirebase(): FirebaseApp | null {
  if (app) {
    return app;
  }

  const apps = getApps();
  if (apps.length > 0) {
    app = apps[0];
  } else {
    app = initializeApp(firebaseConfig);
  }

  return app;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messaging) {
    return messaging;
  }

  const supported = await isSupported();
  if (!supported) {
    console.warn("Firebase Cloud Messaging is not supported in this browser");
    return null;
  }

  if (!app) {
    initializeFirebase();
  }

  if (app) {
    messaging = getMessaging(app);
    return messaging;
  }

  return null;
}

// VAPID key for web push (get from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates)
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return null;
    }

    const messagingInstance = await getFirebaseMessaging();
    if (!messagingInstance) {
      return null;
    }

    const token = await getToken(messagingInstance, { vapidKey });
    if (token) {
      console.log("FCM token obtained:", token);
      return token;
    } else {
      console.warn("No FCM token available");
      return null;
    }
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}

/**
 * Set up message handler for foreground notifications
 */
export async function setupForegroundMessageHandler(
  callback: (payload: any) => void
): Promise<void> {
  try {
    const messagingInstance = await getFirebaseMessaging();
    if (!messagingInstance) {
      return;
    }

    onMessage(messagingInstance, (payload) => {
      console.log("Message received in foreground:", payload);
      callback(payload);
    });
  } catch (error) {
    console.error("Error setting up foreground message handler:", error);
  }
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return "Notification" in window && "serviceWorker" in navigator;
}

/**
 * Check current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Register service worker for background notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("Service workers are not supported in this browser");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });

    console.log("Service Worker registered successfully:", registration);

    // Wait for service worker to be ready
    const readyRegistration = await navigator.serviceWorker.ready;
    console.log("Service Worker ready:", readyRegistration);

    // Send Firebase config to service worker
    // Try active first, then waiting, then installing
    const worker = registration.active || registration.waiting || registration.installing;
    if (worker) {
      worker.postMessage({
        type: "FIREBASE_CONFIG",
        config: firebaseConfig,
      });
      console.log("Firebase config sent to service worker");
    } else {
      // If no worker is available yet, wait a bit and try again
      setTimeout(() => {
        const worker = registration.active || registration.waiting || registration.installing;
        if (worker) {
          worker.postMessage({
            type: "FIREBASE_CONFIG",
            config: firebaseConfig,
          });
          console.log("Firebase config sent to service worker (delayed)");
        }
      }, 1000);
    }

    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

