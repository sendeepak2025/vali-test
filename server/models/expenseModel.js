const mongoose = require("mongoose");

/**
 * Office Expense Model
 * Tracks all office/operational expenses
 */

const expenseSchema = new mongoose.Schema(
  {
    // Auto-generated expense number (EX-001, EX-002, etc.)
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      enum: [
        'office_supplies',
        'utilities',
        'rent',
        'equipment',
        'travel',
        'meals',
        'software',
        'maintenance',
        'insurance',
        'marketing',
        'professional_services',
        'shipping',
        'other'
      ],
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'check', 'card', 'ach', 'other'],
      required: true,
    },

    // Vendor reference (optional - for linking to system vendors)
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
    },

    // Vendor name (for display or manual entry)
    vendor: {
      type: String,
      trim: true,
    },

    // Linked purchase order
    linkedPurchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
    },

    reference: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    // Receipt/attachment
    receipt: {
      fileName: String,
      fileUrl: String,
      fileType: String,
      uploadedAt: Date,
    },

    // Status for approval workflow
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved', // Auto-approve by default
    },

    // Tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
      required: true,
    },
    createdByName: String,

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    approvedAt: Date,

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
  },
  { timestamps: true }
);

// Generate expense number
expenseSchema.statics.generateExpenseNumber = async function () {
  // Find the last expense to get the highest number
  const lastExpense = await this.findOne({
    expenseNumber: { $regex: /^EX-\d+$/ },
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (lastExpense && lastExpense.expenseNumber) {
    const lastNumber = parseInt(lastExpense.expenseNumber.split("-")[1]);
    if (!isNaN(lastNumber)) {
      sequence = lastNumber + 1;
    }
  }

  return `EX-${sequence.toString().padStart(3, "0")}`;
};

// Index for efficient queries
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ createdBy: 1 });
expenseSchema.index({ isDeleted: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
