/**
 * Script to find all orders where shippingAddress.country === "USA"
 * Run: node scripts/findUSAOrders.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const orderModel = require("../models/orderModle");
require("../models/authModel"); // Register auth model for populate

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const findUSAOrders = async () => {
  try {
    await connectDB();

    // Find orders where shipping country is USA
    const usaOrders = await orderModel.find({
      "shippingAddress.country": "USA",
      isDelete: { $ne: true } // exclude deleted orders
    })
    .populate("store", "storeName ownerName email zipCode state")
    .sort({ createdAt: -1 })
    .lean();

    console.log(`\n📦 Total USA Orders Found: ${usaOrders.length}\n`);

    if (usaOrders.length === 0) {
      console.log("No orders found with shipping country = USA");
    } else {
      usaOrders.forEach((order, index) => {
        console.log(`--- Order ${index + 1} ---`);
        console.log(`Order Number: ${order.orderNumber}`);
        console.log(`Store: ${order.store?.storeName || "N/A"}`);
        console.log(`Total: $${order.total}`);
        console.log(`ZIPCODE: ${order.store.zipCode}`);
        console.log(`STATE: ${order.store.state}`);
        console.log(`Status: ${order.status}`);
        console.log(`Payment Status: ${order.paymentStatus}`);
        console.log(`Shipping To: ${order.shippingAddress?.name}, ${order.shippingAddress?.city}, ${order.shippingAddress?.country}`);
        console.log(`Created At: ${order.createdAt}`);
        console.log("");
      });
    }

    // Summary
    const totalAmount = usaOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    console.log(`\n📊 Summary:`);
    console.log(`Total USA Orders: ${usaOrders.length}`);
    console.log(`Total Amount: $${totalAmount.toFixed(2)}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB Disconnected");
  }
};

findUSAOrders();
