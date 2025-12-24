const authModel = require("../models/authModel");

// Terms and Conditions content (version controlled)
const CURRENT_TERMS_VERSION = "1.0.0";
const TERMS_CONTENT = `
VALI PRODUCE - TERMS AND CONDITIONS

Last Updated: December 2024
Version: ${CURRENT_TERMS_VERSION}

1. AGREEMENT TO TERMS
By registering for an account, placing orders, or using any services provided by Vali Produce, you agree to be bound by these Terms and Conditions.

2. PAYMENT TERMS
2.1 Payment Due Date: All invoices are due and payable within seven (7) days from the date of invoice.
2.2 Late Payment Interest: Any payment not received by the due date shall accrue interest at a rate of 1.5% per month (18% per annum).
2.3 Returned Check Fee: A fee of $50.00 will be charged for any check returned due to insufficient funds.

3. ORDERS AND DELIVERY
3.1 All orders are subject to acceptance and availability.
3.2 Prices are subject to change without notice due to market conditions.
3.3 Claims for damaged or incorrect products must be reported within 24 hours of delivery.

4. LEGAL TERMS
4.1 Collection Actions: In the event of non-payment, Vali Produce reserves the right to pursue all available legal remedies.
4.2 Attorney's Fees: You agree to pay all costs of collection, including reasonable attorney's fees up to 35% of the outstanding balance.
4.3 Governing Law: These Terms shall be governed by the laws of the State of Georgia.
4.4 Jurisdiction: Any legal action shall be brought exclusively in the courts located in Fulton County, Atlanta, Georgia.
4.5 Personal Guarantee: Principals and owners agree to be personally liable for all debts incurred.
4.6 Waiver of Jury Trial: Each party waives any right to a jury trial.

5. LIMITATION OF LIABILITY
Vali Produce shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
`;

/**
 * Record terms acceptance during registration
 */
const recordTermsAcceptance = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { acceptedByName, acceptedByEmail } = req.body;
    
    const store = await authModel.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // Update terms acceptance
    store.termsAcceptance = {
      acceptedAt: new Date(),
      acceptedVersion: CURRENT_TERMS_VERSION,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    };

    // Add legal document record
    store.legalDocuments.push({
      documentType: "terms_acceptance",
      documentName: `Terms and Conditions v${CURRENT_TERMS_VERSION}`,
      description: "Terms and Conditions acceptance at registration",
      documentContent: TERMS_CONTENT,
      documentVersion: CURRENT_TERMS_VERSION,
      acceptedAt: new Date(),
      acceptedByName: acceptedByName || store.ownerName,
      acceptedByEmail: acceptedByEmail || store.email,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
      status: "verified",
    });

    await store.save();

    return res.status(200).json({
      success: true,
      message: "Terms acceptance recorded",
      termsVersion: CURRENT_TERMS_VERSION,
    });
  } catch (error) {
    console.error("Error recording terms acceptance:", error);
    return res.status(500).json({ success: false, message: "Error recording terms acceptance" });
  }
};

/**
 * Get all legal documents for a store
 */
const getStoreLegalDocuments = async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const store = await authModel.findById(storeId)
      .select("storeName ownerName email legalDocuments creditAgreements currentCreditTerms businessInfo termsAcceptance registrationRef");
    
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    return res.status(200).json({
      success: true,
      store: {
        _id: store._id,
        storeName: store.storeName,
        ownerName: store.ownerName,
        email: store.email,
        registrationRef: store.registrationRef,
      },
      legalDocuments: store.legalDocuments || [],
      creditAgreements: store.creditAgreements || [],
      currentCreditTerms: store.currentCreditTerms,
      businessInfo: store.businessInfo,
      termsAcceptance: store.termsAcceptance,
    });
  } catch (error) {
    console.error("Error fetching legal documents:", error);
    return res.status(500).json({ success: false, message: "Error fetching legal documents" });
  }
};

/**
 * Add a legal document to store account
 */
const addLegalDocument = async (req, res) => {
  try {
    const { storeId } = req.params;
    const {
      documentType,
      documentName,
      description,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      expiryDate,
      adminNotes,
    } = req.body;

    const store = await authModel.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const newDocument = {
      documentType,
      documentName,
      description,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      adminNotes,
      status: "received",
      uploadedBy: req.user?.id,
      uploadedByName: req.user?.name || req.user?.email,
    };

    store.legalDocuments.push(newDocument);
    await store.save();

    const addedDoc = store.legalDocuments[store.legalDocuments.length - 1];

    return res.status(201).json({
      success: true,
      message: "Document added successfully",
      document: addedDoc,
    });
  } catch (error) {
    console.error("Error adding legal document:", error);
    return res.status(500).json({ success: false, message: "Error adding document" });
  }
};

/**
 * Update legal document status (verify, reject, etc.)
 */
