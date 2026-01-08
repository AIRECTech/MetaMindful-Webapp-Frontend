# Firebase Environment Variables Setup for Frontend

## Step-by-Step Guide to Get Firebase Config Values

### 1. Get Firebase Web App Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **metamindful**
3. Click the **gear icon (⚙️)** next to "Project Overview"
4. Select **"Project settings"**
5. Go to the **"General"** tab
6. Scroll down to **"Your apps"** section
7. If you don't have a web app:
   - Click **"Add app"** > Select **Web (</> icon)**
   - Register your app (you can name it "MetaMindful Web")
8. You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "metamindful.firebaseapp.com",
  projectId: "metamindful",
  storageBucket: "metamindful.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

### 2. Get VAPID Key (for Web Push Notifications)

1. In Firebase Console, still in **Project settings**
2. Go to **"Cloud Messaging"** tab
3. Scroll down to **"Web Push certificates"** section
4. If no key exists:
   - Click **"Generate key pair"**
   - Copy the generated key
5. The VAPID key looks like: `BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Copy-Paste Ready .env File

Create or update `chat/.env` with the following:

```env
# API URL
VITE_API_URL=https://backend.metamindful.ai/api/v1

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=738813463648-11kbhaka617sqoemuvas42mqjdjpp63v.apps.googleusercontent.com

# Firebase Web App Configuration
# Get these values from Firebase Console > Project Settings > General > Your apps > Web app
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=metamindful.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=metamindful
VITE_FIREBASE_STORAGE_BUCKET=metamindful.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890

# Firebase VAPID Key (for Web Push Notifications)
# Get this from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
VITE_FIREBASE_VAPID_KEY=BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Quick Reference: Where Each Value Comes From

| Environment Variable | Firebase Console Location | Example Value |
|---------------------|---------------------------|---------------|
| `VITE_FIREBASE_API_KEY` | Project Settings > General > Your apps > Web app > Config | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Project Settings > General > Your apps > Web app > Config | `metamindful.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project Settings > General > Your apps > Web app > Config | `metamindful` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Project Settings > General > Your apps > Web app > Config | `metamindful.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Project Settings > General > Your apps > Web app > Config | `123456789012` |
| `VITE_FIREBASE_APP_ID` | Project Settings > General > Your apps > Web app > Config | `1:123456789012:web:...` |
| `VITE_FIREBASE_VAPID_KEY` | Project Settings > Cloud Messaging > Web Push certificates | `BK...` |

## Important Notes

1. **All frontend env variables MUST start with `VITE_`** - This is required by Vite
2. **No quotes needed** - Don't wrap values in quotes in the .env file
3. **Restart dev server** - After adding/updating .env, restart your dev server (`npm run dev`)
4. **Don't commit .env** - Make sure `.env` is in `.gitignore`

## Verification

After setting up, you can verify the config is loaded by checking the browser console when the app loads. You should see:
- "Firebase Messaging initialized."
- "FCM token obtained: ..." (if permission is granted)

