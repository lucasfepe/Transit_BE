// firebaseAdmin.js
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let firebaseApp = null;

try {
  // Update path to match your actual firebase_key.json file
  const serviceAccountPath = path.join(__dirname, './firebase_key.json');
  console.log(`Loading Firebase service account from: ${serviceAccountPath}`);

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  if (!admin.apps.length) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    firebaseApp = admin.app();
    console.log('Using existing Firebase Admin SDK instance');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  console.error('Firebase service account not found or invalid. Push notifications via FCM will not work.');
  throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
}

export default admin;