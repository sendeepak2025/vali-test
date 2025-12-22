const express = require("express");
const router = express.Router();
const { auth, } = require("../middleware/auth");
const { createPreOrderCtrl, getAllPreOrdersCtrl, getSinglePreOrderCtrl, updatePreOrderCtrl, confirmOrderCtrl } = require("../controllers/preOrderCtrl");

router.post("/create", createPreOrderCtrl)
router.get("/getAll",  getAllPreOrdersCtrl)
router.get("/get/:id",  getSinglePreOrderCtrl)
router.put("/update/:id",  updatePreOrderCtrl)
router.post("/confirm-order/:id",  confirmOrderCtrl)




module.exports = router
