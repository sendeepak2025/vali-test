const orderModel = require("../models/orderModle");
const purchaseModel = require("../models/purchaseModel");
const IncomingStock = require("../models/incomingStockModel");
const mongoose = require("mongoose");
const authModel = require("../models/authModel"); // Ensure the correct path for your Auth model
const vendorModel = require("../models/vendorModel"); // Ensure the correct path for your Auth model
const { generateStatementPDF } = require("../utils/generateOrder");
const nodemailer = require("nodemailer");
const { exportInvoiceToPDFBackend } = require("../templates/exportInvoice");
const Counter = require("../models/counterModel");
const Product = require("../models/productModel");
const PreOrderModel = require("../models/preOrderModel");
const { validateOrderItems } = require("../utils/orderValidation");
const { calculatePalletsNeeded } = require("../utils/palletCalculator");
const notificationService = require("../services/notificationService");

// High-value order threshold for admin alerts (configurable)
const HIGH_VALUE_ORDER_THRESHOLD = 5000;

// ✅ BASE DATE - Stock calculation hamesha yahin se start hogi
// const BASE_STOCK_DATE = new Date("2026-01-01T00:00:00.000Z");
const BASE_STOCK_DATE = new Date("2026-01-05T00:00:00.000Z");

// ✅ Helper: Sum array by field
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
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilSunday,
      23, 59, 59, 999
    )
  );

  // Filter stock data
  const stockPurchase = filterByDate(
    product?.purchaseHistory || [],
    BASE_STOCK_DATE,
    sunday
  );

  const stockSell = filterByDate(
    product?.salesHistory || [],
    BASE_STOCK_DATE,
    sunday
  );

  const stockUnitPurchase = filterByDate(
    product?.lbPurchaseHistory || [],
    BASE_STOCK_DATE,
    sunday
  );

  const stockUnitSell = filterByDate(
    product?.lbSellHistory || [],
    BASE_STOCK_DATE,
    sunday
  );

  const stockTrash = filterByDate(
    product?.quantityTrash || [],
    BASE_STOCK_DATE,
    sunday
  );

  // Trash calculation
  const trashBox = stockTrash
    .filter(t => t.type?.toLowerCase() === "box")
    .reduce((sum, t) => sum + Number(t.quantity || 0), 0);

  const trashUnit = stockTrash
    .filter(t => t.type?.toLowerCase() === "unit")
    .reduce((sum, t) => sum + Number(t.quantity || 0), 0);

  // Totals
  const stockPurchaseTotal = sumBy(stockPurchase, "quantity");
  const stockSellTotal = sumBy(stockSell, "quantity");

  const stockUnitPurchaseTotal = sumBy(stockUnitPurchase, "weight");
  const stockUnitSellTotal = sumBy(stockUnitSell, "weight");

  // Carry forward
  const carryForwardBox = Number(product?.carryForwardBox || 0);
  const carryForwardUnit = Number(product?.carryForwardUnit || 0);

  // Manual add
  const manualBox = Number(product?.manuallyAddBox?.quantity || 0);
  const manualUnit = Number(product?.manuallyAddUnit?.quantity || 0);

  // FINAL CALCULATION (NEGATIVE ALLOWED)
  const totalRemaining =
    carryForwardBox +
    stockPurchaseTotal -
    stockSellTotal -
    trashBox +
    manualBox;

  const unitRemaining =
    carryForwardUnit +
    stockUnitPurchaseTotal -
    stockUnitSellTotal -
    trashUnit +
    manualUnit;

  return {
    totalRemaining, // can be negative
    unitRemaining,  // can be negative
    trashBox,
    trashUnit,
    isOverSold: totalRemaining < 0
  };
};


/**
 * Get the correct price for a product based on store's price category
 * @param {Object} product - Product document
 * @param {string} priceCategory - Store's price category (aPrice, bPrice, cPrice, restaurantPrice)
 * @param {string} pricingType - "box" or "unit"
 * @returns {number} - The correct price
 */
const getProductPriceForStore = (product, priceCategory, pricingType = "box") => {
  if (pricingType === "unit") {
    return product.price || 0;
  }

  // Map price category to product field (only 4 price lists now)
  const priceCategoryMap = {
    aPrice: "aPrice",
    bPrice: "bPrice",
    cPrice: "cPrice",
    restaurantPrice: "restaurantPrice",
    // Legacy fallbacks
    price: "aPrice",
    pricePerBox: "aPrice"
  };

  const priceField = priceCategoryMap[priceCategory] || "aPrice";
  const price = product[priceField];

  // If the specific price tier is 0 or undefined, fallback to aPrice, then pricePerBox
  if (!price || price === 0) {
    if (product.aPrice && product.aPrice > 0) {
      return product.aPrice;
    }
    return product.pricePerBox || 0;
  }

  return price;
};

const mailSender = async (
  to,
  subject,
  text,
  pdfBase64,
  filename = "Customer_Statement.pdf"
) => {
  try {
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      secure: false,
    });

    const mailOptions = {
      from: process.env.MAIL_USER,
      to,
      subject,
      text,
      attachments: [
        {
          filename: filename,
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (err) {
    console.error("Email sending failed:", err);
  }
};

const getNextOrderNumber = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: "order" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(5, "0"); // 00101, 00102...
  return `N-${paddedSeq}`;
};



const createOrderCtrl = async (req, res) => {
  try {
    const {
      items,
      status,
      total,
      clientId,
      billingAddress,
      shippingAddress,
      orderType = "Regural",
      orderNumber,
      createdAt,
      preOrder
      
    } = req.body;



    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Order items are required" });
    }

    if (!status) {
      return res.status(400).json({ message: "Order status is required" });
    }
    if (!total || total <= 0) {
      return res
        .status(400)
        .json({ message: "Total amount must be greater than zero" });
    }

    // --- SALES MODE VALIDATION ---
    // Fetch products to validate salesMode constraints
    const productIds = items.map(item => item.productId).filter(Boolean);
    const productsForValidation = await Product.find({ _id: { $in: productIds } }).lean();
    
    const salesModeValidation = validateOrderItems(items, productsForValidation);
    if (!salesModeValidation.valid) {
      return res.status(400).json({
        success: false,
        message: "Order validation failed due to sales mode restrictions",
        errors: salesModeValidation.errors
      });
    }




// --- STEP 1: Check stock using ACTUAL STOCK (01-01-2026 se ab tak) ---
let insufficientStock = [];

for (const item of items) {
  const { productId, quantity, pricingType } = item;
  if (!productId || quantity <= 0) continue;

  const product = await Product.findById(productId).lean();
  if (!product) {
    insufficientStock.push({ productId, message: "Product not found" });
    continue;
  }

  // ✅ Use same calculateActualStock function for consistent calculation
  const { totalRemaining, unitRemaining } = calculateActualStock(product);

  // --- Check if requested quantity exceeds remaining ---
  if ((pricingType === "box" && quantity > totalRemaining) || (pricingType === "unit" && quantity > unitRemaining)) {
    insufficientStock.push({
      productId,
      name: product.name,
      available: pricingType === "box" ? totalRemaining : unitRemaining,
      requested: quantity,
      type: pricingType,
      stockBase: BASE_STOCK_DATE.toISOString().split("T")[0]
    });
  }

  console.log(`${product.name} - Box Remaining: ${totalRemaining}, Unit Remaining: ${unitRemaining}`);
}

// --- STEP 2: Block order if insufficient stock ---
if (insufficientStock.length > 0  ) {
  return res.status(400).json({
    success: false,
    message: "Insufficient stock for some items (week-wise check)",
    insufficientStock,
  });
}

 
    

    const generateOrderNumber = () => {
      const randomNumber = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit random number
      return `${randomNumber}`;
    };

    const user = await authModel
      .findById(clientId.value)
      .select("shippingCost");

    // Shipping cost should always be 0 by default
    // Admin will manually add shipping cost in invoice for each order
    const shippinCost = 0;

    // More robust date handling for VPS deployment
    let orderDate;
    if (createdAt) {
      // If a specific date was provided, use it directly as an ISO string
      // This bypasses timezone issues by storing the exact string representation
      if (typeof createdAt === "string") {
        // If it's already a string (like from a date picker), parse it
        const dateObj = new Date(createdAt);
        // Force the date to be interpreted as is, without timezone adjustment
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        const day = dateObj.getDate();

        // Create date at noon to avoid any day boundary issues
        orderDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
      } else {
        // If it's already a Date object
        const year = createdAt.getFullYear();
        const month = createdAt.getMonth();
        const day = createdAt.getDate();

        orderDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
      }
    } else {
      // If no date provided, use current date (today)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const day = now.getDate();

      // orderDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
      orderDate = new Date();
    }

    const newOrder = new orderModel({
      orderNumber: orderNumber ? orderNumber : await getNextOrderNumber(),
      items,
      store: clientId.value,
      status,
      shippingAddress,
      billingAddress,
      total: total + shippinCost,
      orderType,
      shippinCost,
      preOrder,
      createdAt: createdAt, // Use the fixed date
    });

    for (const item of items) {
      const { productId, quantity, pricingType } = item;
      if (!productId || quantity <= 0) continue;

      const product = await Product.findById(productId);
      if (!product) {
        console.warn(`❌ Product not found: ${productId}`);
        continue;
      }

      const saleDate = orderDate || new Date();

      console.log(`📦 Processing Product: ${product.name}`);
      console.log(`➡ Pricing Type: ${pricingType}`);
      console.log(`➡ Quantity Ordered: ${quantity}`);
      console.log(`➡ unitPurchase: ${product.unitPurchase}`);
      console.log(`➡ totalPurchase (Boxes): ${product.totalPurchase}`);
      console.log(`➡ unitRemaining (Before): ${product.unitRemaining}`);
      console.log(`➡ totalSell (Before): ${product.totalSell}`);
      console.log(`➡ remaining (Boxes Left Before): ${product.remaining}`);

      // UNIT ORDER
      if (pricingType === "unit") {
        product.lbSellHistory.push({
          date: saleDate,
          weight: quantity,
          lb: "unit",
        });

        product.unitSell += quantity;
        product.unitRemaining = Math.max(0, product.unitRemaining - quantity);

        console.log(`✅ UNIT Order Processed`);
        console.log(`➡ unitSell (After): ${product.unitSell}`);
        console.log(`➡ unitRemaining (After): ${product.unitRemaining}`);
      }

      // BOX ORDER
      else if (pricingType === "box") {
        const totalBoxes = product.totalPurchase || 0;
        const totalUnits = product.unitPurchase || 0;
        const lastUpdated =
          product.updatedFromOrders?.[product.updatedFromOrders.length - 1];

        // const avgUnitsPerBox = totalBoxes > 0 ? totalUnits / totalBoxes : 0;
        // const estimatedUnitsUsed = avgUnitsPerBox * quantity;

        let avgUnitsPerBox = 0;
        let estimatedUnitsUsed = 0;

        if (lastUpdated && lastUpdated.perLb && lastUpdated.newQuantity) {
          avgUnitsPerBox = lastUpdated.perLb; // perLb is already unit/box
          estimatedUnitsUsed = avgUnitsPerBox * quantity;
        }
        console.log(`🧮 Calculated avgUnitsPerBox: ${avgUnitsPerBox}`);
        console.log(
          `📉 Estimated Units Used from Boxes: ${estimatedUnitsUsed}`
        );

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
        product.unitRemaining = Math.max(
          0,
          product.unitRemaining - estimatedUnitsUsed
        );
        product.unitSell = Math.max(estimatedUnitsUsed);

        console.log(`✅ BOX Order Processed`);
        console.log(`➡ totalSell (After): ${product.totalSell}`);
        console.log(`➡ remaining (Boxes Left After): ${product.remaining}`);
        console.log(`➡ unitRemaining (After): ${product.unitRemaining}`);
      }

      await product.save();
      console.log(
        `💾 Product saved: ${product.name}\n------------------------`
      );
    }

    await newOrder.save();

    // Send order notifications - COMMENTED OUT (Email disabled for create order)
    /*
    try {
      // Get store details for notification
      const storeDetails = await authModel.findById(clientId.value);
      
      if (storeDetails) {
        // Send order confirmation to store owner
        await notificationService.createNotificationWithEmail(
          storeDetails._id,
          storeDetails.email,
          "order_created",
          "Order Confirmed",
          `Your order #${newOrder.orderNumber} has been placed successfully. Total: $${newOrder.total.toFixed(2)}`,
          "ORDER_CONFIRMATION",
          {
            ownerName: storeDetails.ownerName || storeDetails.storeName,
            storeName: storeDetails.storeName,
            orderNumber: newOrder.orderNumber,
            total: newOrder.total.toFixed(2),
            itemCount: items.length,
            items: items,
            orderDate: new Date().toLocaleDateString(),
            orderUrl: `${process.env.CLIENT_URL}/store/dashboard`,
          },
          { 
            orderId: newOrder._id, 
            orderNumber: newOrder.orderNumber,
            total: newOrder.total 
          },
          `/orders/edit/${newOrder._id}`
        );
        
        console.log("📧 Order confirmation email sent to:", storeDetails.email);

        // Notify admins about new order (in-app only, no email)
        await notificationService.notifyAdmins(
          "order_created",
          "New Order Received",
          `${storeDetails.storeName} placed order #${newOrder.orderNumber} for $${newOrder.total.toFixed(2)}`,
          {
            orderId: newOrder._id,
            orderNumber: newOrder.orderNumber,
            storeName: storeDetails.storeName,
            total: newOrder.total,
          },
          `/orders/edit/${newOrder._id}`,
          false // No email for regular orders
        );

        // Check for high-value order alert
        if (newOrder.total >= HIGH_VALUE_ORDER_THRESHOLD) {
          await notificationService.notifyAdmins(
            "order_created",
            "⚠️ High-Value Order Alert",
            `High-value order #${newOrder.orderNumber} from ${storeDetails.storeName}: $${newOrder.total.toFixed(2)}`,
            {
              orderId: newOrder._id,
              orderNumber: newOrder.orderNumber,
              storeName: storeDetails.storeName,
              total: newOrder.total,
              isHighValue: true,
            },
            `/orders/edit/${newOrder._id}`,
            true, // Send email for high-value orders
            "ORDER_CONFIRMATION",
            {
              ownerName: "Admin",
              storeName: storeDetails.storeName,
              orderNumber: newOrder.orderNumber,
              total: newOrder.total.toFixed(2),
              itemCount: items.length,
              orderDate: new Date().toLocaleDateString(),
              orderUrl: `${process.env.CLIENT_URL}/store/dashboard`,
            }
          );
        }
      }
    } catch (notificationError) {
      // Log notification error but don't fail order creation
      console.error("Error sending order notifications:", notificationError);
    }
    */

    // Calculate pallet estimate for the order
    let orderPalletEstimate = {
      totalPallets: 0,
      breakdown: [],
      isEstimate: true,
      disclaimer: "Pallet estimates are for planning purposes only - verify for actual shipping"
    };

    // Calculate pallets for each box/case item
    for (const item of items) {
      if (item.pricingType === "box" && item.quantity > 0) {
        const product = productsForValidation.find(p => p._id.toString() === item.productId?.toString());
        if (product && product.palletCapacity && product.palletCapacity.totalCasesPerPallet > 0) {
          const palletInfo = calculatePalletsNeeded(item.quantity, product.palletCapacity.totalCasesPerPallet);
          if (palletInfo) {
            orderPalletEstimate.breakdown.push({
              productId: item.productId,
              productName: product.name,
              cases: item.quantity,
              estimatedPallets: palletInfo.totalPallets,
              utilizationPercent: palletInfo.utilizationPercent
            });
            orderPalletEstimate.totalPallets += palletInfo.totalPallets;
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      newOrder,
      palletEstimate: orderPalletEstimate
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAllOrderCtrl = async (req, res) => {
  try {
    const user = req.user;
    const search = req.query.search || "";
    const orderType = req.query.orderType || "";
    const paymentStatus = req.query.paymentStatus || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Step 1: filterStage applies BEFORE $lookup
    const filterStage = {
      
    };

    // Filter by store
    if (user.role === "store" && mongoose.Types.ObjectId.isValid(user.id)) {
      filterStage.store = new mongoose.Types.ObjectId(user.id);
    }

    // Filter by paymentStatus
    if (paymentStatus && paymentStatus !== "all") {
      filterStage.paymentStatus = paymentStatus;
    }

    // Filter by orderType
    if (orderType && orderType !== "Regural") {
      filterStage.orderType = orderType;
    } else if (orderType === "Regural") {
      filterStage.$or = [
        { orderType: "Regural" },
        { orderType: { $exists: false } },
        { orderType: null },
        { orderType: "" },
      ];
    }

    // Filter by date
    if (req.query.startDate || req.query.endDate) {
      filterStage.createdAt = {};
      if (req.query.startDate) filterStage.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filterStage.createdAt.$lte = new Date(req.query.endDate + "T23:59:59.999Z");
    }

    // Step 2: searchStage applies AFTER $lookup
    const searchStage = [];
    if (search) {
      const searchRegex = new RegExp(search, "i");
      searchStage.push({
        $or: [
          { orderNumber: searchRegex },
          { "store.storeName": searchRegex },
        ],
      });
    }

    const aggregateQuery = [
      { $match: filterStage }, // first filter orders
      {
        $lookup: {
          from: "auths",
          localField: "store",
          foreignField: "_id",
          as: "store",
        },
      },
      { $unwind: "$store" },
      ...(searchStage.length ? [{ $match: { $and: searchStage } }] : []), // apply search if exists
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
          summary: [
            { $match: { isDelete: { $ne: true } } },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: "$total" },
                totalReceived: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "paid"] },
                      "$total",
                      {
                        $cond: [
                          { $eq: ["$paymentStatus", "partial"] },
                          { $toDouble: { $ifNull: ["$paymentAmount", 0] } },
                          0,
                        ],
                      },
                    ],
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                totalOrders: 1,
                totalAmount: 1,
                totalReceived: 1,
                totalPending: { $subtract: ["$totalAmount", "$totalReceived"] },
              },
            },
          ],
        },
      },
    ];

    const result = await orderModel.aggregate(aggregateQuery);

    const orders = result[0]?.data || [];
    const totalOrders = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalOrders / limit);
    const summary = result[0]?.summary[0] || {
      totalOrders: 0,
      totalAmount: 0,
      totalReceived: 0,
      totalPending: 0,
    };

    return res.status(200).json({
      success: true,
      message: orders.length ? "Orders fetched successfully!" : "No orders found!",
      orders,
      totalOrders,
      totalPages,
      currentPage: page,
      summary,
    });
  } catch (error) {
    console.error("Error fetching orders:", error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: "Error fetching orders!",
      error: error.message,
    });
  }
};




const getOrderForStoreCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.findById(id).populate("store", "storeName ownerName");  ;
    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error in getting  order API!",
    });
  }
};

// const updateOrderCtrl = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updateFields = req.body;

//     // Ensure the order exists
//     const existingOrder = await orderModel.findById(id);

//     if (!existingOrder) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Order not found!" });
//     }

//     const oldItemsMap = {};
//     existingOrder.items.forEach(item => {
//       oldItemsMap[item.productId.toString()] = item.quantity;
//     });

//     // Update order fields
//     Object.keys(updateFields).forEach((key) => {
//       if (updateFields[key] !== undefined) {
//         existingOrder[key] = updateFields[key];
//       }
//     });

//     await existingOrder.save();

//     // Now adjust product stocks based on quantity difference
//     for (const newItem of existingOrder.items) {
//       const productId = newItem.productId;
//       const newQty = newItem.quantity;
//       const oldQty = oldItemsMap[productId.toString()] || 0;
//       const diff = newQty - oldQty;

//       if (diff !== 0) {
//         await Product.findByIdAndUpdate(productId, {
//           $inc: {
//             totalSell: diff,
//             quantity: -diff
//           }
//         });
//       }
//     }

//     // Update only the fields that are present in the request body
//     Object.keys(updateFields).forEach((key) => {
//       if (updateFields[key] !== undefined) {
//         existingOrder[key] = updateFields[key];
//       }
//     });

//     await existingOrder.save();

//     return res.status(200).json({
//       success: true,
//       message: "Order updated successfully",
//       updatedOrder: existingOrder,
//     });
//   } catch (error) {
//     console.error("Error updating order:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error while updating order",
//     });
//   }
// };

// POST /api/orders/:orderId/pallet



const resetAndRebuildHistoryForSingleProduct = async (productId, from, to) => {
  try {
    if (!productId) {
      throw new Error("Product ID is required");
    }

    const fromDate = new Date(from || "2025-01-01T00:00:00.000Z");
    const toDate = new Date(to || "2030-12-31T23:59:59.999Z");

    // Step 1: Find product
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Step 2: Reset product history
    product.lbSellHistory = [];
    product.salesHistory = [];
    product.unitSell = 0;
    product.totalSell = 0;
    product.unitRemaining = product.unitPurchase || 0;
    product.remaining = product.totalPurchase || 0;

    // Step 3: Get relevant orders (EXCLUDE deleted orders)
    const orders = await orderModel.find({
      createdAt: { $gte: fromDate, $lte: toDate },
      'items.productId': productId,
      isDelete: { $ne: true }  // Important: exclude deleted orders
    }).sort({ createdAt: 1 }); // Sort by date ascending

    console.log(`Rebuilding history for product ${productId}, found ${orders.length} orders`);

    // Step 4: Rebuild product history from all valid orders
    for (const order of orders) {
      const saleDate = order.createdAt;

      for (const item of order.items) {
        if (!item.productId || item.productId.toString() !== productId.toString()) continue;

        const { quantity, pricingType } = item;
        if (!quantity || quantity <= 0) continue;

        if (pricingType === "unit") {
          product.lbSellHistory.push({ date: saleDate, weight: quantity, lb: "unit" });
          product.unitSell += quantity;
          product.unitRemaining = Math.max(0, product.unitRemaining - quantity);
        } else if (pricingType === "box") {
          // Calculate avgUnitsPerBox properly
          const lastUpdated = product.updatedFromOrders?.[product.updatedFromOrders.length - 1];
          let avgUnitsPerBox = 0;
          let estimatedUnitsUsed = 0;

          if (lastUpdated && lastUpdated.perLb) {
            avgUnitsPerBox = lastUpdated.perLb;
            estimatedUnitsUsed = avgUnitsPerBox * quantity;
          }

          product.lbSellHistory.push({ date: saleDate, weight: estimatedUnitsUsed, lb: "box" });
          product.salesHistory.push({ date: saleDate, quantity });

          product.totalSell += quantity;
          product.remaining = Math.max(0, product.remaining - quantity);
          product.unitRemaining = Math.max(0, product.unitRemaining - estimatedUnitsUsed);
        }
      }
    }

    await product.save();
    console.log(`History rebuilt for ${product.name}: totalSell=${product.totalSell}, remaining=${product.remaining}`);
    return { success: true, message: `History reset and rebuilt for product: ${product.name}` };

  } catch (err) {
    console.error("Error rebuilding product history:", err);
    return { success: false, error: err.message };
  }
};



const updateOrderCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const existingOrder = await orderModel.findById(id);
    if (!existingOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found!" });
    }

    // Stock validation for updated items
    if (updateFields.items && Array.isArray(updateFields.items)) {
      // Get current week's Sunday (UTC) - same as calculateActualStock
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const sunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSunday, 23, 59, 59, 999));

      // Build map of old quantities to calculate net change
      const oldItemsQuantityMap = {};
      existingOrder.items.forEach((item) => {
        const key = `${item.productId.toString()}_${item.pricingType}`;
        oldItemsQuantityMap[key] = item.quantity;
      });

      let insufficientStock = [];

      for (const item of updateFields.items) {
        const { productId, quantity, pricingType } = item;
        if (!productId || quantity <= 0) continue;

        const product = await Product.findById(productId).lean();
        if (!product) {
          insufficientStock.push({ productId, name: "Unknown", message: "Product not found" });
          continue;
        }

        // Calculate net additional quantity needed
        const key = `${productId}_${pricingType}`;
        const oldQuantity = oldItemsQuantityMap[key] || 0;
        const additionalQuantity = quantity - oldQuantity;

        // Only check stock if we're increasing quantity
        if (additionalQuantity > 0) {
          // Use same calculation as calculateActualStock (BASE_STOCK_DATE to Sunday)
          const { totalRemaining, unitRemaining } = calculateActualStock(product);

          // Check if additional quantity exceeds available stock
          if ((pricingType === "box" && additionalQuantity > totalRemaining) || 
              (pricingType === "unit" && additionalQuantity > unitRemaining)) {
            insufficientStock.push({
              productId,
              name: product.name,
              available: pricingType === "box" ? totalRemaining : unitRemaining,
              requested: quantity,
              currentInOrder: oldQuantity,
              additionalNeeded: additionalQuantity,
              type: pricingType,
            });
          }
        }
      }

      if (insufficientStock.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock for some items",
          insufficientStock,
        });
      }
    }

    // Track status change for notifications
    const oldStatus = existingOrder.status;
    const newStatus = updateFields.status;
    const statusChanged = newStatus && newStatus !== oldStatus;

    const oldItemsMap = {};
    existingOrder.items.forEach((item) => {

      oldItemsMap[item.productId.toString()] = {
        quantity: item.quantity,
        pricingType: item.pricingType,
      };
    });

    // Update order fields (excluding items)
    Object.keys(updateFields).forEach((key) => {
      if (key !== "items" && updateFields[key] !== undefined) {
        existingOrder[key] = updateFields[key];
      }
    });

    // If items are updated, process inventory changes
    if (updateFields.items && Array.isArray(updateFields.items)) {
      existingOrder.items = updateFields.items;

      for (const item of updateFields.items) {
        const { productId, quantity, pricingType } = item;
        // if (!productId || quantity <= 0) continue;


        // const product = await Product.findById(productId);
        // if (!product) continue;
        // const saleDate = existingOrder.createdAt || new Date();

        // // Remove old sales history for this date
        // const orderDateISO = new Date(existingOrder.createdAt).toISOString();

        // // Remove only matching entries (pricingType-wise)
        // product.salesHistory = product.salesHistory.filter(
        //   (p) =>
        //     !(
        //       new Date(p.date).toISOString() === orderDateISO &&
        //       oldItemsMap[product._id]?.pricingType === "box"
        //     )
        // );

        // product.lbSellHistory = product.lbSellHistory.filter(
        //   (p) =>
        //     !(
        //       new Date(p.date).toISOString() === orderDateISO &&
        //       p.lb === oldItemsMap[product._id]?.pricingType
        //     )
        // );

        // // Add updated sales history
        // if (pricingType === "unit") {
        //   product.salesHistory.push({
        //     date: saleDate,
        //     quantity: quantity,
        //   });

        //   product.lbSellHistory.push({
        //     date: saleDate,
        //     weight: quantity,
        //     lb: "unit",
        //   });
        // } else if (pricingType === "box") {
        //   const totalBoxes = product.totalPurchase || 1;
        //   const avgUnitsPerBox = product.unitPurchase / totalBoxes;
        //   const estimatedUnitsUsed = avgUnitsPerBox * quantity;

        //   product.salesHistory.push({
        //     date: saleDate,
        //     quantity: quantity,
        //   });

        //   product.lbSellHistory.push({
        //     date: saleDate,
        //     weight: estimatedUnitsUsed,
        //     lb: "box",
        //   });
        // }

        // const old = oldItemsMap[productId.toString()] || {
        //   quantity: 0,
        //   pricingType,
        // };

        // // Reverse old impact
        // if (old.pricingType === "unit") {
        //   product.unitSell -= old.quantity;
        //   product.unitRemaining += old.quantity;
        // } else if (old.pricingType === "box") {
        //   product.totalSell -= old.quantity;
        //   product.remaining += old.quantity;

        //   const totalBoxes = product.totalPurchase || 1;
        //   const avgUnitsPerBox = product.unitPurchase / totalBoxes;
        //   product.unitRemaining += avgUnitsPerBox * old.quantity;
        // }

        // // Apply new impact
        // if (pricingType === "unit") {
        //   product.unitSell += quantity;
        //   product.unitRemaining = Math.max(0, product.unitRemaining - quantity);
        // } else if (pricingType === "box") {
        //   product.totalSell += quantity;
        //   product.remaining = Math.max(0, product.remaining - quantity);

        //   const totalBoxes = product.totalPurchase || 1;
        //   const avgUnitsPerBox = product.unitPurchase / totalBoxes;
        //   const estimatedUnitsUsed = avgUnitsPerBox * quantity;
        //   product.unitRemaining = Math.max(
        //     0,
        //     product.unitRemaining - estimatedUnitsUsed
        //   );
        // }

        // await product.save();


      }
    }

    await existingOrder.save();

    // Send order updated email notification - COMMENTED OUT (Email disabled for edit order)
    /*
    try {
      const storeDetails = await authModel.findById(existingOrder.store);
      
      if (storeDetails) {
        await notificationService.createNotificationWithEmail(
          storeDetails._id,
          storeDetails.email,
          "order_updated",
          "Order Updated",
          `Your order #${existingOrder.orderNumber} has been updated. Total: $${existingOrder.total.toFixed(2)}`,
          "ORDER_UPDATED",
          {
            ownerName: storeDetails.ownerName || storeDetails.storeName,
            storeName: storeDetails.storeName,
            orderNumber: existingOrder.orderNumber,
            total: existingOrder.total.toFixed(2),
            itemCount: existingOrder.items.length,
            items: existingOrder.items,
            orderDate: new Date().toLocaleDateString(),
            orderUrl: `${process.env.CLIENT_URL}/store/dashboard`,
          },
          { 
            orderId: existingOrder._id, 
            orderNumber: existingOrder.orderNumber,
            total: existingOrder.total 
          },
          `/orders/edit/${existingOrder._id}`
        );
        
        console.log("📧 Order update email sent to:", storeDetails.email);
      }
    } catch (notificationError) {
      console.error("Error sending order update notification:", notificationError);
    }

    // Send status change notification if status was updated
    if (statusChanged) {
      try {
        const storeDetails = await authModel.findById(existingOrder.store);
        
        if (storeDetails) {
          await notificationService.createNotificationWithEmail(
            storeDetails._id,
            storeDetails.email,
            "order_status_changed",
            "Order Status Updated",
            `Your order #${existingOrder.orderNumber} status has been updated to: ${newStatus}`,
            "ORDER_STATUS_UPDATE",
            {
              ownerName: storeDetails.ownerName || storeDetails.storeName,
              storeName: storeDetails.storeName,
              orderNumber: existingOrder.orderNumber,
              oldStatus: oldStatus,
              newStatus: newStatus,
              total: existingOrder.total.toFixed(2),
            },
            { 
              orderId: existingOrder._id, 
              orderNumber: existingOrder.orderNumber,
              oldStatus,
              newStatus 
            },
            `/orders/edit/${existingOrder._id}`
          );
        }
      } catch (notificationError) {
        // Log notification error but don't fail order update
        console.error("Error sending order status notification:", notificationError);
      }
    }
    */

    for (const item of existingOrder.items) {
      try {
        if (!item.productId) {
          console.warn("⚠️ Skipping item without productId:", item);
          continue;
        }

        console.log(`🔁 Rebuilding product history for: ${item.productId}`);
        const result = await resetAndRebuildHistoryForSingleProduct(item.productId);

        if (result.success) {
          console.log(`✅ Success: ${result.message}`);
        } else {
          console.error(`❌ Failed to rebuild for product ${item.productId}:`, result.error);
        }
      } catch (err) {
        console.error(`🔥 Error processing item ${item.productId}:`, err.message);
      }
    }



    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      updatedOrder: existingOrder,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while updating order",
    });
  }
};

