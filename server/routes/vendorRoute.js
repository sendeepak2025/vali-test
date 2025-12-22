const express = require('express');
const {
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
} = require('../controllers/vendorCtrl');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Basic CRUD
router.post('/create', createVendor);
router.get('/getAll', getAllVendors);
router.get('/get/:id', auth, getVendorById);
router.put('/update/:id', auth, updateVendor);
router.delete('/delete/:id', auth, deleteVendor);

// Payment Terms
router.put('/:id/payment-terms', auth, updatePaymentTerms);

// Vendor Status
router.put('/:id/status', auth, updateVendorStatus);

// Performance
router.get('/:id/performance', auth, getVendorPerformance);
router.put('/:id/performance-thresholds', auth, updatePerformanceThresholds);

// Credits
router.get('/:id/unapplied-credits', auth, getVendorUnappliedCredits);

module.exports = router;
