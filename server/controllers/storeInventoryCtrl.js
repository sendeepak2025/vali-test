const StoreInventory = require("../models/storeInventoryModel");
const Product = require("../models/productModel");
const authModel = require("../models/authModel");
const mongoose = require("mongoose");

/**
 * Get inventory for a specific store
 */
exports.getStoreInventory = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 20, search, category, stockStatus } = req.query;

    const query = { store: storeId };

    // Build aggregation pipeline
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
    ];

    // Search filter
    if (search) {
      pipeline.push({
        $match: {
          "productDetails.name": { $regex: search, $options: "i" },
        },
      });
    }

    // Category filter
    if (category && category !== "all") {
      pipeline.push({
        $match: {
          "productDetails.category": new mongoose.Types.ObjectId(category),
        },
      });
    }

    // Stock status filter
    if (stockStatus && stockStatus !== "all") {
      if (stockStatus === "out-of-stock") {
        pipeline.push({ $match: { quantity: { $lte: 0 } } });
      } else if (stockStatus === "low") {
        pipeline.push({
          $match: {
            $expr: { $lte: ["$quantity", "$reorderPoint"] },
            quantity: { $gt: 0 },
          },
        });
      } else if (stockStatus === "overstocked") {
        pipeline.push({
          $match: { $expr: { $gte: ["$quantity", "$maxStock"] } },
        });
      }
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await StoreInventory.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push(
      { $sort: { "productDetails.name": 1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          store: 1,
          product: 1,
          quantity: 1,
          allocated: 1,
          available: 1,
          unitQuantity: 1,
          unitAllocated: 1,
          unitAvailable: 1,
          minStock: 1,
          maxStock: 1,
          reorderPoint: 1,
          location: 1,
          lastRestocked: 1,
          lastSold: 1,
          productName: "$productDetails.name",
          productImage: "$productDetails.image",
          productPrice: "$productDetails.price",
          productUnit: "$productDetails.unit",
          categoryName: "$categoryDetails.categoryName",
          stockStatus: {
            $cond: {
              if: { $lte: ["$quantity", 0] },
              then: "out-of-stock",
              else: {
                $cond: {
                  if: { $lte: ["$quantity", "$reorderPoint"] },
                  then: "low",
                  else: {
                    $cond: {
                      if: { $gte: ["$quantity", "$maxStock"] },
                      then: "overstocked",
                      else: "normal",
                    },
                  },
                },
              },
            },
          },
        },
      }
    );

    const inventory = await StoreInventory.aggregate(pipeline);

    res.status(200).json({
      success: true,
      data: inventory,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error getting store inventory:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get inventory summary by store (for dashboard)
 */
exports.getInventorySummaryByStore = async (req, res) => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "auths",
          localField: "store",
          foreignField: "_id",
          as: "storeDetails",
        },
      },
      { $unwind: "$storeDetails" },
      {
        $group: {
          _id: "$store",
          storeName: { $first: "$storeDetails.storeName" },
          ownerName: { $first: "$storeDetails.ownerName" },
          state: { $first: "$storeDetails.state" },
          city: { $first: "$storeDetails.city" },
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalValue: {
            $sum: {
              $multiply: ["$quantity", { $ifNull: ["$productDetails.price", 0] }],
            },
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$quantity", 0] },
                    { $lte: ["$quantity", "$reorderPoint"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outOfStockCount: {
            $sum: { $cond: [{ $lte: ["$quantity", 0] }, 1, 0] },
          },
        },
      },
      { $sort: { totalQuantity: -1 } },
    ];

    const summary = await StoreInventory.aggregate(pipeline);

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    console.error("Error getting inventory summary:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get inventory by state/region
 */
exports.getInventoryByRegion = async (req, res) => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "auths",
          localField: "store",
          foreignField: "_id",
          as: "storeDetails",
        },
      },
      { $unwind: "$storeDetails" },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$storeDetails.state",
          state: { $first: "$storeDetails.state" },
          storeCount: { $addToSet: "$store" },
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalValue: {
            $sum: { $multiply: ["$quantity", "$productDetails.price"] },
          },
          lowStockItems: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$quantity", 0] },
                    { $lte: ["$quantity", "$reorderPoint"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outOfStockItems: {
            $sum: { $cond: [{ $lte: ["$quantity", 0] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 1,
          state: 1,
          storeCount: { $size: "$storeCount" },
          totalProducts: 1,
          totalQuantity: 1,
          totalValue: 1,
          lowStockItems: 1,
          outOfStockItems: 1,
        },
      },
      { $sort: { totalValue: -1 } },
    ];

    const regionData = await StoreInventory.aggregate(pipeline);

    res.status(200).json({ success: true, data: regionData });
  } catch (error) {
    console.error("Error getting regional inventory:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Transfer inventory between stores
 */
exports.transferInventory = async (req, res) => {
  try {
    const { fromStoreId, toStoreId, productId, quantity, unitType = "box", reason } = req.body;

    if (!fromStoreId || !toStoreId || !productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "fromStoreId, toStoreId, productId, and quantity are required",
      });
    }

    // Get source inventory
    let sourceInventory = await StoreInventory.findOne({
      store: fromStoreId,
      product: productId,
    });

    if (!sourceInventory) {
      return res.status(404).json({
        success: false,
        message: "Source inventory not found",
      });
    }

    const qtyField = unitType === "unit" ? "unitQuantity" : "quantity";
    const availField = unitType === "unit" ? "unitAvailable" : "available";

    if (sourceInventory[qtyField] < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient inventory at source store",
      });
    }

    // Get or create destination inventory
    let destInventory = await StoreInventory.findOne({
      store: toStoreId,
      product: productId,
    });

    if (!destInventory) {
      destInventory = new StoreInventory({
        store: toStoreId,
        product: productId,
        quantity: 0,
        available: 0,
        unitQuantity: 0,
        unitAvailable: 0,
      });
    }

    // Update quantities
    sourceInventory[qtyField] -= quantity;
    sourceInventory[availField] = Math.max(0, sourceInventory[qtyField] - (sourceInventory.allocated || 0));
    
    destInventory[qtyField] += quantity;
    destInventory[availField] = destInventory[qtyField] - (destInventory.allocated || 0);
    destInventory.lastRestocked = new Date();

    // Add movement records
    const movementData = {
      type: "transfer",
      quantity,
      unitType,
      reason: reason || "Inventory transfer",
      fromStore: fromStoreId,
      toStore: toStoreId,
      date: new Date(),
    };

    sourceInventory.addMovement({ ...movementData, type: "out" });
    destInventory.addMovement({ ...movementData, type: "in" });

    await sourceInventory.save();
    await destInventory.save();

    res.status(200).json({
      success: true,
      message: "Inventory transferred successfully",
      data: { source: sourceInventory, destination: destInventory },
    });
  } catch (error) {
    console.error("Error transferring inventory:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Adjust store inventory (add/remove)
 */
exports.adjustStoreInventory = async (req, res) => {
  try {
    const { storeId, productId, quantity, unitType = "box", type, reason } = req.body;

    if (!storeId || !productId || quantity === undefined || !type) {
      return res.status(400).json({
        success: false,
        message: "storeId, productId, quantity, and type are required",
      });
    }

    let inventory = await StoreInventory.findOne({
      store: storeId,
      product: productId,
    });

    if (!inventory) {
      // Create new inventory record
      inventory = new StoreInventory({
        store: storeId,
        product: productId,
        quantity: 0,
        available: 0,
        unitQuantity: 0,
        unitAvailable: 0,
      });
    }

    const qtyField = unitType === "unit" ? "unitQuantity" : "quantity";
    const availField = unitType === "unit" ? "unitAvailable" : "available";

    if (type === "add") {
      inventory[qtyField] += quantity;
      inventory.lastRestocked = new Date();
    } else if (type === "remove") {
      if (inventory[qtyField] < quantity) {
        return res.status(400).json({
          success: false,
          message: "Insufficient inventory",
        });
      }
      inventory[qtyField] -= quantity;
      inventory.lastSold = new Date();
    }

    inventory[availField] = Math.max(0, inventory[qtyField] - (inventory.allocated || 0));

    // Add movement record
    inventory.addMovement({
      type: type === "add" ? "in" : "out",
      quantity,
      unitType,
      reason: reason || `Manual ${type}`,
      date: new Date(),
    });

    await inventory.save();

    res.status(200).json({
      success: true,
      message: `Inventory ${type === "add" ? "added" : "removed"} successfully`,
      data: inventory,
    });
  } catch (error) {
    console.error("Error adjusting inventory:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all stores with inventory stats
 */
exports.getStoresWithInventory = async (req, res) => {
  try {
    const { state, search } = req.query;

    // Get all stores
    const storeQuery = { role: "store" };
    if (state && state !== "all") {
      storeQuery.state = { $regex: state, $options: "i" };
    }
    if (search) {
      storeQuery.$or = [
        { storeName: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    const stores = await authModel.find(storeQuery).select(
      "storeName ownerName email state city address"
    );

    // Get inventory stats for each store
    const storeIds = stores.map((s) => s._id);
    
    const inventoryStats = await StoreInventory.aggregate([
      { $match: { store: { $in: storeIds } } },
      {
        $group: {
          _id: "$store",
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          lowStockCount: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", "$reorderPoint"] }] },
                1,
                0,
              ],
            },
          },
          outOfStockCount: {
            $sum: { $cond: [{ $lte: ["$quantity", 0] }, 1, 0] },
          },
        },
      },
    ]);

    // Merge store data with inventory stats
    const statsMap = {};
    inventoryStats.forEach((stat) => {
      statsMap[stat._id.toString()] = stat;
    });

    const result = stores.map((store) => ({
      ...store.toObject(),
      inventory: statsMap[store._id.toString()] || {
        totalProducts: 0,
        totalQuantity: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      },
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error getting stores with inventory:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Initialize store inventory from global products
 */
exports.initializeStoreInventory = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await authModel.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // Get all products
    const products = await Product.find({});

    // Create inventory records for each product
    const bulkOps = products.map((product) => ({
      updateOne: {
        filter: { store: storeId, product: product._id },
        update: {
          $setOnInsert: {
            store: storeId,
            product: product._id,
            quantity: 0,
            available: 0,
            unitQuantity: 0,
            unitAvailable: 0,
            minStock: 5,
            maxStock: 100,
            reorderPoint: 10,
          },
        },
        upsert: true,
      },
    }));

    await StoreInventory.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: `Initialized inventory for ${products.length} products`,
    });
  } catch (error) {
    console.error("Error initializing store inventory:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
