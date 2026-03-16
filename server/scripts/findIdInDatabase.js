/**
 * Universal ID Finder
 * Searches for an ID across all collections in the database
 * Shows complete document details
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import all models
const WorkOrder = require("../models/workOrderModel");
const PreOrder = require("../models/preOrderModel");
const Order = require("../models/orderModle");
const Auth = require("../models/authModel");
const Product = require("../models/productModel");
const Purchase = require("../models/purchaseModel");
const Vendor = require("../models/vendorModel");
const IncomingStock = require("../models/incomingStockModel");
const Counter = require("../models/counterModel");
const CreditMemo = require("../models/creditMemosModel");
const Invoice = require("../models/invoiceModel");
const Notification = require("../models/notificationModel");
const Category = require("../models/categoryModel");
const Adjustment = require("../models/adjustmentModel");
const Expense = require("../models/expenseModel");
const QualityIssue = require("../models/qualityIssueModel");
const StoreInventory = require("../models/storeInventoryModel");
const Task = require("../models/taskModel");
const Trip = require("../models/tripModel");
const DriverAndTruck = require("../models/DriverAndTruckModel");
const VendorCreditMemo = require("../models/vendorCreditMemoModel");
const VendorDispute = require("../models/vendorDisputeModel");
const VendorPayment = require("../models/vendorPaymentModel");
const Contact = require("../models/contact");
const DealCrm = require("../models/DealCrmModel");
const Member = require("../models/Member");
const PriceListTemplate = require("../models/PriceListTemplate");
const GroupPricing = require("../models/groupPricing");

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

// All models to search
const modelsToSearch = [
  { name: "Order", model: Order, description: "Customer Orders" },
  { name: "PreOrder", model: PreOrder, description: "Pre-Orders" },
  { name: "WorkOrder", model: WorkOrder, description: "Work Orders" },
  { name: "Auth/Store", model: Auth, description: "Users/Stores/Members" },
  { name: "Product", model: Product, description: "Products" },
  { name: "Purchase", model: Purchase, description: "Purchase Orders" },
  { name: "Vendor", model: Vendor, description: "Vendors" },
  { name: "IncomingStock", model: IncomingStock, description: "Incoming Stock" },
  { name: "CreditMemo", model: CreditMemo, description: "Credit Memos" },
  { name: "Invoice", model: Invoice, description: "Invoices" },
  { name: "Notification", model: Notification, description: "Notifications" },
  { name: "Category", model: Category, description: "Categories" },
  { name: "Adjustment", model: Adjustment, description: "Adjustments" },
  { name: "Expense", model: Expense, description: "Expenses" },
  { name: "QualityIssue", model: QualityIssue, description: "Quality Issues" },
  { name: "StoreInventory", model: StoreInventory, description: "Store Inventory" },
  { name: "Task", model: Task, description: "Tasks" },
  { name: "Trip", model: Trip, description: "Trips" },
  { name: "DriverAndTruck", model: DriverAndTruck, description: "Drivers & Trucks" },
  { name: "VendorCreditMemo", model: VendorCreditMemo, description: "Vendor Credit Memos" },
  { name: "VendorDispute", model: VendorDispute, description: "Vendor Disputes" },
  { name: "VendorPayment", model: VendorPayment, description: "Vendor Payments" },
  { name: "Contact", model: Contact, description: "CRM Contacts" },
  { name: "DealCrm", model: DealCrm, description: "CRM Deals" },
  { name: "Member", model: Member, description: "Team Members" },
  { name: "PriceListTemplate", model: PriceListTemplate, description: "Price List Templates" },
  { name: "GroupPricing", model: GroupPricing, description: "Group Pricing" },
  { name: "Counter", model: Counter, description: "Counters" },
];

// Search function
const findIdInDatabase = async (searchId) => {
  try {
    console.log("\n🔍 Searching for ID across all collections...\n");
    console.log("=".repeat(80));
    console.log(`🎯 Target ID: ${searchId}`);
    console.log("=".repeat(80));

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(searchId)) {
      console.log("\n❌ Invalid ObjectId format!");
      return;
    }

    const results = [];
    let foundCount = 0;

    // Search in each collection
    for (const { name, model, description } of modelsToSearch) {
      try {
        const doc = await model.findById(searchId).lean();
        
        if (doc) {
          foundCount++;
          results.push({
            collection: name,
            description,
            document: doc,
          });
          console.log(`\n✅ FOUND in ${name} (${description})`);
        }
      } catch (error) {
        // Skip collections that don't exist or have errors
        if (!error.message.includes("buffering timed out")) {
          console.log(`⚠️  Error searching ${name}: ${error.message}`);
        }
      }
    }

    // Display results
    console.log("\n" + "=".repeat(80));
    console.log("📊 SEARCH RESULTS:");
    console.log("=".repeat(80));

    if (foundCount === 0) {
      console.log("\n❌ ID not found in any collection!");
      console.log("\nPossible reasons:");
      console.log("   - Document was deleted");
      console.log("   - ID is incorrect");
      console.log("   - Document exists in a collection not included in search");
    } else {
      console.log(`\n✅ Found in ${foundCount} collection(s)\n`);

      results.forEach((result, index) => {
        console.log("=".repeat(80));
        console.log(`\n${index + 1}. Collection: ${result.collection}`);
        console.log(`   Description: ${result.description}`);
        console.log(`   Document ID: ${result.document._id}`);
        console.log("\n   📄 DOCUMENT DETAILS:");
        console.log("   " + "-".repeat(76));

        // Display key fields based on collection type
        const doc = result.document;

        if (result.collection === "Order") {
          console.log(`   Order Number: ${doc.orderNumber || "N/A"}`);
          console.log(`   Store: ${doc.store || "N/A"}`);
          console.log(`   Status: ${doc.status || "N/A"}`);
          console.log(`   Total: $${doc.total || 0}`);
          console.log(`   Items: ${doc.items?.length || 0}`);
          console.log(`   Order Type: ${doc.orderType || "N/A"}`);
          console.log(`   Created: ${doc.createdAt || "N/A"}`);
          if (doc.preOrder) {
            console.log(`   PreOrder ID: ${doc.preOrder}`);
          }
        } else if (result.collection === "PreOrder") {
          console.log(`   PreOrder Number: ${doc.preOrderNumber || "N/A"}`);
          console.log(`   Store: ${doc.store || "N/A"}`);
          console.log(`   Status: ${doc.status || "N/A"}`);
          console.log(`   Confirmed: ${doc.confirmed ? "✅ Yes" : "❌ No"}`);
          console.log(`   Total: $${doc.total || 0}`);
          console.log(`   Items: ${doc.items?.length || 0}`);
          if (doc.orderId) {
            console.log(`   Order ID: ${doc.orderId}`);
          }
          console.log(`   Created: ${doc.createdAt || "N/A"}`);
        } else if (result.collection === "WorkOrder") {
          console.log(`   Work Order Number: ${doc.workOrderNumber || "N/A"}`);
          console.log(`   Week: ${doc.weekLabel || "N/A"}`);
          console.log(`   Status: ${doc.status || "N/A"}`);
          console.log(`   Total PreOrders: ${doc.totalPreOrders || 0}`);
          console.log(`   Total Orders: ${doc.totalOrders || 0}`);
          console.log(`   Total Stores: ${doc.totalStores || 0}`);
          console.log(`   Has Shortage: ${doc.hasShortage ? "❌ Yes" : "✅ No"}`);
          console.log(`   Created: ${doc.createdAt || "N/A"}`);
        } else if (result.collection === "Auth/Store") {
          console.log(`   Role: ${doc.role || "N/A"}`);
          console.log(`   Name: ${doc.name || doc.storeName || "N/A"}`);
          console.log(`   Email: ${doc.email || "N/A"}`);
          console.log(`   Store Name: ${doc.storeName || "N/A"}`);
          console.log(`   City: ${doc.city || "N/A"}`);
          console.log(`   State: ${doc.state || "N/A"}`);
          console.log(`   Price Category: ${doc.priceCategory || "N/A"}`);
          console.log(`   Approved: ${doc.approved ? "✅ Yes" : "❌ No"}`);
        } else if (result.collection === "Product") {
          console.log(`   Product Name: ${doc.name || "N/A"}`);
          console.log(`   SKU: ${doc.sku || "N/A"}`);
          console.log(`   Category: ${doc.category || "N/A"}`);
          console.log(`   Price: $${doc.price || 0}`);
          console.log(`   Quantity: ${doc.quantity || 0}`);
          console.log(`   Remaining: ${doc.remaining || 0}`);
        } else if (result.collection === "Purchase") {
          console.log(`   PO Number: ${doc.purchaseOrderNumber || "N/A"}`);
          console.log(`   Vendor: ${doc.vendorId || "N/A"}`);
          console.log(`   Status: ${doc.status || "N/A"}`);
          console.log(`   Total: $${doc.totalAmount || 0}`);
          console.log(`   Items: ${doc.items?.length || 0}`);
          console.log(`   Purchase Date: ${doc.purchaseDate || "N/A"}`);
        } else if (result.collection === "Vendor") {
          console.log(`   Vendor Name: ${doc.name || "N/A"}`);
          console.log(`   Email: ${doc.email || "N/A"}`);
          console.log(`   Phone: ${doc.phone || "N/A"}`);
          console.log(`   City: ${doc.city || "N/A"}`);
          console.log(`   State: ${doc.state || "N/A"}`);
        } else if (result.collection === "IncomingStock") {
          console.log(`   Product: ${doc.product || "N/A"}`);
          console.log(`   Quantity: ${doc.quantity || 0}`);
          console.log(`   Status: ${doc.status || "N/A"}`);
          console.log(`   Week: ${doc.weekStart} to ${doc.weekEnd}`);
          console.log(`   Vendor: ${doc.vendor || "N/A"}`);
          console.log(`   Unit Price: $${doc.unitPrice || 0}`);
        } else {
          // Generic display for other collections
          const keys = Object.keys(doc).filter(k => 
            k !== '_id' && 
            k !== '__v' && 
            k !== 'createdAt' && 
            k !== 'updatedAt' &&
            !k.startsWith('$')
          ).slice(0, 10);
          
          keys.forEach(key => {
            let value = doc[key];
            if (typeof value === 'object' && value !== null) {
              value = JSON.stringify(value).substring(0, 100) + '...';
            }
            console.log(`   ${key}: ${value}`);
          });
        }

        console.log(`\n   Created At: ${doc.createdAt || "N/A"}`);
        console.log(`   Updated At: ${doc.updatedAt || "N/A"}`);

        // Show full document in JSON (collapsed)
        console.log("\n   📋 FULL DOCUMENT (JSON):");
        console.log("   " + "-".repeat(76));
        console.log(JSON.stringify(doc, null, 2).split('\n').map(line => '   ' + line).join('\n'));
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Search Complete!");
    console.log("=".repeat(80) + "\n");

  } catch (error) {
    console.error("\n❌ Error during search:", error);
  }
};

// Run script
const run = async () => {
  await connectDB();

  const searchId = process.argv[2];

  if (!searchId) {
    console.log("\n❌ Please provide an ID to search!");
    console.log("\nUsage:");
    console.log("   node scripts/findIdInDatabase.js <ID>");
    console.log("\nExample:");
    console.log("   node scripts/findIdInDatabase.js 6970fc160cd6b3ba585bac24\n");
    process.exit(1);
  }

  console.log(`\n🔍 Searching for: ${searchId}\n`);

  await findIdInDatabase(searchId);

  await mongoose.connection.close();
  console.log("\n✅ Database connection closed\n");
  process.exit(0);
};

run();
