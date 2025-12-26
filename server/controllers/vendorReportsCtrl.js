const Invoice = require('../models/invoiceModel');
const Vendor = require('../models/vendorModel');
const PurchaseOrder = require('../models/purchaseModel');
const VendorPayment = require('../models/vendorPaymentModel');
const VendorCreditMemo = require('../models/vendorCreditMemoModel');
const mongoose = require('mongoose');

// Helper function to calculate aging bucket
const getAgingBucket = (daysOverdue) => {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
};

// ✅ Get Aging Report
const getAgingReport = async (req, res) => {
  try {
    const {
      vendorId,
      minAmount,
      asOfDate,
      groupBy = 'vendor'
    } = req.query;

    const reportDate = asOfDate ? new Date(asOfDate) : new Date();

    // Build match stage
    const matchStage = {
      status: { $nin: ['paid', 'cancelled'] },
      remainingAmount: { $gt: 0 }
    };

    if (vendorId) {
      matchStage.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    if (minAmount) {
      matchStage.remainingAmount = { $gte: parseFloat(minAmount) };
    }

    const pipeline = [
      { $match: matchStage },
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
        $addFields: {
          daysOverdue: {
            $floor: {
              $divide: [
                { $subtract: [reportDate, '$dueDate'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      {
        $addFields: {
          agingBucket: {
            $switch: {
              branches: [
                { case: { $lte: ['$daysOverdue', 0] }, then: 'current' },
                { case: { $lte: ['$daysOverdue', 30] }, then: '1-30' },
                { case: { $lte: ['$daysOverdue', 60] }, then: '31-60' },
                { case: { $lte: ['$daysOverdue', 90] }, then: '61-90' }
              ],
              default: '90+'
            }
          }
        }
      },
      {
        $group: {
          _id: groupBy === 'vendor' ? '$vendorId' : '$agingBucket',
          vendorName: { $first: '$vendor.name' },
          vendorId: { $first: '$vendorId' },
          current: {
            $sum: { $cond: [{ $eq: ['$agingBucket', 'current'] }, '$remainingAmount', 0] }
          },
          days1to30: {
            $sum: { $cond: [{ $eq: ['$agingBucket', '1-30'] }, '$remainingAmount', 0] }
          },
          days31to60: {
            $sum: { $cond: [{ $eq: ['$agingBucket', '31-60'] }, '$remainingAmount', 0] }
          },
          days61to90: {
            $sum: { $cond: [{ $eq: ['$agingBucket', '61-90'] }, '$remainingAmount', 0] }
          },
          days90plus: {
            $sum: { $cond: [{ $eq: ['$agingBucket', '90+'] }, '$remainingAmount', 0] }
          },
          totalOutstanding: { $sum: '$remainingAmount' },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { totalOutstanding: -1 } }
    ];

    const agingData = await Invoice.aggregate(pipeline);

    // Calculate totals
    const totals = agingData.reduce((acc, row) => {
      acc.current += row.current;
      acc.days1to30 += row.days1to30;
      acc.days31to60 += row.days31to60;
      acc.days61to90 += row.days61to90;
      acc.days90plus += row.days90plus;
      acc.totalOutstanding += row.totalOutstanding;
      acc.invoiceCount += row.invoiceCount;
      return acc;
    }, {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      days90plus: 0,
      totalOutstanding: 0,
      invoiceCount: 0
    });

    res.status(200).json({
      success: true,
      message: 'Aging report generated successfully',
      data: {
        reportDate,
        groupBy,
        rows: agingData,
        totals,
        vendorCount: agingData.length
      }
    });
  } catch (err) {
    console.error('Error generating aging report:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate aging report',
      error: err.message
    });
  }
};

// ✅ Get Vendor Statement
const getVendorStatement = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // Get invoices
    const invoiceFilter = { vendorId: new mongoose.Types.ObjectId(id) };
    if (Object.keys(dateFilter).length > 0) {
      invoiceFilter.invoiceDate = dateFilter;
    }

    const invoices = await Invoice.find(invoiceFilter)
      .select('invoiceNumber invoiceDate dueDate totalAmount paidAmount remainingAmount status')
      .sort({ invoiceDate: 1 });

    // Get payments
    const paymentFilter = { 
      vendorId: new mongoose.Types.ObjectId(id),
      status: { $ne: 'voided' }
    };
    if (Object.keys(dateFilter).length > 0) {
      paymentFilter.paymentDate = dateFilter;
    }

    const payments = await VendorPayment.find(paymentFilter)
      .select('paymentNumber paymentDate netAmount method checkNumber checkClearanceStatus')
      .sort({ paymentDate: 1 });

    // Get credit memos
    const creditFilter = { 
      vendorId: new mongoose.Types.ObjectId(id),
      status: { $nin: ['voided', 'draft'] }
    };
    if (Object.keys(dateFilter).length > 0) {
      creditFilter.createdAt = dateFilter;
    }

    const creditMemos = await VendorCreditMemo.find(creditFilter)
      .select('memoNumber type amount appliedAmount remainingAmount status createdAt')
      .sort({ createdAt: 1 });

    // Build transaction list with running balance
    const transactions = [];
    let runningBalance = 0;

    // Combine and sort all transactions by date
    const allTransactions = [
      ...invoices.map(inv => ({
        type: 'invoice',
        date: inv.invoiceDate,
        reference: inv.invoiceNumber,
        description: `Invoice ${inv.invoiceNumber}`,
        debit: inv.totalAmount,
        credit: 0,
        status: inv.status,
        data: inv
      })),
      ...payments.map(pmt => ({
        type: 'payment',
        date: pmt.paymentDate,
        reference: pmt.paymentNumber,
        description: `Payment ${pmt.paymentNumber} (${pmt.method})`,
        debit: 0,
        credit: pmt.netAmount,
        status: pmt.checkClearanceStatus || 'completed',
        data: pmt
      })),
      ...creditMemos.map(cm => ({
        type: cm.type === 'credit' ? 'credit_memo' : 'debit_memo',
        date: cm.createdAt,
        reference: cm.memoNumber,
        description: `${cm.type === 'credit' ? 'Credit' : 'Debit'} Memo ${cm.memoNumber}`,
        debit: cm.type === 'debit' ? cm.amount : 0,
        credit: cm.type === 'credit' ? cm.amount : 0,
        status: cm.status,
        data: cm
      }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    for (const txn of allTransactions) {
      runningBalance += txn.debit - txn.credit;
      transactions.push({
        ...txn,
        balance: Math.round(runningBalance * 100) / 100
      });
    }

    // Calculate summary
    const summary = {
      totalInvoiced: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalPaid: payments.reduce((sum, pmt) => sum + pmt.netAmount, 0),
      totalCredits: creditMemos
        .filter(cm => cm.type === 'credit')
        .reduce((sum, cm) => sum + cm.amount, 0),
      totalDebits: creditMemos
        .filter(cm => cm.type === 'debit')
        .reduce((sum, cm) => sum + cm.amount, 0),
      currentBalance: runningBalance,
      invoiceCount: invoices.length,
      paymentCount: payments.length,
      creditMemoCount: creditMemos.length
    };

    res.status(200).json({
      success: true,
      message: 'Vendor statement generated successfully',
      data: {
        vendor: {
          _id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          paymentTerms: vendor.paymentTerms
        },
        dateRange: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present'
        },
        transactions,
        summary
      }
    });
  } catch (err) {
    console.error('Error generating vendor statement:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate vendor statement',
      error: err.message
    });
  }
};

// ✅ Get Vendor Performance Scorecard
const getVendorPerformanceScorecard = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // Get POs for delivery and fill rate calculation
    const poFilter = { vendorId: new mongoose.Types.ObjectId(id) };
    if (Object.keys(dateFilter).length > 0) {
      poFilter.purchaseDate = dateFilter;
    }

    const purchaseOrders = await PurchaseOrder.find(poFilter);

    // Calculate on-time delivery rate
    let totalDeliveries = 0;
    let onTimeDeliveries = 0;
    let totalOrdered = 0;
    let totalReceived = 0;
    let totalApproved = 0;
    let totalRejected = 0;

    for (const po of purchaseOrders) {
      if (po.status === 'fully_received' || po.status === 'partially_received' || po.status === 'closed') {
        totalDeliveries++;
        
        // Check if delivered on time
        if (po.actualDeliveryDate && po.expectedDeliveryDate) {
          if (new Date(po.actualDeliveryDate) <= new Date(po.expectedDeliveryDate)) {
            onTimeDeliveries++;
          }
        } else if (po.expectedDeliveryDate) {
          // If no actual delivery date but PO is received, assume on time
          onTimeDeliveries++;
        }
      }

      // Calculate quantities from items
      if (po.items) {
        for (const item of po.items) {
          totalOrdered += item.quantity || 0;
          totalReceived += item.receivedQuantity || 0;
          totalApproved += item.approvedQuantity || 0;
          totalRejected += item.rejectedQuantity || 0;
        }
      }
    }

    // Calculate rates
    const onTimeDeliveryRate = totalDeliveries > 0 
      ? Math.round((onTimeDeliveries / totalDeliveries) * 100 * 100) / 100 
      : 0;

    const qualityAcceptanceRate = totalReceived > 0 
      ? Math.round((totalApproved / totalReceived) * 100 * 100) / 100 
      : 0;

    const fillRate = totalOrdered > 0 
      ? Math.round((totalReceived / totalOrdered) * 100 * 100) / 100 
      : 0;

    // Get payment history for average payment days
    const payments = await VendorPayment.find({
      vendorId: new mongoose.Types.ObjectId(id),
      status: { $ne: 'voided' }
    }).populate('invoicePayments.invoiceId', 'invoiceDate');

    let totalPaymentDays = 0;
    let paymentCount = 0;

    for (const payment of payments) {
      for (const ip of payment.invoicePayments || []) {
        if (ip.invoiceId?.invoiceDate) {
          const daysToPay = Math.floor(
            (new Date(payment.paymentDate) - new Date(ip.invoiceId.invoiceDate)) / 
            (1000 * 60 * 60 * 24)
          );
          totalPaymentDays += daysToPay;
          paymentCount++;
        }
      }
    }

    const averagePaymentDays = paymentCount > 0 
      ? Math.round(totalPaymentDays / paymentCount) 
      : 0;

    // Get financial summary
    const invoiceSummary = await Invoice.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          outstandingBalance: { $sum: '$remainingAmount' }
        }
      }
    ]);

    const financials = invoiceSummary[0] || {
      totalPurchases: 0,
      totalPaid: 0,
      outstandingBalance: 0
    };

    // Check thresholds
    const thresholds = vendor.performanceThresholds || {
      minOnTimeDeliveryRate: 90,
      minQualityAcceptanceRate: 95,
      minFillRate: 95
    };

    const isBelowThreshold = 
      onTimeDeliveryRate < thresholds.minOnTimeDeliveryRate ||
      qualityAcceptanceRate < thresholds.minQualityAcceptanceRate ||
      fillRate < thresholds.minFillRate;

    res.status(200).json({
      success: true,
      message: 'Vendor performance scorecard generated successfully',
      data: {
        vendor: {
          _id: vendor._id,
          name: vendor.name,
          status: vendor.status
        },
        dateRange: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present'
        },
        metrics: {
          onTimeDeliveryRate,
          qualityAcceptanceRate,
          fillRate,
          averagePaymentDays
        },
        details: {
          totalDeliveries,
          onTimeDeliveries,
          totalOrdered,
          totalReceived,
          totalApproved,
          totalRejected,
          totalPOs: purchaseOrders.length
        },
        financials,
        thresholds,
        isBelowThreshold,
        thresholdViolations: {
          onTimeDelivery: onTimeDeliveryRate < thresholds.minOnTimeDeliveryRate,
          qualityAcceptance: qualityAcceptanceRate < thresholds.minQualityAcceptanceRate,
          fillRate: fillRate < thresholds.minFillRate
        }
      }
    });
  } catch (err) {
    console.error('Error generating vendor performance scorecard:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate vendor performance scorecard',
      error: err.message
    });
  }
};

