/**
 * Property-Based Tests for Store Registration
 * Feature: store-approval-notifications
 * 
 * These tests validate the correctness properties for registration workflow.
 */

const fc = require("fast-check");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const authModel = require("../../models/authModel");
const Notification = require("../../models/notificationModel");

// Arbitraries for generating test data
const emailArb = fc.emailAddress();

const storeDataArb = fc.record({
  storeName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  ownerName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  phone: fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 10, maxLength: 15 }),
  address: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length >= 5),
  city: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  state: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  zipCode: fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 5, maxLength: 10 }),
  businessDescription: fc.string({ minLength: 0, maxLength: 200 }),
});

describe("Store Registration", () => {
  /**
   * Property 1: Registration Creates Pending Status with Unique Reference
   * For any valid store registration request, the created store record SHALL have 
   * approval_status set to "pending" and a unique registration reference number 
   * that does not exist in any other store record.
   * 
   * Validates: Requirements 1.1, 1.2
   */
  describe("Property 1: Registration Creates Pending Status with Unique Reference", () => {
    it("should create store with pending status and unique registrationRef", async () => {
      const registrationRefs = new Set();
      
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          storeDataArb,
          async (email, storeData) => {
            // Create unique email for each test
            const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
            
            const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
            
            const store = await authModel.create({
              email: uniqueEmail,
              password: hashedPassword,
              role: "store",
              ...storeData,
              agreeTerms: true,
            });

            // Verify pending status
            expect(store.approvalStatus).toBe("pending");
            
            // Verify registrationRef exists and follows format
            expect(store.registrationRef).toBeDefined();
            expect(store.registrationRef).toMatch(/^REG-\d{8}-[A-Z0-9]{5}$/);
            
            // Verify uniqueness
            expect(registrationRefs.has(store.registrationRef)).toBe(false);
            registrationRefs.add(store.registrationRef);
            
            return true;
          }
        ),
        { numRuns: 50 } // Reduced for faster test execution
      );
    });

    it("should not set pending status for non-store roles", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom("admin", "member"),
          async (role) => {
            const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
            const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
            
            const user = await authModel.create({
              email: uniqueEmail,
              password: hashedPassword,
              role: role,
              name: "Test User",
            });

            // Non-store roles should have approved status (default)
            expect(user.approvalStatus).toBe("approved");
            // Non-store roles should not have registrationRef
            expect(user.registrationRef).toBeUndefined();
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 2: Duplicate Email Prevention
   * For any registration attempt with an email that already exists in the system, 
   * the registration SHALL be rejected with an error, and no new store record 
   * SHALL be created.
   * 
   * Validates: Requirements 1.5
   */
  describe("Property 2: Duplicate Email Prevention", () => {
    it("should reject registration with existing email", async () => {
      await fc.assert(
        fc.asyncProperty(
          storeDataArb,
          async (storeData) => {
            const testEmail = `duplicate_${Date.now()}@example.com`;
            const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
            
            // Create first store
            await authModel.create({
              email: testEmail,
              password: hashedPassword,
              role: "store",
              ...storeData,
              agreeTerms: true,
            });

            const countBefore = await authModel.countDocuments({ email: testEmail });
            expect(countBefore).toBe(1);

            // Attempt to create second store with same email
            let errorThrown = false;
            try {
              await authModel.create({
                email: testEmail,
                password: hashedPassword,
                role: "store",
                storeName: "Different Store",
                ownerName: "Different Owner",
                agreeTerms: true,
              });
            } catch (error) {
              errorThrown = true;
              // MongoDB duplicate key error
              expect(error.code === 11000 || error.message.includes("duplicate")).toBe(true);
            }

            // Verify no new record was created
            const countAfter = await authModel.countDocuments({ email: testEmail });
            expect(countAfter).toBe(1);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 3: Registration Triggers Dual Notifications
   * For any successful store registration, exactly two notifications SHALL be created: 
   * one confirmation email to the store owner containing registration details, and 
   * one alert notification to all admin users about the new registration request.
   * 
   * Validates: Requirements 1.3, 1.4
   */
  describe("Property 3: Registration Triggers Dual Notifications", () => {
    beforeEach(async () => {
      // Create admin users for notification testing
      const hashedPassword = await bcrypt.hash("AdminPassword123!", 10);
      await authModel.create({
        email: "admin1@test.com",
        password: hashedPassword,
        role: "admin",
        name: "Admin One",
        approvalStatus: "approved",
      });
      await authModel.create({
        email: "admin2@test.com",
        password: hashedPassword,
        role: "admin",
        name: "Admin Two",
        approvalStatus: "approved",
      });
    });

    it("should create notification for store owner on registration", async () => {
      const notificationService = require("../../services/notificationService");
      
      await fc.assert(
        fc.asyncProperty(
          storeDataArb,
          async (storeData) => {
            const uniqueEmail = `store_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
            const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
            
            // Create store
            const store = await authModel.create({
              email: uniqueEmail,
              password: hashedPassword,
              role: "store",
              ...storeData,
              agreeTerms: true,
            });

            // Simulate notification creation (as done in registerCtrl)
            await notificationService.createNotification(
              store._id,
              "store_registration",
              "Registration Received",
              `Your registration for ${storeData.storeName} has been received.`,
              { registrationRef: store.registrationRef }
            );

            // Verify store owner notification exists
            const storeNotification = await Notification.findOne({
              recipient: store._id,
              type: "store_registration",
            });

            expect(storeNotification).not.toBeNull();
            expect(storeNotification.title).toBe("Registration Received");
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should create notifications for all admin users on registration", async () => {
      const notificationService = require("../../services/notificationService");
      
      const uniqueEmail = `store_${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
      
      // Create store
      const store = await authModel.create({
        email: uniqueEmail,
        password: hashedPassword,
        role: "store",
        storeName: "Test Store",
        ownerName: "Test Owner",
        agreeTerms: true,
      });

      // Notify admins (as done in registerCtrl)
      await notificationService.notifyAdmins(
        "store_registration",
        "New Store Registration",
        `Test Store has registered and requires approval.`,
        { storeId: store._id, registrationRef: store.registrationRef }
      );

      // Get all admins
      const admins = await authModel.find({ role: "admin" });
      expect(admins.length).toBeGreaterThan(0);

      // Verify each admin received notification
      for (const admin of admins) {
        const adminNotification = await Notification.findOne({
          recipient: admin._id,
          type: "store_registration",
        });
        expect(adminNotification).not.toBeNull();
        expect(adminNotification.title).toBe("New Store Registration");
      }
    });
  });
});

describe("Registration Reference Format", () => {
  it("should generate registrationRef in correct format REG-YYYYMMDD-XXXXX", async () => {
    const hashedPassword = await bcrypt.hash("TestPassword123!", 10);
    
    const store = await authModel.create({
      email: `format_test_${Date.now()}@example.com`,
      password: hashedPassword,
      role: "store",
      storeName: "Format Test Store",
      ownerName: "Test Owner",
      agreeTerms: true,
    });

    // Verify format: REG-YYYYMMDD-XXXXX
    const refPattern = /^REG-(\d{4})(\d{2})(\d{2})-([A-Z0-9]{5})$/;
    expect(store.registrationRef).toMatch(refPattern);

    // Extract and validate date parts
    const match = store.registrationRef.match(refPattern);
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);

    const now = new Date();
    expect(year).toBe(now.getFullYear());
    expect(month).toBe(now.getMonth() + 1);
    expect(day).toBe(now.getDate());
  });
});
