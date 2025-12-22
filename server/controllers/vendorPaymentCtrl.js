const VendorPayment = require('../models/vendorPaymentModel');
const Invoice = require('../models/invoiceModel');
const Vendor = require('../models/vendorModel');
const VendorCreditMemo = require('../models/vendorCreditMemoModel');
const mongoose = require('mongoose');

// Helper function to calculate early payment discount
const calculateEarlyPaymentDiscount = (vendor, invoices, paymentDate) => {
  if (!vendor.paymentTerms?.earlyPaymentDiscount) {
    return { discountAmount: 0, qualifyingInvoices: [], percentage: 0 };
  }

  const { percentage, withinDays } = vendor.paymentTerms.earlyPaymentDiscount;
  const qualifyingInvoices = [];
  let totalDiscountableAmount = 0;

  invoices.forEach(invoice => {
    const invoiceDate = new Date(invoice.invoiceDate);
    const payDate = new Date(paymentDate);
    const daysSinceInvoice = Math.floor((payDate - invoiceDate) / (1000 * 60 * 60 * 24));

    if (daysSinceInvoice <= withinDays) {
      qualifyingInvoices.push(invoice._id);
      totalDiscountableAmount += invoice.remainingAmount;
    }
  });

  const discountAmount = (totalDiscountableAmount * percentage) / 100;

  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    qualifyingInvoices,
    percentage,
    originalAmount: totalDiscountableAmount
  };
};

// ✅ Create Vendor Payment
const createVendorPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      vendorId,
      invoicePayments,
      method,
      checkNumber,
      transactionId,
      bankReference,
      paymentDate,
      appliedCredits,
      applyEarlyPaymentDiscount,
      notes
    } = req.body;

    // Validate vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Validate and fetch invoices
    if (!invoicePayments || invoicePayments.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'At least one invoice payment is required'
      });
    }

    const invoiceIds = invoicePayments.map(ip => ip.invoiceId);
    const invoices = await Invoice.find({
      _id: { $in: invoiceIds },
      vendorId: vendorId
    }).session(session);

    if (invoices.length !== invoiceIds.length) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'One or more invoices not found or do not belong to this vendor'
      });
    }

    // Validate payment amounts don't exceed remaining
    let grossAmount = 0;
    const processedInvoicePayments = [];

    for (const ip of invoicePayments) {
      const invoice = invoices.find(inv => inv._id.toString() === ip.invoiceId);
      
      if (ip.amountPaid > invoice.remainingAmount) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Payment amount ($${ip.amountPaid}) exceeds remaining balance ($${invoice.remainingAmount}) for invoice ${invoice.invoiceNumber}`
        });
      }

      grossAmount += ip.amountPaid;
      processedInvoicePayments.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceAmount: invoice.totalAmount,
        amountPaid: ip.amountPaid,
        remainingAfterPayment: invoice.remainingAmount - ip.amountPaid
      });
    }

    // Calculate early payment discount if requested
    let earlyPaymentDiscountTaken = 0;
    let earlyPaymentDiscountDetails = null;

    if (applyEarlyPaymentDiscount) {
      const discountCalc = calculateEarlyPaymentDiscount(vendor, invoices, paymentDate);
      earlyPaymentDiscountTaken = discountCalc.discountAmount;
      earlyPaymentDiscountDetails = discountCalc;
    }

    // Process applied credits
    let totalCreditsApplied = 0;
    const processedCredits = [];

    if (appliedCredits && appliedCredits.length > 0) {
      for (const credit of appliedCredits) {
        const creditMemo = await VendorCreditMemo.findById(credit.creditMemoId).session(session);
        
        if (!creditMemo) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Credit memo ${credit.creditMemoId} not found`
          });
        }

        if (!creditMemo.canApply()) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Credit memo ${creditMemo.memoNumber} cannot be applied (status: ${creditMemo.status}, remaining: $${creditMemo.remainingAmount})`
          });
        }

        if (credit.amount > creditMemo.remainingAmount) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Credit amount ($${credit.amount}) exceeds remaining credit ($${creditMemo.remainingAmount}) for memo ${creditMemo.memoNumber}`
          });
        }

        totalCreditsApplied += credit.amount;
        processedCredits.push({
          creditMemoId: creditMemo._id,
          memoNumber: creditMemo.memoNumber,
          amount: credit.amount
        });
      }
    }

    // Calculate net amount
    const netAmount = grossAmount - totalCreditsApplied - earlyPaymentDiscountTaken;

    if (netAmount < 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Net payment amount cannot be negative'
      });
    }

    // Generate payment number
    const paymentNumber = await VendorPayment.generatePaymentNumber();

    // Create payment
    const payment = new VendorPayment({
      paymentNumber,
      vendorId,
      invoicePayments: processedInvoicePayments,
      grossAmount,
      appliedCredits: processedCredits,
      totalCreditsApplied,
      earlyPaymentDiscountTaken,
      earlyPaymentDiscountDetails,
      netAmount,
      method,
      checkNumber: method === 'check' ? checkNumber : undefined,
      checkClearanceStatus: method === 'check' ? 'pending' : undefined,
      transactionId,
      bankReference,
      paymentDate: new Date(paymentDate),
      notes,
      createdBy: req.user?._id
    });

    await payment.save({ session });

    // Update invoices
    for (const ip of processedInvoicePayments) {
      const invoice = invoices.find(inv => inv._id.toString() === ip.invoiceId.toString());
      invoice.paidAmount += ip.amountPaid;
      invoice.remainingAmount = invoice.totalAmount - invoice.paidAmount;
      invoice.paymentIds.push(payment._id);
      
      if (invoice.remainingAmount <= 0) {
        invoice.status = 'paid';
      } else if (invoice.status !== 'paid') {
        invoice.status = 'approved'; // Keep as approved if partially paid
      }
      
      await invoice.save({ session });
    }

    // Update credit memos
    for (const credit of processedCredits) {
      const creditMemo = await VendorCreditMemo.findById(credit.creditMemoId).session(session);
      creditMemo.applyToPayment(payment._id, credit.amount);
      await creditMemo.save({ session });
    }

    await session.commitTransaction();

    // Populate for response
    const populatedPayment = await VendorPayment.findById(payment._id)
      .populate('vendorId', 'name')
      .populate('invoicePayments.invoiceId', 'invoiceNumber totalAmount');

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: populatedPayment
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error creating vendor payment:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: err.message
    });
  } finally {
    session.endSession();
  }
};

