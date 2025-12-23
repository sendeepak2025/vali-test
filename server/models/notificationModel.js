const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auth",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "store_registration",    // New store registered (to admins)
        "store_approved",        // Store approved (to store)
        "store_rejected",        // Store rejected (to store)
        "order_created",         // New order placed (to store & admins)
        "order_status_changed",  // Order status update (to store)
        "payment_reminder",      // Payment due reminder (to store)
        "inactivity_alert",      // Store inactive (to admins)
        "first_order",           // Store's first order (to admins)
        "high_value_order",      // High value order alert (to admins)
        "system",              // System notifications
        "password_reset"
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
    },
    emailError: {
      type: String,
      trim: true,
    },
    link: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient querying by recipient and read status
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Compound index for filtering by type
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
