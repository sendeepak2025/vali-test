const mongoose = require('mongoose');








const paymentDetailsSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ["cash", "creditcard", "cheque"],
    required: true,
  },
  transactionId: {
    type: String,
    required: function () {
      return this.method === "creditcard";
    }
  },
  notes: {
    type: String,
    required: function () {
      return this.method === "cash" || this.method === "cheque";
    }
  },
  paymentDate: {
    type: Date,

  }
}, { _id: false });






const purchaseItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  qualityStatus: {
    type: String,
    enum: ['approved', 'rejected', "pending"],
    default: 'pending',
  },

  qualityNotes: {
    type: String,
    default: '',
  },
  rejectionReason: {
    type: String,
    enum: [
      'spoilage', 'bruising', 'size_variance', 'temperature_damage', 
      'pest_damage', 'ripeness_issues', 'color_defects', 'mold',
      'weight_variance', 'packaging_damage', 'contamination', 'other', ''
    ],
    default: '',
  },
  batchNumber: {
    type: String,
    default: '',
  },
  expectedWeight: {
    type: Number,
    default: 0,
  },
  actualWeight: {
    type: Number,
    default: 0,
  },
  weightVariance: {
    type: Number,
    default: 0,
  },
  weightVariancePercent: {
    type: Number,
    default: 0,
  },
  lb: {
    type: String,

  },
  totalWeight: {
    type: Number,
    default:0

  },
  mediaUrls: {
    type: [String], // Array of strings
    default: []
  }


});


const purchaseOrderSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  purchaseOrderNumber: { type: String, required: true, unique: true },
  purchaseDate: { type: Date, required: true },
  deliveryDate: { type: Date },
  dueDate: { type: Date }, // Payment due date based on vendor payment terms
  notes: { type: String },

  paymentAmount: {
    type: String,
    default: 0,
  },
  paymentStatus: {
    type: String,
    default: "pending",
  },
  paymentDetails: {
    type: paymentDetailsSchema,

  },
  // Credit/Debit adjustments applied to this order
  creditAdjustments: [{
    creditMemoId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorCreditMemo' },
    amount: { type: Number },
    appliedAt: { type: Date, default: Date.now },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'auth' },
    notes: { type: String }
  }],
  totalCreditApplied: { type: Number, default: 0 },
  status: { type: String, default: "quality-check" },
  totalAmount: { type: Number },
  items: [purchaseItemSchema],
}, { timestamps: true });


module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
