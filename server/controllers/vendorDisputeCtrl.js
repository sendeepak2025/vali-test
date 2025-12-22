const VendorDispute = require('../models/vendorDisputeModel');
const Vendor = require('../models/vendorModel');
const Invoice = require('../models/invoiceModel');
const PurchaseOrder = require('../models/purchaseModel');
const VendorCreditMemo = require('../models/vendorCreditMemoModel');
const mongoose = require('mongoose');

// ✅ Create Dispute
const createDispute = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      vendorId,
      linkedPurchaseOrderId,
      linkedInvoiceId,
      type,
      priority,
      description,
      disputedAmount,
      putInvoicesOnHold,
      affectedInvoiceIds,
      dueDate,
      documentUrls,
      assignedTo
    } = req.body;

    // Validate vendor
    const vendor = await Vendor.findById(vendorId).session(session);
    if (!vendor) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Validate linked PO if provided
    if (linkedPurchaseOrderId) {
      const po = await PurchaseOrder.findById(linkedPurchaseOrderId).session(session);
      if (!po || po.vendorId.toString() !== vendorId) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Purchase order not found or does not belong to this vendor'
        });
      }
    }

    // Validate linked invoice if provided
    if (linkedInvoiceId) {
      const invoice = await Invoice.findById(linkedInvoiceId).session(session);
      if (!invoice || invoice.vendorId.toString() !== vendorId) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Invoice not found or does not belong to this vendor'
        });
      }
    }

    // Generate dispute number
    const disputeNumber = await VendorDispute.generateDisputeNumber();

    // Create dispute
    const dispute = new VendorDispute({
      disputeNumber,
      vendorId,
      linkedPurchaseOrderId,
      linkedInvoiceId,
      type,
      priority: priority || 'medium',
      description,
      disputedAmount: disputedAmount || 0,
      putInvoicesOnHold: putInvoicesOnHold || false,
      affectedInvoiceIds: affectedInvoiceIds || [],
      dueDate: dueDate ? new Date(dueDate) : undefined,
      documentUrls: documentUrls || [],
      assignedTo,
      createdBy: req.user?._id
    });

    // Add initial communication
    dispute.addCommunication(
      `Dispute created: ${description}`,
      req.user?.name || 'System',
      req.user?._id,
      [],
      true
    );

    await dispute.save({ session });

    // Put invoices on hold if requested
    if (putInvoicesOnHold) {
      const invoicesToHold = affectedInvoiceIds?.length > 0 
        ? affectedInvoiceIds 
        : (linkedInvoiceId ? [linkedInvoiceId] : []);

      for (const invoiceId of invoicesToHold) {
        await Invoice.findByIdAndUpdate(
          invoiceId,
          { 
            isOnHold: true, 
            holdReason: `Dispute ${disputeNumber}: ${description}`,
            disputeId: dispute._id
          },
          { session }
        );
      }
    }

    await session.commitTransaction();

    // Populate for response
    const populatedDispute = await VendorDispute.findById(dispute._id)
      .populate('vendorId', 'name')
      .populate('linkedPurchaseOrderId', 'purchaseOrderNumber')
      .populate('linkedInvoiceId', 'invoiceNumber');

    res.status(201).json({
      success: true,
      message: 'Dispute created successfully',
      data: populatedDispute
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error creating dispute:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create dispute',
      error: err.message
    });
  } finally {
    session.endSession();
  }
};

