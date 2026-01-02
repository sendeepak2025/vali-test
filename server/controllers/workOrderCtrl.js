const WorkOrder = require("../models/workOrderModel");
const Order = require("../models/orderModle");
const PreOrder = require("../models/preOrderModel");
const Product = require("../models/productModel");
const IncomingStock = require("../models/incomingStockModel");
const Counter = require("../models/counterModel");

/**
 * Helper: Get week range from offset
 */
const getWeekRange = (weekOffset = 0) => {
  const offset = parseInt(weekOffset) || 0;
  const now = new Date();
  const day = now.getUTCDay();
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - ((day + 6) % 7) + offset * 7,
      0, 0, 0, 0
    )
  );
  const sunday = new Date(
    Date.UTC(
      monday.getUTCFullYear(),
      monday.getUTCMonth(),
      monday.getUTCDate() + 6,
      23, 59, 59, 999
    )
  );
  const label = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  return { monday, sunday, label };
};

/**
 * Generate Work Order Number
 */
const generateWorkOrderNumber = async () => {
  const counter = await Counter.findByIdAndUpdate(
    "workOrderNumber",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `WO-${String(counter.seq).padStart(6, "0")}`;
};

/**
 * Create Work Order from confirmed PreOrders
 * Called after PreOrders are confirmed
 */
const createWorkOrderCtrl = async (req, res) => {
  try {
    const { 
      weekOffset = 0, 
      confirmedPreOrderIds = [], 
      confirmedOrderIds = [],
      shortageData = null 
    } = req.body;
    const userId = req.user?._id;

    const { monday, sunday, label } = getWeekRange(weekOffset);

    // Check if work order already exists for this week
    let workOrder = await WorkOrder.findOne({
      weekStart: monday,
      weekEnd: sunday,
      status: { $ne: "cancelled" }
    });

    if (workOrder) {
      // Update existing work order
      workOrder.confirmedPreOrders.push(...confirmedPreOrderIds.filter(
        id => !workOrder.confirmedPreOrders.includes(id)
      ));
      workOrder.confirmedOrders.push(...confirmedOrderIds.filter(
        id => !workOrder.confirmedOrders.includes(id)
      ));
    } else {
      // Create new work order
      const workOrderNumber = await generateWorkOrderNumber();
      workOrder = new WorkOrder({
        workOrderNumber,
        weekStart: monday,
        weekEnd: sunday,
        weekLabel: label,
        status: "confirmed",
        confirmedPreOrders: confirmedPreOrderIds,
        confirmedOrders: confirmedOrderIds,
        createdBy: userId,
        confirmedBy: userId,
        confirmedAt: new Date(),
      });
    }

    // Get all products involved
    const productIds = new Set();
    const storeOrderMap = new Map(); // storeId -> { items, totals }

    // Fetch confirmed orders
    const orders = await Order.find({
      _id: { $in: confirmedOrderIds },
      isDelete: { $ne: true }
    }).populate("store", "storeName city state");

    orders.forEach(order => {
      const storeId = order.store?._id?.toString();
      if (!storeId) return;

      if (!storeOrderMap.has(storeId)) {
        storeOrderMap.set(storeId, {
          store: order.store._id,
          storeName: order.store.storeName,
          storeCity: order.store.city,
          storeState: order.store.state,
          order: order._id,
          items: [],
          totalOrdered: 0,
        });
      }

      const storeData = storeOrderMap.get(storeId);
      storeData.order = order._id;

      order.items.forEach(item => {
        const productId = item.productId?.toString();
        if (!productId) return;
        productIds.add(productId);

        storeData.items.push({
          product: productId,
          productName: item.name || item.productName,
          ordered: item.quantity || 0,
          allocated: item.quantity || 0, // Will be adjusted if short
          shortage: 0,
          status: "full",
        });
        storeData.totalOrdered += item.quantity || 0;
      });
    });

    // Fetch products with current stock
    const products = await Product.find({
      _id: { $in: Array.from(productIds) }
    }).lean();

    // Fetch incoming stock for this week
    const incomingStocks = await IncomingStock.find({
      weekStart: monday,
      weekEnd: sunday,
      status: { $in: ["linked", "received"] }
    }).lean();

    // Build incoming stock map
    const incomingMap = {};
    incomingStocks.forEach(inc => {
      const pid = inc.product?.toString();
      if (!pid) return;
      incomingMap[pid] = (incomingMap[pid] || 0) + (inc.quantity || 0);
    });

    // Calculate product-level shortages
    const productShortages = [];
    const productStockMap = {}; // For allocation calculation

    products.forEach(product => {
      const pid = product._id.toString();
      const currentStock = product.remaining || 0;
      const incoming = incomingMap[pid] || 0;
      const totalAvailable = currentStock + incoming;

      // Calculate total ordered across all stores
      let totalOrdered = 0;
      storeOrderMap.forEach(storeData => {
        storeData.items.forEach(item => {
          if (item.product === pid) {
            totalOrdered += item.ordered;
          }
        });
      });

      const shortage = totalAvailable - totalOrdered;
      const status = shortage >= 0 ? "full" : (shortage > -totalOrdered ? "partial" : "short");

      productShortages.push({
        product: pid,
        productName: product.name,
        totalOrdered,
        totalAvailable,
        currentStock,
        incomingStock: incoming,
        shortage,
        status,
      });

      productStockMap[pid] = {
        available: totalAvailable,
        remaining: totalAvailable, // Will decrease as we allocate
        shortage,
      };
    });

    // If there are shortages, calculate fair allocation per store
    productShortages.forEach(ps => {
      if (ps.shortage < 0) {
        // Need to reduce allocations
        const pid = ps.product;
        let remainingStock = ps.totalAvailable;

        // Sort stores by order size (smaller orders first for fairness)
        const storeItems = [];
        storeOrderMap.forEach((storeData, storeId) => {
          const item = storeData.items.find(i => i.product === pid);
          if (item) {
            storeItems.push({ storeId, item, ordered: item.ordered });
          }
        });
        storeItems.sort((a, b) => a.ordered - b.ordered);

        // Allocate proportionally
        const totalOrdered = ps.totalOrdered;
        storeItems.forEach(si => {
          if (remainingStock <= 0) {
            si.item.allocated = 0;
            si.item.shortage = si.item.ordered;
            si.item.status = "short";
          } else {
            // Proportional allocation
            const proportion = si.ordered / totalOrdered;
            const allocated = Math.min(
              si.ordered,
              Math.floor(ps.totalAvailable * proportion)
            );
            si.item.allocated = Math.min(allocated, remainingStock);
            si.item.shortage = si.item.ordered - si.item.allocated;
            si.item.status = si.item.shortage > 0 ? (si.item.allocated > 0 ? "partial" : "short") : "full";
            remainingStock -= si.item.allocated;
          }
        });
      }
    });

    // Build store allocations
    const storeAllocations = [];
    storeOrderMap.forEach((storeData, storeId) => {
      let totalAllocated = 0;
      let totalShortage = 0;

      storeData.items.forEach(item => {
        totalAllocated += item.allocated;
        totalShortage += item.shortage;
      });

      const allocationStatus = totalShortage === 0 ? "full" : 
        (totalAllocated > 0 ? "partial" : "short");

      storeAllocations.push({
        store: storeData.store,
        storeName: storeData.storeName,
        storeCity: storeData.storeCity,
        storeState: storeData.storeState,
        order: storeData.order,
        items: storeData.items,
        totalOrdered: storeData.totalOrdered,
        totalAllocated,
        totalShortage,
        allocationStatus,
        pickingStatus: "pending",
      });
    });

    // Update work order
    workOrder.products = productShortages;
    workOrder.storeAllocations = storeAllocations;
    workOrder.totalOrders = confirmedOrderIds.length;
    workOrder.totalPreOrders = confirmedPreOrderIds.length;
    workOrder.calculateTotals();

    await workOrder.save();

    res.status(201).json({
      success: true,
      message: "Work order created successfully",
      data: workOrder,
    });
  } catch (error) {
    console.error("Error creating work order:", error);
    res.status(500).json({
      success: false,
      message: "Error creating work order",
      error: error.message,
    });
  }
};

/**
 * Get Work Order by ID
 */
const getWorkOrderCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    const workOrder = await WorkOrder.findById(id)
      .populate("products.product", "name image")
      .populate("storeAllocations.store", "storeName city state")
      .populate("storeAllocations.order", "orderNumber total")
      .populate("createdBy", "name email")
      .populate("confirmedBy", "name email");

    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: "Work order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    console.error("Error fetching work order:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching work order",
      error: error.message,
    });
  }
};