// ✅ Get All Vendor Payments
const getAllVendorPayments = async (req, res) => {
  try {
    const {
      vendorId,
      method,
      checkClearanceStatus,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sortBy = 'paymentDate',
      sortOrder = 'desc'
    } = req.query;

    const matchStage = {};

    if (vendorId) {
      matchStage.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    if (method && method !== 'all') {
      matchStage.method = method;
    }

    if (checkClearanceStatus && checkClearanceStatus !== 'all') {
      matchStage.checkClearanceStatus = checkClearanceStatus;
    }

    if (startDate || endDate) {
      matchStage.paymentDate = {};
      if (startDate) {
        matchStage.paymentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.paymentDate.$lte = new Date(endDate + 'T23:59:59.999Z');
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
              { paymentNumber: { $regex: search, $options: 'i' } },
              { checkNumber: { $regex: search, $options: 'i' } },
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
                totalPayments: { $sum: 1 },
                totalGrossAmount: { $sum: '$grossAmount' },
                totalCreditsApplied: { $sum: '$totalCreditsApplied' },
                totalDiscounts: { $sum: '$earlyPaymentDiscountTaken' },
                totalNetAmount: { $sum: '$netAmount' }
              }
            }
          ],
          methodCounts: [
            {
              $group: {
                _id: '$method',
                count: { $sum: 1 },
                total: { $sum: '$netAmount' }
              }
            }
          ]
        }
      }
    ];

    const result = await VendorPayment.aggregate(pipeline);

    const payments = result[0].data;
    const totalPayments = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalPayments / parseInt(limit));
    const summary = result[0].summary[0] || {
      totalPayments: 0,
      totalGrossAmount: 0,
      totalCreditsApplied: 0,
      totalDiscounts: 0,
      totalNetAmount: 0
    };

    const methodCounts = {};
    result[0].methodCounts.forEach(m => {
      methodCounts[m._id] = { count: m.count, total: m.total };
    });

    res.status(200).json({
      success: true,
      message: payments.length ? 'Payments fetched successfully' : 'No payments found',
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPayments,
          limit: parseInt(limit)
        },
        summary,
        methodCounts
      }
    });
  } catch (err) {
    console.error('Error fetching vendor payments:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: err.message
    });
  }
};

// ✅ Get Single Payment
const getVendorPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await VendorPayment.findById(id)
      .populate('vendorId', 'name email phone paymentTerms')
      .populate('invoicePayments.invoiceId', 'invoiceNumber totalAmount invoiceDate dueDate')
      .populate('appliedCredits.creditMemoId', 'memoNumber amount type')
      .populate('createdBy', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment fetched successfully',
      data: payment
    });
  } catch (err) {
    console.error('Error fetching payment:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
      error: err.message
    });
  }
};