const updatePalletInfo = async (req, res) => {
  const { orderId } = req.params;
  const { palletData } = req.body;
  console.log(req.body);
  try {
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      { palletData },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      message: "Pallet info saved successfully",
      data: updatedOrder,
    });
  } catch (err) {
    console.error("Failed to save pallet info:", err);
    res.status(500).json({
      success: false,
      message: "Something went wrong while saving pallet info",
      error: err.message,
    });
  }
};

const userDetailsWithOrder = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await authModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) },
      },
      {
        $lookup: {
          from: "orders",
          let: { storeId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$store", "$$storeId"] } } },
            { $sort: { createdAt: -1 } },
          ],
          as: "orders",
        },
      },
      {
        $addFields: {
          totalOrders: { $size: "$orders" },
          totalSpent: {
            $sum: {
              $map: {
                input: "$orders",
                as: "order",
                in: "$$order.total",
              },
            },
          },
          totalPay: {
            $sum: {
              $map: {
                input: "$orders",
                as: "order",
                in: {
                  $add: [
                    {
                      $cond: [
                        { $eq: ["$$order.paymentStatus", "paid"] },
                        "$$order.total",
                        {
                          $cond: [
                            { $eq: ["$$order.paymentStatus", "partial"] },
                            { $toDouble: { $ifNull: ["$$order.paymentAmount", 0] } },
                            0,
                          ],
                        },
                      ],
                    },
                    { $toDouble: { $ifNull: ["$$order.creditApplied", 0] } }
                  ]
                },
              },
            },
          },
          balanceDue: {
            $sum: {
              $map: {
                input: "$orders",
                as: "order",
                in: {
                  $cond: [
                    { $eq: ["$$order.paymentStatus", "paid"] },
                    0,
                    {
                      $subtract: [
                        { $toDouble: "$$order.total" },
                        {
                          $add: [
                            {
                              $cond: [
                                { $eq: ["$$order.paymentStatus", "partial"] },
                                { $toDouble: { $ifNull: ["$$order.paymentAmount", 0] } },
                                0,
                              ],
                            },
                            { $toDouble: { $ifNull: ["$$order.creditApplied", 0] } }
                          ]
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
          lastPayment: {
            $first: {
              $map: {
                input: {
                  $slice: [
                    {
                      $sortArray: {
                        input: {
                          $reduce: {
                            input: "$orders",
                            initialValue: [],
                            in: { $concatArrays: ["$$value", ["$$this"]] },
                          },
                        },
                        sortBy: { "paymentDetails.paymentDate": -1 },
                      },
                    },
                    1,
                  ],
                },
                as: "order",
                in: {
                  orderId: "$$order.orderId",
                  payment: "$$order.paymentDetails",
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          totalOrders: 1,
          totalSpent: 1,
          totalPay: 1,
          balanceDue: 1,
          lastPayment: 1,
          orders: 1,
          user: {
            _id: "$_id",
            email: "$email",
            phone: "$phone",
            storeName: "$storeName",
            ownerName: "$ownerName",
            address: "$address",
            city: "$city",
            state: "$state",
            zipCode: "$zipCode",
            businessDescription: "$businessDescription",
            role: "$role",
            createdAt: {
              $dateToString: {
                format: "%Y-%m-%dT%H:%M:%S.%LZ",
                date: "$createdAt",
              },
            },
          },
        },
      },
    ]);

    if (result.length > 0) {
      return res.status(200).json({
        success: true,
        message: "User details with order summary fetched successfully",
        data: result[0],
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    console.error("Error fetching user order details:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching order details",
      error: error.message,
    });
  }
};


const updatePaymentDetails = async (req, res) => {
  const { orderId } = req.params;
  const { method, transactionId, notes, paymentType, amountPaid } = req.body;

  console.log(req.body);

  try {
    // Check for valid method
    if (!["cash", "creditcard", "cheque"].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method. Allowed: 'cash' or 'creditcard'",
      });
    }

    // Validate based on method
    if (method === "creditcard" && !transactionId) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required for credit card payments",
      });
    }

    if (method === "cash" && !notes) {
      return res.status(400).json({
        success: false,
        message: "Notes are required for cash payments",
      });
    }

    // Get current order to check credit applied
    const currentOrder = await orderModel.findById(orderId);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Calculate actual payment status based on total paid + credit applied
    const totalPaid = parseFloat(amountPaid || 0) + parseFloat(currentOrder.creditApplied || 0);
    const orderTotal = currentOrder.total || 0;
    
    // Calculate the individual payment amount (new total - previous total)
    const previousPaymentAmount = parseFloat(currentOrder.paymentAmount || 0);
    const individualPaymentAmount = parseFloat(amountPaid || 0) - previousPaymentAmount;
    
    let calculatedPaymentStatus = "pending";
    if (totalPaid >= orderTotal) {
      calculatedPaymentStatus = "paid";
    } else if (totalPaid > 0) {
      calculatedPaymentStatus = "partial";
    }

    // Prepare paymentDetails object
    const paymentDetails = {
      method,
      ...(method === "creditcard" ? { transactionId } : {}),
      ...(method === "cash" ? { notes } : {}),
      ...(method === "cheque" ? { notes } : {}),
      paymentDate: new Date(),
    };

    // Create payment history entry with INDIVIDUAL payment amount (not cumulative)
    const paymentHistoryEntry = {
      amount: individualPaymentAmount > 0 ? individualPaymentAmount : parseFloat(amountPaid) || 0,
      method,
      transactionId: method === "creditcard" ? transactionId : undefined,
      notes: notes || undefined,
      paymentDate: new Date(),
      recordedBy: req.user?.id || req.user?._id,
      recordedByName: req.user?.name || req.user?.storeName || req.user?.email,
    };

    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      {
        paymentDetails,
        paymentStatus: calculatedPaymentStatus,
        paymentAmount: amountPaid,
        $push: { paymentHistory: paymentHistoryEntry },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Payment details updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating payment details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const markOrderAsUnpaid = async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  
  if (!reason) {
    return res.status(400).json({
      success: false,
      message: "Reason is required",
    });
  }
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const order = await orderModel.findById(orderId).session(session);
    
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    
    const creditApplied = parseFloat(order.creditApplied || 0);
    const storeId = order.store;
    
    // If credit was applied, refund it to store
    if (creditApplied > 0 && storeId) {
      const store = await authModel.findById(storeId).session(session);
      if (store) {
        // Add credit back to store
        const currentCredit = parseFloat(store.creditBalance || 0);
        store.creditBalance = currentCredit + creditApplied;
        
        // Add to store's unpaid order history
        if (!store.unpaidOrderHistory) {
          store.unpaidOrderHistory = [];
        }
        store.unpaidOrderHistory.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          creditRefunded: creditApplied,
          reason: reason,
          markedUnpaidAt: new Date(),
          markedUnpaidBy: req.user?.id || req.user?._id,
          markedUnpaidByName: req.user?.name || req.user?.email || "Admin"
        });
        
        await store.save({ session });
      }
    }
    
    // Update order - clear all payment info
    order.paymentStatus = "pending";
    order.paymentDetails = null;
    order.paymentAmount = 0;
    order.paymentHistory = [];
    order.creditApplied = 0;
    order.creditApplications = [];
    order.markedUnpaidReason = reason;
    order.markedUnpaidAt = new Date();
    
    await order.save({ session });
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: creditApplied > 0 
        ? `Order marked as unpaid. ${creditApplied.toFixed(2)} credit refunded to store.`
        : "Order marked as unpaid successfully",
      data: order,
      creditRefunded: creditApplied
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error marking order as unpaid:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

const deleteOrderCtrl = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res
      .status(400)
      .json({ success: false, message: "Reason is required" });
  }

  try {
    const order = await orderModel.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const amount = order.total ?? 0;

    // Soft delete flags
    order.isDelete = true;
    order.deleted = { reason, amount };
    order.total = 0;

    // Loop through each item and reverse its effect
    for (const item of order.items) {
      const { productId, quantity, pricingType } = item;
      if (!productId || quantity <= 0) continue;

      const product = await Product.findById(productId);
      if (!product) continue;

      const saleDate = order.createdAt;
      const totalBoxes = product.totalPurchase || 1;
      const avgUnitsPerBox = product.unitPurchase / totalBoxes;
      const estimatedUnitsUsed = avgUnitsPerBox * quantity;

      if (pricingType === "unit") {
        product.unitSell -= quantity;
        product.unitRemaining += quantity;

        // Remove unit lbSellHistory
        // product.lbSellHistory = product.lbSellHistory.filter(
        //   (p) => !(p.date.toISOString() === saleDate.toISOString() && p.lb === "unit" && p.weight === quantity)
        // );

        product.lbSellHistory.push({
          date: Date.now(),
          weight: -Math.abs(quantity),
          lb: "unit",
        });

        // Remove estimated box lbSellHistory
        // product.lbSellHistory = product.lbSellHistory.filter(
        //   (p) => !(p.date.toISOString() === saleDate.toISOString() && p.lb === "box" && p.weight === estimatedUnitsUsed)
        // );
      }

      if (pricingType === "box") {
        product.totalSell -= quantity;
        product.remaining += quantity;
        product.unitRemaining += estimatedUnitsUsed;

        // Remove box sales history
        // product.salesHistory = product.salesHistory.filter(
        //   (p) => !(p.date.toISOString() === saleDate.toISOString() && p.quantity === quantity)
        // );
        product.salesHistory.push({
          date: new Date(),
          quantity: -Math.abs(quantity), // ensure negative value
        });
        product.lbSellHistory.push({
          date: Date.now(),
          weight: -Math.abs(estimatedUnitsUsed),
          lb: "box",
        });
      }

      await product.save();
    }

    // Zero out order items and preserve deleted info
    order.items = order.items.map((item) => {
      const qty = item.quantity ?? 0;
      const price = item.unitPrice || item.price || 0;
      const total = item.total ?? qty * price;

      return {
        ...item,
        deletedQuantity: qty,
        deletedTotal: total,
        quantity: 0,
        total: 0,
      };
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order soft-deleted successfully",
      deletedOrder: order,
    });
  } catch (err) {
    console.error("Soft delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteOrderHardCtrl = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await orderModel.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.isDelete) {
      return res.status(400).json({
        success: false,
        message: "Only soft-deleted orders can be permanently deleted",
      });
    }

    await orderModel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Order permanently deleted",
    });
  } catch (error) {
    console.error("❌ Hard delete error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting order",
    });
  }
};

const updateOrderTypeCtrl = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderType } = req.body;

    // Check if orderId is valid
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Order ID" });
    }

    // Validate orderType
    if (!orderType || typeof orderType !== "string") {
      return res.status(400).json({
        success: false,
        message: "orderType is required and must be a string",
      });
    }

    // Find and update the order
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      { orderType },
      { new: true }
    );

    if (!updatedOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      message: "Order type updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating orderType:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getUserOrderStatement = async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId;
    const paymentStatus = req.query.paymentStatus || "all";
    const startMonth = req.query.startMonth;
    const endMonth = req.query.endMonth;
    const sendMail = req.query.send;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    let user;
    let isVendor = false;

    // ✅ Pehle authModel me check karo (normal user)
    user = await authModel
      .findById(userId)
      .select("name storeName ownerName phone email address city state zipCode");

    // ✅ Agar user null hai to vendorModel me check karo
    if (!user) {
      user = await vendorModel
        .findById(userId)
        .select("name storeName ownerName phone email address city state zipCode");

      if (user) {
        isVendor = true;
      }
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User/Vendor not found" });
    }

    // ✅ Query build
    let query = {};
    if (isVendor) {
      query.vendorId = userId; // vendor ke liye
    } else {
      query.store = userId; // user ke liye
    }

    if (paymentStatus !== "all") {
      if (paymentStatus === "pending") {
        query.paymentStatus = { $in: ["pending", "partial"] };
      } else {
        query.paymentStatus = paymentStatus;
      }
    }

    // ✅ Date filter
   // ✅ Date filter
if (startMonth || endMonth) {
  if (isVendor) {
    if (!query.purchaseDate) query.purchaseDate = {};   // initialize karo
  } else {
    if (!query.createdAt) query.createdAt = {};         // initialize karo
  }

  if (startMonth) {
    const [year, month] = startMonth.split("-");
    const startDate = new Date(`${year}-${month}-01`);

    if (isVendor) {
      query.purchaseDate.$gte = startDate;
    } else {
      query.createdAt.$gte = startDate;
    }
  }

  if (endMonth) {
    const [year, month] = endMonth.split("-");
    const endDate = new Date(year, Number(month), 0);

    if (isVendor) {
      query.purchaseDate.$lte = endDate;
    } else {
      query.createdAt.$lte = endDate;
    }
  }
}


    // ✅ Model choose
    const modelToUse = isVendor ? purchaseModel : orderModel;

    const orders = await modelToUse.find(query).sort({ createdAt: 1 });

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "No records found with applied filters",
      });
    }

    // ✅ Summary + Totals
    const summary = {};
    let totalPaid = 0,
      totalPending = 0,
      totalProductsOrdered = 0,
      allTotalAmount = 0;

    orders.forEach((order) => {
      const created = isVendor ? new Date(order.purchaseDate) : new Date(order.createdAt);
      const year = created.getFullYear();
      const month = (created.getMonth() + 1).toString().padStart(2, "0");
      const monthKey = `${year}-${month}`;

      if (!summary[monthKey]) {
        summary[monthKey] = {
          orders: [],
          totalAmount: 0,
          totalPaid: 0,
          totalPending: 0,
          totalProducts: 0,
        };
      }

      const itemCount = Array.isArray(order.items)
        ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        : 0;

      let paymentAmount = 0;
      if (order.paymentStatus === "paid") {
        paymentAmount = order.totalAmount || order.total || 0;
      } else if (order.paymentStatus === "partial") {
        paymentAmount = order.paymentAmount || 0;
      }

      summary[monthKey].orders.push({
        orderNumber: order.orderNumber || order.purchaseOrderNumber,
        date: created.toISOString(),
        amount: order.totalAmount || order.total || 0,
        paymentStatus: order.paymentStatus,
        paymentAmount: paymentAmount,
        productCount: itemCount,
      });

      const totalAmount = parseFloat(order.totalAmount || order.total || 0);
      const paid = parseFloat(order.paymentAmount) || 0;
      const pending = totalAmount - paid;

      summary[monthKey].totalAmount += totalAmount;
      summary[monthKey].totalPaid += paid;
      summary[monthKey].totalPending += pending;
      summary[monthKey].totalProducts += itemCount;

      allTotalAmount += totalAmount;
      totalPaid += paid;
      totalPending += pending;
      totalProductsOrdered += itemCount;
    });

    // ✅ Mail send (optional)
    if (sendMail == 1) {
      try {
        const responsePDF = await generateStatementPDF({
          user: {
            name: user.ownerName || user.name,
            storeName: user.storeName,
            phone: user.phone,
            email: user.email,
            address: user.address,
            city: user.city,
            state: user.state,
            zipCode: user.zipCode,
          },
          filters: {
            paymentStatus,
            startMonth: startMonth || "all",
            endMonth: endMonth || "all",
          },
          summaryByMonth: summary,
          totalPaid,
          totalPending,
          totalProductsOrdered,
          closingBalance: totalPending,
        });

        const customerEmail = user.email;
        const subject = `Monthly Statement for ${user.storeName || (isVendor ? "Vendor" : "User")
          } - ${new Date().toLocaleString("en-US", {
            month: "long",
            year: "numeric",
          })}`;

        const message = `
          Dear ${user.ownerName || user.name},

          Please find attached the monthly statement for "${user.storeName || (isVendor ? "your vendor account" : "your store")
          }".
          This statement includes details and payment status for the selected period.

          Total Amount: ${allTotalAmount}
          Total Paid: ${totalPaid}
          Total Pending: ${totalPending}
          Total Products Ordered: ${totalProductsOrdered}

          Best Regards,
          Vali Produce
        `;

        await mailSender(customerEmail, subject, message, responsePDF);
      } catch (err) {
        console.error("Error while sending email:", err);
      }
    }

    // ✅ Final response
    res.status(200).json({
      success: true,
      message: "Statement generated successfully",
      type: isVendor ? "vendor" : "user",
      data: {
        user: {
          name: user.ownerName || user.name,
          storeName: user.storeName,
          phone: user.phone,
          email: user.email,
          address: user.address,
          city: user.city,
          state: user.state,
          zipCode: user.zipCode,
        },
        filters: {
          paymentStatus,
          startMonth: startMonth || "all",
          endMonth: endMonth || "all",
        },
        summaryByMonth: summary,
        totalPaid,
        totalPending,
        totalProductsOrdered,
        closingBalance: totalPending,
      },
    });
  } catch (err) {
    console.error("Error generating statement:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// const updateShippingController = async (req, res) => {
//   try {
//     // Extract the required values from the request body
//     const { orderId, newShippingCost, plateCount } = req.body;

//     // Validate input
//     if (!orderId || !newShippingCost || !plateCount) {
//       return res.status(400).json({
//         success: false,
//         message: "Please provide orderId, newShippingCost, and plateCount.",
//       });
//     }

//     // Fetch order from the database
//     const order = await orderModel.findById(orderId);
//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Order not found.",
//       });
//     }

//     // Store the old shipping cost
//     const oldShippingCost = order.shippinCost;

//     // Calculate new shipping cost by multiplying with plate count
//     const calculatedShippingCost = newShippingCost * plateCount;

//     // Update the order's shipping cost and total

//     order.shippinCost = calculatedShippingCost; // New shipping cost
//     order.total = order.total + (calculatedShippingCost - oldShippingCost); // Update total cost

//     // Save the updated order in the database
//     await order.save();

//     // Respond with success message
//     return res.status(200).json({
//       success: true,
//       message: `Shipping cost updated successfully. Old Shipping Cost: ${oldShippingCost}, New Shipping Cost: ${calculatedShippingCost}`,
//       updatedOrder: order, // Optionally send updated order details
//     });
//   } catch (error) {
//     console.error("Error updating shipping cost:", error);
//     return res.status(500).json({
//       success: false,
//       message: "An error occurred while updating the shipping cost.",
//     });
//   }
// };

const updateShippingController = async (req, res) => {
  try {
    const { orderId, newShippingCost, plateCount } = req.body;

    // Validate input
    if (!orderId || newShippingCost == null || plateCount == null) {
      return res.status(400).json({
        success: false,
        message: "Please provide orderId, newShippingCost, and plateCount.",
      });
    }

    // Parse numbers safely
    const shippingPerPlate = parseFloat(newShippingCost);
    const plateQty = parseInt(plateCount);

    if (isNaN(shippingPerPlate) || isNaN(plateQty)) {
      return res.status(400).json({
        success: false,
        message: "Shipping cost and plate count must be valid numbers.",
      });
    }

    // Fetch order
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Calculate item total
    const items = order.items || [];
    const itemTotal = items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity || 0);
      const price = parseFloat(item.unitPrice || 0);
      return sum + quantity * price;
    }, 0);

    // Calculate new shipping cost
    const calculatedShippingCost = shippingPerPlate * plateQty;

    // Final total
    const newTotal = itemTotal + calculatedShippingCost;

    // Update the order
    order.shippinCost = calculatedShippingCost;
    order.total = newTotal;
    order.plateCount = plateQty;

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order total recalculated and shipping updated.",
      itemTotal,
      shippingCost: calculatedShippingCost,
      total: newTotal,
      updatedOrder: order,
    });
  } catch (error) {
    console.error("Error updating shipping cost:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the shipping cost.",
    });
  }
};

