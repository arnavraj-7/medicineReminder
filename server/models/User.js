import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { // <-- ADDED
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  emergencyContact: { // <-- ADDED
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('User', UserSchema);