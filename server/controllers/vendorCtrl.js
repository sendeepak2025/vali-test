const Vendor = require('../models/vendorModel');
const VendorCreditMemo = require('../models/vendorCreditMemoModel');
const mongoose = require('mongoose');

// ✅ Create Vendor
const createVendor = async (req, res) => {
  try {
    const {
      name,
      type,
      contactName,
      email,
      phone,
      address,
      notes,
      productsSupplied,
    } = req.body;

    const vendor = new Vendor({
      name,
      type,
      contactName,
      email,
      phone,
      address,
      notes,
      productsSupplied,
    });

    await vendor.save();

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: vendor,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to create vendor',
      error: err.message,
    });
  }
};

// ✅ Get All Vendors (with pagination)
const getAllVendors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Search filter
    const search = req.query.search || '';
    const type = req.query.type;
    const status = req.query.status;
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Get total count for pagination
    const total = await Vendor.countDocuments(query);
    
    // Get paginated vendors
    const vendors = await Vendor.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      message: 'Vendors fetched successfully',
      data: vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: err.message,
    });
  }
};

// ✅ Get Vendor by ID
const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Vendor fetched successfully',
      data: vendor,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor',
      error: err.message,
    });
  }
};

// ✅ Update Vendor
const updateVendor = async (req, res) => {
  try {
    const {
      name,
      type,
      contactName,
      email,
      phone,
      address,
      notes,
      productsSupplied,
    } = req.body;

    const updatedVendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      {
        name,
        type,
        contactName,
        email,
        phone,
        address,
        notes,
        productsSupplied,
      },
      { new: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully',
      data: updatedVendor,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor',
      error: err.message,
    });
  }
};

// ✅ Delete Vendor
const deleteVendor = async (req, res) => {
  try {
    const deletedVendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!deletedVendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor',
      error: err.message,
    });
  }
};

// ✅ Update Vendor Payment Terms
const updatePaymentTerms = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, customDays, earlyPaymentDiscount } = req.body;

    // Validate payment term type
    const validTypes = ['cod', 'net15', 'net30', 'net45', 'net60', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment term type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Validate custom days if type is custom
    if (type === 'custom' && (!customDays || customDays < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Custom payment terms require customDays to be at least 1',
      });
    }

    // Validate early payment discount if provided
    if (earlyPaymentDiscount) {
      if (earlyPaymentDiscount.percentage < 0 || earlyPaymentDiscount.percentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Early payment discount percentage must be between 0 and 100',
        });
      }
      if (earlyPaymentDiscount.withinDays < 1) {
        return res.status(400).json({
          success: false,
          message: 'Early payment discount withinDays must be at least 1',
        });
      }
    }

    const paymentTerms = {
      type,
      ...(type === 'custom' && { customDays }),
      ...(earlyPaymentDiscount && { earlyPaymentDiscount }),
    };

    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      { paymentTerms },
      { new: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment terms updated successfully',
      data: updatedVendor,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update payment terms',
      error: err.message,
    });
  }
};

// ✅ Update Vendor Status
const updateVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, statusReason } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'on_hold', 'blacklisted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Require reason for non-active statuses
    if (status !== 'active' && !statusReason) {
      return res.status(400).json({
        success: false,
        message: 'Status reason is required when setting vendor to non-active status',
      });
    }

    const updateData = {
      status,
      statusReason: status === 'active' ? null : statusReason,
      statusChangedAt: new Date(),
    };

    // Add user ID if available from auth middleware
    if (req.user?._id) {
      updateData.statusChangedBy = req.user._id;
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `Vendor status updated to ${status}`,
      data: updatedVendor,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor status',
      error: err.message,
    });
  }
};

// ✅ Get Vendor Performance Scorecard
const getVendorPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Return cached metrics and threshold status
    const performance = {
      vendorId: vendor._id,
      vendorName: vendor.name,
      metrics: vendor.performanceMetrics || {
        onTimeDeliveryRate: 0,
        qualityAcceptanceRate: 0,
        fillRate: 0,
        averagePaymentDays: 0,
        totalPurchases: 0,
        totalPaid: 0,
        outstandingBalance: 0,
      },
      thresholds: vendor.performanceThresholds,
      isBelowThreshold: vendor.isBelowThreshold,
      lastCalculatedAt: vendor.performanceMetrics?.lastCalculatedAt,
    };

    res.status(200).json({
      success: true,
      message: 'Vendor performance fetched successfully',
      data: performance,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor performance',
      error: err.message,
    });
  }
};

