const Task = require('../models/taskModel');
const productModel = require("../models/productModel")
const categoryModel = require("../models/categoryModel")
const Order = require("../models/orderModle");
const Product = require("../models/productModel");
const mongoose = require("mongoose");
const { calculateInventoryPallets } = require("../utils/palletCalculator");



const createProductCtrl = async (req, res) => {
    try {
        const {
            name,
            category,
            quantity,
            unit,
            price,
            threshold,
            description,
            enablePromotions,
            palette,
            weightVariation,
            expiryDate,
            batchInfo,
            origin,
            organic,
            storageInstructions,
            boxSize,
            pricePerBox,
            // Price tiers
            aPrice,
            bPrice,
            cPrice,
            restaurantPrice,
            image,
            shippinCost=0,
            // New fields for sales mode and pallet tracking
            salesMode = "both",
            caseDimensions,
            caseWeight = 0,
            palletInputMode = "auto",
            manualCasesPerPallet = 0,
            
        } = req.body;

console.log(req.body)
      
        if (!name || !category  || !price) {
            return res.status(400).json({ success: false, message: "All required fields must be filled." });
        }

        // Validate salesMode if provided
        const validSalesModes = ["unit", "case", "both"];
        if (salesMode && !validSalesModes.includes(salesMode)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid sales mode. Must be 'unit', 'case', or 'both'." 
            });
        }

        const newProduct = new productModel({
            name,
            category,
            quantity,
            unit,
            price,
            threshold,
            description: description || "N/A",
            enablePromotions,
            palette,
            weightVariation,
            expiryDate,
            batchInfo,
            origin,
            organic,
            shippinCost,
            storageInstructions,
            boxSize,
            pricePerBox,
            // Price tiers
            aPrice: aPrice || 0,
            bPrice: bPrice || 0,
            cPrice: cPrice || 0,
            restaurantPrice: restaurantPrice || 0,
            image: image,
            // New fields
            salesMode: salesMode || "both",
            caseDimensions: caseDimensions || { length: 0, width: 0, height: 0 },
            caseWeight: caseWeight || 0,
            palletInputMode: palletInputMode || "auto",
            manualCasesPerPallet: manualCasesPerPallet || 0,
          
        });

        const product = await newProduct.save();

        await categoryModel.findByIdAndUpdate(category, { $push: { products: product._id } });

        res.status(201).json({ success: true, message: "Product created successfully", product });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Error in create product API", error: error.message });
    }
};

const getAllProductCtrl = async (req, res) => {
  try {
    // Step 1: Fetch all products with category
    const products = await productModel.find()
      .populate({
        path: "category",
        select: "categoryName",
      })
      .lean();

    // Step 2: Aggregate total orders for each product
    const orderStats = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalOrder: { $sum: "$items.quantity" },
        }
      }
    ]);

    // Step 3: Convert stats to map
    const orderMap = {};
    orderStats.forEach(stat => {
      orderMap[stat._id.toString()] = stat.totalOrder;
    });

    // Step 4: Remove unwanted fields from response and add pallet estimates
    const modifiedProducts = products.map(product => {
      const {
        totalSell,
        totalPurchase,
        remaining,
        unitPurchase,
        unitRemaining,
        unitSell,
        purchaseHistory,
        salesHistory,
        lbPurchaseHistory,
        lbSellHistory,
        quantityTrash,
        bulkDiscount,
        category,
        ...rest
      } = product;

      // Calculate pallet estimate for current inventory (using remaining as current stock in cases)
      let palletEstimate = null;
      if (product.palletCapacity && product.palletCapacity.totalCasesPerPallet > 0) {
        const currentStock = product.remaining || 0;
        palletEstimate = calculateInventoryPallets(currentStock, product.palletCapacity);
      }

      return {
        ...rest,
        category: category?.categoryName || null,
        totalOrder: orderMap[product._id.toString()] || 0,
        // Include new fields explicitly
        salesMode: product.salesMode || "both",
        caseDimensions: product.caseDimensions || { length: 0, width: 0, height: 0 },
        caseWeight: product.caseWeight || 0,
        palletCapacity: product.palletCapacity || { casesPerLayer: 0, layersPerPallet: 0, totalCasesPerPallet: 0 },
        palletEstimate: palletEstimate,
      };
    });

    // Calculate total pallet estimate across all products
    let totalPalletEstimate = 0;
    modifiedProducts.forEach(p => {
      if (p.palletEstimate && p.palletEstimate.estimatedPallets) {
        totalPalletEstimate += p.palletEstimate.estimatedPallets;
      }
    });

    return res.status(200).json({
      success: true,
      products: modifiedProducts,
      summary: {
        totalProducts: modifiedProducts.length,
        totalPalletEstimate: totalPalletEstimate,
        palletEstimateDisclaimer: "Pallet estimates are for planning purposes only - verify for actual shipping"
      }
    });
  } catch (error) {
    console.error("Product fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Error in getting products API!",
    });
  }
};




// const getWeeklyOrdersByProductCtrl = async (req, res) => {
//   try {
//     const { productId } = req.params;
//     const { startDate, endDate } = req.query;

//     // Validate inputs
//     if (!mongoose.Types.ObjectId.isValid(productId)) {
//       return res.status(400).json({ success: false, message: "Invalid Product ID" });
//     }

//     if (!startDate || !endDate) {
//       return res.status(400).json({ success: false, message: "Start and End date required" });
//     }

//     const fromDate = new Date(`${startDate}T00:00:00.000Z`);
//     const toDate = new Date(`${endDate}T23:59:59.999Z`);

//     // Fetch product details
//     const product = await Product.findById(productId).select("name image").lean();
//     if (!product) {
//       return res.status(404).json({ success: false, message: "Product not found" });
//     }

//     const today = new Date();
//     const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)

//     // If today is Monday (1), return empty data
//     if (currentDay === 1) {
//       return res.status(200).json({
//         success: true,
//         productId,
//         productTitle: product.name,
//         productImage: product.image || null,
//         totalOrdersThisWeek: 0,
//         buyers: []
//       });
//     }

//     // Fetch matching orders
//     const orders = await Order.find({
//       createdAt: { $gte: fromDate, $lte: toDate },
//       "items.productId": productId,
//       orderType: "Regural"
//     })
//       .populate("store", "storeName ownerName")
//       .lean();

//     let totalQuantity = 0;
//     const buyers = [];

//     orders.forEach(order => {
//       const buyerName = order.store?.storeName || order.store?.ownerName || "Unknown";

//       order.items.forEach(item => {
//         if (item.productId?.toString() === productId && item.quantity > 0) {
//           totalQuantity += item.quantity;
//           buyers.push({
//             name: buyerName,
//             quantity: item.quantity,
//             orderDate: order.createdAt
//           });
//         }
//       });
//     });

