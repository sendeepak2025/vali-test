const PurchaseOrder = require("../models/purchaseModel");
const Product = require("../models/productModel");
const Vendor = require('../models/vendorModel'); // adjust path
const { default: mongoose } = require("mongoose");
const nodemailer = require("nodemailer");
const { generatePurchaseOrderPDF } = require("../utils/generatePurchaseOrderPDF");

const sendOrderMail = async (to, subject, text, html, attachments = []) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      secure: false,
    });

    const mailOptions = {
      from: `"Vali Produce" <${process.env.MAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments, // 📎 <- add this
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Purchase order email sent:", info.response);
  } catch (error) {
    console.error("❌ Failed to send purchase order email:", error);
  }
};


exports.createPurchaseOrder = async (req, res) => {
  try {
    const {
      vendorId,
      purchaseOrderNumber,
      purchaseDate,
      deliveryDate,
      notes,
      items,
      totalAmount,
      mail
    } = req.body;

    console.log(purchaseDate, "date");

    // ✅ Save order
    const newOrder = new PurchaseOrder({
      vendorId,
      purchaseOrderNumber,
      purchaseDate,
      deliveryDate,
      notes,
      items,
      totalAmount,
    });
    await newOrder.save();

    // ✅ Get vendor details
    const vendor =
      (await Vendor.findById(vendorId).select("")) ||
      (await authModel.findById(vendorId).select(""));
console.log(vendor,"VENDOR DETAILS")
    if (vendor && vendor.email && mail === 1 ) {
     const orderDateFormatted = new Date(`${purchaseDate}T00:00:00`).toLocaleDateString("en-US");
const deliveryDateFormatted = new Date(`${deliveryDate}T00:00:00`).toLocaleDateString("en-US");

      // 📊 Build HTML table
      const itemsTable = items
        .map(
          (item, idx) => `
            <tr>
              <td style="padding:6px;border:1px solid #ccc;text-align:center;">${idx + 1}</td>
              <td style="padding:6px;border:1px solid #ccc;">${item.productName}</td>
              <td style="padding:6px;border:1px solid #ccc;text-align:center;">${item.quantity}</td>
            </tr>`
        )
        .join("");

      const emailSubject = `🧾 New Purchase Order: ${purchaseOrderNumber}`;
      const emailText = `Hello ${vendor.name || "Vendor"}, a new purchase order (${purchaseOrderNumber}) has been created.`;
      const emailHtml = `
        <div style="font-family:Arial, sans-serif; line-height:1.6; color:#333;">
          <h2 style="color:#2d7df4;">Purchase Order Confirmation</h2>
          <p>Hello <b>${vendor.name || "Vendor"}</b>,</p>
          <p>A new purchase order has been created. Details are below:</p>
          <table style="width:100%;max-width:600px;margin-top:10px;">
            <tr><td><b>Purchase Order #:</b></td><td>${purchaseOrderNumber}</td></tr>
            <tr><td><b>Purchase Date:</b></td><td>${orderDateFormatted}</td></tr>
            <tr><td><b>Delivery Date:</b></td><td>${deliveryDateFormatted}</td></tr>
            <tr><td><b>Notes:</b></td><td>${notes || "-"}</td></tr>
          </table>

          <h3 style="margin-top:20px;">Order Items</h3>
          <table style="width:100%;border-collapse:collapse;margin-top:5px;">
            <thead>
              <tr style="background:#f4f4f4;">
                <th style="padding:6px;border:1px solid #ccc;">#</th>
                <th style="padding:6px;border:1px solid #ccc;">Item</th>
                <th style="padding:6px;border:1px solid #ccc;">Quantity</th>
               
              </tr>
            </thead>
            <tbody>${itemsTable}</tbody>
          </table>

        

          <p style="margin-top:20px;">Thank you,<br/>Vali Produce Team</p>
        </div>
      `;

      // 📄 Generate PDF with only name + quantity
      const pdfBase64 = await generatePurchaseOrderPDF({
        purchaseOrderNumber,
        purchaseDate:new Date(`${purchaseDate}T00:00:00`).toLocaleDateString("en-US"),
        deliveryDate,
        items: items.map(i => ({
          productName: i.productName,
          quantity: i.quantity,
        })),
        vendor,
      });

      // 📎 Attach PDF
      const attachments = [
        {
          filename: `Purchase_Order_${purchaseOrderNumber}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ];

      // 📩 Send Email
      await sendOrderMail(vendor?.email, emailSubject, emailText, emailHtml, attachments);
    } else {
      console.warn("⚠️ No vendor email found, skipping email.");
    }

    res.status(201).json({
      success: true,
      message: "Purchase order created & emailed with PDF successfully.",
      data: newOrder,
    });
  } catch (error) {
    console.error("❌ Error creating purchase order:", error);
    res.status(500).json({ success: false, message: "Internal server error", error });
  }
};



