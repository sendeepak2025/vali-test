const express = require('express');
const {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  approveInvoice,
  disputeInvoice,
  getVendorInvoiceSummary,
  matchInvoice,
  getMatchingComparison
} = require('../controllers/invoiceCtrl');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Basic CRUD
router.post('/create', auth, createInvoice);
router.get('/getAll', auth, getAllInvoices);
router.get('/get/:id', auth, getInvoiceById);
router.put('/update/:id', auth, updateInvoice);
router.delete('/delete/:id', auth, deleteInvoice);

// Invoice actions
router.put('/:id/approve', auth, approveInvoice);
router.put('/:id/dispute', auth, disputeInvoice);

// Three-way matching
router.put('/:id/match', auth, matchInvoice);
router.get('/:id/matching-comparison', auth, getMatchingComparison);

// Vendor-specific
router.get('/vendor/:vendorId/summary', auth, getVendorInvoiceSummary);

module.exports = router;
