const mongoose = require('mongoose');
const Product = require('../models/productModel');
const PurchaseOrder = require('../models/purchaseModel');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://varn:Varn2025@cluster0.dstcy.mongodb.net/Test-Vali");
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Fix purchase history for products
const fixPurchaseHistory = async () => {
  try {
    console.log('🔧 Starting purchase history fix...\n');

    // Get all products
    const products = await Product.find().select('name totalPurchase purchaseHistory updatedFromOrders');
    
    console.log(`📦 Total products found: ${products.length}\n`);

    // Get all approved purchase orders
    const approvedPurchases = await PurchaseOrder.find({
      'items.qualityStatus': 'approved'
    }).populate('items.productId', 'name');

    console.log(`✅ Total purchase orders with approved items: ${approvedPurchases.length}\n`);

    let fixedCount = 0;

    // Check and fix each product
    for (const product of products) {
      console.log(`\n📋 Processing: ${product.name}`);
      
      // Find approved purchases for this product
      const productApprovedPurchases = [];
      approvedPurchases.forEach(po => {
        po.items.forEach(item => {
          if (item.productId && item.productId._id.toString() === product._id.toString() && item.qualityStatus === 'approved') {
            productApprovedPurchases.push({
              purchaseOrderId: po._id,
              purchaseOrderNumber: po.purchaseOrderNumber,
              purchaseDate: po.purchaseDate,
              quantity: item.quantity,
              qualityStatus: item.qualityStatus
            });
          }
        });
      });

      if (productApprovedPurchases.length === 0) {
        console.log(`   ✅ No approved purchases found - skipping`);
        continue;
      }

      // Calculate expected totals
      const expectedTotal = productApprovedPurchases.reduce((sum, p) => sum + p.quantity, 0);
      const currentHistoryTotal = product.purchaseHistory?.reduce((sum, h) => sum + h.quantity, 0) || 0;
      
      if (currentHistoryTotal === expectedTotal) {
        console.log(`   ✅ History already correct (${currentHistoryTotal})`);
        continue;
      }

      console.log(`   🔧 Fixing: Current=${currentHistoryTotal}, Expected=${expectedTotal}`);

      // Group purchases by date to avoid duplicates
      const purchasesByDate = {};
      productApprovedPurchases.forEach(purchase => {
        const dateKey = new Date(purchase.purchaseDate).toISOString().split('T')[0];
        if (!purchasesByDate[dateKey]) {
          purchasesByDate[dateKey] = {
            date: purchase.purchaseDate,
            quantity: 0,
            purchaseOrders: []
          };
        }
        purchasesByDate[dateKey].quantity += purchase.quantity;
        purchasesByDate[dateKey].purchaseOrders.push(purchase.purchaseOrderNumber);
      });

      // Clear existing purchase history and rebuild
      product.purchaseHistory = [];
      
      // Add correct purchase history entries
      Object.values(purchasesByDate).forEach(dateGroup => {
        product.purchaseHistory.push({
          date: dateGroup.date,
          quantity: dateGroup.quantity
        });
      });

      // Update total purchase
      product.totalPurchase = expectedTotal;

      // Update updatedFromOrders if needed
      if (!product.updatedFromOrders || product.updatedFromOrders.length === 0) {
        product.updatedFromOrders = [];
        productApprovedPurchases.forEach(purchase => {
          product.updatedFromOrders.push({
            purchaseOrder: purchase.purchaseOrderId,
            oldQuantity: 0,
            newQuantity: purchase.quantity,
            difference: purchase.quantity
          });
        });
      }

      // Save the product
      await product.save();
      fixedCount++;

      console.log(`   ✅ Fixed! New history entries: ${product.purchaseHistory.length}`);
      console.log(`   📊 Updated total purchase: ${product.totalPurchase}`);
    }

    console.log(`\n🎉 Fix completed!`);
    console.log(`📊 Products fixed: ${fixedCount}`);
    console.log(`📊 Products checked: ${products.length}`);

  } catch (error) {
    console.error('❌ Error fixing purchase history:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await fixPurchaseHistory();
  await mongoose.disconnect();
  console.log('\n✅ Script completed');
};

main().catch(console.error);