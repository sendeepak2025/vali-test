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

// Legal document schema for storing all legal records
const legalDocumentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: [
        "terms_acceptance",      // Terms & Conditions acceptance record
        "credit_application",    // Credit application form
        "personal_guarantee",    // Personal guarantee document
        "business_license",      // Business license copy
        "tax_certificate",       // Tax ID / Resale certificate
        "insurance_certificate", // Insurance certificate
        "w9_form",              // W-9 form
        "signed_agreement",      // Signed credit agreement
        "id_document",          // Owner ID (driver's license, etc.)
        "bank_reference",       // Bank reference letter
        "trade_reference",      // Trade reference
        "other"                 // Other documents
      ],
      required: true,
    },
    documentName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // For file uploads
    fileUrl: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileType: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
    },
    // For terms acceptance - store the actual content agreed to
    documentContent: {
      type: String, // Store HTML/text of terms at time of acceptance
    },
    documentVersion: {
      type: String,
      trim: true,
    },
    // Acceptance/signature details
    acceptedAt: {
      type: Date,
    },
    acceptedByName: {
      type: String,
      trim: true,
    },
    acceptedByEmail: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    // Digital signature (if applicable)
    signatureData: {
      type: String, // Base64 encoded signature image
    },
    // Document status
    status: {
      type: String,
      enum: ["pending", "received", "verified", "expired", "rejected"],
      default: "received",
    },
    expiryDate: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    verifiedByName: {
      type: String,
      trim: true,
    },
    // Notes for admin
    adminNotes: {
      type: String,
      trim: true,
    },
    // Who uploaded/created this record
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    uploadedByName: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Credit terms agreement schema
const creditAgreementSchema = new mongoose.Schema(
  {
    creditLimit: {
      type: Number,
      default: 0,
    },
    paymentTermsDays: {
      type: Number,
      default: 7, // Net 7 days
    },
    interestRate: {
      type: Number,
      default: 1.5, // 1.5% monthly
    },
    agreedAt: {
      type: Date,
    },
    agreedByName: {
      type: String,
      trim: true,
    },
    agreedByEmail: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    // Store snapshot of terms at time of agreement
    termsSnapshot: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "revoked"],
      default: "active",
    },
    suspendedAt: {
      type: Date,
    },
    suspendedReason: {
      type: String,
      trim: true,
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
      enum: ["aPrice", "bPrice", "cPrice", "restaurantPrice"],
      default: "aPrice",
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
    
    // Member specific fields
    department: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    employeeId: {
      type: String,
      trim: true,
    },
    joiningDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    lastLogin: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
    },
    
    // Activity logs for tracking member actions
    activityLogs: [{
      action: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "auth",
      },
      performedByName: {
        type: String,
      },
      ipAddress: {
        type: String,
      },
      userAgent: {
        type: String,
      },
      metadata: {
        type: mongoose.Schema.Types.Mixed,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    token: {
      type: String,
    },

    // ✅ नया cheque field
    cheques: [chequeSchema],
    
    // Communication logs for tracking calls, emails, follow-ups
    communicationLogs: [communicationLogSchema],
    
    // Payment records (cash/card/bank transfer - separate from cheques)
    paymentRecords: [paymentRecordSchema],

    // Legal documents for store accounts
    legalDocuments: [legalDocumentSchema],
    
    // Credit agreement history
    creditAgreements: [creditAgreementSchema],
    
    // Current active credit terms
    currentCreditTerms: {
      creditLimit: {
        type: Number,
        default: 0,
      },
      paymentTermsDays: {
        type: Number,
        default: 7,
      },
      interestRate: {
        type: Number,
        default: 1.5,
      },
      status: {
        type: String,
        enum: ["none", "active", "suspended", "cod_only"],
        default: "none",
      },
    },
    
    // Business verification info
    businessInfo: {
      legalBusinessName: {
        type: String,
        trim: true,
      },
      dba: { // Doing Business As
        type: String,
        trim: true,
      },
      businessType: {
        type: String,
        enum: ["sole_proprietor", "partnership", "llc", "corporation", "other"],
      },
      taxId: { // EIN or SSN (store encrypted/masked)
        type: String,
        trim: true,
      },
      stateTaxId: {
        type: String,
        trim: true,
      },
      businessLicenseNumber: {
        type: String,
        trim: true,
      },
      yearEstablished: {
        type: Number,
      },
      // Owner/Principal information
      principalName: {
        type: String,
        trim: true,
      },
      principalTitle: {
        type: String,
        trim: true,
      },
      principalPhone: {
        type: String,
        trim: true,
      },
      principalEmail: {
        type: String,
        trim: true,
      },
      principalSSN: { // Last 4 digits only for verification
        type: String,
        trim: true,
      },
      principalDOB: {
        type: Date,
      },
      principalAddress: {
        type: String,
        trim: true,
      },
      // Bank information
      bankName: {
        type: String,
        trim: true,
      },
      bankAccountType: {
        type: String,
        enum: ["checking", "savings"],
      },
      bankRoutingNumber: {
        type: String,
        trim: true,
      },
      bankAccountNumber: { // Store masked
        type: String,
        trim: true,
      },
    },
    
    // Terms acceptance tracking
    termsAcceptance: {
      acceptedAt: {
        type: Date,
      },
      acceptedVersion: {
        type: String,
        trim: true,
      },
      ipAddress: {
        type: String,
        trim: true,
      },
      userAgent: {
        type: String,
        trim: true,
      },
    },

    // Store Credit Balance for tracking store credits
    creditBalance: {
      type: Number,
      default: 0,
    },
    creditHistory: [{
      type: {
        type: String,
        enum: ['credit_issued', 'credit_applied', 'adjustment', 'write_off'],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      reference: {
        type: String,  // Credit memo ID, order ID, adjustment ID, etc.
        trim: true,
      },
      referenceModel: {
        type: String,  // 'CreditMemo', 'Order', 'Adjustment'
        trim: true,
      },
      reason: {
        type: String,
        trim: true,
      },
      balanceBefore: {
        type: Number,
      },
      balanceAfter: {
        type: Number,
      },
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "auth",
      },
      performedByName: {
        type: String,
        trim: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],

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
    // Password reset fields
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    // OTP fields for login verification
    loginOtp: {
      type: String,
    },
    loginOtpExpires: {
      type: Date,
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
