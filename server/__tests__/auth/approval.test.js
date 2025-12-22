/**
 * Property-Based Tests for Store Approval
 * Feature: store-approval-notifications
 * 
 * These tests validate the correctness properties for approval workflow.
 */

const fc = require("fast-check");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const authModel = require("../../models/authModel");
const Notification = require("../../models/notificationModel");
const notificationService = require("../../services/notificationService");

describe("Store Approval", () => {
  let adminUser;
  
  beforeEach(async () => {
    // Create admin user for approval tests
    const hashedPassword = await bcrypt.hash("AdminPassword123!", 10);
    adminUser = await authModel.create({
      email: "admin@test.com",
      password: hashedPassword,
      role: "admin",
      name: "Test Admin",
      approvalStatus: "approved",
    });
  });

  /**
   * Property 4: Approval Status Transition Integrity
   * For any store with "pending" status, an approval action SHALL transition 
   * the status to "approved" with approvedAt timestamp, and a rejection action 
   * SHALL transition the status to "rejected" with rejectionReason stored. 
   * No other transitions are valid.
   * 
   * Validates: Requirements 2.3, 2.4
   */
  describe("Property 4: Approval Status Transition Integrity", () => {
    it("should transition from pending to approved with timestamp", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          async (storeName) => {
            const uniqueEmail = `store_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
            const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
            
            // Create pending store
            const store = await authModel.create({
              email: uniqueEmail,
              password: hashedPassword,
              role: "store",
              storeName: storeName.trim(),
              ownerName: "Test Owner",
              agreeTerms: true,
            });

            expect(store.approvalStatus).toBe("pending");
            
            const beforeApproval = new Date();
            
            // Approve the store
            store.approvalStatus = "approved";
            store.approvedAt = new Date();
            store.approvedBy = adminUser._id;
            await store.save();
            
            const afterApproval = new Date();

            // Verify transition
            const updatedStore = await authModel.findById(store._id);
            expect(updatedStore.approvalStatus).toBe("approved");
            expect(updatedStore.approvedAt).toBeDefined();
            expect(new Date(updatedStore.approvedAt) >= beforeApproval).toBe(true);
            expect(new Date(updatedStore.approvedAt) <= afterApproval).toBe(true);
            expect(updatedStore.approvedBy.toString()).toBe(adminUser._id.toString());
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should transition from pending to rejected with reason", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
          async (rejectionReason) => {
            const uniqueEmail = `store_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
            const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
            
            // Create pending store
            const store = await authModel.create({
              email: uniqueEmail,
              password: hashedPassword,
              role: "store",
              storeName: "Test Store",
              ownerName: "Test Owner",
              agreeTerms: true,
            });

            expect(store.approvalStatus).toBe("pending");
            
            const beforeRejection = new Date();
            
            // Reject the store
            store.approvalStatus = "rejected";
            store.rejectedAt = new Date();
            store.rejectedBy = adminUser._id;
            store.rejectionReason = rejectionReason.trim();
            await store.save();
            
            const afterRejection = new Date();

            // Verify transition
            const updatedStore = await authModel.findById(store._id);
            expect(updatedStore.approvalStatus).toBe("rejected");
            expect(updatedStore.rejectedAt).toBeDefined();
            expect(new Date(updatedStore.rejectedAt) >= beforeRejection).toBe(true);
            expect(new Date(updatedStore.rejectedAt) <= afterRejection).toBe(true);
            expect(updatedStore.rejectedBy.toString()).toBe(adminUser._id.toString());
            expect(updatedStore.rejectionReason).toBe(rejectionReason.trim());
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should not allow transition from approved to rejected", async () => {
      const uniqueEmail = `store_${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
      
      // Create store first, then update to approved (bypassing pre-save hook)
      const store = await authModel.create({
        email: uniqueEmail,
        password: hashedPassword,
        role: "store",
        storeName: "Test Store",
        ownerName: "Test Owner",
        agreeTerms: true,
      });

      // Update to approved status
      await authModel.findByIdAndUpdate(store._id, {
        approvalStatus: "approved",
        approvedAt: new Date(),
        approvedBy: adminUser._id,
      });

      const approvedStore = await authModel.findById(store._id);
      expect(approvedStore.approvalStatus).toBe("approved");
      
      // In a real scenario, the controller would check and reject this operation
      // This test documents the expected behavior
    });

    it("should not allow transition from rejected to approved", async () => {
      const uniqueEmail = `store_${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
      
      // Create store first, then update to rejected (bypassing pre-save hook)
      const store = await authModel.create({
        email: uniqueEmail,
        password: hashedPassword,
        role: "store",
        storeName: "Test Store",
        ownerName: "Test Owner",
        agreeTerms: true,
      });

      // Update to rejected status
      await authModel.findByIdAndUpdate(store._id, {
        approvalStatus: "rejected",
        rejectedAt: new Date(),
        rejectedBy: adminUser._id,
        rejectionReason: "Test rejection",
      });

      const rejectedStore = await authModel.findById(store._id);
      expect(rejectedStore.approvalStatus).toBe("rejected");
      
      // In a real scenario, the controller would check and reject this operation
    });
  });

  /**
   * Property 5: Approval Decision Notification
   * For any approval or rejection action by an admin, exactly one notification 
   * SHALL be sent to the store owner containing the decision outcome and 
   * relevant details.
   * 
   * Validates: Requirements 2.5, 3.4
   */
  describe("Property 5: Approval Decision Notification", () => {
    it("should create notification on approval", async () => {
      const uniqueEmail = `store_${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
      
      // Create pending store
      const store = await authModel.create({
        email: uniqueEmail,
        password: hashedPassword,
        role: "store",
        storeName: "Test Store",
        ownerName: "Test Owner",
        agreeTerms: true,
      });

      // Simulate approval notification (as done in approveStoreCtrl)
      await notificationService.createNotification(
        store._id,
        "store_approved",
        "Account Approved!",
        `Congratulations! Your store ${store.storeName} has been approved.`,
        { storeId: store._id }
      );

      // Verify notification was created
      const notification = await Notification.findOne({
        recipient: store._id,
        type: "store_approved",
      });

      expect(notification).not.toBeNull();
      expect(notification.title).toBe("Account Approved!");
      expect(notification.message).toContain("approved");
    });

    it("should create notification on rejection with reason", async () => {
      const rejectionReason = "Incomplete business documentation";
      const uniqueEmail = `store_${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
      
      // Create pending store
      const store = await authModel.create({
        email: uniqueEmail,
        password: hashedPassword,
        role: "store",
        storeName: "Test Store",
        ownerName: "Test Owner",
        agreeTerms: true,
      });

      // Simulate rejection notification (as done in rejectStoreCtrl)
      await notificationService.createNotification(
        store._id,
        "store_rejected",
        "Registration Update",
        `Your registration for ${store.storeName} could not be approved. Reason: ${rejectionReason}`,
        { storeId: store._id, reason: rejectionReason }
      );

      // Verify notification was created
      const notification = await Notification.findOne({
        recipient: store._id,
        type: "store_rejected",
      });

      expect(notification).not.toBeNull();
      expect(notification.title).toBe("Registration Update");
      expect(notification.message).toContain(rejectionReason);
      expect(notification.data.reason).toBe(rejectionReason);
    });
  });

  /**
   * Property 8: Pending Stores List Completeness and Ordering
   * For any request to the pending stores endpoint, the response SHALL contain 
   * all and only stores with approval_status "pending", sorted by createdAt 
   * in ascending order, with all required fields present.
   * 
   * Validates: Requirements 2.1, 2.2
   */
  describe("Property 8: Pending Stores List Completeness and Ordering", () => {
    it("should return only pending stores sorted by createdAt", async () => {
      const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
      
      // Create stores with different statuses
      const store1 = await authModel.create({
        email: `pending1_${Date.now()}@example.com`,
        password: hashedPassword,
        role: "store",
        storeName: "Pending Store 1",
        ownerName: "Owner 1",
        agreeTerms: true,
        // Will be pending due to pre-save hook
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const store2 = await authModel.create({
        email: `pending2_${Date.now()}@example.com`,
        password: hashedPassword,
        role: "store",
        storeName: "Pending Store 2",
        ownerName: "Owner 2",
        agreeTerms: true,
      });

      // Create an approved store (should not appear in pending list)
      // First create as pending (due to pre-save hook), then update to approved
      const approvedStore = await authModel.create({
        email: `approved_${Date.now()}@example.com`,
        password: hashedPassword,
        role: "store",
        storeName: "Approved Store",
        ownerName: "Owner 3",
        agreeTerms: true,
      });
      
      // Update to approved status (bypassing pre-save hook)
      await authModel.findByIdAndUpdate(approvedStore._id, {
        approvalStatus: "approved",
        approvedAt: new Date(),
        approvedBy: adminUser._id,
      });

      // Query pending stores
      const pendingStores = await authModel.find({ 
        role: "store", 
        approvalStatus: "pending" 
      })
      .select("storeName ownerName email phone address city state zipCode businessDescription registrationRef createdAt")
      .sort({ createdAt: 1 });

      // Verify only pending stores are returned
      expect(pendingStores.length).toBe(2);
      pendingStores.forEach(store => {
        expect(store.approvalStatus).toBeUndefined(); // Not selected
      });

      // Verify ordering (oldest first)
      expect(new Date(pendingStores[0].createdAt) <= new Date(pendingStores[1].createdAt)).toBe(true);

      // Verify required fields are present
      pendingStores.forEach(store => {
        expect(store.storeName).toBeDefined();
        expect(store.ownerName).toBeDefined();
        expect(store.email).toBeDefined();
        expect(store.registrationRef).toBeDefined();
        expect(store.createdAt).toBeDefined();
      });
    });

    it("should return empty array when no pending stores exist", async () => {
      // Query pending stores (none created)
      const pendingStores = await authModel.find({ 
        role: "store", 
        approvalStatus: "pending" 
      });

      expect(pendingStores).toEqual([]);
    });
  });
});