const getDashboardData = async (req, res) => {
  try {
    // Total Orders
    const totalOrders = await orderModel.countDocuments();

    // Total Stores
    const totalStores = await authModel.countDocuments({ role: "store" });

    // Aggregation for Payment Data
    const paymentData = await orderModel.aggregate([
      {
        $project: {
          total: 1,
          paymentStatus: 1,
          status: 1,
          paymentAmount: { $toDouble: { $ifNull: ["$paymentAmount", "0"] } },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$total" },
          totalReceived: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "paid"] },
                "$total", // fully paid orders
                {
                  $cond: [
                    { $eq: ["$paymentStatus", "partial"] },
                    "$paymentAmount", // partial payment amount
                    0,
                  ],
                },
              ],
            },
          },
          // Pending Orders
          pendingPaidAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "pending"] },
                    { $eq: ["$paymentStatus", "partial"] },
                  ],
                },
                "$paymentAmount",
                0,
              ],
            },
          },
          pendingDueAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "pending"] },
                    { $ne: ["$paymentStatus", "paid"] },
                  ],
                },
                { $subtract: ["$total", "$paymentAmount"] },
                0,
              ],
            },
          },
          // Delivered Orders
          deliveredPaidAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "delivered"] },
                    { $eq: ["$paymentStatus", "partial"] },
                  ],
                },
                "$paymentAmount",
                {
                  $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$total", 0],
                },
              ],
            },
          },
          deliveredDueAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "delivered"] },
                    { $ne: ["$paymentStatus", "paid"] },
                  ],
                },
                { $subtract: ["$total", "$paymentAmount"] },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          totalAmount: 1,
          totalReceived: 1,
          totalPending: { $subtract: ["$totalAmount", "$totalReceived"] },
          pendingPaidAmount: 1,
          pendingDueAmount: 1,
          deliveredPaidAmount: 1,
          deliveredDueAmount: 1,
        },
      },
    ]);

    const totalAmount = paymentData[0]?.totalAmount || 0;
    const totalReceived = paymentData[0]?.totalReceived || 0;
    const totalPending = paymentData[0]?.totalPending || 0;
    const pendingPaidAmount = paymentData[0]?.pendingPaidAmount || 0;
    const pendingDueAmount = paymentData[0]?.pendingDueAmount || 0;
    const deliveredPaidAmount = paymentData[0]?.deliveredPaidAmount || 0;
    const deliveredDueAmount = paymentData[0]?.deliveredDueAmount || 0;

    // Top 10 Users by Order Amount
    const topUsers = await orderModel.aggregate([
      {
        $group: {
          _id: "$store",
          totalAmount: { $sum: "$total" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "auths",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: "$userDetails.ownerName",
          storeName: "$userDetails.storeName",
          email: "$userDetails.email",
          orderCount: 1,
          totalAmount: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: {
        totalOrders,
        totalStores,
        totalAmount,
        totalReceived,
        totalPending,
        pendingOrders: {
          paidAmount: pendingPaidAmount,
          dueAmount: pendingDueAmount,
        },
        deliveredOrders: {
          paidAmount: deliveredPaidAmount,
          dueAmount: deliveredDueAmount,
        },
        topUsers,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message,
    });
  }
};

const invoiceMailCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.findById(id).populate("store");

    console.log(order);
    const responsePDF = await exportInvoiceToPDFBackend({
      id: order.orderNumber,
      clientId: order.store._id,
      clientName: order.store.storeName,
      shippinCost: order.shippinCost || 0,
      date: order.createdAt,
      shippingAddress: order?.shippingAddress,
      billingAddress: order?.billingAddress,
      status: order.status,
      items: order.items,
      total: order.total,
      paymentStatus: order.paymentStatus || "pending",
      subtotal: order.total,
      store: order.store,
      paymentDetails: order.paymentDetails || {},
    });

    // const customerEmail = "vikasmaheshwari6267@gmail.com" ;
    const customerEmail = order.store.email;
    const subject = `Invoice #${order.orderNumber}`;
    const message = `
      Hi ,

      Thank you for your order! Please find your invoice attached for your recent purchase with us.

      🧾 Invoice Number: ${order.orderNumber}
      📅 Date: ${new Date(order.createdAt).toLocaleDateString()}

      We're awaiting the cheque/payment. Kindly update us on the status at your earliest convenience. If you have any questions or need assistance, feel free to reach out. We appreciate your business and look forward to serving you again!

    Best regards,

    Nada Saiyed
    Sales Manager
    Vali Produce LLC, Atlanta, GA
    501-559-0123
        `;

    await mailSender(
      customerEmail,
      subject,
      message,
      responsePDF,
      `INVOICE- #${order.orderNumber}`
    );
    console.log("Email sent successfully to:", customerEmail);

    res.status(200).json({
      success: true,
      message: "Order type updated successfully",
    });
  } catch (error) {
    console.error("Error updating orderType:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getPendingOrders = async (req, res) => {
  try {
    const pendingOrders = await orderModel.aggregate([
      {
        $group: {
          _id: "$store", // ensure this is your correct field for store reference
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          totalPaid: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$total", 0] },
          },
          totalPending: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "pending"] }, "$total", 0],
            },
          },
        },
      },
      {
        $match: { totalPending: { $gt: 0 } }, // only stores with pending amount
      },
      {
        $lookup: {
          from: "auths",
          localField: "_id",
          foreignField: "_id",
          as: "storeInfo",
        },
      },
      {
        $unwind: {
          path: "$storeInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { totalPending: -1 }, // sort by pending amount descending
      },
      {
        $project: {
          storeName: "$storeInfo.storeName",
          storeEmail: "$storeInfo.email",
          totalOrders: 1,
          totalAmount: 1,
          totalPaid: 1,
          totalPending: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Pending orders by store fetched successfully",
      data: pendingOrders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching pending orders by store",
      error: error.message,
    });
  }
};






const updateBuyerQuantityCtrl = async (req, res) => {
  try {
    console.log("🟢 Request body:", req.body);

    const { orderId, productId, quantity } = req.body;

    if (!orderId || !productId || quantity == null) {
      return res.status(400).json({ success: false, message: "orderId, productId, quantity required" });
    }

    const order = await orderModel.findById(orderId);
    console.log("🛒 Fetched order:", order ? order._id : "Not found");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const itemIndex = order.items.findIndex(
      (item) => item.productId?.toString() === productId.toString()
    );
    console.log("🔍 Item index found:", itemIndex);
    console.log("Order items:", order.items.map(i => ({ productId: i.productId, quantity: i.quantity })));

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Product not found in order items" });
    }

    console.log(`Before update:`, order.items[itemIndex].quantity);
    order.items[itemIndex].quantity = quantity;
order.markModified("items"); // important for plain array of objects
const savedOrder = await order.save();
    console.log("📝 Order saved:", savedOrder.items[itemIndex]);

    try {
      if (!productId) {
        console.warn("⚠️ Skipping item without productId");
      }
      const result = await resetAndRebuildHistoryForSingleProduct(productId);
      console.log("Product history rebuild result:", result);
    } catch (err) {
      console.error("🔥 Error processing product history:", err);
    }

    return res.status(200).json({
      success: true,
      message: "Quantity updated successfully",
      updatedItem: savedOrder.items[itemIndex],
    });

  } catch (err) {
    console.error("❌ updateBuyerQuantityCtrl error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


const assignProductToStore = async (req, res) => {
  try {
    const { productId, storeId, quantity = 1 } = req.body;
    const requestedQty = Math.max(1, parseInt(quantity) || 1);

    if (!productId || !storeId) {
      return res.status(400).json({ success: false, message: "productId and storeId are required" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const store = await authModel.findById(storeId);
    if (!store) return res.status(404).json({ success: false, message: "Store not found" });

    const now = new Date();
    const day = now.getUTCDay();
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((day + 6) % 7), 0,0,0,0));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6, 23,59,59,999));

    const isWithinRange = (date) => new Date(date) >= monday && new Date(date) <= sunday;

    // ✅ Week filter
    const filteredPurchase = (product.purchaseHistory || []).filter(p => isWithinRange(p.date));
    const filteredSell = (product.salesHistory || []).filter(s => isWithinRange(s.date));
    const filteredLBPurchase = (product.lbPurchaseHistory || []).filter(p => isWithinRange(p.date));
    const filteredLBSell = (product.lbSellHistory || []).filter(s => isWithinRange(s.date));
    const filteredTrash = (product.quantityTrash || []).filter(t => isWithinRange(t.date));

    const totalPurchase = filteredPurchase.reduce((sum, p) => sum + p.quantity, 0);
    const totalSell = filteredSell.reduce((sum, s) => sum + s.quantity, 0);
    const unitPurchase = filteredLBPurchase.reduce((sum, p) => sum + p.weight, 0);
    const unitSell = filteredLBSell.reduce((sum, s) => sum + s.weight, 0);

    const trashBox = filteredTrash.filter(t => t.type === "box").reduce((sum, t) => sum + t.quantity, 0);
    const trashUnit = filteredTrash.filter(t => t.type === "unit").reduce((sum, t) => sum + t.quantity, 0);

    const totalRemaining = Math.max(totalPurchase - totalSell - trashBox + (product.manuallyAddBox?.quantity || 0), 0);
    const unitRemaining = Math.max(unitPurchase - unitSell - trashUnit + (product.manuallyAddUnit?.quantity || 0), 0);

    // ✅ Check BOX availability for requested quantity
    if (totalRemaining < requestedQty) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock (week-wise check)",
        insufficientStock: [{
          productId,
          name: product.name,
          available: totalRemaining,
          requested: requestedQty,
          type: "box",
          weekRange: `${monday.toISOString().split("T")[0]} to ${sunday.toISOString().split("T")[0]}`
        }]
      });
    }
    // ✅ Create order item with requested quantity
    const newItem = {
      productId: product._id.toString(),
      productName: product.name,
      quantity: requestedQty,
      unitPrice: getProductPriceForStore(product, store.priceCategory, "box"),
      shippinCost: product.shippinCost || 0,
      pricingType: "box",
    };

    // ✅ Find or create weekly order
    // let order = await orderModel.findOne({ store: storeId, createdAt: { $gte: monday, $lte: sunday } }).sort({ createdAt: -1 });
   let order = await orderModel.findOne({ store: storeId, createdAt: { $gte: monday, $lte: sunday } }).sort({ createdAt: -1 });
console.log(order,"ORDER");
if (!order) {
  console.log("🟡 No weekly order found, creating new order via createOrderCtrl...");

  // call createOrderCtrl internally
  return createOrderCtrl(
    {
      body: {
        items: [newItem],
        status: "pending",
        total: (newItem.unitPrice * requestedQty) + (newItem.shippinCost || 0),
        clientId: { value: storeId },
        billingAddress: {
          name: store.storeName || store.name,
          phone: store.phone || "",
          address: store.address || "",
          city: store.city || "",
          country: "USA",
        },
        shippingAddress: {
          name: store.storeName || store.name,
          phone: store.phone || "",
          address: store.address || "",
          city: store.city || "",
          country: "USA",
        },
        orderType: "Regural",
        
       
      },
    },
    res
  );
}
 else {
      const exists = order.items.find(i => i.productId.toString() === productId);
      if (!exists) {
        return updateOrderCtrl(
    {
      params: { id: order._id },
      body: {
        items: [...order.items, newItem], // old + new item
        total: order.total + (newItem.unitPrice * requestedQty) + (newItem.shippinCost || 0)
      }
    },
    res
  );
      }
    }

    // ✅ EXACT CREATE ORDER LOGIC FOR BOX with requested quantity
    const lastUpdated = product.updatedFromOrders?.[product.updatedFromOrders.length - 1];

    let avgUnitsPerBox = 0;
    let estimatedUnitsUsed = 0;

    if (lastUpdated && lastUpdated.perLb && lastUpdated.newQuantity) {
      avgUnitsPerBox = lastUpdated.perLb;
      estimatedUnitsUsed = avgUnitsPerBox * requestedQty;
    }

    product.lbSellHistory.push({ date: now, weight: estimatedUnitsUsed, lb: "box" });
    product.salesHistory.push({ date: now, quantity: requestedQty });

    product.totalSell = (product.totalSell || 0) + requestedQty;
    product.remaining = Math.max(0, product.remaining - requestedQty);
    product.unitRemaining = Math.max(0, product.unitRemaining - estimatedUnitsUsed);
    product.unitSell = (product.unitSell || 0) + estimatedUnitsUsed;

    // Save product changes to database
    await product.save();

    res.json({
      success: true,
      message: "Product assigned successfully & stock updated",
      product: {
        remaining: product.remaining,
        unitRemaining: product.unitRemaining,
        totalSell: product.totalSell,
        unitSell: product.unitSell,
      },
      order,
    });

  } catch (error) {
    console.error("Assign Product Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get user's latest orders with purchased products
const getUserLatestOrdersCtrl = async (req, res) => {
  try {
    const { storeId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }

    // Validate if storeId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Store ID format",
      });
    }

    // Fetch latest orders for the store
    const orders = await orderModel
      .find({ 
        store: new mongoose.Types.ObjectId(storeId),
        isDelete: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('items orderNumber createdAt total')
      .lean();

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No orders found for this store",
        orders: [],
        purchasedProductIds: [],
      });
    }

    // Extract unique product IDs from all orders
    const productIdsSet = new Set();
    
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.productId) {
            productIdsSet.add(item.productId.toString());
          } else if (item.product) {
            productIdsSet.add(item.product.toString());
          }
        });
      }
    });

    const purchasedProductIds = Array.from(productIdsSet);

    return res.status(200).json({
      success: true,
      message: "Latest orders fetched successfully",
      orders,
      purchasedProductIds,
      totalOrders: orders.length,
    });

  } catch (error) {
    console.error("Error fetching user latest orders:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while fetching latest orders",
      error: error.message,
    });
  }
};

