const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  createWorkOrderCtrl,
  getWorkOrderCtrl,
  getWorkOrderByWeekCtrl,
  getAllWorkOrdersCtrl,
  updatePickingStatusCtrl,
  resolveShortageCtrl,
  getShortagesSummaryCtrl,
} = require("../controllers/workOrderCtrl");

// Create work order (called after PreOrder confirm)
router.post("/create", auth, createWorkOrderCtrl);

// Get all work orders with pagination (must be before /:id)
router.get("/list/all", auth, getAllWorkOrdersCtrl);

// Get shortages summary for dashboard (must be before /:id)
router.get("/shortages/summary", auth, getShortagesSummaryCtrl);

// Get work order for a specific week (root route)
router.get("/", auth, getWorkOrderByWeekCtrl);

// Get work order by ID (must be after specific routes)
router.get("/:id", auth, getWorkOrderCtrl);

// Update picking status for a store item
router.post("/:id/picking", auth, updatePickingStatusCtrl);

// Resolve product shortage
router.post("/:id/resolve-shortage", auth, resolveShortageCtrl);

module.exports = router;
