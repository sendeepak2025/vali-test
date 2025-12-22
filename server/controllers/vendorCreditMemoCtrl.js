const VendorCreditMemo = require('../models/vendorCreditMemoModel');
const Vendor = require('../models/vendorModel');
const PurchaseOrder = require('../models/purchaseModel');
const Invoice = require('../models/invoiceModel');
const mongoose = require('mongoose');

// ✅ Create Vendor Credit/Debit Memo
const createVendorCreditMemo = async (req, res) => {
  try {
    const {
      type,
      vendorId,
      linkedPurchaseOrderId,
      linkedInvoiceId,
      reasonCategory,
      description,
      lineItems,
      subtotal,
      taxAmount,
      amount,
      documentUrls,
      notes,
      submitForApproval
    } = req.body;

    // Validate vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Validate linked PO if provided
    if (linkedPurchaseOrderId) {
      const po = await PurchaseOrder.findById(linkedPurchaseOrderId);
      if (!po || po.vendorId.toString() !== vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Purchase order not found or does not belong to this vendor'
        });
      }
    }

    // Validate linked invoice if provided
    if (linkedInvoiceId) {
      const invoice = await Invoice.findById(linkedInvoiceId);
      if (!invoice || invoice.vendorId.toString() !== vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Invoice not found or does not belong to this vendor'
        });
      }
    }

    // Generate memo number
    const memoNumber = await VendorCreditMemo.generateMemoNumber(type || 'credit');

    const creditMemo = new VendorCreditMemo({
      memoNumber,
      type: type || 'credit',
      vendorId,
      linkedPurchaseOrderId,
      linkedInvoiceId,
      reasonCategory,
      description,
      lineItems: lineItems || [],
      subtotal: subtotal || amount,
      taxAmount: taxAmount || 0,
      amount,
      remainingAmount: amount,
      status: submitForApproval ? 'pending_approval' : 'draft',
      documentUrls: documentUrls || [],
      notes,
      createdBy: req.user?._id
    });

    await creditMemo.save();

    res.status(201).json({
      success: true,
      message: `${type === 'debit' ? 'Debit' : 'Credit'} memo created successfully`,
      data: creditMemo
    });
  } catch (err) {
    console.error('Error creating vendor credit memo:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create credit memo',
      error: err.message
    });
  }
};

// ✅ Get All Vendor Credit Memos with filters
const getAllVendorCreditMemos = async (req, res) => {
  try {
    const {
      vendorId,
      type,
      status,
      reasonCategory,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const matchStage = {};

    if (vendorId) {
      matchStage.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    if (type && type !== 'all') {
      matchStage.type = type;
    }

    if (status && status !== 'all') {
      matchStage.status = status;
    }

    if (reasonCategory && reasonCategory !== 'all') {
      matchStage.reasonCategory = reasonCategory;
    }

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const pipeline = [
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          ...matchStage,
          ...(search ? {
            $or: [
              { memoNumber: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
              { 'vendor.name': { $regex: search, $options: 'i' } }
            ]
          } : {})
        }
      },
      { $sort: { [sortBy]: sortDirection } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: parseInt(limit) }],
          totalCount: [{ $count: 'count' }],
          summary: [
            {
              $group: {
                _id: null,
                totalMemos: { $sum: 1 },
                totalCreditAmount: {
                  $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] }
                },
                totalDebitAmount: {
                  $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] }
                },
                totalApplied: { $sum: '$appliedAmount' },
                totalRemaining: { $sum: '$remainingAmount' }
              }
            }
          ],
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ];

    const result = await VendorCreditMemo.aggregate(pipeline);

    const memos = result[0].data;
    const totalMemos = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalMemos / parseInt(limit));
    const summary = result[0].summary[0] || {
      totalMemos: 0,
      totalCreditAmount: 0,
      totalDebitAmount: 0,
      totalApplied: 0,
      totalRemaining: 0
    };

    const statusCounts = {};
    result[0].statusCounts.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    res.status(200).json({
      success: true,
      message: memos.length ? 'Credit memos fetched successfully' : 'No credit memos found',
      data: {
        memos,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMemos,
          limit: parseInt(limit)
        },
        summary,
        statusCounts
      }
    });
  } catch (err) {
    console.error('Error fetching vendor credit memos:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit memos',
      error: err.message
    });
  }
};

// ✅ Get Single Credit Memo
const getVendorCreditMemoById = async (req, res) => {
  try {
    const { id } = req.params;

    const memo = await VendorCreditMemo.findById(id)
      .populate('vendorId', 'name email phone')
      .populate('linkedPurchaseOrderId', 'purchaseOrderNumber totalAmount')
      .populate('linkedInvoiceId', 'invoiceNumber totalAmount')
      .populate('approvedBy', 'name email')
      .populate('appliedToPaymentId', 'paymentNumber amount');

    if (!memo) {
      return res.status(404).json({
        success: false,
        message: 'Credit memo not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Credit memo fetched successfully',
      data: memo
    });
  } catch (err) {
    console.error('Error fetching credit memo:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit memo',
      error: err.message
    });
  }
};