const updateLegalDocumentStatus = async (req, res) => {
  try {
    const { storeId, documentId } = req.params;
    const { status, adminNotes } = req.body;

    const store = await authModel.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const document = store.legalDocuments.id(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    document.status = status;
    if (adminNotes) document.adminNotes = adminNotes;
    
    if (status === "verified") {
      document.verifiedAt = new Date();
      document.verifiedBy = req.user?.id;
      document.verifiedByName = req.user?.name || req.user?.email;
    }

    await store.save();

    return res.status(200).json({
      success: true,
      message: "Document status updated",
      document,
    });
  } catch (error) {
    console.error("Error updating document status:", error);
    return res.status(500).json({ success: false, message: "Error updating document" });
  }
};

/**
 * Delete a legal document
 */
const deleteLegalDocument = async (req, res) => {
  try {
    const { storeId, documentId } = req.params;

    const store = await authModel.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const document = store.legalDocuments.id(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    // Don't allow deletion of terms acceptance records
    if (document.documentType === "terms_acceptance") {
      return res.status(400).json({ 
        success: false, 
        message: "Terms acceptance records cannot be deleted for legal compliance" 
      });
    }

    document.deleteOne();
    await store.save();

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return res.status(500).json({ success: false, message: "Error deleting document" });
  }
};

/**
 * Update business information
 */
const updateBusinessInfo = async (req, res) => {
  try {
    const { storeId } = req.params;
    const businessInfo = req.body;

    const store = await authModel.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // Merge with existing business info
    store.businessInfo = {
      ...store.businessInfo?.toObject(),
      ...businessInfo,
    };

    await store.save();

    return res.status(200).json({
      success: true,
      message: "Business information updated",
      businessInfo: store.businessInfo,
    });
  } catch (error) {
    console.error("Error updating business info:", error);
    return res.status(500).json({ success: false, message: "Error updating business info" });
  }
};

/**
 * Set credit terms for a store
 */
const setCreditTerms = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { creditLimit, paymentTermsDays, interestRate, status } = req.body;

    const store = await authModel.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // Save current terms to history before updating
    if (store.currentCreditTerms && store.currentCreditTerms.status !== "none") {
      store.creditAgreements.push({
        creditLimit: store.currentCreditTerms.creditLimit,
        paymentTermsDays: store.currentCreditTerms.paymentTermsDays,
        interestRate: store.currentCreditTerms.interestRate,
        agreedAt: new Date(),
        agreedByName: store.ownerName,
        agreedByEmail: store.email,
        status: "active",
        termsSnapshot: TERMS_CONTENT,
      });
    }

    // Update current credit terms
    store.currentCreditTerms = {
      creditLimit: creditLimit || 0,
      paymentTermsDays: paymentTermsDays || 7,
      interestRate: interestRate || 1.5,
      status: status || "active",
    };

    await store.save();

    return res.status(200).json({
      success: true,
      message: "Credit terms updated",
      currentCreditTerms: store.currentCreditTerms,
    });
  } catch (error) {
    console.error("Error setting credit terms:", error);
    return res.status(500).json({ success: false, message: "Error setting credit terms" });
  }
};

/**
 * Suspend credit for a store
 */
const suspendCredit = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { reason } = req.body;

    const store = await authModel.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    store.currentCreditTerms.status = "suspended";
    
    // Add to credit agreements history
    store.creditAgreements.push({
      creditLimit: store.currentCreditTerms.creditLimit,
      paymentTermsDays: store.currentCreditTerms.paymentTermsDays,
      interestRate: store.currentCreditTerms.interestRate,
      status: "suspended",
      suspendedAt: new Date(),
      suspendedReason: reason,
    });

    // Add communication log
    store.communicationLogs.push({
      type: "note",
      subject: "Credit Suspended",
      notes: `Credit suspended. Reason: ${reason}`,
      createdBy: req.user?.id,
      createdByName: req.user?.name || req.user?.email,
    });

    await store.save();

    return res.status(200).json({
      success: true,
      message: "Credit suspended",
    });
  } catch (error) {
    console.error("Error suspending credit:", error);
    return res.status(500).json({ success: false, message: "Error suspending credit" });
  }
};

/**
 * Generate legal summary report for a store (for legal proceedings)
 */
