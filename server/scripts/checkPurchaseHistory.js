const mongoose = require('mongoose');
const Product = require('../models/productModel');
const PurchaseOrder = require('../models/purchaseModel');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Check all products and their purchase history
const checkPurchaseHistory = async () => {
  try {
    console.log('🔍 Checking all products and their purchase history...\n');

    // Get all products
    const products = await Product.find().select('name totalPurchase purchaseHistory updatedFromOrders');
    
    console.log(`📦 Total products found: ${products.length}\n`);

    // Get all approved purchase orders
    const approvedPurchases = await PurchaseOrder.find({
      'items.qualityStatus': 'approved'
    }).populate('items.productId', 'name');

    console.log(`✅ Total purchase orders with approved items: ${approvedPurchases.length}\n`);

    // Check each product
    for (const product of products) {
      console.log(`\n📋 Product: ${product.name}`);
      console.log(`   Total Purchase: ${product.totalPurchase}`);
      console.log(`   Purchase History entries: ${product.purchaseHistory?.length || 0}`);
      console.log(`   Updated from Orders entries: ${product.updatedFromOrders?.length || 0}`);

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

      console.log(`   Approved purchases found: ${productApprovedPurchases.length}`);
      
      if (productApprovedPurchases.length > 0) {
        console.log('   📝 Approved Purchase Details:');
        productApprovedPurchases.forEach((purchase, index) => {
          console.log(`      ${index + 1}. PO: ${purchase.purchaseOrderNumber}, Date: ${purchase.purchaseDate.toDateString()}, Qty: ${purchase.quantity}`);
        });
      }

      // Check if purchase history matches approved purchases
      const historyTotal = product.purchaseHistory?.reduce((sum, h) => sum + h.quantity, 0) || 0;
      const approvedTotal = productApprovedPurchases.reduce((sum, p) => sum + p.quantity, 0);
      
      if (historyTotal !== approvedTotal) {
        console.log(`   ⚠️  MISMATCH: History total (${historyTotal}) != Approved total (${approvedTotal})`);
      } else if (approvedTotal > 0) {
        console.log(`   ✅ History matches approved purchases`);
      }

      console.log('   ─────────────────────────────────────────');
    }

    console.log('\n🔍 Summary of Issues:');
    
    // Find products with mismatched history
    let issueCount = 0;
    for (const product of products) {
      const productApprovedPurchases = [];
      approvedPurchases.forEach(po => {
        po.items.forEach(item => {
          if (item.productId && item.productId._id.toString() === product._id.toString() && item.qualityStatus === 'approved') {
            productApprovedPurchases.push({
              quantity: item.quantity
            });
          }
        });
      });

      const historyTotal = product.purchaseHistory?.reduce((sum, h) => sum + h.quantity, 0) || 0;
      const approvedTotal = productApprovedPurchases.reduce((sum, p) => sum + p.quantity, 0);
      
      if (historyTotal !== approvedTotal && approvedTotal > 0) {
        issueCount++;
        console.log(`❌ ${product.name}: History=${historyTotal}, Should be=${approvedTotal}`);
      }
    }

    if (issueCount === 0) {
      console.log('✅ All products have correct purchase history!');
    } else {
      console.log(`❌ Found ${issueCount} products with purchase history issues`);
    }

  } catch (error) {
    console.error('❌ Error checking purchase history:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await checkPurchaseHistory();
  await mongoose.disconnect();
  console.log('\n✅ Script completed');
};

main().catch(console.error);