const mongoose = require('mongoose');
const Product = require('../models/productModel');
const PurchaseOrder = require('../models/purchaseModel');
const Vendor = require('../models/vendorModel');
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

// Check duplicate purchases for 25 Jan 2026 to 28 Jan 2026
const checkDuplicatePurchases = async () => {
  try {
    console.log('🔍 Checking duplicate purchases for 25 Jan 2026 to 28 Jan 2026...\n');

    // Set date range for 25 Jan 2026 to 28 Jan 2026
   const startDate = new Date('2026-01-25T00:00:00.000Z');
const endDate = new Date(); // 👈 aaj ki date automatically

    console.log(`📅 Date Range: 25 Jan 2026 to 28 Jan 2026`);
    console.log(`� Start Time: ${startDate.toISOString()}`);
    console.log(`🕐 End Time: ${endDate.toISOString()}\n`);

    // Get all purchase orders for 25-28 Jan 2026
    const purchaseOrders = await PurchaseOrder.find({
      purchaseDate: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('items.productId', 'name').populate('vendorId', 'name');

    console.log(`📦 Total purchase orders found: ${purchaseOrders.length}\n`);

    if (purchaseOrders.length === 0) {
      console.log('❌ No purchase orders found for 25-28 Jan 2026');
      return;
    }

    // Track product purchases
    const productPurchases = {};

    // Process each purchase order
    purchaseOrders.forEach(po => {
      console.log(`\n📋 Processing PO: ${po.purchaseOrderNumber} (Date: ${po.purchaseDate.toDateString()}, Vendor: ${po.vendorId?.name || 'Unknown'})`);
      
      po.items.forEach(item => {
        if (item.productId) {
          const productId = item.productId._id.toString();
          const productName = item.productId.name;
          
          if (!productPurchases[productId]) {
            productPurchases[productId] = {
              productName: productName,
              purchases: []
            };
          }

          productPurchases[productId].purchases.push({
            purchaseOrderNumber: po.purchaseOrderNumber,
            vendorName: po.vendorId?.name || 'Unknown',
            quantity: item.quantity,
            qualityStatus: item.qualityStatus,
            purchaseDate: po.purchaseDate
          });

          console.log(`   ✅ ${productName}: Qty ${item.quantity} (Status: ${item.qualityStatus})`);
        }
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log('📊 DUPLICATE PURCHASE ANALYSIS');
    console.log('='.repeat(80));

    // Filter products that were purchased 2+ times
    const duplicateProducts = Object.entries(productPurchases).filter(([productId, data]) => {
      return data.purchases.length >= 2;
    });

    if (duplicateProducts.length === 0) {
      console.log('✅ No products were purchased multiple times on 25 Jan 2026');
      return;
    }

    console.log(`\n🔄 Found ${duplicateProducts.length} products purchased 2+ times:\n`);

    duplicateProducts.forEach(([productId, data], index) => {
      console.log(`${index + 1}. 📦 Product: ${data.productName}`);
      console.log(`   🔢 Total Purchase Orders: ${data.purchases.length}`);
      
      // Calculate total quantity
      const totalQuantity = data.purchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
      console.log(`   📊 Total Quantity: ${totalQuantity}`);
      
      // Show each purchase
      console.log('   📋 Purchase Details:');
      data.purchases.forEach((purchase, purchaseIndex) => {
        console.log(`      ${purchaseIndex + 1}. PO: ${purchase.purchaseOrderNumber}`);
        console.log(`         Vendor: ${purchase.vendorName}`);
        console.log(`         Quantity: ${purchase.quantity}`);
        console.log(`         Status: ${purchase.qualityStatus}`);
        console.log(`         Time: ${purchase.purchaseDate.toLocaleTimeString()}`);
      });
      
      // Check for approved vs pending/rejected
      const approvedPurchases = data.purchases.filter(p => p.qualityStatus === 'approved');
      const pendingPurchases = data.purchases.filter(p => p.qualityStatus === 'pending');
      const rejectedPurchases = data.purchases.filter(p => p.qualityStatus === 'rejected');
      
      console.log(`   ✅ Approved: ${approvedPurchases.length} orders`);
      console.log(`   ⏳ Pending: ${pendingPurchases.length} orders`);
      console.log(`   ❌ Rejected: ${rejectedPurchases.length} orders`);
      
      console.log('   ' + '-'.repeat(60));
    });

    // Summary statistics
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY STATISTICS');
    console.log('='.repeat(80));

    const totalProducts = Object.keys(productPurchases).length;
    const singlePurchaseProducts = totalProducts - duplicateProducts.length;
    
    console.log(`📦 Total unique products purchased: ${totalProducts}`);
    console.log(`🔄 Products purchased multiple times: ${duplicateProducts.length}`);
    console.log(`1️⃣ Products purchased only once: ${singlePurchaseProducts}`);
    
    // Most purchased product
    const mostPurchased = duplicateProducts.reduce((max, [productId, data]) => {
      return data.purchases.length > max.count ? 
        { productName: data.productName, count: data.purchases.length } : max;
    }, { productName: '', count: 0 });
    
    if (mostPurchased.count > 0) {
      console.log(`🏆 Most purchased product: ${mostPurchased.productName} (${mostPurchased.count} times)`);
    }

    // Total purchase orders vs unique products
    const totalPurchaseOrders = purchaseOrders.length;
    console.log(`📋 Total purchase orders: ${totalPurchaseOrders}`);
    console.log(`📊 Average products per PO: ${(totalProducts / totalPurchaseOrders).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error checking duplicate purchases:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await checkDuplicatePurchases();
  await mongoose.disconnect();
  console.log('\n✅ Script completed');
};

main().catch(console.error);