// exports.createPurchaseOrder = async (req, res) => {
//   try {
//     const {
//       vendorId,
//       purchaseOrderNumber,
//       purchaseDate,
//       deliveryDate,
//       notes,
//       items,
//       totalAmount
//     } = req.body;

//     const newOrder = new PurchaseOrder({
//       vendorId,
//       purchaseOrderNumber,
//       purchaseDate,
//       deliveryDate,
//       notes,
//       items,
//       totalAmount
//     });

//     await newOrder.save();

//     // ✅ Update product quantity and logs
//     for (const item of items) {
//       const product = await Product.findById(item.productId);
//       if (product) {
//         const oldQuantity = product.quantity;
//         const newQuantity = oldQuantity + item.quantity;

//         product.quantity = newQuantity;

//         product.updatedFromOrders.push({
//           purchaseOrder: newOrder._id,
//           oldQuantity,
//           newQuantity,
//           difference: item.quantity,
//         });

//         await product.save();
//       }
//     }

//     res.status(201).json({
//       success: true,
//       message: 'Purchase order created successfully.',
//       data: newOrder
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error
//     });
//   }
// };


exports.getAllPurchaseOrders = async (req, res) => {
  try {

    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const paymentStatus = req.query.paymentStatus || "all";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const matchStage = {};


    console.log(paymentStatus)
    // Filter by payment status
    if (paymentStatus !== "all") {
      matchStage.paymentStatus = paymentStatus;
    }

    // Filter by date range
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    const searchRegex = new RegExp(search, "i");

    const aggregateQuery = [
      {
        $lookup: {
          from: "vendors",
          localField: "vendorId",
          foreignField: "_id",
          as: "vendor",
        },
      },
      { $unwind: "$vendor" },
      {
        $match: {
          ...matchStage,
          ...(search
            ? {
              $or: [
                { purchaseOrderNumber: searchRegex },
                { "vendor.name": searchRegex },
              ],
            }
            : {}),
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
          summary: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: "$totalAmount" },
                totalPaid: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "paid"] },
                      "$totalAmount",
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
                totalPaid: 1,
                totalPending: { $subtract: ["$totalAmount", "$totalPaid"] },
                vendor: {
                  name: "$vendor.name",
                  contactName: "$vendor.contactName"
                }
              },
            },
          ],
        },
      },
    ];

    const result = await PurchaseOrder.aggregate(aggregateQuery);

    const orders = result[0].data;
    const totalOrders = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalOrders / limit);

    const summary = result[0].summary[0] || {
      totalOrders: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0,
    };

    return res.status(200).json({
      success: true,
      message: orders.length
        ? "Purchase Orders fetched successfully!"
        : "No purchase orders found!",
      orders,
      totalOrders,
      totalPages,
      currentPage: page,
      summary,
    });
  } catch (error) {
    console.error("Error fetching purchase orders:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching purchase orders!",
      error: error.message,
    });
  }
};




