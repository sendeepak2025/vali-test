# Implementation Plan: Store Approval & Notifications System

## Overview

This implementation plan breaks down the store approval workflow and notification system into discrete coding tasks. The approach prioritizes backend infrastructure first, then frontend components, with testing integrated throughout.

## Tasks

- [x] 1. Extend Auth Model with Approval Fields
  - Add approvalStatus, registrationRef, approvedAt, approvedBy, rejectedAt, rejectedBy, rejectionReason fields to authModel.js
  - Add pre-save hook to generate unique registrationRef for new stores
  - Update existing stores to have "approved" status (migration)
  - _Requirements: 1.1, 1.2, 2.3, 2.4_

- [x] 2. Create Notification Model and Service
  - [x] 2.1 Create notificationModel.js with schema for notifications
    - Include recipient, type, title, message, data, isRead, readAt, emailSent, link fields
    - Add indexes for efficient querying by recipient and type
    - _Requirements: 6.4, 7.1_
  
  - [x] 2.2 Create notificationService.js with core notification functions
    - Implement createNotification, sendEmailNotification, notifyAdmins functions
    - Implement markAsRead, getUnreadCount, getUserNotifications functions
    - _Requirements: 6.3, 6.4, 7.3_
  
  - [x] 2.3 Write property test for notification creation
    - **Property 11: Notification Template Selection**
    - **Validates: Requirements 6.3, 6.4**

- [x] 3. Create Email Templates
  - [x] 3.1 Create email templates directory and base template structure
    - Create server/templates/emails/ directory
    - Implement base HTML email template with company branding
    - _Requirements: 6.3_
  
  - [x] 3.2 Implement specific email templates
    - REGISTRATION_CONFIRMATION template
    - REGISTRATION_ADMIN_ALERT template
    - STORE_APPROVED template
    - STORE_REJECTED template
    - ORDER_CONFIRMATION template
    - ORDER_STATUS_UPDATE template
    - _Requirements: 1.3, 1.4, 2.5, 4.1, 4.2_

- [x] 4. Update Registration Flow with Approval Status
  - [x] 4.1 Modify registerCtrl to set pending status and generate registrationRef
    - Update registration to set approvalStatus: "pending" for store role
    - Generate unique registrationRef using timestamp + random string
    - _Requirements: 1.1, 1.2_
  
  - [x] 4.2 Add notification triggers on registration
    - Send confirmation email to store owner
    - Send alert notification to all admin users
    - _Requirements: 1.3, 1.4_
  
  - [x] 4.3 Write property test for registration creates pending status
    - **Property 1: Registration Creates Pending Status with Unique Reference**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 4.4 Write property test for duplicate email prevention
    - **Property 2: Duplicate Email Prevention**
    - **Validates: Requirements 1.5**
  
  - [x] 4.5 Write property test for registration notifications
    - **Property 3: Registration Triggers Dual Notifications**
    - **Validates: Requirements 1.3, 1.4**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Admin Approval Endpoints
  - [x] 6.1 Create getPendingStoresCtrl endpoint
    - Return all stores with approvalStatus: "pending" sorted by createdAt
    - Include storeName, ownerName, email, phone, address, createdAt fields
    - _Requirements: 2.1, 2.2_
  
  - [x] 6.2 Create approveStoreCtrl endpoint
    - Update store approvalStatus to "approved"
    - Set approvedAt timestamp and approvedBy admin ID
    - Trigger approval notification to store owner
    - _Requirements: 2.3, 2.5_
  
  - [x] 6.3 Create rejectStoreCtrl endpoint
    - Update store approvalStatus to "rejected"
    - Set rejectedAt timestamp, rejectedBy admin ID, and rejectionReason
    - Trigger rejection notification to store owner
    - _Requirements: 2.4, 2.5_
  
  - [x] 6.4 Write property test for approval status transitions
    - **Property 4: Approval Status Transition Integrity**
    - **Validates: Requirements 2.3, 2.4**
  
  - [x] 6.5 Write property test for approval decision notifications
    - **Property 5: Approval Decision Notification**
    - **Validates: Requirements 2.5, 3.4**
  
  - [x] 6.6 Write property test for pending stores list
    - **Property 8: Pending Stores List Completeness and Ordering**
    - **Validates: Requirements 2.1, 2.2**