//     return res.status(200).json({
//       success: true,
//       productId,
//       productTitle: product.name,
//       productImage: product.image || null,
//       totalOrdersThisWeek: totalQuantity,
//       buyers
//     });

//   } catch (error) {
//     console.error("Error in getWeeklyOrdersByProductCtrl:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });
//   }
// };

  





const getSingleProductCtrl = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await productModel.findById(id);
        return res.status(200).json({
            success: true,
            product
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error in getting product API!",
        });
    }
}


const deleteProductCtrl = async (req, res) => {
    try {
        const { id } = req.params;
      
        const existProduct = await productModel.findById(id);
        if (!existProduct) {
            return res.status(400).json({
                success: false,
                message: "Product Not Found",
            });
        }


        await productModel.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully!",
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error in deleting Product API!",
        });
    }
};


const updateProductCtrl = async (req, res) => {
    try {
        const {
            name,
            category,
            quantity,
            unit,
            price,
            threshold,
            description,
            enablePromotions,
            palette,
            weightVariation,
            expiryDate,
            batchInfo,
            origin,
            organic,
            storageInstructions,
            boxSize,
            pricePerBox,
            // Price tiers
            aPrice,
            bPrice,
            cPrice,
            restaurantPrice,
            image,
            shippinCost,
            totalPurchase,
            // New fields for sales mode and pallet tracking
            salesMode,
            caseDimensions,
            caseWeight,
            palletInputMode,
            manualCasesPerPallet
        } = req.body;

        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }

        const product = await productModel.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Validate salesMode if provided
        if (salesMode) {
            const validSalesModes = ["unit", "case", "both"];
            if (!validSalesModes.includes(salesMode)) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid sales mode. Must be 'unit', 'case', or 'both'." 
                });
            }
        }

        product.name = name || product.name;
        product.category = category || product.category;
        product.quantity = quantity || product.quantity;
        product.unit = unit || product.unit;
        product.price = price || product.price;
        product.threshold = threshold || product.threshold;
        product.description = description || product.description;
        product.enablePromotions = enablePromotions ?? product.enablePromotions;
        product.palette = palette || product.palette;
        product.weightVariation = weightVariation || product.weightVariation;
        product.expiryDate = expiryDate || product.expiryDate;
        product.batchInfo = batchInfo || product.batchInfo;
        product.origin = origin || product.origin;
        product.organic = organic ?? product.organic;
        product.storageInstructions = storageInstructions || product.storageInstructions;
        product.boxSize = boxSize || product.boxSize;
        product.pricePerBox = pricePerBox || product.pricePerBox;
        // Update price tiers
        if (aPrice !== undefined) product.aPrice = aPrice;
        if (bPrice !== undefined) product.bPrice = bPrice;
        if (cPrice !== undefined) product.cPrice = cPrice;
        if (restaurantPrice !== undefined) product.restaurantPrice = restaurantPrice;
        product.image = image;
        product.shippinCost = shippinCost;
        product.totalPurchase = totalPurchase;
        
        // Update new fields
        if (salesMode) product.salesMode = salesMode;
        if (caseDimensions) {
            product.caseDimensions = {
                length: caseDimensions.length ?? product.caseDimensions?.length ?? 0,
                width: caseDimensions.width ?? product.caseDimensions?.width ?? 0,
                height: caseDimensions.height ?? product.caseDimensions?.height ?? 0
            };
        }
        if (caseWeight !== undefined) product.caseWeight = caseWeight;
        if (palletInputMode) product.palletInputMode = palletInputMode;
        if (manualCasesPerPallet !== undefined) product.manualCasesPerPallet = manualCasesPerPallet;

        await product.save();

        return res.status(200).json({
            success: true,
            message: "Product Updated Successfully!",
            product,
        });
    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({
            success: false,
            message: "Error in updating product API!",
        });
    }
};


const updateProductPrice = async (req, res) => {
    try {
        const priceUpdates = req.body; 
        // Expected format: { 'id1': { pricePerBox: 10, aPrice: 9, bPrice: 8 }, 'id2': {...} }
        // OR legacy format: { 'id1': price1, 'id2': price2, ... }

        const updatePromises = Object.entries(priceUpdates).map(([id, priceData]) => {
            // Support both new format (object with multiple prices) and legacy format (single number)
            if (typeof priceData === 'object' && priceData !== null) {
                const updateFields = {};
                if (priceData.pricePerBox !== undefined) updateFields.pricePerBox = priceData.pricePerBox;
                if (priceData.aPrice !== undefined) updateFields.aPrice = priceData.aPrice;
                if (priceData.bPrice !== undefined) updateFields.bPrice = priceData.bPrice;
                if (priceData.cPrice !== undefined) updateFields.cPrice = priceData.cPrice;
                if (priceData.restaurantPrice !== undefined) updateFields.restaurantPrice = priceData.restaurantPrice;
                return productModel.findByIdAndUpdate(id, updateFields, { new: true });
            } else {
                // Legacy format - just update pricePerBox
                return productModel.findByIdAndUpdate(id, { pricePerBox: priceData }, { new: true });
            }
        });

        // Wait for all updates to complete
        const updatedProducts = await Promise.all(updatePromises);

        // Filter out null values in case any product wasn't found
        const successfulUpdates = updatedProducts.filter(product => product !== null);

        if (successfulUpdates.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No products found for the given IDs!",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product prices updated successfully!",
            updatedProducts
        });

    } catch (error) {
        console.error("Error updating product prices:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating product prices!",
        });
    }
};

const bulkDiscountApply = async (req, res) => {
    try {
        const { formData, product } = req.body;

        // 🔹 Validation: Check if formData & product array exist
        if (!Array.isArray(formData) || formData.length === 0) {
            return res.status(400).json({ success: false, message: "No products selected. Please select at least one product." });
        }
        if (!Array.isArray(product) || product.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid discount data. Please provide at least one discount." });
        }

        // 🔹 Extract product IDs
        const productIds = formData.map(item => item._id);

        // 🔹 Update products with bulk discounts
        const updatedProducts = await productModel.updateMany(
            { _id: { $in: productIds } }, // Match multiple products
            {
                $set: {
                    bulkDiscount: product, // Set discount array
                    lastUpdated: new Date()
                }
            }
        );

        // 🔹 Response Handling
        if (updatedProducts.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: "No products updated. Make sure the product IDs are correct." });
        }

        return res.status(200).json({
            success: true,
            message: `Bulk discounts applied successfully to ${updatedProducts.modifiedCount} products.`,
        });

    } catch (error) {
        console.error("Error updating bulk discounts:", error);
        res.status(500).json({ success: false, message: "Internal Server Error. Please try again later." });
    }
}





