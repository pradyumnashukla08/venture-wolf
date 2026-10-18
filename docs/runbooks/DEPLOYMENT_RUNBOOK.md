# WaouFund Production Deployment Runbook

Follow these steps to deploy the unified platform safely:

## 1. Secrets Configuration (Google Cloud Secret Manager)
```bash
# Set backend Gemini API key in Secret Manager
firebase functions:secrets:set GEMINI_API_KEY
```

## 2. Firebase Rules & Infrastructure Deployment
```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Cloud Storage security rules
firebase deploy --only storage:rules
```

## 3. Backend Deployment (Firebase Cloud Functions 2nd Gen)
```bash
# Build and deploy backend Cloud Function
npm run build -w apps/api
firebase deploy --only functions:api
```

## 4. Frontend Deployment (Firebase Hosting)
```bash
# Build frontend web bundle
npm run build -w apps/web
firebase deploy --only hosting
```

## 5. Domain & DNS Verification (GoDaddy)
* Set **A Record**: `@` -> `199.36.158.100` (Firebase Hosting IP)
* Set **CNAME Record**: `www` -> `project-f62f4191-7560-45ab-8f3.web.app`
* Add authorized domains in **Firebase Console** > **Authentication** > **Settings**.
