import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * User Model - Authentication & Profile
 * Handles user accounts with secure password storage
 */

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password in queries by default
    },
    
    // Profile Info
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String, // URL to profile picture
    },
    
    // Account Status
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    
    // Preferences & Settings
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      newsletter: {
        type: Boolean,
        default: false,
      },
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "auto",
      },
    },
    
    // Security
    lastLogin: {
      type: Date,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    // Refresh Tokens (for staying logged in)
    refreshTokens: [{
      token: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
      expiresAt: Date,
      device: String, // Browser/device info
    }],
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });

/**
 * Hash password before saving
 * Runs automatically before user.save()
 */
userSchema.pre("save", async function (next) {
  // Only hash password if it's modified or new
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password for login
 * Usage: await user.comparePassword('userInputPassword')
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

/**
 * Get public profile (safe to send to frontend)
 * Excludes sensitive fields like password, tokens
 */
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    displayName: this.displayName || this.firstName || "User",
    avatar: this.avatar,
    isEmailVerified: this.isEmailVerified,
    role: this.role,
    preferences: this.preferences,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin,
  };
};

/**
 * Get full name
 */
userSchema.virtual("fullName").get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.displayName || this.firstName || "User";
});

// Ensure virtuals are included in JSON
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const User = mongoose.model("User", userSchema);

export default User;