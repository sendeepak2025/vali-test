const mongoose = require("mongoose");

/**
 * Financial Adjustment Model
 * Tracks all financial adjustments including credits, debits, write-offs, and corrections
 */

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'updated', 'approved', 'rejected', 'applied', 'voided'],
    required: true,
  },
  previousStatus: String,
  newStatus: String,
  notes: String,
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "auth",
  },
  performedByName: String,
  ipAddress: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const adjustmentSchema = new mongoose.Schema(
  {
    // Auto-generated adjustment number (ADJ-YYMMDD-XXXX)
    adjustmentNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // Target - either store or vendor (one must be set)
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
    },

    // Adjustment type
    type: {
      type: String,
      enum: ['credit', 'debit', 'write_off', 'correction', 'refund', 'discount'],
      required: true,
    },

    // Amount (positive value, type determines if it's added or subtracted)
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Reason category for reporting
    reasonCategory: {
      type: String,
      enum: [
        'pricing_error',
        'damaged_goods',
        'returned_goods',
        'customer_goodwill',
        'promotional_credit',
        'bad_debt',
        'duplicate_payment',
        'overpayment',
        'underpayment',
        'service_issue',
        'billing_error',
        'other'
      ],
      required: true,
    },

    // Detailed reason/description
    reason: {
      type: String,
      required: true,
      trim: true,
    },

    // Linked documents
    linkedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    linkedInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    linkedCreditMemoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreditMemo",
    },

    // Status workflow
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'applied', 'voided'],
      default: 'pending',
      index: true,
    },

    // Approval workflow
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    approvalThreshold: {
      type: Number,
      default: 100, // Adjustments above this amount require approval
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    approvedByName: String,
    approvedAt: Date,
    approvalNotes: String,

    // Rejection details
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    rejectedByName: String,
    rejectedAt: Date,
    rejectionReason: String,

    // Application details (when adjustment is applied to balance)
    appliedAt: Date,
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    appliedByName: String,
    balanceBefore: Number,
    balanceAfter: Number,

    // Void details
    voidedAt: Date,
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    voidedByName: String,
    voidReason: String,

    // Supporting documents
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileType: String,
      uploadedAt: { type: Date, default: Date.now },
    }],

    // Audit trail
    auditLog: [auditLogSchema],

    // Created by
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
      required: true,
    },
    createdByName: String,

    // Notes
    internalNotes: String,
  },
  { timestamps: true }
);

// Generate adjustment number
adjustmentSchema.statics.generateAdjustmentNumber = async function() {
  const date = new Date();
  const dateStr = date.getFullYear().toString().slice(-2) +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0");
  
  // Find the last adjustment number for today
  const lastAdjustment = await this.findOne({
    adjustmentNumber: new RegExp(`^ADJ-${dateStr}-`)
  }).sort({ adjustmentNumber: -1 });

  let sequence = 1;
  if (lastAdjustment) {
    const lastSequence = parseInt(lastAdjustment.adjustmentNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `ADJ-${dateStr}-${sequence.toString().padStart(4, '0')}`;
};

// Validation: Either storeId or vendorId must be set
adjustmentSchema.pre('validate', function(next) {
  if (!this.storeId && !this.vendorId) {
    next(new Error('Either storeId or vendorId must be provided'));
  } else if (this.storeId && this.vendorId) {
    next(new Error('Cannot set both storeId and vendorId'));
  } else {
    next();
  }
});

// Add audit log entry helper
adjustmentSchema.methods.addAuditLog = function(action, userId, userName, notes, previousStatus, newStatus, ipAddress) {
  this.auditLog.push({
    action,
    previousStatus,
    newStatus,
    notes,
    performedBy: userId,
    performedByName: userName,
    ipAddress,
    createdAt: new Date(),
  });
};

// Indexes for common queries
adjustmentSchema.index({ status: 1, createdAt: -1 });
adjustmentSchema.index({ storeId: 1, status: 1 });
adjustmentSchema.index({ vendorId: 1, status: 1 });
adjustmentSchema.index({ type: 1, status: 1 });
adjustmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Adjustment", adjustmentSchema);
