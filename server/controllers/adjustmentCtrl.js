const Adjustment = require("../models/adjustmentModel");
const Auth = require("../models/authModel");
const Vendor = require("../models/vendorModel");
const mongoose = require("mongoose");

/**
 * Create a new adjustment
 */
const createAdjustment = async (req, res) => {
  try {
    const {
      storeId,
      vendorId,
      type,
      amount,
      reasonCategory,
      reason,
      linkedOrderId,
      linkedInvoiceId,
      linkedCreditMemoId,
      requiresApproval,
      attachments,
      internalNotes,
    } = req.body;

    // Validate target exists
    if (storeId) {
      const store = await Auth.findById(storeId);
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }
    }
    if (vendorId) {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({ success: false, message: "Vendor not found" });
      }
    }

    const adjustmentNumber = await Adjustment.generateAdjustmentNumber();

    const adjustment = new Adjustment({
      adjustmentNumber,
      storeId,
      vendorId,
      type,
      amount,
      reasonCategory,
      reason,
      linkedOrderId,
      linkedInvoiceId,
      linkedCreditMemoId,
      requiresApproval: requiresApproval !== false,
      attachments,
      internalNotes,
      createdBy: req.user?.id || req.user?._id,
      createdByName: req.user?.name || req.user?.storeName || req.user?.email,
      status: requiresApproval === false ? "approved" : "pending",
    });

    // Add initial audit log
    adjustment.addAuditLog(
      "created",
      req.user?.id || req.user?._id,
      req.user?.name || req.user?.storeName || req.user?.email,
      "Adjustment created",
      null,
      requiresApproval === false ? "approved" : "pending"
    );

    await adjustment.save();

    // If auto-approved, apply immediately
    if (requiresApproval === false) {
      await applyAdjustmentToBalance(adjustment, req.user);
    }

    res.status(201).json({
      success: true,
      message: "Adjustment created successfully",
      data: adjustment,
    });
  } catch (err) {
    console.error("Error creating adjustment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get all adjustments with filters
 */
const getAllAdjustments = async (req, res) => {
  try {
    const {
      storeId,
      vendorId,
      type,
      status,
      reasonCategory,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (storeId) filter.storeId = storeId;
    if (vendorId) filter.vendorId = vendorId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (reasonCategory) filter.reasonCategory = reasonCategory;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [adjustments, total] = await Promise.all([
      Adjustment.find(filter)
        .populate("storeId", "storeName email")
        .populate("vendorId", "name email")
        .populate("createdBy", "name storeName")
        .populate("approvedBy", "name storeName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Adjustment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: adjustments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error fetching adjustments:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get single adjustment by ID
 */
const getAdjustmentById = async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id)
      .populate("storeId", "storeName email creditBalance")
      .populate("vendorId", "name email")
      .populate("linkedOrderId", "orderNumber totalAmount")
      .populate("linkedInvoiceId", "invoiceNumber totalAmount")
      .populate("createdBy", "name storeName")
      .populate("approvedBy", "name storeName");

    if (!adjustment) {
      return res.status(404).json({ success: false, message: "Adjustment not found" });
    }

    res.status(200).json({ success: true, data: adjustment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get adjustments for a specific store
 */
const getStoreAdjustments = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status, type } = req.query;

    const filter = { storeId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const adjustments = await Adjustment.find(filter)
      .populate("createdBy", "name storeName")
      .populate("approvedBy", "name storeName")
      .sort({ createdAt: -1 });

    // Get store's current credit balance
    const store = await Auth.findById(storeId).select("creditBalance creditHistory");

    res.status(200).json({
      success: true,
      data: {
        adjustments,
        creditBalance: store?.creditBalance || 0,
        creditHistory: store?.creditHistory || [],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Approve an adjustment
 */
const approveAdjustment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const adjustment = await Adjustment.findById(id).session(session);
    if (!adjustment) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Adjustment not found" });
    }

    if (adjustment.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot approve adjustment with status: ${adjustment.status}`,
      });
    }

    const previousStatus = adjustment.status;
    adjustment.status = "approved";
    adjustment.approvedBy = req.user?.id || req.user?._id;
    adjustment.approvedByName = req.user?.name || req.user?.storeName || req.user?.email;
    adjustment.approvedAt = new Date();
    adjustment.approvalNotes = approvalNotes;

    adjustment.addAuditLog(
      "approved",
      req.user?.id || req.user?._id,
      req.user?.name || req.user?.storeName || req.user?.email,
      approvalNotes || "Adjustment approved",
      previousStatus,
      "approved"
    );

    await adjustment.save({ session });

    // Apply the adjustment to balance
    await applyAdjustmentToBalance(adjustment, req.user, session);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Adjustment approved and applied successfully",
      data: adjustment,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Error approving adjustment:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Reject an adjustment
 */
const rejectAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }

    const adjustment = await Adjustment.findById(id);
    if (!adjustment) {
      return res.status(404).json({ success: false, message: "Adjustment not found" });
    }

    if (adjustment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject adjustment with status: ${adjustment.status}`,
      });
    }

    const previousStatus = adjustment.status;
    adjustment.status = "rejected";
    adjustment.rejectedBy = req.user?.id || req.user?._id;
    adjustment.rejectedByName = req.user?.name || req.user?.storeName || req.user?.email;
    adjustment.rejectedAt = new Date();
    adjustment.rejectionReason = rejectionReason;

    adjustment.addAuditLog(
      "rejected",
      req.user?.id || req.user?._id,
      req.user?.name || req.user?.storeName || req.user?.email,
      rejectionReason,
      previousStatus,
      "rejected"
    );

    await adjustment.save();

    res.status(200).json({
      success: true,
      message: "Adjustment rejected",
      data: adjustment,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Void an adjustment (reverse if already applied)
 */
const voidAdjustment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { voidReason } = req.body;

    if (!voidReason) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Void reason is required" });
    }

    const adjustment = await Adjustment.findById(id).session(session);
    if (!adjustment) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Adjustment not found" });
    }

    if (adjustment.status === "voided") {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Adjustment is already voided" });
    }

    // If adjustment was applied, reverse it
    if (adjustment.status === "applied") {
      await reverseAdjustment(adjustment, req.user, voidReason, session);
    }

    const previousStatus = adjustment.status;
    adjustment.status = "voided";
    adjustment.voidedBy = req.user?.id || req.user?._id;
    adjustment.voidedByName = req.user?.name || req.user?.storeName || req.user?.email;
    adjustment.voidedAt = new Date();
    adjustment.voidReason = voidReason;

    adjustment.addAuditLog(
      "voided",
      req.user?.id || req.user?._id,
      req.user?.name || req.user?.storeName || req.user?.email,
      voidReason,
      previousStatus,
      "voided"
    );

    await adjustment.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Adjustment voided successfully",
      data: adjustment,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Error voiding adjustment:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Helper: Apply adjustment to store/vendor balance
 */
const applyAdjustmentToBalance = async (adjustment, user, session = null) => {
  if (adjustment.storeId) {
    const store = await Auth.findById(adjustment.storeId).session(session);
    if (!store) throw new Error("Store not found");

    const balanceBefore = store.creditBalance || 0;
    let balanceChange = 0;

    // Determine balance change based on type
    switch (adjustment.type) {
      case "credit":
      case "refund":
        balanceChange = adjustment.amount;
        break;
      case "debit":
      case "write_off":
        balanceChange = -adjustment.amount;
        break;
      case "correction":
      case "discount":
        // Correction can be positive or negative based on context
        // For now, treat as credit (positive)
        balanceChange = adjustment.amount;
        break;
    }

    const balanceAfter = balanceBefore + balanceChange;

    // Update store credit balance
    store.creditBalance = balanceAfter;

    // Add to credit history
    store.creditHistory.push({
      type: "adjustment",
      amount: balanceChange,
      reference: adjustment._id.toString(),
      referenceModel: "Adjustment",
      reason: `${adjustment.type}: ${adjustment.reason}`,
      balanceBefore,
      balanceAfter,
      performedBy: user?.id || user?._id,
      performedByName: user?.name || user?.storeName || user?.email,
      createdAt: new Date(),
    });

    await store.save({ session });

    // Update adjustment with balance info
    adjustment.appliedAt = new Date();
    adjustment.appliedBy = user?.id || user?._id;
    adjustment.appliedByName = user?.name || user?.storeName || user?.email;
    adjustment.balanceBefore = balanceBefore;
    adjustment.balanceAfter = balanceAfter;
    adjustment.status = "applied";

    adjustment.addAuditLog(
      "applied",
      user?.id || user?._id,
      user?.name || user?.storeName || user?.email,
      `Applied to balance. Before: ${balanceBefore}, After: ${balanceAfter}`,
      "approved",
      "applied"
    );

    await adjustment.save({ session });
  }

  // TODO: Add vendor balance handling if needed
};

/**
 * Helper: Reverse an applied adjustment
 */
const reverseAdjustment = async (adjustment, user, reason, session) => {
  if (adjustment.storeId) {
    const store = await Auth.findById(adjustment.storeId).session(session);
    if (!store) throw new Error("Store not found");

    const balanceBefore = store.creditBalance || 0;
    
    // Reverse the original change
    let reverseAmount = 0;
    switch (adjustment.type) {
      case "credit":
      case "refund":
        reverseAmount = -adjustment.amount;
        break;
      case "debit":
      case "write_off":
        reverseAmount = adjustment.amount;
        break;
      case "correction":
      case "discount":
        reverseAmount = -adjustment.amount;
        break;
    }

    const balanceAfter = balanceBefore + reverseAmount;
    store.creditBalance = balanceAfter;

    // Add reversal to credit history
    store.creditHistory.push({
      type: "adjustment",
      amount: reverseAmount,
      reference: adjustment._id.toString(),
      referenceModel: "Adjustment",
      reason: `VOID REVERSAL: ${reason}`,
      balanceBefore,
      balanceAfter,
      performedBy: user?.id || user?._id,
      performedByName: user?.name || user?.storeName || user?.email,
      createdAt: new Date(),
    });

    await store.save({ session });
  }
};

/**
 * Get adjustment summary/stats
 */
const getAdjustmentSummary = async (req, res) => {
  try {
    const { storeId, vendorId, startDate, endDate } = req.query;

    const matchFilter = {};
    if (storeId) matchFilter.storeId = new mongoose.Types.ObjectId(storeId);
    if (vendorId) matchFilter.vendorId = new mongoose.Types.ObjectId(vendorId);
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }

    const summary = await Adjustment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { type: "$type", status: "$status" },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $group: {
          _id: "$_id.type",
          statuses: {
            $push: {
              status: "$_id.status",
              count: "$count",
              totalAmount: "$totalAmount",
            },
          },
          totalCount: { $sum: "$count" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    // Get pending count for quick reference
    const pendingCount = await Adjustment.countDocuments({
      ...matchFilter,
      status: "pending",
    });

    res.status(200).json({
      success: true,
      data: {
        byType: summary,
        pendingCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createAdjustment,
  getAllAdjustments,
  getAdjustmentById,
  getStoreAdjustments,
  approveAdjustment,
  rejectAdjustment,
  voidAdjustment,
  getAdjustmentSummary,
};
