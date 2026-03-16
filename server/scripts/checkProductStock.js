const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Product = require("../models/productModel");

const PRODUCT_ID = "68b9ccb574069ff726f3c2bc";
const FROM_DATE = new Date("2026-01-05T00:00:00.000Z");
const TO_DATE = new Date(); // Current date

const filterByDate = (arr, from, to) => {
  if (!arr || arr.length === 0) return [];
  return arr.filter(item => {
    const d = new Date(item.date);
    return d >= from && d <= to;
  });
};

const checkProductStock = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB\n");

    const product = await Product.findById(PRODUCT_ID).lean();
    
    if (!product) {
      console.log("❌ Product not found!");
      return;
    }

    console.log("=".repeat(60));
    console.log(`📦 Product: ${product.name}`);
    console.log(`📅 Date Range: ${FROM_DATE.toISOString()} to ${TO_DATE.toISOString()}`);
    console.log("=".repeat(60));

    // Filter histories by date range
    const purchaseHistory = filterByDate(product.purchaseHistory || [], FROM_DATE, TO_DATE);
    const salesHistory = filterByDate(product.salesHistory || [], FROM_DATE, TO_DATE);
    const trashHistory = filterByDate(product.quantityTrash || [], FROM_DATE, TO_DATE);

    // Calculate totals
    const totalPurchase = purchaseHistory.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalSales = salesHistory.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalTrash = trashHistory.filter(t => t.type === "box").reduce((sum, t) => sum + (t.quantity || 0), 0);

    const carryForwardBox = product.carryForwardBox || 0;
    const manuallyAddBox = product.manuallyAddBox?.quantity || 0;

    // Final remaining calculation
    const remaining = carryForwardBox + totalPurchase - totalSales - totalTrash + manuallyAddBox;

    console.log("\n📊 PURCHASE HISTORY:");
    console.log("-".repeat(40));
    if (purchaseHistory.length === 0) {
      console.log("No purchases in this date range");
    } else {
      purchaseHistory.forEach((p, i) => {
        console.log(`${i + 1}. Date: ${new Date(p.date).toISOString().split('T')[0]} | Qty: ${p.quantity}`);
      });
    }
    console.log(`\n📦 Total Purchase: ${totalPurchase}`);

    console.log("\n📊 SALES HISTORY:");
    console.log("-".repeat(40));
    if (salesHistory.length === 0) {
      console.log("No sales in this date range");
    } else {
      salesHistory.forEach((s, i) => {
        console.log(`${i + 1}. Date: ${new Date(s.date).toISOString().split('T')[0]} | Qty: ${s.quantity}`);
      });
    }
    console.log(`\n🛒 Total Sales: ${totalSales}`);

    console.log("\n📊 TRASH HISTORY (Box):");
    console.log("-".repeat(40));
    const boxTrash = trashHistory.filter(t => t.type === "box");
    if (boxTrash.length === 0) {
      console.log("No trash in this date range");
    } else {
      boxTrash.forEach((t, i) => {
        console.log(`${i + 1}. Date: ${new Date(t.date).toISOString().split('T')[0]} | Qty: ${t.quantity}`);
      });
    }
    console.log(`\n🗑️ Total Trash: ${totalTrash}`);

    console.log("\n" + "=".repeat(60));
    console.log("📈 CALCULATION:");
    console.log("=".repeat(60));
    console.log(`CarryForward Box: ${carryForwardBox}`);
    console.log(`+ Total Purchase:  ${totalPurchase}`);
    console.log(`- Total Sales:     ${totalSales}`);
    console.log(`- Total Trash:     ${totalTrash}`);
    console.log(`+ Manually Added:  ${manuallyAddBox}`);
    console.log("-".repeat(40));
    console.log(`= REMAINING:       ${remaining}`);
    console.log("=".repeat(60));

    console.log("\n📋 DATABASE VALUES:");
    console.log(`product.remaining: ${product.remaining}`);
    console.log(`product.totalPurchase: ${product.totalPurchase}`);
    console.log(`product.totalSell: ${product.totalSell}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
};

checkProductStock();
