const IncomingStock = require("../models/incomingStockModel");
const Product = require("../models/productModel");
const Vendor = require("../models/vendorModel");
const PurchaseOrder = require("../models/purchaseModel");
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
  return { monday, sunday };
};

/**
 * Get incoming stock for a specific week (for matrix)
 */
const getIncomingStockCtrl = async (req, res) => {
  try {
    const { weekOffset = 0 } = req.query;
    const { monday, sunday } = getWeekRange(weekOffset);

    const incomingStock = await IncomingStock.find({
      weekStart: { $gte: monday },
      weekEnd: { $lte: sunday },
      status: { $ne: "cancelled" },
    })
      .populate("product", "name image")
      .populate("vendor", "name")
      .lean();

    // Group by product for easy matrix integration
    const byProduct = {};
    incomingStock.forEach((item) => {
      const productId = item.product?._id?.toString();
      if (!productId) return;

      if (!byProduct[productId]) {
        byProduct[productId] = {
          productId,
          productName: item.product?.name,
          totalIncoming: 0,
          items: [],
          allLinked: true,
        };
      }

      byProduct[productId].totalIncoming += item.quantity || 0;
      byProduct[productId].items.push({
        _id: item._id,
        quantity: item.quantity,
        vendor: item.vendor,
        unitPrice: item.unitPrice,
        status: item.status,
        isLinked: item.status === "linked" || item.status === "received",
      });

      // Check if all items are linked
      if (item.status === "draft") {
        byProduct[productId].allLinked = false;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        incomingStock: Object.values(byProduct),
        weekRange: {
          start: monday.toISOString(),
          end: sunday.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching incoming stock:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching incoming stock",
      error: error.message,
    });
  }
};

/**
 * Add or update incoming stock from matrix
 */
const addIncomingStockCtrl = async (req, res) => {
  try {
    const { productId, quantity, weekOffset = 0, notes } = req.body;
    const userId = req.user?._id;

    if (!productId || quantity == null) {
      return res.status(400).json({
        success: false,
        message: "productId and quantity are required",
      });
    }

    const qty = Math.max(0, parseInt(quantity) || 0);
    const { monday, sunday } = getWeekRange(weekOffset);

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find existing draft incoming stock for this product/week
    let incomingStock = await IncomingStock.findOne({
      product: productId,
      weekStart: monday,
      weekEnd: sunday,
      status: "draft",
    });

    if (qty === 0) {
      // If quantity is 0, remove the draft entry
      if (incomingStock) {
        await IncomingStock.findByIdAndDelete(incomingStock._id);
        return res.status(200).json({
          success: true,
          message: "Incoming stock removed",
          data: null,
        });
      }
      return res.status(200).json({
        success: true,
        message: "No incoming stock to remove",
        data: null,
      });
    }

    if (incomingStock) {
      // Update existing
      incomingStock.quantity = qty;
      if (notes) incomingStock.notes = notes;
      await incomingStock.save();
    } else {
      // Create new
      incomingStock = await IncomingStock.create({
        product: productId,
        quantity: qty,
        weekStart: monday,
        weekEnd: sunday,
        status: "draft",
        addedBy: userId,
        notes: notes || "",
      });
    }

    await incomingStock.populate("product", "name image");

    res.status(200).json({
      success: true,
      message: "Incoming stock updated",
      data: incomingStock,
    });
  } catch (error) {
    console.error("Error adding incoming stock:", error);
    res.status(500).json({
      success: false,
      message: "Error adding incoming stock",
      error: error.message,
    });
  }
};

/**
 * Link incoming stock to vendor (and optionally create PRI Order)
 */
const linkIncomingStockCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId, unitPrice, createPurchaseOrder = false } = req.body;
    const userId = req.user?._id;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    const incomingStock = await IncomingStock.findById(id);
    if (!incomingStock) {
      return res.status(404).json({
        success: false,
        message: "Incoming stock not found",
      });
    }

    if (incomingStock.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft incoming stock can be linked",
      });
    }

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Update incoming stock
    incomingStock.vendor = vendorId;
    incomingStock.unitPrice = unitPrice || 0;
    incomingStock.status = "linked";
    incomingStock.linkedBy = userId;
    incomingStock.linkedAt = new Date();
    incomingStock.calculateTotal();

    // Optionally create PRI Order
    if (createPurchaseOrder) {
      const product = await Product.findById(incomingStock.product);
      
      // Generate PO number
      const counter = await Counter.findByIdAndUpdate(
        "purchaseOrderNumber",
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const poNumber = `PO-${String(counter.seq).padStart(6, "0")}`;

      const purchaseOrder = await PurchaseOrder.create({
        vendorId: vendorId,
        purchaseOrderNumber: poNumber,
        purchaseDate: new Date(),
        deliveryDate: incomingStock.weekEnd,
        status: "pending",
        totalAmount: incomingStock.totalPrice,
        items: [
          {
            productId: incomingStock.product,
            quantity: incomingStock.quantity,
            unitPrice: incomingStock.unitPrice,
            totalPrice: incomingStock.totalPrice,
            qualityStatus: "pending",
          },
        ],
        notes: `Auto-created from Matrix incoming stock`,
      });

      incomingStock.purchaseOrder = purchaseOrder._id;
    }

    await incomingStock.save();
    await incomingStock.populate("product", "name image");
    await incomingStock.populate("vendor", "name");

    res.status(200).json({
      success: true,
      message: "Incoming stock linked to vendor",
      data: incomingStock,
    });
  } catch (error) {
    console.error("Error linking incoming stock:", error);
    res.status(500).json({
      success: false,
      message: "Error linking incoming stock",
      error: error.message,
    });
  }
};

