/**
 * Script to fix USA orders:
 * - billingAddress.country = store.state
 * - billingAddress.postalCode = store.zipCode
 * - shippingAddress.country = store.state
 * - shippingAddress.postalCode = store.zipCode
 * 
 * Run: node scripts/fixUSAOrders.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const orderModel = require("../models/orderModle");
require("../models/authModel");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const fixUSAOrders = async () => {
  try {
    await connectDB();

    // Find USA orders with store populated
    const usaOrders = await orderModel.find({
      $or: [
        { "shippingAddress.country": "USA" },
        { "billingAddress.country": "USA" }
      ],
      isDelete: { $ne: true }
    }).populate("store", "storeName state zipCode");

    console.log(`\n📦 Total USA Orders Found: ${usaOrders.length}\n`);

    let updatedCount = 0;

    for (const order of usaOrders) {
      const store = order.store;
      
      if (!store || !store.state || !store.zipCode) {
        console.log(`⚠️ Skipping Order ${order.orderNumber} - Store data missing (state/zipCode)`);
        continue;
      }

      // Update billing address
      if (order.billingAddress?.country === "USA") {
        order.billingAddress.country = store.state;
        order.billingAddress.postalCode = store.zipCode;
      }

      // Update shipping address
      if (order.shippingAddress?.country === "USA") {
        order.shippingAddress.country = store.state;
        order.shippingAddress.postalCode = store.zipCode;
      }

      await order.save();
      updatedCount++;

      console.log(`✅ Updated Order ${order.orderNumber}`);
      console.log(`   Store: ${store.storeName}`);
      console.log(`   New Country: ${store.state}`);
      console.log(`   New PostalCode: ${store.zipCode}`);
      console.log("");
    }

    console.log(`\n📊 Summary:`);
    console.log(`Total Orders Found: ${usaOrders.length}`);
    console.log(`Orders Updated: ${updatedCount}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB Disconnected");
  }
};

fixUSAOrders();