// ✅ Get Vendor Comparison Report
const getVendorComparison = async (req, res) => {
  try {
    const { vendorIds, startDate, endDate } = req.query;

    let vendorFilter = {};
    if (vendorIds) {
      const ids = vendorIds.split(',').map(id => new mongoose.Types.ObjectId(id.trim()));
      vendorFilter._id = { $in: ids };
    }

    const vendors = await Vendor.find(vendorFilter).select('name status paymentTerms');

    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const comparisons = [];

    for (const vendor of vendors) {
      // Get PO stats
      const poFilter = { vendorId: vendor._id };
      if (Object.keys(dateFilter).length > 0) {
        poFilter.purchaseDate = dateFilter;
      }

      const poStats = await PurchaseOrder.aggregate([
        { $match: poFilter },
        {
          $group: {
            _id: null,
            totalPOs: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);

      // Get invoice stats
      const invoiceFilter = { vendorId: vendor._id };
      if (Object.keys(dateFilter).length > 0) {
        invoiceFilter.invoiceDate = dateFilter;
      }

      const invoiceStats = await Invoice.aggregate([
        { $match: invoiceFilter },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalInvoiced: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$paidAmount' },
            outstanding: { $sum: '$remainingAmount' }
          }
        }
      ]);

      // Get dispute count
      const disputeCount = await mongoose.model('VendorDispute').countDocuments({
        vendorId: vendor._id,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
      });

      comparisons.push({
        vendor: {
          _id: vendor._id,
          name: vendor.name,
          status: vendor.status,
          paymentTerms: vendor.paymentTerms?.type
        },
        poStats: poStats[0] || { totalPOs: 0, totalAmount: 0 },
        invoiceStats: invoiceStats[0] || { 
          totalInvoices: 0, 
          totalInvoiced: 0, 
          totalPaid: 0, 
          outstanding: 0 
        },
        disputeCount
      });
    }

    // Sort by total amount descending
    comparisons.sort((a, b) => b.poStats.totalAmount - a.poStats.totalAmount);

    res.status(200).json({
      success: true,
      message: 'Vendor comparison report generated successfully',
      data: {
        dateRange: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present'
        },
        vendors: comparisons,
        vendorCount: comparisons.length
      }
    });
  } catch (err) {
    console.error('Error generating vendor comparison:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate vendor comparison',
      error: err.message
    });
  }
};