// ✅ Create Task
exports.createTask = async (req, res) => {
    try {
        const { assignedTo, title, description, dueDate, priority, progress, status } = req.body;

        // 🛑 Validation
        if (!title || title.length < 3) return res.status(400).json({ success: false, message: "Title must be at least 3 characters long." });
        if (!description || description.length < 5) return res.status(400).json({ success: false, message: "Description must be at least 5 characters long." });
        if (!dueDate || isNaN(new Date(dueDate))) return res.status(400).json({ success: false, message: "Invalid due date." });
        if (priority && !["low", "medium", "high", "urgent", ""].includes(priority.toLowerCase())) return res.status(400).json({ success: false, message: "Invalid priority." });

        // ✅ Save to Database
        const task = new Task({ assignedTo, title, description, dueDate, priority, progress, status });
        await task.save();

        res.status(201).json({ success: true, message: "Task created successfully", task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Get All Tasks
exports.getAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find().populate("assignedTo").exec();
        res.json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



// ✅ Update Task
exports.updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const task = await Task.findById(id);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        // ✅ Update valid fields
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] !== undefined) task[key] = updateData[key];
        });

        await task.save();
        res.json({ success: true, message: "Task updated successfully", task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findByIdAndDelete(id);

        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        res.json({ success: true, message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get products for a specific store
exports.getProductsByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({ success: false, message: "Store ID is required" });
    }
    
    // You would need to implement the logic to get products for a specific store
    // This is just a placeholder implementation
    const products = await Product.find({ store: storeId }).populate('category').exec();
    
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateTotalSellForAllProducts = async (req, res) => {
  try {
    // Step 1: Fetch all regular orders
    const orders = await Order.find({
      orderType: "Regural"
    }).select("items").lean();

    // Step 2: Prepare map to accumulate total quantity per productId
    const productSalesMap = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.productId?.toString();
        const quantity = item.quantity;

        if (!productId || quantity <= 0) return;

        if (!productSalesMap[productId]) {
          productSalesMap[productId] = 0;
        }

        productSalesMap[productId] += quantity;
      });
    });

    // Step 3: Prepare bulk update operations
    const bulkOps = Object.entries(productSalesMap).map(([productId, totalSell]) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(productId) },
        update: { $set: { totalSell } }
      }
    }));

    // Step 4: Set totalSell = 0 for unsold products
    const allProductIds = await Product.find().distinct("_id");
    const soldProductIds = Object.keys(productSalesMap).map(id => id.toString());

    const unsoldProductIds = allProductIds
      .map(id => id.toString())
      .filter(id => !soldProductIds.includes(id));

    unsoldProductIds.forEach(productId => {
      bulkOps.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(productId) },
          update: { $set: { totalSell: 0 } }
        }
      });
    });

    // Step 5: Perform bulk update
    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }

    // Step 6: Return updated data
    const updatedProducts = await Product.find().select("name image totalSell").lean();

    return res.status(200).json({
      success: true,
      message: "Total sell updated from orders successfully",
      products: updatedProducts
    });

  } catch (error) {
    console.error("Error updating totalSell from orders:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};





// const getAllProductsWithHistorySummary = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     // Parse dates
//     const fromDate = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
//     const toDate = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

//     // Helper: checks if date is within range
//     const isWithinRange = (date) => {
//       const d = new Date(date);
//       return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
//     };

//     // Fetch all products
//     const products = await Product.find().lean()

//     const productSummaries = products.map(product => {
//       // Filter data within date range
//       const filteredPurchase = product?.purchaseHistory?.filter(p => isWithinRange(p.date));
//       const filteredSell = product?.salesHistory?.filter(s => isWithinRange(s.date));
//       const filteredUnitPurchase = product?.lbPurchaseHistory?.filter(p => isWithinRange(p.date));
//       const filteredUnitSell = product?.lbSellHistory?.filter(s => isWithinRange(s.date));

//       // Calculate totals
//       const totalPurchase = filteredPurchase?.reduce((sum, p) => sum + p.quantity, 0);
//       const totalSell = filteredSell?.reduce((sum, s) => sum + s.quantity, 0);
//       const unitPurchase = filteredUnitPurchase?.reduce((sum, p) => sum + p.weight, 0);
//       const unitSell = filteredUnitSell?.reduce((sum, s) => sum + s.weight, 0);

//       const totalRemaining = totalPurchase - totalSell;
//       const unitRemaining = unitPurchase - unitSell;

//       return {
//         product,
//         summary: {
//           totalPurchase,
//           totalSell,
//           totalRemaining: Math.max(0, totalRemaining),
//           unitPurchase,
//           unitSell,
//           unitRemaining: Math.max(0, unitRemaining),
//         },
//       };
//     });

//     res.status(200).json({
//       success: true,
//       data: productSummaries,
//     });

//   } catch (error) {
//     console.error("❌ Error fetching all product summaries:", error);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };

const resetAllProductStats = async () => {
  try {
    const products = await Product.find();

    for (const product of products) {
      product.quantity = 0;
      product.totalPurchase = 0;
      product.remaining = 0;
      product.unitPurchase = 0;
      product.unitRemaining = 0;

      product.purchaseHistory = [];
      product.salesHistory = [];
      product.lbPurchaseHistory = [];
      product.lbSellHistory = [];
      product.quantityTrash = [];

      await product.save();
    }

    console.log("✅ All product stats reset successfully.");
  } catch (err) {
    console.error("❌ Error resetting product stats:", err);
  }
};


const resetAndRebuildHistoryFromOrders = async () => {
  try {
  
    // const fromDate = new Date(Date.UTC(2025, 5, 14, 0, 0, 0)); // 2025-06-16
    // const toDate = new Date(Date.UTC(2025, 5, 19, 0, 0, 0));   // 2025-06-17
const fromDate = new Date("2025-06-14T00:00:00.000Z");
const toDate = new Date("2030-06-19T23:59:59.999Z");

    // STEP 1: Get all orders for 16 June
    const orders = await Order.find({
      createdAt: {
        $gte: fromDate,
        $lt: toDate,
      },
    });

    console.log(`🧾 Orders found: ${orders.length}`);

    // STEP 2: Get all unique product IDs used in these orders
    const productIds = new Set();
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.productId) {
          productIds.add(item.productId.toString());
        }
      });
    });

    console.log(`📦 Unique products used: ${productIds.size}`);

    // STEP 3: Reset history for these products
    for (const productId of productIds) {
      const product = await Product.findById(productId);
      if (!product) continue;

      product.lbSellHistory = [];
      product.salesHistory = [];
      product.unitSell = 0;
      product.totalSell = 0;

      product.unitRemaining = product.unitPurchase;
      product.remaining = product.totalPurchase;

      await product.save();
      console.log(`♻ Reset: ${product.name}`);
    }

    // STEP 4: Rebuild history from orders
    for (const order of orders) {
      const { items, createdAt: orderDate } = order;

      for (const item of items) {
        const { productId, quantity, pricingType } = item;
        if (!productId || quantity <= 0) continue;

        const product = await Product.findById(productId);
        if (!product) continue;

        const saleDate = orderDate;

        if (pricingType === "unit") {
          product.lbSellHistory.push({
            date: saleDate,
            weight: quantity,
            lb: "unit",
          });

          product.unitSell += quantity;
          product.unitRemaining = Math.max(0, product.unitRemaining - quantity);
        }

        if (pricingType === "box") {
          const totalBoxes = product.totalPurchase || 0;
          const totalUnits = product.unitPurchase || 0;

          const avgUnitsPerBox = totalBoxes > 0 ? totalUnits / totalBoxes : 0;
          const estimatedUnitsUsed = avgUnitsPerBox * quantity;

          product.lbSellHistory.push({
            date: saleDate,
            weight: estimatedUnitsUsed,
            lb: "box",
          });

          product.salesHistory.push({
            date: saleDate,
            quantity: quantity,
          });

          product.totalSell += quantity;
          product.remaining = Math.max(0, product.remaining - quantity);
          product.unitRemaining = Math.max(0, product.unitRemaining - estimatedUnitsUsed);
        }

        await product.save();
        console.log(`✅ Updated: ${product.name}`);
      }
    }

    console.log("🎉 Done resetting & rebuilding product history for 16 June.");
  } catch (err) {
    console.error("❌ Error in rebuild:", err);
  }
};



