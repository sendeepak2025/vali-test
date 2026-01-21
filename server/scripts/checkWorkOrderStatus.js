/**
 * Work Order Status Checker
 * Verifies if PreOrders have actual Orders created
 * Checks for shortages and provides actionable insights
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

// Main check function
const checkWorkOrderStatus = async (workOrderId) => {
  try {
    console.log("\n🔍 Starting Work Order Status Check...\n");
    console.log("=".repeat(80));

    // Fetch Work Order (without populate to avoid schema issues)
    const workOrder = await WorkOrder.findById(workOrderId);

    if (!workOrder) {
      console.log("❌ Work Order not found!");
      return;
    }

    console.log(`\n📋 Work Order: ${workOrder.workOrderNumber}`);
    console.log(`📅 Week: ${workOrder.weekLabel}`);
    console.log(`📊 Status: ${workOrder.status}`);
    console.log("=".repeat(80));

    // Summary
    console.log("\n📊 SUMMARY:");
    console.log(`   Total PreOrders: ${workOrder.totalPreOrders}`);
    console.log(`   Total Orders: ${workOrder.totalOrders}`);
    console.log(`   Total Stores: ${workOrder.totalStores}`);
    console.log(`   Total Products: ${workOrder.totalProducts}`);
    console.log(`   Has Shortage: ${workOrder.hasShortage ? "❌ YES" : "✅ NO"}`);
    if (workOrder.hasShortage) {
      console.log(`   Short Products: ${workOrder.shortProductCount}`);
      console.log(`   Total Shortage Qty: ${workOrder.totalShortageQuantity}`);
    }

    // Check PreOrders
    console.log("\n" + "=".repeat(80));
    console.log("📦 PREORDER STATUS CHECK:");
    console.log("=".repeat(80));

    const preOrderIds = workOrder.confirmedPreOrders.map(p => p._id || p);
    const preOrders = await PreOrder.find({ _id: { $in: preOrderIds } });

    let confirmedCount = 0;
    let unconfirmedCount = 0;
    let withOrderCount = 0;
    let withoutOrderCount = 0;

    const preOrderStatus = [];

    for (const preOrder of preOrders) {
      const status = {
        preOrderNumber: preOrder.preOrderNumber,
        preOrderId: preOrder._id.toString(),
        confirmed: preOrder.confirmed,
        hasOrderId: !!preOrder.orderId,
        orderId: preOrder.orderId?.toString() || null,
        orderExists: false,
        orderNumber: null,
        storeName: null,
      };

      if (preOrder.confirmed) confirmedCount++;
      else unconfirmedCount++;

      // Check if order actually exists
      if (preOrder.orderId) {
        withOrderCount++;
        const order = await Order.findById(preOrder.orderId);
        if (order) {
          status.orderExists = true;
          status.orderNumber = order.orderNumber;
          
          // Get store name separately
          if (order.store) {
            const store = await Auth.findById(order.store);
            status.storeName = store?.storeName || "Unknown";
          }
        }
      } else {
        withoutOrderCount++;
      }

      preOrderStatus.push(status);
    }

    // Display PreOrder Status
    console.log(`\n✅ Confirmed PreOrders: ${confirmedCount}`);
    console.log(`❌ Unconfirmed PreOrders: ${unconfirmedCount}`);
    console.log(`📝 PreOrders with Order ID: ${withOrderCount}`);
    console.log(`⚠️  PreOrders without Order ID: ${withoutOrderCount}`);

    console.log("\n📋 DETAILED PREORDER STATUS:");
    console.log("-".repeat(80));
    preOrderStatus.forEach((status, index) => {
      console.log(`\n${index + 1}. PreOrder: ${status.preOrderNumber}`);
      console.log(`   ID: ${status.preOrderId}`);
      console.log(`   Confirmed: ${status.confirmed ? "✅ Yes" : "❌ No"}`);
      console.log(`   Has Order ID: ${status.hasOrderId ? "✅ Yes" : "❌ No"}`);
      if (status.hasOrderId) {
        console.log(`   Order ID: ${status.orderId}`);
        console.log(`   Order Exists: ${status.orderExists ? "✅ Yes" : "❌ No"}`);
        if (status.orderExists) {
          console.log(`   Order Number: ${status.orderNumber}`);
          console.log(`   Store: ${status.storeName}`);
        }
      }
    });

    // Check Store Allocations
    console.log("\n" + "=".repeat(80));
    console.log("🏪 STORE ALLOCATION CHECK:");
    console.log("=".repeat(80));

    const storeAllocationStatus = [];

    for (const allocation of workOrder.storeAllocations) {
      const status = {
        storeName: allocation.storeName,
        storeId: allocation.store.toString(),
        orderId: allocation.order?.toString() || null,
        orderExists: false,
        orderNumber: null,
        totalOrdered: allocation.totalOrdered,
        totalAllocated: allocation.totalAllocated,
        totalShortage: allocation.totalShortage,
        allocationStatus: allocation.allocationStatus,
        pickingStatus: allocation.pickingStatus,
      };

      // Check if order exists
      if (allocation.order) {
        const order = await Order.findById(allocation.order);
        if (order) {
          status.orderExists = true;
          status.orderNumber = order.orderNumber;
        }
      }

      storeAllocationStatus.push(status);
    }

    // Display Store Allocation Status
    storeAllocationStatus.forEach((status, index) => {
      console.log(`\n${index + 1}. Store: ${status.storeName}`);
      console.log(`   Store ID: ${status.storeId}`);
      console.log(`   Order ID: ${status.orderId || "❌ None"}`);
      console.log(`   Order Exists: ${status.orderExists ? "✅ Yes" : "❌ No"}`);
      if (status.orderExists) {
        console.log(`   Order Number: ${status.orderNumber}`);
      }
      console.log(`   Ordered: ${status.totalOrdered}`);
      console.log(`   Allocated: ${status.totalAllocated}`);
      console.log(`   Shortage: ${status.totalShortage > 0 ? `❌ ${status.totalShortage}` : "✅ 0"}`);
      console.log(`   Allocation Status: ${status.allocationStatus}`);
      console.log(`   Picking Status: ${status.pickingStatus}`);
    });

    // Check Shortages
    if (workOrder.hasShortage) {
      console.log("\n" + "=".repeat(80));
      console.log("⚠️  SHORTAGE DETAILS:");
      console.log("=".repeat(80));

      const shortProducts = workOrder.products.filter(p => p.shortage < 0);
      
      console.log(`\nTotal Short Products: ${shortProducts.length}`);
      console.log("-".repeat(80));

      shortProducts.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.productName}`);
        console.log(`   Product ID: ${product.product}`);
        console.log(`   Total Ordered: ${product.totalOrdered}`);
        console.log(`   Total Available: ${product.totalAvailable}`);
        console.log(`   Current Stock: ${product.currentStock}`);
        console.log(`   Incoming Stock: ${product.incomingStock}`);
        console.log(`   Shortage: ❌ ${Math.abs(product.shortage)}`);
        console.log(`   Status: ${product.status}`);
      });
    }

    // Recommendations
    console.log("\n" + "=".repeat(80));
    console.log("💡 RECOMMENDATIONS:");
    console.log("=".repeat(80));

    if (unconfirmedCount > 0) {
      console.log("\n⚠️  Action Required: Unconfirmed PreOrders Found");
      console.log("   Run: POST /api/v1/work-orders/:id/reconfirm-preorders");
      console.log("   Body: { autoUnconfirm: true }");
    }

    if (withoutOrderCount > 0) {
      console.log("\n⚠️  Action Required: PreOrders without Orders");
      console.log("   These PreOrders are confirmed but don't have Order IDs");
      console.log("   Possible reasons:");
      console.log("   - Order creation failed due to shortage");
      console.log("   - Database inconsistency");
      console.log("   Solution: Re-confirm these PreOrders");
    }

    const storesWithoutOrders = storeAllocationStatus.filter(s => !s.orderExists);
    if (storesWithoutOrders.length > 0) {
      console.log("\n⚠️  Action Required: Store Allocations without Orders");
      console.log(`   ${storesWithoutOrders.length} store(s) don't have actual orders`);
      storesWithoutOrders.forEach(s => {
        console.log(`   - ${s.storeName} (Order ID: ${s.orderId || "None"})`);
      });
    }

    if (workOrder.hasShortage) {
      console.log("\n⚠️  Action Required: Resolve Shortages");
      console.log("   Steps:");
      console.log("   1. Add incoming stock for short products");
      console.log("   2. Link incoming stock to vendor");
      console.log("   3. Stock will auto-update after vendor approval");
      console.log("\n   Top 3 Shortages:");
      const topShortages = workOrder.products
        .filter(p => p.shortage < 0)
        .sort((a, b) => a.shortage - b.shortage)
        .slice(0, 3);
      
      topShortages.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.productName}: ${Math.abs(p.shortage)} units`);
        console.log(`      Product ID: ${p.product}`);
      });
    }

    if (confirmedCount === preOrders.length && 
        withOrderCount === preOrders.length && 
        !workOrder.hasShortage) {
      console.log("\n✅ All Good! Everything is working perfectly.");
      console.log("   - All PreOrders confirmed");
      console.log("   - All Orders created");
      console.log("   - No shortages");
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Check Complete!");
    console.log("=".repeat(80) + "\n");

  } catch (error) {
    console.error("\n❌ Error during check:", error);
  }
};

// Run script
const run = async () => {
  await connectDB();

  // Get Work Order ID from command line or use default
  const workOrderId = process.argv[2] || "6970edda0cd6b3ba585a37d3";

  console.log(`\n🔍 Checking Work Order: ${workOrderId}\n`);

  await checkWorkOrderStatus(workOrderId);

  await mongoose.connection.close();
  console.log("\n✅ Database connection closed\n");
  process.exit(0);
};

run();
