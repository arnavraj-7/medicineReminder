import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js"; // Make sure the path is correct

dotenv.config();

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided or token is malformed" });
  }

  const token = authHeader.split(" ")[1]; // Get token from "Bearer TOKEN"

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID and exclude the password from the result
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ error: "Invalid token: User not found" });
    }

    req.user = user; // Attach user object to the request
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
export default authMiddleware;