/**
 * Migration script to assign shortCodes to existing products
 * Run with: node scripts/assignShortCodes.js
 */
const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("../models/productModel");
const Counter = require("../models/counterModel");

async function assignShortCodes() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Connected to MongoDB");

        // First, clear all existing shortCodes to avoid duplicates
        await Product.updateMany({}, { $unset: { shortCode: "" } });
        console.log("Cleared all existing shortCodes");

        // Reset counter to 100 so first product gets 101
        let counter = await Counter.findByIdAndUpdate(
            "productShortCode",
            { seq: 100 },
            { upsert: true, new: true }
        );

        // Find ALL products and reassign shortCodes starting from 101
        const products = await Product.find({}).sort({ createdAt: 1 });

        console.log(`Found ${products.length} products without shortCode`);

        for (const product of products) {
            // Increment counter and assign
            counter = await Counter.findByIdAndUpdate(
                "productShortCode",
                { $inc: { seq: 1 } },
                { new: true }
            );
            
            product.shortCode = String(counter.seq);
            await product.save({ validateBeforeSave: false });
            console.log(`Assigned shortCode ${product.shortCode} to "${product.name}"`);
        }

        console.log("\nMigration complete!");
        console.log(`Next shortCode will be: ${counter.seq + 1}`);
        
        await mongoose.disconnect();
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

assignShortCodes();
// node scripts/assignShortCodes.js