const resetSalesForLastTwoDays = async () => {
  try {
    const startDate = new Date("2025-06-30T00:00:00.000Z");
    const endDate = new Date("2025-07-02T00:00:00.000Z"); // Non-inclusive

    const products = await Product.find();


    
    for (const product of products) {
      let unitSellDeleted = 0;
      let totalSellDeleted = 0;
      let unitFromBoxEstimation = 0;

      // Filter lbSellHistory
      const newLbSellHistory = product.lbSellHistory.filter((entry) => {
        const entryDate = new Date(entry.date);
        const isInRange = entryDate >= startDate && entryDate < endDate;
        if (isInRange) {
          if (entry.lb === "unit") {
            unitSellDeleted += entry.weight;
          } else if (entry.lb === "box") {
            const totalBoxes = product.totalPurchase || 0;
            const totalUnits = product.unitPurchase || 0;
            const avgUnitsPerBox = totalBoxes > 0 ? totalUnits / totalBoxes : 0;
            unitFromBoxEstimation += avgUnitsPerBox * entry.weight;
          }
          return false; // Remove entry
        }
        return true; // Keep entry
      });

      // Filter salesHistory (box sales)
      const newSalesHistory = product.salesHistory.filter((entry) => {
        const entryDate = new Date(entry.date);
        const isInRange = entryDate >= startDate && entryDate < endDate;
        if (isInRange) {
          totalSellDeleted += entry.quantity;
          return false;
        }
        return true;
      });

      // Update product values
      product.lbSellHistory = newLbSellHistory;
      product.salesHistory = newSalesHistory;

      product.unitSell = Math.max(0, product.unitSell - unitSellDeleted);
      product.totalSell = Math.max(0, product.totalSell - totalSellDeleted);
      product.unitRemaining += unitSellDeleted + unitFromBoxEstimation;
      product.remaining += totalSellDeleted;

      await product.save();
      console.log(`🧹 Reset sales for: ${product.name}`);
    }



       for (const product of products) {
      // Filter quantityTrash
      product.quantityTrash = product.quantityTrash.filter(trash => {
        const trashDate = new Date(trash.date);
        return !(trashDate >= startDate && trashDate < endDate);
      });


        product.manuallyAddBox.quantity = 0;
        product.manuallyAddBox.date = null;
 

        product.manuallyAddUnit.quantity = 0;
        product.manuallyAddUnit.date = null;
      

      await product.save();
      console.log(`🧼 Cleaned trash/manual additions for: ${product.name}`);
    }



    console.log("✅ Sales reset for 30 June and 1 July completed.");
  } catch (error) {
    console.error("❌ Error resetting sales history:", error);
  }
};




const resetAndRebuildHistoryForSingleProduct = async (productId, fromDateStr, toDateStr) => {
  try {
   const fromDate = new Date("2025-06-30T00:00:00.000Z");
const toDate = new Date("2030-06-22T23:59:59.999Z");
    // STEP 1: Find the product
    const product = await Product.findById(productId);
    if (!product) {
      console.log("❌ Product not found");
      return;
    }

    // STEP 2: Reset product history
    product.lbSellHistory = [];
    product.salesHistory = [];
    product.unitSell = 0;
    product.totalSell = 0;
    product.unitRemaining = product.unitPurchase;
    product.remaining = product.totalPurchase;

    await product.save();
    console.log(`♻ Reset: ${product.name}`);

    // STEP 3: Get orders in the date range where this product is used
    const orders = await Order.find({
      createdAt: {
        $gte: fromDate,
        $lte: toDate,
      },
      "items.productId": productId,
    });

    console.log(`🧾 Orders found using this product: ${orders.length}`);

    // STEP 4: Rebuild history for this product
    for (const order of orders) {
      const saleDate = order.createdAt;

      for (const item of order.items) {
        if (!item.productId || item.productId.toString() !== productId) continue;

        const { quantity, pricingType } = item;
        if (quantity <= 0) continue;

        if (pricingType === "unit") {
          product.lbSellHistory.push({
            date: saleDate,
            weight: quantity,
            lb: "unit",
          });

          product.unitSell += quantity;
          product.unitRemaining = Math.max(0, product.unitRemaining - quantity);
        }

        if (pricingType === "box") {
          const totalBoxes = product.totalPurchase || 0;
          const totalUnits = product.unitPurchase || 0;
          const avgUnitsPerBox = totalBoxes > 0 ? totalUnits / totalBoxes : 0;
          const estimatedUnitsUsed = avgUnitsPerBox * quantity;

          product.lbSellHistory.push({
            date: saleDate,
            weight: estimatedUnitsUsed,
            lb: "box",
          });

          product.salesHistory.push({
            date: saleDate,
            quantity: quantity,
          });

          product.totalSell += quantity;
          product.remaining = Math.max(0, product.remaining - quantity);
          product.unitRemaining = Math.max(0, product.unitRemaining - estimatedUnitsUsed);
        }
      }
    }

    await product.save();
    console.log(`✅ History rebuilt: ${product.name}`);
  } catch (err) {
    console.error("❌ Error in resetting single product history:", err);
  }
};