// ✅ Update Credit Memo
const updateVendorCreditMemo = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const memo = await VendorCreditMemo.findById(id);
    if (!memo) {
      return res.status(404).json({
        success: false,
        message: 'Credit memo not found'
      });
    }

    if (!memo.canEdit()) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit credit memo with status: ${memo.status}`
      });
    }

    // Don't allow updating certain fields
    delete updateData.memoNumber;
    delete updateData.appliedAmount;
    delete updateData.appliedToPaymentId;
    delete updateData.approvedBy;
    delete updateData.approvedAt;

    // If amount changes, update remaining amount
    if (updateData.amount && updateData.amount !== memo.amount) {
      updateData.remainingAmount = updateData.amount - memo.appliedAmount;
    }

    const updatedMemo = await VendorCreditMemo.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('vendorId', 'name email');

    res.status(200).json({
      success: true,
      message: 'Credit memo updated successfully',
      data: updatedMemo
    });
  } catch (err) {
    console.error('Error updating credit memo:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update credit memo',
      error: err.message
    });
  }
};

// ✅ Delete Credit Memo
const deleteVendorCreditMemo = async (req, res) => {
  try {
    const { id } = req.params;

    const memo = await VendorCreditMemo.findById(id);
    if (!memo) {
      return res.status(404).json({
        success: false,
        message: 'Credit memo not found'
      });
    }

    if (memo.appliedAmount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete credit memo that has been applied to payments'
      });
    }

    if (!['draft', 'pending_approval'].includes(memo.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete credit memo with status: ${memo.status}`
      });
    }

    await VendorCreditMemo.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Credit memo deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting credit memo:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete credit memo',
      error: err.message
    });
  }
};

// ✅ Submit for Approval
const submitForApproval = async (req, res) => {
  try {
    const { id } = req.params;

    const memo = await VendorCreditMemo.findById(id);
    if (!memo) {
      return res.status(404).json({
        success: false,
        message: 'Credit memo not found'
      });
    }

    if (memo.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft memos can be submitted for approval'
      });
    }

    memo.status = 'pending_approval';
    await memo.save();

    res.status(200).json({
      success: true,
      message: 'Credit memo submitted for approval',
      data: memo
    });
  } catch (err) {
    console.error('Error submitting credit memo for approval:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to submit credit memo for approval',
      error: err.message
    });
  }
};

// ✅ Approve Credit Memo
const approveVendorCreditMemo = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const memo = await VendorCreditMemo.findById(id);
    if (!memo) {
      return res.status(404).json({
        success: false,
        message: 'Credit memo not found'
      });
    }

    if (!memo.canApprove()) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve credit memo with status: ${memo.status}`
      });
    }

    memo.status = 'approved';
    memo.approvedBy = req.user?._id;
    memo.approvedAt = new Date();
    memo.approvalNotes = approvalNotes;

    await memo.save();

    res.status(200).json({
      success: true,
      message: 'Credit memo approved successfully',
      data: memo
    });
  } catch (err) {
    console.error('Error approving credit memo:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to approve credit memo',
      error: err.message
    });
  }
};

// ✅ Apply Credit Memo to Payment
const applyVendorCreditMemo = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentId, applyAmount } = req.body;

    const memo = await VendorCreditMemo.findById(id);
    if (!memo) {
      return res.status(404).json({
        success: false,
        message: 'Credit memo not found'
      });
    }

    if (!memo.canApply()) {
      return res.status(400).json({
        success: false,
        message: memo.status !== 'approved' 
          ? 'Credit memo must be approved before applying'
          : 'Credit memo has no remaining amount to apply'
      });
    }

    if (applyAmount > memo.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Apply amount ($${applyAmount}) exceeds remaining amount ($${memo.remainingAmount})`
      });
    }

    memo.applyToPayment(paymentId, applyAmount);
    await memo.save();

    res.status(200).json({
      success: true,
      message: 'Credit memo applied successfully',
      data: memo
    });
  } catch (err) {
    console.error('Error applying credit memo:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to apply credit memo',
      error: err.message
    });
  }
};

// ✅ Void Credit Memo
const voidVendorCreditMemo = async (req, res) => {
  try {
    const { id } = req.params;
    const { voidReason } = req.body;

    if (!voidReason) {
      return res.status(400).json({
        success: false,
        message: 'Void reason is required'
      });
    }

    const memo = await VendorCreditMemo.findById(id);
    if (!memo) {
      return res.status(404).json({
        success: false,
        message: 'Credit memo not found'
      });
    }

    if (!memo.canVoid()) {
      return res.status(400).json({
        success: false,
        message: memo.appliedAmount > 0
          ? 'Cannot void credit memo that has been applied to payments'
          : `Cannot void credit memo with status: ${memo.status}`
      });
    }

    memo.status = 'voided';
    memo.voidedBy = req.user?._id;
    memo.voidedAt = new Date();
    memo.voidReason = voidReason;

    await memo.save();

    res.status(200).json({
      success: true,
      message: 'Credit memo voided successfully',
      data: memo
    });
  } catch (err) {
    console.error('Error voiding credit memo:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to void credit memo',
      error: err.message
    });
  }
};

// ✅ Get Vendor Credit Memo Summary
const getVendorCreditMemoSummary = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const summary = await VendorCreditMemo.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          appliedAmount: { $sum: '$appliedAmount' },
          remainingAmount: { $sum: '$remainingAmount' }
        }
      }
    ]);

    // Calculate totals by type
    const byType = await VendorCreditMemo.aggregate([
      { 
        $match: { 
          vendorId: new mongoose.Types.ObjectId(vendorId),
          status: { $nin: ['voided'] }
        } 
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          appliedAmount: { $sum: '$appliedAmount' },
          remainingAmount: { $sum: '$remainingAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Vendor credit memo summary fetched successfully',
      data: {
        byStatus: summary,
        byType
      }
    });
  } catch (err) {
    console.error('Error fetching vendor credit memo summary:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor credit memo summary',
      error: err.message
    });
  }
};

module.exports = {
  createVendorCreditMemo,
  getAllVendorCreditMemos,
  getVendorCreditMemoById,
  updateVendorCreditMemo,
  deleteVendorCreditMemo,
  submitForApproval,
  approveVendorCreditMemo,
  applyVendorCreditMemo,
  voidVendorCreditMemo,
  getVendorCreditMemoSummary
};
