const mongoose = require("mongoose");

/**
 * Store Inventory Model
 * Tracks inventory levels per store/warehouse location
 */
const storeInventorySchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // Box quantities
    quantity: {
      type: Number,
      default: 0,
    },
    allocated: {
      type: Number,
      default: 0, // Reserved for pending orders
    },
    available: {
      type: Number,
      default: 0, // quantity - allocated
    },
    // Unit/lb quantities
    unitQuantity: {
      type: Number,
      default: 0,
    },
    unitAllocated: {
      type: Number,
      default: 0,
    },
    unitAvailable: {
      type: Number,
      default: 0,
    },
    // Thresholds for alerts
    minStock: {
      type: Number,
      default: 5,
    },
    maxStock: {
      type: Number,
      default: 100,
    },
    reorderPoint: {
      type: Number,
      default: 10,
    },
    // Location details within warehouse
    location: {
      aisle: { type: String },
      shelf: { type: String },
      bin: { type: String },
    },
    // Stock movement history
    movements: [
      {
        type: {
          type: String,
          enum: ["in", "out", "transfer", "adjustment", "return"],
          required: true,
        },
        quantity: { type: Number, required: true },
        unitType: { type: String, enum: ["box", "unit"], default: "box" },
        reason: { type: String },
        reference: { type: String }, // Order ID, Transfer ID, etc.
        fromStore: { type: mongoose.Schema.Types.ObjectId, ref: "auth" },
        toStore: { type: mongoose.Schema.Types.ObjectId, ref: "auth" },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "auth" },
        date: { type: Date, default: Date.now },
      },
    ],
    lastRestocked: {
      type: Date,
    },
    lastSold: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound index for unique store-product combination
storeInventorySchema.index({ store: 1, product: 1 }, { unique: true });

// Index for quick lookups
storeInventorySchema.index({ store: 1 });
storeInventorySchema.index({ product: 1 });
storeInventorySchema.index({ available: 1 });

// Virtual for stock status
storeInventorySchema.virtual("stockStatus").get(function () {
  if (this.quantity <= 0) return "out-of-stock";
  if (this.quantity <= this.reorderPoint) return "low";
  if (this.quantity >= this.maxStock) return "overstocked";
  return "normal";
});

// Method to update available quantity
storeInventorySchema.methods.updateAvailable = function () {
  this.available = Math.max(0, this.quantity - this.allocated);
  this.unitAvailable = Math.max(0, this.unitQuantity - this.unitAllocated);
  return this;
};

// Method to add stock movement
storeInventorySchema.methods.addMovement = function (movement) {
  this.movements.push(movement);
  // Keep only last 100 movements
  if (this.movements.length > 100) {
    this.movements = this.movements.slice(-100);
  }
  return this;
};

module.exports = mongoose.model("StoreInventory", storeInventorySchema);