const deleteOrdersForLastTwoDays = async () => {
  try {
    const startDate = new Date("2025-06-30T00:00:00.000Z");
    const endDate = new Date("2025-07-02T00:00:00.000Z");

    const result = await Order.deleteMany({
      createdAt: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    console.log(`🗑️ Orders deleted: ${result.deletedCount} (from 30 June & 1 July 2025)`);
  } catch (error) {
    console.error("❌ Error deleting orders:", error);
  }
};





const resetAndRebuildHistoryForAllProducts = async (
  from = "2025-06-30T00:00:00.000Z",
  to = "2030-06-22T23:59:59.999Z"
) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const products = await Product.find({});
  if (!products.length) return { updated: 0, message: "No products found" };

  let updatedCount = 0;

  for (const product of products) {
    const productId = product._id.toString();

    // Step 1: Reset product
    product.lbSellHistory = [];
    product.salesHistory = [];
    product.unitSell = 0;
    product.totalSell = 0;
    product.unitRemaining = product.unitPurchase || 0;
    product.remaining = product.totalPurchase || 0;

    await product.save();
    console.log(`♻ Reset: ${product.name}`);

    // Step 2: Get relevant orders
    const orders = await Order.find({
      createdAt: { $gte: fromDate, $lte: toDate },
      'items.productId': productId,
    });

    console.log(`🧾 ${orders.length} orders for product: ${product.name}`);

    // Step 3: Rebuild history
    for (const order of orders) {
      const saleDate = order.createdAt;

      for (const item of order.items) {
        if (!item.productId || item.productId.toString() !== productId) continue;

        const { quantity, pricingType } = item;
        if (quantity <= 0) continue;

        if (pricingType === "unit") {
          product.lbSellHistory.push({
            date: saleDate,
            weight: quantity,
            lb: "unit",
          });

          product.unitSell += quantity;
          product.unitRemaining = Math.max(0, product.unitRemaining - quantity);
        }

        if (pricingType === "box") {
          const totalBoxes = product.totalPurchase || 0;
          const totalUnits = product.unitPurchase || 0;
          const avgUnitsPerBox = totalBoxes > 0 ? totalUnits / totalBoxes : 0;
          const estimatedUnitsUsed = avgUnitsPerBox * quantity;

          product.lbSellHistory.push({
            date: saleDate,
            weight: estimatedUnitsUsed,
            lb: "box",
          });

          product.salesHistory.push({
            date: saleDate,
            quantity: quantity,
          });

          product.totalSell += quantity;
          product.remaining = Math.max(0, product.remaining - quantity);
          product.unitRemaining = Math.max(0, product.unitRemaining - estimatedUnitsUsed);
        }
      }
    }

    await product.save();
    console.log(`✅ Rebuilt: ${product.name}`);
    updatedCount++;
  }

  return {
    updated: updatedCount,
    message: `Rebuilt history for ${updatedCount} products`,
  };
};

// ✅ BASE DATE - Stock calculation hamesha yahin se start hogi
const BASE_STOCK_DATE = new Date("2025-12-29T00:00:00.000Z");

// ✅ Helper: Sum array by field (reduce shortcut)
const sumBy = (arr, field) => arr.reduce((sum, item) => sum + (item[field] || 0), 0);

// ✅ Helper: Filter array by date range
const filterByDate = (arr, from, to) => {
  if (!arr || arr.length === 0) return [];
  return arr.filter(item => {
    const d = new Date(item.date);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
};

// ✅ Calculate ACTUAL STOCK (BASE_STOCK_DATE se current week ke Sunday tak)
const calculateActualStock = (product) => {
  const now = new Date();
  
  // Get current week's Sunday (UTC)
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSunday, 23, 59, 59, 999));
  
  // Stock data - BASE_STOCK_DATE se current week ke Sunday tak
  const stockPurchase = filterByDate(product?.purchaseHistory || [], BASE_STOCK_DATE, sunday);
  const stockSell = filterByDate(product?.salesHistory || [], BASE_STOCK_DATE, sunday);
  const stockUnitPurchase = filterByDate(product?.lbPurchaseHistory || [], BASE_STOCK_DATE, sunday);
  const stockUnitSell = filterByDate(product?.lbSellHistory || [], BASE_STOCK_DATE, sunday);
  const stockTrash = filterByDate(product?.quantityTrash || [], BASE_STOCK_DATE, sunday);

  // Trash calculations
  const trashBox = stockTrash.filter(t => t.type === "box").reduce((s, t) => s + (t.quantity || 0), 0);
  const trashUnit = stockTrash.filter(t => t.type === "unit").reduce((s, t) => s + (t.quantity || 0), 0);

  // Totals
  const stockPurchaseTotal = sumBy(stockPurchase, "quantity");
  const stockSellTotal = sumBy(stockSell, "quantity");
  const stockUnitPurchaseTotal = sumBy(stockUnitPurchase, "weight");
  const stockUnitSellTotal = sumBy(stockUnitSell, "weight");

  // Carry forward (agar hai to)
  const carryForwardBox = product?.carryForwardBox || 0;
  const carryForwardUnit = product?.carryForwardUnit || 0;

  // FINAL FORMULA: carryForward + purchase - sell - trash + manuallyAdded
  const totalRemaining = Math.max(
    carryForwardBox + stockPurchaseTotal - stockSellTotal - trashBox + (product?.manuallyAddBox?.quantity || 0),
    0
  );
  const unitRemaining = Math.max(
    carryForwardUnit + stockUnitPurchaseTotal - stockUnitSellTotal - trashUnit + (product?.manuallyAddUnit?.quantity || 0),
    0
  );

  return {
    totalRemaining,
    unitRemaining,
    trashBox,
    trashUnit
  };
};

// ✅ Calculate REPORT DATA (user ke date filter ke hisaab se - sirf dikhane ke liye)
const calculateReportData = (product, reportFrom, reportTo) => {
  // Report data - user ke selected date range se
  const reportPurchase = reportFrom || reportTo
    ? filterByDate(product?.purchaseHistory || [], reportFrom, reportTo)
    : product?.purchaseHistory || [];
  
  const reportSell = reportFrom || reportTo
    ? filterByDate(product?.salesHistory || [], reportFrom, reportTo)
    : product?.salesHistory || [];
  
  const reportUnitPurchase = reportFrom || reportTo
    ? filterByDate(product?.lbPurchaseHistory || [], reportFrom, reportTo)
    : product?.lbPurchaseHistory || [];
  
  const reportUnitSell = reportFrom || reportTo
    ? filterByDate(product?.lbSellHistory || [], reportFrom, reportTo)
    : product?.lbSellHistory || [];

  return {
    totalPurchase: sumBy(reportPurchase, "quantity"),
    totalSell: sumBy(reportSell, "quantity"),
    unitPurchase: sumBy(reportUnitPurchase, "weight"),
    unitSell: sumBy(reportUnitSell, "weight")
  };
};

const getAllProductsWithHistorySummary = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      page = 1,
      limit = 20,
      search = '',
      categoryId = '',
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      stockLevel = 'all',
      hard = false
    } = req.query;

    // ✅ Hard rebuild trigger
    if (hard === "true") {
      await resetAndRebuildHistoryForAllProducts();
    }

    // ✅ Report date range (user ke filter ke liye - stock pe effect nahi)
    const reportFrom = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
    const reportTo = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

    // ✅ Build DB filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { shortCode: { $regex: `^${search}`, $options: "i" } }
      ];
    }
    if (categoryId) {
      filter.category = categoryId;
    }

    // ✅ Get total count for pagination
    const totalCount = await Product.countDocuments(filter);

    // ✅ Pagination setup
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ✅ Fetch products with DB-level pagination (OPTIMIZED)
    const products = await Product.find(filter)
      .populate("category", "categoryName")
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // ✅ Calculate summary for each product
    let productsWithSummary = products.map(product => {
      // 🔴 ACTUAL STOCK - hamesha 01-01-2026 se ab tak (system truth)
      const actualStock = calculateActualStock(product);
      
      // 🔵 REPORT DATA - user ke date filter se (sirf dikhane ke liye)
      const reportData = calculateReportData(product, reportFrom, reportTo);

      return {
        ...product,
        categoryName: product?.category?.categoryName || "",
        summary: {
          // Report data (filtered by user's date range)
          totalPurchase: reportData.totalPurchase,
          totalSell: reportData.totalSell,
          unitPurchase: reportData.unitPurchase,
          unitSell: reportData.unitSell,
          // Actual stock (always from BASE_STOCK_DATE to now)
          totalRemaining: actualStock.totalRemaining,
          unitRemaining: actualStock.unitRemaining,
          trashBox: actualStock.trashBox,
          trashUnit: actualStock.trashUnit
        }
      };
    });

    // ✅ Stock filter (post-query filter - only if needed)
    if (stockLevel !== "all") {
      productsWithSummary = productsWithSummary.filter(p => {
        const remaining = p.summary?.totalRemaining || 0;
        if (stockLevel === "low") return remaining <= 5 && remaining > 0;
        if (stockLevel === "out") return remaining === 0;
        if (stockLevel === "high") return remaining > 5;
        return true;
      });
    }

    // ✅ Final response
    res.status(200).json({
      success: true,
      data: productsWithSummary,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      appliedDateFilter: { 
        startDate: startDate || null, 
        endDate: endDate || null 
      },
      stockCalculationBase: `${BASE_STOCK_DATE.toISOString().split('T')[0]} to current week Sunday`
    });

  } catch (error) {
    console.error("❌ Error fetching product summaries:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};







const getWeeklyOrdersByProductCtrl = async (req, res) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate } = req.query;


    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid Product ID" });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Start and End date required" });
    }

    const fromDate = new Date(`${startDate}T00:00:00.000Z`);
    const toDate = new Date(`${endDate}T23:59:59.999Z`);

    // Fetch product details
    const product = await Product.findById(productId).select("name image").lean();
    console.log(product)
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const today = new Date();
    const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)

    // If today is Monday (1), return empty data
    // if (currentDay === 1) {
    //   return res.status(200).json({
    //     success: true,
    //     productId,
    //     productTitle: product.name,
    //     productImage: product.image || null,
    //     totalOrdersThisWeek: 0,
    //     buyers: []
    //   });
    // }

    // Fetch matching orders
    const orders = await Order.find({
      createdAt: { $gte: fromDate, $lte: toDate },
      "items.productId": productId,
      orderType: "Regural"
    })
      .populate("store", "storeName ownerName")
      .lean();

    let totalQuantity = 0;
    const buyers = [];

    orders.forEach(order => {
      const buyerName = order.store?.storeName || order.store?.ownerName || "Unknown";

   
      order.items.forEach(item => {
        if (
          item.productId?.toString() === productId &&
          item.quantity > 0 &&
          item.pricingType === "box" // ✅ only count items with pricingType === "box"
        ) {
          totalQuantity += item.quantity;
          console.log(item);
          buyers.push({
            name: buyerName,
            quantity: item.quantity,
            orderDate: order.createdAt,
            orderId: order._id
          });
        }
      });
    });

    return res.status(200).json({
      success: true,
      productId,
      productTitle: product.name,
      productImage: product.image || null,
      totalOrdersThisWeek: totalQuantity,
      buyers
    });

  } catch (error) {
    console.error("Error in getWeeklyOrdersByProductCtrl:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


const addToTrash = async (req, res) => {
  try {
    const { productId, quantity, type, reason } = req.body;

    if (!productId || !quantity || !type) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Trash entry
    product.quantityTrash.push({
      quantity,
      type,
      reason: reason || "expired",
    });

    // Adjust remaining or unitRemaining
    if (type === "box") {
      product.remaining = Math.max(0, product.remaining - quantity);
    } else if (type === "unit") {
      product.unitRemaining = Math.max(0, product.unitRemaining - quantity);
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: "Trash updated successfully.",
      product,
    });
  } catch (err) {
    console.error("Error adding to trash:", err);
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};




const addToManually = async (req, res) => {
  try {
    const { productId, quantity, type, } = req.body;

    if (!productId  || !type) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const trashEntry = {
      quantity,
      date: new Date(),
    };

    if (type === 'box') {
      product.manuallyAddBox = trashEntry;
    } else if (type === 'unit') {
      product.manuallyAddUnit = trashEntry;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be 'box' or 'unit'.",
      });
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: "Trash updated successfully.",
      product,
    });
  } catch (err) {
    console.error("Error adding to trash:", err);
    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};








