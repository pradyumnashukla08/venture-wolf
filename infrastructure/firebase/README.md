# Firebase Infrastructure & Deployment Configuration

This directory documents and defines the Firebase Infrastructure for the unified WaouFund platform.

## Configuration Files (Located at Monorepo Root)
- `firebase.json`: Unified configuration linking:
  - **Firebase Hosting**: Serves `apps/web/dist` with automated `/api/**` rewrites to Cloud Function `api`.
  - **Cloud Functions 2nd Gen**: Deploys Express modular API from `apps/api`.
  - **Firestore Rules**: Deploys `firestore.rules` (User ownership checking).
  - **Storage Rules**: Deploys `storage.rules` (User data room & profile limits).
- `.firebaserc`: Project ID mappings (`project-f62f4191-7560-45ab-8f3`).

## Local Emulators & Development
To run the full Firebase suite locally with emulators:
```bash
firebase emulators:start --only auth,firestore,storage,functions,hosting
```

## Deployment Commands
Deploy all components:
```bash
firebase deploy
```
Deploy only backend Cloud Function:
```bash
firebase deploy --only functions
```
Deploy only web frontend:
```bash
firebase deploy --only hosting
```
Deploy security rules:
```bash
firebase deploy --only firestore:rules,storage:rules
```