// ✅ Get All Disputes
const getAllDisputes = async (req, res) => {
  try {
    const {
      vendorId,
      type,
      status,
      priority,
      startDate,
      endDate,
      isOverdue,
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

    if (priority && priority !== 'all') {
      matchStage.priority = priority;
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

    if (isOverdue === 'true') {
      matchStage.dueDate = { $lt: new Date() };
      matchStage.status = { $nin: ['resolved', 'closed'] };
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
              { disputeNumber: { $regex: search, $options: 'i' } },
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
                totalDisputes: { $sum: 1 },
                totalDisputedAmount: { $sum: '$disputedAmount' },
                openCount: { 
                  $sum: { $cond: [{ $in: ['$status', ['open', 'in_progress', 'pending_vendor']] }, 1, 0] }
                },
                resolvedCount: {
                  $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] }
                }
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
          ],
          typeCounts: [
            {
              $group: {
                _id: '$type',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ];

    const result = await VendorDispute.aggregate(pipeline);

    const disputes = result[0].data;
    const totalDisputes = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalDisputes / parseInt(limit));
    const summary = result[0].summary[0] || {
      totalDisputes: 0,
      totalDisputedAmount: 0,
      openCount: 0,
      resolvedCount: 0
    };

    const statusCounts = {};
    result[0].statusCounts.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    const typeCounts = {};
    result[0].typeCounts.forEach(t => {
      typeCounts[t._id] = t.count;
    });

    res.status(200).json({
      success: true,
      message: disputes.length ? 'Disputes fetched successfully' : 'No disputes found',
      data: {
        disputes,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalDisputes,
          limit: parseInt(limit)
        },
        summary,
        statusCounts,
        typeCounts
      }
    });
  } catch (err) {
    console.error('Error fetching disputes:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch disputes',
      error: err.message
    });
  }
};

// ✅ Get Single Dispute
const getDisputeById = async (req, res) => {
  try {
    const { id } = req.params;

    const dispute = await VendorDispute.findById(id)
      .populate('vendorId', 'name email phone')
      .populate('linkedPurchaseOrderId', 'purchaseOrderNumber totalAmount status')
      .populate('linkedInvoiceId', 'invoiceNumber totalAmount status')
      .populate('affectedInvoiceIds', 'invoiceNumber totalAmount status')
      .populate('resolution.creditMemoId', 'memoNumber amount')
      .populate('assignedTo', 'name email')
      .populate('escalatedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    // Add computed fields
    const disputeData = dispute.toObject();
    disputeData.isOverdue = dispute.isOverdue();
    disputeData.daysOpen = dispute.daysOpen;

    res.status(200).json({
      success: true,
      message: 'Dispute fetched successfully',
      data: disputeData
    });
  } catch (err) {
    console.error('Error fetching dispute:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dispute',
      error: err.message
    });
  }
};

// ✅ Update Dispute Status
const updateDisputeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const dispute = await VendorDispute.findById(id);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    if (!dispute.canEdit()) {
      return res.status(400).json({
        success: false,
        message: `Cannot update dispute with status: ${dispute.status}`
      });
    }

    const validStatuses = ['open', 'in_progress', 'pending_vendor', 'escalated', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const oldStatus = dispute.status;
    dispute.status = status;

    // Add communication about status change
    dispute.addCommunication(
      `Status changed from ${oldStatus} to ${status}${notes ? `: ${notes}` : ''}`,
      req.user?.name || 'System',
      req.user?._id,
      [],
      true
    );

    await dispute.save();

    res.status(200).json({
      success: true,
      message: `Dispute status updated to ${status}`,
      data: dispute
    });
  } catch (err) {
    console.error('Error updating dispute status:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update dispute status',
      error: err.message
    });
  }
};

// ✅ Add Communication
const addCommunication = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments, isInternal } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const dispute = await VendorDispute.findById(id);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    dispute.addCommunication(
      message,
      req.user?.name || 'Unknown',
      req.user?._id,
      attachments || [],
      isInternal || false
    );

    await dispute.save();

    res.status(200).json({
      success: true,
      message: 'Communication added successfully',
      data: dispute
    });
  } catch (err) {
    console.error('Error adding communication:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to add communication',
      error: err.message
    });
  }
};

