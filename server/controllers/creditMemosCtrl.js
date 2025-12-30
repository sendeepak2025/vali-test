// controllers/creditMemoController.js

const CreditMemo = require("../models/creditMemosModel");
const Order = require("../models/orderModle");
const Auth = require("../models/authModel");
const mongoose = require("mongoose");
// Generate unique CreditMemo number (simple example)
const generateCreditMemoNumber = async () => {
  const count = await CreditMemo.countDocuments();
  return `CM-${count + 1}`; // Customize format as needed
};
const cloudinary = require("cloudinary").v2

/**
 * Helper: Update store credit balance when credit memo is processed
 */
const updateStoreCreditBalance = async (customerId, amount, creditMemoId, creditMemoNumber, reason, userId, userName, session = null) => {
  const store = await Auth.findById(customerId).session(session);
  if (!store) {
    throw new Error("Store/Customer not found");
  }

  const balanceBefore = store.creditBalance || 0;
  const balanceAfter = balanceBefore + amount;

  store.creditBalance = balanceAfter;
  store.creditHistory.push({
    type: "credit_issued",
    amount: amount,
    reference: creditMemoId.toString(),
    referenceModel: "CreditMemo",
    reason: `Credit Memo ${creditMemoNumber}: ${reason || "Credit issued"}`,
    balanceBefore,
    balanceAfter,
    performedBy: userId,
    performedByName: userName,
    createdAt: new Date(),
  });

  await store.save({ session });
  return { balanceBefore, balanceAfter };
};

/**
 * Helper: Apply store credit to an order
 */
const applyStoreCreditToOrder = async (storeId, orderId, amount, userId, userName, session = null) => {
  const store = await Auth.findById(storeId).session(session);
  if (!store) {
    throw new Error("Store not found");
  }

  const currentBalance = store.creditBalance || 0;
  if (currentBalance < amount) {
    throw new Error(`Insufficient credit balance. Available: ${currentBalance}, Requested: ${amount}`);
  }

  // Get order details for reason text
  const order = await Order.findById(orderId).select("orderNumber").session(session);
  const orderNumber = order?.orderNumber || orderId.toString().slice(-6);

  const balanceBefore = currentBalance;
  const balanceAfter = currentBalance - amount;

  store.creditBalance = balanceAfter;
  store.creditHistory.push({
    type: "credit_applied",
    amount: -amount,
    reference: orderId.toString(),  // Store order ID for population
    referenceModel: "Order",
    reason: `Credit applied to order #${orderNumber}`,
    balanceBefore,
    balanceAfter,
    performedBy: userId,
    performedByName: userName,
    createdAt: new Date(),
  });

  await store.save({ session });
  return { balanceBefore, balanceAfter, amountApplied: amount, orderNumber };
};