const generateLegalSummary = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await authModel.findById(storeId)
      .select("-password -token -resetPasswordToken");
    
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // Get all orders for this store to calculate total debt
    const Order = require("../models/orderModle");
    const orders = await Order.find({ store: storeId })
      .select("orderNumber totalAmount paymentStatus createdAt dueDate")
      .sort({ createdAt: -1 });

    const unpaidOrders = orders.filter(o => o.paymentStatus !== "paid");
    const totalOutstanding = unpaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const legalSummary = {
      generatedAt: new Date(),
      generatedBy: req.user?.email,
      
      // Store identification
      storeInfo: {
        registrationRef: store.registrationRef,
        storeName: store.storeName,
        ownerName: store.ownerName,
        email: store.email,
        phone: store.phone,
        address: `${store.address}, ${store.city}, ${store.state} ${store.zipCode}`,
        registeredAt: store.createdAt,
        approvedAt: store.approvedAt,
      },
      
      // Business information
      businessInfo: store.businessInfo,
      
      // Terms acceptance proof
      termsAcceptance: store.termsAcceptance,
      termsDocuments: store.legalDocuments?.filter(d => d.documentType === "terms_acceptance"),
      
      // Credit terms agreed to
      currentCreditTerms: store.currentCreditTerms,
      creditHistory: store.creditAgreements,
      
      // Financial summary
      financialSummary: {
        totalOutstanding,
        unpaidOrdersCount: unpaidOrders.length,
        unpaidOrders: unpaidOrders.map(o => ({
          orderNumber: o.orderNumber,
          amount: o.totalAmount,
          date: o.createdAt,
          dueDate: o.dueDate,
        })),
      },
      
      // Payment history
      cheques: store.cheques,
      paymentRecords: store.paymentRecords,
      bouncedCheques: store.cheques?.filter(c => c.status === "bounced"),
      
      // Communication history (proof of contact attempts)
      communicationLogs: store.communicationLogs,
      
      // All legal documents on file
      legalDocuments: store.legalDocuments,
      
      // Activity logs
      activityLogs: store.activityLogs?.slice(-50), // Last 50 activities
      
      // Legal jurisdiction notice
      legalNotice: {
        governingLaw: "State of Georgia",
        jurisdiction: "Fulton County, Atlanta, Georgia",
        interestRate: "1.5% per month (18% per annum)",
        collectionCosts: "Up to 35% of outstanding balance for attorney fees",
      },
    };

    return res.status(200).json({
      success: true,
      legalSummary,
    });
  } catch (error) {
    console.error("Error generating legal summary:", error);
    return res.status(500).json({ success: false, message: "Error generating legal summary" });
  }
};

/**
 * Get document checklist status for a store
 */
const getDocumentChecklist = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await authModel.findById(storeId)
      .select("legalDocuments termsAcceptance businessInfo");
    
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const documents = store.legalDocuments || [];
    
    const checklist = {
      terms_acceptance: {
        label: "Terms & Conditions",
        required: true,
        status: store.termsAcceptance?.acceptedAt ? "complete" : "missing",
        document: documents.find(d => d.documentType === "terms_acceptance"),
      },
      business_license: {
        label: "Business License",
        required: true,
        status: documents.find(d => d.documentType === "business_license" && d.status === "verified") ? "verified" : 
                documents.find(d => d.documentType === "business_license") ? "pending" : "missing",
        document: documents.find(d => d.documentType === "business_license"),
      },
      tax_certificate: {
        label: "Tax Certificate / Resale Permit",
        required: true,
        status: documents.find(d => d.documentType === "tax_certificate" && d.status === "verified") ? "verified" : 
                documents.find(d => d.documentType === "tax_certificate") ? "pending" : "missing",
        document: documents.find(d => d.documentType === "tax_certificate"),
      },
      w9_form: {
        label: "W-9 Form",
        required: true,
        status: documents.find(d => d.documentType === "w9_form" && d.status === "verified") ? "verified" : 
                documents.find(d => d.documentType === "w9_form") ? "pending" : "missing",
        document: documents.find(d => d.documentType === "w9_form"),
      },
      id_document: {
        label: "Owner ID (Driver's License)",
        required: true,
        status: documents.find(d => d.documentType === "id_document" && d.status === "verified") ? "verified" : 
                documents.find(d => d.documentType === "id_document") ? "pending" : "missing",
        document: documents.find(d => d.documentType === "id_document"),
      },
      signed_agreement: {
        label: "Signed Credit Agreement",
        required: false,
        status: documents.find(d => d.documentType === "signed_agreement" && d.status === "verified") ? "verified" : 
                documents.find(d => d.documentType === "signed_agreement") ? "pending" : "missing",
        document: documents.find(d => d.documentType === "signed_agreement"),
      },
      personal_guarantee: {
        label: "Personal Guarantee",
        required: false,
        status: documents.find(d => d.documentType === "personal_guarantee" && d.status === "verified") ? "verified" : 
                documents.find(d => d.documentType === "personal_guarantee") ? "pending" : "missing",
        document: documents.find(d => d.documentType === "personal_guarantee"),
      },
    };

    const requiredComplete = Object.values(checklist)
      .filter(item => item.required)
      .every(item => item.status === "complete" || item.status === "verified");

    return res.status(200).json({
      success: true,
      checklist,
      requiredComplete,
      totalDocuments: documents.length,
    });
  } catch (error) {
    console.error("Error getting document checklist:", error);
    return res.status(500).json({ success: false, message: "Error getting checklist" });
  }
};

module.exports = {
  recordTermsAcceptance,
  getStoreLegalDocuments,
  addLegalDocument,
  updateLegalDocumentStatus,
  deleteLegalDocument,
  updateBusinessInfo,
  setCreditTerms,
  suspendCredit,
  generateLegalSummary,
  getDocumentChecklist,
  CURRENT_TERMS_VERSION,
  TERMS_CONTENT,
};