// ✅ Resolve Dispute
const resolveDispute = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { 
      notes, 
      resolutionType, 
      creditMemoId, 
      creditMemoAmount,
      releaseInvoiceHolds 
    } = req.body;

    if (!notes || !resolutionType) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Resolution notes and type are required'
      });
    }

    const dispute = await VendorDispute.findById(id).session(session);
    if (!dispute) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    if (!dispute.canResolve()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot resolve dispute with status: ${dispute.status}`
      });
    }

    // Validate credit memo if provided
    if (creditMemoId) {
      const creditMemo = await VendorCreditMemo.findById(creditMemoId).session(session);
      if (!creditMemo) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Credit memo not found'
        });
      }
    }

    // Set resolution
    dispute.resolution = {
      notes,
      resolutionType,
      creditMemoId,
      creditMemoAmount,
      resolvedAt: new Date(),
      resolvedBy: req.user?._id
    };
    dispute.status = 'resolved';

    // Add resolution communication
    dispute.addCommunication(
      `Dispute resolved: ${notes} (Type: ${resolutionType})`,
      req.user?.name || 'System',
      req.user?._id,
      [],
      true
    );

    await dispute.save({ session });

    // Release invoice holds if requested
    if (releaseInvoiceHolds !== false) {
      const invoicesToRelease = dispute.affectedInvoiceIds?.length > 0 
        ? dispute.affectedInvoiceIds 
        : (dispute.linkedInvoiceId ? [dispute.linkedInvoiceId] : []);

      for (const invoiceId of invoicesToRelease) {
        await Invoice.findByIdAndUpdate(
          invoiceId,
          { 
            isOnHold: false, 
            holdReason: null,
            $unset: { disputeId: 1 }
          },
          { session }
        );
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Dispute resolved successfully',
      data: dispute
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error resolving dispute:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve dispute',
      error: err.message
    });
  } finally {
    session.endSession();
  }
};

// ✅ Escalate Dispute
const escalateDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { escalatedTo, escalationReason } = req.body;

    if (!escalationReason) {
      return res.status(400).json({
        success: false,
        message: 'Escalation reason is required'
      });
    }

    const dispute = await VendorDispute.findById(id);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    if (!dispute.canEscalate()) {
      return res.status(400).json({
        success: false,
        message: `Cannot escalate dispute with status: ${dispute.status}`
      });
    }

    dispute.status = 'escalated';
    dispute.escalatedTo = escalatedTo;
    dispute.escalatedAt = new Date();
    dispute.escalationReason = escalationReason;

    // Add escalation communication
    dispute.addCommunication(
      `Dispute escalated: ${escalationReason}`,
      req.user?.name || 'System',
      req.user?._id,
      [],
      true
    );

    await dispute.save();

    res.status(200).json({
      success: true,
      message: 'Dispute escalated successfully',
      data: dispute
    });
  } catch (err) {
    console.error('Error escalating dispute:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to escalate dispute',
      error: err.message
    });
  }
};

// ✅ Get Vendor Dispute Summary
const getVendorDisputeSummary = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const summary = await VendorDispute.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$disputedAmount' }
        }
      }
    ]);

    // Get by type
    const byType = await VendorDispute.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$disputedAmount' }
        }
      }
    ]);

    // Get overdue count
    const overdueCount = await VendorDispute.countDocuments({
      vendorId: new mongoose.Types.ObjectId(vendorId),
      dueDate: { $lt: new Date() },
      status: { $nin: ['resolved', 'closed'] }
    });

    res.status(200).json({
      success: true,
      message: 'Vendor dispute summary fetched successfully',
      data: {
        byStatus: summary,
        byType,
        overdueCount
      }
    });
  } catch (err) {
    console.error('Error fetching vendor dispute summary:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor dispute summary',
      error: err.message
    });
  }
};

module.exports = {
  createDispute,
  getAllDisputes,
  getDisputeById,
  updateDisputeStatus,
  addCommunication,
  resolveDispute,
  escalateDispute,
  getVendorDisputeSummary
};