// Enhanced Dashboard Data with weekly analytics, vendor payments, expenses, and store performance
const getEnhancedDashboardData = async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Weekly Sales Data
    const weeklySales = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$total" },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: "$total" }
        }
      }
    ]);

    // 2. Last Week Sales (for comparison)
    const lastWeekSales = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfLastWeek, $lt: startOfWeek }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$total" },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // 3. Daily Sales for the week (for chart)
    const dailySales = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          sales: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 4. Vendor Payment Outstanding
    const vendorPayments = await purchaseModel.aggregate([
      {
        $match: {
          paymentStatus: { $ne: "paid" }
        }
      },
      {
        $group: {
          _id: null,
          totalOutstanding: {
            $sum: {
              $subtract: [
                "$totalAmount",
                { $ifNull: [{ $toDouble: "$paymentAmount" }, 0] }
              ]
            }
          },
          unpaidCount: { $sum: 1 }
        }
      }
    ]);

    // 5. Weekly Expenses (from purchase orders)
    const weeklyExpenses = await purchaseModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$totalAmount" },
          purchaseCount: { $sum: 1 }
        }
      }
    ]);

    // 6. Top Performing Stores (this month)
    const topStores = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: "$store",
          totalAmount: { $sum: "$total" },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: "$total" }
        }
      },
      {
        $lookup: {
          from: "auths",
          localField: "_id",
          foreignField: "_id",
          as: "storeDetails"
        }
      },
      { $unwind: "$storeDetails" },
      { $sort: { totalAmount: -1 } },
      { $limit: 5 },
      {
        $project: {
          storeName: "$storeDetails.storeName",
          ownerName: "$storeDetails.ownerName",
          email: "$storeDetails.email",
          totalAmount: 1,
          orderCount: 1,
          avgOrderValue: 1
        }
      }
    ]);

    // 7. Underperforming Stores (stores with declining orders OR no orders in last week)
    
    // First, get stores with declining orders
    const decliningStores = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfLastWeek }
        }
      },
      {
        $group: {
          _id: {
            store: "$store",
            week: { $cond: [{ $gte: ["$createdAt", startOfWeek] }, "current", "last"] }
          },
          totalAmount: { $sum: "$total" },
          orderCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.store",
          weeks: {
            $push: {
              week: "$_id.week",
              totalAmount: "$totalAmount",
              orderCount: "$orderCount"
            }
          }
        }
      },
      {
        $lookup: {
          from: "auths",
          localField: "_id",
          foreignField: "_id",
          as: "storeDetails"
        }
      },
      { $unwind: "$storeDetails" },
      {
        $project: {
          storeName: "$storeDetails.storeName",
          ownerName: "$storeDetails.ownerName",
          email: "$storeDetails.email",
          currentWeek: {
            $arrayElemAt: [
              { $filter: { input: "$weeks", as: "w", cond: { $eq: ["$$w.week", "current"] } } },
              0
            ]
          },
          lastWeek: {
            $arrayElemAt: [
              { $filter: { input: "$weeks", as: "w", cond: { $eq: ["$$w.week", "last"] } } },
              0
            ]
          }
        }
      },
      {
        $match: {
          "lastWeek.orderCount": { $gt: 0 },
          $expr: {
            $lt: [
              { $ifNull: ["$currentWeek.orderCount", 0] },
              "$lastWeek.orderCount"
            ]
          }
        }
      },
      {
        $addFields: {
          decline: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ["$lastWeek.orderCount", { $ifNull: ["$currentWeek.orderCount", 0] }] },
                  "$lastWeek.orderCount"
                ]
              },
              100
            ]
          },
          noOrdersLastWeek: false
        }
      },
      { $sort: { decline: -1 } },
      { $limit: 5 }
    ]);

    // Get all stores that had orders in last week
    const storesWithOrdersLastWeek = await orderModel.distinct("store", {
      createdAt: { $gte: startOfLastWeek }
    });

    // Get all active stores that had NO orders in last week
    const storesWithNoOrders = await authModel.aggregate([
      {
        $match: {
          role: "store",
          _id: { $nin: storesWithOrdersLastWeek }
        }
      },
      {
        $project: {
          storeName: 1,
          ownerName: 1,
          email: 1
        }
      },
      { $limit: 10 }
    ]);

    // Format stores with no orders
    const noOrderStores = storesWithNoOrders.map(store => ({
      _id: store._id,
      storeName: store.storeName,
      ownerName: store.ownerName,
      email: store.email,
      currentWeek: { orderCount: 0, totalAmount: 0 },
      lastWeek: { orderCount: 0, totalAmount: 0 },
      decline: 100,
      noOrdersLastWeek: true
    }));

    // Combine both lists - no order stores first, then declining stores
    const underperformingStores = [...noOrderStores, ...decliningStores].slice(0, 10);

    // 8. Order Status Distribution
    const orderStatusDist = await orderModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: "$total" }
        }
      }
    ]);

    // 9. Monthly Revenue Trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenue = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // 10. Low Stock Products
    const lowStockProducts = await Product.find({
      quantity: { $lte: 10, $gt: 0 }
    }).select('name quantity unit').limit(10).sort({ quantity: 1 });

    // 11. Out of Stock Products
    const outOfStockProducts = await Product.find({
      quantity: { $lte: 0 }
    }).select('name quantity unit').limit(10);

    // Calculate percentage changes
    const currentWeekSales = weeklySales[0]?.totalSales || 0;
    const lastWeekSalesTotal = lastWeekSales[0]?.totalSales || 0;
    const salesChange = lastWeekSalesTotal > 0 
      ? ((currentWeekSales - lastWeekSalesTotal) / lastWeekSalesTotal * 100).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      message: "Enhanced dashboard data fetched successfully",
      data: {
        // Weekly KPIs
        weeklySales: {
          total: currentWeekSales,
          orderCount: weeklySales[0]?.orderCount || 0,
          avgOrderValue: weeklySales[0]?.avgOrderValue || 0,
          changePercent: parseFloat(salesChange)
        },
        // Vendor Payments
        vendorPayments: {
          outstanding: vendorPayments[0]?.totalOutstanding || 0,
          unpaidCount: vendorPayments[0]?.unpaidCount || 0
        },
        // Weekly Expenses
        weeklyExpenses: {
          total: weeklyExpenses[0]?.totalExpenses || 0,
          purchaseCount: weeklyExpenses[0]?.purchaseCount || 0
        },
        // Charts Data
        dailySales: dailySales.map(d => ({
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d._id - 1],
          sales: d.sales,
          orders: d.orders
        })),
        monthlyRevenue: monthlyRevenue.map(m => ({
          month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
          revenue: m.revenue,
          orders: m.orders
        })),
        // Store Performance
        topStores,
        underperformingStores,
        // Order Analytics
        orderStatusDistribution: orderStatusDist,
        // Inventory Alerts
        lowStockProducts,
        outOfStockProducts
      }
    });
  } catch (error) {
    console.error("Error fetching enhanced dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching enhanced dashboard data",
      error: error.message
    });
  }
};

// Get Order Matrix Data - Store wise product orders with previous purchase history
const getOrderMatrixDataCtrl = async (req, res) => {
  try {
    const { weekOffset = 0, page = 1, limit = 25, search = "", statusFilter = "all" } = req.query;
    const offset = parseInt(weekOffset) || 0;
    const currentPage = parseInt(page) || 1;
    const pageLimit = Math.min(parseInt(limit) || 25, 100); // Max 100 products per page

    // Calculate week range for the TARGET week (based on offset)
    const now = new Date();
    const day = now.getUTCDay();
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((day + 6) % 7) + (offset * 7), 0, 0, 0, 0));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6, 23, 59, 59, 999));

    // Previous week for comparison (relative to TARGET week)
    const prevMonday = new Date(monday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevSunday = new Date(sunday);
    prevSunday.setDate(prevSunday.getDate() - 7);

    // console.log(`Matrix fetch - Week offset: ${offset}, Target: ${monday.toISOString()} to ${sunday.toISOString()}`);

    // Build product query with search (needed for parallel execution)
    const productQuery = {};
    if (search) {
      productQuery.name = { $regex: search, $options: "i" };
    }

    // For "short" or "ok" filter, we need ALL products first to calculate stock, then filter and paginate
    // For "all" filter, we can use normal pagination
    const needsFullProductList = statusFilter === "short" || statusFilter === "ok";

    // ✅ OPTIMIZED: Run all independent queries in parallel using Promise.all
    const [
      currentWeekOrders,
      previousWeekOrders,
      preOrders,
      incomingStockData,
      allProducts,
      stores
    ] = await Promise.all([
      // Get all orders for TARGET week (only Regular orders)
      orderModel.find({
        createdAt: { $gte: monday, $lte: sunday },
        isDelete: { $ne: true },
        orderType: "Regural"
      }).populate("store", "storeName ownerName city state").lean(),

      // Get all orders for PREVIOUS week (relative to target) (only Regular orders)
      orderModel.find({
        createdAt: { $gte: prevMonday, $lte: prevSunday },
        isDelete: { $ne: true },
        orderType: "Regural"
      }).lean(),

      // Get PreOrders for the TARGET week
      PreOrderModel.find({
        $or: [
          { expectedDeliveryDate: { $gte: monday, $lte: sunday } },
          { createdAt: { $gte: monday, $lte: sunday }, expectedDeliveryDate: { $exists: false } },
          { createdAt: { $gte: monday, $lte: sunday }, expectedDeliveryDate: null }
        ],
        confirmed: { $ne: true },
        isDelete: { $ne: true },
        status: "pending"
      }).populate("store", "storeName ownerName city state").lean(),

      // Get Incoming Stock for TARGET week
      IncomingStock.find({
        weekStart: monday,
        weekEnd: sunday,
        status: { $in: ["draft", "linked"] }
      }).populate("vendor", "name").lean(),

      // For short/ok filter: Get ALL products first, then filter and paginate
      // For all filter: Get paginated products directly
      needsFullProductList 
        ? Product.find(productQuery).sort({ name: 1 }).lean()
        : Product.find(productQuery).sort({ name: 1 }).skip((currentPage - 1) * pageLimit).limit(pageLimit).lean(),

      // Get all stores
      authModel.find({ role: "store" }).select("storeName ownerName city state approvalStatus priceCategory").lean()
    ]);

    // Get total count for pagination (only needed for "all" filter)
    let totalProducts = needsFullProductList ? allProducts.length : await Product.countDocuments(productQuery);
    
    // For "all" filter, use the fetched products directly
    let products = allProducts;
    
    // console.log(`Matrix - Found ${preOrders.length} PreOrders for target week`);
    // console.log(`Matrix - Found ${incomingStockData.length} Incoming Stock entries for target week`);

    const totalPages = Math.ceil(totalProducts / pageLimit);

    // Group incoming stock by product
    // Only count "draft" items for incoming display (linked items are already in purchase orders)
    const incomingByProduct = {};

    incomingStockData.forEach(item => {
      const productId = item.product?.toString();
      if (!productId) return;

      if (!incomingByProduct[productId]) {
        incomingByProduct[productId] = {
          totalIncoming: 0,
          items: [],
          allLinked: true
        };
      }

      // Only add draft items to the incoming total (linked items are already processed)
      if (item.status === "draft") {
        incomingByProduct[productId].totalIncoming += item.quantity || 0;
        incomingByProduct[productId].allLinked = false;
      }
      
      // Still track all items for reference
      incomingByProduct[productId].items.push({
        _id: item._id,
        quantity: item.quantity,
        vendor: item.vendor,
        unitPrice: item.unitPrice,
        status: item.status,
        isLinked: item.status === "linked" || item.status === "received"
      });
    });

    // Build matrix data
    const matrixData = {};

    // Initialize matrix with paginated products
    products.forEach(product => {
      const productId = product._id.toString();
      const incomingData = incomingByProduct[productId] || { totalIncoming: 0, items: [], allLinked: true };
      
      matrixData[productId] = {
        productId: productId,
        productName: product.name,
        image: product.image,
        pricePerBox: product.pricePerBox || 0,
        aPrice: product.aPrice || 0,
        bPrice: product.bPrice || 0,
        cPrice: product.cPrice || 0,
        restaurantPrice: product.restaurantPrice || 0,
        storeOrders: {},
        preOrderTotal: 0,
        orderTotal: 0,
        pendingReqTotal: 0,
        totalStock: product.remaining || 0,  // Use live Product.remaining
        totalPurchase: 0,
        // NEW: Incoming stock fields
        incomingStock: incomingData.totalIncoming,
        incomingItems: incomingData.items,
        incomingAllLinked: incomingData.allLinked,
        // Final will be calculated after all data is filled
        finalStock: 0,
        isShort: false
      };
    });

    // Fill TARGET week orders - Track the latest order for each store-product combination
    const storeProductOrderMap = {}; // Track which order has each product for each store
    
    currentWeekOrders.forEach(order => {
      const storeId = order.store?._id?.toString() || order.store?.toString();
      if (!storeId) return;

      order.items.forEach((item, itemIndex) => {
        const productId = item.productId?.toString();
        if (!productId || !matrixData[productId]) return;

        if (!matrixData[productId].storeOrders[storeId]) {
          matrixData[productId].storeOrders[storeId] = {
            currentQty: 0,
            previousQty: 0,
            preOrderQty: 0,
            pendingReq: 0,
            preOrderId: null,
            orderId: null,
            itemIndex: -1,
            pricingType: item.pricingType || "box",
            isPreOrderFulfilled: false
          };
        }

        // Sum quantities from all orders for this store-product (in case of multiple orders)
        matrixData[productId].storeOrders[storeId].currentQty += item.quantity || 0;
        
        // Track the latest order (by createdAt) for this store-product
        const key = `${storeId}-${productId}`;
        const orderDate = new Date(order.createdAt);
        if (!storeProductOrderMap[key] || orderDate > storeProductOrderMap[key].date) {
          storeProductOrderMap[key] = { date: orderDate, orderId: order._id.toString(), itemIndex };
          matrixData[productId].storeOrders[storeId].orderId = order._id.toString();
          matrixData[productId].storeOrders[storeId].itemIndex = itemIndex;
        }
        
        matrixData[productId].orderTotal += item.quantity || 0;
      });
    });

    // Fill PREVIOUS week orders for comparison
    previousWeekOrders.forEach(order => {
      const storeId = order.store?.toString();
      if (!storeId) return;

      order.items.forEach(item => {
        const productId = item.productId?.toString();
        if (!productId || !matrixData[productId]) return;

        if (!matrixData[productId].storeOrders[storeId]) {
          matrixData[productId].storeOrders[storeId] = {
            currentQty: 0,
            previousQty: 0,
            preOrderQty: 0,
            pendingReq: 0,
            preOrderId: null,
            orderId: null,
            itemIndex: -1,
            pricingType: item.pricingType || "box",
            isPreOrderFulfilled: false
          };
        }

        matrixData[productId].storeOrders[storeId].previousQty += item.quantity || 0;
      });
    });

    // Fill PreOrder data and calculate pending requirements
    preOrders.forEach(preOrder => {
      const storeId = preOrder.store?._id?.toString() || preOrder.store?.toString();
      if (!storeId) return;

      preOrder.items.forEach(item => {
        const productId = item.productId?.toString();
        if (!productId || !matrixData[productId]) return;

        if (!matrixData[productId].storeOrders[storeId]) {
          matrixData[productId].storeOrders[storeId] = {
            currentQty: 0,
            previousQty: 0,
            preOrderQty: 0,
            pendingReq: 0,
            preOrderId: null,
            orderId: null,
            itemIndex: -1,
            pricingType: item.pricingType || "box",
            isPreOrderFulfilled: false
          };
        }

        const preOrderQty = item.quantity || 0;
        const currentQty = matrixData[productId].storeOrders[storeId].currentQty || 0;
        // REQ = PreOrder quantity (not minus current order)
        const pendingReq = preOrderQty;

        matrixData[productId].storeOrders[storeId].preOrderQty += preOrderQty;
        matrixData[productId].storeOrders[storeId].pendingReq = pendingReq;
        matrixData[productId].storeOrders[storeId].preOrderId = preOrder._id.toString();
        matrixData[productId].storeOrders[storeId].isPreOrderFulfilled = currentQty >= preOrderQty;

        matrixData[productId].preOrderTotal += preOrderQty;
        matrixData[productId].pendingReqTotal += pendingReq;
      });
    });

    // Calculate stock for each product using BASE_STOCK_DATE (01-01-2026 to now)
    // Stock is ALWAYS calculated from BASE_STOCK_DATE - not weekly

    // Track shortage summary
    let totalShortProducts = 0;
    let totalShortQuantity = 0;

    for (const productId in matrixData) {
      const product = products.find(p => p._id.toString() === productId);
      if (!product) continue;

      // ✅ Use same calculateActualStock function for consistent calculation
      const actualStock = calculateActualStock(product);
      const currentStock = actualStock.totalRemaining;
      
      // Get incoming stock for this product
      const incomingStock = matrixData[productId].incomingStock || 0;
      
      // Get total preorder demand (PreOrders are NOT yet converted to orders, so subtract them)
      const preOrderTotal = matrixData[productId].preOrderTotal || 0;

      // Calculate FINAL: Stock + Incoming - PreOrders
      // NOTE: Orders are already subtracted in calculateActualStock (salesHistory), so don't subtract again
      const finalStock = currentStock + incomingStock - preOrderTotal;
      const isShort = finalStock < 0;

      matrixData[productId].totalStock = currentStock;
      matrixData[productId].totalPurchase = actualStock.totalRemaining + actualStock.trashBox; // Approximate
      matrixData[productId].finalStock = finalStock;
      matrixData[productId].isShort = isShort;
      matrixData[productId].shortageQty = isShort ? Math.abs(finalStock) : 0;
      matrixData[productId].stockCalculationBase = BASE_STOCK_DATE.toISOString().split('T')[0];

      if (isShort) {
        totalShortProducts++;
        totalShortQuantity += Math.abs(finalStock);
      }
      
      // // Debug log for stock calculation
      // if (currentStock > 0 || incomingStock > 0 || preOrderTotal > 0) {
      //   console.log(`Stock calc for ${product.name}: Current=${currentStock}, Incoming=${incomingStock}, PreOrder=${preOrderTotal}, Final=${finalStock}, Short=${isShort}`);
      // }
    }

    // Convert to array format
    let matrixArray = Object.values(matrixData);

    // Apply status filter (SHORT or OK) BEFORE pagination
    if (statusFilter === "short") {
      matrixArray = matrixArray.filter(row => row.isShort === true);
    } else if (statusFilter === "ok") {
      matrixArray = matrixArray.filter(row => row.isShort === false);
    }

    // For short/ok filter: Update totalProducts and apply pagination AFTER filtering
    let finalTotalProducts = matrixArray.length;
    let finalTotalPages = Math.ceil(finalTotalProducts / pageLimit);
    
    // Apply pagination to filtered results (for short/ok filter)
    if (needsFullProductList) {
      const skip = (currentPage - 1) * pageLimit;
      matrixArray = matrixArray.slice(skip, skip + pageLimit);
    }

    // Calculate hasUnlinkedIncoming ONLY for products in current page
    let hasUnlinkedIncoming = false;
    const unlinkedIncomingItems = [];
    
    matrixArray.forEach(row => {
      // Only check products that have incoming stock > 0 and are not all linked
      if (row.incomingStock > 0 && row.incomingAllLinked === false) {
        hasUnlinkedIncoming = true;
        // Get draft items from incomingItems
        const draftItems = (row.incomingItems || []).filter(i => i.status === "draft");
        draftItems.forEach(item => {
          unlinkedIncomingItems.push({
            _id: item._id,
            productId: row.productId,
            productName: row.productName,
            quantity: item.quantity
          });
        });
      }
    });

    // Check if confirm is allowed
    const canConfirm = !hasUnlinkedIncoming;
    const confirmBlockReason = hasUnlinkedIncoming 
      ? `${unlinkedIncomingItems.length} incoming stock item(s) not linked to vendor` 
      : null;
    
    res.status(200).json({
      success: true,
      message: "Order matrix data fetched successfully",
      data: {
        matrix: matrixArray,
        stores: stores,
        weekRange: {
          start: monday.toISOString(),
          end: sunday.toISOString(),
          label: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        },
        previousWeekRange: {
          start: prevMonday.toISOString(),
          end: prevSunday.toISOString()
        },
        preOrdersCount: preOrders.length,
        weekOffset: offset,
        pagination: {
          currentPage,
          totalPages: needsFullProductList ? finalTotalPages : Math.ceil(totalProducts / pageLimit),
          totalProducts: needsFullProductList ? finalTotalProducts : totalProducts,
          limit: pageLimit,
          hasNextPage: currentPage < (needsFullProductList ? finalTotalPages : Math.ceil(totalProducts / pageLimit)),
          hasPrevPage: currentPage > 1
        },
        // NEW: Incoming stock & confirm validation
        incomingStockCount: incomingStockData.length,
        hasUnlinkedIncoming: hasUnlinkedIncoming,
        unlinkedIncomingCount: unlinkedIncomingItems.length,
        unlinkedIncomingItems: unlinkedIncomingItems,
        canConfirm: canConfirm,
        confirmBlockReason: confirmBlockReason,
        // Shortage summary
        shortageInfo: {
          hasShortage: totalShortProducts > 0,
          shortProductCount: totalShortProducts,
          totalShortQuantity: totalShortQuantity
        }
      }
    });

  } catch (error) {
    console.error("Error fetching order matrix data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order matrix data",
      error: error.message
    });
  }
};

