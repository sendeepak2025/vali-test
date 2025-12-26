const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  createAdjustment,
  getAllAdjustments,
  getAdjustmentById,
  getStoreAdjustments,
  approveAdjustment,
  rejectAdjustment,
  voidAdjustment,
  getAdjustmentSummary,
} = require("../controllers/adjustmentCtrl");

// Create adjustment
router.post("/create", auth, createAdjustment);

// Get all adjustments with filters
router.get("/getAll", auth, getAllAdjustments);

// Get adjustment summary/stats
router.get("/summary", auth, getAdjustmentSummary);

// Get adjustments for a specific store
router.get("/store/:storeId", auth, getStoreAdjustments);

// Get single adjustment
router.get("/get/:id", auth, getAdjustmentById);

// Approve adjustment
router.put("/:id/approve", auth, approveAdjustment);

// Reject adjustment
router.put("/:id/reject", auth, rejectAdjustment);

// Void adjustment
router.put("/:id/void", auth, voidAdjustment);

module.exports = router;
