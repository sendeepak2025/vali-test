/**
 * Script to update all products' salesMode to "case" (default)
 * Run: node scripts/updateSalesMode.js
 * 
 * After running, manually set salesMode to "both" for products that sell in both case and unit
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/productModel');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vali';

async function updateSalesMode() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update all products that don't have salesMode set or have "both" to "case"
        const result = await Product.updateMany(
            { $or: [{ salesMode: { $exists: false } }, { salesMode: "both" }] },
            { $set: { salesMode: "case" } }
        );

        console.log(`Updated ${result.modifiedCount} products to salesMode: "case"`);

        // Show products that can be set to "both" manually
        const products = await Product.find({}, 'name shortCode salesMode').sort({ shortCode: 1 });
        console.log('\n--- All Products ---');
        products.forEach(p => {
            console.log(`${p.shortCode || '--'} | ${p.name} | ${p.salesMode}`);
        });

        console.log('\n✅ Done! To set a product to sell both case and unit, update salesMode to "both" in admin panel or DB.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

updateSalesMode();
