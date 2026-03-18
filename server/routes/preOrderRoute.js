const express = require("express");
const router = express.Router();
const { auth, } = require("../middleware/auth");
const { createPreOrderCtrl, getAllPreOrdersCtrl, getSinglePreOrderCtrl, updatePreOrderCtrl, confirmOrderCtrl, softDeletePreOrderCtrl, restorePreOrderCtrl } = require("../controllers/preOrderCtrl");

router.post("/create", createPreOrderCtrl)
router.get("/getAll", auth, getAllPreOrdersCtrl)
router.get("/get/:id",  getSinglePreOrderCtrl)
router.put("/update/:id",  updatePreOrderCtrl)
router.post("/confirm-order/:id",  confirmOrderCtrl)
router.put("/soft-delete/:id", auth, softDeletePreOrderCtrl)
router.put("/restore/:id", auth, restorePreOrderCtrl)




module.exports = router
