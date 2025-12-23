/**
 * Migration Script: Add shortCode to all existing products
 * Run this script once: node scripts/migrateShortCodes.js
 * 
 * ShortCodes will start from 101 and auto-increment
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const Product = require('../models/productModel');
const Counter = require('../models/counterModel');

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URL;

async function migrateShortCodes() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // First, clear all existing shortCodes to avoid duplicates
        console.log('🧹 Clearing existing shortCodes...');
        await Product.updateMany({}, { $unset: { shortCode: 1 } });

        // Get all products sorted by creation date
        const products = await Product.find({}).sort({ createdAt: 1 });
        console.log(`📦 Found ${products.length} products`);

        if (products.length === 0) {
            console.log('No products found. Exiting...');
            process.exit(0);
        }

        // Reset or create counter starting at 100 (so first product gets 101)
        await Counter.findByIdAndUpdate(
            'productShortCode',
            { seq: 100 },
            { upsert: true }
        );
        console.log('🔢 Counter reset to 100');

        // Update each product with sequential shortCode
        let currentCode = 100;
        let updated = 0;

        for (const product of products) {
            currentCode++;
            const shortCode = String(currentCode);
            
            await Product.findByIdAndUpdate(product._id, { shortCode });
            updated++;
            
            console.log(`  ✓ ${shortCode} → ${product.name}`);
        }

        // Update counter to final value
        await Counter.findByIdAndUpdate('productShortCode', { seq: currentCode });

        console.log('\n========================================');
        console.log(`✅ Migration Complete!`);
        console.log(`📊 Updated ${updated} products`);
        console.log(`🔢 ShortCodes: 101 to ${currentCode}`);
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateShortCodes();