/**
 * Bulk link multiple incoming stocks to vendor
 * Supports partial quantity linking - remaining stays in incoming
 */
const bulkLinkIncomingStockCtrl = async (req, res) => {
  try {
    const { items, vendorId, createPurchaseOrder = true } = req.body;
    const userId = req.user?._id;

    if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "vendorId and items array are required",
      });
    }

    // Verify vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const linkedItems = [];
    const errors = [];
    let totalAmount = 0;
    const poItems = [];

    for (const item of items) {
      try {
        const incomingStock = await IncomingStock.findById(item.incomingStockId);
        if (!incomingStock) {
          errors.push({ id: item.incomingStockId, error: "Not found" });
          continue;
        }

        if (incomingStock.status !== "draft") {
          errors.push({ id: item.incomingStockId, error: "Already linked" });
          continue;
        }

        // Get the quantity to link (from request or full quantity)
        const linkQuantity = item.quantity != null ? Math.min(item.quantity, incomingStock.quantity) : incomingStock.quantity;
        
        if (linkQuantity <= 0) {
          errors.push({ id: item.incomingStockId, error: "Invalid quantity" });
          continue;
        }

        const remainingQuantity = incomingStock.quantity - linkQuantity;

        if (remainingQuantity > 0) {
          // Partial linking: Create new linked entry, update original with remaining
          
          // Create new linked incoming stock entry
          const linkedEntry = await IncomingStock.create({
            product: incomingStock.product,
            quantity: linkQuantity,
            weekStart: incomingStock.weekStart,
            weekEnd: incomingStock.weekEnd,
            vendor: vendorId,
            unitPrice: item.unitPrice || 0,
            status: "linked",
            linkedBy: userId,
            linkedAt: new Date(),
            addedBy: incomingStock.addedBy,
            notes: incomingStock.notes ? `${incomingStock.notes} (partial link)` : "Partial link from incoming",
          });
          linkedEntry.calculateTotal();
          await linkedEntry.save();

          // Update original with remaining quantity
          incomingStock.quantity = remainingQuantity;
          await incomingStock.save();

          linkedItems.push(linkedEntry);
          totalAmount += linkedEntry.totalPrice;
          poItems.push({
            productId: linkedEntry.product,
            quantity: linkedEntry.quantity,
            unitPrice: linkedEntry.unitPrice,
            totalPrice: linkedEntry.totalPrice,
            qualityStatus: "pending",
          });
        } else {
          // Full linking: Link the entire incoming stock
          incomingStock.vendor = vendorId;
          incomingStock.unitPrice = item.unitPrice || 0;
          incomingStock.status = "linked";
          incomingStock.linkedBy = userId;
          incomingStock.linkedAt = new Date();
          incomingStock.calculateTotal();

          await incomingStock.save();
          linkedItems.push(incomingStock);

          totalAmount += incomingStock.totalPrice;
          poItems.push({
            productId: incomingStock.product,
            quantity: incomingStock.quantity,
            unitPrice: incomingStock.unitPrice,
            totalPrice: incomingStock.totalPrice,
            qualityStatus: "pending",
          });
        }
      } catch (err) {
        errors.push({ id: item.incomingStockId, error: err.message });
      }
    }

    // Create single PRI Order for all items with auto-approved quality status
    let purchaseOrder = null;
    if (createPurchaseOrder && poItems.length > 0) {
      const counter = await Counter.findByIdAndUpdate(
        "purchaseOrderNumber",
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const poNumber = `PO-${String(counter.seq).padStart(6, "0")}`;

      // Set qualityStatus to "approved" for auto-verification
      const approvedPoItems = poItems.map(item => ({
        ...item,
        qualityStatus: "approved", // Auto-approve quality control
      }));

      purchaseOrder = await PurchaseOrder.create({
        vendorId: vendorId,
        purchaseOrderNumber: poNumber,
        purchaseDate: new Date(),
        status: "pending",
        totalAmount: totalAmount,
        items: approvedPoItems,
        notes: `Auto-created from Matrix - ${poItems.length} items (Auto-Approved)`,
      });

      // Update all linked items with PO reference and mark as received
      await IncomingStock.updateMany(
        { _id: { $in: linkedItems.map((i) => i._id) } },
        { 
          purchaseOrder: purchaseOrder._id,
          status: "received", // Mark as received since auto-approved
          receivedAt: new Date(),
        }
      );

      // Update product stock for each item (since auto-approved)
      for (const item of linkedItems) {
        const product = await Product.findById(item.product);
        if (product) {
          const qty = item.quantity;
          
          // Update product quantities
          product.quantity = (product.quantity || 0) + qty;
          product.totalPurchase = (product.totalPurchase || 0) + qty;
          product.remaining = (product.remaining || 0) + qty;

          // Add to purchase history
          product.purchaseHistory.push({
            date: new Date(),
            quantity: qty,
          });

          // Add to updatedFromOrders log
          product.updatedFromOrders.push({
            purchaseOrder: purchaseOrder._id,
            oldQuantity: product.quantity - qty,
            newQuantity: product.quantity,
            difference: qty,
          });

          await product.save();
          console.log(`✅ Auto-approved: Updated stock for ${product.name} (+${qty})`);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `${linkedItems.length} items linked to vendor and auto-approved`,
      data: {
        linkedCount: linkedItems.length,
        purchaseOrder: purchaseOrder,
        autoApproved: true,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Error bulk linking incoming stock:", error);
    res.status(500).json({
      success: false,
      message: "Error bulk linking incoming stock",
      error: error.message,
    });
  }
};

/**
 * Get unlinked incoming stock (for warnings)
 */
const getUnlinkedIncomingStockCtrl = async (req, res) => {
  try {
    const { weekOffset = 0 } = req.query;
    const { monday, sunday } = getWeekRange(weekOffset);

    const unlinked = await IncomingStock.find({
      weekStart: monday,
      weekEnd: sunday,
      status: "draft",
    })
      .populate("product", "name image")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        unlinkedCount: unlinked.length,
        items: unlinked,
        canConfirm: unlinked.length === 0,
      },
    });
  } catch (error) {
    console.error("Error fetching unlinked incoming stock:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching unlinked incoming stock",
      error: error.message,
    });
  }
};

