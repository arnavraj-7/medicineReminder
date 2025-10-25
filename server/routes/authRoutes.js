import express from 'express';
import { signup, login, logout} from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);   
router.get('/verify',authMiddleware,async (req, res) => {
    console.log("Auth verified for user:", req.user);
    res.status(200).json({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        emergencyContact: req.user.emergencyContact
    });
});



export default router;