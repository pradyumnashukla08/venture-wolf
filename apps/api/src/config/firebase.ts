import { initializeApp, cert, getApps } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

let app: App;

// Prevent re-initialization in hot-reloading environments
if (!getApps().length) {
  try {
    // Requires GOOGLE_APPLICATION_CREDENTIALS in .env
    // Or FIREBASE_SERVICE_ACCOUNT_BASE64 if injecting via CI/CD
    
    if (process.env.GCP_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(Buffer.from(process.env.GCP_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
      app = initializeApp({
        credential: cert(serviceAccount),
        ...(process.env.GCP_STORAGE_BUCKET && { storageBucket: process.env.GCP_STORAGE_BUCKET })
      });
    } else {
      // Default fallback looks for GOOGLE_APPLICATION_CREDENTIALS env var automatically.
      // We inject projectId explicitly so that ID token verification works even without a service account.
      app = initializeApp({
        projectId: 'project-f62f4191-7560-45ab-8f3',
        ...(process.env.GCP_STORAGE_BUCKET && { storageBucket: process.env.GCP_STORAGE_BUCKET })
      });
    }
    console.log('✅ Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
  }
} else {
  app = getApps()[0] as App;
}

export const db = getFirestore(app!);
export const auth = getAuth(app!);
export const storage = getStorage(app!);
