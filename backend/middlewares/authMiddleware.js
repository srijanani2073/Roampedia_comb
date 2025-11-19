import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Authentication Middleware
 * Protects routes by verifying JWT tokens
 */

/**
 * Verify JWT token and attach user to request
 * Usage: router.get('/protected', auth, (req, res) => { ... })
 */
export const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header("Authorization");
    
    if (!authHeader) {
      return res.status(401).json({
        error: "No authentication token, access denied",
      });
    }

    // Extract token (format: "Bearer TOKEN")
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "No authentication token, access denied",
      });
    }
    console.log("SIGNING TOKEN WITH SECRET =", process.env.JWT_SECRET);


    // Verify token
    const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET || "0bd8bf735d86f36ca8c04f512508e89ca4cc1dbae2a07af0e28464238bdc8e1fcb6ab73f34bde2c4883ab84e487df2c478e04196696f76cb0bbf1e7e8f4be759"
    );

    // Find user by ID from token
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        error: "Token is valid but user not found",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: "User account is deactivated",
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token has expired",
        code: "TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
      });
    }

    console.error("Auth middleware error:", error);
    res.status(500).json({
      error: "Server error during authentication",
    });
  }
};

/**
 * Optional auth - doesn't fail if no token
 * But attaches user if token is valid
 * Usage: router.get('/public', optionalAuth, (req, res) => { ... })
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      // No token, but that's okay - continue as guest
      req.user = null;
      req.userId = "guest";
      return next();
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      req.user = null;
      req.userId = "guest";
      return next();
    }

    // Try to verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (user && user.isActive) {
      req.user = user;
      req.userId = user._id.toString();
    } else {
      req.user = null;
      req.userId = "guest";
    }

    next();
  } catch (error) {
    // Token invalid, but that's okay for optional auth
    req.user = null;
    req.userId = "guest";
    next();
  }
};

/**
 * Check if user is admin
 * Usage: router.delete('/admin', auth, isAdmin, (req, res) => { ... })
 */
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin access required",
    });
  }

  next();
};

/**
 * Rate limiting helper (simple in-memory version)
 * For production, use Redis or a proper rate limiter
 */
const loginAttempts = new Map();

export const rateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!loginAttempts.has(identifier)) {
      loginAttempts.set(identifier, []);
    }

    const attempts = loginAttempts.get(identifier);
    
    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter(
      (timestamp) => now - timestamp < windowMs
    );

    if (recentAttempts.length >= maxAttempts) {
      return res.status(429).json({
        error: "Too many attempts, please try again later",
        retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000),
      });
    }

    recentAttempts.push(now);
    loginAttempts.set(identifier, recentAttempts);

    next();
  };
};

export default {
  auth,
  optionalAuth,
  isAdmin,
  rateLimit,
};