const express = require("express");
const router = express.Router();


const { priceListSend, priceListSendMulti, sendByPriceCategory, sendCreditMemoEmail, sendWorkOrderEmail, sendContactFormEmail } = require("../controllers/emails");



router.post("/price-list", priceListSend)
router.post("/price-list-multi", priceListSendMulti)
router.post("/send-by-price-category", sendByPriceCategory)
router.post("/send-credit-memo", sendCreditMemoEmail)
router.post("/send-work-order", sendWorkOrderEmail)
router.post("/contact", sendContactFormEmail)



module.exports = router
