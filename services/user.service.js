// services/user.service.js
import { getUserModel } from '../models/User.js';

/**
 * Create a new user in MongoDB
 */
export const createUser = async (userData) => {
    const User = getUserModel();
    const user = new User(userData);
    return await user.save();
};

/**
 * Get a user by their Firebase UID
 */
export const getUserByFirebaseUid = async (firebaseUid) => {
    const User = getUserModel();
    return await User.findOne({ firebaseUid });
};

/**
 * Update a user's information
 */
export const updateUser = async (firebaseUid, updateData) => {
    const User = getUserModel();
    return await User.findOneAndUpdate(
        { firebaseUid }, 
        updateData, 
        { new: true }
    );
};

/**
 * Update a user's last login timestamp
 */
export const updateLastLogin = async (firebaseUid) => {
    const User = getUserModel();
    return await User.findOneAndUpdate(
        { firebaseUid }, 
        { lastLogin: new Date() }, 
        { new: true }
    );
};

/**
 * Delete a user
 */
export const deleteUser = async (firebaseUid) => {
    const User = getUserModel();
    return await User.findOneAndDelete({ firebaseUid });
};

/**
 * Get all users (admin function)
 */
export const getAllUsers = async () => {
    const User = getUserModel();
    return await User.find({});
};