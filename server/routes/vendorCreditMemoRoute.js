const express = require('express');
const {
  createVendorCreditMemo,
  getAllVendorCreditMemos,
  getVendorCreditMemoById,
  updateVendorCreditMemo,
  deleteVendorCreditMemo,
  submitForApproval,
  approveVendorCreditMemo,
  applyVendorCreditMemo,
  voidVendorCreditMemo,
  getVendorCreditMemoSummary
} = require('../controllers/vendorCreditMemoCtrl');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Basic CRUD
router.post('/create', auth, createVendorCreditMemo);
router.get('/getAll', auth, getAllVendorCreditMemos);
router.get('/get/:id', auth, getVendorCreditMemoById);
router.put('/update/:id', auth, updateVendorCreditMemo);
router.delete('/delete/:id', auth, deleteVendorCreditMemo);

// Workflow actions
router.put('/:id/submit', auth, submitForApproval);
router.put('/:id/approve', auth, approveVendorCreditMemo);
router.put('/:id/apply', auth, applyVendorCreditMemo);
router.put('/:id/void', auth, voidVendorCreditMemo);

// Vendor-specific
router.get('/vendor/:vendorId/summary', auth, getVendorCreditMemoSummary);

module.exports = router;