exports.getSinglePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await PurchaseOrder.findById(id).populate('vendorId').populate('items.productId');

    if (!order) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendorId,
      purchaseOrderNumber,
      purchaseDate,
      deliveryDate,
      notes,
      items,
      totalAmount
    } = req.body.quantityData;
    console.log(items)
    const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
      id,
      {
        vendorId,
        purchaseOrderNumber,
        purchaseDate,
        deliveryDate,
        notes,
        items,
        totalAmount
      },
      { new: true }
    );

    if (!updatedOrder) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    res.status(200).json({ success: true, message: 'Purchase order updated successfully', data: updatedOrder });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};


// exports.updatePurchaseOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       vendorId,
//       purchaseOrderNumber,
//       purchaseDate,
//       deliveryDate,
//       notes,
//       items,
//     } = req.body.quantityData;


//     console.log(req.body)
//     if (!Array.isArray(items)) {
//       return res.status(400).json({
//         success: false,
//         message: "'items' must be an array",
//       });
//     }

//     const order = await PurchaseOrder.findById(id);
//     if (!order) {
//       return res.status(404).json({ success: false, message: 'Purchase order not found' });
//     }

//     // ✅ Track quantity changes for each item
//     for (const incomingItem of items) {
//       const existingItem = order.items.find(item => item._id.toString() === incomingItem._id);

//       if (existingItem) {
//         const quantityDiff = incomingItem.quantity - existingItem.quantity;

//         if (quantityDiff !== 0) {
//           const product = await Product.findById(incomingItem.productId);
//           if (product) {
//             const oldQuantity = product.quantity;
//             const newQuantity = oldQuantity + quantityDiff;

//             product.quantity = newQuantity;

//             product.updatedFromOrders.push({
//               purchaseOrder: order._id,
//               oldQuantity,
//               newQuantity,
//               difference: quantityDiff,
//             });

//             await product.save();
//           }
//         }
//       }
//     }

//     // ✅ Update purchase order
//     order.vendorId = vendorId;
//     order.purchaseOrderNumber = purchaseOrderNumber;
//     order.purchaseDate = purchaseDate;
//     order.deliveryDate = deliveryDate;
//     order.notes = notes;
//     order.items = items;

//     const updatedOrder = await order.save();

//     res.status(200).json({
//       success: true,
//       message: 'Purchase order updated successfully',
//       data: updatedOrder
//     });
//   } catch (error) {
//     console.error("Error in updatePurchaseOrder:", error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };




exports.deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the purchase order first
    const purchaseOrder = await PurchaseOrder.findById(id);

    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    // Check if any item has qualityStatus === 'approved'
    const hasApprovedItem = purchaseOrder.items.some(item => item.qualityStatus === 'approved');

    if (hasApprovedItem) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete purchase order because one or more items have been approved.'
      });
    }

    // Proceed to delete if no approved items
    await PurchaseOrder.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Purchase order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};






// exports.updateItemQualityStatus = async (req, res) => {
//   try {
//     const { purchaseOrderId } = req.params;
//     const updatedItems = req.body;

//     if (!mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
//       return res.status(400).json({ success: false, message: "Invalid Purchase Order ID" });
//     }

//     const order = await PurchaseOrder.findById(purchaseOrderId);
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Purchase order not found" });
//     }

//     for (const incomingItem of updatedItems) {
//       const existingItem = order.items.id(incomingItem._id);
//       if (!existingItem) continue;

//       const wasApprovedBefore = existingItem.qualityStatus === "approved";
//       const oldItemQuantity = existingItem.quantity;
//       const newItemQuantity = typeof incomingItem.quantity === "number" ? incomingItem.quantity : oldItemQuantity;
//       const isApprovedNow = incomingItem.qualityStatus === "approved";
//       const isRejectedNow = incomingItem.qualityStatus === "rejected";

//       // Update fields
//       existingItem.qualityStatus = incomingItem.qualityStatus || existingItem.qualityStatus;
//       existingItem.qualityNotes = incomingItem.qualityNotes || existingItem.qualityNotes;
//       existingItem.mediaUrls = incomingItem.mediaUrls || existingItem.mediaUrls;
//       existingItem.quantity = newItemQuantity;