const compareProductSalesWithOrders = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required" });
    }

    const fromDate = new Date(`${startDate}T00:00:00.000Z`);
    const toDate = new Date(`${endDate}T23:59:59.999Z`);

    // 1. Fetch orders in date range
    const orders = await Order.find({ createdAt: { $gte: fromDate, $lte: toDate } }).lean();
    console.log(`🧾 Orders in range: ${orders.length}`);

    const orderSalesMap = {};
    const productOrderMap = {};

    orders.forEach(order => {
      const oid = order._id.toString();
      order.items.forEach(item => {
        if (item.productId) {
          const pid = item.productId.toString();
          orderSalesMap[pid] = (orderSalesMap[pid] || 0) + item.quantity;
          productOrderMap[pid] = productOrderMap[pid] || new Set();
          productOrderMap[pid].add(oid);
        }
      });
    });

    const products = await Product.find({}).select("name salesHistory").lean();
    const debugResults = [];

    for (const prod of products) {
      const pid = prod._id.toString();
      const orderQty = orderSalesMap[pid] || 0;

      // Filter salesHistory entries in range
      const historyEntries = (prod.salesHistory || []).filter(h => {
        const d = new Date(h.date);
        return d >= fromDate && d <= toDate;
      });

      const historyQty = historyEntries.reduce((s, h) => s + h.quantity, 0);

      if (orderQty !== historyQty) {
        // For each historyEntry, find matching orders on same day
        const entriesWithOrders = await Promise.all(historyEntries.map(async (entry) => {
          const entryDate = new Date(entry.date);
          const start = new Date(entryDate.setHours(0, 0, 0, 0));
          const end = new Date(entryDate.setHours(23, 59, 59, 999));

          const matchingOrders = orders.filter(order =>
            order.createdAt >= start &&
            order.createdAt <= end &&
            order.items.some(item => item.productId?.toString() === pid)
          );

          return {
            ...entry,
            matchedOrderIds: matchingOrders.map(o => o._id.toString()),
          };
        }));

        debugResults.push({
          productId: pid,
          name: prod.name,
          orderQty,
          historyQty,
          difference: orderQty - historyQty,
          orderIds: Array.from(productOrderMap[pid] || []),
          historyEntries: entriesWithOrders,
        });
      }
    }

    return res.json({ success: true, debugResults });
  } catch (err) {
    console.error("❗Error debugging sales:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


const resetAndRebuildHistoryForSingleProductCtrl = async (req, res) => {
  try {
    const { productId } = req.params;
    const { from, to } = req.query;
console.log(req.params)
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const fromDate = new Date(from || "2025-06-30T00:00:00.000Z");
    const toDate = new Date(to || "2030-06-22T23:59:59.999Z");

    // STEP 1: Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // STEP 2: Reset product history
    product.lbSellHistory = [];
    product.salesHistory = [];
    product.unitSell = 0;
    product.totalSell = 0;
    product.unitRemaining = product.unitPurchase;
    product.remaining = product.totalPurchase;

    await product.save();
    console.log(`♻ Reset: ${product.name}`);

    // STEP 3: Get relevant orders
    const orders = await Order.find({
      createdAt: { $gte: fromDate, $lte: toDate },
      'items.productId': productId,
    });

    console.log(`🧾 Orders found using this product: ${orders.length}`);

    // STEP 4: Rebuild history
    for (const order of orders) {
      const saleDate = order.createdAt;

      for (const item of order.items) {
        if (!item.productId || item.productId.toString() !== productId) continue;

        const { quantity, pricingType } = item;
        if (quantity <= 0) continue;

        if (pricingType === "unit") {
          product.lbSellHistory.push({
            date: saleDate,
            weight: quantity,
            lb: "unit",
          });

          product.unitSell += quantity;
          product.unitRemaining = Math.max(0, product.unitRemaining - quantity);
        }

        if (pricingType === "box") {
          const totalBoxes = product.totalPurchase || 0;
          const totalUnits = product.unitPurchase || 0;
          const avgUnitsPerBox = totalBoxes > 0 ? totalUnits / totalBoxes : 0;
          const estimatedUnitsUsed = avgUnitsPerBox * quantity;

          product.lbSellHistory.push({
            date: saleDate,
            weight: estimatedUnitsUsed,
            lb: "box",
          });

          product.salesHistory.push({
            date: saleDate,
            quantity: quantity,
          });

          product.totalSell += quantity;
          product.remaining = Math.max(0, product.remaining - quantity);
          product.unitRemaining = Math.max(0, product.unitRemaining - estimatedUnitsUsed);
        }
      }
    }

    await product.save();
    console.log(`✅ History rebuilt: ${product.name}`);
    res.status(200).json({ message: `History reset and rebuilt for product: ${product.name}` });

  } catch (err) {
    console.error("❌ Error in resetting single product history:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
};



// const calculateTripWeight = async (req, res) => {
//   try {
//     const { orderIds } = req.body;
//     if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
//       return res.status(400).json({ success: false, message: "No orders provided" });
//     }

//     const orders = await Order.find({ _id: { $in: orderIds } }).lean();
//     if (!orders.length) {
//       return res.status(404).json({ success: false, message: "Orders not found" });
//     }

//     const productIds = [];
//     for (const order of orders) {
//       if (Array.isArray(order.items)) {
//         for (const item of order.items) {
//           const pid = item.productId || item.product;
//           if (pid) productIds.push(pid.toString());
//         }
//       }
//     }

//     const uniqueProductIds = [...new Set(productIds)];
//     if (!uniqueProductIds.length) {
//       return res.status(400).json({ success: false, message: "No product IDs found" });
//     }

//     const products = await Product.find({ _id: { $in: uniqueProductIds } })
//       .select("name boxSize unitPurchase weightVariation")
//       .lean();

//     const productMap = {};
//     products.forEach((p) => (productMap[p._id.toString()] = p));

//     let totalWeightKg = 0; // Will hold lbs value instead
//     let totalVolumeM3 = 0;
//     const productDetails = [];
//     const orderWiseDetails = [];

//     for (const order of orders) {
//       if (!Array.isArray(order.items)) continue;

//       let orderTotalWeight = 0;
//       let orderTotalVolume = 0;
//       const orderProducts = [];

//       for (const item of order.items) {
//         const productId = (item.productId || item.product || "").toString();
//         const product = productMap[productId];
//         if (!product) continue;

//         const qty = Number(item.quantity) || 0;
//         const boxSize = Number(product.boxSize) || 0;

//         let productWeightKg = product.weightVariation || 0;

//         // Convert weight to lbs but keep field names same
//         const unitWeightLbs = productWeightKg * 2.20462;
//         const totalWeightProductLbs = unitWeightLbs * qty;

//         orderTotalWeight += totalWeightProductLbs;
//         orderTotalVolume += boxSize * qty; // 🟢 volume per order

//         totalWeightKg += totalWeightProductLbs;
//         totalVolumeM3 += boxSize * qty; // 🟢 total volume overall

//         const existing = productDetails.find((p) => p.productId === productId);
//         if (existing) {
//           existing.totalQty += qty;
//           existing.totalWeightKg += totalWeightProductLbs;
//         } else {
//           productDetails.push({
//             productId,
//             productName: product.name,
//             totalQty: qty,
//             unitWeightKg: Math.round(unitWeightLbs * 100) / 100,
//             totalWeightKg: Math.round(totalWeightProductLbs * 100) / 100,
//             boxSize,
//           });
//         }

//         orderProducts.push({
//           productId,
//           productName: product.name,
//           qty,
//           unitWeightKg: Math.round(unitWeightLbs * 100) / 100,
//           totalWeightKg: Math.round(totalWeightProductLbs * 100) / 100,
//           boxSize,
//         });
//       }

//       orderWiseDetails.push({
//         orderId: order._id,
//         orderNo: order.orderNo || null,
//         totalWeightKg: Math.round(orderTotalWeight * 100) / 100,
//         totalVolumeM3: Math.round(orderTotalVolume * 100) / 100,
//         products: orderProducts,
//       });
//     }

//     const responseData = {
//       totalWeightKg: Math.round(totalWeightKg * 100) / 100,
//       totalVolumeM3: Math.round(totalVolumeM3 * 100) / 100,
//       productDetails,
//       orderWiseDetails,
//     };

//     res.status(200).json({
//       success: true,
//       message: "Trip weight calculated successfully",
//       data: responseData,
//     });
//   } catch (error) {
//     console.error("❌ Weight calculation failed:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

const calculateTripWeight = async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: "No orders provided" });
    }

    const orders = await Order.find({ _id: { $in: orderIds } }).lean();
    if (!orders.length) {
      return res.status(404).json({ success: false, message: "Orders not found" });
    }

    const productIds = [];
    for (const order of orders) {
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          const pid = item.productId || item.product;
          if (pid) productIds.push(pid.toString());
        }
      }
    }

    const uniqueProductIds = [...new Set(productIds)];
    if (!uniqueProductIds.length) {
      return res.status(400).json({ success: false, message: "No product IDs found" });
    }

    const products = await Product.find({ _id: { $in: uniqueProductIds } })
      .select("name boxSize unitPurchase weightVariation pricingType")
      .lean();

    const productMap = {};
    products.forEach((p) => (productMap[p._id.toString()] = p));

    // old naming
    let totalWeightKg = 0;
    let totalVolumeM3 = 0;

    const productDetails = [];
    const orderWiseDetails = [];

    for (const order of orders) {
      if (!Array.isArray(order.items)) continue;

      let orderTotalWeight = 0;
      let orderTotalVolume = 0;

      const orderProducts = [];

      for (const item of order.items) {
        const productId = (item.productId || item.product || "").toString();
        const product = productMap[productId];
        if (!product) continue;

        const qty = Number(item.quantity) || 0;
        const boxSize = Number(product.boxSize) || 0;

        let finalUnitWeight = 0;

        // apply rule
        if (product.pricingType === "box") {
          finalUnitWeight = Number(product.weightVariation) || 0;
        } else {
          finalUnitWeight = Number(product.weightVariation) || 0;
        }

        const totalWeightProduct = finalUnitWeight * qty;

        orderTotalWeight += totalWeightProduct;
        orderTotalVolume += boxSize * qty;

        totalWeightKg += totalWeightProduct;
        totalVolumeM3 += boxSize * qty;

        const existing = productDetails.find((p) => p.productId === productId);
        if (existing) {
          existing.totalQty += qty;
          existing.totalWeightKg += totalWeightProduct;
        } else {
          productDetails.push({
            productId,
            productName: product.name,
            totalQty: qty,

            // old keys
            unitWeightKg: Math.round(finalUnitWeight * 100) / 100,
            totalWeightKg: Math.round(totalWeightProduct * 100) / 100,

            boxSize,
          });
        }

        orderProducts.push({
          productId,
          productName: product.name,
          qty,

          // old keys
          unitWeightKg: Math.round(finalUnitWeight * 100) / 100,
          totalWeightKg: Math.round(totalWeightProduct * 100) / 100,

          boxSize,
        });
      }

      orderWiseDetails.push({
        orderId: order._id,
        orderNo: order.orderNo || null,

        // old keys
        totalWeightKg: Math.round(orderTotalWeight * 100) / 100,
        totalVolumeM3: Math.round(orderTotalVolume * 100) / 100,

        products: orderProducts,
      });
    }

    const responseData = {
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      totalVolumeM3: Math.round(totalVolumeM3 * 100) / 100,
      productDetails,
      orderWiseDetails,
    };

    res.status(200).json({
      success: true,
      message: "Trip weight calculated successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Weight calculation failed:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};




// Generate short codes for all products that don't have one
const generateShortCodesCtrl = async (req, res) => {
    try {
        const { generateShortCodesForProducts } = require('../utils/generateShortCodes');
        const result = await generateShortCodesForProducts(Product);
        
        return res.status(200).json({
            success: true,
            message: `Short codes generated for ${result.updated} products`,
            ...result
        });
    } catch (error) {
        console.error("Error generating short codes:", error);
        return res.status(500).json({
            success: false,
            message: "Error generating short codes",
            error: error.message
        });
    }
};

// Get product by short code (for quick add)
const getProductByShortCodeCtrl = async (req, res) => {
    try {
        const { code } = req.params;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Short code is required"
            });
        }

        const product = await Product.findOne({ shortCode: code })
            .populate({ path: "category", select: "categoryName" })
            .lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: `No product found with code: ${code}`
            });
        }

        return res.status(200).json({
            success: true,
            product: {
                ...product,
                category: product.category?.categoryName || null
            }
        });
    } catch (error) {
        console.error("Error getting product by short code:", error);
        return res.status(500).json({
            success: false,
            message: "Error getting product",
            error: error.message
        });
    }
};

