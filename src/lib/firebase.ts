import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, logEvent, type Analytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getMessaging, getToken, onMessage, type Messaging, isSupported } from "firebase/messaging";

// Firebase web app configuration
// Get from Firebase Console > Project Settings > General > Your apps > Web app
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "metamindful.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "metamindful",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "metamindful.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Validate Firebase config
function validateFirebaseConfig() {
  const required: Array<keyof typeof firebaseConfig> = ['apiKey', 'messagingSenderId', 'appId'];
  const missing: string[] = [];

  required.forEach(key => {
    const value = firebaseConfig[key];
    if (!value ||
      value === '' ||
      value === 'your-api-key' ||
      value === 'your-sender-id' ||
      value === 'your-app-id' ||
      value.includes('your-') ||
      value.includes('placeholder')) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.error('Firebase configuration is missing or invalid. Missing:', missing);
    console.error('Please set the following environment variables in your .env file:');
    missing.forEach(key => {
      const envKey = 'VITE_FIREBASE_' + key.toUpperCase().replace(/([A-Z])/g, '_$1');
      console.error(`  ${envKey}`);
    });
    return false;
  }
  return true;
}

// Initialize Firebase
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

export function initializeFirebase(): FirebaseApp | null {
  if (app) {
    return app;
  }

  // Validate config before initializing
  if (!validateFirebaseConfig()) {
    console.warn("Firebase not initialized due to missing configuration");
    return null;
  }

  const apps = getApps();
  if (apps.length > 0) {
    app = apps[0];
  } else {
    try {
      app = initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      return null;
    }
  }

  return app;
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analytics) {
    return analytics;
  }

  const supported = await isAnalyticsSupported();
  if (!supported) {
    return null;
  }

  if (!app) {
    initializeFirebase();
  }

  if (app) {
    analytics = getAnalytics(app);
    return analytics;
  }

  return null;
}

/**
 * Log an analytics event
 */
export async function logAnalyticsEvent(eventName: string, params?: any) {
  try {
    const analyticsInstance = await getFirebaseAnalytics();
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, params);
      console.log(`[Analytics] Event: ${eventName}`, params || "");
    } else {
      console.warn(`[Analytics] Failed to log event ${eventName}: Analytics not supported or initialized`);
    }
  } catch (error) {
    console.error(`[Analytics] Error logging event ${eventName}:`, error);
  }
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
    // Validate Firebase config first
    if (!validateFirebaseConfig()) {
      console.warn("Firebase config is invalid. Cannot request notification permission.");
      return null;
    }

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

    // Validate VAPID key
    if (!vapidKey || vapidKey === "your-vapid-key-here") {
      console.error("VAPID key is missing. Please set VITE_FIREBASE_VAPID_KEY in your .env file");
      return null;
    }

    // Get service worker registration
    const swRegistration = serviceWorkerRegistration || await navigator.serviceWorker.ready;

    // Get FCM token with service worker registration
    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log("FCM token obtained:", token);
      return token;
    } else {
      console.warn("No FCM token available");
      return null;
    }
  } catch (error: any) {
    console.error("Error getting FCM token:", error);
    if (error?.code === "installations/request-failed") {
      console.error("Firebase API key is invalid. Please check your VITE_FIREBASE_API_KEY in .env file");
    }
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

// Store service worker registration globally
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register service worker for background notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("Service workers are not supported in this browser");
    return null;
  }

  // Return existing registration if already registered
  if (serviceWorkerRegistration) {
    return serviceWorkerRegistration;
  }

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });

    console.log("Service Worker registered successfully:", registration);

    // Wait for service worker to be ready
    const readyRegistration = await navigator.serviceWorker.ready;
    console.log("Service Worker ready:", readyRegistration);

    // Store registration globally
    serviceWorkerRegistration = readyRegistration;

    // Only send config if it's valid
    if (validateFirebaseConfig()) {
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
    } else {
      console.warn("Firebase config is invalid. Not sending to service worker.");
    }

    return readyRegistration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Get the registered service worker
 */
export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return serviceWorkerRegistration;
}

