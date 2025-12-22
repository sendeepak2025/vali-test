const express = require("express");
const router = express.Router();


const { priceListSend, priceListSendMulti, sendByPriceCategory } = require("../controllers/emails");



router.post("/price-list", priceListSend)
router.post("/price-list-multi", priceListSendMulti)
router.post("/send-by-price-category", sendByPriceCategory)



module.exports = router
