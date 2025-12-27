/**
 * Script to initialize the vendor payment counter
 * Run this once to set up the counter for PY-001 format
 * 
 * Usage: node scripts/initPaymentCounter.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Counter = require('../models/counterModel');
const VendorPayment = require('../models/vendorPaymentModel');

const initPaymentCounter = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    // Find the highest existing payment number
    const lastPayment = await VendorPayment.findOne({
      paymentNumber: { $regex: /^PY-/ }
    }).sort({ paymentNumber: -1 });

    let startSeq = 0;
    
    if (lastPayment) {
      // Extract sequence from existing payment number (e.g., PY-005 -> 5)
      const match = lastPayment.paymentNumber.match(/PY-(\d+)/);
      if (match) {
        startSeq = parseInt(match[1], 10);
        console.log(`Found existing payment: ${lastPayment.paymentNumber}, setting counter to ${startSeq}`);
      }
    }

    // Initialize or update the counter
    const counter = await Counter.findOneAndUpdate(
      { _id: 'vendorPaymentNumber' },
      { seq: startSeq },
      { upsert: true, new: true }
    );

    console.log(`Payment counter initialized/updated: seq = ${counter.seq}`);
    console.log(`Next payment will be: PY-${(counter.seq + 1).toString().padStart(3, '0')}`);

    await mongoose.disconnect();
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing payment counter:', error);
    process.exit(1);
  }
};

initPaymentCounter();