//       const productId = incomingItem.productId?._id || incomingItem.productId;

//       if (!mongoose.Types.ObjectId.isValid(productId)) {
//         console.warn(`⚠️ Invalid productId: ${productId}`);
//         continue;
//       }

//       const product = await Product.findById(productId);
//       if (!product) {
//         console.warn(`⚠️ Product not found: ${productId}`);
//         continue;
//       }

//       product.updatedFromOrders = product.updatedFromOrders.filter(e => e.purchaseOrder);
//       const logEntry = product.updatedFromOrders.find(e => e.purchaseOrder.toString() === purchaseOrderId);

//       // ✅ Case 1: Approved -> Rejected
//       if (wasApprovedBefore && isRejectedNow) {
//         product.quantity -= oldItemQuantity;
//         product.totalPurchase -= oldItemQuantity;
//         console.log("❌ Rejected after approval. Removed:", oldItemQuantity);

//         if (logEntry) {
//           product.updatedFromOrders = product.updatedFromOrders.filter(e => e.purchaseOrder.toString() !== purchaseOrderId);
//         }
//       }

//       // ✅ Case 2: First time approval
//       else if (!wasApprovedBefore && isApprovedNow) {
//         product.quantity += newItemQuantity;
//         product.totalPurchase += newItemQuantity;
//         console.log("➕ First time approval. Added:", newItemQuantity);

//         product.updatedFromOrders.push({
//           purchaseOrder: purchaseOrderId,
//           oldQuantity: 0,
//           newQuantity: newItemQuantity,
//           difference: newItemQuantity,
//         });
//       }

//       // ✅ Case 3: Already approved and quantity updated
//       else if (wasApprovedBefore && isApprovedNow && logEntry && newItemQuantity !== oldItemQuantity) {
//         const diff = newItemQuantity - oldItemQuantity;
//         product.quantity += diff;
//         product.totalPurchase += diff;
//         console.log("🔁 Updated quantity difference:", diff);

//         logEntry.oldQuantity = logEntry.newQuantity;
//         logEntry.newQuantity = newItemQuantity;
//         logEntry.difference = diff;
//       } else {
//         console.log("✅ No quantity update required.");
//       }

//       await product.save();
//     }

//     await order.save();

//     res.status(200).json({
//       success: true,
//       message: "Items and product quantities updated successfully",
//       data: order.items,
//     });
//   } catch (error) {
//     console.error("❌ Error in bulk quality update:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };


// ✅ utility function to update product history (add or subtract quantities)
const updateHistoryEntry = (historyArray, date, key, value, lb = null) => {
  const dateStr = new Date(date).toISOString().split('T')[0];
  const entry = historyArray.find(h =>
    new Date(h.date).toISOString().split('T')[0] === dateStr &&
    (lb ? h.lb === lb : true)
  );

  if (entry) {
    entry[key] += value;
  } else {
    const newEntry = { date: new Date(date), [key]: value };
    if (lb) newEntry.lb = lb;
    historyArray.push(newEntry);
  }
};

// ✅ FULL CONTROLLER: updateItemQualityStatus

