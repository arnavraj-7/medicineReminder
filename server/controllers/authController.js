import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // Make sure the path is correct
import dotenv from "dotenv";

dotenv.config();

const SALT_ROUNDS = 10;

export const signup = async (req, res) => {
  try {
    const { name, email, password, emergencyContact } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create a new user instance but don't save it yet
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      emergencyContact,
    });

    const sessionToken = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ id: newUser._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });

    // Assign the refresh token and then save the user
    newUser.refreshToken = refreshToken;
    await newUser.save();

    // Sanitize the user object in the response
    const userResponse = {
      id: newUser._id, // Mongoose uses ._id
      name: newUser.name,
      email: newUser.email,
      emergencyContact: newUser.emergencyContact,
    };

    res.status(201).json({ user: userResponse, sessionToken, refreshToken });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Internal server error during signup" });
  }
};

export const login = async (req, res) => {
  try {
    console.log("Login request body:", req.body);
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const sessionToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });

    user.refreshToken = refreshToken;
    await user.save();

    const userResponse = {
      id: user._id, // Mongoose uses ._id
      name: user.name,
      email: user.email,
      emergencyContact: user.emergencyContact,
    };

    res.status(200).json({ user: userResponse, sessionToken, refreshToken });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error during login" });
  }
};

export const refreshSessionToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "No refresh token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(decoded.id); // Mongoose's find by ID
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newSessionToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const newRefreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      sessionToken: newSessionToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh Token Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const verifyToken = async (req, res) => {
  try {
    if (req.user) {
      res.status(200).json({ message: "Token verified successfully" });
    }
  } catch (error) {
    console.log("Error in verifying the token.", error.message);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required." });
    }
    
    // Find the user by the refresh token
    const user = await User.findOne({ refreshToken });
    
    if (!user) {
      // Token is invalid or user is already logged out
      return res.status(200).json({ message: "User is already logged out." });
    }

    user.refreshToken = undefined; // Or null, depending on your preference
    await user.save();

    res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal Server Error." });
  }
};