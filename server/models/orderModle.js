const mongoose = require("mongoose");

const generateOrderNumber = () => {
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `${randomNumber}`;
};

const addressSchema = {
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  city: { type: String },
  postalCode: { type: String },
  country: { type: String },
};

const palletDataSchema = new mongoose.Schema(
  {
    worker: String,
    palletCount: Number,
    boxesPerPallet: {
      type: Map,
      of: Number, // key: item ID, value: number of boxes
    },
    totalBoxes: Number,
    chargePerPallet: Number,
    totalPalletCharge: Number,
    selectedItems: [String], // or [mongoose.Schema.Types.ObjectId] if referencing items
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const paymentDetailsSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["cash", "creditcard", "cheque"],
      required: true,
    },
    transactionId: {
      type: String,
      required: function () {
        return this.method === "creditcard";
      },
    },
    notes: {
      type: String,
      default: "",
    },
    paymentDate: {
      type: Date,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    items: {
      type: Array,
      required: true,
    },
    orderNumber: {
      type: String,
      index: true, // ✅ INDEX ADDED
    },
    shippinCost: {
      type: Number,
      default: 0,
    },
    plateCount: {
      type: Number,
      default: 0,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
      index: true, // ✅ INDEX ADDED
    },
    preOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PreOrder",
    },
    status: {
      type: String,
      default: "Processing",
      index: true, // ✅ INDEX ADDED
    },
    paymentStatus: {
      type: String,
      default: "pending",
      index: true, // ✅ INDEX ADDED
    },
    paymentAmount: {
      type: String,
      default: 0,
    },
    orderType: {
      type: String,
      default: "Regural",
      index: true, // ✅ INDEX ADDED
    },
    paymentDetails: {
      type: paymentDetailsSchema,
    },
    // Payment history to track all payments
    paymentHistory: [{
      amount: { type: Number, required: true },
      method: { 
        type: String, 
        enum: ["cash", "creditcard", "cheque"],
        required: true 
      },
      transactionId: { type: String },
      notes: { type: String },
      paymentDate: { type: Date, default: Date.now },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "auth" },
      recordedByName: { type: String },
    }],
    isDelete: {
      type: Boolean,
      default: false,
      index: true, // ✅ INDEX ADDED
    },
    deleted: {
      reason: { type: String },
      amount: { type: Number }, // spelling fix
    },

    total: {
      type: Number,
    },
    billingAddress: {
      type: addressSchema,
      required: true,
    },
    creditMemos: { type: mongoose.Schema.Types.ObjectId, ref: "CreditMemo" },

    // Store credit applied to this order
    creditApplied: {
      type: Number,
      default: 0,
    },
    creditApplications: [{
      amount: { type: Number, required: true },
      appliedAt: { type: Date, default: Date.now },
      appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "auth" },
      appliedByName: { type: String },
      creditMemoNumber: { type: String },
      reason: { type: String },
    }],



     notes: {
      type: String,
    },


    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    palletData: palletDataSchema,
  },
  { timestamps: true }
);

// ✅ COMPOUND INDEXES FOR BETTER QUERY PERFORMANCE
orderSchema.index({ store: 1, createdAt: -1 }); // Store orders listing
orderSchema.index({ createdAt: -1 }); // Recent orders
orderSchema.index({ orderType: 1, createdAt: -1 }); // Order type filtering
orderSchema.index({ paymentStatus: 1, createdAt: -1 }); // Payment status filtering
orderSchema.index({ isDelete: 1, createdAt: -1 }); // Active orders
orderSchema.index({ 'items.productId': 1 }); // Product search in orders

module.exports = mongoose.model("Order", orderSchema);
