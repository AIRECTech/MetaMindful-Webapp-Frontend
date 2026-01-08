// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration - will be set via message from main thread
// Fallback config (should match your .env values)
let firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "metamindful.firebaseapp.com",
  projectId: "metamindful",
  storageBucket: "metamindful.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let messaging = null;
let isInitialized = false;

// Initialize Firebase
function initializeFirebase(config) {
  if (isInitialized) {
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    
    // Get messaging instance
    messaging = firebase.messaging();
    
    // Set up background message handler
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message:', payload);
      
      const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: '/logo.png',
        badge: '/logo.png',
        image: payload.notification?.image,
        data: {
          ...payload.data,
          click_action: payload.data?.click_action || payload.fcmOptions?.link || '/user',
        },
        tag: payload.data?.notificationId || 'notification',
        requireInteraction: false,
        silent: false,
      };

      // Show notification
      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
    
    isInitialized = true;
    console.log('[firebase-messaging-sw.js] Firebase initialized successfully');
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Firebase initialization error:', error);
  }
}

// Listen for config from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    initializeFirebase(firebaseConfig);
  }
});

// Try to initialize on install (with fallback config)
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing');
  // Don't initialize here - wait for config from main thread
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activating');
  event.waitUntil(clients.claim());
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);
  
  event.notification.close();

  // Get the URL to open from the notification data
  const urlToOpen = event.notification.data?.click_action || 
                    event.notification.data?.url || 
                    '/user';

  // Check if there's an existing client window
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // If there's already a window open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);
        
        if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event);
});
