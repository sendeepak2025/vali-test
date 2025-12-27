const mongoose = require('mongoose');
const Counter = require('./counterModel');

const AppliedCreditSchema = new mongoose.Schema({
  creditMemoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'VendorCreditMemo',
    required: true
  },
  memoNumber: String,
  amount: { 
    type: Number, 
    required: true 
  }
}, { _id: false });

const InvoicePaymentSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  invoiceNumber: String,
  invoiceAmount: Number,
  amountPaid: {
    type: Number,
    required: true
  },
  remainingAfterPayment: Number
}, { _id: true });

const VendorPaymentSchema = new mongoose.Schema({
  paymentNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  vendorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vendor', 
    required: true,
    index: true
  },
  invoicePayments: [InvoicePaymentSchema],
  // Legacy field for backward compatibility
  invoiceIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Invoice' 
  }],
  grossAmount: { 
    type: Number, 
    required: true,
    default: 0
  },
  appliedCredits: [AppliedCreditSchema],
  totalCreditsApplied: {
    type: Number,
    default: 0
  },
  earlyPaymentDiscountTaken: { 
    type: Number, 
    default: 0 
  },
  earlyPaymentDiscountDetails: {
    percentage: Number,
    originalAmount: Number,
    discountAmount: Number,
    qualifyingInvoices: [mongoose.Schema.Types.ObjectId]
  },
  netAmount: {
    type: Number,
    required: true
  },
  method: { 
    type: String, 
    enum: ['cash', 'check', 'credit_card', 'ach', 'wire', 'other'], 
    required: true 
  },
  checkNumber: String,
  checkClearanceStatus: { 
    type: String, 
    enum: ['pending', 'cleared', 'bounced'],
    default: function() {
      return this.method === 'check' ? 'pending' : undefined;
    }
  },
  checkClearedAt: Date,
  checkBouncedAt: Date,
  checkBouncedReason: String,
  transactionId: String,
  bankReference: String,
  paymentDate: { 
    type: Date, 
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed', 'voided'],
    default: 'completed'
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'auth'
  },
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'auth'
  },
  voidedAt: Date,
  voidReason: String
}, { 
  timestamps: true 
});

// Indexes
VendorPaymentSchema.index({ vendorId: 1, paymentDate: -1 });
VendorPaymentSchema.index({ createdAt: -1 });
VendorPaymentSchema.index({ checkClearanceStatus: 1 });

// Pre-save hook to calculate totals
VendorPaymentSchema.pre('save', function(next) {
  // Calculate total credits applied
  if (this.appliedCredits && this.appliedCredits.length > 0) {
    this.totalCreditsApplied = this.appliedCredits.reduce((sum, credit) => sum + credit.amount, 0);
  }
  
  // Calculate net amount if not set
  if (this.isNew || this.isModified('grossAmount') || this.isModified('totalCreditsApplied') || this.isModified('earlyPaymentDiscountTaken')) {
    this.netAmount = this.grossAmount - this.totalCreditsApplied - this.earlyPaymentDiscountTaken;
  }
  
  // Populate invoiceIds from invoicePayments for backward compatibility
  if (this.invoicePayments && this.invoicePayments.length > 0) {
    this.invoiceIds = this.invoicePayments.map(ip => ip.invoiceId);
  }
  
  next();
});

// Static method to generate unique payment number using counter
VendorPaymentSchema.statics.generatePaymentNumber = async function() {
  // Initialize counter with seq: 0 if it doesn't exist, then increment
  const counter = await Counter.findOneAndUpdate(
    { _id: 'vendorPaymentNumber' },
    { $inc: { seq: 1 } },
    { 
      new: true, 
      upsert: true,
      setDefaultsOnInsert: false
    }
  );
  
  // If counter was just created, it will have seq: 1 (0 + 1 = 1)
  // If counter had default 100, first increment gives 101, we need to handle this
  let sequence = counter.seq;
  
  // Handle legacy counter with default 100
  if (sequence > 100 && sequence <= 102) {
    // Reset counter to start from 1
    const resetCounter = await Counter.findOneAndUpdate(
      { _id: 'vendorPaymentNumber' },
      { seq: 1 },
      { new: true }
    );
    sequence = resetCounter.seq;
  }
  
  return `PY-${sequence.toString().padStart(3, '0')}`;
};

// Instance method to check if payment can be voided
VendorPaymentSchema.methods.canVoid = function() {
  return this.status === 'completed' && this.method !== 'check' || 
         (this.method === 'check' && this.checkClearanceStatus !== 'cleared');
};

// Instance method to update check status
VendorPaymentSchema.methods.updateCheckStatus = function(newStatus, reason) {
  if (this.method !== 'check') {
    throw new Error('Can only update check status for check payments');
  }
  
  this.checkClearanceStatus = newStatus;
  
  if (newStatus === 'cleared') {
    this.checkClearedAt = new Date();
  } else if (newStatus === 'bounced') {
    this.checkBouncedAt = new Date();
    this.checkBouncedReason = reason;
    this.status = 'failed';
  }
  
  return this;
};

// Virtual for total invoices paid
VendorPaymentSchema.virtual('totalInvoicesPaid').get(function() {
  return this.invoicePayments?.length || this.invoiceIds?.length || 0;
});

module.exports = mongoose.model('VendorPayment', VendorPaymentSchema);
