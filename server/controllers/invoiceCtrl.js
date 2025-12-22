const Invoice = require('../models/invoiceModel');
const Vendor = require('../models/vendorModel');
const PurchaseOrder = require('../models/purchaseModel');
const mongoose = require('mongoose');
const { performThreeWayMatching, getMatchingStatusText } = require('../utils/threeWayMatching');

// ✅ Create Invoice
const createInvoice = async (req, res) => {
  try {
    const {
      vendorId,
      linkedPurchaseOrders,
      invoiceDate,
      dueDate,
      lineItems,
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount,
      totalAmount,
      documentUrl,
      documentName,
      vendorInvoiceNumber,
      notes
    } = req.body;

    // Validate vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Validate linked POs if provided
    if (linkedPurchaseOrders && linkedPurchaseOrders.length > 0) {
      const poCount = await PurchaseOrder.countDocuments({
        _id: { $in: linkedPurchaseOrders },
        vendorId: vendorId
      });
      
      if (poCount !== linkedPurchaseOrders.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more purchase orders not found or do not belong to this vendor'
        });
      }
    }

    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber();

    // Calculate due date based on vendor payment terms if not provided
    let calculatedDueDate = dueDate;
    if (!calculatedDueDate && vendor.paymentTerms) {
      const dueDays = vendor.getPaymentDueDays();
      calculatedDueDate = new Date(invoiceDate);
      calculatedDueDate.setDate(calculatedDueDate.getDate() + dueDays);
    }

    const invoice = new Invoice({
      invoiceNumber,
      vendorId,
      linkedPurchaseOrders: linkedPurchaseOrders || [],
      invoiceDate: new Date(invoiceDate),
      dueDate: calculatedDueDate ? new Date(calculatedDueDate) : new Date(invoiceDate),
      lineItems: lineItems || [],
      subtotal: subtotal || totalAmount,
      taxAmount: taxAmount || 0,
      shippingAmount: shippingAmount || 0,
      discountAmount: discountAmount || 0,
      totalAmount,
      remainingAmount: totalAmount,
      documentUrl,
      documentName,
      vendorInvoiceNumber,
      notes,
      createdBy: req.user?._id
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: err.message
    });
  }
};

// ✅ Get All Invoices with filters
const getAllInvoices = async (req, res) => {
  try {
    const {
      vendorId,
      status,
      startDate,
      endDate,
      search,
      isOverdue,
      isOnHold,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const matchStage = {};

    // Filter by vendor
    if (vendorId) {
      matchStage.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    // Filter by status
    if (status && status !== 'all') {
      matchStage.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      matchStage.invoiceDate = {};
      if (startDate) {
        matchStage.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.invoiceDate.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    // Filter overdue invoices
    if (isOverdue === 'true') {
      matchStage.dueDate = { $lt: new Date() };
      matchStage.status = { $nin: ['paid', 'cancelled'] };
    }

    // Filter on-hold invoices
    if (isOnHold === 'true') {
      matchStage.isOnHold = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Build aggregation pipeline
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
              { invoiceNumber: { $regex: search, $options: 'i' } },
              { vendorInvoiceNumber: { $regex: search, $options: 'i' } },
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
                totalInvoices: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' },
                totalPaid: { $sum: '$paidAmount' },
                totalPending: { $sum: '$remainingAmount' }
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

    const result = await Invoice.aggregate(pipeline);

    const invoices = result[0].data;
    const totalInvoices = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalInvoices / parseInt(limit));
    const summary = result[0].summary[0] || {
      totalInvoices: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0
    };

    // Convert status counts to object
    const statusCounts = {};
    result[0].statusCounts.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    res.status(200).json({
      success: true,
      message: invoices.length ? 'Invoices fetched successfully' : 'No invoices found',
      data: {
        invoices,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalInvoices,
          limit: parseInt(limit)
        },
        summary,
        statusCounts
      }
    });
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: err.message
    });
  }
};

// ✅ Get Single Invoice
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate('vendorId', 'name email phone paymentTerms')
      .populate('linkedPurchaseOrders', 'purchaseOrderNumber totalAmount status items')
      .populate('approvedBy', 'name email')
      .populate('paymentIds');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Add computed fields
    const invoiceData = invoice.toObject();
    invoiceData.isOverdue = invoice.isOverdue();
    invoiceData.daysUntilDue = invoice.getDaysUntilDue();

    res.status(200).json({
      success: true,
      message: 'Invoice fetched successfully',
      data: invoiceData
    });
  } catch (err) {
    console.error('Error fetching invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: err.message
    });
  }
};

// ✅ Update Invoice
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow updating certain fields directly
    delete updateData.invoiceNumber;
    delete updateData.paidAmount;
    delete updateData.paymentIds;
    delete updateData.matchingResults;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Don't allow updates to paid or cancelled invoices
    if (['paid', 'cancelled'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update invoice with status: ${invoice.status}`
      });
    }

    updateData.updatedBy = req.user?._id;

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('vendorId', 'name email');

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice
    });
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice',
      error: err.message
    });
  }
};

// ✅ Delete Invoice
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Don't allow deleting invoices with payments
    if (invoice.paidAmount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete invoice with recorded payments'
      });
    }

    await Invoice.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete invoice',
      error: err.message
    });
  }
};

// ✅ Approve Invoice
const approveInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already paid'
      });
    }

    if (invoice.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve cancelled invoice'
      });
    }

    invoice.status = 'approved';
    invoice.approvedBy = req.user?._id;
    invoice.approvedAt = new Date();
    invoice.approvalNotes = approvalNotes;
    invoice.isOnHold = false;
    invoice.holdReason = null;

    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Invoice approved successfully',
      data: invoice
    });
  } catch (err) {
    console.error('Error approving invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to approve invoice',
      error: err.message
    });
  }
};

// ✅ Dispute Invoice
const disputeInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { disputeReason, putOnHold } = req.body;

    if (!disputeReason) {
      return res.status(400).json({
        success: false,
        message: 'Dispute reason is required'
      });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (['paid', 'cancelled'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot dispute invoice with status: ${invoice.status}`
      });
    }

    invoice.status = 'disputed';
    invoice.disputeReason = disputeReason;
    invoice.disputedAt = new Date();
    invoice.disputedBy = req.user?._id;
    
    if (putOnHold) {
      invoice.isOnHold = true;
      invoice.holdReason = disputeReason;
    }

    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Invoice marked as disputed',
      data: invoice
    });
  } catch (err) {
    console.error('Error disputing invoice:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to dispute invoice',
      error: err.message
    });
  }
};

