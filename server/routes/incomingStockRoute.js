const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  getIncomingStockCtrl,
  addIncomingStockCtrl,
  linkIncomingStockCtrl,
  bulkLinkIncomingStockCtrl,
  getUnlinkedIncomingStockCtrl,
  receiveIncomingStockCtrl,
  deleteIncomingStockCtrl,
} = require("../controllers/incomingStockCtrl");

// Get incoming stock for matrix (by week)
router.get("/", auth, getIncomingStockCtrl);

// Get unlinked incoming stock (for confirm validation)
router.get("/unlinked", auth, getUnlinkedIncomingStockCtrl);

// Add/update incoming stock from matrix
router.post("/add", auth, addIncomingStockCtrl);

// Link single incoming stock to vendor
router.post("/:id/link", auth, linkIncomingStockCtrl);

// Bulk link multiple incoming stocks to vendor
router.post("/bulk-link", auth, bulkLinkIncomingStockCtrl);

// Mark incoming stock as received
router.post("/:id/receive", auth, receiveIncomingStockCtrl);

// Cancel/delete incoming stock
router.delete("/:id", auth, deleteIncomingStockCtrl);

module.exports = router;
