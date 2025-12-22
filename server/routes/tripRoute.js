const express = require("express");
const router = express.Router();

const {
  createTripCtrl,
  editTripCtrl,
  getAllTripsCtrl,
  getSingleTripCtrl,
} = require("../controllers/tripCtrl");

router.post("/create", createTripCtrl);

router.put("/update/:id", editTripCtrl);

router.get("/getAll", getAllTripsCtrl);
router.get("/get/:id", getSingleTripCtrl);

module.exports = router;