// Helper function for stock calculation (same as in getAllProductSummary)
const BASE_STOCK_DATE_EXPORT = new Date("2026-01-05T00:00:00.000Z");

const calculateActualStockForExport = (product) => {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilSunday,
      23, 59, 59, 999
    )
  );

  const stockPurchase = filterByDate(
    product?.purchaseHistory || [],
    BASE_STOCK_DATE_EXPORT,
    sunday
  );

  const stockSell = filterByDate(
    product?.salesHistory || [],
    BASE_STOCK_DATE_EXPORT,
    sunday
  );

  const stockTrash = filterByDate(
    product?.quantityTrash || [],
    BASE_STOCK_DATE_EXPORT,
    sunday
  );

  const trashBox = stockTrash
    .filter(t => t.type?.toLowerCase() === "box")
    .reduce((sum, t) => sum + Number(t.quantity || 0), 0);

  const stockPurchaseTotal = sumBy(stockPurchase, "quantity");
  const stockSellTotal = sumBy(stockSell, "quantity");

  const carryForwardBox = Number(product?.carryForwardBox || 0);
  const manualBox = Number(product?.manuallyAddBox?.quantity || 0);

  const totalRemaining =
    carryForwardBox +
    stockPurchaseTotal -
    stockSellTotal -
    trashBox +
    manualBox;

  return totalRemaining; // Allow negative values for accurate export
};

// Export Order Matrix Data - All products without pagination for CSV download
const exportOrderMatrixDataCtrl = async (req, res) => {
  try {
    const { weekOffset = 0 } = req.query;
    const offset = parseInt(weekOffset) || 0;

    // Calculate week range for the TARGET week (based on offset)
    const now = new Date();
    const day = now.getUTCDay();
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((day + 6) % 7) + (offset * 7), 0, 0, 0, 0));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6, 23, 59, 59, 999));

    // Previous week for comparison
    const prevMonday = new Date(monday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevSunday = new Date(sunday);
    prevSunday.setDate(prevSunday.getDate() - 7);

    // Run all queries in parallel
    const [
      currentWeekOrders,
      previousWeekOrders,
      preOrders,
      incomingStockData,
      products,
      stores
    ] = await Promise.all([
      orderModel.find({
        createdAt: { $gte: monday, $lte: sunday },
        isDelete: { $ne: true },
        orderType: "Regural"
      }).lean(),
      orderModel.find({
        createdAt: { $gte: prevMonday, $lte: prevSunday },
        isDelete: { $ne: true },
        orderType: "Regural"
      }).lean(),
      PreOrderModel.find({
        $or: [
          { expectedDeliveryDate: { $gte: monday, $lte: sunday } },
          { createdAt: { $gte: monday, $lte: sunday }, expectedDeliveryDate: { $exists: false } },
          { createdAt: { $gte: monday, $lte: sunday }, expectedDeliveryDate: null }
        ],
        confirmed: { $ne: true },
        isDelete: { $ne: true },
        status: "pending"
      }).lean(),
      IncomingStock.find({
        weekStart: monday,
        weekEnd: sunday,
        status: { $in: ["draft", "linked"] }
      }).lean(),
      Product.find({}).sort({ name: 1 }).lean(),
      authModel.find({ role: "store" }).select("storeName ownerName city state").lean()
    ]);

    // Group incoming stock by product
    const incomingByProduct = {};
    incomingStockData.forEach(item => {
      const productId = item.product?.toString();
      if (!productId) return;
      if (!incomingByProduct[productId]) {
        incomingByProduct[productId] = { totalIncoming: 0 };
      }
      incomingByProduct[productId].totalIncoming += item.quantity || 0;
    });

    // Build matrix data
    const matrixData = {};
    products.forEach(product => {
      const productId = product._id.toString();
      const incomingData = incomingByProduct[productId] || { totalIncoming: 0 };
      
      // Calculate actual stock from Jan 5th, 2026 to current week Sunday
      const currentStock = calculateActualStockForExport(product);
      
      matrixData[productId] = {
        productId,
        productName: product.name,
        storeOrders: {},
        preOrderTotal: 0,
        orderTotal: 0,
        totalStock: currentStock,
        incomingStock: incomingData.totalIncoming
      };
    });

    // Fill current week orders
    currentWeekOrders.forEach(order => {
      const storeId = order.store?.toString();
      if (!storeId) return;
      order.items.forEach(item => {
        const productId = item.productId?.toString();
        if (!productId || !matrixData[productId]) return;
        if (!matrixData[productId].storeOrders[storeId]) {
          matrixData[productId].storeOrders[storeId] = { currentQty: 0, previousQty: 0, preOrderQty: 0 };
        }
        matrixData[productId].storeOrders[storeId].currentQty += item.quantity || 0;
        matrixData[productId].orderTotal += item.quantity || 0;
      });
    });

    // Fill previous week orders
    previousWeekOrders.forEach(order => {
      const storeId = order.store?.toString();
      if (!storeId) return;
      order.items.forEach(item => {
        const productId = item.productId?.toString();
        if (!productId || !matrixData[productId]) return;
        if (!matrixData[productId].storeOrders[storeId]) {
          matrixData[productId].storeOrders[storeId] = { currentQty: 0, previousQty: 0, preOrderQty: 0 };
        }
        matrixData[productId].storeOrders[storeId].previousQty += item.quantity || 0;
      });
    });

    // Fill preorders
    preOrders.forEach(preOrder => {
      const storeId = preOrder.store?.toString();
      if (!storeId) return;
      preOrder.items.forEach(item => {
        const productId = item.productId?.toString();
        if (!productId || !matrixData[productId]) return;
        if (!matrixData[productId].storeOrders[storeId]) {
          matrixData[productId].storeOrders[storeId] = { currentQty: 0, previousQty: 0, preOrderQty: 0 };
        }
        matrixData[productId].storeOrders[storeId].preOrderQty += item.quantity || 0;
        matrixData[productId].preOrderTotal += item.quantity || 0;
      });
    });

    // Calculate final stock for each product
    for (const productId in matrixData) {
      const row = matrixData[productId];
      row.finalStock = (row.totalStock || 0) + (row.incomingStock || 0) - (row.preOrderTotal || 0);
      row.isShort = row.finalStock < 0;
    }

    const matrixArray = Object.values(matrixData);

    res.status(200).json({
      success: true,
      message: "Order matrix export data fetched successfully",
      data: {
        matrix: matrixArray,
        stores: stores,
        weekRange: {
          start: monday.toISOString(),
          end: sunday.toISOString(),
          label: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        },
        totalProducts: matrixArray.length
      }
    });

  } catch (error) {
    console.error("Error exporting order matrix data:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting order matrix data",
      error: error.message
    });
  }
};

