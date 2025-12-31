const express = require("express")
const { registerCtrl, loginCtrl, verifyLoginOtpCtrl, resendLoginOtpCtrl, sendStoreOrderOtpCtrl, verifyStoreOrderOtpCtrl, updatePermitionCtrl, addMemberCtrl, getAllMemberCtrl, updateStoreCtrl, getAllStoreCtrl, getUserByEmailCtrl, fetchMyProfile, changePasswordCtrl, deleteStoreIfNoOrders, addChequeToStoreCtrl, editChequeCtrl, getChequesByStoreCtrl, deleteChequeCtrl, updateChequeStatusCtrl, getAllChequesCtrl, getStoreAnalyticsCtrl, getAllStoresAnalyticsCtrl, getPaginatedPaymentStoresCtrl, getStoreOrdersPaginatedCtrl, addCommunicationLogCtrl, getCommunicationLogsCtrl, addPaymentRecordCtrl, getPaymentRecordsCtrl, getAllStorePaymentsCtrl, sendPaymentReminderCtrl, sendStatementEmailCtrl, getStatementDataCtrl, getPendingStoresCtrl, approveStoreCtrl, rejectStoreCtrl, adminCreateStoreCtrl, forgotPasswordCtrl, verifyResetTokenCtrl, resetPasswordCtrl } = require("../controllers/authCtrl")
const { auth, isAdmin } = require("../middleware/auth")
const router = express.Router()


router.post("/login", loginCtrl)
router.post("/verify-login-otp", verifyLoginOtpCtrl)
router.post("/resend-login-otp", resendLoginOtpCtrl)
router.post("/send-store-order-otp", sendStoreOrderOtpCtrl)
router.post("/verify-store-order-otp", verifyStoreOrderOtpCtrl)
router.post("/register", registerCtrl)

// Password reset routes
router.post("/forgot-password", forgotPasswordCtrl)
router.post("/verify-reset-token", verifyResetTokenCtrl)
router.post("/reset-password", resetPasswordCtrl)
router.post("/member", addMemberCtrl)
router.get("/all-members", getAllMemberCtrl)
router.get("/all-stores", getAllStoreCtrl)
router.post("/user", getUserByEmailCtrl)
router.put("/update/:id", updatePermitionCtrl)
router.put("/update-store/:id", updateStoreCtrl)
router.delete("/delete-store/:id", deleteStoreIfNoOrders)

router.put("/update-password",auth, changePasswordCtrl)
router.get("/fetchMyProfile",auth,fetchMyProfile )

// Cheque routes
router.post("/addcheques/:id", addChequeToStoreCtrl)
router.put("/editscheque/:id/:chequeId", editChequeCtrl)
router.get("/cheques/:id", getChequesByStoreCtrl)
router.delete("/cheques/:id/:chequeId", deleteChequeCtrl)
router.put("/cheques/:id/:chequeId/status", updateChequeStatusCtrl)
router.get("/all-cheques", getAllChequesCtrl)

// Store Analytics routes
router.get("/store-analytics/:id", getStoreAnalyticsCtrl)
router.get("/stores-analytics", getAllStoresAnalyticsCtrl)
router.get("/stores-payment-status", getPaginatedPaymentStoresCtrl)
router.get("/store/:id/orders-paginated", getStoreOrdersPaginatedCtrl)

// Store Communication & Payment routes
router.post("/store/:id/communication", addCommunicationLogCtrl)
router.get("/store/:id/communications", getCommunicationLogsCtrl)
router.post("/store/:id/payment", addPaymentRecordCtrl)
router.get("/store/:id/payments", getPaymentRecordsCtrl)
router.get("/all-store-payments", getAllStorePaymentsCtrl)
router.post("/store/:id/send-reminder", sendPaymentReminderCtrl)
router.post("/store/:id/send-statement", sendStatementEmailCtrl)
router.get("/store/:id/statement", getStatementDataCtrl)

// Store Approval routes (Admin only)
router.get("/pending-stores", auth, isAdmin, getPendingStoresCtrl)
router.post("/approve/:id", auth, isAdmin, approveStoreCtrl)
router.post("/reject/:id", auth, isAdmin, rejectStoreCtrl)
router.post("/admin/create-store", auth, isAdmin, adminCreateStoreCtrl)


module.exports = router