- [x] 7. Update Login Flow with Access Control
  - [x] 7.1 Modify loginCtrl to check approval status
    - For "pending" stores: allow login with limited access flag
    - For "approved" stores: allow login with full access
    - For "rejected" stores: deny login with rejection reason
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 7.2 Write property test for access control
    - **Property 6: Access Control Based on Approval Status**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 8. Create Notification API Endpoints
  - [x] 8.1 Create notificationCtrl.js with CRUD operations
    - getNotifications: Get user's notifications with pagination and filters
    - getUnreadCount: Get count of unread notifications
    - markAsRead: Mark single notification as read
    - markAllAsRead: Mark all notifications as read
    - deleteNotification: Delete a notification
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 8.2 Create notification routes
    - GET /api/notifications
    - GET /api/notifications/unread-count
    - PUT /api/notifications/:id/read
    - PUT /api/notifications/read-all
    - DELETE /api/notifications/:id
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 8.3 Write property test for notification read state
    - **Property 9: Notification Read State Consistency**
    - **Validates: Requirements 7.3**
  
  - [x] 8.4 Write property test for notification filtering
    - **Property 10: Notification Filtering Accuracy**
    - **Validates: Requirements 7.2, 7.4**

- [x] 9. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Add Order Notification Triggers
  - [x] 10.1 Modify order creation to trigger notifications
    - Send order confirmation to store owner
    - Send in-app notification to admin users
    - Check for high-value order threshold alert
    - _Requirements: 4.1, 4.3, 4.4_
  
  - [x] 10.2 Modify order status update to trigger notifications
    - Send status change notification to store owner
    - _Requirements: 4.2_
  
  - [x] 10.3 Write property test for order notifications
    - **Property 7: Order Events Create Notifications**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 11. Create Frontend API Services
  - [x] 11.1 Create notification API service functions
    - getNotifications, getUnreadCount, markAsRead, markAllAsRead
    - Add to services2/operations/notifications.js
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 11.2 Create approval API service functions
    - getPendingStores, approveStore, rejectStore
    - Add to services2/operations/auth.js
    - _Requirements: 2.1, 2.3, 2.4_

- [x] 12. Create Pending Approval Page Component
  - [x] 12.1 Create PendingApprovalPage.tsx
    - Display pending status message with registration reference
    - Show expected timeline and contact information
    - Redirect approved stores to dashboard
    - _Requirements: 3.1_
  
  - [x] 12.2 Update routing to show pending page for pending stores
    - Modify PrivateRoute to check approval status
    - Redirect pending stores to PendingApprovalPage
    - _Requirements: 3.1, 3.2_

- [x] 13. Create Admin Approval Dashboard
  - [x] 13.1 Create AdminApprovalDashboard.tsx component
    - Table displaying pending store registrations
    - Columns: Store Name, Owner, Email, Phone, Address, Submitted Date
    - Approve and Reject action buttons
    - _Requirements: 2.1, 2.2_
  
  - [x] 13.2 Create ApprovalConfirmDialog.tsx component
    - Confirmation dialog for approve action
    - Rejection dialog with reason input field
    - _Requirements: 2.3, 2.4_
  
  - [x] 13.3 Add approval dashboard to admin navigation
    - Add menu item in admin sidebar
    - Add badge showing pending count
    - _Requirements: 2.1_

- [x] 14. Create Notification Center Components
  - [x] 14.1 Create NotificationBadge.tsx component
    - Bell icon with unread count badge
    - Polling for real-time updates (every 30 seconds)
    - _Requirements: 7.4_
  
  - [x] 14.2 Create NotificationDropdown.tsx component
    - Dropdown showing recent notifications
    - Mark as read on click
    - Link to full notification center
    - _Requirements: 7.1, 7.3_
  
  - [x] 14.3 Create NotificationCenter.tsx page
    - Full list of notifications with pagination
    - Filter by type (registration, order, payment, system)
    - Mark all as read button
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 14.4 Integrate NotificationBadge into Navbar
    - Add notification bell to navbar for all users
    - Show dropdown on click
    - _Requirements: 7.4_

- [x] 15. Update Store Registration Page
  - [x] 15.1 Update StoreRegistration.tsx success handling
    - Show success message with registration reference
    - Display pending approval information
    - _Requirements: 1.1, 1.2_

- [x] 16. Final Checkpoint - Full Integration Testing
  - Ensure all tests pass, ask the user if questions arise.
  - Test complete registration → approval → login flow
  - Test notification delivery end-to-end

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check library
- Backend tasks (1-10) should be completed before frontend tasks (11-15)
