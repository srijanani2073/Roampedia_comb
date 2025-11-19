import express from "express";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import { auth, rateLimit } from "../middlewares/authMiddleware.js";

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "0bd8bf735d86f36ca8c04f512508e89ca4cc1dbae2a07af0e28464238bdc8e1fcb6ab73f34bde2c4883ab84e487df2c478e04196696f76cb0bbf1e7e8f4be759";
const JWT_EXPIRES_IN = "24h"; // Access token expires in 24 hours
const REFRESH_TOKEN_EXPIRES_IN = "30d"; // Refresh token expires in 30 days

/**
 * Helper: Generate JWT tokens
 */
function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign({ userId, type: "refresh" }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("firstName").optional().trim(),
    body("lastName").optional().trim(),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          error: "User with this email already exists",
        });
      }

      // Create new user
      const user = new User({
        email,
        password, // Will be hashed by pre-save middleware
        firstName,
        lastName,
        displayName: firstName || email.split("@")[0],
      });

      await user.save();

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id);

      // Save refresh token to user
      user.refreshTokens.push({
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        device: req.headers["user-agent"] || "Unknown",
      });
      
      user.lastLogin = new Date();
      await user.save();

      console.log(`✅ New user registered: ${email}`);

      res.status(201).json({
        success: true,
        message: "Registration successful",
        user: user.toPublicJSON(),
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Registration failed",
        details: error.message,
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post(
  "/login",
  rateLimit(5, 15 * 60 * 1000), // Max 5 attempts per 15 minutes
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").exists().withMessage("Password required"),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user (include password for comparison)
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.status(401).json({
          error: "Invalid email or password",
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          error: "Account is deactivated",
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({
          error: "Invalid email or password",
        });
      }
      console.log("SIGNING TOKEN WITH SECRET =", process.env.JWT_SECRET);


      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id);

      // Save refresh token
      user.refreshTokens.push({
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        device: req.headers["user-agent"] || "Unknown",
      });
      console.log("SIGNING TOKEN WITH SECRET =", process.env.JWT_SECRET);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      console.log(`✅ User logged in: ${email}`);

      res.json({
        success: true,
        message: "Login successful",
        user: user.toPublicJSON(),
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        error: "Login failed",
        details: error.message,
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token required",
      });
    }
    console.log("SIGNING TOKEN WITH SECRET =", process.env.JWT_SECRET);


    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        error: "Invalid token type",
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Invalid refresh token",
      });
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(
      (t) => t.token === refreshToken && t.expiresAt > new Date()
    );

    if (!tokenExists) {
      return res.status(401).json({
        error: "Refresh token expired or invalid",
      });
    }

    // Generate new access token (but keep same refresh token)
    const { accessToken } = generateTokens(user._id);

    res.json({
      success: true,
      accessToken,
      refreshToken, // Return same refresh token
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({
      error: "Invalid refresh token",
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
router.post("/logout", auth, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove specific refresh token
      req.user.refreshTokens = req.user.refreshTokens.filter(
        (t) => t.token !== refreshToken
      );
      await req.user.save();
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      error: "Logout failed",
    });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
router.post("/logout-all", auth, async (req, res) => {
  try {
    // Remove all refresh tokens
    req.user.refreshTokens = [];
    await req.user.save();

    res.json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (error) {
    console.error("Logout all error:", error);
    res.status(500).json({
      error: "Logout failed",
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get("/me", auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.toPublicJSON(),
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      error: "Failed to get user info",
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put(
  "/profile",
  auth,
  [
    body("firstName").optional().trim(),
    body("lastName").optional().trim(),
    body("displayName").optional().trim(),
    body("avatar").optional().isURL().withMessage("Avatar must be a valid URL"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { firstName, lastName, displayName, avatar } = req.body;

      // Update allowed fields
      if (firstName !== undefined) req.user.firstName = firstName;
      if (lastName !== undefined) req.user.lastName = lastName;
      if (displayName !== undefined) req.user.displayName = displayName;
      if (avatar !== undefined) req.user.avatar = avatar;

      await req.user.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: req.user.toPublicJSON(),
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({
        error: "Failed to update profile",
      });
    }
  }
);

/**
 * PUT /api/auth/password
 * Change password
 */
router.put(
  "/password",
  auth,
  [
    body("currentPassword").exists().withMessage("Current password required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user._id).select("+password");

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);

      if (!isPasswordValid) {
        return res.status(401).json({
          error: "Current password is incorrect",
        });
      }

      // Update password (will be hashed by pre-save middleware)
      user.password = newPassword;
      
      // Invalidate all refresh tokens for security
      user.refreshTokens = [];
      
      await user.save();

      // Generate new tokens
      const { accessToken, refreshToken } = generateTokens(user._id);

      user.refreshTokens.push({
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        device: req.headers["user-agent"] || "Unknown",
      });

      await user.save();

      res.json({
        success: true,
        message: "Password changed successfully",
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({
        error: "Failed to change password",
      });
    }
  }
);

/**
 * DELETE /api/auth/account
 * Delete user account
 */
router.delete("/account", auth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: "Password required to delete account",
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Incorrect password",
      });
    }

    // Soft delete - deactivate account
    user.isActive = false;
    user.refreshTokens = [];
    await user.save();

    // Or hard delete:
    // await User.findByIdAndDelete(req.user._id);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    res.status(500).json({
      error: "Failed to delete account",
    });
  }
});

export default router;