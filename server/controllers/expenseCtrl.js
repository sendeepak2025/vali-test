const Expense = require("../models/expenseModel");
const Vendor = require("../models/vendorModel");
const mongoose = require("mongoose");

/**
 * Create a new expense
 */
const createExpense = async (req, res) => {
  try {
    const {
      description,
      amount,
      category,
      date,
      paymentMethod,
      vendorId,
      vendor,
      linkedPurchaseOrderId,
      reference,
      notes,
      receipt,
    } = req.body;

    // Validation
    if (!description || !amount || !category || !date || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Description, amount, category, date, and payment method are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    // If vendorId provided, get vendor name
    let vendorName = vendor;
    if (vendorId) {
      const vendorDoc = await Vendor.findById(vendorId);
      if (vendorDoc) {
        vendorName = vendorDoc.name;
      }
    }

    const expenseNumber = await Expense.generateExpenseNumber();

    const expense = new Expense({
      expenseNumber,
      description,
      amount,
      category,
      date: new Date(date),
      paymentMethod,
      vendorId: vendorId || undefined,
      vendor: vendorName,
      linkedPurchaseOrderId: linkedPurchaseOrderId || undefined,
      reference,
      notes,
      receipt,
      status: "approved", // Auto-approve
      createdBy: req.user?.id || req.user?._id,
      createdByName: req.user?.name || req.user?.storeName || req.user?.email,
      approvedBy: req.user?.id || req.user?._id,
      approvedAt: new Date(),
    });

    await expense.save();

    // Populate vendor and purchase order for response
    await expense.populate([
      { path: "vendorId", select: "name email phone" },
      { path: "linkedPurchaseOrderId", select: "purchaseOrderNumber totalAmount paymentStatus" }
    ]);

    res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: expense,
    });
  } catch (err) {
    console.error("Error creating expense:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get all expenses with filters
 */
const getAllExpenses = async (req, res) => {
  try {
    const {
      category,
      paymentMethod,
      status,
      vendorId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    const query = { isDeleted: false };

    // Filters
    if (category && category !== "all") {
      query.category = category;
    }
    if (paymentMethod && paymentMethod !== "all") {
      query.paymentMethod = paymentMethod;
    }
    if (status && status !== "all") {
      query.status = status;
    }
    if (vendorId) {
      query.vendorId = vendorId;
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { vendor: { $regex: search, $options: "i" } },
        { reference: { $regex: search, $options: "i" } },
        { expenseNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate("createdBy", "name email storeName")
        .populate("vendorId", "name email phone")
        .populate("linkedPurchaseOrderId", "purchaseOrderNumber totalAmount paymentStatus")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: expenses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get expense by ID
 */
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findOne({ _id: id, isDeleted: false })
      .populate("createdBy", "name email storeName")
      .populate("approvedBy", "name email storeName");

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    res.status(200).json({ success: true, data: expense });
  } catch (err) {
    console.error("Error fetching expense:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update expense
 */
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      description,
      amount,
      category,
      date,
      paymentMethod,
      vendor,
      reference,
      notes,
      receipt,
    } = req.body;

    const expense = await Expense.findOne({ _id: id, isDeleted: false });
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    // Update fields
    if (description) expense.description = description;
    if (amount) expense.amount = amount;
    if (category) expense.category = category;
    if (date) expense.date = new Date(date);
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (vendor !== undefined) expense.vendor = vendor;
    if (reference !== undefined) expense.reference = reference;
    if (notes !== undefined) expense.notes = notes;
    if (receipt) expense.receipt = receipt;

    await expense.save();

    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (err) {
    console.error("Error updating expense:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Delete expense (soft delete)
 */
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findOne({ _id: id, isDeleted: false });
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    expense.isDeleted = true;
    expense.deletedAt = new Date();
    expense.deletedBy = req.user?.id || req.user?._id;

    await expense.save();

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get expense summary/statistics
 */
const getExpenseSummary = async (req, res) => {
  try {
    const { startDate, endDate, period } = req.query;

    const matchQuery = { isDeleted: false, status: "approved" };

    // Date filter
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }

    // Get current month expenses
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get last month expenses
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalStats,
      categoryBreakdown,
      monthlyTrend,
      currentMonthTotal,
      lastMonthTotal,
      paymentMethodBreakdown,
    ] = await Promise.all([
      // Total stats
      Expense.aggregate([
        { $match: { isDeleted: false, status: "approved" } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            totalCount: { $sum: 1 },
            avgAmount: { $avg: "$amount" },
          },
        },
      ]),

      // Category breakdown
      Expense.aggregate([
        { $match: { isDeleted: false, status: "approved" } },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // Monthly trend (last 6 months)
      Expense.aggregate([
        { $match: { isDeleted: false, status: "approved" } },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
            },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 6 },
      ]),

      // Current month total
      Expense.aggregate([
        {
          $match: {
            isDeleted: false,
            status: "approved",
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Last month total
      Expense.aggregate([
        {
          $match: {
            isDeleted: false,
            status: "approved",
            date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Payment method breakdown
      Expense.aggregate([
        { $match: { isDeleted: false, status: "approved" } },
        {
          $group: {
            _id: "$paymentMethod",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    const currentMonth = currentMonthTotal[0]?.total || 0;
    const lastMonth = lastMonthTotal[0]?.total || 0;
    const monthOverMonthChange = lastMonth > 0 
      ? ((currentMonth - lastMonth) / lastMonth * 100).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totals: {
          totalAmount: totalStats[0]?.totalAmount || 0,
          totalCount: totalStats[0]?.totalCount || 0,
          avgAmount: totalStats[0]?.avgAmount || 0,
        },
        currentMonth: {
          total: currentMonth,
          count: currentMonthTotal[0]?.count || 0,
        },
        lastMonth: {
          total: lastMonth,
          count: lastMonthTotal[0]?.count || 0,
        },
        monthOverMonthChange: parseFloat(monthOverMonthChange),
        categoryBreakdown,
        monthlyTrend: monthlyTrend.reverse(),
        paymentMethodBreakdown,
      },
    });
  } catch (err) {
    console.error("Error fetching expense summary:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
