const express = require('express');
const {
  getAgingReport,
  getVendorStatement,
  getVendorPerformanceScorecard,
  getVendorComparison,
  getDashboardSummary
} = require('../controllers/vendorReportsCtrl');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Dashboard
router.get('/dashboard', auth, getDashboardSummary);

// Aging Report
router.get('/aging', auth, getAgingReport);

// Vendor Statement
router.get('/vendor/:id/statement', auth, getVendorStatement);

// Vendor Performance Scorecard
router.get('/vendor/:id/performance', auth, getVendorPerformanceScorecard);

// Vendor Comparison
router.get('/vendor-comparison', auth, getVendorComparison);

module.exports = router;
