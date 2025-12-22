const express = require('express');
const {
  createVendorPayment,
  getAllVendorPayments,
  getVendorPaymentById,
  updateCheckStatus,
  voidVendorPayment,
  getVendorPaymentSummary,
  calculateDiscountPreview
} = require('../controllers/vendorPaymentCtrl');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Basic CRUD
router.post('/create', auth, createVendorPayment);
router.get('/getAll', auth, getAllVendorPayments);
router.get('/get/:id', auth, getVendorPaymentById);

// Payment actions
router.put('/:id/check-status', auth, updateCheckStatus);
router.put('/:id/void', auth, voidVendorPayment);

// Vendor-specific
router.get('/vendor/:vendorId/summary', auth, getVendorPaymentSummary);

// Utilities
router.post('/calculate-discount', auth, calculateDiscountPreview);

module.exports = router;
