const mongoose = require("mongoose");

/**
 * Incoming Stock Model
 * Tracks stock that is expected to arrive (planned in matrix)
 * Must be linked to vendor before PreOrders can be confirmed
 */
const incomingStockSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    // Target week for this incoming stock
    weekStart: {
      type: Date,
      required: true,
    },
    weekEnd: {
      type: Date,
      required: true,
    },
    // Vendor linkage (required before confirm)
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    // Price per unit (required before confirm)
    unitPrice: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    // Link to PRI Order once created
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null,
    },
    // Status flow: draft → linked → received
    // draft: Just quantity entered in matrix
    // linked: Vendor + Price added
    // received: Stock actually arrived, Product.remaining updated
    // cancelled: Cancelled/removed
    status: {
      type: String,
      enum: ["draft", "linked", "received", "cancelled"],
      default: "draft",
    },
    // When stock was actually received
    receivedAt: {
      type: Date,
      default: null,
    },
    receivedQuantity: {
      type: Number,
      default: 0,
    },
    // Who added/modified
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    linkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    linkedAt: {
      type: Date,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
incomingStockSchema.index({ product: 1, weekStart: 1 });
incomingStockSchema.index({ weekStart: 1, weekEnd: 1 });
incomingStockSchema.index({ status: 1 });
incomingStockSchema.index({ vendor: 1 });

// Virtual to check if ready for confirm
incomingStockSchema.virtual("isLinked").get(function () {
  return this.status === "linked" || this.status === "received";
});

// Method to calculate total price
incomingStockSchema.methods.calculateTotal = function () {
  this.totalPrice = this.quantity * this.unitPrice;
  return this;
};

// Pre-save hook to calculate total
incomingStockSchema.pre("save", function (next) {
  if (this.isModified("quantity") || this.isModified("unitPrice")) {
    this.totalPrice = this.quantity * this.unitPrice;
  }
  next();
});

module.exports = mongoose.model("IncomingStock", incomingStockSchema);
