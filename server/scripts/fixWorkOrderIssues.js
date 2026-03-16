/**
 * Work Order Issue Fixer
 * Automatically fixes common issues:
 * - Unconfirms PreOrders without Orders
 * - Re-confirms them to create Orders
 * - Reports results
 */

const mongoose = require("mongoose");
require("dotenv").config();

const WorkOrder = require("../models/workOrderModel");
const PreOrder = require("../models/preOrderModel");
const Order = require("../models/orderModle");
const Auth = require("../models/authModel"); // ⬅️ Add auth model

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

// Fix function
const fixWorkOrderIssues = async (workOrderId, dryRun = true) => {
  try {
    console.log("\n🔧 Starting Work Order Issue Fixer...\n");
    console.log("=".repeat(80));
    
    if (dryRun) {
      console.log("⚠️  DRY RUN MODE - No changes will be made");
      console.log("   Run with --fix flag to apply changes");
    } else {
      console.log("🚨 LIVE MODE - Changes will be applied!");
    }
    
    console.log("=".repeat(80));

    // Fetch Work Order
    const workOrder = await WorkOrder.findById(workOrderId);

    if (!workOrder) {
      console.log("❌ Work Order not found!");
      return;
    }

    console.log(`\n📋 Work Order: ${workOrder.workOrderNumber}`);
    console.log(`📅 Week: ${workOrder.weekLabel}`);

    // Get PreOrders
    const preOrderIds = workOrder.confirmedPreOrders;
    const preOrders = await PreOrder.find({ _id: { $in: preOrderIds } });

    console.log(`\n📦 Found ${preOrders.length} PreOrders`);

    // Check each PreOrder
    const issues = {
      confirmedWithoutOrder: [],
      unconfirmed: [],
      orderNotFound: [],
      allGood: [],
    };

    for (const preOrder of preOrders) {
      if (preOrder.confirmed && !preOrder.orderId) {
        issues.confirmedWithoutOrder.push(preOrder);
      } else if (!preOrder.confirmed) {
        issues.unconfirmed.push(preOrder);
      } else if (preOrder.orderId) {
        const order = await Order.findById(preOrder.orderId);
        if (!order) {
          issues.orderNotFound.push(preOrder);
        } else {
          issues.allGood.push(preOrder);
        }
      }
    }

    // Report issues
    console.log("\n" + "=".repeat(80));
    console.log("📊 ISSUE SUMMARY:");
    console.log("=".repeat(80));
    console.log(`✅ PreOrders with valid Orders: ${issues.allGood.length}`);
    console.log(`⚠️  Confirmed but no Order ID: ${issues.confirmedWithoutOrder.length}`);
    console.log(`⚠️  Unconfirmed PreOrders: ${issues.unconfirmed.length}`);
    console.log(`❌ Order ID exists but Order not found: ${issues.orderNotFound.length}`);

    // Fix issues
    const fixes = {
      unconfirmed: [],
      reconfirmed: [],
      failed: [],
    };

    if (!dryRun) {
      console.log("\n" + "=".repeat(80));
      console.log("🔧 APPLYING FIXES:");
      console.log("=".repeat(80));

      // Fix: Confirmed without Order ID
      for (const preOrder of issues.confirmedWithoutOrder) {
        console.log(`\n🔄 Processing: ${preOrder.preOrderNumber}`);
        try {
          // Unconfirm
          preOrder.confirmed = false;
          preOrder.orderId = null;
          preOrder.status = "Processing";
          await preOrder.save();
          
          fixes.unconfirmed.push(preOrder.preOrderNumber);
          console.log(`   ✅ Unconfirmed successfully`);
        } catch (error) {
          console.log(`   ❌ Failed to unconfirm: ${error.message}`);
          fixes.failed.push({
            preOrderNumber: preOrder.preOrderNumber,
            error: error.message,
          });
        }
      }

      // Fix: Order ID exists but Order not found
      for (const preOrder of issues.orderNotFound) {
        console.log(`\n🔄 Processing: ${preOrder.preOrderNumber}`);
        try {
          // Unconfirm
          preOrder.confirmed = false;
          preOrder.orderId = null;
          preOrder.status = "Processing";
          await preOrder.save();
          
          fixes.unconfirmed.push(preOrder.preOrderNumber);
          console.log(`   ✅ Unconfirmed successfully (Order not found)`);
        } catch (error) {
          console.log(`   ❌ Failed to unconfirm: ${error.message}`);
          fixes.failed.push({
            preOrderNumber: preOrder.preOrderNumber,
            error: error.message,
          });
        }
      }

      console.log("\n" + "=".repeat(80));
      console.log("✅ FIXES APPLIED:");
      console.log("=".repeat(80));
      console.log(`   Unconfirmed: ${fixes.unconfirmed.length}`);
      console.log(`   Failed: ${fixes.failed.length}`);

      if (fixes.failed.length > 0) {
        console.log("\n❌ Failed PreOrders:");
        fixes.failed.forEach(f => {
          console.log(`   - ${f.preOrderNumber}: ${f.error}`);
        });
      }

      if (fixes.unconfirmed.length > 0) {
        console.log("\n💡 Next Step:");
        console.log("   Call the re-confirm API to create Orders:");
        console.log(`   POST /api/v1/work-orders/${workOrderId}/reconfirm-preorders`);
        console.log("   Body: { autoUnconfirm: true }");
      }
    } else {
      console.log("\n" + "=".repeat(80));
      console.log("💡 RECOMMENDED ACTIONS (Dry Run):");
      console.log("=".repeat(80));

      if (issues.confirmedWithoutOrder.length > 0) {
        console.log("\n⚠️  Would unconfirm these PreOrders:");
        issues.confirmedWithoutOrder.forEach(p => {
          console.log(`   - ${p.preOrderNumber}`);
        });
      }

      if (issues.orderNotFound.length > 0) {
        console.log("\n⚠️  Would unconfirm these PreOrders (Order not found):");
        issues.orderNotFound.forEach(p => {
          console.log(`   - ${p.preOrderNumber} (Order ID: ${p.orderId})`);
        });
      }

      if (issues.unconfirmed.length > 0) {
        console.log("\n⚠️  These PreOrders are already unconfirmed:");
        issues.unconfirmed.forEach(p => {
          console.log(`   - ${p.preOrderNumber}`);
        });
      }

      if (issues.confirmedWithoutOrder.length > 0 || 
          issues.orderNotFound.length > 0 || 
          issues.unconfirmed.length > 0) {
        console.log("\n💡 To apply fixes, run:");
        console.log(`   node scripts/fixWorkOrderIssues.js ${workOrderId} --fix`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Fix Process Complete!");
    console.log("=".repeat(80) + "\n");

  } catch (error) {
    console.error("\n❌ Error during fix:", error);
  }
};

// Run script
const run = async () => {
  await connectDB();

  const workOrderId = process.argv[2] || "6970edda0cd6b3ba585a37d3";
  const fixFlag = process.argv[3] === "--fix";

  await fixWorkOrderIssues(workOrderId, !fixFlag);

  await mongoose.connection.close();
  console.log("\n✅ Database connection closed\n");
  process.exit(0);
};

run();
