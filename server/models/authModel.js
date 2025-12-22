const mongoose = require("mongoose");

const chequeSchema = new mongoose.Schema(
  {
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
    chequeNumber: {
      type: String,
      required: true,
      trim: true,
      // Note: Uniqueness is enforced at application level in authCtrl
      // because unique index on subdocument arrays causes issues
    },
    status: {
      type: String,
      enum: ["pending", "cleared", "bounced", "cancelled"],
      default: "pending",
    },
    clearedDate: {
      type: Date,
    },
    bankReference: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Communication log schema for tracking calls, emails, follow-ups
const communicationLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["call", "email", "note", "payment_reminder", "statement_sent"],
      required: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    outcome: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    createdByName: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Payment record schema (for cash/other payments, separate from cheques)
const paymentRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "other"],
      default: "cash",
    },
    reference: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
  },
  { timestamps: true }
);

const authSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    phone: {
      type: String,
    },
    storeName: {
      type: String,
      trim: true,
    },
    ownerName: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    businessDescription: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    priceCategory: {
      type: String,
      default: "price",
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    agreeTerms: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["member", "store", "admin"],
      default: "member",
    },
    isOrder: {
      type: Boolean,
      default: false,
    },
    isProduct: {
      type: Boolean,
      default: false,
    },
    token: {
      type: String,
    },

    // ✅ नया cheque field
    cheques: [chequeSchema],
    
    // Communication logs for tracking calls, emails, follow-ups
    communicationLogs: [communicationLogSchema],
    
    // Payment records (cash/card/bank transfer - separate from cheques)
    paymentRecords: [paymentRecordSchema],

    // Store approval workflow fields
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // Default to approved for non-store roles, stores will be set to pending on registration
    },
    registrationRef: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    rejectedAt: {
      type: Date,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to generate unique registrationRef for new stores
authSchema.pre("save", function (next) {
  // Only generate registrationRef for new store registrations
  if (this.isNew && this.role === "store" && !this.registrationRef) {
    // Generate unique reference: REG-YYYYMMDD-XXXXX (timestamp + random 5 chars)
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0");
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.registrationRef = `REG-${dateStr}-${randomStr}`;
    
    // Set approval status to pending for new stores
    this.approvalStatus = "pending";
  }
  next();
});

module.exports = mongoose.model("auth", authSchema);