// ✅ Update Vendor Performance Thresholds
const updatePerformanceThresholds = async (req, res) => {
  try {
    const { id } = req.params;
    const { minOnTimeDeliveryRate, minQualityAcceptanceRate, minFillRate } = req.body;

    // Validate thresholds
    const validateThreshold = (value, name) => {
      if (value !== undefined && (value < 0 || value > 100)) {
        return `${name} must be between 0 and 100`;
      }
      return null;
    };

    const errors = [
      validateThreshold(minOnTimeDeliveryRate, 'minOnTimeDeliveryRate'),
      validateThreshold(minQualityAcceptanceRate, 'minQualityAcceptanceRate'),
      validateThreshold(minFillRate, 'minFillRate'),
    ].filter(Boolean);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(', '),
      });
    }

    const performanceThresholds = {
      ...(minOnTimeDeliveryRate !== undefined && { minOnTimeDeliveryRate }),
      ...(minQualityAcceptanceRate !== undefined && { minQualityAcceptanceRate }),
      ...(minFillRate !== undefined && { minFillRate }),
    };

    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      { performanceThresholds },
      { new: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Check if vendor is now below thresholds
    const isBelowThreshold = updatedVendor.checkPerformanceThresholds();
    if (isBelowThreshold !== updatedVendor.isBelowThreshold) {
      updatedVendor.isBelowThreshold = isBelowThreshold;
      await updatedVendor.save();
    }

    res.status(200).json({
      success: true,
      message: 'Performance thresholds updated successfully',
      data: updatedVendor,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update performance thresholds',
      error: err.message,
    });
  }
};

// ✅ Get Vendor Unapplied Credits
const getVendorUnappliedCredits = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Get all approved credit memos with remaining balance
    const unappliedCredits = await VendorCreditMemo.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(id),
          type: 'credit',
          status: { $in: ['approved', 'partially_applied'] },
          remainingAmount: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          totalUnapplied: { $sum: '$remainingAmount' },
          count: { $sum: 1 },
          memos: {
            $push: {
              _id: '$_id',
              memoNumber: '$memoNumber',
              amount: '$amount',
              appliedAmount: '$appliedAmount',
              remainingAmount: '$remainingAmount',
              reasonCategory: '$reasonCategory',
              description: '$description',
              createdAt: '$createdAt'
            }
          }
        }
      }
    ]);

    // Get unapplied debit memos too
    const unappliedDebits = await VendorCreditMemo.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(id),
          type: 'debit',
          status: { $in: ['approved', 'partially_applied'] },
          remainingAmount: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          totalUnapplied: { $sum: '$remainingAmount' },
          count: { $sum: 1 },
          memos: {
            $push: {
              _id: '$_id',
              memoNumber: '$memoNumber',
              amount: '$amount',
              appliedAmount: '$appliedAmount',
              remainingAmount: '$remainingAmount',
              reasonCategory: '$reasonCategory',
              description: '$description',
              createdAt: '$createdAt'
            }
          }
        }
      }
    ]);

    const credits = unappliedCredits[0] || { totalUnapplied: 0, count: 0, memos: [] };
    const debits = unappliedDebits[0] || { totalUnapplied: 0, count: 0, memos: [] };

    res.status(200).json({
      success: true,
      message: 'Unapplied credits fetched successfully',
      data: {
        vendorId: id,
        vendorName: vendor.name,
        credits: {
          totalUnapplied: credits.totalUnapplied,
          count: credits.count,
          memos: credits.memos
        },
        debits: {
          totalUnapplied: debits.totalUnapplied,
          count: debits.count,
          memos: debits.memos
        },
        netUnapplied: credits.totalUnapplied - debits.totalUnapplied
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unapplied credits',
      error: err.message,
    });
  }
};

module.exports = {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  updatePaymentTerms,
  updateVendorStatus,
  getVendorPerformance,
  updatePerformanceThresholds,
  getVendorUnappliedCredits,
};
