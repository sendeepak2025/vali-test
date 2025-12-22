const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  getNotificationsCtrl,
  getUnreadCountCtrl,
  markAsReadCtrl,
  markAllAsReadCtrl,
  deleteNotificationCtrl,
} = require("../controllers/notificationCtrl");

// All notification routes require authentication
router.use(auth);

// GET /api/notifications - Get user's notifications with pagination and filters
router.get("/", getNotificationsCtrl);

// GET /api/notifications/unread-count - Get unread notification count
router.get("/unread-count", getUnreadCountCtrl);

// PUT /api/notifications/read-all - Mark all notifications as read
router.put("/read-all", markAllAsReadCtrl);

// PUT /api/notifications/:id/read - Mark single notification as read
router.put("/:id/read", markAsReadCtrl);

// DELETE /api/notifications/:id - Delete a notification
router.delete("/:id", deleteNotificationCtrl);

module.exports = router;
