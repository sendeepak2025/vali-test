const express = require("express");
const creditMemoCtrl = require("../controllers/creditMemosCtrl");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.post("/create", creditMemoCtrl.createCreditMemo);
router.get("/", creditMemoCtrl.getCreditMemos);
router.get("/:id", creditMemoCtrl.getCreditMemoById);
router.put("/:id", creditMemoCtrl.updateCreditMemo);
router.delete("/:id", creditMemoCtrl.deleteCreditMemo);
router.get("/by-order/:orderId", creditMemoCtrl.getCreditMemosByOrderId);
router.put("/update/:creditMemoId", creditMemoCtrl.updateCreditMemo);

// New routes for credit processing
router.put("/process/:id", auth, creditMemoCtrl.processCreditMemo);
router.post("/apply-credit", auth, creditMemoCtrl.applyStoreCredit);
router.get("/store-credit/:storeId", auth, creditMemoCtrl.getStoreCreditInfo);

module.exports = router;