// ✅ Get Invoice Summary by Vendor
const getVendorInvoiceSummary = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const summary = await Invoice.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          remainingAmount: { $sum: '$remainingAmount' }
        }
      }
    ]);

    // Calculate overdue
    const overdueResult = await Invoice.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          dueDate: { $lt: new Date() },
          status: { $nin: ['paid', 'cancelled'] }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$remainingAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Vendor invoice summary fetched successfully',
      data: {
        byStatus: summary,
        overdue: overdueResult[0] || { count: 0, totalAmount: 0 }
      }
    });
  } catch (err) {
    console.error('Error fetching vendor invoice summary:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor invoice summary',
      error: err.message
    });
  }
};

// ✅ Perform Three-Way Matching
const matchInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      priceTolerance = 2, 
      quantityTolerance = 0,
      approvalThreshold = 5 
    } = req.body;

    const invoice = await Invoice.findById(id)
      .populate('linkedPurchaseOrders');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (!invoice.linkedPurchaseOrders || invoice.linkedPurchaseOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice has no linked purchase orders to match against'
      });
    }

    if (['paid', 'cancelled'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot perform matching on invoice with status: ${invoice.status}`
      });
    }

    // Perform three-way matching
    const { matchingResults, approvalRequired, isFullMatch } = await performThreeWayMatching(
      invoice,
      invoice.linkedPurchaseOrders,
      { priceTolerance, quantityTolerance, approvalThreshold }
    );

    // Add user who performed matching
    matchingResults.matchedBy = req.user?._id;

    // Update invoice with matching results
    invoice.matchingResults = matchingResults;
    invoice.approvalRequired = approvalRequired;
    invoice.approvalThresholdExceeded = approvalRequired;

    // Update status based on matching results
    if (isFullMatch && !approvalRequired) {
      invoice.status = 'matched';
    } else if (invoice.status === 'pending') {
      // Keep as pending if there are discrepancies
      invoice.status = 'pending';
    }

    await invoice.save();

    res.status(200).json({
      success: true,
      message: isFullMatch ? 'Invoice matched successfully' : 'Matching completed with discrepancies',
      data: {
        invoice,
        matchingResults,
        isFullMatch,
        approvalRequired,
        statusText: getMatchingStatusText(matchingResults)
      }
    });
  } catch (err) {
    console.error('Error performing invoice matching:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to perform invoice matching',
      error: err.message
    });
  }
};

// ✅ Get Matching Comparison View
const getMatchingComparison = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate('vendorId', 'name')
      .populate({
        path: 'linkedPurchaseOrders',
        populate: {
          path: 'items.productId',
          select: 'name unit'
        }
      });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Build comparison data
    const comparison = {
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        vendorInvoiceNumber: invoice.vendorInvoiceNumber,
        totalAmount: invoice.totalAmount,
        lineItems: invoice.lineItems
      },
      purchaseOrders: invoice.linkedPurchaseOrders.map(po => ({
        purchaseOrderNumber: po.purchaseOrderNumber,
        totalAmount: po.totalAmount,
        status: po.status,
        items: po.items.map(item => ({
          productId: item.productId?._id || item.productId,
          productName: item.productId?.name || item.productName,
          orderedQuantity: item.quantity,
          receivedQuantity: item.qualityStatus === 'approved' ? item.quantity : 0,
          qualityStatus: item.qualityStatus,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          unit: item.productId?.unit || item.unit
        }))
      })),
      matchingResults: invoice.matchingResults,
      approvalRequired: invoice.approvalRequired
    };

    // Calculate totals for comparison
    let totalPOAmount = 0;
    let totalReceivedAmount = 0;
    
    comparison.purchaseOrders.forEach(po => {
      totalPOAmount += po.totalAmount;
      po.items.forEach(item => {
        if (item.qualityStatus === 'approved') {
          totalReceivedAmount += item.totalPrice;
        }
      });
    });

    comparison.totals = {
      poTotal: totalPOAmount,
      receivedTotal: totalReceivedAmount,
      invoiceTotal: invoice.totalAmount,
      variance: invoice.totalAmount - totalPOAmount,
      variancePercentage: totalPOAmount > 0 
        ? ((invoice.totalAmount - totalPOAmount) / totalPOAmount) * 100 
        : 0
    };

    res.status(200).json({
      success: true,
      message: 'Matching comparison fetched successfully',
      data: comparison
    });
  } catch (err) {
    console.error('Error fetching matching comparison:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matching comparison',
      error: err.message
    });
  }
};

module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  approveInvoice,
  disputeInvoice,
  getVendorInvoiceSummary,
  matchInvoice,
  getMatchingComparison
};