/**
 * Get Work Order for a specific week
 */
const getWorkOrderByWeekCtrl = async (req, res) => {
  try {
    const { weekOffset = 0 } = req.query;
    const { monday, sunday } = getWeekRange(weekOffset);

    const workOrder = await WorkOrder.findOne({
      weekStart: monday,
      weekEnd: sunday,
      status: { $ne: "cancelled" }
    })
      .populate("products.product", "name image")
      .populate("storeAllocations.store", "storeName city state")
      .populate("storeAllocations.order", "orderNumber total");

    if (!workOrder) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No work order found for this week",
      });
    }

    res.status(200).json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    console.error("Error fetching work order by week:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching work order",
      error: error.message,
    });
  }
};

/**
 * Get all Work Orders with pagination
 */
const getAllWorkOrdersCtrl = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, hasShortage } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (hasShortage === "true") query.hasShortage = true;
    if (hasShortage === "false") query.hasShortage = false;

    const [workOrders, total] = await Promise.all([
      WorkOrder.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("createdBy", "name")
        .lean(),
      WorkOrder.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: workOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching work orders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching work orders",
      error: error.message,
    });
  }
};

/**
 * Update store item picking status
 */
const updatePickingStatusCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId, productId, picked } = req.body;
    const userId = req.user?._id;

    const workOrder = await WorkOrder.findById(id);
    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: "Work order not found",
      });
    }

    const storeAllocation = workOrder.storeAllocations.find(
      sa => sa.store.toString() === storeId
    );
    if (!storeAllocation) {
      return res.status(404).json({
        success: false,
        message: "Store allocation not found",
      });
    }

    const item = storeAllocation.items.find(
      i => i.product.toString() === productId
    );
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    item.picked = picked;
    if (picked) {
      item.pickedAt = new Date();
      item.pickedBy = userId;
    } else {
      item.pickedAt = null;
      item.pickedBy = null;
    }

    // Update store picking status
    const allPicked = storeAllocation.items.every(i => i.picked);
    const anyPicked = storeAllocation.items.some(i => i.picked);
    
    if (allPicked) {
      storeAllocation.pickingStatus = "completed";
      storeAllocation.pickingCompletedAt = new Date();
      storeAllocation.pickedBy = userId;
    } else if (anyPicked) {
      storeAllocation.pickingStatus = "in_progress";
      if (!storeAllocation.pickingStartedAt) {
        storeAllocation.pickingStartedAt = new Date();
      }
    } else {
      storeAllocation.pickingStatus = "pending";
    }

    // Update overall work order status
    const allStoresCompleted = workOrder.storeAllocations.every(
      sa => sa.pickingStatus === "completed"
    );
    const anyStoreInProgress = workOrder.storeAllocations.some(
      sa => sa.pickingStatus === "in_progress" || sa.pickingStatus === "completed"
    );

    if (allStoresCompleted) {
      workOrder.status = "completed";
      workOrder.completedAt = new Date();
      workOrder.completedBy = userId;
    } else if (anyStoreInProgress) {
      workOrder.status = "in_progress";
    }

    await workOrder.save();

    res.status(200).json({
      success: true,
      message: "Picking status updated",
      data: workOrder,
    });
  } catch (error) {
    console.error("Error updating picking status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating picking status",
      error: error.message,
    });
  }
};

