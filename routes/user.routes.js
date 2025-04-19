// routes/user.routes.js
import express from 'express';
import { getUserProfile, updateUserProfile, getUsers } from '../controllers/user.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// User profile routes (for authenticated users)
router.get('/profile', isAuthenticated, getUserProfile);
router.put('/profile', isAuthenticated, updateUserProfile);

// Admin routes
router.get('/', isAdmin, getUsers);

export default router;