// ✅ Get Dashboard Summary
const getDashboardSummary = async (req, res) => {
  try {
    // Get vendor counts by type and status
    const vendorCounts = await Vendor.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get vendor counts by type (farmer/supplier)
    const vendorTypeCounts = await Vendor.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalVendors = vendorCounts.reduce((sum, v) => sum + v.count, 0);
    const farmerCount = vendorTypeCounts.find(v => v._id === 'farmer')?.count || 0;
    const supplierCount = vendorTypeCounts.find(v => v._id === 'supplier')?.count || 0;

    // Get Purchase Order summary - this is the main data source for purchases
    const purchaseOrderSummary = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
          totalPaid: { 
            $sum: { 
              $cond: [
                { $eq: ['$paymentStatus', 'paid'] },
                { $ifNull: ['$totalAmount', 0] },
                { 
                  $cond: [
                    { $eq: ['$paymentStatus', 'partial'] },
                    { $toDouble: { $ifNull: ['$paymentAmount', 0] } },
                    0
                  ]
                }
              ]
            }
          }
        }
      }
    ]);

    // Calculate paid amount from paymentAmount field for all orders
    const paidAmountSummary = await PurchaseOrder.aggregate([
      {
        $addFields: {
          paidAmountNum: {
            $cond: [
              { $eq: [{ $type: '$paymentAmount' }, 'string'] },
              { $toDouble: { $ifNull: ['$paymentAmount', '0'] } },
              { $ifNull: ['$paymentAmount', 0] }
            ]
          },
          creditApplied: { $ifNull: ['$totalCreditApplied', 0] }
        }
      },
      {
        $group: {
          _id: null,
          totalPaidAmount: { $sum: '$paidAmountNum' },
          totalCreditApplied: { $sum: '$creditApplied' }
        }
      }
    ]);

    const poSummary = purchaseOrderSummary[0] || { totalOrders: 0, totalAmount: 0, totalPaid: 0 };
    const paidSummary = paidAmountSummary[0] || { totalPaidAmount: 0, totalCreditApplied: 0 };
    
    // Total paid = direct payments + credits applied
    const totalAmountPaid = paidSummary.totalPaidAmount + paidSummary.totalCreditApplied;
    const pendingPayment = poSummary.totalAmount - totalAmountPaid;

    // Get PO counts by status
    const poCounts = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } }
        }
      }
    ]);

    // Get PO counts by payment status
    const poPaymentCounts = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } }
        }
      }
    ]);

    // Get invoice summary (vendor bills)
    const invoiceSummary = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$remainingAmount' }
        }
      }
    ]);

    // Get overdue invoices
    const overdueInvoices = await Invoice.aggregate([
      {
        $match: {
          dueDate: { $lt: new Date() },
          status: { $nin: ['paid', 'cancelled'] },
          remainingAmount: { $gt: 0 }
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

    // Get open disputes
    let openDisputes = 0;
    try {
      openDisputes = await mongoose.model('VendorDispute').countDocuments({
        status: { $in: ['open', 'in_progress', 'pending_vendor', 'escalated'] }
      });
    } catch (e) {
      // Model might not exist
    }

    // Get pending checks
    const pendingChecks = await VendorPayment.aggregate([
      {
        $match: {
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

    // Get top vendors by outstanding balance (from purchase orders)
    const topVendorsByOutstanding = await PurchaseOrder.aggregate([
      {
        $match: {
          paymentStatus: { $nin: ['paid'] }
        }
      },
      {
        $addFields: {
          paidAmountNum: {
            $cond: [
              { $eq: [{ $type: '$paymentAmount' }, 'string'] },
              { $toDouble: { $ifNull: ['$paymentAmount', '0'] } },
              { $ifNull: ['$paymentAmount', 0] }
            ]
          },
          creditApplied: { $ifNull: ['$totalCreditApplied', 0] }
        }
      },
      {
        $addFields: {
          outstanding: { 
            $subtract: [
              { $ifNull: ['$totalAmount', 0] }, 
              { $add: ['$paidAmountNum', '$creditApplied'] }
            ] 
          }
        }
      },
      {
        $match: {
          outstanding: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$vendorId',
          outstanding: { $sum: '$outstanding' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { outstanding: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          vendorId: '$_id',
          vendorName: { $ifNull: ['$vendor.name', 'Unknown Vendor'] },
          outstanding: 1,
          orderCount: 1
        }
      }
    ]);

    // Get credit memo summary
    const creditMemoSummary = await VendorCreditMemo.aggregate([
      {
        $match: {
          status: { $in: ['approved', 'partially_applied'] }
        }
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          remainingAmount: { $sum: '$remainingAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const creditSummary = creditMemoSummary.find(c => c._id === 'credit') || { totalAmount: 0, remainingAmount: 0, count: 0 };
    const debitSummary = creditMemoSummary.find(c => c._id === 'debit') || { totalAmount: 0, remainingAmount: 0, count: 0 };

    res.status(200).json({
      success: true,
      message: 'Dashboard summary generated successfully',
      data: {
        vendors: {
          byStatus: vendorCounts.reduce((acc, v) => {
            acc[v._id] = v.count;
            return acc;
          }, {}),
          byType: {
            farmer: farmerCount,
            supplier: supplierCount
          },
          total: totalVendors
        },
        // Main purchase summary from PurchaseOrder model
        purchases: {
          totalOrders: poSummary.totalOrders,
          totalAmount: poSummary.totalAmount,
          totalPaid: totalAmountPaid,
          pendingPayment: pendingPayment > 0 ? pendingPayment : 0,
          paidPercentage: poSummary.totalAmount > 0 
            ? Math.round((totalAmountPaid / poSummary.totalAmount) * 100) 
            : 0
        },
        // Invoice/Bills summary (separate from purchases)
        invoices: invoiceSummary[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalOutstanding: 0
        },
        overdue: overdueInvoices[0] || { count: 0, totalAmount: 0 },
        purchaseOrders: {
          byStatus: poCounts.reduce((acc, po) => {
            acc[po._id] = { count: po.count, totalAmount: po.totalAmount };
            return acc;
          }, {}),
          byPaymentStatus: poPaymentCounts.reduce((acc, po) => {
            acc[po._id || 'pending'] = { count: po.count, totalAmount: po.totalAmount };
            return acc;
          }, {}),
          total: poCounts.reduce((sum, po) => sum + po.count, 0)
        },
        credits: {
          totalCredits: creditSummary.totalAmount,
          unappliedCredits: creditSummary.remainingAmount,
          creditCount: creditSummary.count,
          totalDebits: debitSummary.totalAmount,
          debitCount: debitSummary.count
        },
        openDisputes,
        pendingChecks: pendingChecks[0] || { count: 0, totalAmount: 0 },
        topVendorsByOutstanding
      }
    });
  } catch (err) {
    console.error('Error generating dashboard summary:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate dashboard summary',
      error: err.message
    });
  }
};

module.exports = {
  getAgingReport,
  getVendorStatement,
  getVendorPerformanceScorecard,
  getVendorComparison,
  getDashboardSummary
};