/**
 * Resolve product shortage (when more stock arrives)
 */
const resolveShortageCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, additionalQuantity, notes } = req.body;
    const userId = req.user?._id;

    const workOrder = await WorkOrder.findById(id);
    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: "Work order not found",
      });
    }

    const product = workOrder.updateProductStatus(
      productId,
      additionalQuantity,
      userId,
      notes
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found in work order",
      });
    }

    await workOrder.save();

    res.status(200).json({
      success: true,
      message: "Shortage resolved",
      data: {
        product,
        workOrder: {
          hasShortage: workOrder.hasShortage,
          shortProductCount: workOrder.shortProductCount,
          totalShortageQuantity: workOrder.totalShortageQuantity,
        },
      },
    });
  } catch (error) {
    console.error("Error resolving shortage:", error);
    res.status(500).json({
      success: false,
      message: "Error resolving shortage",
      error: error.message,
    });
  }
};

/**
 * Get shortage summary for dashboard
 */
const getShortagesSummaryCtrl = async (req, res) => {
  try {
    const { weekOffset = 0 } = req.query;
    const { monday, sunday } = getWeekRange(weekOffset);

    const workOrder = await WorkOrder.findOne({
      weekStart: monday,
      weekEnd: sunday,
      status: { $ne: "cancelled" }
    }).lean();

    if (!workOrder) {
      return res.status(200).json({
        success: true,
        data: {
          hasShortage: false,
          shortProducts: [],
          affectedStores: [],
          summary: null,
        },
      });
    }

    // Get short products
    const shortProducts = workOrder.products
      .filter(p => p.shortage < 0)
      .map(p => ({
        productId: p.product,
        productName: p.productName,
        totalOrdered: p.totalOrdered,
        totalAvailable: p.totalAvailable,
        shortage: Math.abs(p.shortage),
        status: p.status,
      }));

    // Get affected stores
    const affectedStores = workOrder.storeAllocations
      .filter(sa => sa.totalShortage > 0)
      .map(sa => ({
        storeId: sa.store,
        storeName: sa.storeName,
        totalOrdered: sa.totalOrdered,
        totalAllocated: sa.totalAllocated,
        totalShortage: sa.totalShortage,
        status: sa.allocationStatus,
        shortItems: sa.items.filter(i => i.shortage > 0).map(i => ({
          productName: i.productName,
          ordered: i.ordered,
          allocated: i.allocated,
          shortage: i.shortage,
        })),
      }));

    res.status(200).json({
      success: true,
      data: {
        workOrderId: workOrder._id,
        workOrderNumber: workOrder.workOrderNumber,
        hasShortage: workOrder.hasShortage,
        shortProducts,
        affectedStores,
        summary: {
          totalProducts: workOrder.totalProducts,
          shortProductCount: workOrder.shortProductCount,
          totalShortageQuantity: workOrder.totalShortageQuantity,
          shortagePercentage: workOrder.totalProducts > 0 
            ? Math.round((workOrder.shortProductCount / workOrder.totalProducts) * 100)
            : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching shortages summary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching shortages summary",
      error: error.message,
    });
  }
};

module.exports = {
  createWorkOrderCtrl,
  getWorkOrderCtrl,
  getWorkOrderByWeekCtrl,
  getAllWorkOrdersCtrl,
  updatePickingStatusCtrl,
  resolveShortageCtrl,
  getShortagesSummaryCtrl,
};
