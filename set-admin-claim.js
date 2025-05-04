import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFile } from 'fs/promises';

// Function to read and parse the JSON file
async function loadServiceAccount() {
  const data = await readFile('./firebase_key.json', 'utf8');
  return JSON.parse(data);
}

async function main() {
  try {
    // Load the service account
    const serviceAccount = await loadServiceAccount();
    
    // Initialize the Firebase Admin SDK
    const app = initializeApp({
      credential: cert(serviceAccount)
    });
    
    const auth = getAuth(app);
    
    // The UID of the user you want to make an admin
    const uid = 'rK4bVm3Gs1a1MIz1s9wmp8KGQAk1';
    
    // Set custom claims
    await auth.setCustomUserClaims(uid, { admin: true });
    
    // Verify the claim was set correctly
    const userRecord = await auth.getUser(uid);
    console.log('Custom claims:', userRecord.customClaims);
    console.log(`Successfully set admin claim for user: ${uid}`);
    
    // Terminate the Firebase Admin instance
    await app.delete();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();