const mongoose = require('mongoose');

const CommunicationSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    default: Date.now 
  },
  message: { 
    type: String, 
    required: true 
  },
  by: { 
    type: String, 
    required: true 
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'auth'
  },
  attachments: [String],
  isInternal: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const ResolutionSchema = new mongoose.Schema({
  notes: { 
    type: String, 
    required: true 
  },
  creditMemoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'VendorCreditMemo' 
  },
  creditMemoAmount: Number,
  resolutionType: {
    type: String,
    enum: ['credit_issued', 'replacement', 'price_adjustment', 'no_action', 'other'],
    required: true
  },
  resolvedAt: { 
    type: Date, 
    default: Date.now 
  },
  resolvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'auth' 
  }
}, { _id: false });

const VendorDisputeSchema = new mongoose.Schema({
  disputeNumber: { 
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
  linkedPurchaseOrderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PurchaseOrder' 
  },
  linkedInvoiceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Invoice' 
  },
  type: { 
    type: String, 
    enum: ['quality', 'quantity', 'pricing', 'delivery', 'documentation', 'other'], 
    required: true 
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  description: { 
    type: String, 
    required: true 
  },
  disputedAmount: {
    type: Number,
    default: 0
  },
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'pending_vendor', 'resolved', 'escalated', 'closed'], 
    default: 'open',
    index: true
  },
  putInvoicesOnHold: { 
    type: Boolean, 
    default: false 
  },
  affectedInvoiceIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  }],
  communications: [CommunicationSchema],
  resolution: ResolutionSchema,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'auth'
  },
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'auth'
  },
  escalatedAt: Date,
  escalationReason: String,
  dueDate: Date,
  documentUrls: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'auth'
  }
}, { 
  timestamps: true 
});

// Indexes
VendorDisputeSchema.index({ vendorId: 1, status: 1 });
VendorDisputeSchema.index({ createdAt: -1 });
VendorDisputeSchema.index({ linkedPurchaseOrderId: 1 });
VendorDisputeSchema.index({ linkedInvoiceId: 1 });
VendorDisputeSchema.index({ dueDate: 1, status: 1 });

// Static method to generate unique dispute number
VendorDisputeSchema.statics.generateDisputeNumber = async function() {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `VD${year}${month}`;
  
  const lastDispute = await this.findOne({
    disputeNumber: new RegExp(`^${prefix}`)
  }).sort({ disputeNumber: -1 });
  
  let sequence = 1;
  if (lastDispute) {
    const lastSequence = parseInt(lastDispute.disputeNumber.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

// Instance method to check if dispute can be edited
VendorDisputeSchema.methods.canEdit = function() {
  return ['open', 'in_progress', 'pending_vendor', 'escalated'].includes(this.status);
};

// Instance method to check if dispute can be resolved
VendorDisputeSchema.methods.canResolve = function() {
  return ['open', 'in_progress', 'pending_vendor', 'escalated'].includes(this.status);
};

// Instance method to check if dispute can be escalated
VendorDisputeSchema.methods.canEscalate = function() {
  return ['open', 'in_progress', 'pending_vendor'].includes(this.status);
};

// Instance method to add communication
VendorDisputeSchema.methods.addCommunication = function(message, by, userId, attachments = [], isInternal = false) {
  this.communications.push({
    date: new Date(),
    message,
    by,
    userId,
    attachments,
    isInternal
  });
  return this;
};

// Instance method to check if overdue
VendorDisputeSchema.methods.isOverdue = function() {
  if (!this.dueDate) return false;
  if (['resolved', 'closed'].includes(this.status)) return false;
  return new Date() > new Date(this.dueDate);
};

// Virtual for days open
VendorDisputeSchema.virtual('daysOpen').get(function() {
  const endDate = this.resolution?.resolvedAt || new Date();
  const startDate = this.createdAt;
  return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('VendorDispute', VendorDisputeSchema);
