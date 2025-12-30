const mongoose = require("mongoose");

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
    palletBreakdown: {
      type: Map,
      of: {
        boxes: Number,
        casesPerPallet: Number,
        palletsNeeded: Number,
        fullPallets: Number,
        partialCases: Number
      }
    },
    calculatedAt: Date,
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
      required: function () {
        return this.method === "cash" || this.method === "cheque";
      },
    },
    paymentDate: {
      type: Date,
    },
  },
  { _id: false }
);

const preOrderSchema = new mongoose.Schema(
  {
    items: {
      type: Array,
      required: true,
    },
    preOrderNumber: {
      type: String,
    },
    priceListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PriceListTemplate",
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
    },
    status: {
      type: String,
      default: "Processing",
    },
    paymentStatus: {
      type: String,
      default: "pending",
    },
    paymentAmount: {
      type: String,
      default: 0,
    },
    orderType: {
      type: String,
      default: "PreOrder",
    },
    paymentDetails: {
      type: paymentDetailsSchema,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
    deleted: {
      reason: { type: String },
      amount: { type: Number },
    },
    total: {
      type: Number,
    },
    billingAddress: {
      type: addressSchema,
      required: true,
    },
    creditMemos: { type: mongoose.Schema.Types.ObjectId, ref: "CreditMemo" },
    notes: {
      type: String,
    },
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    palletData: palletDataSchema,
    expectedDeliveryDate: {
      type: Date, // optional
    },

    confirmed: {
      type: Boolean,
      default: false,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order", // assuming your Order model is named "Order"
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PreOrder", preOrderSchema);
