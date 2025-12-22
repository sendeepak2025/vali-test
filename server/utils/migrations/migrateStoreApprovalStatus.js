/**
 * Migration script to update existing stores with approval status
 * Run this once to set all existing stores to "approved" status
 * 
 * Usage: node server/utils/migrations/migrateStoreApprovalStatus.js
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const authModel = require("../../models/authModel");

const migrateStoreApprovalStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB");

    // Update all existing stores that don't have approvalStatus set
    const result = await authModel.updateMany(
      { 
        role: "store",
        $or: [
          { approvalStatus: { $exists: false } },
          { approvalStatus: null }
        ]
      },
      { 
        $set: { 
          approvalStatus: "approved",
          approvedAt: new Date()
        }
      }
    );

    console.log(`Migration complete: ${result.modifiedCount} stores updated to approved status`);

    // Also update admin and member roles to approved (they don't need approval workflow)
    const nonStoreResult = await authModel.updateMany(
      { 
        role: { $in: ["admin", "member"] },
        $or: [
          { approvalStatus: { $exists: false } },
          { approvalStatus: null }
        ]
      },
      { 
        $set: { 
          approvalStatus: "approved"
        }
      }
    );

    console.log(`${nonStoreResult.modifiedCount} admin/member users updated to approved status`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateStoreApprovalStatus();
