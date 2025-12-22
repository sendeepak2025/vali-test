const mongoose = require('mongoose');

const VendorCreditMemoLineItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true },
  reason: String,
  lotNumber: String
}, { _id: true });

const VendorCreditMemoSchema = new mongoose.Schema({
  memoNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  type: { 
    type: String, 
    enum: ['credit', 'debit'], 
    required: true,
    default: 'credit'
  },
  vendorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vendor', 
    required: true,
    index: true
  },
  linkedPurchaseOrderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PurchaseOrder' 
  },
  linkedInvoiceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Invoice' 
  },
  reasonCategory: { 
    type: String, 
    enum: [
      'quality_issue',
      'short_shipment', 
      'price_correction', 
      'return',
      'spoilage',
      'bruising',
      'size_variance',
      'temperature_damage',
      'pest_damage',
      'ripeness_issues',
      'weight_variance',
      'other'
    ],
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  lineItems: [VendorCreditMemoLineItemSchema],
  subtotal: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  amount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['draft', 'pending_approval', 'approved', 'applied', 'partially_applied', 'voided'], 
    default: 'draft',
    index: true
  },
  appliedToPaymentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'VendorPayment' 
  },
  appliedAmount: { 
    type: Number, 
    default: 0 
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'auth' 
  },
  approvedAt: Date,
  approvalNotes: String,
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'auth'
  },
  voidedAt: Date,
  voidReason: String,
  documentUrls: [String],
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'auth'
  }
}, { 
  timestamps: true 
});

// Indexes for efficient querying
VendorCreditMemoSchema.index({ vendorId: 1, status: 1 });
VendorCreditMemoSchema.index({ createdAt: -1 });
VendorCreditMemoSchema.index({ linkedPurchaseOrderId: 1 });
VendorCreditMemoSchema.index({ linkedInvoiceId: 1 });

// Pre-save hook to set remaining amount
VendorCreditMemoSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('amount') || this.isModified('appliedAmount')) {
    this.remainingAmount = this.amount - this.appliedAmount;
  }
  next();
});

// Static method to generate unique memo number
VendorCreditMemoSchema.statics.generateMemoNumber = async function(type = 'credit') {
  const prefix = type === 'credit' ? 'VCM' : 'VDM';
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  
  // Find the last memo number for this month
  const lastMemo = await this.findOne({
    memoNumber: new RegExp(`^${prefix}${year}${month}`)
  }).sort({ memoNumber: -1 });
  
  let sequence = 1;
  if (lastMemo) {
    const lastSequence = parseInt(lastMemo.memoNumber.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${year}${month}${sequence.toString().padStart(4, '0')}`;
};

// Instance method to check if memo can be edited
VendorCreditMemoSchema.methods.canEdit = function() {
  return ['draft', 'pending_approval'].includes(this.status);
};

// Instance method to check if memo can be approved
VendorCreditMemoSchema.methods.canApprove = function() {
  return this.status === 'pending_approval';
};

// Instance method to check if memo can be applied
VendorCreditMemoSchema.methods.canApply = function() {
  return this.status === 'approved' && this.remainingAmount > 0;
};

// Instance method to check if memo can be voided
VendorCreditMemoSchema.methods.canVoid = function() {
  return ['draft', 'pending_approval', 'approved'].includes(this.status) && this.appliedAmount === 0;
};

// Instance method to apply amount to payment
VendorCreditMemoSchema.methods.applyToPayment = function(paymentId, applyAmount) {
  if (applyAmount > this.remainingAmount) {
    throw new Error('Apply amount exceeds remaining amount');
  }
  
  this.appliedAmount += applyAmount;
  this.remainingAmount = this.amount - this.appliedAmount;
  this.appliedToPaymentId = paymentId;
  
  if (this.remainingAmount === 0) {
    this.status = 'applied';
  } else {
    this.status = 'partially_applied';
  }
  
  return this;
};

module.exports = mongoose.model('VendorCreditMemo', VendorCreditMemoSchema);
