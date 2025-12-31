/**
 * Email Templates for Notification System
 * Each template is a function that takes data and returns HTML string
 */

// Helper function to generate items table HTML
const generateItemsTable = (items) => {
  if (!items || items.length === 0) return '';
  
  let tableRows = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.productName || item.name || 'Product'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity || 0}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.unitPrice || item.price || 0).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${((item.quantity || 0) * (item.unitPrice || item.price || 0)).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <h3 style="margin-top: 20px; color: #374151;">Order Items</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background: #f8fafc;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
};

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
      
      <p>You now have full access to the Vali Produce platform.</p>
      
      <a href="${data.loginUrl || '#'}" class="button">Login to Your Account</a>
      
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
      
      ${data.rejectionReason ? `<p><strong>Reason:</strong> ${data.rejectionReason}</p>` : ''}
      
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
      </div>
      
      ${generateItemsTable(data.items)}
      
      <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="font-size: 18px; color: #22c55e;">$${data.total || '0.00'}</span></p>
      </div>
      
      <p>You can track your order status in your dashboard.</p>
      
      <a href="${data.orderUrl || (process.env.CLIENT_URL + '/store/dashboard')}" class="button">View your order</a>
      
      <p>Thank you for your business!</p>
    </div>
  `, 'Order Confirmed'),

  /**
   * Order updated email
   */
  ORDER_UPDATED: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
      <h1>📝 Order Updated</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'Valued Customer'}</strong>,</p>
      
      <p>Your order has been updated.</p>
      
      <div class="info-box">
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Updated On:</strong> ${data.orderDate || new Date().toLocaleDateString()}</p>
      </div>
      
      ${generateItemsTable(data.items)}
      
      <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="font-size: 18px; color: #f59e0b;">$${data.total || '0.00'}</span></p>
      </div>
      
      <p>You can view your updated order details in your dashboard.</p>
      
      <a href="${data.orderUrl || (process.env.CLIENT_URL + '/store/dashboard')}" class="button">View your order</a>
      
      <p>Thank you for your business!</p>
    </div>
  `, 'Order Updated'),

  /**
   * PreOrder created email
   */
  PREORDER_CREATED: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
      <h1>📋 PreOrder Created!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'Valued Customer'}</strong>,</p>
      
      <p>Your preorder has been created successfully.</p>
      
      <div class="info-box">
        <p><strong>PreOrder Number:</strong> ${data.preOrderNumber}</p>
        <p><strong>Created On:</strong> ${data.orderDate || new Date().toLocaleDateString()}</p>
      </div>
      
      ${generateItemsTable(data.items)}
      
      <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="font-size: 18px; color: #8b5cf6;">$${data.total || '0.00'}</span></p>
      </div>
      
      <p>Your preorder is pending confirmation. You can view your preorder details in your dashboard.</p>
      
      <a href="${data.orderUrl || (process.env.CLIENT_URL + '/store/dashboard')}" class="button">View your preorder</a>
      
      <p>Thank you for your business!</p>
    </div>
  `, 'PreOrder Created'),

  /**
   * PreOrder confirmed email
   */
  PREORDER_CONFIRMED: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
      <h1>✅ PreOrder Confirmed!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'Valued Customer'}</strong>,</p>
      
      <p>Great news! Your preorder has been confirmed and converted to an order.</p>
      
      <div class="success-box">
        <p><strong>PreOrder Number:</strong> ${data.preOrderNumber}</p>
        <p><strong>New Order Number:</strong> ${data.orderNumber}</p>
      </div>
      
      <div class="info-box">
        <p><strong>Confirmed On:</strong> ${data.orderDate || new Date().toLocaleDateString()}</p>
      </div>
      
      ${generateItemsTable(data.items)}
      
      <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="font-size: 18px; color: #22c55e;">$${data.total || '0.00'}</span></p>
      </div>
      
      <p>Your order is now being processed. You can track your order status in your dashboard.</p>
      
      <a href="${data.orderUrl || (process.env.CLIENT_URL + '/store/dashboard')}" class="button">View your order</a>
      
      <p>Thank you for your business!</p>
    </div>
  `, 'PreOrder Confirmed'),

  /**
   * PreOrder updated email
   */
  PREORDER_UPDATED: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
      <h1>📝 PreOrder Updated</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'Valued Customer'}</strong>,</p>
      
      <p>Your preorder has been updated.</p>
      
      <div class="info-box">
        <p><strong>PreOrder Number:</strong> ${data.preOrderNumber}</p>
        <p><strong>Updated On:</strong> ${data.orderDate || new Date().toLocaleDateString()}</p>
      </div>
      
      ${generateItemsTable(data.items)}
      
      <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="font-size: 18px; color: #f59e0b;">$${data.total || '0.00'}</span></p>
      </div>
      
      <p>You can view your updated preorder details in your dashboard.</p>
      
      <a href="${data.orderUrl || (process.env.CLIENT_URL + '/store/dashboard')}" class="button">View your preorder</a>
      
      <p>Thank you for your business!</p>
    </div>
  `, 'PreOrder Updated'),

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
      </div>
      
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
        <p><strong>Outstanding Balance:</strong> $${data.balanceDue || '0.00'}</p>
      </div>
      
      <p>Please arrange payment at your earliest convenience.</p>
    </div>
  `, 'Payment Reminder'),

  /**
   * Password reset email template
   */
  PASSWORD_RESET: (data) => baseTemplate(`
    <div class="header">
      <h1>🔐 Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'User'}</strong>,</p>
      <p>We received a request to reset your password.</p>
      
      <p>Click the button below to reset your password:</p>
      <a href="${data.resetUrl}" class="button">Reset Password</a>
      
      <div class="warning-box">
        <p>This link will expire in ${data.expiryTime || '1 hour'}.</p>
      </div>
    </div>
  `, 'Password Reset Request'),

  /**
   * Password changed confirmation email
   */
  PASSWORD_CHANGED: (data) => baseTemplate(`
    <div class="header">
      <h1>✅ Password Changed Successfully</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'User'}</strong>,</p>
      <p>Your password has been successfully changed.</p>
      
      <div class="success-box">
        <p><strong>Change Time:</strong> ${data.changeTime || new Date().toLocaleString()}</p>
      </div>
      
      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/auth" class="button">Login to Account</a>
    </div>
  `, 'Password Changed Successfully'),

  /**
   * Login OTP verification email
   */
  LOGIN_OTP: (data) => baseTemplate(`
    <div class="header">
      <h1>🔐 Login Verification Code</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.name || 'User'}</strong>,</p>
      <p>Your one-time verification code is:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 10px;">
          ${data.otp}
        </div>
      </div>
      
      <div class="warning-box">
        <p><strong>⏰ This code expires in 5 minutes</strong></p>
      </div>
    </div>
  `, 'Login Verification Code'),

  /**
   * Store Order OTP verification email
   */
  STORE_ORDER_OTP: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
      <h1>🛒 Order Verification Code</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.name || 'Store Owner'}</strong>,</p>
      <p>Your one-time verification code for placing an order is:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 10px;">
          ${data.otp}
        </div>
      </div>
      
      <div class="warning-box">
        <p><strong>⏰ This code expires in 5 minutes</strong></p>
      </div>
    </div>
  `, 'Order Verification Code'),

  /**
   * Admin alert for new store registration
   */
  REGISTRATION_ADMIN_ALERT: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
      <h1>🏪 New Store Registration</h1>
    </div>
    <div class="content">
      <p>A new store has registered and requires approval.</p>
      
      <div class="warning-box">
        <p><strong>Action Required:</strong> Please review and approve/reject this registration.</p>
      </div>
      
      <div class="info-box">
        <p><strong>Registration Reference:</strong> ${data.registrationRef || 'N/A'}</p>
        <p><strong>Store Name:</strong> ${data.storeName}</p>
        <p><strong>Owner Name:</strong> ${data.ownerName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
      </div>
      
      <h3 style="margin-top: 20px; color: #374151;">Business Address</h3>
      <div class="info-box">
        <p><strong>Address:</strong> ${data.address || 'N/A'}</p>
        <p><strong>City:</strong> ${data.city || 'N/A'}</p>
        <p><strong>State:</strong> ${data.state || 'N/A'}</p>
        <p><strong>Zip Code:</strong> ${data.zipCode || 'N/A'}</p>
      </div>
      
      ${data.businessDescription ? `
      <h3 style="margin-top: 20px; color: #374151;">Business Description</h3>
      <div class="info-box">
        <p>${data.businessDescription}</p>
      </div>
      ` : ''}
      
      <a href="${data.dashboardUrl || '#'}" class="button">Review Registration</a>
      
      <p style="margin-top: 20px; color: #666; font-size: 14px;">Please review this registration at your earliest convenience.</p>
    </div>
  `, 'New Store Registration'),

  /**
   * Store created by admin - welcome email
   */
  STORE_CREATED: (data) => baseTemplate(`
    <div class="header">
      <h1>🎉 Welcome to Vali Produce!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.ownerName || 'Store Owner'}</strong>,</p>
      
      <div class="success-box">
        <p>Your store <strong>${data.storeName}</strong> has been created and is ready to use!</p>
      </div>
      
      <div class="info-box">
        <p><strong>Store Name:</strong> ${data.storeName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Price Category:</strong> ${data.priceCategory || 'Standard'}</p>
      </div>
      
      <p>You can now log in to your account and start placing orders.</p>
      
      ${data.tempPassword ? `
      <div class="warning-box">
        <p><strong>Your temporary password:</strong> ${data.tempPassword}</p>
        <p>Please change your password after your first login.</p>
      </div>
      ` : ''}
      
      <a href="${data.loginUrl || '#'}" class="button">Login to Your Account</a>
      
      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Welcome aboard!<br>The Vali Produce Team</p>
    </div>
  `, 'Welcome to Vali Produce'),

  /**
   * New price list notification email
   */
  NEW_PRICE_LIST: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #10b981, #059669);">
      <h1>📋 New Price List Available!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'Valued Customer'}</strong>,</p>
      
      <div class="success-box">
        <p>A new price list has been published and is now available for you!</p>
      </div>
      
      <div class="info-box">
        <p><strong>Price List:</strong> ${data.priceListName}</p>
        ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
        <p><strong>Published On:</strong> ${data.publishedDate || new Date().toLocaleDateString()}</p>
        <p><strong>Total Products:</strong> ${data.productCount || 0} items</p>
      </div>
      
      <p>Check out the latest prices and place your orders today!</p>
      
      <a href="${data.priceListUrl || (process.env.CLIENT_URL + '/store/mobile')}" class="button">View Price List</a>
      
      <p>Thank you for your continued business!</p>
      
      <p>Best regards,<br>The Vali Produce Team</p>
    </div>
  `, 'New Price List Available'),

  /**
   * Price list updated notification email
   */
  PRICE_LIST_UPDATED: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
      <h1>📋 Price List Updated!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'Valued Customer'}</strong>,</p>
      
      <div class="warning-box">
        <p>Our price list has been updated with new prices!</p>
      </div>
      
      <div class="info-box">
        <p><strong>Price List:</strong> ${data.priceListName}</p>
        ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
        <p><strong>Updated On:</strong> ${data.updatedDate || new Date().toLocaleDateString()}</p>
        <p><strong>Total Products:</strong> ${data.productCount || 0} items</p>
      </div>
      
      <p>Please review the updated prices before placing your next order.</p>
      
      <a href="${data.priceListUrl || (process.env.CLIENT_URL + '/store/mobile')}" class="button">View Updated Prices</a>
      
      <p>Thank you for your continued business!</p>
      
      <p>Best regards,<br>The Vali Produce Team</p>
    </div>
  `, 'Price List Updated'),

  /**
   * Quality issue approved notification email
   */
  QUALITY_ISSUE_APPROVED: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
      <h1>✅ Quality Issue Approved</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'Valued Customer'}</strong>,</p>
      
      <div class="success-box">
        <p>Your quality issue has been reviewed and approved!</p>
      </div>
      
      <div class="info-box">
        <p><strong>Order Number:</strong> ${data.orderNumber || 'N/A'}</p>
        <p><strong>Issue Type:</strong> ${data.issueType || 'N/A'}</p>
        <p><strong>Requested Amount:</strong> $${data.requestedAmount || '0.00'}</p>
        <p><strong>Approved Amount:</strong> $${data.approvedAmount || '0.00'}</p>
        <p><strong>Resolution:</strong> ${data.resolution || 'N/A'}</p>
      </div>
      
      ${data.requestedAction === 'credit' ? `
      <div class="success-box">
        <p><strong>Credit Applied:</strong> $${data.approvedAmount || '0.00'} has been added to your store credit balance.</p>
      </div>
      ` : ''}
      
      <a href="${data.dashboardUrl || '#'}" class="button">View Details</a>
      
      <p>Thank you for bringing this to our attention.</p>
      
      <p>Best regards,<br>The Vali Produce Team</p>
    </div>
  `, 'Quality Issue Approved'),

  /**
   * Quality issue rejected notification email
   */
  QUALITY_ISSUE_REJECTED: (data) => baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
      <h1>❌ Quality Issue Update</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.storeName || 'Valued Customer'}</strong>,</p>
      
      <div class="error-box">
        <p>Your quality issue has been reviewed and could not be approved at this time.</p>
      </div>
      
      <div class="info-box">
        <p><strong>Order Number:</strong> ${data.orderNumber || 'N/A'}</p>
        <p><strong>Issue Type:</strong> ${data.issueType || 'N/A'}</p>
        <p><strong>Requested Amount:</strong> $${data.requestedAmount || '0.00'}</p>
      </div>
      
      ${data.resolution ? `
      <div class="warning-box">
        <p><strong>Reason:</strong> ${data.resolution}</p>
      </div>
      ` : ''}
      
      <p>If you have any questions or would like to discuss this further, please contact us.</p>
      
      <a href="${data.dashboardUrl || '#'}" class="button">View Details</a>
      
      <p>Best regards,<br>The Vali Produce Team</p>
    </div>
  `, 'Quality Issue Update'),
};

module.exports = emailTemplates;
