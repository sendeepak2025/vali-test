const bcrypt = require("bcryptjs");
const authModel = require("../models/authModel");
const jwt = require("jsonwebtoken");
const Order = require("../models/orderModle");
const notificationService = require("../services/notificationService");
const { CURRENT_TERMS_VERSION, TERMS_CONTENT } = require("./legalDocumentCtrl");




const registerCtrl = async (req, res) => {
  try {
    const {
      email, phone, storeName, ownerName, address, city, state, zipCode, businessDescription, password, agreeTerms, role = "member", isOrder = false, isProduct = false,
      // New business document fields
      legalBusinessName, businessType, taxId, businessLicenseUrl, taxCertificateUrl
    } = req.body;

    if (!email || !password) {
      return res.status(403).send({
        success: false,
        message: "All required fields must be filled",
      });
    }


    const existingUser = await authModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Please sign in to continue.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Prepare business info for store registrations
    const businessInfoData = role === "store" ? {
      legalBusinessName: legalBusinessName || storeName,
      businessType,
      taxId,
    } : {};
    
    // Prepare legal documents array
    const legalDocumentsArray = [];
    
    // Add terms acceptance document for store registrations
    if (role === "store" && agreeTerms) {
      legalDocumentsArray.push({
        documentType: "terms_acceptance",
        documentName: `Terms and Conditions v${CURRENT_TERMS_VERSION}`,
        description: "Terms and Conditions acceptance at registration",
        documentContent: TERMS_CONTENT,
        documentVersion: CURRENT_TERMS_VERSION,
        acceptedAt: new Date(),
        acceptedByName: ownerName,
        acceptedByEmail: email,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
        status: "verified",
      });
    }
    
    // Add business license if provided
    if (role === "store" && businessLicenseUrl) {
      legalDocumentsArray.push({
        documentType: "business_license",
        documentName: "Business License",
        description: "Business license uploaded during registration",
        fileUrl: businessLicenseUrl,
        status: "received",
        uploadedByName: ownerName,
      });
    }
    
    // Add tax certificate if provided
    if (role === "store" && taxCertificateUrl) {
      legalDocumentsArray.push({
        documentType: "tax_certificate",
        documentName: "Tax Certificate / Resale Permit",
        description: "Tax certificate uploaded during registration",
        fileUrl: taxCertificateUrl,
        status: "received",
        uploadedByName: ownerName,
      });
    }
    
    // Prepare terms acceptance data for store registrations
    const termsAcceptanceData = role === "store" && agreeTerms ? {
      termsAcceptance: {
        acceptedAt: new Date(),
        acceptedVersion: CURRENT_TERMS_VERSION,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
      },
    } : {};
    
    // Create user - the pre-save hook will set approvalStatus to "pending" 
    // and generate registrationRef for store role
    const user = await authModel.create({
      email, phone, storeName, ownerName, address, city, state, zipCode, businessDescription, password: hashedPassword, agreeTerms, role, isOrder, isProduct,
      businessInfo: businessInfoData,
      legalDocuments: legalDocumentsArray,
      ...termsAcceptanceData,
    });

    // For store registrations, send notifications
    if (role === "store") {
      try {
        // Send confirmation email to store owner
        await notificationService.createNotificationWithEmail(
          user._id,
          user.email,
          "store_registration",
          "Registration Received",
          `Your registration for ${storeName} has been received and is pending approval.`,
          "REGISTRATION_CONFIRMATION",
          {
            ownerName,
            storeName,
            email,
            registrationRef: user.registrationRef,
          },
          { registrationRef: user.registrationRef },
          "/pending-approval"
        );

        // Notify all admins about new registration
        await notificationService.notifyAdmins(
          "store_registration",
          "New Store Registration",
          `${storeName} has registered and requires approval.`,
          {
            storeId: user._id,
            storeName,
            ownerName,
            email,
            registrationRef: user.registrationRef,
          },
          "/admin/pending-approvals",
          true,
          "REGISTRATION_ADMIN_ALERT",
          {
            storeName,
            ownerName,
            email,
            phone,
            address,
            city,
            state,
            zipCode,
            businessDescription,
            registrationRef: user.registrationRef,
            dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/pending-approvals`,
          }
        );
      } catch (notificationError) {
        // Log notification error but don't fail registration
        console.error("Error sending registration notifications:", notificationError);
      }

      // For pending stores, return success but indicate pending status
      return res.status(200).json({
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          storeName: user.storeName,
          ownerName: user.ownerName,
          role: user.role,
          approvalStatus: user.approvalStatus,
          registrationRef: user.registrationRef,
        },
        message: "Registration submitted successfully! Your account is pending approval. You will receive an email once approved.",
        isPending: true,
      });
    }

    // For non-store roles (admin, member), proceed with normal login token
    const token = jwt.sign(
      { email: user.email, id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    const options = {
      expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };
    res.cookie("token", token, options);

    return res.status(200).json({
      success: true,
      token,
      user,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "User cannot be registered. Please try again.",
    });
  }
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const loginCtrl = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: `Please Fill up All the Required Fields`,
      });
    }

    const user = await authModel.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: `User is not Registered with Us Please SignUp to Continue`,
      });
    }

    if (await bcrypt.compare(password, user.password)) {
      // Check approval status for store users
      if (user.role === "store") {
        // Rejected stores cannot login
        if (user.approvalStatus === "rejected") {
          return res.status(403).json({
            success: false,
            message: "Your registration has been rejected.",
            rejectionReason: user.rejectionReason || "No reason provided",
            approvalStatus: "rejected",
          });
        }
      }
      
      // Check if member is suspended
      if (user.role === "member" && user.status === "suspended") {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended. Please contact admin.",
        });
      }

      // Generate 6-digit OTP
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
console.log("Current OTP", otp)
      // Save OTP to user
      await authModel.findByIdAndUpdate(user._id, {
        loginOtp: otp,
        loginOtpExpires: otpExpires,
      });

      // Send OTP via email
      const mailSender = require("../utils/mailSender");
      const emailTemplates = require("../templates/emails/emailTemplates");
      
      const htmlContent = emailTemplates.LOGIN_OTP({
        name: user.storeName || user.ownerName || user.name || "User",
        otp: otp,
      });

      await mailSender(user.email, "Login Verification Code - Vali Produce", htmlContent);

      return res.status(200).json({
        success: true,
        message: "OTP sent to your email",
        requireOtp: true,
        email: user.email,
      });
    } else {
      return res.status(401).json({
        success: false,
        message: `Password is incorrect`,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: `Login Failure Please Try Again`,
    });
  }
};

// Verify OTP and complete login
const verifyLoginOtpCtrl = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await authModel.findOne({ 
      email,
      loginOtp: otp,
      loginOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Clear OTP after successful verification
    await authModel.findByIdAndUpdate(user._id, {
      loginOtp: null,
      loginOtpExpires: null,
    });

    // Generate JWT token
    const token = jwt.sign(
      { email: user.email, id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    // Update last login and add activity log
    await authModel.findByIdAndUpdate(user._id, {
      token,
      lastLogin: new Date(),
      $push: {
        activityLogs: {
          action: "login",
          description: "User logged in with OTP verification",
          createdAt: new Date(),
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers?.['user-agent'],
        }
      }
    });

    user.token = token;
    user.password = undefined;
    const options = {
      expires: new Date(Date.now() + 2 * 1000), // 2 seconds
      httpOnly: true,
    };

    // Determine access level for store users
    let accessLevel = "full";
    let isPending = false;
    
    if (user.role === "store") {
      if (user.approvalStatus === "pending") {
        accessLevel = "limited";
        isPending = true;
      } else if (user.approvalStatus === "approved") {
        accessLevel = "full";
      }
    }

    res.cookie("token", token, options).status(200).json({
      success: true,
      token,
      user,
      message: `Login Successful`,
      accessLevel,
      isPending,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: `OTP Verification Failed. Please Try Again`,
    });
  }
};

// Resend OTP
const resendLoginOtpCtrl = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await authModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate new 6-digit OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to user
    await authModel.findByIdAndUpdate(user._id, {
      loginOtp: otp,
      loginOtpExpires: otpExpires,
    });

    console.log("Current OTP", otp)
    // Send OTP via email
    const mailSender = require("../utils/mailSender");
    const emailTemplates = require("../templates/emails/emailTemplates");
    
    const htmlContent = emailTemplates.LOGIN_OTP({
      name: user.storeName || user.ownerName || user.name || "User",
      otp: otp,
    });

    await mailSender(user.email, "Login Verification Code - Vali Produce", htmlContent);

    return res.status(200).json({
      success: true,
      message: "OTP resent to your email",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP. Please try again.",
    });
  }
};

// Send OTP for store order verification (email-based)
const sendStoreOrderOtpCtrl = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await authModel.findOne({ email, role: "store" });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Store not found with this email",
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    await authModel.findByIdAndUpdate(user._id, {
      loginOtp: otp,
      loginOtpExpires: otpExpires,
    });

    console.log("Store Order Otp", otp);

    const mailSender = require("../utils/mailSender");
    const emailTemplates = require("../templates/emails/emailTemplates");
    
    const htmlContent = emailTemplates.STORE_ORDER_OTP({
      name: user.storeName || user.ownerName || "Store Owner",
      otp: otp,
    });

    await mailSender(user.email, "Order Verification Code - Vali Produce", htmlContent);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

// Verify OTP for store order and return store info
const verifyStoreOrderOtpCtrl = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await authModel.findOne({ 
      email,
      role: "store",
      loginOtp: otp,
      loginOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    await authModel.findByIdAndUpdate(user._id, {
      loginOtp: null,
      loginOtpExpires: null,
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      user: {
        _id: user._id,
        email: user.email,
        phone: user.phone,
        storeName: user.storeName,
        ownerName: user.ownerName,
        address: user.address,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        priceCategory: user.priceCategory,
        shippingCost: user.shippingCost,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed. Please try again.",
    });
  }
};



const updatePermitionCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { isOrder, isProduct, activityLog, ...otherFields } = req.body;
    
    // Build update object
    const updateData = {};
    if (isOrder !== undefined) updateData.isOrder = isOrder;
    if (isProduct !== undefined) updateData.isProduct = isProduct;
    
    // Add other fields if provided (for member updates)
    Object.keys(otherFields).forEach(key => {
      if (otherFields[key] !== undefined && key !== 'activityLog') {
        updateData[key] = otherFields[key];
      }
    });
    
    // Add activity log if provided
    if (activityLog) {
      updateData.$push = {
        activityLogs: {
          action: activityLog.action || "updated",
          description: activityLog.description || "Member updated",
          performedBy: activityLog.performedBy,
          performedByName: activityLog.performedByName,
          createdAt: new Date(),
          metadata: activityLog.metadata,
        }
      };
    }
    
    const user = await authModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "Updated successfully", user });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "Error in updating permission api"
    });
  }
};



const addMemberCtrl = async (req, res) => {
  try {
    const {
      name, email, phone, password, role = "member", isOrder = false, isProduct = false,
      department, designation, employeeId, joiningDate, createdBy, activityLog
    } = req.body;
    console.log(req.body)

    if (!email || !password) {
      return res.status(403).send({
        success: false,
        message: "All required fields must be filled",
      });
    }


    const existingUser = await authModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Please sign in to continue.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create initial activity log
    const initialActivityLog = {
      action: "member_created",
      description: activityLog?.description || "New member account created",
      performedBy: activityLog?.performedBy || createdBy,
      performedByName: activityLog?.performedByName || "System",
      createdAt: new Date(),
    };
    
    const user = await authModel.create({
      name, 
      email, 
      phone, 
      password: hashedPassword, 
      role, 
      isOrder, 
      isProduct,
      department,
      designation,
      employeeId,
      joiningDate,
      createdBy,
      status: "active",
      activityLogs: [initialActivityLog],
    });



    return res.status(200).json({
      success: true,
      user,
      message: "Member Created Successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error in member create api.",
    });
  }
};


const getAllMemberCtrl = async (req, res) => {
  try {
    // Store name ke hisab se ascending order me sort
    const members = await authModel.find().sort({ storeName: 1 });

    return res.status(200).json({
      success: true,
      members
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in getting member API!",
    });
  }
};




const getAllStoreCtrl = async (req, res) => {
  try {
    const stores = await authModel.find({ role: "store" }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      stores
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in getting member API!",
    });
  }
};


const getUserByEmailCtrl = async (req, res) => {
  try {
    const { email, id, phone } = req.body;

    if (!email && !id && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email, Phone or ID is required",
      });
    }

    let query = { role: "store" };

    if (id) {
      query._id = id;
    } else if (email) {
      query.email = email;
    } else if (phone) {
      query.phone = phone;
    }

    const user = await authModel.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log("Error in getUserByEmailCtrl:", error);
    return res.status(500).json({
      success: false,
      message: "Error in getting user API!",
    });
  }
};


const updateStoreCtrl = async (req, res) => {
  try {
    const {
      storeName,
      ownerName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      businessDescription,
      priceCategory,
      shippingCost,
      isOrder,
      isProduct

    } = req.body;


    const { id } = req.params;


    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }

    const store = await authModel.findById(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    store.storeName = storeName || store.storeName;
    store.ownerName = ownerName || store.ownerName;
    store.email = email || store.email;
    store.phone = phone || store.phone;
    store.address = address || store.address;
    store.city = city || store.city;
    store.state = state || store.state;
    store.zipCode = zipCode || store.zipCode;
    store.priceCategory = priceCategory || store.priceCategory;
    store.businessDescription = businessDescription || store.businessDescription;
    store.shippingCost = shippingCost !== undefined ? shippingCost : store.shippingCost;
    
    // Update permissions - handle boolean values properly
    if (isOrder !== undefined) store.isOrder = isOrder;
    if (isProduct !== undefined) store.isProduct = isProduct;

    await store.save();

    return res.status(200).json({
      success: true,
      message: "Store Updated Successfully!",
      store,
    });
  } catch (error) {
    console.error("Error updating store:", error);
    return res.status(500).json({
      success: false,
      message: "Error in updating store API!",
    });
  }
};


const fetchMyProfile = async (req, res) => {
  try {
    // Get email and password from request body
    const id = req.user.id



    // Find user with provided email
    const user = await authModel.findById(id)

    // If user not found with provided email
    if (!user) {
      // Return 401 Unauthorized status code with error message
      return res.status(401).json({
        success: false,
        message: `User is not Registered with Us Please SignUp to Continue`,
      })
    }

    return res.status(200).json({
      user,
      success: true,
      message: `Fetch Data Successfully`,
    })

  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: `Error During fetch data`,
    })
  }
}

const changePasswordCtrl = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    console.log(req.body)
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both current and new passwords are required",
      });
    }

    const user = await authModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error in change password:", error);
    return res.status(500).json({
      success: false,
      message: "Error while changing password",
    });
  }
};

const deleteStoreIfNoOrders = async (req, res) => {
  try {
    const storeId = req.params.id;
console.log(storeId)
    // Check if any order is associated with this store
    const ordersCount = await Order.countDocuments({ store: storeId });

    if (ordersCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete store. Orders are associated with this store.",
      });
    }

    // Delete the store
    const deletedStore = await authModel.findByIdAndDelete(storeId);

    if (!deletedStore) {
      return res.status(404).json({
        success: false,
        message: "Store not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Store deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting store:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting store.",
    });
  }
};


const addChequeToStoreCtrl = async (req, res) => {
  try {
    const { id } = req.params; // store id
    const { images, amount, date, notes, chequeNumber } = req.body;
if (!images) return res.status(400).json({ success: false, message: "Images are required" });
    if (!amount) return res.status(400).json({ success: false, message: "Amount is required" });
    if (!chequeNumber) return res.status(400).json({ success: false, message: "Cheque number is required" });
    if (!notes) return res.status(400).json({ success: false, message: "Notes are required" });

    const imagesArray = JSON.parse(images);

    // Fetch the user first
    const user = await authModel.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if chequeNumber already exists
    const chequeExists = user.cheques.some(
      (c) => c.chequeNumber === chequeNumber
    );

    if (chequeExists) {
      return res.status(400).json({
        success: false,
        message: `Cheque number "${chequeNumber}" already exists for this store`,
      });
    }

    // Create new cheque
    const chequeData = {
      images: imagesArray,
      amount,
      date: date ? new Date(date) : new Date(),
      notes,
      chequeNumber,
    };

    user.cheques.push(chequeData);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Cheque added successfully",
      user,
    });
  } catch (error) {
    console.error("Error adding cheque:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

const editChequeCtrl = async (req, res) => {
  try {
    const { id, chequeId } = req.params; // user id and cheque id
    const { images, amount, date, notes, chequeNumber } = req.body;
if (!images) return res.status(400).json({ success: false, message: "Images are required" });
    if (!amount) return res.status(400).json({ success: false, message: "Amount is required" });
    if (!chequeNumber) return res.status(400).json({ success: false, message: "Cheque number is required" });
    if (!notes) return res.status(400).json({ success: false, message: "Notes are required" });

    const imagesArray = JSON.parse(images);

    // Fetch the user first
    const user = await authModel.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if chequeNumber already exists in other cheques
    const chequeExists = user.cheques.some(
      (ch) => ch.chequeNumber === chequeNumber && ch._id.toString() !== chequeId
    );
    if (chequeExists) {
      return res.status(400).json({ success: false, message: "Cheque number must be unique" });
    }

    // Update the cheque
    const updatedUser = await authModel.findOneAndUpdate(
      { _id: id, "cheques._id": chequeId },
      {
        $set: {
          "cheques.$.images": imagesArray,
          "cheques.$.amount": amount,
          "cheques.$.date": date ? new Date(date) : new Date(),
          "cheques.$.notes": notes,
          "cheques.$.chequeNumber": chequeNumber,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "Cheque not found" });
    }

    res.status(200).json({
      success: true,
      message: "Cheque updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating cheque:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};



const getChequesByStoreCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "Store ID is required" });
    }

    const store = await authModel.findById(id).select("cheques");

    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    res.status(200).json({
      success: true,
      cheques: store.cheques || [],
    });
  } catch (error) {
    console.error("Error fetching cheques:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

// Delete cheque
const deleteChequeCtrl = async (req, res) => {
  try {
    const { id, chequeId } = req.params;

    const user = await authModel.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const chequeIndex = user.cheques.findIndex(c => c._id.toString() === chequeId);
    if (chequeIndex === -1) {
      return res.status(404).json({ success: false, message: "Cheque not found" });
    }

    user.cheques.splice(chequeIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Cheque deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting cheque:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

// Update cheque status (for reconciliation)
const updateChequeStatusCtrl = async (req, res) => {
  try {
    const { id, chequeId } = req.params;
    const { status, clearedDate, bankReference } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const validStatuses = ["pending", "cleared", "bounced", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updateData = {
      "cheques.$.status": status,
    };

    if (status === "cleared" && clearedDate) {
      updateData["cheques.$.clearedDate"] = new Date(clearedDate);
    }
    if (bankReference) {
      updateData["cheques.$.bankReference"] = bankReference;
    }

    const updatedUser = await authModel.findOneAndUpdate(
      { _id: id, "cheques._id": chequeId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "Cheque not found" });
    }

    res.status(200).json({
      success: true,
      message: "Cheque status updated successfully",
      cheque: updatedUser.cheques.find(c => c._id.toString() === chequeId),
    });
  } catch (error) {
    console.error("Error updating cheque status:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

// Get all cheques across all stores (for reconciliation dashboard)
const getAllChequesCtrl = async (req, res) => {
  try {
    const { status } = req.query;
    
    const stores = await authModel.find({ role: "store", "cheques.0": { $exists: true } })
      .select("storeName ownerName cheques");

    let allCheques = [];
    stores.forEach(store => {
      store.cheques.forEach(cheque => {
        if (!status || cheque.status === status) {
          allCheques.push({
            ...cheque.toObject(),
            storeId: store._id,
            storeName: store.storeName,
            ownerName: store.ownerName,
          });
        }
      });
    });

    // Sort by date descending
    allCheques.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      cheques: allCheques,
      summary: {
        total: allCheques.length,
        pending: allCheques.filter(c => c.status === "pending").length,
        cleared: allCheques.filter(c => c.status === "cleared").length,
        bounced: allCheques.filter(c => c.status === "bounced").length,
        cancelled: allCheques.filter(c => c.status === "cancelled").length,
        totalAmount: allCheques.reduce((sum, c) => sum + (c.amount || 0), 0),
        pendingAmount: allCheques.filter(c => c.status === "pending").reduce((sum, c) => sum + (c.amount || 0), 0),
        clearedAmount: allCheques.filter(c => c.status === "cleared").reduce((sum, c) => sum + (c.amount || 0), 0),
      }
    });
  } catch (error) {
    console.error("Error fetching all cheques:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};


// Helper function to calculate store rating
const calculateStoreRating = (stats) => {
  let score = 100;
  
  // Payment behavior (40 points)
  if (stats.paymentStatus === "overdue") score -= 40;
  else if (stats.paymentStatus === "warning") score -= 20;
  
  // Credit usage (20 points)
  const creditRatio = stats.totalOrders > 0 ? stats.creditCount / stats.totalOrders : 0;
  if (creditRatio > 0.5) score -= 20;
  else if (creditRatio > 0.3) score -= 10;
  
  // Order frequency (20 points)
  if (stats.daysSinceLastOrder > 60) score -= 20;
  else if (stats.daysSinceLastOrder > 30) score -= 10;
  
  // Order trend (20 points)
  if (stats.orderTrend === "down") score -= 15;
  else if (stats.orderTrend === "up") score += 5;
  
  score = Math.max(0, Math.min(100, score));
  
  let rating;
  if (score >= 80) rating = "excellent";
  else if (score >= 60) rating = "good";
  else if (score >= 40) rating = "needs_improvement";
  else rating = "at_risk";
  
  return { rating, score };
};

// Get store analytics for a single store
const getStoreAnalyticsCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await authModel.findById(id);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // Get all orders for this store
    const orders = await Order.find({ store: id, isDelete: { $ne: true } }).sort({ createdAt: -1 });

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Calculate stats
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    const totalPaid = orders
      .filter(o => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + (o.total || 0), 0) +
      orders
        .filter(o => o.paymentStatus === "partial")
        .reduce((sum, o) => sum + (parseFloat(o.paymentAmount) || 0), 0);
    
    const balanceDue = totalSpent - totalPaid;
    
    const creditCount = orders.filter(o => 
      o.paymentStatus === "unpaid" || o.paymentStatus === "partial"
    ).length;

    const lastOrderDate = orders[0]?.createdAt || null;

    // Orders this month vs last month
    const thisMonthOrders = orders.filter(o => new Date(o.createdAt) >= thisMonthStart).length;
    const lastMonthOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
    }).length;

    // Order trend
    let orderTrend = "stable";
    if (thisMonthOrders > lastMonthOrders) orderTrend = "up";
    else if (thisMonthOrders < lastMonthOrders) orderTrend = "down";

    // Days since last order
    const daysSinceLastOrder = lastOrderDate 
      ? Math.floor((now - new Date(lastOrderDate)) / (1000 * 60 * 60 * 24))
      : 999;

    // Order frequency (orders per month)
    const firstOrderDate = orders[orders.length - 1]?.createdAt;
    const monthsSinceFirst = firstOrderDate 
      ? Math.max(1, Math.floor((now - new Date(firstOrderDate)) / (1000 * 60 * 60 * 24 * 30)))
      : 1;
    const orderFrequency = totalOrders / monthsSinceFirst;

    // Payment rate
    const paidOrders = orders.filter(o => o.paymentStatus === "paid").length;
    const paymentRate = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 100;

    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Payment status
    let paymentStatus = "good";
    if (balanceDue > 0) {
      const unpaidOrders = orders.filter(o => o.paymentStatus !== "paid");
      const oldestUnpaid = unpaidOrders.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      )[0];
      
      if (oldestUnpaid) {
        const daysSinceOrder = Math.floor(
          (Date.now() - new Date(oldestUnpaid.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceOrder > 30) paymentStatus = "overdue";
        else if (daysSinceOrder > 14) paymentStatus = "warning";
      }
    }

    // Calculate rating
    const { rating: storeRating, score: ratingScore } = calculateStoreRating({
      paymentStatus, creditCount, totalOrders, daysSinceLastOrder, orderTrend
    });

    res.status(200).json({
      success: true,
      analytics: {
        storeId: id,
        storeName: store.storeName,
        ownerName: store.ownerName,
        totalOrders,
        totalSpent,
        totalPaid,
        balanceDue,
        creditCount,
        lastOrderDate,
        thisMonthOrders,
        lastMonthOrders,
        orderTrend,
        daysSinceLastOrder,
        orderFrequency: parseFloat(orderFrequency.toFixed(2)),
        paymentRate: parseFloat(paymentRate.toFixed(2)),
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        paymentStatus,
        storeRating,
        ratingScore
      }
    });
  } catch (error) {
    console.error("Error fetching store analytics:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Get analytics for all stores (bulk) - with pagination support
const getAllStoresAnalyticsCtrl = async (req, res) => {
  try {
    // Pagination params for stores list
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const filterState = req.query.state || "";
    const filterPaymentStatus = req.query.paymentStatus || "";
    const sortBy = req.query.sortBy || "storeName";
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get ALL stores for overview calculations
    const allStores = await authModel.find({ role: "store" }).lean();
    const allStoreIds = allStores.map(s => s._id);

    // Get order stats for ALL stores using aggregation
    const allOrderStats = await Order.aggregate([
      { 
        $match: { 
          store: { $in: allStoreIds }, 
          isDelete: { $ne: true } 
        } 
      },
      {
        $group: {
          _id: "$store",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: { $ifNull: ["$total", 0] } },
          paidTotal: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, { $ifNull: ["$total", 0] }, 0]
            }
          },
          partialPaid: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "partial"] }, { $toDouble: { $ifNull: ["$paymentAmount", 0] } }, 0]
            }
          },
          // Count orders by payment status
          paidOrdersCount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
          partialOrdersCount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "partial"] }, 1, 0] } },
          lastOrderDate: { $max: "$createdAt" },
          firstOrderDate: { $min: "$createdAt" },
          orders: { $push: { createdAt: "$createdAt", paymentStatus: "$paymentStatus" } }
        }
      }
    ]);

    // Create map for quick lookup
    const orderStatsMap = new Map();
    allOrderStats.forEach(stat => orderStatsMap.set(stat._id.toString(), stat));

    // Helper function to process store with analytics
    const processStore = (store) => {
      const stats = orderStatsMap.get(store._id.toString()) || {
        totalOrders: 0, totalSpent: 0, paidTotal: 0, partialPaid: 0,
        paidOrdersCount: 0, partialOrdersCount: 0,
        lastOrderDate: null, firstOrderDate: null, orders: []
      };

      const totalOrders = stats.totalOrders;
      const totalSpent = stats.totalSpent;
      const totalPaid = stats.paidTotal + stats.partialPaid;
      const balanceDue = totalSpent - totalPaid;
      
      // Detailed order counts - calculate unpaid as remaining orders
      const paidOrdersCount = stats.paidOrdersCount;
      const partialOrdersCount = stats.partialOrdersCount;
      const unpaidOrdersCount = totalOrders - paidOrdersCount - partialOrdersCount; // This ensures it adds up correctly
      
      const lastOrderDate = stats.lastOrderDate;

      const thisMonthOrders = stats.orders.filter(o => new Date(o.createdAt) >= thisMonthStart).length;
      const lastMonthOrders = stats.orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= lastMonthStart && d <= lastMonthEnd;
      }).length;

      let orderTrend = "stable";
      if (thisMonthOrders > lastMonthOrders) orderTrend = "up";
      else if (thisMonthOrders < lastMonthOrders) orderTrend = "down";

      const daysSinceLastOrder = lastOrderDate 
        ? Math.floor((now - new Date(lastOrderDate)) / (1000 * 60 * 60 * 24)) : 999;

      const monthsSinceFirst = stats.firstOrderDate 
        ? Math.max(1, Math.floor((now - new Date(stats.firstOrderDate)) / (1000 * 60 * 60 * 24 * 30))) : 1;
      const orderFrequency = totalOrders / monthsSinceFirst;
      const paymentRate = totalOrders > 0 ? (paidOrdersCount / totalOrders) * 100 : 100;
      const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      let paymentStatus = "good_standing";
      if (balanceDue > 0) {
        const unpaidOrdersList = stats.orders.filter(o => o.paymentStatus !== "paid");
        if (unpaidOrdersList.length > 0) {
          const oldestUnpaidDate = unpaidOrdersList.reduce((oldest, o) => {
            const d = new Date(o.createdAt);
            return d < oldest ? d : oldest;
          }, new Date());
          const daysSinceOrder = Math.floor((now - oldestUnpaidDate) / (1000 * 60 * 60 * 24));
          if (daysSinceOrder > 30) paymentStatus = "overdue";
          else if (daysSinceOrder > 14) paymentStatus = "warning";
        }
      }

      const { rating: storeRating, score: ratingScore } = calculateStoreRating({
        paymentStatus, creditCount: unpaidOrdersCount + partialOrdersCount, totalOrders, daysSinceLastOrder, orderTrend
      });

      // creditCount = unpaid + partial orders (for backward compatibility)
      const creditCount = unpaidOrdersCount + partialOrdersCount;

      return {
        _id: store._id,
        storeName: store.storeName,
        ownerName: store.ownerName,
        email: store.email,
        phone: store.phone,
        address: store.address,
        city: store.city,
        state: store.state,
        zipCode: store.zipCode,
        priceCategory: store.priceCategory,
        shippingCost: store.shippingCost,
        isOrder: store.isOrder,
        isProduct: store.isProduct,
        createdAt: store.createdAt,
        cheques: store.cheques || [],
        totalOrders, totalSpent, totalPaid, balanceDue, lastOrderDate,
        // Detailed order counts
        paidOrdersCount,
        partialOrdersCount,
        unpaidOrdersCount,
        creditCount, // unpaid + partial orders
        thisMonthOrders, lastMonthOrders, orderTrend, daysSinceLastOrder,
        orderFrequency: parseFloat(orderFrequency.toFixed(2)),
        paymentRate: parseFloat(paymentRate.toFixed(2)),
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        paymentStatus, storeRating, ratingScore
      };
    };

    // Process ALL stores for overview data
    const allStoresWithAnalytics = allStores.map(processStore);

    // Calculate summary from ALL stores
    const summary = {
      totalStores: allStoresWithAnalytics.length,
      activeStores: allStoresWithAnalytics.filter(s => s.daysSinceLastOrder < 30).length,
      totalRevenue: allStoresWithAnalytics.reduce((sum, s) => sum + s.totalSpent, 0),
      totalOutstanding: allStoresWithAnalytics.reduce((sum, s) => sum + s.balanceDue, 0),
      overdueStores: allStoresWithAnalytics.filter(s => s.paymentStatus === "overdue").length,
      warningStores: allStoresWithAnalytics.filter(s => s.paymentStatus === "warning").length,
      goodStandingStores: allStoresWithAnalytics.filter(s => s.paymentStatus === "good_standing").length,
      totalOrders: allStoresWithAnalytics.reduce((sum, s) => sum + s.totalOrders, 0),
      totalCredits: allStoresWithAnalytics.reduce((sum, s) => sum + s.creditCount, 0),
      avgOrderValue: allStoresWithAnalytics.length > 0 
        ? allStoresWithAnalytics.reduce((sum, s) => sum + s.avgOrderValue, 0) / allStoresWithAnalytics.filter(s => s.totalOrders > 0).length || 0
        : 0
    };

    // Top performing stores (by total spent) - from ALL stores
    const topPerformingStores = [...allStoresWithAnalytics]
      .filter(s => s.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Stores needing attention (overdue/warning with balance) - from ALL stores
    const storesNeedingAttention = [...allStoresWithAnalytics]
      .filter(s => s.paymentStatus === "overdue" || s.paymentStatus === "warning")
      .sort((a, b) => b.balanceDue - a.balanceDue)
      .slice(0, 5);

    // Overdue stores for payments tab - from ALL stores
    const overdueStoresList = [...allStoresWithAnalytics]
      .filter(s => s.paymentStatus === "overdue")
      .sort((a, b) => b.balanceDue - a.balanceDue);

    // Warning stores for payments tab - from ALL stores
    const warningStoresList = [...allStoresWithAnalytics]
      .filter(s => s.paymentStatus === "warning")
      .sort((a, b) => b.balanceDue - a.balanceDue);

    // Stores with declining orders for analytics tab
    const decliningStores = [...allStoresWithAnalytics]
      .filter(s => s.orderTrend === "down")
      .sort((a, b) => (b.lastMonthOrders - b.thisMonthOrders) - (a.lastMonthOrders - a.thisMonthOrders))
      .slice(0, 5);

    // Credit analysis stores
    const creditAnalysisStores = [...allStoresWithAnalytics]
      .filter(s => s.creditCount > 0)
      .sort((a, b) => b.balanceDue - a.balanceDue)
      .slice(0, 10);

    // Analytics trends from ALL stores
    const analyticsTrends = {
      trendingUp: allStoresWithAnalytics.filter(s => s.orderTrend === "up").length,
      stable: allStoresWithAnalytics.filter(s => s.orderTrend === "stable").length,
      trendingDown: allStoresWithAnalytics.filter(s => s.orderTrend === "down").length
    };

    // Now handle PAGINATED stores for "All Stores" tab
    let filteredStores = [...allStoresWithAnalytics];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredStores = filteredStores.filter(s => 
        s.storeName?.toLowerCase().includes(searchLower) ||
        s.ownerName?.toLowerCase().includes(searchLower) ||
        s.email?.toLowerCase().includes(searchLower) ||
        s.phone?.includes(search)
      );
    }
    
    // Apply state filter
    if (filterState) {
      filteredStores = filteredStores.filter(s => s.state === filterState);
    }
    
    // Apply payment status filter
    if (filterPaymentStatus) {
      filteredStores = filteredStores.filter(s => s.paymentStatus === filterPaymentStatus);
    }

    // Sort
    filteredStores.sort((a, b) => {
      const aVal = a[sortBy] || "";
      const bVal = b[sortBy] || "";
      if (typeof aVal === "string") {
        return sortOrder === 1 ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 1 ? aVal - bVal : bVal - aVal;
    });

    // Pagination
    const totalFilteredStores = filteredStores.length;
    const totalPages = Math.ceil(totalFilteredStores / limit);
    const paginatedStores = filteredStores.slice(skip, skip + limit);

    // Get unique states for filter dropdown
    const uniqueStates = [...new Set(allStores.map(s => s.state).filter(Boolean))].sort();

    res.status(200).json({
      success: true,
      // Paginated stores for "All Stores" tab
      stores: paginatedStores,
      // Full data for overview/analytics tabs
      overview: {
        topPerformingStores,
        storesNeedingAttention,
        overdueStoresList,
        warningStoresList,
        decliningStores,
        creditAnalysisStores,
        analyticsTrends
      },
      summary,
      pagination: {
        page,
        limit,
        totalStores: totalFilteredStores,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        uniqueStates
      }
    });
  } catch (error) {
    console.error("Error fetching all stores analytics:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Add communication log (call, email, note)
const addCommunicationLogCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, subject, notes, outcome, createdByName } = req.body;

    if (!type) {
      return res.status(400).json({ success: false, message: "Type is required" });
    }

    const store = await authModel.findById(id);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const logEntry = {
      type,
      subject: subject || "",
      notes: notes || "",
      outcome: outcome || "",
      createdBy: req.user?.id || null,
      createdByName: createdByName || "Admin",
    };

    store.communicationLogs.push(logEntry);
    await store.save();

    res.status(200).json({
      success: true,
      message: "Communication logged successfully",
      log: store.communicationLogs[store.communicationLogs.length - 1],
    });
  } catch (error) {
    console.error("Error adding communication log:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Get communication logs for a store
const getCommunicationLogsCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await authModel.findById(id).select("communicationLogs storeName");
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // Sort by date descending
    const logs = store.communicationLogs.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json({
      success: true,
      logs,
      storeName: store.storeName,
    });
  } catch (error) {
    console.error("Error fetching communication logs:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Add payment record (cash/card/bank transfer)
const addPaymentRecordCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, reference, notes, orderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    const store = await authModel.findById(id);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const paymentRecord = {
      amount: parseFloat(amount),
      type: type || "cash",
      reference: reference || "",
      notes: notes || "",
      orderId: orderId || null,
      createdBy: req.user?.id || null,
    };

    store.paymentRecords.push(paymentRecord);
    await store.save();

    // If orderId is provided, update the order payment status
    if (orderId) {
      const Order = require("../models/orderModle");
      const order = await Order.findById(orderId);
      if (order) {
        const currentPaid = parseFloat(order.paymentAmount || 0);
        const newPaid = currentPaid + parseFloat(amount);
        order.paymentAmount = newPaid;
        
        if (newPaid >= order.total) {
          order.paymentStatus = "paid";
        } else if (newPaid > 0) {
          order.paymentStatus = "partial";
        }
        await order.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      payment: store.paymentRecords[store.paymentRecords.length - 1],
    });
  } catch (error) {
    console.error("Error adding payment record:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Get all store payments across all stores (for accounting dashboard)
const getAllStorePaymentsCtrl = async (req, res) => {
  try {
    const { status, type, startDate, endDate } = req.query;
    
    // Find all stores that have payment records or cheques
    const stores = await authModel.find({ 
      role: "store",
      $or: [
        { "paymentRecords.0": { $exists: true } },
        { "cheques.0": { $exists: true } }
      ]
    }).select("storeName ownerName paymentRecords cheques");

    let allPayments = [];
    
    stores.forEach(store => {
      // Add payment records
      store.paymentRecords?.forEach(payment => {
        const paymentDate = new Date(payment.createdAt);
        
        // Apply date filters
        if (startDate && paymentDate < new Date(startDate)) return;
        if (endDate && paymentDate > new Date(endDate)) return;
        
        // Apply type filter
        if (type && type !== "all" && payment.type !== type) return;
        
        allPayments.push({
          ...payment.toObject(),
          source: "payment",
          storeId: store._id,
          storeName: store.storeName,
          ownerName: store.ownerName,
          paymentNumber: `SP${payment._id.toString().slice(-8).toUpperCase()}`,
        });
      });
      
      // Add cheques
      store.cheques?.forEach(cheque => {
        const chequeDate = new Date(cheque.date || cheque.createdAt);
        
        // Apply date filters
        if (startDate && chequeDate < new Date(startDate)) return;
        if (endDate && chequeDate > new Date(endDate)) return;
        
        // Apply status filter for cheques
        if (status && status !== "all" && cheque.status !== status) return;
        
        // Apply type filter (cheques are type "cheque")
        if (type && type !== "all" && type !== "cheque") return;
        
        allPayments.push({
          ...cheque.toObject(),
          source: "cheque",
          type: "cheque",
          storeId: store._id,
          storeName: store.storeName,
          ownerName: store.ownerName,
          paymentNumber: cheque.chequeNumber || `CHQ${cheque._id.toString().slice(-8).toUpperCase()}`,
        });
      });
    });

    // Sort by date descending
    allPayments.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      return dateB - dateA;
    });

    // Calculate summary
    const summary = {
      total: allPayments.length,
      totalAmount: allPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      byType: {
        cash: allPayments.filter(p => p.type === "cash").reduce((sum, p) => sum + (p.amount || 0), 0),
        card: allPayments.filter(p => p.type === "card").reduce((sum, p) => sum + (p.amount || 0), 0),
        bank_transfer: allPayments.filter(p => p.type === "bank_transfer").reduce((sum, p) => sum + (p.amount || 0), 0),
        cheque: allPayments.filter(p => p.type === "cheque").reduce((sum, p) => sum + (p.amount || 0), 0),
      },
      byStatus: {
        pending: allPayments.filter(p => p.status === "pending").reduce((sum, p) => sum + (p.amount || 0), 0),
        cleared: allPayments.filter(p => p.status === "cleared" || !p.status).reduce((sum, p) => sum + (p.amount || 0), 0),
        bounced: allPayments.filter(p => p.status === "bounced").reduce((sum, p) => sum + (p.amount || 0), 0),
      }
    };

    res.status(200).json({
      success: true,
      payments: allPayments,
      summary
    });
  } catch (error) {
    console.error("Error fetching all store payments:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Get payment records for a store
const getPaymentRecordsCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await authModel.findById(id).select("paymentRecords cheques storeName");
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // Combine cheques and payment records
    const allPayments = [
      ...store.paymentRecords.map(p => ({ ...p.toObject(), source: "payment" })),
      ...store.cheques.map(c => ({ ...c.toObject(), source: "cheque", type: "cheque" })),
    ].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    res.status(200).json({
      success: true,
      payments: allPayments,
      storeName: store.storeName,
    });
  } catch (error) {
    console.error("Error fetching payment records:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Send payment reminder email
const sendPaymentReminderCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const mailSender = require("../utils/mailSender");

    const store = await authModel.findById(id);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    if (!store.email) {
      return res.status(400).json({ success: false, message: "Store has no email address" });
    }

    // Get store analytics for balance
    const Order = require("../models/orderModle");
    const orders = await Order.find({ store: id, isDelete: { $ne: true } });
    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalPaid = orders
      .filter(o => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + (o.total || 0), 0) +
      orders
        .filter(o => o.paymentStatus === "partial")
        .reduce((sum, o) => sum + (parseFloat(o.paymentAmount) || 0), 0);
    const balanceDue = totalSpent - totalPaid;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">💳 Payment Reminder</h2>
        <p>Dear <strong>${store.storeName || store.ownerName}</strong>,</p>
        <p>This is a friendly reminder that you have an outstanding balance with us.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #666;">Outstanding Balance</p>
          <p style="margin: 5px 0; font-size: 28px; font-weight: bold; color: #dc3545;">$${balanceDue.toFixed(2)}</p>
        </div>
        <p>Please arrange payment at your earliest convenience. If you have already made a payment, please disregard this reminder.</p>
        <p>If you have any questions, feel free to contact us.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #888; font-size: 12px; text-align: center;">Thank you for your business!</p>
      </div>
    `;

    await mailSender(store.email, "Payment Reminder - Outstanding Balance", html);

    // Log the communication
    store.communicationLogs.push({
      type: "payment_reminder",
      subject: "Payment Reminder Sent",
      notes: `Reminder sent for outstanding balance of $${balanceDue.toFixed(2)}`,
      createdByName: "System",
    });
    await store.save();

    res.status(200).json({
      success: true,
      message: "Payment reminder sent successfully",
    });
  } catch (error) {
    console.error("Error sending payment reminder:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Send account statement email
const sendStatementEmailCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const mailSender = require("../utils/mailSender");

    const store = await authModel.findById(id);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    if (!store.email) {
      return res.status(400).json({ success: false, message: "Store has no email address" });
    }

    // Get orders for statement
    const Order = require("../models/orderModle");
    const orders = await Order.find({ store: id, isDelete: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(20);

    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalPaid = orders
      .filter(o => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + (o.total || 0), 0) +
      orders
        .filter(o => o.paymentStatus === "partial")
        .reduce((sum, o) => sum + (parseFloat(o.paymentAmount) || 0), 0);
    const balanceDue = totalSpent - totalPaid;

    // Build transaction rows
    let transactionRows = orders.slice(0, 10).map(order => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(order.createdAt).toLocaleDateString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">Invoice #${order.orderNumber || order._id.toString().slice(-6)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #dc3545;">$${(order.total || 0).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${order.paymentStatus === 'paid' ? `<span style="color: #28a745;">$${(order.total || 0).toFixed(2)}</span>` : '-'}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">📄 Account Statement</h2>
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h3 style="margin: 0;">${store.storeName}</h3>
            <p style="margin: 5px 0; color: #666;">${store.address || ''}</p>
            <p style="margin: 5px 0; color: #666;">${store.city || ''}, ${store.state || ''} ${store.zipCode || ''}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 5px 0; color: #666;">Statement Date</p>
            <p style="margin: 5px 0; font-weight: bold;">${new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr>
              <td><strong>Total Invoiced:</strong></td>
              <td style="text-align: right;">$${totalSpent.toFixed(2)}</td>
            </tr>
            <tr>
              <td><strong>Total Paid:</strong></td>
              <td style="text-align: right; color: #28a745;">$${totalPaid.toFixed(2)}</td>
            </tr>
            <tr style="border-top: 2px solid #333;">
              <td><strong>Balance Due:</strong></td>
              <td style="text-align: right; font-size: 18px; font-weight: bold; color: #dc3545;">$${balanceDue.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <h3>Recent Transactions</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: left;">Date</th>
              <th style="padding: 10px; text-align: left;">Description</th>
              <th style="padding: 10px; text-align: right;">Debit</th>
              <th style="padding: 10px; text-align: right;">Credit</th>
            </tr>
          </thead>
          <tbody>
            ${transactionRows}
          </tbody>
        </table>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #888; font-size: 12px; text-align: center;">Thank you for your business!</p>
      </div>
    `;

    await mailSender(store.email, `Account Statement - ${store.storeName}`, html);

    // Log the communication
    store.communicationLogs.push({
      type: "statement_sent",
      subject: "Account Statement Sent",
      notes: `Statement sent showing balance of $${balanceDue.toFixed(2)}`,
      createdByName: "System",
    });
    await store.save();

    res.status(200).json({
      success: true,
      message: "Statement sent successfully",
    });
  } catch (error) {
    console.error("Error sending statement:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Generate statement data (for PDF generation on frontend)
const getStatementDataCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await authModel.findById(id);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const Order = require("../models/orderModle");
    const orders = await Order.find({ store: id, isDelete: { $ne: true } })
      .sort({ createdAt: -1 });

    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalPaid = orders
      .filter(o => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + (o.total || 0), 0) +
      orders
        .filter(o => o.paymentStatus === "partial")
        .reduce((sum, o) => sum + (parseFloat(o.paymentAmount) || 0), 0);
    const balanceDue = totalSpent - totalPaid;

    // Combine orders and payments for transaction history
    const transactions = [
      ...orders.map(o => ({
        date: o.createdAt,
        type: "invoice",
        description: `Invoice #${o.orderNumber || o._id.toString().slice(-6)}`,
        debit: o.total || 0,
        credit: 0,
        orderId: o._id,
      })),
      ...store.cheques.filter(c => c.status === "cleared").map(c => ({
        date: c.clearedDate || c.date,
        type: "payment",
        description: `Cheque #${c.chequeNumber}`,
        debit: 0,
        credit: c.amount || 0,
      })),
      ...store.paymentRecords.map(p => ({
        date: p.createdAt,
        type: "payment",
        description: `${p.type.charAt(0).toUpperCase() + p.type.slice(1)} Payment${p.reference ? ` - ${p.reference}` : ''}`,
        debit: 0,
        credit: p.amount || 0,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      statement: {
        store: {
          name: store.storeName,
          ownerName: store.ownerName,
          address: store.address,
          city: store.city,
          state: store.state,
          zipCode: store.zipCode,
          email: store.email,
          phone: store.phone,
        },
        summary: {
          totalInvoiced: totalSpent,
          totalPaid,
          balanceDue,
          statementDate: new Date(),
        },
        transactions,
      },
    });
  } catch (error) {
    console.error("Error generating statement data:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// ==================== STORE APPROVAL ENDPOINTS ====================

/**
 * Get all pending store registrations
 * Returns stores with approvalStatus: "pending" sorted by createdAt
 */
const getPendingStoresCtrl = async (req, res) => {
  try {
    const pendingStores = await authModel.find({ 
      role: "store", 
      approvalStatus: "pending" 
    })
    .select("storeName ownerName email phone address city state zipCode businessDescription registrationRef createdAt")
    .sort({ createdAt: 1 }); // Oldest first

    return res.status(200).json({
      success: true,
      stores: pendingStores,
      count: pendingStores.length,
    });
  } catch (error) {
    console.error("Error fetching pending stores:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching pending stores",
    });
  }
};

/**
 * Approve a store registration
 * Updates approvalStatus to "approved" and sends notification
 */
const approveStoreCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { priceCategory } = req.body;
    const adminId = req.user?.id;

    // Validate price category
    const validCategories = ["aPrice", "bPrice", "cPrice", "restaurantPrice"];
    if (!priceCategory || !validCategories.includes(priceCategory)) {
      return res.status(400).json({
        success: false,
        message: "Valid price category is required (aPrice, bPrice, cPrice, or restaurantPrice)",
      });
    }

    const store = await authModel.findById(id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    if (store.role !== "store") {
      return res.status(400).json({
        success: false,
        message: "This user is not a store",
      });
    }

    if (store.approvalStatus === "approved") {
      return res.status(400).json({
        success: false,
        message: "Store is already approved",
        currentStatus: store.approvalStatus,
      });
    }

    if (store.approvalStatus === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Cannot approve a rejected store. Please ask them to re-register.",
        currentStatus: store.approvalStatus,
      });
    }

    // Update store status and price category
    store.approvalStatus = "approved";
    store.priceCategory = priceCategory;
    store.approvedAt = new Date();
    store.approvedBy = adminId;
    await store.save();

    // Get category display name for notification
    const categoryNames = {
      aPrice: "Category A",
      bPrice: "Category B", 
      cPrice: "Category C",
      restaurantPrice: "Restaurant"
    };

    // Send approval notification
    try {
      await notificationService.createNotificationWithEmail(
        store._id,
        store.email,
        "store_approved",
        "Account Approved!",
        `Congratulations! Your store ${store.storeName} has been approved. You have been assigned to ${categoryNames[priceCategory]} pricing. You now have full access to the platform.`,
        "STORE_APPROVED",
        {
          ownerName: store.ownerName,
          storeName: store.storeName,
          priceCategory: categoryNames[priceCategory],
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth`,
        },
        { storeId: store._id, priceCategory },
        "/dashboard"
      );
    } catch (notificationError) {
      console.error("Error sending approval notification:", notificationError);
      // Don't fail the approval if notification fails
    }

    return res.status(200).json({
      success: true,
      message: "Store approved successfully",
      store: {
        _id: store._id,
        storeName: store.storeName,
        ownerName: store.ownerName,
        email: store.email,
        approvalStatus: store.approvalStatus,
        priceCategory: store.priceCategory,
        approvedAt: store.approvedAt,
      },
    });
  } catch (error) {
    console.error("Error approving store:", error);
    return res.status(500).json({
      success: false,
      message: "Error approving store",
    });
  }
};

/**
 * Reject a store registration
 * Updates approvalStatus to "rejected" and sends notification with reason
 */
const rejectStoreCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const store = await authModel.findById(id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    if (store.role !== "store") {
      return res.status(400).json({
        success: false,
        message: "This user is not a store",
      });
    }

    if (store.approvalStatus === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Store is already rejected",
        currentStatus: store.approvalStatus,
      });
    }

    if (store.approvalStatus === "approved") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject an approved store",
        currentStatus: store.approvalStatus,
      });
    }

    // Update store status
    store.approvalStatus = "rejected";
    store.rejectedAt = new Date();
    store.rejectedBy = adminId;
    store.rejectionReason = reason.trim();
    await store.save();

    // Send rejection notification
    try {
      await notificationService.createNotificationWithEmail(
        store._id,
        store.email,
        "store_rejected",
        "Registration Update",
        `Your registration for ${store.storeName} could not be approved. Reason: ${reason}`,
        "STORE_REJECTED",
        {
          ownerName: store.ownerName,
          storeName: store.storeName,
          rejectionReason: reason,
        },
        { storeId: store._id, reason },
        null
      );
    } catch (notificationError) {
      console.error("Error sending rejection notification:", notificationError);
      // Don't fail the rejection if notification fails
    }

    return res.status(200).json({
      success: true,
      message: "Store rejected successfully",
      store: {
        _id: store._id,
        storeName: store.storeName,
        ownerName: store.ownerName,
        email: store.email,
        approvalStatus: store.approvalStatus,
        rejectedAt: store.rejectedAt,
        rejectionReason: store.rejectionReason,
      },
    });
  } catch (error) {
    console.error("Error rejecting store:", error);
    return res.status(500).json({
      success: false,
      message: "Error rejecting store",
    });
  }
};

// Get paginated overdue/warning stores
const getPaginatedPaymentStoresCtrl = async (req, res) => {
  try {
    const { page = 1, limit = 10, type = "overdue" } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const Order = require("../models/orderModle");

    // Get all stores
    const allStores = await authModel.find({ role: "store" }).lean();
    const allStoreIds = allStores.map(s => s._id);

    // Get order stats for all stores
    const orderStats = await Order.aggregate([
      { $match: { store: { $in: allStoreIds }, isDelete: { $ne: true } } },
      {
        $group: {
          _id: "$store",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: { $ifNull: ["$total", 0] } },
          paidTotal: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, { $ifNull: ["$total", 0] }, 0] }
          },
          partialPaid: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "partial"] }, { $toDouble: { $ifNull: ["$paymentAmount", 0] } }, 0] }
          },
          paidOrdersCount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
          partialOrdersCount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "partial"] }, 1, 0] } },
          unpaidOrders: {
            $push: {
              $cond: [{ $ne: ["$paymentStatus", "paid"] }, { createdAt: "$createdAt", total: "$total" }, "$$REMOVE"]
            }
          }
        }
      }
    ]);

    const statsMap = new Map();
    orderStats.forEach(s => statsMap.set(s._id.toString(), s));

    // Process stores and filter by payment status
    const processedStores = allStores.map(store => {
      const stats = statsMap.get(store._id.toString()) || {
        totalOrders: 0, totalSpent: 0, paidTotal: 0, partialPaid: 0,
        paidOrdersCount: 0, partialOrdersCount: 0, unpaidOrders: []
      };

      const totalPaid = stats.paidTotal + stats.partialPaid;
      const balanceDue = stats.totalSpent - totalPaid;
      const unpaidOrdersCount = stats.totalOrders - stats.paidOrdersCount - stats.partialOrdersCount;
      const creditCount = unpaidOrdersCount + stats.partialOrdersCount;

      let paymentStatus = "good_standing";
      let oldestUnpaidDays = 0;

      if (balanceDue > 0 && stats.unpaidOrders.length > 0) {
        const oldestDate = stats.unpaidOrders.reduce((oldest, o) => {
          const d = new Date(o.createdAt);
          return d < oldest ? d : oldest;
        }, new Date());
        oldestUnpaidDays = Math.floor((now - oldestDate) / (1000 * 60 * 60 * 24));
        
        if (oldestUnpaidDays > 30) paymentStatus = "overdue";
        else if (oldestUnpaidDays > 14) paymentStatus = "warning";
      }

      return {
        _id: store._id,
        storeName: store.storeName,
        ownerName: store.ownerName,
        email: store.email,
        phone: store.phone,
        city: store.city,
        state: store.state,
        totalOrders: stats.totalOrders,
        totalSpent: stats.totalSpent,
        totalPaid,
        balanceDue,
        paidOrdersCount: stats.paidOrdersCount,
        partialOrdersCount: stats.partialOrdersCount,
        unpaidOrdersCount,
        creditCount,
        paymentStatus,
        oldestUnpaidDays
      };
    });

    // Filter by type
    const filteredStores = processedStores
      .filter(s => s.paymentStatus === type)
      .sort((a, b) => b.balanceDue - a.balanceDue);

    const totalStores = filteredStores.length;
    const totalPages = Math.ceil(totalStores / limitNum);
    const paginatedStores = filteredStores.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      stores: paginatedStores,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalStores,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error("Error fetching paginated payment stores:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Get paginated orders for a specific store
const getStoreOrdersPaginatedCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const Order = require("../models/orderModle");

    // Get total count
    const totalOrders = await Order.countDocuments({ store: id, isDelete: { $ne: true } });
    const totalPages = Math.ceil(totalOrders / limitNum);

    // Get paginated orders
    const orders = await Order.find({ store: id, isDelete: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("orderNumber total paymentStatus paymentAmount items createdAt")
      .lean();

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalOrders,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error("Error fetching store orders:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Forgot Password Controller
const forgotPasswordCtrl = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists
    const user = await authModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email address",
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // Token expires in 1 hour
    );

    // Save reset token to user (optional - for additional security)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${email}`;

    // Send email with reset link
    try {
      await notificationService.createNotificationWithEmail(
        user._id,
        user.email,
        "password_reset",
        "Password Reset Request",
        `Click the link below to reset your password: ${resetUrl}`,
        "PASSWORD_RESET",
        {
          resetUrl,
          storeName: user.storeName || user.ownerName || "User",
          expiryTime: "1 hour"
        }
      );

      res.status(200).json({
        success: true,
        message: "Password reset link sent to your email",
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      res.status(500).json({
        success: false,
        message: "Failed to send reset email. Please try again.",
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Verify Reset Token Controller
const verifyResetTokenCtrl = async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: "Token and email are required",
      });
    }

    // Verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if token matches the email
      if (decoded.email !== email) {
        return res.status(400).json({
          success: false,
          message: "Invalid token",
        });
      }

      // Check if user exists and token is still valid
      const user = await authModel.findOne({ 
        email,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      res.status(200).json({
        success: true,
        message: "Token is valid",
      });
    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("Verify token error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Reset Password Controller
const resetPasswordCtrl = async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Token, email, and password are required",
      });
    }

    // Verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if token matches the email
      if (decoded.email !== email) {
        return res.status(400).json({
          success: false,
          message: "Invalid token",
        });
      }

      // Find user and verify token
      const user = await authModel.findOne({ 
        email,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password and clear reset token
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Send confirmation email
      try {
        await notificationService.createNotificationWithEmail(
          user._id,
          user.email,
          "password_changed",
          "Password Changed Successfully",
          "Your password has been changed successfully. If you didn't make this change, please contact support immediately.",
          "PASSWORD_CHANGED",
          {
            storeName: user.storeName || user.ownerName || "User",
            changeTime: new Date().toLocaleString()
          }
        );
      } catch (emailError) {
        console.error("Confirmation email failed:", emailError);
        // Don't fail the password reset if email fails
      }

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};




module.exports = {
  registerCtrl,
  loginCtrl,
  verifyLoginOtpCtrl,
  resendLoginOtpCtrl,
  sendStoreOrderOtpCtrl,
  verifyStoreOrderOtpCtrl,
  getUserByEmailCtrl,
  updatePermitionCtrl,
  addMemberCtrl,
  getAllMemberCtrl,
  updateStoreCtrl,
  getAllStoreCtrl,
  fetchMyProfile,
  changePasswordCtrl,
  deleteStoreIfNoOrders,
  addChequeToStoreCtrl,
  editChequeCtrl,
  getChequesByStoreCtrl,
  deleteChequeCtrl,
  updateChequeStatusCtrl,
  getAllChequesCtrl,
  getStoreAnalyticsCtrl,
  getAllStoresAnalyticsCtrl,
  // Paginated APIs
  getPaginatedPaymentStoresCtrl,
  getStoreOrdersPaginatedCtrl,
  // New store management functions
  addCommunicationLogCtrl,
  getCommunicationLogsCtrl,
  addPaymentRecordCtrl,
  getPaymentRecordsCtrl,
  getAllStorePaymentsCtrl,
  sendPaymentReminderCtrl,
  sendStatementEmailCtrl,
  getStatementDataCtrl,
  // Store approval functions
  getPendingStoresCtrl,
  approveStoreCtrl,
  rejectStoreCtrl,
  // Password reset functions
  forgotPasswordCtrl,
  verifyResetTokenCtrl,
  resetPasswordCtrl,
};