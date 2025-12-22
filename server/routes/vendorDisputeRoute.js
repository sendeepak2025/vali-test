const express = require('express');
const {
  createDispute,
  getAllDisputes,
  getDisputeById,
  updateDisputeStatus,
  addCommunication,
  resolveDispute,
  escalateDispute,
  getVendorDisputeSummary
} = require('../controllers/vendorDisputeCtrl');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Basic CRUD
router.post('/create', auth, createDispute);
router.get('/getAll', auth, getAllDisputes);
router.get('/get/:id', auth, getDisputeById);

// Dispute actions
router.put('/:id/status', auth, updateDisputeStatus);
router.post('/:id/communication', auth, addCommunication);
router.put('/:id/resolve', auth, resolveDispute);
router.put('/:id/escalate', auth, escalateDispute);

// Vendor-specific
router.get('/vendor/:vendorId/summary', auth, getVendorDisputeSummary);

module.exports = router;
