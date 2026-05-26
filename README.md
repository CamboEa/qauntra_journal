# Quatra Journal

A Next.js trading journal with **login/register**, **Firebase Firestore**, and automatic **MT5 sync** via the QuatraSync indicator.

## Architecture

```
User → /login or /register (Firebase Auth)
     → /dashboard
MT5 + QuatraSync indicator → POST /api/sync → Firestore → Dashboard
```

## Prerequisites

1. [Firebase](https://console.firebase.google.com) project
2. **Firestore** enabled
3. **Authentication → Email/Password** enabled
4. **Web app** registered (for `NEXT_PUBLIC_FIREBASE_API_KEY`)
5. **Service account** private key (Admin SDK)
6. MetaTrader 5 running with QuatraSync indicator attached

## Setup

```bash
cp .env.example .env
```

### `.env` variables

**Server (Admin SDK)** — from service account JSON:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

**Client (login/register)** — from Firebase Console → Project settings → Your apps → Web:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (e.g. `your-project.firebaseapp.com`)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

**App:**
- `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000` (use `127.0.0.1` for MT5 WebRequest)

```bash
npm install
npm run dev
```

Deploy Firestore rules from `firestore.rules` (denies direct client access).

## User flow

1. **Register** at `/register` or **sign in** at `/login`
2. Open **Dashboard** → **Generate sync key**
3. Install **QuatraSync** indicator in MT5 (see `/dashboard/setup`)
4. Trades sync automatically while MT5 is running

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/register` | Create account |
| `/dashboard` | Overview — balance, equity, open positions |
| `/dashboard/history` | Closed trades |
| `/dashboard/setup` | MT5 indicator setup |

## API routes

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/session` | Create session from Firebase ID token |
| `DELETE /api/auth/session` | Sign out |
| `POST /api/setup` | Create MT5 sync key (auth required) |
| `POST /api/sync` | Indicator sync (`X-Api-Key` header) |
| `GET /api/metrics` | Account metrics |
| `GET /api/trades` | Historical trades |
| `GET /api/open-trades` | Open positions |

## Firestore structure

```
users/{userId}
  email, accountId, createdAt

accounts/{accountId}
  userId, apiKeyHash, mt5Login, balance, equity, ...

accounts/{accountId}/deals/{ticket}
accounts/{accountId}/positions/{ticket}
```

## Tech stack

- Next.js 16 (App Router)
- Firebase Auth + Firestore (Admin SDK + client SDK)
- QuatraSync MQL5 indicator
- Tailwind CSS 4
