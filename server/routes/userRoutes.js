import express from 'express';
import { getMe, updateProfile } from '../controllers/userController.js';


const router = express.Router();
router.get('/me', getMe);

// Define a protected route to update the user's profile
router.put('/me', updateProfile);

export default router;