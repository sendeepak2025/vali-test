/**
 * Script to list all products with their names and shortCodes
 * Run: node scripts/listProducts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/productModel');

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/vali';

async function listProducts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const products = await Product.find({}, 'name shortCode palletCapacity').sort({ shortCode: 1 });
    
    console.log('='.repeat(80));
    console.log('ALL PRODUCTS');
    console.log('='.repeat(80));
    console.log('Code | Product Name                                      | Pallet Capacity');
    console.log('-'.repeat(80));
    
    products.forEach(p => {
      const code = (p.shortCode || '--').padEnd(4);
      const name = (p.name || '').substring(0, 48).padEnd(48);
      const capacity = p.palletCapacity?.totalCasesPerPallet || 0;
      console.log(`${code} | ${name} | ${capacity}`);
    });

    console.log('-'.repeat(80));
    console.log(`Total: ${products.length} products`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listProducts();
