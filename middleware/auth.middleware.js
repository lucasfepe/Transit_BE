// middleware/auth.middleware.js
import admin from '../firebaseAdmin.js';
import { getUserByFirebaseUid, createUser, updateLastLogin, updateUser } from '../services/user.service.js';

/**
 * Middleware to verify Firebase authentication and automatically create/update user in MongoDB
 */
export const isAuthenticated = async (req, res, next) => {
    // Get the ID token from the Authorization header
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        // Verify the ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Attach the Firebase user to the request object
        req.user = decodedToken;

        // Check if user exists in MongoDB
        const user = await getUserByFirebaseUid(decodedToken.uid);

        if (!user) {
            // First-time user - create record in MongoDB
            const newUser = await createUser({
                firebaseUid: decodedToken.uid,
                email: decodedToken.email,
                displayName: decodedToken.name || decodedToken.email?.split('@')[0],
                lastLogin: new Date()
            });

            // Optionally attach MongoDB user to request
            req.mongoUser = newUser;
        } else {
            // Existing user - update last login time (throttled)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (!user.lastLogin || new Date(user.lastLogin) < oneHourAgo) {
                const updatedUser = await updateLastLogin(decodedToken.uid);
                req.mongoUser = updatedUser;
            } else {
                req.mongoUser = user;
            }
        }

        next();
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

/**
 * Middleware to verify admin privileges
 */
export const isAdmin = async (req, res, next) => {
    // First ensure the user is authenticated
    console.log('Checking admin privileges...');
    const idToken = req.headers.authorization?.split('Bearer ')[1];

    if (!idToken) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        // Verify the ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Check if the user has the admin claim
        if (decodedToken.admin !== true) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Attach the Firebase user to the request object
        req.user = decodedToken;

        // Check if user exists in MongoDB
        const user = await getUserByFirebaseUid(decodedToken.uid);

        if (!user) {
            // First-time admin user - create record in MongoDB
            const newUser = await createUser({
                firebaseUid: decodedToken.uid,
                email: decodedToken.email,
                displayName: decodedToken.name || decodedToken.email?.split('@')[0],
                isAdmin: true,
                lastLogin: new Date()
            });

            req.mongoUser = newUser;
        } else {
            // Existing admin user - update last login time (throttled)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (!user.lastLogin || new Date(user.lastLogin) < oneHourAgo) {
                const updatedUser = await updateLastLogin(decodedToken.uid);
                req.mongoUser = updatedUser;
            } else {
                req.mongoUser = user;
            }

            // Ensure admin status is synced
            if (!user.isAdmin) {
                await updateUser(decodedToken.uid, { isAdmin: true });
            }
        }

        next();
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return res.status(403).json({ error: 'Invalid token' });
    }
};