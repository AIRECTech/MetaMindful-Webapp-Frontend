# Quick Firebase Frontend Setup Guide

## You Already Have:
✅ Backend Firebase config (`firebaseconf.json`) - This is for server-side push notifications

## You Need to Get:
Frontend Firebase Web App config (different from backend config)

## Steps to Get Frontend Values:

### 1. Go to Firebase Console
- URL: https://console.firebase.google.com/
- Select project: **metamindful** (same project as your backend)

### 2. Get Web App Config (6 values)
1. Click **⚙️ gear icon** → **Project settings**
2. Go to **"General"** tab
3. Scroll to **"Your apps"** section
4. **If you see a Web app already:**
   - Click on it
   - You'll see a config object like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "metamindful.firebaseapp.com",
     projectId: "metamindful",
     storageBucket: "metamindful.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abc123..."
   };
   ```
5. **If NO Web app exists:**
   - Click **"Add app"** button
   - Select **Web (</> icon)**
   - Register app name: "MetaMindful Web" (or any name)
   - Click **"Register app"**
   - Copy the config values shown

### 3. Get VAPID Key (1 value)
1. Still in **Project settings**
2. Go to **"Cloud Messaging"** tab
3. Scroll to **"Web Push certificates"** section
4. **If you see a key:**
   - Copy it (it's a long string starting with `BK...`)
5. **If NO key exists:**
   - Click **"Generate key pair"** button
   - Copy the generated key

## Copy-Paste Template

Once you have the values, paste this into `chat/.env`:

```env
# API URL
VITE_API_URL=https://backend.metamindful.ai/api/v1

# Google OAuth
VITE_GOOGLE_CLIENT_ID=738813463648-11kbhaka617sqoemuvas42mqjdjpp63v.apps.googleusercontent.com

# Firebase Web App Config (from Firebase Console)
VITE_FIREBASE_API_KEY=PASTE_API_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=metamindful.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=metamindful
VITE_FIREBASE_STORAGE_BUCKET=metamindful.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=PASTE_SENDER_ID_HERE
VITE_FIREBASE_APP_ID=PASTE_APP_ID_HERE

# Firebase VAPID Key (from Cloud Messaging tab)
VITE_FIREBASE_VAPID_KEY=PASTE_VAPID_KEY_HERE
```

## Quick Checklist:
- [ ] Open Firebase Console → Project settings → General tab
- [ ] Find or create Web app
- [ ] Copy 6 config values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
- [ ] Go to Cloud Messaging tab
- [ ] Get or generate VAPID key
- [ ] Paste all values into `chat/.env`
- [ ] Restart dev server: `npm run dev`

## Note:
- `projectId` and `authDomain` are likely: `metamindful` and `metamindful.firebaseapp.com`
- `storageBucket` is likely: `metamindful.appspot.com`
- You still need to get: `apiKey`, `messagingSenderId`, `appId`, and `VAPID_KEY` from the console

