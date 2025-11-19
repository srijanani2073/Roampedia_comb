/**
 * Create Admin User Script
 * 
 * This script creates an admin user in the database.
 * Run this ONCE to set up your first admin account.
 * 
 * Usage:
 *   node create-admin.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import readline from "readline";
import User from "./models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      dbName: "roampedia",
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB\n");

    console.log("========================================");
    console.log("      CREATE ADMIN USER");
    console.log("========================================\n");

    // Get admin details
    const email = await question("Enter admin email: ");
    const password = await question("Enter admin password (min 6 characters): ");
    const firstName = await question("Enter first name: ");
    const lastName = await question("Enter last name: ");

    // Validate inputs
    if (!email || !password || !firstName || !lastName) {
      console.error("❌ All fields are required!");
      process.exit(1);
    }

    if (password.length < 6) {
      console.error("❌ Password must be at least 6 characters!");
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      console.log("\n⚠️  User with this email already exists!");
      
      if (existingUser.role === "admin") {
        console.log("✅ This user is already an admin.");
        process.exit(0);
      }
      
      const upgrade = await question("Do you want to upgrade this user to admin? (yes/no): ");
      
      if (upgrade.toLowerCase() === "yes" || upgrade.toLowerCase() === "y") {
        existingUser.role = "admin";
        await existingUser.save();
        console.log("\n✅ User upgraded to admin successfully!");
        console.log(`   Email: ${existingUser.email}`);
        console.log(`   Role: ${existingUser.role}`);
      } else {
        console.log("❌ Operation cancelled.");
      }
      
      process.exit(0);
    }

    // Create new admin user
    const adminUser = new User({
      email: email.toLowerCase(),
      password: password, // Will be hashed by pre-save hook
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      role: "admin",
      isActive: true,
      isEmailVerified: true
    });

    await adminUser.save();

    console.log("\n========================================");
    console.log("✅ Admin user created successfully!");
    console.log("========================================");
    console.log(`Email: ${adminUser.email}`);
    console.log(`Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`Created: ${adminUser.createdAt}`);
    console.log("\n📝 You can now log in with these credentials.");
    console.log("🛡️  Navigate to /admin to access the admin dashboard.\n");

  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log("👋 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the script
createAdmin();