// Create Credit Memo
exports.createCreditMemo = async (req, res) => {
  try {
    const { files, body } = req;

    // Parse credit memo data
    const creditMemoData = JSON.parse(body.creditMemoData);
    const creditItems = [];

    // Parse items and upload files
    for (let i = 0; ; i++) {
      const itemKey = `items[${i}]`;
      if (!body[itemKey]) break;

      const itemData = JSON.parse(body[itemKey]);
      const fileCount = Number(itemData.fileCount || 0);
      const uploadedFiles = [];

      for (let j = 0; j < fileCount; j++) {
        const fileField = `item_${i}_file_${j}`;
        const file = files[fileField];

        if (file) {
          const result = await cloudinary.uploader.upload(file.tempFilePath, {
            resource_type: "auto",
            folder: "credit-memos",
          });

          uploadedFiles.push({
            url: result.secure_url,
            type: result.resource_type,
          });
        }
      }

      creditItems.push({
        ...itemData,
        uploadedFiles: uploadedFiles,
      });
    }

    // Save credit memo
    const newCreditMemo = new CreditMemo({
      creditMemoNumber: creditMemoData.creditMemoNumber,
      date: creditMemoData.date,
      reason: creditMemoData.reason,
      notes: creditMemoData.notes,
      refundMethod: creditMemoData.refundMethod,
      totalAmount: creditMemoData.totalAmount,
      orderId: new mongoose.Types.ObjectId(creditMemoData.orderId),
      customerId: new mongoose.Types.ObjectId(creditMemoData.customerId),
      orderNumber: creditMemoData.orderNumber,
      customerName: creditMemoData.customerName,
      status: creditMemoData.status || "pending",
      createdAt: creditMemoData.createdAt || new Date(),
      items: creditItems,
    });

    await newCreditMemo.save();

    // ✅ Push credit memo into the order
    const order = await Order.findById(new mongoose.Types.ObjectId(creditMemoData.orderId));
    if (order) {
      if (!Array.isArray(order.creditMemos)) {
        order.creditMemos = [];
      }
      order.creditMemos = newCreditMemo._id;
      await order.save();
    }

    return res.status(201).json({
      message: "Credit memo created and added to order",
      success:true,
      creditMemo: newCreditMemo,
    });
  } catch (error) {
    console.error("Error creating credit memo:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get All Credit Memos with optional filters, pagination
exports.getCreditMemos = async (req, res) => {
  try {
    const { status, customerId, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const creditMemos = await CreditMemo.find(filter)
      .populate("orderId")
      .populate("customerId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CreditMemo.countDocuments(filter);

    return res.json({
      data: creditMemos,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching credit memos:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get single Credit Memo by ID
exports.getCreditMemoById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid credit memo ID" });

    const creditMemo = await CreditMemo.findById(id)
      .populate("orderId")
      .populate("customerId");

    if (!creditMemo) return res.status(404).json({ error: "Credit memo not found" });

    return res.json(creditMemo);
  } catch (error) {
    console.error("Error fetching credit memo:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Update Credit Memo status or reason etc.
exports.updateCreditMemo = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid credit memo ID" });

    // Get current credit memo to check status change
    const currentCreditMemo = await CreditMemo.findById(id).session(session);
    if (!currentCreditMemo) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Credit memo not found" });
    }

    // Only allow specific fields to update for safety
    const allowedUpdates = ["status", "reason", "refundMethod", "items", "totalAmount"];
    const updateData = {};
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) updateData[field] = updates[field];
    });

    updateData.updatedAt = new Date();

    const updatedCreditMemo = await CreditMemo.findByIdAndUpdate(id, updateData, {
      new: true,
      session,
    });

    // If status changed to "processed" and refundMethod is "store_credit", update store balance
    if (
      updates.status === "processed" &&
      currentCreditMemo.status !== "processed" &&
      (updatedCreditMemo.refundMethod === "store_credit" || currentCreditMemo.refundMethod === "store_credit")
    ) {
      await updateStoreCreditBalance(
        updatedCreditMemo.customerId,
        updatedCreditMemo.totalAmount,
        updatedCreditMemo._id,
        updatedCreditMemo.creditMemoNumber,
        updatedCreditMemo.reason,
        req.user?.id || req.user?._id,
        req.user?.name || req.user?.storeName || req.user?.email,
        session
      );
    }

    await session.commitTransaction();
    return res.json({ message: "Credit memo updated", creditMemo: updatedCreditMemo });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error updating credit memo:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  } finally {
    session.endSession();
  }
};

// Delete Credit Memo (optional)
exports.deleteCreditMemo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid credit memo ID" });

    const deleted = await CreditMemo.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ error: "Credit memo not found" });

    return res.json({ message: "Credit memo deleted" });
  } catch (error) {
    console.error("Error deleting credit memo:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getCreditMemosByOrderId = async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: "Order ID is required",
    });
  }

  try {
    const creditMemos = await CreditMemo.find({ orderId })
      .populate("customerId", "name email phone") // optional: include customer info
      .sort({ createdAt: -1 });

    if (!creditMemos.length) {
      return res.status(404).json({
        success: false,
        message: "No credit memos found for this order ID",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Credit memos fetched successfully!",
      creditMemos,
    });
  } catch (error) {
    console.error("Error fetching credit memos by orderId:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching credit memos",
      error: error.message,
    });
  }
};



exports.updateCreditMemo = async (req, res) => {
  try {
    const { creditMemoId } = req.params;
    const { files, body } = req;

    const creditMemoData = JSON.parse(body.creditMemoData);
    const updatedItems = [];

    for (let i = 0; ; i++) {
      const itemKey = `items[${i}]`;
      if (!body[itemKey]) break;

      const itemData = JSON.parse(body[itemKey]);
      const fileCount = Number(itemData.fileCount || 0);
      const uploadedFiles = [];

      for (let j = 0; j < fileCount; j++) {
        const fileField = `item_${i}_file_${j}`;
        const file = files[fileField];

        if (file) {
          const result = await cloudinary.uploader.upload(file.tempFilePath, {
            resource_type: "auto",
            folder: "credit-memos",
          });

          uploadedFiles.push({
            url: result.secure_url,
            type: result.resource_type,
          });
        }
      }

      const existingFiles = itemData.existingFiles || [];

      updatedItems.push({
        ...itemData,
        uploadedFiles: [...existingFiles, ...uploadedFiles],
      });
    }

    const updatedCreditMemo = await CreditMemo.findByIdAndUpdate(
      creditMemoId,
      {
        creditMemoNumber: creditMemoData.creditMemoNumber,
        date: creditMemoData.date,
        reason: creditMemoData.reason,
        notes: creditMemoData.notes,
        refundMethod: creditMemoData.refundMethod,
        totalAmount: creditMemoData.totalAmount,
        orderId: new mongoose.Types.ObjectId(creditMemoData.orderId),
        customerId: new mongoose.Types.ObjectId(creditMemoData.customerId),
        orderNumber: creditMemoData.orderNumber,
        customerName: creditMemoData.customerName,
        status: creditMemoData.status || "pending",
        createdAt: creditMemoData.createdAt || new Date(),
        items: updatedItems,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedCreditMemo) {
      return res.status(404).json({ message: "Credit memo not found", success: false });
    }

    // Optional: update creditMemo reference in order
    const order = await Order.findById(creditMemoData.orderId);
    if (order) {
      order.creditMemos = updatedCreditMemo._id;
      await order.save();
    }

    return res.status(200).json({
      message: "Credit memo updated successfully",
      success: true,
      creditMemo: updatedCreditMemo,
    });

  } catch (error) {
    console.error("Error updating credit memo:", error);
    return res.status(500).json({
      message: "Failed to update credit memo",
      error: error.message,
      success: false,
    });
  }
};




/**
 * Process a credit memo - marks as processed and updates store credit if applicable
 */
exports.processCreditMemo = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { processNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: "Invalid credit memo ID" });
    }

    const creditMemo = await CreditMemo.findById(id).session(session);
    if (!creditMemo) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: "Credit memo not found" });
    }

    if (creditMemo.status === "processed") {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: "Credit memo is already processed" });
    }

    // Update credit memo status
    creditMemo.status = "processed";
    creditMemo.processedAt = new Date();
    creditMemo.processedBy = req.user?.id || req.user?._id;
    creditMemo.processNotes = processNotes;
    creditMemo.updatedAt = new Date();

    await creditMemo.save({ session });

    let creditBalanceUpdate = null;

    // If refund method is store_credit, update the store's credit balance
    if (creditMemo.refundMethod === "store_credit") {
      creditBalanceUpdate = await updateStoreCreditBalance(
        creditMemo.customerId,
        creditMemo.totalAmount,
        creditMemo._id,
        creditMemo.creditMemoNumber,
        creditMemo.reason,
        req.user?.id || req.user?._id,
        req.user?.name || req.user?.storeName || req.user?.email,
        session
      );
    }

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Credit memo processed successfully",
      creditMemo,
      creditBalanceUpdate,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error processing credit memo:", error);
    return res.status(500).json({ success: false, error: error.message || "Server error" });
  } finally {
    session.endSession();
  }
};

