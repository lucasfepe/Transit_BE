// controllers/user.controller.js
import { getUserByFirebaseUid, updateUser, getAllUsers } from '../services/user.service.js';

/**
 * Get the current user's profile
 */
export const getUserProfile = async (req, res, next) => {
    try {
        // We can use req.mongoUser which was attached in the middleware
        // or fetch it again if needed
        const user = req.mongoUser || await getUserByFirebaseUid(req.user.uid);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

/**
 * Update the current user's profile
 */
export const updateUserProfile = async (req, res, next) => {
    try {
        const { displayName, photoURL } = req.body;
        
        const updatedUser = await updateUser(req.user.uid, {
            displayName,
            photoURL,
            updatedAt: new Date()
        });
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
};

/**
 * Admin function to get all users
 */
export const getUsers = async (req, res, next) => {
    try {
        const users = await getAllUsers();
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
};