// Update or Create Order Item in Matrix - Smart PreOrder Integration
const updateOrderMatrixItemCtrl = async (req, res) => {
  try {
    const { productId, storeId, quantity, weekOffset = 0 } = req.body;

    if (!productId || !storeId || quantity == null) {
      return res.status(400).json({ success: false, message: "productId, storeId, and quantity are required" });
    }

    const requestedQty = Math.max(0, parseInt(quantity) || 0);
    const offset = parseInt(weekOffset) || 0;

    // Calculate week range
    const now = new Date();
    const day = now.getUTCDay();
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((day + 6) % 7) + (offset * 7), 0, 0, 0, 0));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6, 23, 59, 59, 999));

    console.log(`Order Matrix Update - Week offset: ${offset}, Target: ${monday.toISOString()} to ${sunday.toISOString()}`);

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const store = await authModel.findById(storeId);
    if (!store) return res.status(404).json({ success: false, message: "Store not found" });

    // STEP 1: Check for existing PreOrder for this store with this product for the TARGET week
    const existingPreOrder = await PreOrderModel.findOne({
      store: storeId,
      $or: [
        { expectedDeliveryDate: { $gte: monday, $lte: sunday } },
        { 
          createdAt: { $gte: monday, $lte: sunday },
          expectedDeliveryDate: { $exists: false }
        },
        { 
          createdAt: { $gte: monday, $lte: sunday },
          expectedDeliveryDate: null
        }
      ],
      confirmed: { $ne: true },
      isDelete: { $ne: true },
      status: "pending",
      "items.productId": productId
    });

    console.log(`Found existing PreOrder for target week: ${existingPreOrder ? existingPreOrder._id : 'None'}`);

    // STEP 2: Find ALL orders for this store in the TARGET week that contain this product
    const allStoreOrders = await orderModel.find({
      store: storeId,
      createdAt: { $gte: monday, $lte: sunday },
      isDelete: { $ne: true }
    }).sort({ createdAt: -1 });

    // Calculate total current quantity across all orders for this product
    let totalCurrentQty = 0;
    let ordersWithProduct = [];
    
    for (const o of allStoreOrders) {
      const idx = o.items.findIndex(item => item.productId?.toString() === productId);
      if (idx !== -1) {
        totalCurrentQty += o.items[idx].quantity || 0;
        ordersWithProduct.push({ order: o, itemIndex: idx });
      }
    }

    // Find the primary order to update (latest one with this product, or latest order)
    let order = null;
    let existingItemIndex = -1;
    
    if (ordersWithProduct.length > 0) {
      // Use the first (latest) order that has this product
      order = ordersWithProduct[0].order;
      existingItemIndex = ordersWithProduct[0].itemIndex;
    } else if (allStoreOrders.length > 0) {
      // No order has this product, use the latest order
      order = allStoreOrders[0];
    }

    console.log(`Found ${ordersWithProduct.length} orders with product, totalCurrentQty: ${totalCurrentQty}, primary order: ${order ? order._id : 'None'}, existingItemIndex: ${existingItemIndex}`);

    // If quantity is 0, remove the item from order
    if (requestedQty === 0) {
      if (order) {
        const itemIndex = order.items.findIndex(item => item.productId?.toString() === productId);
        if (itemIndex !== -1) {
          const removedItem = order.items[itemIndex];
          order.items.splice(itemIndex, 1);
          order.total = Math.max(0, order.total - ((removedItem.unitPrice || 0) * (removedItem.quantity || 0)));
          order.markModified("items");
          await order.save();

          // Rebuild product history
          await resetAndRebuildHistoryForSingleProduct(productId);
        }
      }
      return res.status(200).json({
        success: true,
        message: "Item removed from order",
        order,
        preOrderHandled: false
      });
    }

    // Create new item object with proper price calculation
    const calculatedPrice = getProductPriceForStore(product, store.priceCategory, "box");
    console.log(`Calculated price for ${product.name}: ${calculatedPrice} (priceCategory: ${store.priceCategory}, pricePerBox: ${product.pricePerBox}, aPrice: ${product.aPrice})`);
    
    const newItem = {
      productId: product._id.toString(),
      productName: product.name,
      quantity: requestedQty,
      unitPrice: calculatedPrice,
      shippinCost: product.shippinCost || 0,
      pricingType: "box",
    };

    let preOrderHandled = false;
    let preOrderId = null;

    // STEP 3: Handle PreOrder if exists
    if (existingPreOrder) {
      const preOrderItem = existingPreOrder.items.find(item => item.productId?.toString() === productId);
      
      if (preOrderItem) {
        // Update PreOrder item quantity to match
        preOrderItem.quantity = requestedQty;
        existingPreOrder.markModified("items");
        
        // Recalculate PreOrder total
        existingPreOrder.total = existingPreOrder.items.reduce((sum, item) => {
          return sum + ((item.unitPrice || 0) * (item.quantity || 0));
        }, 0);
        
        // Check if all items in PreOrder are now in Order
        // If this is the only item or all items are processed, mark as confirmed
        const allItemsProcessed = existingPreOrder.items.every(item => {
          if (item.productId?.toString() === productId) return true;
          // Check if this item exists in the order
          if (order) {
            return order.items.some(orderItem => orderItem.productId?.toString() === item.productId?.toString());
          }
          return false;
        });

        if (allItemsProcessed) {
          existingPreOrder.confirmed = true;
          existingPreOrder.status = "completed";
        }
        
        await existingPreOrder.save();
        preOrderHandled = true;
        preOrderId = existingPreOrder._id;
      }
    }

    // STEP 4: Create or Update Order
    if (!order) {
      // Create new order linked to PreOrder if exists
      const newOrder = new orderModel({
        orderNumber: await getNextOrderNumber(),
        items: [newItem],
        store: storeId,
        status: "Processing",
        preOrder: preOrderId, // Link to PreOrder
        shippingAddress: {
          name: store.storeName || store.name || "",
          phone: store.phone || "",
          address: store.address || "",
          city: store.city || "",
          country: "USA",
        },
        billingAddress: {
          name: store.storeName || store.name || "",
          phone: store.phone || "",
          address: store.address || "",
          city: store.city || "",
          country: "USA",
        },
        total: (newItem.unitPrice * requestedQty),
        orderType: "Regural",
        shippinCost: store.shippingCost || 0,
      });

      await newOrder.save();

      // Rebuild product history from all orders (consistent stock management)
      await resetAndRebuildHistoryForSingleProduct(productId);

      // Update PreOrder with orderId reference
      if (existingPreOrder && preOrderHandled) {
        existingPreOrder.orderId = newOrder._id;
        await existingPreOrder.save();
      }

      return res.status(201).json({
        success: true,
        message: preOrderHandled ? "PreOrder converted to Order" : "New order created",
        order: newOrder,
        preOrderHandled,
        preOrderId
      });
    }

    // Order exists - use the existingItemIndex we already found
    if (existingItemIndex !== -1) {
      // CURRENT WEEK: REPLACE quantity (not add)
      // IMPORTANT: Keep existing unitPrice, only update quantity
      const existingItem = order.items[existingItemIndex];
      const oldQty = existingItem.quantity || 0;
      const existingUnitPrice = existingItem.unitPrice || 0;

      // Update only the quantity (REPLACE), keep the existing price
      order.items[existingItemIndex].quantity = requestedQty;
      // DO NOT change unitPrice - use existing price from order
      
      console.log(`Updated quantity: ${oldQty} -> ${requestedQty}, unitPrice: ${existingUnitPrice}`);
      
      // RECALCULATE subtotal from all items using their existing prices
      const subtotal = order.items.reduce((sum, item) => {
        return sum + ((item.unitPrice || 0) * (item.quantity || 0));
      }, 0);
      
      // Add shipping cost separately
      const shippingCost = order.shippinCost || 0;
      order.total = subtotal + shippingCost;
      
      console.log(`Recalculated - Subtotal: ${subtotal}, Shipping: ${shippingCost}, Total: ${order.total}`);
      
      // Link to PreOrder if not already linked
      if (preOrderId && !order.preOrder) {
        order.preOrder = preOrderId;
      }
      
      order.markModified("items");
      await order.save();

      // Rebuild product history
      await resetAndRebuildHistoryForSingleProduct(productId);

      // Update PreOrder with orderId reference
      if (existingPreOrder && preOrderHandled && !existingPreOrder.orderId) {
        existingPreOrder.orderId = order._id;
        await existingPreOrder.save();
      }

      return res.status(200).json({
        success: true,
        message: preOrderHandled ? "PreOrder quantity updated in Order" : "Order item quantity updated",
        order,
        updatedItem: order.items[existingItemIndex],
        preOrderHandled,
        preOrderId
      });
    } else {
      // Add new item to existing order
      order.items.push(newItem);
      
      // RECALCULATE subtotal from all items
      const subtotal = order.items.reduce((sum, item) => {
        return sum + ((item.unitPrice || 0) * (item.quantity || 0));
      }, 0);
      
      // Add shipping cost separately
      const shippingCost = order.shippinCost || 0;
      order.total = subtotal + shippingCost;
      
      console.log(`Added new item - Subtotal: ${subtotal}, Shipping: ${shippingCost}, Total: ${order.total}`);
      
      // Link to PreOrder if not already linked
      if (preOrderId && !order.preOrder) {
        order.preOrder = preOrderId;
      }
      
      order.markModified("items");
      await order.save();

      // Rebuild product history from all orders (consistent stock management)
      await resetAndRebuildHistoryForSingleProduct(productId);

      // Update PreOrder with orderId reference
      if (existingPreOrder && preOrderHandled && !existingPreOrder.orderId) {
        existingPreOrder.orderId = order._id;
        await existingPreOrder.save();
      }

      return res.status(200).json({
        success: true,
        message: preOrderHandled ? "PreOrder item added to Order" : "New item added to existing order",
        order,
        preOrderHandled,
        preOrderId
      });
    }

  } catch (error) {
    console.error("Error updating order matrix item:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order matrix item",
      error: error.message
    });
  }
};

// Get next PreOrder number
const getNextPreOrderNumber = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: "preorder" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const paddedSeq = String(counter.seq).padStart(5, "0");
  return `PRE-${paddedSeq}`;
};

// Create or Update PreOrder from Matrix (PREORDER Mode)
const updatePreOrderMatrixItemCtrl = async (req, res) => {
  try {
    const { productId, storeId, quantity, weekOffset = 0 } = req.body;

    if (!productId || !storeId || quantity == null) {
      return res.status(400).json({ success: false, message: "productId, storeId, and quantity are required" });
    }

    const requestedQty = Math.max(0, parseInt(quantity) || 0);
    const offset = parseInt(weekOffset) || 0;

    // Calculate week range for the target week
    const now = new Date();
    const day = now.getUTCDay();
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((day + 6) % 7) + (offset * 7), 0, 0, 0, 0));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6, 23, 59, 59, 999));

    console.log(`PreOrder Matrix Update - Week offset: ${offset}, Target: ${monday.toISOString()} to ${sunday.toISOString()}`);

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const store = await authModel.findById(storeId);
    if (!store) return res.status(404).json({ success: false, message: "Store not found" });

    // Ensure store has a priceCategory, default to 'aPrice' if not set
    const storePriceCategory = store.priceCategory || 'aPrice';
    console.log(`Store ${store.storeName} - priceCategory: ${storePriceCategory}`);

    // Find existing PreOrder for this store for the target week
    // Check by expectedDeliveryDate first, then by createdAt
    let preOrder = await PreOrderModel.findOne({
      store: storeId,
      $or: [
        { expectedDeliveryDate: { $gte: monday, $lte: sunday } },
        { 
          createdAt: { $gte: monday, $lte: sunday },
          expectedDeliveryDate: { $exists: false }
        },
        { 
          createdAt: { $gte: monday, $lte: sunday },
          expectedDeliveryDate: null
        }
      ],
      isDelete: { $ne: true },
      confirmed: { $ne: true }
    }).sort({ createdAt: -1 });

    console.log(`Found existing PreOrder: ${preOrder ? preOrder._id : 'None'}`);

    // Create new item object with proper price calculation
    const calculatedPreOrderPrice = getProductPriceForStore(product, storePriceCategory, "box");
    console.log(`PreOrder - Product: ${product.name}, Store: ${store.storeName}, PriceCategory: ${storePriceCategory}`);
    console.log(`PreOrder - Calculated price: ${calculatedPreOrderPrice}, aPrice: ${product.aPrice}, bPrice: ${product.bPrice}, cPrice: ${product.cPrice}, pricePerBox: ${product.pricePerBox}`);
    
    const newItem = {
      productId: product._id.toString(),
      productName: product.name,
      quantity: requestedQty,
      unitPrice: calculatedPreOrderPrice,
      shippinCost: product.shippinCost || 0,
      pricingType: "box",
    };

    // If quantity is 0, remove the item from preorder
    if (requestedQty === 0) {
      if (preOrder) {
        const itemIndex = preOrder.items.findIndex(item => item.productId?.toString() === productId);
        if (itemIndex !== -1) {
          const removedItem = preOrder.items[itemIndex];
          preOrder.items.splice(itemIndex, 1);
          preOrder.total = Math.max(0, preOrder.total - ((removedItem.unitPrice || 0) * (removedItem.quantity || 0)));
          preOrder.markModified("items");
          
          // If no items left, mark as deleted
          if (preOrder.items.length === 0) {
            preOrder.isDelete = true;
          }
          
          await preOrder.save();
        }
      }
      return res.status(200).json({
        success: true,
        message: "Item removed from PreOrder",
        preOrder,
        mode: "preorder"
      });
    }

    // Create new PreOrder if doesn't exist
    if (!preOrder) {
      const calculatedTotal = newItem.unitPrice * requestedQty;
      console.log(`Creating new PreOrder - unitPrice: ${newItem.unitPrice}, quantity: ${requestedQty}, total: ${calculatedTotal}`);
      
      const newPreOrder = new PreOrderModel({
        preOrderNumber: await getNextPreOrderNumber(),
        items: [newItem],
        store: storeId,
        status: "pending",
        orderType: "PreOrder",
        shippingAddress: {
          name: store.storeName || store.name || "",
          phone: store.phone || "",
          address: store.address || "",
          city: store.city || "",
          country: "USA",
        },
        billingAddress: {
          name: store.storeName || store.name || "",
          phone: store.phone || "",
          address: store.address || "",
          city: store.city || "",
          country: "USA",
        },
        total: calculatedTotal,
        shippinCost: store.shippingCost || 0,
        expectedDeliveryDate: sunday, // Expected delivery by end of target week
      });

      await newPreOrder.save();
      
      console.log(`PreOrder created successfully - ID: ${newPreOrder._id}, Total: ${newPreOrder.total}`);

      return res.status(201).json({
        success: true,
        message: "New PreOrder created",
        preOrder: newPreOrder,
        mode: "preorder"
      });
    }

    // PreOrder exists - check if product already in preorder
    const existingItemIndex = preOrder.items.findIndex(item => item.productId?.toString() === productId);

    if (existingItemIndex !== -1) {
      // Update existing item quantity - KEEP existing price, only update quantity
      const existingItem = preOrder.items[existingItemIndex];
      const oldQty = existingItem.quantity || 0;
      const existingUnitPrice = existingItem.unitPrice || 0;

      // Update only quantity, keep existing price
      preOrder.items[existingItemIndex].quantity = requestedQty;
      
      // RECALCULATE total from all items using their existing prices
      preOrder.total = preOrder.items.reduce((sum, item) => {
        return sum + ((item.unitPrice || 0) * (item.quantity || 0));
      }, 0);
      
      console.log(`PreOrder updated: qty ${oldQty} -> ${requestedQty}, price: ${existingUnitPrice}, total: ${preOrder.total}`);
      
      preOrder.markModified("items");
      await preOrder.save();

      return res.status(200).json({
        success: true,
        message: "PreOrder item quantity updated",
        preOrder,
        updatedItem: preOrder.items[existingItemIndex],
        mode: "preorder"
      });
    } else {
      // Add new item to existing preorder
      const itemTotal = newItem.unitPrice * requestedQty;
      console.log(`Adding new item to existing PreOrder - unitPrice: ${newItem.unitPrice}, quantity: ${requestedQty}, itemTotal: ${itemTotal}`);
      console.log(`PreOrder before: total=${preOrder.total}, items count=${preOrder.items.length}`);
      
      preOrder.items.push(newItem);
      preOrder.total = preOrder.total + itemTotal;
      
      console.log(`PreOrder after: total=${preOrder.total}, items count=${preOrder.items.length}`);
      
      preOrder.markModified("items");
      await preOrder.save();

      return res.status(200).json({
        success: true,
        message: "New item added to existing PreOrder",
        preOrder,
        mode: "preorder"
      });
    }

  } catch (error) {
    console.error("Error updating preorder matrix item:", error);
    res.status(500).json({
      success: false,
      message: "Error updating preorder matrix item",
      error: error.message
    });
  }
};

