const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} = require("../controllers/expenseCtrl");

// Create expense
router.post("/create", auth, createExpense);

// Get all expenses with filters
router.get("/getAll", auth, getAllExpenses);

// Get expense summary/stats
router.get("/summary", auth, getExpenseSummary);

// Get single expense
router.get("/get/:id", auth, getExpenseById);

// Update expense
router.put("/update/:id", auth, updateExpense);

// Delete expense (soft delete)
router.delete("/delete/:id", auth, deleteExpense);

module.exports = router;
