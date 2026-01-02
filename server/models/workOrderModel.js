const mongoose = require("mongoose");

/**
 * Work Order Model
 * Generated when PreOrders are confirmed - tracks fulfillment and shortages
 * Used by warehouse team to know what to pick/pack and what's pending
 */

// Product-level shortage tracking
const productShortageSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: String,
  totalOrdered: { type: Number, default: 0 },      // Sum of all store orders
  totalAvailable: { type: Number, default: 0 },    // Stock + Incoming at time of confirm
  currentStock: { type: Number, default: 0 },      // Product.remaining at confirm time
  incomingStock: { type: Number, default: 0 },     // From IncomingStock
  shortage: { type: Number, default: 0 },          // Negative = short, 0 = OK
  status: {
    type: String,
    enum: ["full", "partial", "short", "pending"],
    default: "pending"
  },
  // Track if shortage was later resolved
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "auth" },
  resolvedQuantity: { type: Number, default: 0 },
  resolutionNotes: String,
}, { _id: true });

// Store-level allocation tracking
const storeAllocationSchema = new mongoose.Schema({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "auth",
    required: true,
  },
  storeName: String,
  storeCity: String,
  storeState: String,
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  preOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PreOrder",
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: String,
    ordered: { type: Number, default: 0 },
    allocated: { type: Number, default: 0 },      // What they'll actually get
    shortage: { type: Number, default: 0 },       // ordered - allocated
    status: {
      type: String,
      enum: ["full", "partial", "short"],
      default: "full"
    },
    picked: { type: Boolean, default: false },
    pickedAt: Date,
    pickedBy: { type: mongoose.Schema.Types.ObjectId, ref: "auth" },
  }],
  totalOrdered: { type: Number, default: 0 },
  totalAllocated: { type: Number, default: 0 },
  totalShortage: { type: Number, default: 0 },
  allocationStatus: {
    type: String,
    enum: ["full", "partial", "short"],
    default: "full"
  },
  // Fulfillment tracking
  pickingStatus: {
    type: String,
    enum: ["pending", "in_progress", "completed"],
    default: "pending"
  },
  pickingStartedAt: Date,
  pickingCompletedAt: Date,
  pickedBy: { type: mongoose.Schema.Types.ObjectId, ref: "auth" },
}, { _id: true });

const workOrderSchema = new mongoose.Schema(
  {
    // Work Order Number (auto-generated)
    workOrderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    // Week this work order is for
    weekStart: {
      type: Date,
      required: true,
    },
    weekEnd: {
      type: Date,
      required: true,
    },
    weekLabel: String,
    // Overall status
    status: {
      type: String,
      enum: ["draft", "confirmed", "in_progress", "completed", "cancelled"],
      default: "draft",
    },
    // Summary counts
    totalProducts: { type: Number, default: 0 },
    totalStores: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalPreOrders: { type: Number, default: 0 },
    // Shortage summary
    hasShortage: { type: Boolean, default: false },
    shortProductCount: { type: Number, default: 0 },
    totalShortageQuantity: { type: Number, default: 0 },
    // Product-level details
    products: [productShortageSchema],
    // Store-level allocations
    storeAllocations: [storeAllocationSchema],
    // Linked orders and preorders
    confirmedOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    }],
    confirmedPreOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "PreOrder",
    }],
    // Who created/confirmed
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    confirmedAt: Date,
    // Completion tracking
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    // Notes
    notes: String,
    internalNotes: String,
  },
  { timestamps: true }
);

// Indexes
workOrderSchema.index({ weekStart: 1, weekEnd: 1 });
workOrderSchema.index({ status: 1 });
workOrderSchema.index({ workOrderNumber: 1 });
workOrderSchema.index({ hasShortage: 1 });

// Virtual for shortage percentage
workOrderSchema.virtual("shortagePercentage").get(function() {
  if (this.totalProducts === 0) return 0;
  return Math.round((this.shortProductCount / this.totalProducts) * 100);
});

// Method to calculate totals
workOrderSchema.methods.calculateTotals = function() {
  let totalOrdered = 0;
  let totalAllocated = 0;
  let shortCount = 0;
  let shortQty = 0;

  this.products.forEach(p => {
    totalOrdered += p.totalOrdered;
    totalAllocated += p.totalAvailable;
    if (p.shortage < 0) {
      shortCount++;
      shortQty += Math.abs(p.shortage);
    }
  });

  this.shortProductCount = shortCount;
  this.totalShortageQuantity = shortQty;
  this.hasShortage = shortCount > 0;
  this.totalProducts = this.products.length;
  this.totalStores = this.storeAllocations.length;

  return this;
};

// Method to update product shortage status
workOrderSchema.methods.updateProductStatus = function(productId, newQuantity, userId, notes) {
  const product = this.products.find(p => p.product.toString() === productId.toString());
  if (!product) return null;

  const oldShortage = product.shortage;
  product.totalAvailable += newQuantity;
  product.shortage = product.totalAvailable - product.totalOrdered;
  
  if (product.shortage >= 0) {
    product.status = "full";
    product.resolvedAt = new Date();
    product.resolvedBy = userId;
    product.resolvedQuantity = newQuantity;
    product.resolutionNotes = notes;
  } else if (product.shortage > oldShortage) {
    product.status = "partial";
  }

  this.calculateTotals();
  return product;
};

module.exports = mongoose.model("WorkOrder", workOrderSchema);
