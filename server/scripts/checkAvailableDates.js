const mongoose = require('mongoose');
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

// Check available purchase order dates
const checkAvailableDates = async () => {
  try {
    console.log('🔍 Checking available purchase order dates...\n');

    // Get all purchase orders and group by date
    const purchaseOrders = await PurchaseOrder.find({}).select('purchaseOrderNumber purchaseDate items').sort({ purchaseDate: -1 });

    console.log(`📦 Total purchase orders found: ${purchaseO