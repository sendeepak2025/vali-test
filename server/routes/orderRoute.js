const express = require("express");
const router = express.Router();
const { auth, } = require("../middleware/auth");
const { 
    createOrderCtrl, 
    getAllOrderCtrl, 
    getOrderForStoreCtrl, 
    updateOrderCtrl, 
    updatePalletInfo, 
    userDetailsWithOrder, 
    updatePaymentDetails, 
    deleteOrderCtrl,     
    updateOrderTypeCtrl, 
    getUserOrderStatement, 
    updateShippingController, 
    getDashboardData,
    getEnhancedDashboardData,
    getPendingOrders,
    invoiceMailCtrl,
    markOrderAsUnpaid,
    deleteOrderHardCtrl,
    updateBuyerQuantityCtrl,
    assignProductToStore,
    getUserLatestOrdersCtrl,
    getOrderMatrixDataCtrl,
    updateOrderMatrixItemCtrl,
    updatePreOrderMatrixItemCtrl

} = require("../controllers/orderCtrl");

router.post("/create", createOrderCtrl)
router.get("/getAll", auth,  getAllOrderCtrl)
router.get("/get/:id", auth, getOrderForStoreCtrl)
router.delete("/delete/:id", auth, deleteOrderCtrl)
router.delete("/hard-delete/:id", auth, deleteOrderHardCtrl)
router.put("/update/:id", auth, updateOrderCtrl)
router.put("/update-plate/:orderId", auth, updatePalletInfo)
router.get("/user/:userId",  userDetailsWithOrder)
router.put("/payment-update/:orderId",  updatePaymentDetails)
router.put("/unpaid/:orderId",  markOrderAsUnpaid)
router.put("/update-otype/:orderId",  updateOrderTypeCtrl)
router.get("/statement/:userId",  getUserOrderStatement)

router.post("/update-shipping", updateShippingController);
router.get("/dashboard", getDashboardData);
router.get("/dashboard-enhanced", getEnhancedDashboardData);
router.get("/pending", getPendingOrders);
router.post("/invoiceMail/:id", invoiceMailCtrl);


router.patch("/update-quantity", updateBuyerQuantityCtrl);
router.post("/assign-product", assignProductToStore);
router.get("/latest/:storeId", getUserLatestOrdersCtrl);

// Order Matrix APIs
router.get("/matrix", auth, getOrderMatrixDataCtrl);
router.post("/matrix/update", auth, updateOrderMatrixItemCtrl);
router.post("/matrix/preorder", auth, updatePreOrderMatrixItemCtrl);



module.exports = router