/**
 * Mark incoming stock as received (updates Product.remaining)
 */
const receiveIncomingStockCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedQuantity } = req.body;
    const userId = req.user?._id;

    const incomingStock = await IncomingStock.findById(id);
    if (!incomingStock) {
      return res.status(404).json({
        success: false,
        message: "Incoming stock not found",
      });
    }

    if (incomingStock.status !== "linked") {
      return res.status(400).json({
        success: false,
        message: "Only linked incoming stock can be received",
      });
    }

    const qty = receivedQuantity ?? incomingStock.quantity;

    // NOTE: Stock adjustment is NOT done here anymore
    // Stock will be adjusted when Quality Control approves the item in Purchase Order
    // This just marks the incoming stock as received

    // Update incoming stock status
    incomingStock.status = "received";
    incomingStock.receivedAt = new Date();
    incomingStock.receivedQuantity = qty;
    incomingStock.receivedBy = userId;
    await incomingStock.save();

    res.status(200).json({
      success: true,
      message: "Incoming stock marked as received. Stock will be adjusted after Quality Control approval.",
      data: incomingStock,
    });
  } catch (error) {
    console.error("Error receiving incoming stock:", error);
    res.status(500).json({
      success: false,
      message: "Error receiving incoming stock",
      error: error.message,
    });
  }
};

/**
 * Delete/cancel incoming stock
 */
const deleteIncomingStockCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    const incomingStock = await IncomingStock.findById(id);
    if (!incomingStock) {
      return res.status(404).json({
        success: false,
        message: "Incoming stock not found",
      });
    }

    if (incomingStock.status === "received") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete received incoming stock",
      });
    }

    incomingStock.status = "cancelled";
    await incomingStock.save();

    res.status(200).json({
      success: true,
      message: "Incoming stock cancelled",
    });
  } catch (error) {
    console.error("Error deleting incoming stock:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting incoming stock",
      error: error.message,
    });
  }
};

module.exports = {
  getIncomingStockCtrl,
  addIncomingStockCtrl,
  linkIncomingStockCtrl,
  bulkLinkIncomingStockCtrl,
  getUnlinkedIncomingStockCtrl,
  receiveIncomingStockCtrl,
  deleteIncomingStockCtrl,
};
