const QualityIssue = require("../models/qualityIssueModel");
const Order = require("../models/orderModle");
const Auth = require("../models/authModel");
const mailSender = require("../utils/mailSender");
const emailTemplates = require("../templates/emails/emailTemplates");

// Create a new quality issue (Store)
exports.createQualityIssue = async (req, res) => {
  try {
    const { orderId, orderNumber, issueType, description, affectedItems, images, requestedAction, requestedAmount } = req.body;
    
    // Debug: Log the entire req.user object
    console.log("req.user:", JSON.stringify(req.user, null, 2));
    
    const storeId = req.user?.id || req.user?._id || req.user?.userId;

    console.log("Extracted storeId:", storeId);

    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        message: "User ID not found in token",
        debug: { user: req.user }
      });
    }

    // Get store name
    const store = await Auth.findById(storeId);
    const storeName = store?.storeName || store?.name || "Unknown Store";

    const qualityIssue = new QualityIssue({
      orderId,
      orderNumber,
      storeId,
      storeName,
      issueType,
      description,
      affectedItems,
      images,
      requestedAction,
      requestedAmount,
      status: "pending",
      communications: []
    });

    await qualityIssue.save();

    res.status(201).json({
      success: true,
      message: "Quality issue reported successfully",
      issue: qualityIssue
    });
  } catch (error) {
    console.error("Create quality issue error:", error);
    res.status(500).json({ success: false, message: "Failed to create quality issue", error: error.message });
  }
};

// Get store's quality issues
exports.getStoreIssues = async (req, res) => {
  try {
    const storeId = req.user.id || req.user._id;
    const issues = await QualityIssue.find({ storeId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      issues
    });
  } catch (error) {
    console.error("Get store issues error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch issues", error: error.message });
  }
};

// Get all quality issues (Admin)
exports.getAllIssues = async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = {};
    if (status && status !== "all") {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { storeName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const issues = await QualityIssue.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      issues
    });
  } catch (error) {
    console.error("Get all issues error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch issues", error: error.message });
  }
};

// Add message to issue
exports.addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const sender = (req.user.role === "admin") ? "admin" : "store";

    const issue = await QualityIssue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    issue.communications.push({
      sender,
      message,
      timestamp: new Date()
    });

    await issue.save();

    res.status(200).json({
      success: true,
      message: "Message added",
      issue
    });
  } catch (error) {
    console.error("Add message error:", error);
    res.status(500).json({ success: false, message: "Failed to add message", error: error.message });
  }
};

// Resolve issue (Admin)
exports.resolveIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedAmount, resolution, createCreditMemo } = req.body;

    console.log("Resolving quality issue:", { id, status, approvedAmount, resolution });

    const issue = await QualityIssue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    issue.status = status;
    issue.approvedAmount = approvedAmount;
    issue.resolution = resolution;

    // Get store details for email - fetch regardless of action type
    const store = await Auth.findById(issue.storeId);
    console.log("Store found:", store ? { email: store.email, storeName: store.storeName } : "No store found");

    // If approved and requestedAction is "credit", add credit to store's balance
    if ((status === 'approved' || status === 'partially_approved') && approvedAmount > 0 && issue.requestedAction === 'credit') {
      if (store) {
        const balanceBefore = store.creditBalance || 0;
        const balanceAfter = balanceBefore + approvedAmount;

        // Update store's credit balance
        store.creditBalance = balanceAfter;

        // Add to credit history
        store.creditHistory = store.creditHistory || [];
        store.creditHistory.push({
          type: 'credit_issued',
          amount: approvedAmount,
          reference: issue._id.toString(),
          referenceModel: 'QualityIssue',
          reason: `Quality issue credit - ${issue.issueType}: ${issue.description.substring(0, 100)}`,
          balanceBefore,
          balanceAfter,
          performedBy: req.user?.id || req.user?._id,
          performedByName: req.user?.name || 'Admin',
          createdAt: new Date()
        });

        await store.save();

        issue.resolution = `${resolution} Credit of ${approvedAmount.toFixed(2)} added to store balance.`;
      }
    } else if (createCreditMemo && approvedAmount > 0) {
      // For non-credit actions (refund, replacement, etc.) with credit memo
      issue.resolution = `${resolution} Credit memo for ${approvedAmount.toFixed(2)} will be applied.`;
    }

    await issue.save();

    // Send email notification to store
    if (store && store.email) {
      console.log("Sending quality issue email to:", store.email, "Status:", status);
      try {
        const dashboardUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/store/quality-issues`;
        
        if (status === 'approved' || status === 'partially_approved') {
          // Send approval email
          console.log("Preparing approval email...");
          const htmlContent = emailTemplates.QUALITY_ISSUE_APPROVED({
            storeName: store.storeName || issue.storeName,
            orderNumber: issue.orderNumber,
            issueType: issue.issueType,
            requestedAmount: issue.requestedAmount?.toFixed(2),
            approvedAmount: approvedAmount?.toFixed(2),
            resolution: issue.resolution,
            requestedAction: issue.requestedAction,
            dashboardUrl: dashboardUrl,
          });

          const emailResult = await mailSender(
            store.email,
            `✅ Quality Issue Approved - Order #${issue.orderNumber}`,
            htmlContent
          );
          console.log(`Quality issue approval email sent to ${store.email}`, emailResult);
        } else if (status === 'rejected') {
          // Send rejection email
          console.log("Preparing rejection email...");
          const htmlContent = emailTemplates.QUALITY_ISSUE_REJECTED({
            storeName: store.storeName || issue.storeName,
            orderNumber: issue.orderNumber,
            issueType: issue.issueType,
            requestedAmount: issue.requestedAmount?.toFixed(2),
            resolution: resolution,
            dashboardUrl: dashboardUrl,
          });

          const emailResult = await mailSender(
            store.email,
            `❌ Quality Issue Update - Order #${issue.orderNumber}`,
            htmlContent
          );
          console.log(`Quality issue rejection email sent to ${store.email}`, emailResult);
        }
      } catch (emailError) {
        console.error("Failed to send quality issue email:", emailError);
        // Don't fail the resolution if email fails
      }
    } else {
      console.log("No store email found, skipping email notification");
    }

    res.status(200).json({
      success: true,
      message: "Issue resolved",
      issue
    });
  } catch (error) {
    console.error("Resolve issue error:", error);
    res.status(500).json({ success: false, message: "Failed to resolve issue", error: error.message });
  }
};

// Update issue status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const issue = await QualityIssue.findByIdAndUpdate(
      id,
      { status, adminNotes },
      { new: true }
    );

    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    res.status(200).json({
      success: true,
      message: "Status updated",
      issue
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
};