// Confirm PreOrders for a specific week - Uses existing confirmOrderCtrl for each PreOrder
const confirmPreOrdersCtrl = async (req, res) => {
  try {
    const { weekOffset = 0, storeId, preOrderIds } = req.body;
    const offset = parseInt(weekOffset) || 0;

    // Calculate week range for the target week
    const now = new Date();
    const day = now.getUTCDay();
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((day + 6) % 7) + (offset * 7), 0, 0, 0, 0));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6, 23, 59, 59, 999));

    console.log(`Confirming PreOrders - Week offset: ${offset}, Target: ${monday.toISOString()} to ${sunday.toISOString()}`);

    // Build query for PreOrders
    let query = {
      confirmed: { $ne: true },
      isDelete: { $ne: true },
      status: "pending"
    };

    // If specific preOrderIds provided, use them
    if (preOrderIds && Array.isArray(preOrderIds) && preOrderIds.length > 0) {
      query._id = { $in: preOrderIds };
    } else {
      // Otherwise, use week-based filtering
      query.$or = [
        { expectedDeliveryDate: { $gte: monday, $lte: sunday } },
        { 
          createdAt: { $gte: monday, $lte: sunday },
          expectedDeliveryDate: { $exists: false }
        },
        { 
          createdAt: { $gte: monday, $lte: sunday },
          expectedDeliveryDate: null
        }
      ];
    }

    // If storeId provided, confirm only that store's PreOrders
    if (storeId) {
      query.store = storeId;
    }

    // Find all pending PreOrders for the target week
    const preOrders = await PreOrderModel.find(query).populate("store", "storeName ownerName");

    if (preOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending PreOrders found for this week",
        confirmedCount: 0,
        preOrders: [],
        createdOrders: []
      });
    }

    // Import confirmOrderCtrl from preOrderCtrl
    const { confirmOrderCtrl } = require("./preOrderCtrl");

    // Confirm each PreOrder using existing confirmOrderCtrl
    const confirmedPreOrders = [];
    const createdOrders = [];
    const errors = [];

    for (const preOrder of preOrders) {
      try {
        // Create fake req/res to call confirmOrderCtrl
        let responseData = null;
        let responseStatus = 200;

        const fakeReq = {
          params: { id: preOrder._id.toString() }
        };

        const fakeRes = {
          status: function(code) {
            responseStatus = code;
            return this;
          },
          json: function(data) {
            responseData = data;
            return this;
          }
        };

        await confirmOrderCtrl(fakeReq, fakeRes);

        if (responseStatus === 200 && responseData?.success) {
          confirmedPreOrders.push({
            _id: preOrder._id,
            preOrderNumber: preOrder.preOrderNumber,
            store: preOrder.store?.storeName || "Unknown",
            itemCount: preOrder.items.length,
            total: preOrder.total
          });

          if (responseData.order) {
            createdOrders.push({
              _id: responseData.order._id,
              orderNumber: responseData.order.orderNumber,
              store: preOrder.store?.storeName || "Unknown",
              total: responseData.order.total,
              palletInfo: responseData.palletInfo
            });
          }
        } else {
          errors.push({
            preOrderId: preOrder._id,
            preOrderNumber: preOrder.preOrderNumber,
            store: preOrder.store?.storeName,
            error: responseData?.message || "Failed to confirm",
            insufficientStock: responseData?.insufficientStock
          });
        }
      } catch (err) {
        console.error(`Error confirming PreOrder ${preOrder._id}:`, err);
        errors.push({
          preOrderId: preOrder._id,
          preOrderNumber: preOrder.preOrderNumber,
          store: preOrder.store?.storeName,
          error: err.message
        });
      }
    }

    console.log(`Confirmed ${confirmedPreOrders.length} PreOrders, Created ${createdOrders.length} Orders, Errors: ${errors.length}`);

    // Create Work Order for shortage tracking
    let workOrder = null;
    if (createdOrders.length > 0) {
      try {
        const { createWorkOrderCtrl } = require("./workOrderCtrl");
        
        // Create fake req/res to call createWorkOrderCtrl
        let workOrderResponse = null;
        const fakeReq = {
          body: {
            weekOffset: offset,
            confirmedPreOrderIds: confirmedPreOrders.map(p => p._id),
            confirmedOrderIds: createdOrders.map(o => o._id),
          },
          user: req.user
        };
        const fakeRes = {
          status: function(code) { return this; },
          json: function(data) { workOrderResponse = data; return this; }
        };

        await createWorkOrderCtrl(fakeReq, fakeRes);
        
        if (workOrderResponse?.success) {
          workOrder = {
            _id: workOrderResponse.data._id,
            workOrderNumber: workOrderResponse.data.workOrderNumber,
            hasShortage: workOrderResponse.data.hasShortage,
            shortProductCount: workOrderResponse.data.shortProductCount,
            totalShortageQuantity: workOrderResponse.data.totalShortageQuantity,
          };
          console.log(`Work Order created: ${workOrder.workOrderNumber}`);
        }
      } catch (woError) {
        console.error("Error creating work order:", woError);
        // Don't fail the whole operation if work order creation fails
      }
    }

    return res.status(200).json({
      success: true,
      message: `${confirmedPreOrders.length} PreOrder(s) confirmed and ${createdOrders.length} Order(s) created`,
      confirmedCount: confirmedPreOrders.length,
      preOrders: confirmedPreOrders,
      createdOrders: createdOrders,
      workOrder: workOrder,
      errors: errors.length > 0 ? errors : undefined,
      weekRange: {
        start: monday.toISOString(),
        end: sunday.toISOString()
      }
    });

  } catch (error) {
    console.error("Error confirming preorders:", error);
    res.status(500).json({
      success: false,
      message: "Error confirming preorders",
      error: error.message
    });
  }
};

// Get pending PreOrders for review before confirmation
const getPendingPreOrdersForReviewCtrl = async (req, res) => {
  try {
    const { weekOffset = 0 } = req.query;
    const offset = parseInt(weekOffset) || 0;

    // Calculate week range for the target week
    const now = new Date();
    const day = now.getUTCDay();
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((day + 6) % 7) + (offset * 7), 0, 0, 0, 0));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6, 23, 59, 59, 999));

    // Find all pending PreOrders for the target week
    // Sort by createdAt descending (latest first)
    const preOrders = await PreOrderModel.find({
      $or: [
        { expectedDeliveryDate: { $gte: monday, $lte: sunday } },
        { 
          createdAt: { $gte: monday, $lte: sunday },
          expectedDeliveryDate: { $exists: false }
        },
        { 
          createdAt: { $gte: monday, $lte: sunday },
          expectedDeliveryDate: null
        }
      ],
      confirmed: { $ne: true },
      isDelete: { $ne: true },
      status: "pending"
    })
    .populate("store", "storeName ownerName city state")
    .sort({ createdAt: -1 }); // Latest first

    // Flatten items from all PreOrders for easier review
    const flattenedItems = [];
    for (const po of preOrders) {
      for (const item of po.items) {
        flattenedItems.push({
          _id: po._id, // PreOrder ID for confirmation
          preOrderNumber: po.preOrderNumber,
          store: {
            _id: po.store?._id,
            storeName: po.store?.storeName,
            ownerName: po.store?.ownerName,
            city: po.store?.city,
            state: po.store?.state
          },
          product: {
            _id: item.productId,
            name: item.productName || item.name || "Unknown Product"
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          total: (item.unitPrice || 0) * (item.quantity || 0),
          createdAt: po.createdAt,
          expectedDeliveryDate: po.expectedDeliveryDate
        });
      }
    }

    // Also return grouped by PreOrder for summary
    const formattedPreOrders = preOrders.map(po => ({
      _id: po._id,
      preOrderNumber: po.preOrderNumber,
      store: {
        _id: po.store?._id,
        name: po.store?.storeName,
        owner: po.store?.ownerName,
        city: po.store?.city,
        state: po.store?.state
      },
      items: po.items.map(item => ({
        productId: item.productId,
        productName: item.productName || item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: (item.unitPrice || 0) * (item.quantity || 0)
      })),
      itemCount: po.items.length,
      total: po.total,
      createdAt: po.createdAt,
      expectedDeliveryDate: po.expectedDeliveryDate
    }));

    return res.status(200).json({
      success: true,
      message: `Found ${formattedPreOrders.length} pending PreOrder(s)`,
      preOrders: flattenedItems, // Flattened items for table display
      groupedPreOrders: formattedPreOrders, // Grouped by PreOrder
      totalPreOrders: formattedPreOrders.length,
      totalItems: flattenedItems.length,
      weekRange: {
        start: monday.toISOString(),
        end: sunday.toISOString()
      }
    });

  } catch (error) {
    console.error("Error getting pending preorders:", error);
    res.status(500).json({
      success: false,
      message: "Error getting pending preorders",
      error: error.message
    });
  }
};

// Regional Order Trends - Weekly order analysis by state/region for warehouse planning
const getRegionalOrderTrends = async (req, res) => {
  try {
    const { weeks = 4 } = req.query;
    const weeksToAnalyze = Math.min(parseInt(weeks) || 4, 12);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - weeksToAnalyze * 7);
    startDate.setHours(0, 0, 0, 0);

    // Get weekly order trends by state with store details
    const regionalTrends = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isDelete: { $ne: true }
        }
      },
      {
        $lookup: {
          from: "auths",
          localField: "store",
          foreignField: "_id",
          as: "storeDetails"
        }
      },
      { $unwind: "$storeDetails" },
      {
        $addFields: {
          weekNumber: { $isoWeek: "$createdAt" },
          year: { $isoWeekYear: "$createdAt" }
        }
      },
      {
        $group: {
          _id: {
            state: "$storeDetails.state",
            year: "$year",
            week: "$weekNumber"
          },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          totalPallets: { $sum: { $ifNull: ["$palletCount", 0] } },
          uniqueStores: { $addToSet: { storeId: "$store", storeName: "$storeDetails.storeName", ownerName: "$storeDetails.ownerName", city: "$storeDetails.city" } },
          avgOrderValue: { $avg: "$total" }
        }
      },
      {
        $group: {
          _id: "$_id.state",
          state: { $first: "$_id.state" },
          weeklyData: {
            $push: {
              year: "$_id.year",
              week: "$_id.week",
              totalOrders: "$totalOrders",
              totalAmount: "$totalAmount",
              totalPallets: "$totalPallets",
              activeStores: { $size: "$uniqueStores" },
              storesList: "$uniqueStores",
              avgOrderValue: "$avgOrderValue"
            }
          },
          totalOrders: { $sum: "$totalOrders" },
          totalAmount: { $sum: "$totalAmount" },
          totalPallets: { $sum: "$totalPallets" },
          allActiveStores: { $push: "$uniqueStores" }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Get store count per state
    const storeCountByState = await authModel.aggregate([
      { $match: { role: "store" } },
      {
        $group: {
          _id: "$state",
          totalStores: { $sum: 1 },
          stores: {
            $push: {
              storeId: "$_id",
              storeName: "$storeName",
              ownerName: "$ownerName",
              city: "$city"
            }
          }
        }
      }
    ]);

    const storeCountMap = {};
    const storeListMap = {};
    storeCountByState.forEach((s) => {
      storeCountMap[s._id] = s.totalStores;
      storeListMap[s._id] = s.stores;
    });

    // Get top products ordered by region with product lookup
    const topProductsByRegion = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isDelete: { $ne: true }
        }
      },
      {
        $lookup: {
          from: "auths",
          localField: "store",
          foreignField: "_id",
          as: "storeDetails"
        }
      },
      { $unwind: "$storeDetails" },
      { $unwind: "$items" },
      {
        // Convert productId to ObjectId if it's a string
        $addFields: {
          "items.productIdObj": {
            $cond: {
              if: { $eq: [{ $type: "$items.productId" }, "string"] },
              then: { $toObjectId: "$items.productId" },
              else: "$items.productId"
            }
          }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productIdObj",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $addFields: {
          productName: {
            $ifNull: [
              "$items.name",
              { $ifNull: [
                "$items.productName",
                { $ifNull: [{ $arrayElemAt: ["$productDetails.name", 0] }, "Unknown Product"] }
              ]}
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            state: "$storeDetails.state",
            productId: "$items.productId"
          },
          productName: { $first: "$productName" },
          totalQuantity: { $sum: "$items.quantity" },
          totalAmount: {
            $sum: { $multiply: ["$items.quantity", { $ifNull: ["$items.unitPrice", 0] }] }
          },
          orderCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.state",
          products: {
            $push: {
              productId: "$_id.productId",
              productName: "$productName",
              totalQuantity: "$totalQuantity",
              totalAmount: "$totalAmount",
              orderCount: "$orderCount"
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          topProducts: {
            $slice: [{ $sortArray: { input: "$products", sortBy: { totalQuantity: -1 } } }, 5]
          }
        }
      }
    ]);

    const topProductsMap = {};
    topProductsByRegion.forEach((r) => {
      topProductsMap[r._id] = r.topProducts;
    });

    // Calculate week-over-week growth and format response
    const formattedData = regionalTrends.map((region) => {
      const sortedWeeks = region.weeklyData.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.week - a.week;
      });

      const currentWeek = sortedWeeks[0] || {
        totalOrders: 0,
        totalAmount: 0,
        totalPallets: 0,
        storesList: []
      };
      const lastWeek = sortedWeeks[1] || { totalOrders: 0, totalAmount: 0, totalPallets: 0 };

      const orderGrowth =
        lastWeek.totalOrders > 0
          ? (
              ((currentWeek.totalOrders - lastWeek.totalOrders) / lastWeek.totalOrders) *
              100
            ).toFixed(1)
          : 0;

      const amountGrowth =
        lastWeek.totalAmount > 0
          ? (
              ((currentWeek.totalAmount - lastWeek.totalAmount) / lastWeek.totalAmount) *
              100
            ).toFixed(1)
          : 0;

      // Calculate average weekly pallets
      const avgWeeklyPallets =
        region.weeklyData.length > 0
          ? Math.round(region.totalPallets / region.weeklyData.length)
          : 0;

      // Get unique active stores from all weeks
      const allStoresFlat = region.allActiveStores.flat();
      const uniqueActiveStores = [];
      const seenStoreIds = new Set();
      allStoresFlat.forEach((store) => {
        const storeIdStr = store.storeId?.toString();
        if (storeIdStr && !seenStoreIds.has(storeIdStr)) {
          seenStoreIds.add(storeIdStr);
          uniqueActiveStores.push(store);
        }
      });

      return {
        state: region.state || "Unknown",
        totalStores: storeCountMap[region.state] || 0,
        allStores: storeListMap[region.state] || [],
        activeStores: uniqueActiveStores,
        summary: {
          totalOrders: region.totalOrders,
          totalAmount: region.totalAmount,
          totalPallets: region.totalPallets,
          avgWeeklyPallets,
          avgOrderValue:
            region.totalOrders > 0 ? Math.round(region.totalAmount / region.totalOrders) : 0
        },
        currentWeek: {
          orders: currentWeek.totalOrders,
          amount: currentWeek.totalAmount,
          pallets: currentWeek.totalPallets,
          activeStores: currentWeek.activeStores || 0,
          storesList: currentWeek.storesList || []
        },
        lastWeek: {
          orders: lastWeek.totalOrders,
          amount: lastWeek.totalAmount,
          pallets: lastWeek.totalPallets
        },
        growth: {
          orders: parseFloat(orderGrowth),
          amount: parseFloat(amountGrowth)
        },
        weeklyTrend: sortedWeeks.slice(0, weeksToAnalyze),
        topProducts: topProductsMap[region.state] || []
      };
    });

    // Overall summary
    const overallSummary = {
      totalRegions: formattedData.length,
      totalOrders: formattedData.reduce((sum, r) => sum + r.summary.totalOrders, 0),
      totalAmount: formattedData.reduce((sum, r) => sum + r.summary.totalAmount, 0),
      totalPallets: formattedData.reduce((sum, r) => sum + r.summary.totalPallets, 0),
      avgWeeklyPallets: Math.round(
        formattedData.reduce((sum, r) => sum + r.summary.avgWeeklyPallets, 0)
      ),
      weeksAnalyzed: weeksToAnalyze
    };

    res.status(200).json({
      success: true,
      data: {
        summary: overallSummary,
        regions: formattedData
      }
    });
  } catch (error) {
    console.error("Error getting regional order trends:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrderCtrl,
  getAllOrderCtrl,
  getOrderForStoreCtrl,
  updateOrderCtrl,
  updatePalletInfo,
  userDetailsWithOrder,
  updatePaymentDetails,
  deleteOrderCtrl,
  deleteOrderHardCtrl,
  updateOrderTypeCtrl,
  getUserOrderStatement,
  updateShippingController,
  getDashboardData,
  getEnhancedDashboardData,
  getPendingOrders,
  invoiceMailCtrl,
  markOrderAsUnpaid,
  updateBuyerQuantityCtrl,
  assignProductToStore,
  getUserLatestOrdersCtrl,
  getOrderMatrixDataCtrl,
  exportOrderMatrixDataCtrl,
  updateOrderMatrixItemCtrl,
  updatePreOrderMatrixItemCtrl,
  confirmPreOrdersCtrl,
  getPendingPreOrdersForReviewCtrl,
  getRegionalOrderTrends
};
