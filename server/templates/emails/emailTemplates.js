/**
 * Email Templates for Notification System
 * Each template is a function that takes data and returns HTML string
 */

const baseTemplate = (content, title) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .info-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }
    .success-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 15px 0; }
    .warning-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    .error-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>© ${new Date().getFullYear()} Vali Produce. All rights reserved.</p>
      <p>This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;

const emailTemplates = {
  /**
   * Registration confirmation email to store owner
   */
  REGISTRATION_CONFIRMATION: (data) => baseTemplate(`
    <div class="header">
      <h1>🎉 Registration Received!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.ownerName || 'Store Owner'}</strong>,</p>
      <p>Thank you for registering <strong>${data.storeName}</strong> with Vali Produce!</p>
      
      <div class="info-box">
        <p><strong>Registration Reference:</strong> ${data.registrationRef}</p>
        <p><strong>Store Name:</strong> ${data.storeName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Status:</strong> Pending Approval</p>
      </div>
      
      <p>Your registration is currently under review. Our team will review your application and you will receive an email once your account has been approved.</p>
      
      <p>This process typically takes 1-2 business days.</p>
      
      <p>If you have any questions, please contact our support team.</p>
      
      <p>Best regards,<br>The Vali Produce Team</p>
    </div>
  `, 'Registration Received'),

  /**
   * New registration alert to admin
   */
  REGISTRATION_ADMIN_ALERT: (data) => baseTemplate(`
    <div class="header">
      <h1>🏪 New Store Registration</h1>
    </div>
    <div class="content">
      <p>A new store has registered and requires approval:</p>
      
      <div class="info-box">
        <p><strong>Registration Ref:</strong> ${data.registrationRef}</p>
        <p><strong>Store Name:</strong> ${data.storeName}</p>
        <p><strong>Owner Name:</strong> ${data.ownerName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
        <p><strong>Address:</strong> ${data.address}, ${data.city}, ${data.state} ${data.zipCode}</p>
        <p><strong>Business Description:</strong> ${data.businessDescription || 'N/A'}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <p>Please review this registration in the admin dashboard.</p>
      
      <a href="${data.dashboardUrl || '#'}" class="button">Review Registration</a>
    </div>
  `, 'New Store Registration'),

  /**
   * Store approved notification
   */
  STORE_APPROVED: (data) => baseTemplate(`
    <div class="header">
      <h1>✅ Account Approved!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.ownerName || 'Store Owner'}</strong>,</p>
      
      <div class="success-box">
        <p>Great news! Your store <strong>${data.storeName}</strong> has been approved!</p>
      </div>
      
      <p>You now have full access to the Vali Produce platform. Here's what you can do:</p>
      
      <ul>
        <li>Browse our product catalog</li>
        <li>Place orders for your store</li>
        <li>Track your order history</li>
        <li>Manage your store profile</li>
      </ul>
      
      <a href="${data.loginUrl || '#'}" class="button">Login to Your Account</a>
      
      <p>If you have any questions or need assistance, our support team is here to help.</p>
      
      <p>Welcome aboard!<br>The Vali Produce Team</p>
    </div>
  `, 'Account Approved'),

  /**
   * Store rejected notification
   */
  STORE_REJECTED: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
      <h1>Registration Update</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.ownerName || 'Store Owner'}</strong>,</p>
      
      <div class="error-box">
        <p>We regret to inform you that your registration for <strong>${data.storeName}</strong> could not be approved at this time.</p>
      </div>
      
      ${data.rejectionReason ? `
      <p><strong>Reason:</strong></p>
      <p>${data.rejectionReason}</p>
      ` : ''}
      
      <p>If you believe this decision was made in error or would like to provide additional information, please contact our support team.</p>
      
      <p>You may also submit a new registration with updated information.</p>
      
      <p>Best regards,<br>The Vali Produce Team</p>
    </div>
  `, 'Registration Update'),

  /**
   * Order confirmation email
   */
  ORDER_CONFIRMATION: (data) => baseTemplate(`
    <div class="header">
      <h1>📦 Order Confirmed!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'Valued Customer'}</strong>,</p>
      
      <p>Your order has been received and is being processed.</p>
      
      <div class="info-box">
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Order Date:</strong> ${data.orderDate || new Date().toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> $${data.total?.toFixed(2) || '0.00'}</p>
        <p><strong>Items:</strong> ${data.itemCount || 0} items</p>
      </div>
      
      <p>You can track your order status in your dashboard.</p>
      
      <a href="${data.orderUrl || '#'}" class="button">View Order Details</a>
      
      <p>Thank you for your business!</p>
    </div>
  `, 'Order Confirmed'),

  /**
   * Order status update email
   */
  ORDER_STATUS_UPDATE: (data) => baseTemplate(`
    <div class="header">
      <h1>📋 Order Status Update</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'Valued Customer'}</strong>,</p>
      
      <p>Your order status has been updated:</p>
      
      <div class="info-box">
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>New Status:</strong> ${data.status}</p>
        ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
      </div>
      
      ${data.statusMessage ? `<p>${data.statusMessage}</p>` : ''}
      
      <a href="${data.orderUrl || '#'}" class="button">View Order</a>
    </div>
  `, 'Order Status Update'),

  /**
   * Payment reminder email
   */
  PAYMENT_REMINDER: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
      <h1>💳 Payment Reminder</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'Valued Customer'}</strong>,</p>
      
      <div class="warning-box">
        <p>This is a friendly reminder that you have an outstanding balance.</p>
      </div>
      
      <div class="info-box">
        <p><strong>Outstanding Balance:</strong> $${data.balanceDue?.toFixed(2) || '0.00'}</p>
        <p><strong>Oldest Invoice Date:</strong> ${data.oldestInvoiceDate || 'N/A'}</p>
      </div>
      
      <p>Please arrange payment at your earliest convenience to avoid any service interruptions.</p>
      
      <p>If you have already made this payment, please disregard this notice.</p>
      
      <p>For questions about your account, please contact our team.</p>
    </div>
  `, 'Payment Reminder'),

  /**
   * High value order alert to admin
   */
  HIGH_VALUE_ORDER_ALERT: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
      <h1>💰 High Value Order Alert</h1>
    </div>
    <div class="content">
      <p>A high value order has been placed:</p>
      
      <div class="success-box">
        <p><strong>Order Total:</strong> $${data.total?.toFixed(2) || '0.00'}</p>
      </div>
      
      <div class="info-box">
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Store:</strong> ${data.storeName}</p>
        <p><strong>Items:</strong> ${data.itemCount || 0} items</p>
        <p><strong>Order Date:</strong> ${data.orderDate || new Date().toLocaleString()}</p>
      </div>
      
      <a href="${data.orderUrl || '#'}" class="button">View Order</a>
    </div>
  `, 'High Value Order Alert'),
};

module.exports = emailTemplates;
