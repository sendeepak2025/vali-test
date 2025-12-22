/**
 * Property-Based Tests for Notification API
 * Feature: store-approval-notifications
 * 
 * These tests validate the correctness properties for notification API endpoints.
 */

const fc = require("fast-check");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const authModel = require("../../models/authModel");
const Notification = require("../../models/notificationModel");
const notificationService = require("../../services/notificationService");

describe("Notification API", () => {
  let testUser;
  
  beforeEach(async () => {
    // Create test user for notification tests
    const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
    testUser = await authModel.create({
      email: `user_${Date.now()}@test.com`,
      password: hashedPassword,
      role: "store",
      storeName: "Test Store",
      ownerName: "Test Owner",
      agreeTerms: true,
    });
  });

  /**
   * Property 9: Notification Read State Consistency
   * For any notification marked as read, the isRead field SHALL be true and 
   * readAt SHALL contain a valid timestamp that is greater than or equal to 
   * the notification's createdAt timestamp.
   * 
   * Validates: Requirements 7.3
   */
  describe("Property 9: Notification Read State Consistency", () => {
    it("should set isRead to true and readAt timestamp when marking as read", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            "store_registration",
            "store_approved",
            "store_rejected",
            "order_created",
            "order_status_changed",
            "system"
          ),
          fc.string({ minLength: 3, maxLength: 100 }).filter(s => s.trim().length >= 3),
          async (type, title) => {
            // Create a notification
            const notification = await notificationService.createNotification(
              testUser._id,
              type,
              title.trim(),
              "Test message",
              { testData: true }
            );

            // Verify initial state
            expect(notification.isRead).toBe(false);
            expect(notification.readAt).toBeFalsy(); // Can be null or undefined

            const beforeRead = new Date();

            // Mark as read
            const updatedNotification = await notificationService.markAsRead(
              notification._id,
              testUser._id
            );

            const afterRead = new Date();

            // Verify read state
            expect(updatedNotification.isRead).toBe(true);
            expect(updatedNotification.readAt).toBeDefined();
            expect(updatedNotification.readAt).toBeTruthy();

            // Verify readAt is valid timestamp
            const readAt = new Date(updatedNotification.readAt);
            expect(readAt >= beforeRead).toBe(true);
            expect(readAt <= afterRead).toBe(true);

            // Verify readAt >= createdAt
            const createdAt = new Date(updatedNotification.createdAt);
            expect(readAt >= createdAt).toBe(true);

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it("should maintain read state consistency after multiple read operations", async () => {
      // Create a notification
      const notification = await notificationService.createNotification(
        testUser._id,
        "system",
        "Test Notification",
        "Test message"
      );

      // Mark as read first time
      const firstRead = await notificationService.markAsRead(
        notification._id,
        testUser._id
      );
      const firstReadAt = new Date(firstRead.readAt);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Mark as read again (should not change readAt)
      const secondRead = await notificationService.markAsRead(
        notification._id,
        testUser._id
      );

      // Both should be marked as read
      expect(firstRead.isRead).toBe(true);
      expect(secondRead.isRead).toBe(true);

      // readAt should be set
      expect(secondRead.readAt).toBeDefined();
    });

    it("should mark all notifications as read with valid timestamps", async () => {
      // Create multiple notifications
      const notificationTypes = [
        "store_registration",
        "store_approved",
        "order_created",
      ];

      for (const type of notificationTypes) {
        await notificationService.createNotification(
          testUser._id,
          type,
          `Test ${type}`,
          "Test message"
        );
      }

      const beforeMarkAll = new Date();

      // Mark all as read
      const result = await notificationService.markAllAsRead(testUser._id);

      const afterMarkAll = new Date();

      // Verify all are marked as read
      const notifications = await Notification.find({ recipient: testUser._id });

      for (const notification of notifications) {
        expect(notification.isRead).toBe(true);
        expect(notification.readAt).toBeDefined();

        const readAt = new Date(notification.readAt);
        expect(readAt >= beforeMarkAll).toBe(true);
        expect(readAt <= afterMarkAll).toBe(true);

        // readAt >= createdAt
        const createdAt = new Date(notification.createdAt);
        expect(readAt >= createdAt).toBe(true);
      }
    });
  });

  /**
   * Property 10: Notification Filtering Accuracy
   * For any notification query with type filter, the returned notifications 
   * SHALL contain only notifications matching the specified type(s), and the 
   * unread count SHALL equal the count of notifications where isRead is false.
   * 
   * Validates: Requirements 7.2, 7.4
   */
  describe("Property 10: Notification Filtering Accuracy", () => {
    it("should return only notifications matching the specified type filter", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            "store_registration",
            "store_approved",
            "store_rejected",
            "order_created",
            "order_status_changed",
            "system"
          ),
          async (filterType) => {
            // Create a unique user for this test iteration
            const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
            const uniqueUser = await authModel.create({
              email: `filter_test_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`,
              password: hashedPassword,
              role: "store",
              storeName: "Filter Test Store",
              ownerName: "Filter Test Owner",
              agreeTerms: true,
            });

            // Create notifications of different types
            const allTypes = [
              "store_registration",
              "store_approved",
              "order_created",
              "system",
            ];

            for (const type of allTypes) {
              await notificationService.createNotification(
                uniqueUser._id,
                type,
                `Test ${type}`,
                "Test message"
              );
            }

            // Query with type filter
            const result = await notificationService.getUserNotifications(
              uniqueUser._id,
              { type: filterType }
            );

            // Verify all returned notifications match the filter type
            for (const notification of result.notifications) {
              expect(notification.type).toBe(filterType);
            }

            // Verify count matches
            const expectedCount = allTypes.filter(t => t === filterType).length;
            expect(result.notifications.length).toBe(expectedCount);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should return correct unread count", async () => {
      // Create mix of read and unread notifications
      const notification1 = await notificationService.createNotification(
        testUser._id,
        "store_registration",
        "Test 1",
        "Message 1"
      );

      const notification2 = await notificationService.createNotification(
        testUser._id,
        "store_approved",
        "Test 2",
        "Message 2"
      );

      const notification3 = await notificationService.createNotification(
        testUser._id,
        "order_created",
        "Test 3",
        "Message 3"
      );

      // Mark one as read
      await notificationService.markAsRead(notification1._id, testUser._id);

      // Get unread count
      const unreadCount = await notificationService.getUnreadCount(testUser._id);

      // Should be 2 (notification2 and notification3 are unread)
      expect(unreadCount).toBe(2);

      // Verify by querying unread notifications
      const unreadResult = await notificationService.getUserNotifications(
        testUser._id,
        { isRead: false }
      );

      expect(unreadResult.notifications.length).toBe(unreadCount);
    });

    it("should filter by read status correctly", async () => {
      // Create notifications
      const notification1 = await notificationService.createNotification(
        testUser._id,
        "system",
        "Test 1",
        "Message 1"
      );

      await notificationService.createNotification(
        testUser._id,
        "system",
        "Test 2",
        "Message 2"
      );

      await notificationService.createNotification(
        testUser._id,
        "system",
        "Test 3",
        "Message 3"
      );

      // Mark first one as read
      await notificationService.markAsRead(notification1._id, testUser._id);

      // Query read notifications
      const readResult = await notificationService.getUserNotifications(
        testUser._id,
        { isRead: true }
      );

      // Query unread notifications
      const unreadResult = await notificationService.getUserNotifications(
        testUser._id,
        { isRead: false }
      );

      // Verify read filter
      expect(readResult.notifications.length).toBe(1);
      for (const n of readResult.notifications) {
        expect(n.isRead).toBe(true);
      }

      // Verify unread filter
      expect(unreadResult.notifications.length).toBe(2);
      for (const n of unreadResult.notifications) {
        expect(n.isRead).toBe(false);
      }

      // Total should equal read + unread
      const allResult = await notificationService.getUserNotifications(testUser._id);
      expect(allResult.notifications.length).toBe(
        readResult.notifications.length + unreadResult.notifications.length
      );
    });

    it("should paginate notifications correctly", async () => {
      // Create a unique user for this test to avoid interference from other tests
      const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
      const paginationUser = await authModel.create({
        email: `pagination_test_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`,
        password: hashedPassword,
        role: "store",
        storeName: "Pagination Test Store",
        ownerName: "Pagination Test Owner",
        agreeTerms: true,
      });

      // Create 15 notifications
      for (let i = 0; i < 15; i++) {
        await notificationService.createNotification(
          paginationUser._id,
          "system",
          `Test ${i}`,
          `Message ${i}`
        );
      }

      // Get first page (limit 5)
      const page1 = await notificationService.getUserNotifications(
        paginationUser._id,
        { page: 1, limit: 5 }
      );

      // Get second page
      const page2 = await notificationService.getUserNotifications(
        paginationUser._id,
        { page: 2, limit: 5 }
      );

      // Get third page
      const page3 = await notificationService.getUserNotifications(
        paginationUser._id,
        { page: 3, limit: 5 }
      );

      // Verify pagination
      expect(page1.notifications.length).toBe(5);
      expect(page2.notifications.length).toBe(5);
      expect(page3.notifications.length).toBe(5);

      expect(page1.pagination.total).toBe(15);
      expect(page1.pagination.pages).toBe(3);

      // Verify no duplicates across pages
      const allIds = [
        ...page1.notifications.map(n => n._id.toString()),
        ...page2.notifications.map(n => n._id.toString()),
        ...page3.notifications.map(n => n._id.toString()),
      ];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(15);
    });
  });

  /**
   * Additional tests for notification deletion
   */
  describe("Notification Deletion", () => {
    it("should delete notification and not return it in queries", async () => {
      // Create notification
      const notification = await notificationService.createNotification(
        testUser._id,
        "system",
        "Test Delete",
        "Test message"
      );

      // Verify it exists
      const beforeDelete = await notificationService.getUserNotifications(testUser._id);
      expect(beforeDelete.notifications.some(n => n._id.toString() === notification._id.toString())).toBe(true);

      // Delete it
      await notificationService.deleteNotification(notification._id, testUser._id);

      // Verify it's gone
      const afterDelete = await notificationService.getUserNotifications(testUser._id);
      expect(afterDelete.notifications.some(n => n._id.toString() === notification._id.toString())).toBe(false);
    });

    it("should not delete notification belonging to another user", async () => {
      // Create another user
      const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
      const otherUser = await authModel.create({
        email: `other_${Date.now()}@test.com`,
        password: hashedPassword,
        role: "store",
        storeName: "Other Store",
        ownerName: "Other Owner",
        agreeTerms: true,
      });

      // Create notification for testUser
      const notification = await notificationService.createNotification(
        testUser._id,
        "system",
        "Test",
        "Test message"
      );

      // Try to delete with otherUser's ID
      const result = await notificationService.deleteNotification(
        notification._id,
        otherUser._id
      );

      // Should return null (not found for that user)
      expect(result).toBeNull();

      // Notification should still exist
      const stillExists = await Notification.findById(notification._id);
      expect(stillExists).not.toBeNull();
    });
  });
});