exports.updateItemQualityStatus = async (req, res) => {
  try {
    const { purchaseOrderId } = req.params;
    const updatedItems = req.body;

    if (!mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
      return res.status(400).json({ success: false, message: "Invalid Purchase Order ID" });
    }

    const order = await PurchaseOrder.findById(purchaseOrderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }

    for (const incomingItem of updatedItems) {
      const existingItem = order.items.id(incomingItem._id);
      if (!existingItem) continue;

      const wasApprovedBefore = existingItem.qualityStatus === "approved";
      const oldItemQuantity = existingItem.quantity;
      const newItemQuantity = typeof incomingItem.quantity === "number" ? incomingItem.quantity : oldItemQuantity;
      const isApprovedNow = incomingItem.qualityStatus === "approved";
      const isRejectedNow = incomingItem.qualityStatus === "rejected";

      // Update fields
      existingItem.qualityStatus = incomingItem.qualityStatus || existingItem.qualityStatus;
      existingItem.qualityNotes = incomingItem.qualityNotes || existingItem.qualityNotes;
      existingItem.mediaUrls = incomingItem.mediaUrls || existingItem.mediaUrls;
      existingItem.quantity = newItemQuantity;
      
      // Update produce-specific fields
      if (incomingItem.rejectionReason !== undefined) {
        existingItem.rejectionReason = incomingItem.rejectionReason;
      }
      if (incomingItem.batchNumber !== undefined) {
        existingItem.batchNumber = incomingItem.batchNumber;
      }
      if (incomingItem.expectedWeight !== undefined) {
        existingItem.expectedWeight = incomingItem.expectedWeight;
      }
      if (incomingItem.actualWeight !== undefined) {
        existingItem.actualWeight = incomingItem.actualWeight;
      }
      if (incomingItem.weightVariance !== undefined) {
        existingItem.weightVariance = incomingItem.weightVariance;
      }
      if (incomingItem.weightVariancePercent !== undefined) {
        existingItem.weightVariancePercent = incomingItem.weightVariancePercent;
      }

      const productId = incomingItem.productId?._id || incomingItem.productId;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        console.warn(`⚠️ Invalid productId: ${productId}`);
        continue;
      }

      const product = await Product.findById(productId);
      if (!product) {
        console.warn(`⚠️ Product not found: ${productId}`);
        continue;
      }

      product.updatedFromOrders = product.updatedFromOrders.filter(e => e.purchaseOrder);
      const logEntry = product.updatedFromOrders.find(e => e.purchaseOrder.toString() === purchaseOrderId);

      const existingTotalWeight = existingItem.totalWeight || 0;
      const existingLb = existingItem.lb || null;

      // ✅ Case 1: Approved -> Rejected
      if (wasApprovedBefore && isRejectedNow) {
        product.quantity -= oldItemQuantity;
        product.totalPurchase -= oldItemQuantity;
        product.remaining -= oldItemQuantity;
        product.unitPurchase -= existingTotalWeight;
        product.unitRemaining -= existingTotalWeight;

        if (logEntry) {
          product.updatedFromOrders = product.updatedFromOrders.filter(e => e.purchaseOrder.toString() !== purchaseOrderId);
        }

        product.purchaseHistory = product.purchaseHistory.filter(p => new Date(p.date).toISOString() !== new Date(order.purchaseDate).toISOString());
        product.lbPurchaseHistory = product.lbPurchaseHistory.filter(p => new Date(p.date).toISOString() !== new Date(order.purchaseDate).toISOString());

        console.log("❌ Rejected after approval. Removed:", oldItemQuantity);
      }

      // ✅ Case 2: First time approval
      else if (!wasApprovedBefore && isApprovedNow) {
        product.quantity += newItemQuantity;
        product.totalPurchase += newItemQuantity;
        product.remaining += newItemQuantity;
        product.unitPurchase += existingTotalWeight;
        product.unitRemaining += existingTotalWeight;

        const entry = {
          purchaseOrder: purchaseOrderId,
          oldQuantity: 0,
          newQuantity: newItemQuantity,
          perLb: existingLb,
          totalLb: existingTotalWeight,
          difference: newItemQuantity,
        };
        product.updatedFromOrders.push(entry);

        product.purchaseHistory.push({
          date: order.purchaseDate,
          quantity: newItemQuantity,
        });

        if (existingLb && existingTotalWeight) {
          product.lbPurchaseHistory.push({
            date: order.purchaseDate,
            weight: existingTotalWeight,
            lb: existingLb,
          });
        }

        console.log("➕ First time approval. Added:", newItemQuantity);
      }

      // ✅ Case 3: Already approved and quantity updated
      else if (wasApprovedBefore && isApprovedNow && logEntry && newItemQuantity !== oldItemQuantity) {
        const diff = newItemQuantity - oldItemQuantity;
        product.quantity += diff;
        product.totalPurchase += diff;
        product.remaining += diff;

        const weightDiff = existingTotalWeight - (logEntry.totalLb || 0);
        product.unitPurchase += weightDiff;
        product.unitRemaining += weightDiff;

        // update lb purchase history
        const lbHist = product.lbPurchaseHistory.find(p => new Date(p.date).toISOString() === new Date(order.purchaseDate).toISOString());
        if (lbHist) {
          lbHist.weight = existingTotalWeight;
        }

        // update purchase history
        const history = product.purchaseHistory.find(p => new Date(p.date).toISOString() === new Date(order.purchaseDate).toISOString());
        if (history) history.quantity = newItemQuantity;

        logEntry.oldQuantity = logEntry.newQuantity;
        logEntry.newQuantity = newItemQuantity;
        logEntry.difference = diff;
        logEntry.totalLb = existingTotalWeight;
        logEntry.perLb = existingLb;

        console.log("🔁 Updated quantity difference:", diff);
      } else {
        console.log("✅ No quantity update required.");
      }

      await product.save();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Items and product quantities updated successfully",
      data: order.items,
    });
  } catch (error) {
    console.error("❌ Error in bulk quality update:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};



exports.updatePaymentDetailsPurchase = async (req, res) => {
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

    // Prepare paymentDetails object
    const paymentDetails = {
      method,
      ...(method === "creditcard" ? { transactionId } : {}),
      ...(method === "cash" ? { notes } : {}),
      ...(method === "cheque" ? { notes } : {}),
      paymentDate: new Date(), // Yaha backend me hi current date daal do
    };

    const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
      orderId,
      {
        paymentDetails,
        paymentStatus: paymentType === "full" ? "paid" : "partial",
        paymentAmount: amountPaid,
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

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





exports.vendorDetailsWithPurchaseOrders = async (req, res) => {
  const { vendorId } = req.params;

  try {
    // Get vendor details
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Get all purchase orders for this vendor with product details
    const purchaseOrders = await PurchaseOrder.find({ 
      vendorId: new mongoose.Types.ObjectId(vendorId) 
    })
      .populate('items.productId', 'name unit category')
      .sort({ purchaseDate: -1 });

    // Calculate totals
    let totalSpent = 0;
    let totalPay = 0;

    const formattedOrders = purchaseOrders.map(order => {
      const orderTotal = order.totalAmount || 0;
      totalSpent += orderTotal;

      // Calculate paid amount
      if (order.paymentStatus === "paid") {
        totalPay += orderTotal;
      } else if (order.paymentStatus === "partial") {
        totalPay += parseFloat(order.paymentAmount) || 0;
      }

      // Format items with product details
      const formattedItems = order.items.map(item => ({
        ...item.toObject(),
        productName: item.productId?.name || '',
        productUnit: item.productId?.unit || '',
        productCategory: item.productId?.category || '',
      }));

      return {
        ...order.toObject(),
        items: formattedItems,
      };
    });

    const balanceDue = totalSpent - totalPay;

    const result = {
      _id: vendor._id,
      name: vendor.name,
      type: vendor.type,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      productsSupplied: vendor.productsSupplied,
      contactName: vendor.contactName,
      totalOrders: purchaseOrders.length,
      totalSpent,
      totalPay,
      balanceDue,
      purchaseOrders: formattedOrders,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };

    console.log("Vendor details result:", {
      vendorId,
      vendorName: result.name,
      totalOrders: result.totalOrders,
      purchaseOrdersCount: result.purchaseOrders.length
    });

    return res.status(200).json({
      success: true,
      message: "Vendor details with purchase orders fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching vendor purchase order details:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching purchase order details",
      error: error.message,
    });
  }
};




