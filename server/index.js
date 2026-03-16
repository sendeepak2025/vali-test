const express = require("express")
const app = express();
const cookieParser = require("cookie-parser")
const cors = require("cors")
const { cloudinaryConnect } = require("./config/cloudinary")
const fileUpload = require("express-fileupload");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const bodyParser = require("body-parser");
const Order = require("./models/orderModle")

dotenv.config();

const PORT = process.env.PORT || 8080
connectDB();


app.use(express.json({ limit: "500mb" }));
app.use(bodyParser.json({ limit: "500mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "500mb" }));

app.use(cookieParser());
app.use(cors({
  origin: "*",
  credentials: true,
}))

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp"
  })
)

cloudinaryConnect();


// routes  
app.use("/api/v1/auth", require("./routes/authRoute"))
app.use("/api/v1/image", require("./routes/imageRoute"))
app.use("/api/v1/category", require("./routes/categoryRoute"))
app.use("/api/v1/product", require("./routes/productRoute"))
app.use("/api/v1/price-list-templates", require("./routes/PriceListTemplateRoute"));
app.use("/api/v1/order", require("./routes/orderRoute"))
app.use("/api/v1/pre-order", require("./routes/preOrderRoute"))
app.use("/api/v1/crm", require("./routes/crmRoute"))
app.use("/api/v1/crm-deal", require("./routes/dealCrmRoute"))
app.use("/api/v1/task", require("./routes/taskRoute"))
app.use("/api/v1/email", require("./routes/emailsRoute"))
app.use("/api/v1/pricing", require("./routes/groupPricing"))
app.use("/api/v1/vendors", require("./routes/vendorRoute"))
app.use("/api/v1/purchase-orders", require("./routes/purchaseOrderRoute"))
app.use("/api/v1/invoices", require("./routes/invoiceRoute"))
app.use("/api/v1/credit-memo", require("./routes/creditMemosRoute"))
app.use("/api/v1/vendor-credit-memos", require("./routes/vendorCreditMemoRoute"))
app.use("/api/v1/vendor-payments", require("./routes/vendorPaymentRoute"))
app.use("/api/v1/vendor-disputes", require("./routes/vendorDisputeRoute"))
app.use("/api/v1/vendor-reports", require("./routes/vendorReportsRoute"))
app.use("/api/v1/drivers", require("./routes/driverAndTruckRoute"))
app.use("/api/v1/trips", require("./routes/tripRoute"))
app.use("/api/v1/store-inventory", require("./routes/storeInventoryRoute"))
app.use("/api/v1/notifications", require("./routes/notificationRoute"))
app.use("/api/v1/legal", require("./routes/legalDocumentRoute"))
app.use("/api/v1/quality-issues", require("./routes/qualityIssueRoute"))
app.use("/api/v1/adjustments", require("./routes/adjustmentRoute"))
app.use("/api/v1/expenses", require("./routes/expenseRoute"))
app.use("/api/v1/incoming-stock", require("./routes/incomingStockRoute"))
app.use("/api/v1/work-orders", require("./routes/workOrderRoute"))




const checkOrderTotals = async () => {
  try {
    const orders = await Order.find();

    const mismatchedOrders = [];

    for (const order of orders) {
      let itemTotal = 0;

      for (const item of order.items) {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        itemTotal += quantity * unitPrice;
      }

      const shipping = Number(order.shippinCost || 0);
      const calculatedTotal = itemTotal + shipping;
      const savedTotal = Number(order.total || 0);

      if (Math.round(calculatedTotal * 100) !== Math.round(savedTotal * 100)) {
        mismatchedOrders.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          calculatedTotal,
          savedTotal,
          difference: (calculatedTotal - savedTotal).toFixed(2),
        });
      }
    }

    if (mismatchedOrders.length === 0) {
      console.log("✅ All orders have correct totals.");
    } else {
      console.log("❌ Mismatched Orders Found:\n");
      console.table(mismatchedOrders);
    }
  } catch (error) {
    console.error("Error checking order totals:", error);
  } 
};



// checkOrderTotals();


app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your server is up and running ..."
  })
})

app.listen(PORT, () => {
  console.log(`Server is running at port no ${PORT}`)
})
