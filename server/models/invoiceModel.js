const mongoose = require('mongoose');

// Line item schema for invoice details
const invoiceLineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  linkedPOItemId: { type: mongoose.Schema.Types.ObjectId },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String }
}, { _id: true });

// Matching results schema for three-way matching
const matchingResultsSchema = new mongoose.Schema({
  poMatch: { type: Boolean, default: false },
  receivingMatch: { type: Boolean, default: false },
  priceMatch: { type: Boolean, default: false },
  varianceAmount: { type: Number, default: 0 },
  variancePercentage: { type: Number, default: 0 },
  matchedAt: { type: Date },
  matchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: [{
    field: String,
    expected: mongoose.Schema.Types.Mixed,
    actual: mongoose.Schema.Types.Mixed,
    variance: Number
  }]
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  // Auto-generated invoice number
  invoiceNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  // Vendor reference
  vendorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vendor', 
    required: true,
    index: true
  },
  
  // Linked purchase orders (can link to multiple POs)
  linkedPurchaseOrders: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PurchaseOrder' 
  }],
  
  // Invoice dates
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  receivedDate: { type: Date, default: Date.now },
  
  // Line items
  lineItems: [invoiceLineItemSchema],
  
  // Amounts
  subtotal: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  shippingAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  // PO Total Amount (original PO amount for comparison)
  poTotalAmount: { type: Number, default: 0 },
  
  // Amount Match Type (same or different)
  amountMatchType: { 
    type: String, 
    enum: ['same', 'different'],
    default: 'same'
  },
  
  // Reason for amount difference
  amountDifferenceReason: { type: String },
  
  // Product received details with issues
  productReceivedDetails: [{
    productId: { type: mongoose.Schema.Types.Mixed },
    productName: { type: String },
    unitPrice: { type: Number, default: 0 },
    orderedQty: { type: Number, default: 0 },
    receivedQty: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    hasIssue: { type: Boolean, default: false },
    issueNote: { type: String }
  }],
  
  // Payment tracking
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['pending', 'matched', 'disputed', 'approved', 'partially_paid', 'paid', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Three-way matching results
  matchingResults: matchingResultsSchema,
  
  // Approval workflow
  approvalRequired: { type: Boolean, default: false },
  approvalThresholdExceeded: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  approvalNotes: { type: String },
  
  // Dispute tracking
  disputeReason: { type: String },
  disputedAt: { type: Date },
  disputedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Document storage
  documentUrl: { type: String },
  documentName: { type: String },
  
  // Payment references
  paymentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VendorPayment' }],
  
  // Notes
  notes: { type: String },
  internalNotes: { type: String },
  
  // Vendor's invoice number (their reference)
  vendorInvoiceNumber: { type: String },
  
  // Hold status (for disputes)
  isOnHold: { type: Boolean, default: false },
  holdReason: { type: String },
  
  // Audit trail
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Pre-save hook to calculate remaining amount
invoiceSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - this.paidAmount;
  
  // Update status based on payment
  if (this.paidAmount >= this.totalAmount && this.status !== 'cancelled') {
    this.status = 'paid';
  } else if (this.paidAmount > 0 && this.paidAmount < this.totalAmount) {
    if (this.status === 'approved' || this.status === 'paid') {
      this.status = 'partially_paid';
    }
  }
  
  next();
});

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function() {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `INV-${year}${month}`;
  
  // Find the last invoice with this prefix
  const lastInvoice = await this.findOne({
    invoiceNumber: { $regex: `^${prefix}` }
  }).sort({ invoiceNumber: -1 });
  
  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-').pop());
    sequence = lastSequence + 1;
  }
  
  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
};

// Method to check if invoice is overdue
invoiceSchema.methods.isOverdue = function() {
  if (this.status === 'paid' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
};

// Method to get days until due (negative if overdue)
invoiceSchema.methods.getDaysUntilDue = function() {
  const today = new Date();
  const diffTime = this.dueDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Indexes for efficient querying
invoiceSchema.index({ vendorId: 1, status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ invoiceDate: 1 });
invoiceSchema.index({ 'linkedPurchaseOrders': 1 });
invoiceSchema.index({ isOnHold: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
