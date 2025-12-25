const mongoose = require("mongoose");

const communicationSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ["store", "admin"],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const affectedItemSchema = new mongoose.Schema({
  productId: String,
  productName: String,
  quantity: Number,
  requestedAmount: Number
}, { _id: false });

const qualityIssueSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "auth",
    required: true
  },
  storeName: {
    type: String
  },
  issueType: {
    type: String,
    enum: ["damaged", "wrong_item", "missing_item", "quality", "expired", "other"],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  affectedItems: [affectedItemSchema],
  images: [String],
  requestedAction: {
    type: String,
    enum: ["refund", "replacement", "credit", "adjustment"],
    default: "refund"
  },
  requestedAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["pending", "under_review", "approved", "partially_approved", "rejected", "resolved"],
    default: "pending"
  },
  adminNotes: String,
  approvedAmount: Number,
  resolution: String,
  creditMemoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CreditMemo"
  },
  communications: [communicationSchema]
}, { timestamps: true });

module.exports = mongoose.model("QualityIssue", qualityIssueSchema);
