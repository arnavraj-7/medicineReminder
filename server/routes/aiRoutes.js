import express from 'express';
import multer from 'multer';
import path from 'path';
import { handleChat } from '../controllers/aiController.js';


const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this directory exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'medicine-bill-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * @route   POST /api/chat
 * @desc    Handle chat messages with optional medicine bill image upload
 * @access  Private
 * 
 * Body (multipart/form-data):
 * - message: string (text message)
 * - image: file (optional medicine bill image)
 * - conversationHistory: JSON string (optional conversation history)
 */
router.post('/', upload.single('image'), (req, res, next) => {
  // Log request details for debugging
  console.log('=== POST /api/chat - Request received ===');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body keys:', Object.keys(req.body));
  console.log('Body.message:', req.body.message);
  console.log('Body.conversationHistory:', req.body.conversationHistory ? 'present' : 'missing');
  console.log('File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
  console.log('User:', req.user?.id || 'No user');
  console.log('=====================================');
  
  // Proceed to handleChat
  handleChat(req, res, next);
});

export default router;