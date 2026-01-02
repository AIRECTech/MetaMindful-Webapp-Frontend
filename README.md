# MetaMindful Chat Application

A React-based chat application for interacting with MetaMindful, built with Vite, TypeScript, and Tailwind CSS.

## Features

- **Authentication**
  - User login/signup
  - Guest user support
  - Email verification
  - Sign out functionality

- **Threads Management**
  - List all threads
  - Create new threads
  - Update thread titles
  - Delete threads
  - View thread details

- **Chat Interface**
  - Real-time chat with MetaMindful
  - Message history
  - Start new conversations
  - Thread-based conversations

- **Profile Management**
  - View user profile
  - Update profile (requires backend endpoint)
  - Change password (requires backend endpoint)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `env.sample`:
```bash
cp env.sample .env
```

3. Update `.env` with your API URL:
```
VITE_API_URL=http://localhost:4000/api/v1
```

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Backend Endpoints Required

The application uses the following backend endpoints:

### Authentication (Already available)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/guest-token` - Guest user token
- `POST /auth/verify-email` - Email verification
- `POST /auth/resend-verification-code` - Resend verification code
- `POST /auth/logout` - User logout

### User (Already available)
- `GET /users/me` - Get current user profile
- `DELETE /users/account` - Delete user account

### User (To be implemented)
- `PUT /users/me` - Update user profile
- `PUT /users/me/password` - Change user password

### Threads (Already available)
- `GET /threads` - List threads
- `GET /threads/:id` - Get thread by ID
- `POST /threads` - Create new thread
- `PUT /threads/:id` - Update thread
- `DELETE /threads/:id` - Delete thread
- `POST /threads/chat` - Send chat message

## Project Structure

```
chat/
├── src/
│   ├── components/
│   │   ├── layout/        # Layout components (Sidebar, Topbar, AppShell)
│   │   └── ui/            # Reusable UI components
│   ├── pages/
│   │   ├── auth/          # Authentication pages (Login, Signup)
│   │   ├── chat/          # Chat pages (Threads, Chat, NewChat)
│   │   └── profile/       # Profile pages (Profile, Settings)
│   └── lib/               # Utilities (api, auth, errors, utils)
├── public/                # Static assets
└── package.json
```

## Notes

- Profile update and password change features require backend endpoints to be implemented
- The application uses React Query for data fetching and caching
- Authentication tokens are stored in localStorage
- Guest users can convert to registered users during signup
