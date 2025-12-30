const mongoose = require("mongoose");
const Counter = require("../models/counterModel");
const PreOrder = require("../models/preOrderModel");
const { createOrderCtrl } = require("./orderCtrl");


const getNextPreOrderNumber = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: "preOrder" },      
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(5, "0");
  return `PO-${paddedSeq}`;
};


const createPreOrderCtrl = async (req, res) => {
  try {
    const {
      items,
      status,
      total,
      clientId,
      billingAddress,
      shippingAddress,
      orderType = "PreOrder",
      createdAt,
      priceListId,

    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Items are required" });
    }
    if (!billingAddress || !shippingAddress) {
      return res.status(400).json({ success: false, message: "Billing and Shipping addresses are required" });
    }

    const preOrderNumber = await getNextPreOrderNumber();

    const newPreOrder = new PreOrder({
      items,
      status: status || "Processing",
      total,
      store: clientId?.value || clientId,
      billingAddress,
      shippingAddress,
      orderType,
      preOrderNumber,
      priceListId: priceListId || null,
      createdAt: createdAt ? new Date(createdAt) : undefined,
    });

    await newPreOrder.save();

    return res.status(201).json({
      success: true,
      message: "Order created successfully..",
      preOrder: newPreOrder
    });
  } catch (error) {
    console.error("Create PreOrder Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating pre-order",
      error: error.message
    });
  }
};


const User = require("../models/authModel");

const getAllPreOrdersCtrl = async (req, res) => {
  try {
    // Get user from token (set by auth middleware)
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Get user details to check role
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const searchRegex = new RegExp(search, "i");

    // Build filter based on user role
    let filter = {};
    
    if (user.role === "store") {
      // Store users can only see their own preorders
      filter.store = new mongoose.Types.ObjectId(userId);
    } else if (user.role === "admin" || user.role === "member") {
      // Admin/member can see all preorders, or filter by storeId if provided
      const storeId = req.query.storeId;
      if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
        filter.store = new mongoose.Types.ObjectId(storeId);
      }
    }
    
    // Add search filter
    if (search) {
      filter.preOrderNumber = searchRegex;
    }
    
    console.log("PreOrder filter:", filter, "userId:", userId, "role:", user.role);

    const total = await PreOrder.countDocuments(filter);

    const preOrders = await PreOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("store");

    return res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      preOrders,
    });
  } catch (error) {
    console.error("Get All PreOrders Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching pre-orders",
      error: error.message,
    });
  }
};



const getSinglePreOrderCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await PreOrder.findById(id)
      .populate("store", "storeName ownerName priceCategory")
      .populate("priceListId");   // ⬅️ populate price list

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in getting pre order API!",
    });
  }
};


const updatePreOrderCtrl = async (req, res) => {
  try {
    const { id } = req.params; // preorder id
    const {
      store,
      status,
      items,
      billingAddress,
      shippingAddress,
      clientId,
      total,
      subtotal,
    } = req.body;

    // ---------- BASIC VALIDATIONS ----------
    if (!id) {
      return res.status(400).json({ success: false, message: "PreOrder ID is required" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Items are required" });
    }

    if (!billingAddress || !shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Billing and Shipping addresses are required"
      });
    }

    // ---------- BUILD UPDATE OBJECT ----------
    let updateData = {
      store: store || clientId?.value || clientId,
      status,
      items,
      billingAddress,
      shippingAddress,
      total,
      subtotal,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );


    // ---------- UPDATE IN DB ----------
    const updated = await PreOrder.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "PreOrder not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "PreOrder updated successfully",
      preOrder: updated
    });

  } catch (error) {
    console.error("Update PreOrder Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating PreOrder",
      error: error.message,
    });
  }
};


const { calculatePalletsNeeded } = require("../utils/palletCalculator");
const Product = require("../models/productModel");

const confirmOrderCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const pre = await PreOrder.findById(id);
    if (!pre) return res.status(404).json({ success: false, message: "PreOrder not found" });

    // --- Check if already confirmed ---
    if (pre.confirmed) {
      return res.status(400).json({ success: false, message: "PreOrder is already confirmed" });
    }

    // --- Calculate Pallet Data ---
    let totalPallets = 0;
    let totalBoxes = 0;
    const palletBreakdown = {};
    
    // Get product IDs from items
    const productIds = pre.items
      .filter(item => item.pricingType === "box")
      .map(item => item.productId || item.product);
    
    // Fetch products with pallet capacity
    const products = await Product.find({ _id: { $in: productIds } })
      .select('_id palletCapacity')
      .lean();
    
    // Create a map for quick lookup
    const productPalletMap = {};
    products.forEach(p => {
      if (p.palletCapacity?.totalCasesPerPallet > 0) {
        productPalletMap[p._id.toString()] = p.palletCapacity.totalCasesPerPallet;
      }
    });
    
    // Calculate pallets for each item
    pre.items.forEach(item => {
      if (item.pricingType === "box" && item.quantity > 0) {
        const productId = (item.productId || item.product)?.toString();
        const casesPerPallet = productPalletMap[productId];
        
        totalBoxes += item.quantity;
        
        if (casesPerPallet) {
          const palletInfo = calculatePalletsNeeded(item.quantity, casesPerPallet);
          if (palletInfo) {
            palletBreakdown[productId] = {
              boxes: item.quantity,
              casesPerPallet,
              palletsNeeded: palletInfo.totalPallets,
              fullPallets: palletInfo.fullPallets,
              partialCases: palletInfo.partialPalletCases
            };
            totalPallets += palletInfo.totalPallets;
          }
        }
      }
    });
    
    // Update palletData in preOrder
    pre.palletData = {
      palletCount: totalPallets,
      totalBoxes,
      palletBreakdown,
      calculatedAt: new Date()
    };
    pre.plateCount = totalPallets;

    // --- Prepare fake req.body for createOrderCtrl ---
    const fakeReq = {
      body: {
        items: pre.items,
        status: "Processing",
        total: pre.total,
        clientId: { value: pre.store },
        billingAddress: pre.billingAddress,
        shippingAddress: pre.shippingAddress,
        orderType: "Regural",
        createdAt: pre.createdAt,
        preOrder: pre._id,
        palletData: pre.palletData,
        plateCount: totalPallets
      },
    };

    // --- Capture the response from createOrderCtrl ---
    let createdOrderData;
    let responseStatusCode = 200;
    let responseData = null;
    
    const fakeRes = {
      status: function (statusCode) {
        responseStatusCode = statusCode;
        this.statusCode = statusCode;
        return this;
      },
      json: function (data) {
        responseData = data;
        createdOrderData = data.newOrder || data;
        return this;
      },
    };

    await createOrderCtrl(fakeReq, fakeRes);

    // Check if order creation failed
    if (responseStatusCode !== 201 && responseStatusCode !== 200) {
      return res.status(responseStatusCode).json({
        success: false,
        message: responseData?.message || "Order creation failed",
        error: responseData?.error,
        insufficientStock: responseData?.insufficientStock
      });
    }

    if (!createdOrderData || !createdOrderData._id) {
      return res.status(500).json({ success: false, message: "Order creation failed - no order data returned" });
    }

    // --- Update PreOrder ---
    pre.confirmed = true;
    pre.orderId = createdOrderData._id;
    await pre.save();

    res.status(200).json({
      success: true,
      message: "PreOrder confirmed and Order created successfully",
      order: createdOrderData,
      preOrder: pre,
      palletInfo: {
        totalPallets,
        totalBoxes,
        breakdown: palletBreakdown
      }
    });
  } catch (error) {
    console.error("ConfirmOrder Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {createPreOrderCtrl, getAllPreOrdersCtrl, getSinglePreOrderCtrl, updatePreOrderCtrl, confirmOrderCtrl}