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


const getAllPreOrdersCtrl = async (req, res) => {
  try {
    const storeId = req.query.storeId; 
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const searchRegex = new RegExp(search, "i");

    // Filter by storeId and optional search
    const filter = {
      ...(storeId && { store: storeId }),
      ...(search && { preOrderNumber: searchRegex }),
    };

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
      .populate("store", "storeName ");   // ⬅️ storeName populate

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


const confirmOrderCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const pre = await PreOrder.findById(id);
    if (!pre) return res.status(404).json({ success: false, message: "PreOrder not found" });

    // --- Check if already confirmed ---
    if (pre.confirmed) {
      return res.status(400).json({ success: false, message: "PreOrder is already confirmed" });
    }

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
      },
    };

    // --- Capture the response from createOrderCtrl ---
    let createdOrderData;
    const fakeRes = {
      status: function (statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json: function (data) {
        createdOrderData = data.newOrder || data; // Capture the created order
        return this;
      },
    };

    await createOrderCtrl(fakeReq, fakeRes);

    if (!createdOrderData) {
      return res.status(500).json({ success: false, message: "Order creation failed" });
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
    });
  } catch (error) {
    console.error("ConfirmOrder Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {createPreOrderCtrl, getAllPreOrdersCtrl, getSinglePreOrderCtrl, updatePreOrderCtrl, confirmOrderCtrl}