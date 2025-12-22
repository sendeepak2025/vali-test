const express = require("express");
const router = express.Router();
const {
  getStoreInventory,
  getInventorySummaryByStore,
  getInventoryByRegion,
  transferInventory,
  adjustStoreInventory,
  getStoresWithInventory,
  initializeStoreInventory,
} = require("../controllers/storeInventoryCtrl");

// Get inventory for a specific store
router.get("/store/:storeId", getStoreInventory);

// Get inventory summary grouped by store
router.get("/summary/by-store", getInventorySummaryByStore);

// Get inventory grouped by region/state
router.get("/summary/by-region", getInventoryByRegion);

// Get all stores with their inventory stats
router.get("/stores", getStoresWithInventory);

// Transfer inventory between stores
router.post("/transfer", transferInventory);

// Adjust store inventory (add/remove)
router.post("/adjust", adjustStoreInventory);

// Initialize inventory for a store
router.post("/initialize/:storeId", initializeStoreInventory);

module.exports = router;
