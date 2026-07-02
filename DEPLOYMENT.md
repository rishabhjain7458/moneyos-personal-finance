# MoneyOS Deployment

## Firebase setup

1. Create a Firebase project.
2. Add a Web app in Firebase project settings.
3. Enable Authentication > Sign-in method > Google.
4. Create Firestore Database in production mode.
5. Copy `.env.example` to `.env.local` and fill the Firebase web app config.

Do not put a Google OAuth client secret in this repository. Firebase web apps use public client config in the browser; secrets must stay in Google Cloud/Firebase console or a trusted backend.

## Where to find `.env` values

Open Firebase Console > your project > Project settings > General > Your apps > Web app.

If you do not see a Web app, click Add app > Web, register it, then Firebase shows a config object like this:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Copy those values into `.env.local`:

```bash
VITE_FIREBASE_API_KEY=apiKey
VITE_FIREBASE_AUTH_DOMAIN=authDomain
VITE_FIREBASE_PROJECT_ID=projectId
VITE_FIREBASE_STORAGE_BUCKET=storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=messagingSenderId
VITE_FIREBASE_APP_ID=appId
```

If Google login shows `auth/api-key-not-valid`, replace the entire local `.env` and all matching GitHub Actions secrets with the exact config from Firebase Console. Do not use the Google OAuth client ID or client secret for `VITE_FIREBASE_API_KEY`; it must be the Firebase Web API key from the Firebase web app config.

You can also ask Firebase CLI for the exact web config:

```bash
firebase apps:list --project your-project-id
firebase apps:sdkconfig WEB your-web-app-id --project your-project-id
```

## Local run

```bash
npm install
npm run dev
```

## Deploy database rules and hosting

```bash
npm install -g firebase-tools
firebase login
firebase use --add
npm run deploy
```

After deploy, copy the Firebase Hosting URL into `android-webview/app/src/main/res/values/strings.xml` as `moneyos_url`, then build the APK in Android Studio.

## Auto deploy on GitHub push

This repo includes `.github/workflows/firebase-hosting.yml`. It deploys whenever you push to `main`.

Add these repository secrets in GitHub > your repo > Settings > Secrets and variables > Actions > New repository secret:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT_MONEYOS_550B3`

Create `FIREBASE_SERVICE_ACCOUNT_MONEYOS_550B3` with:

```bash
firebase init hosting:github
```

That command connects Firebase Hosting to GitHub and can create the service account secret for you. If you create it manually, use a Firebase service account JSON with permission to deploy Hosting.
