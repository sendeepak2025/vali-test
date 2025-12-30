const mailSender = require("../utils/mailSender");


exports.priceListSend = async (req, res) => {
  try {
      const { data, subject, message, cc, bcc } = req.body;
      const file = req.files?.attachments;

      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background: #ffffff;">
        <h2 style="color: #333; text-align: center;">📜 Your Price List is Ready!</h2>
        <p style="color: #555; text-align: center; font-size: 16px;">Hello, we have attached the latest price list for you. You can download the PDF or check our online store.</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <a href="https://www.valiproduce.shop/store/template?storeId=1234&templateId=${message}" 
             style="display: inline-block; background: #007bff; color: white; padding: 12px 20px; font-size: 16px; border-radius: 5px; text-decoration: none;">
            View Online
          </a>
        </div>

       

       

        <p style="color: #666; font-size: 14px; text-align: center;">If you have any questions, feel free to contact us.</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

        <p style="color: #888; font-size: 12px; text-align: center;">This is an automated email, please do not reply.</p>
      </div>
    `;

      const response = await mailSender(data, subject, html, file, cc, bcc);

      return res.status(200).json({
          success: true,
          message: "Message Sent Successfully!"
      });
  } catch (error) {
      console.error(error);
      return res.status(500).json({
          success: false,
          message: "Error in sending email"
      });
  }
}


exports.priceListSendMulti = async (req, res) => {
  try {
    const { url, selectedStore } = req.body;

    if (!url || !selectedStore || !Array.isArray(selectedStore)) {
      return res.status(400).json({
        success: false,
        message: "Missing url or selected stores",
      });
    }

    // HTML content for the email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background: #ffffff;">
        <h2 style="color: #333; text-align: center;">📜 Your Price List is Ready!</h2>
        <p style="color: #555; text-align: center; font-size: 16px;">Hello, we have the latest price list for you. You can check our online store.</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <a href="${url}"
             style="display: inline-block; background: #007bff; color: white; padding: 12px 20px; font-size: 16px; border-radius: 5px; text-decoration: none;">
            View Online
          </a>
        </div>

        <p style="color: #666; font-size: 14px; text-align: center;">If you have any questions, feel free to contact us.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #888; font-size: 12px; text-align: center;">This is an automated email, please do not reply.</p>
      </div>
    `;

    const subject = "📜 New Price List Available";

    // Optional: add file, cc, bcc if needed
    const file = null;
    const cc = null;
    const bcc = null;

    // Send email to each selected store
    for (const store of selectedStore) {
      const email = store.value;
      const data = { email };

      await mailSender(email, subject, html, file, cc, bcc);
    }

    return res.status(200).json({
      success: true,
      message: "Messages sent successfully!",
    });

  } catch (error) {
    console.error("Email sending error:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending emails",
    });
  }
};


exports.sendByPriceCategory = async (req, res) => {
  try {
    const { templateId } = req.body;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: "Template ID is required",
      });
    }

    const authModel = require("../models/authModel");

    const stores = await authModel.find({ 
      role: "store",
      email: { $exists: true, $ne: "" }
    }).select('email storeName priceCategory');

    if (!stores || stores.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No stores found",
      });
    }

    const priceCategoryLabels = {
      "aPrice": "Price List A",
      "bPrice": "Price List B",
      "cPrice": "Price List C",
      "restaurantPrice": "Restaurant Price",
      // Legacy fallbacks
      "pricePerBox": "Price List A",
      "price": "Price List A"
    };

    let successCount = 0;
    let failCount = 0;

    for (const store of stores) {
      try {
        const priceCategory = store.priceCategory || "aPrice";
        const priceLabel = priceCategoryLabels[priceCategory] || "Price List A";

        // const url = `http://valiproduce.shop/store/template?templateId=${templateId}&cat=${catValue}`;
const url = `${process.env.CLIENT_URL}/store/mobile`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background: #ffffff;">
            <h2 style="color: #333; text-align: center;">📜 Your Price List is Ready!</h2>
            <p style="color: #555; text-align: center; font-size: 16px;">Hello <strong>${store.storeName}</strong>, we have the latest price list for you with your special pricing.</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${url}"
                 style="display: inline-block; background: #007bff; color: white; padding: 12px 20px; font-size: 16px; border-radius: 5px; text-decoration: none;">
                View Your Price List
              </a>
            </div>
            <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #333; font-size: 14px; margin: 0;">
                <strong>Your Price List:</strong> ${priceLabel}
              </p>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center;">If you have any questions, feel free to contact us.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">This is an automated email, please do not reply.</p>
          </div>
        `;

        const subject = `📜 New Price List Available - ${priceLabel}`;

        // ❌ MAIL SENDING DISABLED
        // await mailSender(store.email, subject, html, null, null, null);

        successCount++;

      } catch (emailError) {
        console.error(`❌ Failed (debug) for ${store.email}:`, emailError);
        failCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Debug mode: Mail sending is disabled",
      totalStores: stores.length,
      totalProcessed: successCount,
      totalFailed: failCount,
    });

  } catch (error) {
    console.error("Send by price category error:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending emails by price category (debug mode)",
      error: error.message,
    });
  }
};



// Send Credit Memo Email
exports.sendCreditMemoEmail = async (req, res) => {
  try {
    const { 
      orderId, 
      creditMemoId, 
      creditMemoNumber, 
      customerEmail, 
      customerName,
      pdfBase64 
    } = req.body;

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: "Customer email is required",
      });
    }

    const subject = `Credit Memo ${creditMemoNumber} - Vali Produce`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background: #ffffff;">
        <h2 style="color: #2962ff; text-align: center;">📄 Credit Memo</h2>
        <p style="color: #555; font-size: 16px;">Hello ${customerName || 'Valued Customer'},</p>
        <p style="color: #555; font-size: 16px;">Please find attached your credit memo <strong>${creditMemoNumber}</strong>.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #333; font-size: 14px; margin: 0;">
            <strong>Credit Memo #:</strong> ${creditMemoNumber}
          </p>
        </div>

        <p style="color: #666; font-size: 14px;">If you have any questions about this credit memo, please don't hesitate to contact us.</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

        <p style="color: #888; font-size: 12px; text-align: center;">
          Vali Produce LLC<br>
          4300 Pleasantdale Rd, Atlanta, GA 30340<br>
          order@valiproduce.shop
        </p>
      </div>
    `;

    // Convert base64 PDF to buffer for attachment
    let attachments = [];
    if (pdfBase64) {
      const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      attachments = [{
        filename: `credit-memo-${creditMemoNumber}.pdf`,
        content: Buffer.from(base64Data, 'base64'),
        contentType: 'application/pdf'
      }];
    }

    const nodemailer = require("nodemailer");
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      secure: false,
    });

    await transporter.sendMail({
      from: "order@valiproduce.shop",
      to: customerEmail,
      subject: subject,
      html: html,
      attachments: attachments
    });

    return res.status(200).json({
      success: true,
      message: "Credit memo email sent successfully!",
    });

  } catch (error) {
    console.error("Send credit memo email error:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending credit memo email",
      error: error.message,
    });
  }
};


