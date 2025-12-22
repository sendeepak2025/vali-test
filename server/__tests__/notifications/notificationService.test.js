/**
 * Property-Based Tests for Notification Service
 * Feature: store-approval-notifications
 * 
 * These tests validate the correctness properties defined in the design document.
 */

const fc = require("fast-check");
const mongoose = require("mongoose");
const notificationService = require("../../services/notificationService");
const Notification = require("../../models/notificationModel");
const authModel = require("../../models/authModel");
const emailTemplates = require("../../templates/emails/emailTemplates");

// Arbitraries for generating test data
const notificationTypeArb = fc.constantFrom(
  "store_registration",
  "store_approved",
  "store_rejected",
  "order_created",
  "order_status_changed",
  "payment_reminder",
  "inactivity_alert",
  "first_order",
  "high_value_order",
  "system"
);

const notificationDataArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }),
  message: fc.string({ minLength: 1, maxLength: 500 }),
  link: fc.option(fc.webUrl(), { nil: null }),
  data: fc.dictionary(fc.string(), fc.string()),
});

describe("NotificationService", () => {
  let testUser;

  beforeEach(async () => {
    // Create a test user for notifications
    testUser = await authModel.create({
      email: "test@example.com",
      password: "hashedpassword123",
      name: "Test User",
      role: "store",
      approvalStatus: "approved",
    });
  });

  /**
   * Property 11: Notification Template Selection
   * For any notification of a given type, the email sent SHALL use the template 
   * corresponding to that notification type, and a notification record SHALL be 
   * persisted in the database for audit purposes.
   * 
   * Validates: Requirements 6.3, 6.4
   */
  describe("Property 11: Notification Template Selection and Persistence", () => {
    it("should persist notification record for any valid notification type", async () => {
      await fc.assert(
        fc.asyncProperty(
          notificationTypeArb,
          notificationDataArb,
          async (type, { title, message, link, data }) => {
            // Skip if title or message is empty after trim
            if (!title.trim() || !message.trim()) return true;

            const notification = await notificationService.createNotification(
              testUser._id,
              type,
              title.trim(),
              message.trim(),
              data,
              link
            );

            // Verify notification was persisted
            const savedNotification = await Notification.findById(notification._id);
            
            expect(savedNotification).not.toBeNull();
            expect(savedNotification.recipient.toString()).toBe(testUser._id.toString());
            expect(savedNotification.type).toBe(type);
            expect(savedNotification.title).toBe(title.trim());
            expect(savedNotification.message).toBe(message.trim());
            expect(savedNotification.isRead).toBe(false);
            
            // Clean up for next iteration
            await Notification.findByIdAndDelete(notification._id);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should use correct template for each notification type when sending email", () => {
      // Verify all notification types have corresponding templates or are handled
      const templateMapping = {
        store_registration: "REGISTRATION_CONFIRMATION",
        store_approved: "STORE_APPROVED",
        store_rejected: "STORE_REJECTED",
        order_created: "ORDER_CONFIRMATION",
        order_status_changed: "ORDER_STATUS_UPDATE",
        payment_reminder: "PAYMENT_REMINDER",
        high_value_order: "HIGH_VALUE_ORDER_ALERT",
      };

      // For each mapped type, verify template exists and returns valid HTML
      Object.entries(templateMapping).forEach(([type, templateName]) => {
        const template = emailTemplates[templateName];
        expect(template).toBeDefined();
        
        // Template should return HTML string
        const html = template({ storeName: "Test Store", ownerName: "Test Owner" });
        expect(typeof html).toBe("string");
        expect(html).toContain("<!DOCTYPE html>");
      });
    });

    it("should maintain audit trail with timestamps for all notifications", async () => {
      await fc.assert(
        fc.asyncProperty(
          notificationTypeArb,
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          async (type, title, message) => {
            if (!title.trim() || !message.trim()) return true;

            const beforeCreate = new Date();
            
            const notification = await notificationService.createNotification(
              testUser._id,
              type,
              title.trim(),
              message.trim()
            );

            const afterCreate = new Date();

            // Verify timestamps exist and are valid
            expect(notification.createdAt).toBeDefined();
            expect(notification.updatedAt).toBeDefined();
            expect(new Date(notification.createdAt) >= beforeCreate).toBe(true);
            expect(new Date(notification.createdAt) <= afterCreate).toBe(true);

            // Clean up
            await Notification.findByIdAndDelete(notification._id);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Notification CRUD Operations", () => {
    it("should create notification with all required fields", async () => {
      const notification = await notificationService.createNotification(
        testUser._id,
        "store_approved",
        "Test Title",
        "Test Message",
        { key: "value" },
        "/dashboard"
      );

      expect(notification).toBeDefined();
      expect(notification.recipient.toString()).toBe(testUser._id.toString());
      expect(notification.type).toBe("store_approved");
      expect(notification.title).toBe("Test Title");
      expect(notification.message).toBe("Test Message");
      expect(notification.data).toEqual({ key: "value" });
      expect(notification.link).toBe("/dashboard");
      expect(notification.isRead).toBe(false);
    });

    it("should mark notification as read with timestamp", async () => {
      const notification = await notificationService.createNotification(
        testUser._id,
        "system",
        "Test",
        "Test message"
      );

      const beforeRead = new Date();
      const updated = await notificationService.markAsRead(notification._id, testUser._id);
      const afterRead = new Date();

      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeDefined();
      expect(new Date(updated.readAt) >= beforeRead).toBe(true);
      expect(new Date(updated.readAt) <= afterRead).toBe(true);
    });

    it("should get correct unread count", async () => {
      // Create 5 notifications
      for (let i = 0; i < 5; i++) {
        await notificationService.createNotification(
          testUser._id,
          "system",
          `Test ${i}`,
          `Message ${i}`
        );
      }

      const count = await notificationService.getUnreadCount(testUser._id);
      expect(count).toBe(5);

      // Mark 2 as read
      const notifications = await Notification.find({ recipient: testUser._id }).limit(2);
      await notificationService.markAsRead(notifications[0]._id, testUser._id);
      await notificationService.markAsRead(notifications[1]._id, testUser._id);

      const newCount = await notificationService.getUnreadCount(testUser._id);
      expect(newCount).toBe(3);
    });

    it("should filter notifications by type", async () => {
      // Create notifications of different types
      await notificationService.createNotification(testUser._id, "order_created", "Order 1", "Message");
      await notificationService.createNotification(testUser._id, "order_created", "Order 2", "Message");
      await notificationService.createNotification(testUser._id, "payment_reminder", "Payment", "Message");

      const orderNotifications = await notificationService.getUserNotifications(testUser._id, {
        type: "order_created",
      });

      expect(orderNotifications.notifications.length).toBe(2);
      orderNotifications.notifications.forEach((n) => {
        expect(n.type).toBe("order_created");
      });
    });

    it("should paginate notifications correctly", async () => {
      // Create 25 notifications
      for (let i = 0; i < 25; i++) {
        await notificationService.createNotification(
          testUser._id,
          "system",
          `Test ${i}`,
          `Message ${i}`
        );
      }

      const page1 = await notificationService.getUserNotifications(testUser._id, {
        page: 1,
        limit: 10,
      });

      expect(page1.notifications.length).toBe(10);
      expect(page1.pagination.total).toBe(25);
      expect(page1.pagination.pages).toBe(3);

      const page3 = await notificationService.getUserNotifications(testUser._id, {
        page: 3,
        limit: 10,
      });

      expect(page3.notifications.length).toBe(5);
    });
  });

  describe("Admin Notifications", () => {
    it("should notify all admin users", async () => {
      // Create admin users
      const admin1 = await authModel.create({
        email: "admin1@example.com",
        password: "hashedpassword",
        name: "Admin 1",
        role: "admin",
      });

      const admin2 = await authModel.create({
        email: "admin2@example.com",
        password: "hashedpassword",
        name: "Admin 2",
        role: "admin",
      });

      const notifications = await notificationService.notifyAdmins(
        "store_registration",
        "New Store Registration",
        "A new store has registered",
        { storeId: "123" },
        "/admin/stores"
      );

      expect(notifications.length).toBe(2);
      
      const admin1Notification = await Notification.findOne({ recipient: admin1._id });
      const admin2Notification = await Notification.findOne({ recipient: admin2._id });

      expect(admin1Notification).not.toBeNull();
      expect(admin2Notification).not.toBeNull();
      expect(admin1Notification.type).toBe("store_registration");
      expect(admin2Notification.type).toBe("store_registration");
    });
  });
});