/**
 * Apply store credit to an order
 */
exports.applyStoreCredit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storeId, orderId, amount } = req.body;

    if (!storeId || !orderId || !amount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: "storeId, orderId, and amount are required",
      });
    }

    if (amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: "Amount must be greater than 0",
      });
    }

    // Verify order exists and belongs to store
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    if (order.store.toString() !== storeId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: "Order does not belong to this store" });
    }

    // Apply credit to order
    const result = await applyStoreCreditToOrder(
      storeId,
      orderId,
      amount,
      req.user?.id || req.user?._id,
      req.user?.name || req.user?.storeName || req.user?.email,
      session
    );

    // Update order with credit applied
    const currentCreditApplied = parseFloat(order.creditApplied || 0);
    order.creditApplied = currentCreditApplied + amount;
    
    // Recalculate payment status if needed
    const totalPaid = parseFloat(order.paymentAmount || 0) + parseFloat(order.creditApplied || 0);
    const orderTotal = order.items.reduce((sum, item) => sum + (item.total || 0), 0) + (order.shippinCost || 0);
    
    if (totalPaid >= orderTotal) {
      order.paymentStatus = "paid";
    } else if (totalPaid > 0) {
      order.paymentStatus = "partial";
    }

    await order.save({ session });
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Store credit applied successfully",
      data: {
        amountApplied: amount,
        newCreditBalance: result.balanceAfter,
        orderPaymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error applying store credit:", error);
    return res.status(500).json({ success: false, error: error.message || "Server error" });
  } finally {
    session.endSession();
  }
};

/**
 * Get store credit balance and history
 */
exports.getStoreCreditInfo = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Auth.findById(storeId).select("storeName creditBalance creditHistory");
    if (!store) {
      return res.status(404).json({ success: false, error: "Store not found" });
    }

    // Get pending credit memos for this store
    const pendingCredits = await CreditMemo.find({
      customerId: storeId,
      status: "pending",
      refundMethod: "store_credit",
    }).select("creditMemoNumber totalAmount reason createdAt");

    // Populate order details for credit_applied entries
    const creditHistory = store.creditHistory || [];
    const populatedHistory = [];

    for (const entry of creditHistory) {
      const historyEntry = entry.toObject ? entry.toObject() : { ...entry };
      
      // If it's a credit_applied entry with Order reference, populate order number
      if (entry.type === "credit_applied" && entry.referenceModel === "Order" && entry.reference) {
        try {
          const order = await Order.findById(entry.reference).select("orderNumber");
          if (order) {
            historyEntry.orderNumber = order.orderNumber;
            historyEntry.orderId = entry.reference;
          }
        } catch (err) {
          // If order not found, continue without order number
        }
      }
      
      populatedHistory.push(historyEntry);
    }

    return res.status(200).json({
      success: true,
      data: {
        storeName: store.storeName,
        creditBalance: store.creditBalance || 0,
        creditHistory: populatedHistory,
        pendingCredits,
      },
    });
  } catch (error) {
    console.error("Error fetching store credit info:", error);
    return res.status(500).json({ success: false, error: error.message || "Server error" });
  }
};

// Export helper functions for use in other controllers
exports.updateStoreCreditBalance = updateStoreCreditBalance;
exports.applyStoreCreditToOrder = applyStoreCreditToOrder;
