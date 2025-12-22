const express = require("express");
const router = express.Router();

const {
  createDriverCtrl,
  editDriverCtrl,
  getAllDriver
} = require("../controllers/driverAndTruckCtrl");


router.post("/create", createDriverCtrl);

router.put("/update/:id", editDriverCtrl);

router.get("/getAll", getAllDriver);

module.exports = router;
