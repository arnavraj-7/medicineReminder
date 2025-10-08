import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';

// --- Route Imports ---
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import medicineRoutes from './routes/medicineRoutes.js';
import authMiddleware from './middleware/authMiddleware.js';

// --- Initial Setup ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 6000;

// --- Middleware ---
  app.use(cors({
  origin: [
    'http://localhost:8081',               // for local Expo web preview
    'exp://192.168.1.*:8081',              // for Expo mobile on LAN (replace * with your local IP)
    'https://medicinereminder-mugz.onrender.com', // for deployed backend
    'null'                                 // for requests from native mobile apps (no origin header)
  ],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// --- Session Configuration ---
app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGO_URI 
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true, 
    maxAge: 1000 * 60 * 60 * 24 * 7 
  }
}));

// --- API Routes ---
// Public routes for authentication
app.use('/api/auth', authRoutes);

// Protected routes that require a valid session
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/medicines', authMiddleware, medicineRoutes);


// --- Database Connection and Server Start ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => console.error('MongoDB connection error:', error));


  app.get('/status', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running and accessible!' 
  });
});