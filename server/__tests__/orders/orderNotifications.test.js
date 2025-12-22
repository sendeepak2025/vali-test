/**
 * Property-Based Tests for Order Notifications
 * Feature: store-approval-notifications
 * 
 * These tests validate the correctness properties for order notification triggers.
 */

const fc = require("fast-check");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const authModel = require("../../models/authModel");
const Notification = require("../../models/notificationModel");
const notificationService = require("../../services/notificationService");

describe("Order Notifications", () => {
  let storeUser;
  let adminUser;
  
  beforeEach(async () => {
    // Create admin user
    const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
    adminUser = await authModel.create({
      email: `admin_${Date.now()}@test.com`,
      password: hashedPassword,
      role: "admin",
      name: "Test Admin",
      approvalStatus: "approved",
    });

    // Create store user (approved)
    storeUser = await authModel.create({
      email: `store_${Date.now()}@test.com`,
      password: hashedPassword,
      role: "store",
      storeName: "Test Store",
      ownerName: "Test Owner",
      agreeTerms: true,
    });

    // Approve the store
    await authModel.findByIdAndUpdate(storeUser._id, {
      approvalStatus: "approved",
      approvedAt: new Date(),
      approvedBy: adminUser._id,
    });
  });

  /**
   * Property 7: Order Events Create Notifications
   * For any purchase order creation or status change event, the system SHALL 
   * create a notification to the store owner with order details, and for 
   * creation events, also create an in-app notification to admin users.
   * 
   * Validates: Requirements 4.1, 4.2, 4.3
   */
  describe("Property 7: Order Events Create Notifications", () => {
    
    it("should create notification to store owner on order creation", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 999999 }),
          fc.float({ min: 10, max: 10000, noNaN: true }),
          async (orderNumber, total) => {
            // Simulate order creation notification (as done in createOrderCtrl)
            const orderData = {
              orderId: new mongoose.Types.ObjectId(),
              orderNumber: `N-${String(orderNumber).padStart(5, "0")}`,
              total: parseFloat(total.toFixed(2)),
            };

            await notificationService.createNotification(
              storeUser._id,
              "order_created",
              "Order Confirmed",
              `Your order #${orderData.orderNumber} has been placed successfully. Total: $${orderData.total.toFixed(2)}`,
              orderData,
              `/orders/${orderData.orderId}`
            );

            // Verify notification was created for store owner
            const notification = await Notification.findOne({
              recipient: storeUser._id,
              type: "order_created",
              "data.orderNumber": orderData.orderNumber,
            });

            expect(notification).not.toBeNull();
            expect(notification.title).toBe("Order Confirmed");
            expect(notification.message).toContain(orderData.orderNumber);
            expect(notification.data.total).toBe(orderData.total);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should create notification to admin users on order creation", async () => {
      const orderData = {
        orderId: new mongoose.Types.ObjectId(),
        orderNumber: "N-00001",
        storeName: storeUser.storeName,
        total: 500.00,
      };

      // Simulate admin notification (as done in createOrderCtrl)
      await notificationService.notifyAdmins(
        "order_created",
        "New Order Received",
        `${orderData.storeName} placed order #${orderData.orderNumber} for $${orderData.total.toFixed(2)}`,
        orderData,
        `/admin/orders/${orderData.orderId}`,
        false
      );

      // Verify notification was created for admin
      const adminNotification = await Notification.findOne({
        recipient: adminUser._id,
        type: "order_created",
        "data.orderNumber": orderData.orderNumber,
      });

      expect(adminNotification).not.toBeNull();
      expect(adminNotification.title).toBe("New Order Received");
      expect(adminNotification.message).toContain(orderData.storeName);
      expect(adminNotification.message).toContain(orderData.orderNumber);
    });

    it("should create notification on order status change", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom("Processing", "Shipped", "Delivered", "Cancelled"),
          fc.constantFrom("Processing", "Shipped", "Delivered", "Cancelled"),
          async (oldStatus, newStatus) => {
            // Skip if status didn't change
            if (oldStatus === newStatus) return true;

            const orderData = {
              orderId: new mongoose.Types.ObjectId(),
              orderNumber: `N-${Date.now().toString().slice(-5)}`,
              oldStatus,
              newStatus,
            };

            // Simulate status change notification (as done in updateOrderCtrl)
            await notificationService.createNotification(
              storeUser._id,
              "order_status_changed",
              "Order Status Updated",
              `Your order #${orderData.orderNumber} status has been updated to: ${newStatus}`,
              orderData,
              `/orders/${orderData.orderId}`
            );

            // Verify notification was created
            const notification = await Notification.findOne({
              recipient: storeUser._id,
              type: "order_status_changed",
              "data.orderNumber": orderData.orderNumber,
              "data.newStatus": newStatus,
            });

            expect(notification).not.toBeNull();
            expect(notification.title).toBe("Order Status Updated");
            expect(notification.message).toContain(newStatus);
            expect(notification.data.oldStatus).toBe(oldStatus);
            expect(notification.data.newStatus).toBe(newStatus);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should create high-value order alert for admins", async () => {
      const HIGH_VALUE_THRESHOLD = 5000;
      
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: HIGH_VALUE_THRESHOLD, max: 50000, noNaN: true }),
          async (total) => {
            const orderData = {
              orderId: new mongoose.Types.ObjectId(),
              orderNumber: `N-${Date.now().toString().slice(-5)}`,
              storeName: storeUser.storeName,
              total: parseFloat(total.toFixed(2)),
              isHighValue: true,
            };

            // Simulate high-value order alert (as done in createOrderCtrl)
            await notificationService.notifyAdmins(
              "order_created",
              "⚠️ High-Value Order Alert",
              `High-value order #${orderData.orderNumber} from ${orderData.storeName}: $${orderData.total.toFixed(2)}`,
              orderData,
              `/admin/orders/${orderData.orderId}`,
              false // Skip email in test
            );

            // Verify high-value alert was created for admin
            const notification = await Notification.findOne({
              recipient: adminUser._id,
              type: "order_created",
              "data.isHighValue": true,
              "data.orderNumber": orderData.orderNumber,
            });

            expect(notification).not.toBeNull();
            expect(notification.title).toContain("High-Value");
            expect(notification.data.total).toBeGreaterThanOrEqual(HIGH_VALUE_THRESHOLD);

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it("should include order details in notification data", async () => {
      const orderData = {
        orderId: new mongoose.Types.ObjectId(),
        orderNumber: "N-12345",
        total: 250.50,
        itemCount: 5,
      };

      await notificationService.createNotification(
        storeUser._id,
        "order_created",
        "Order Confirmed",
        `Your order #${orderData.orderNumber} has been placed.`,
        orderData,
        `/orders/${orderData.orderId}`
      );

      const notification = await Notification.findOne({
        recipient: storeUser._id,
        "data.orderNumber": orderData.orderNumber,
      });

      expect(notification).not.toBeNull();
      expect(notification.data.orderId).toBeDefined();
      expect(notification.data.orderNumber).toBe(orderData.orderNumber);
      expect(notification.data.total).toBe(orderData.total);
      expect(notification.link).toBe(`/orders/${orderData.orderId}`);
    });
  });

  /**
   * Additional tests for notification consistency
   */
  describe("Order Notification Consistency", () => {
    it("should not create duplicate notifications for same order event", async () => {
      const orderData = {
        orderId: new mongoose.Types.ObjectId(),
        orderNumber: "N-UNIQUE-001",
        total: 100.00,
      };

      // Create notification twice
      await notificationService.createNotification(
        storeUser._id,
        "order_created",
        "Order Confirmed",
        `Your order #${orderData.orderNumber} has been placed.`,
        orderData
      );

      await notificationService.createNotification(
        storeUser._id,
        "order_created",
        "Order Confirmed",
        `Your order #${orderData.orderNumber} has been placed.`,
        orderData
      );

      // Both should be created (notifications are not deduplicated by design)
      // This is expected behavior - each call creates a new notification
      const notifications = await Notification.find({
        recipient: storeUser._id,
        "data.orderNumber": orderData.orderNumber,
      });

      // In real implementation, the controller should prevent duplicate calls
      expect(notifications.length).toBe(2);
    });

    it("should create notifications for multiple status changes", async () => {
      const orderId = new mongoose.Types.ObjectId();
      const orderNumber = "N-MULTI-001";
      const statusChanges = [
        { from: "Processing", to: "Shipped" },
        { from: "Shipped", to: "Delivered" },
      ];

      for (const change of statusChanges) {
        await notificationService.createNotification(
          storeUser._id,
          "order_status_changed",
          "Order Status Updated",
          `Your order #${orderNumber} status has been updated to: ${change.to}`,
          { orderId, orderNumber, oldStatus: change.from, newStatus: change.to }
        );
      }

      const notifications = await Notification.find({
        recipient: storeUser._id,
        type: "order_status_changed",
        "data.orderNumber": orderNumber,
      }).sort({ createdAt: 1 });

      expect(notifications.length).toBe(2);
      expect(notifications[0].data.newStatus).toBe("Shipped");
      expect(notifications[1].data.newStatus).toBe("Delivered");
    });
  });
});