// Send Work Order Email
exports.sendWorkOrderEmail = async (req, res) => {
  try {
    const { 
      orderId, 
      workOrderNumber, 
      assignedTo,
      department,
      priority,
      customerEmail,
      customerName,
      pdfBase64 
    } = req.body;

    // Work orders are typically sent internally, but can also go to customer
    const recipientEmail = customerEmail || process.env.INTERNAL_EMAIL || "order@valiproduce.shop";

    const subject = `Work Order ${workOrderNumber} - ${priority ? priority.toUpperCase() : 'NORMAL'} Priority`;
    
    const priorityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545'
    };
    const priorityColor = priorityColors[priority] || '#6c757d';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background: #ffffff;">
        <h2 style="color: #2962ff; text-align: center;">🔧 Work Order</h2>
        <p style="color: #555; font-size: 16px;">A new work order has been created and assigned.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #333; font-size: 14px; margin: 5px 0;">
            <strong>Work Order #:</strong> ${workOrderNumber}
          </p>
          <p style="color: #333; font-size: 14px; margin: 5px 0;">
            <strong>Assigned To:</strong> ${assignedTo || 'Unassigned'}
          </p>
          <p style="color: #333; font-size: 14px; margin: 5px 0;">
            <strong>Department:</strong> ${department || 'N/A'}
          </p>
          <p style="color: #333; font-size: 14px; margin: 5px 0;">
            <strong>Priority:</strong> <span style="color: ${priorityColor}; font-weight: bold;">${(priority || 'normal').toUpperCase()}</span>
          </p>
          ${customerName ? `<p style="color: #333; font-size: 14px; margin: 5px 0;"><strong>Customer:</strong> ${customerName}</p>` : ''}
        </div>

        <p style="color: #666; font-size: 14px;">Please review the attached work order PDF for complete details and instructions.</p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

        <p style="color: #888; font-size: 12px; text-align: center;">
          Vali Produce LLC<br>
          4300 Pleasantdale Rd, Atlanta, GA 30340<br>
          order@valiproduce.shop
        </p>
      </div>
    `;

    // Convert base64 PDF to buffer for attachment
    let attachments = [];
    if (pdfBase64) {
      const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      attachments = [{
        filename: `work-order-${workOrderNumber}.pdf`,
        content: Buffer.from(base64Data, 'base64'),
        contentType: 'application/pdf'
      }];
    }

    const nodemailer = require("nodemailer");
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      secure: false,
    });

    await transporter.sendMail({
      from: "order@valiproduce.shop",
      to: recipientEmail,
      subject: subject,
      html: html,
      attachments: attachments
    });

    return res.status(200).json({
      success: true,
      message: "Work order email sent successfully!",
    });

  } catch (error) {
    console.error("Send work order email error:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending work order email",
      error: error.message,
    });
  }
};
