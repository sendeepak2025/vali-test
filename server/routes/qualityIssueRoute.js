const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  createQualityIssue,
  getStoreIssues,
  getAllIssues,
  addMessage,
  resolveIssue,
  updateStatus
} = require("../controllers/qualityIssueCtrl");

// Store routes
router.post("/", auth, createQualityIssue);
router.get("/store", auth, getStoreIssues);

// Admin routes
router.get("/admin", auth, getAllIssues);
router.post("/:id/message", auth, addMessage);
router.post("/:id/resolve", auth, resolveIssue);
router.patch("/:id/status", auth, updateStatus);

module.exports = router;