// ✅ Update Check Clearance Status
const updateCheckStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const payment = await VendorPayment.findById(id).session(session);
    
    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.method !== 'check') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Can only update check status for check payments'
      });
    }

    if (!['pending', 'cleared', 'bounced'].includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid check status. Must be: pending, cleared, or bounced'
      });
    }

    if (status === 'bounced' && !reason) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Reason is required when marking check as bounced'
      });
    }

    payment.updateCheckStatus(status, reason);
    await payment.save({ session });

    // If check bounced, reverse the invoice payments
    if (status === 'bounced') {
      for (const ip of payment.invoicePayments) {
        const invoice = await Invoice.findById(ip.invoiceId).session(session);
        if (invoice) {
          invoice.paidAmount -= ip.amountPaid;
          invoice.remainingAmount = invoice.totalAmount - invoice.paidAmount;
          invoice.paymentIds = invoice.paymentIds.filter(
            pid => pid.toString() !== payment._id.toString()
          );
          
          if (invoice.remainingAmount > 0 && invoice.status === 'paid') {
            invoice.status = 'approved';
          }
          
          await invoice.save({ session });
        }
      }

      // Reverse credit memo applications
      for (const credit of payment.appliedCredits) {
        const creditMemo = await VendorCreditMemo.findById(credit.creditMemoId).session(session);
        if (creditMemo) {
          creditMemo.appliedAmount -= credit.amount;
          creditMemo.remainingAmount = creditMemo.amount - creditMemo.appliedAmount;
          
          if (creditMemo.remainingAmount === creditMemo.amount) {
            creditMemo.status = 'approved';
          } else {
            creditMemo.status = 'partially_applied';
          }
          
          await creditMemo.save({ session });
        }
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Check status updated to ${status}`,
      data: payment
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error updating check status:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update check status',
      error: err.message
    });
  } finally {
    session.endSession();
  }
};

// ✅ Void Payment
const voidVendorPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { voidReason } = req.body;

    if (!voidReason) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Void reason is required'
      });
    }

    const payment = await VendorPayment.findById(id).session(session);
    
    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (!payment.canVoid()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'This payment cannot be voided (check may have already cleared)'
      });
    }

    // Reverse invoice payments
    for (const ip of payment.invoicePayments) {
      const invoice = await Invoice.findById(ip.invoiceId).session(session);
      if (invoice) {
        invoice.paidAmount -= ip.amountPaid;
        invoice.remainingAmount = invoice.totalAmount - invoice.paidAmount;
        invoice.paymentIds = invoice.paymentIds.filter(
          pid => pid.toString() !== payment._id.toString()
        );
        
        if (invoice.remainingAmount > 0 && invoice.status === 'paid') {
          invoice.status = 'approved';
        }
        
        await invoice.save({ session });
      }
    }

    // Reverse credit memo applications
    for (const credit of payment.appliedCredits) {
      const creditMemo = await VendorCreditMemo.findById(credit.creditMemoId).session(session);
      if (creditMemo) {
        creditMemo.appliedAmount -= credit.amount;
        creditMemo.remainingAmount = creditMemo.amount - creditMemo.appliedAmount;
        
        if (creditMemo.remainingAmount === creditMemo.amount) {
          creditMemo.status = 'approved';
        } else {
          creditMemo.status = 'partially_applied';
        }
        
        await creditMemo.save({ session });
      }
    }

    // Update payment status
    payment.status = 'voided';
    payment.voidedBy = req.user?._id;
    payment.voidedAt = new Date();
    payment.voidReason = voidReason;
    
    await payment.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Payment voided successfully',
      data: payment
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error voiding payment:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to void payment',
      error: err.message
    });
  } finally {
    session.endSession();
  }
};

// ✅ Get Vendor Payment Summary
const getVendorPaymentSummary = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const summary = await VendorPayment.aggregate([
      { 
        $match: { 
          vendorId: new mongoose.Types.ObjectId(vendorId),
          status: { $ne: 'voided' }
        } 
      },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalGrossAmount: { $sum: '$grossAmount' },
          totalCreditsApplied: { $sum: '$totalCreditsApplied' },
          totalDiscounts: { $sum: '$earlyPaymentDiscountTaken' },
          totalNetAmount: { $sum: '$netAmount' }
        }
      }
    ]);

    // Get pending checks
    const pendingChecks = await VendorPayment.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          method: 'check',
          checkClearanceStatus: 'pending',
          status: { $ne: 'voided' }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$netAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Vendor payment summary fetched successfully',
      data: {
        totals: summary[0] || {
          totalPayments: 0,
          totalGrossAmount: 0,
          totalCreditsApplied: 0,
          totalDiscounts: 0,
          totalNetAmount: 0
        },
        pendingChecks: pendingChecks[0] || { count: 0, totalAmount: 0 }
      }
    });
  } catch (err) {
    console.error('Error fetching vendor payment summary:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor payment summary',
      error: err.message
    });
  }
};

// ✅ Calculate Early Payment Discount Preview
const calculateDiscountPreview = async (req, res) => {
  try {
    const { vendorId, invoiceIds, paymentDate } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const invoices = await Invoice.find({
      _id: { $in: invoiceIds },
      vendorId: vendorId
    });

    const discountCalc = calculateEarlyPaymentDiscount(vendor, invoices, paymentDate);

    res.status(200).json({
      success: true,
      message: 'Discount preview calculated',
      data: {
        hasDiscount: vendor.paymentTerms?.earlyPaymentDiscount ? true : false,
        discountTerms: vendor.paymentTerms?.earlyPaymentDiscount,
        ...discountCalc
      }
    });
  } catch (err) {
    console.error('Error calculating discount preview:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate discount preview',
      error: err.message
    });
  }
};

module.exports = {
  createVendorPayment,
  getAllVendorPayments,
  getVendorPaymentById,
  updateCheckStatus,
  voidVendorPayment,
  getVendorPaymentSummary,
  calculateDiscountPreview
};
