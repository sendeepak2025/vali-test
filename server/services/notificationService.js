const Notification = require("../models/notificationModel");
const authModel = require("../models/authModel");
const mailSender = require("../utils/mailSender");
const emailTemplates = require("../templates/emails/emailTemplates");

/**
 * Notification Service
 * Handles creation and management of in-app and email notifications
 */
class NotificationService {
  /**
   * Create a notification for a specific user
   * @param {string} recipientId - User ID to receive notification
   * @param {string} type - Notification type
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {object} data - Additional data
   * @param {string} link - Optional link to navigate to
   * @returns {Promise<object>} Created notification
   */
  async createNotification(recipientId, type, title, message, data = {}, link = null) {
    try {
      const notification = await Notification.create({
        recipient: recipientId,
        type,
        title,
        message,
        data,
        link,
      });
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Send email notification with retry logic
   * @param {string} email - Recipient email
   * @param {string} subject - Email subject
   * @param {string} templateName - Template name from emailTemplates
   * @param {object} templateData - Data to pass to template
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<object>} Email send result
   */
  async sendEmailNotification(email, subject, templateName, templateData, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const template = emailTemplates[templateName];
        if (!template) {
          throw new Error(`Email template "${templateName}" not found`);
        }
        
        const htmlContent = template(templateData);
        const result = await mailSender(email, subject, htmlContent);
        
        if (result && !result.includes("Error")) {
          return { success: true, result };
        }
        lastError = result;
      } catch (error) {
        lastError = error.message;
        console.error(`Email send attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    console.error(`Failed to send email after ${maxRetries} attempts:`, lastError);
    return { success: false, error: lastError };
  }

  /**
   * Create notification and send email to a user
   * @param {string} recipientId - User ID
   * @param {string} email - User email
   * @param {string} type - Notification type
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} templateName - Email template name
   * @param {object} templateData - Email template data
   * @param {object} data - Additional notification data
   * @param {string} link - Optional link
   * @returns {Promise<object>} Notification with email status
   */
  async createNotificationWithEmail(recipientId, email, type, title, message, templateName, templateData, data = {}, link = null) {
    try {
      // Create in-app notification
      const notification = await this.createNotification(recipientId, type, title, message, data, link);
      
      // Send email
      const emailResult = await this.sendEmailNotification(email, title, templateName, templateData);
      
      // Update notification with email status
      notification.emailSent = emailResult.success;
      notification.emailSentAt = emailResult.success ? new Date() : null;
      notification.emailError = emailResult.success ? null : emailResult.error;
      await notification.save();
      
      return notification;
    } catch (error) {
      console.error("Error creating notification with email:", error);
      throw error;
    }
  }

  /**
   * Notify all admin users
   * @param {string} type - Notification type
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {object} data - Additional data
   * @param {string} link - Optional link
   * @param {boolean} sendEmail - Whether to send email
   * @param {string} templateName - Email template name (if sendEmail is true)
   * @param {object} templateData - Email template data
   * @returns {Promise<array>} Array of created notifications
   */
  async notifyAdmins(type, title, message, data = {}, link = null, sendEmail = false, templateName = null, templateData = {}) {
    try {
      const admins = await authModel.find({ role: "admin" });
      const notifications = [];
      
      for (const admin of admins) {
        let notification;
        
        if (sendEmail && templateName) {
          notification = await this.createNotificationWithEmail(
            admin._id,
            admin.email,
            type,
            title,
            message,
            templateName,
            templateData,
            data,
            link
          );
        } else {
          notification = await this.createNotification(admin._id, type, title, message, data, link);
        }
        
        notifications.push(notification);
      }
      
      return notifications;
    } catch (error) {
      console.error("Error notifying admins:", error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for verification)
   * @returns {Promise<object>} Updated notification
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );
      return notification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<object>} Update result
   */
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      return result;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });
      return count;
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw error;
    }
  }

  /**
   * Get notifications for a user with filters
   * @param {string} userId - User ID
   * @param {object} filters - Filter options
   * @param {string} filters.type - Filter by notification type
   * @param {boolean} filters.isRead - Filter by read status
   * @param {number} filters.page - Page number (default 1)
   * @param {number} filters.limit - Items per page (default 20)
   * @returns {Promise<object>} Paginated notifications
   */
  async getUserNotifications(userId, filters = {}) {
    try {
      const { type, isRead, page = 1, limit = 20 } = filters;
      
      const query = { recipient: userId };
      
      if (type) {
        query.type = type;
      }
      
      if (typeof isRead === "boolean") {
        query.isRead = isRead;
      }
      
      const skip = (page - 1) * limit;
      
      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(query),
      ]);
      
      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting user notifications:", error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for verification)
   * @returns {Promise<object>} Deleted notification
   */
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId,
      });
      return notification;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