// Search products with pagination - for order creation
const searchProductsCtrl = async (req, res) => {
    try {
        const { search = "", limit = 10, category = "", skip = 0 } = req.query;
        
        let query = {};
        
        // Add search filter if search term provided
        if (search.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            query.$or = [
                { name: searchRegex },
                { shortCode: searchRegex }
            ];
        }
        
        // Add category filter if provided
        if (category && category !== "all") {
            query.category = category;
        }
        
        const products = await productModel.find(query)
            .populate({
                path: "category",
                select: "categoryName",
            })
            .select("_id name price pricePerBox shippinCost shortCode salesMode image")
            .sort({ name: 1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean();
        
        // Format products
        const formattedProducts = products.map(product => ({
            ...product,
            id: product._id,
            category: product.category?.categoryName || null,
            salesMode: product.salesMode || "both"
        }));
        
        return res.status(200).json({
            success: true,
            products: formattedProducts,
            count: formattedProducts.length
        });
    } catch (error) {
        console.error("Error in searchProductsCtrl:", error);
        return res.status(500).json({
            success: false,
            message: "Error searching products",
        });
    }
};

module.exports = { 
    createProductCtrl, 
    getAllProductCtrl, 
    getSingleProductCtrl, 
    deleteProductCtrl, 
    updateProductCtrl, 
    updateProductPrice, 
    bulkDiscountApply,
    getWeeklyOrdersByProductCtrl,
    updateTotalSellForAllProducts,
    getAllProductsWithHistorySummary,
    addToTrash,
    resetAndRebuildHistoryForSingleProductCtrl,
    compareProductSalesWithOrders,
    addToManually,
    calculateTripWeight,
    generateShortCodesCtrl,
    getProductByShortCodeCtrl,
    searchProductsCtrl
};
