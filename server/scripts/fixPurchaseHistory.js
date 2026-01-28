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

// Fix purchase history for all products
const fixPurchaseHistory = async () => {
  try {
    console.log('🔧 Starting to fix purchase history for all products...\n');

    // Get all products
    const products = await Product.find();
    console.log(`📦 Total products found: ${products.length}\n`);

    // Get all approved purchase orders
    const approvedPurchases = await PurchaseOrder.find({
      'items.qualityStatus': 'approved'
    }).populate('items.productId', 'name');

    console.log(`✅ Total purchase orders with approved items: ${approvedPurchases.length}\n`);

    let fixedCount = 0;
    let errorCount = 0;

    // Process each product
    for (const product of products) {
      try {
        console.log(`\n🔍 Processing: ${product.name}`);

        // Find all approved purchases for this product
        const productApprovedPurchases = [];
        approvedPurchases.forEach(po => {
          po.items.forEach(item => {
            if (item.productId && item.productId._id.toString() === product._id.toString() && item.qualityStatus === 'approved') {
              productApprovedPurchases.push({
                purchaseOrderId: po._id,
                purchaseOrderNumber: po.purchaseOrderNumber,
                purchaseDate: po.purchaseDate,
                quantity: item.quantity,
                totalWeight: item.totalWeight || 0,
                lb: item.lb || null
              });
            }
          });
        });

        if (productApprovedPurchases.length === 0) {
          console.log(`   ⏭️  No approved purchases found, skipping...`);
          continue;
        }

        // Calculate correct totals from approved purchases
        const correctTotalPurchase = productApprovedPurchases.reduce((sum, p) => sum + p.quantity, 0);
        const correctUnitPurchase = productApprovedPurchases.reduce((sum, p) => sum + (p.totalWeight || 0), 0);

        // Check if fix is needed
        const currentHistoryTotal = product.purchaseHistory?.reduce((sum, h) => sum + h.quantity, 0) || 0;
        
        if (currentHistoryTotal === correctTotalPurchase) {
          console.log(`   ✅ Already correct, skipping...`);
          continue;
        }

        console.log(`   🔧 Fixing: Current history=${currentHistoryTotal}, Should be=${correctTotalPurchase}`);

        // Reset purchase history arrays
        product.purchaseHistory = [];
        product.lbPurchaseHistory = [];
        product.updatedFromOrders = [];

        // Reset totals
        product.totalPurchase = correctTotalPurchase;
        product.unitPurchase = correctUnitPurchase;
        product.remaining = correctTotalPurchase - (product.totalSell || 0);
        product.unitRemaining = correctUnitPurchase - (product.unitSell || 0);

        // Rebuild purchase history from approved purchases
        productApprovedPurchases.forEach(purchase => {
          // Add to purchase history
          product.purchaseHistory.push({
            date: purchase.purchaseDate,
            quantity: purchase.quantity
          });

          // Add to lb purchase history if weight data exists
          if (purchase.totalWeight && purchase.lb) {
            product.lbPurchaseHistory.push({
              date: purchase.purchaseDate,
              weight: purchase.totalWeight,
              lb: purchase.lb
            });
          }

          // Add to updatedFromOrders
          product.updatedFromOrders.push({
            purchaseOrder: purchase.purchaseOrderId,
            oldQuantity: 0,
            newQuantity: purchase.quantity,
            perLb: purchase.lb,
            totalLb: purchase.totalWeight,
            difference: purchase.quantity
          });
        });

        // Save the product
        await product.save();
        fixedCount++;
        console.log(`   ✅ Fixed successfully!`);

      } catch (error) {
        console.error(`   ❌ Error fixing ${product.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Products fixed: ${fixedCount}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    console.log(`📦 Total products processed: ${products.length}`);

    if (fixedCount > 0) {
      console.log('\n🎉 Purchase history has been successfully fixed for all products!');
    } else {
      console.log('\n✅ All products already had correct purchase history.');
    }

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