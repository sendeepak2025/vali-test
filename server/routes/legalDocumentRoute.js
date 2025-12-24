const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
const {
  recordTermsAcceptance,
  getStoreLegalDocuments,
  addLegalDocument,
  updateLegalDocumentStatus,
  deleteLegalDocument,
  updateBusinessInfo,
  setCreditTerms,
  suspendCredit,
  generateLegalSummary,
  getDocumentChecklist,
} = require("../controllers/legalDocumentCtrl");

// Record terms acceptance (called during registration)
router.post("/terms-acceptance/:storeId", recordTermsAcceptance);

// Get all legal documents for a store (admin only)
router.get("/store/:storeId", auth, getStoreLegalDocuments);

// Get document checklist status
router.get("/store/:storeId/checklist", auth, getDocumentChecklist);

// Add a legal document to store
router.post("/store/:storeId/document", auth, addLegalDocument);

// Update document status (verify, reject, etc.)
router.put("/store/:storeId/document/:documentId/status", auth, isAdmin, updateLegalDocumentStatus);

// Delete a legal document
router.delete("/store/:storeId/document/:documentId", auth, isAdmin, deleteLegalDocument);

// Update business information
router.put("/store/:storeId/business-info", auth, updateBusinessInfo);

// Set credit terms (admin only)
router.put("/store/:storeId/credit-terms", auth, isAdmin, setCreditTerms);

// Suspend credit (admin only)
router.post("/store/:storeId/suspend-credit", auth, isAdmin, suspendCredit);

// Generate legal summary report (admin only - for legal proceedings)
router.get("/store/:storeId/legal-summary", auth, isAdmin, generateLegalSummary);

module.exports = router;
