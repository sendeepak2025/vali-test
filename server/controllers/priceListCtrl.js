const PriceListTemplate = require("../models/PriceListTemplate");
const authModel = require("../models/authModel");
const mailSender = require("../utils/mailSender");
const emailTemplates = require("../templates/emails/emailTemplates");

// ✅ Create a new Price List Template
exports.createPriceListTemplate = async (req, res) => {
  try {
    const { name, description, status, products, emailDistributionGroups, lastSent, emailSubject, emailBody, sendEmailNotification } = req.body;

  
    if (!name || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: "Name and at least one product are required." });
    }

    const newTemplate = new PriceListTemplate({
      name,
      description,
      status,
      products,
      emailDistributionGroups,
      lastSent,
      emailSubject,
      emailBody
    });

    await newTemplate.save();

    // Send email notification to all approved stores if requested or if status is active
    if (sendEmailNotification || status === "active") {
      try {
        // 🧪 TEST MODE: Only send to test email
        const TEST_MODE = false;
        const TEST_EMAIL = "rishimaheshwari040@gmail.com";

        let stores;
        if (TEST_MODE) {
          stores = [{ email: TEST_EMAIL, storeName: "Test Store" }];
          console.log(`🧪 TEST MODE: Sending price list email only to ${TEST_EMAIL}`);
        } else {
          stores = await authModel.find({ 
            role: "store", 
            approvalStatus: "approved",
            email: { $exists: true, $ne: "" }
          }).select('email storeName');
        }

        const priceListUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/store/mobile`;

        for (const store of stores) {
          try {
            const htmlContent = emailTemplates.NEW_PRICE_LIST({
              storeName: store.storeName,
              priceListName: name,
              description: description,
              publishedDate: new Date().toLocaleDateString(),
              productCount: products.length,
              priceListUrl: priceListUrl,
            });

            await mailSender(
              store.email,
              `📋 New Price List: ${name}`,
              htmlContent
            );
          } catch (emailError) {
            console.error(`Failed to send price list email to ${store.email}:`, emailError);
          }
        }

        console.log(`Price list notification sent to ${stores.length} stores`);
      } catch (notificationError) {
        console.error("Error sending price list notifications:", notificationError);
      }
    }

    res.status(201).json({ success: true, message: "Template created successfully.", data: newTemplate });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

// ✅ Get all Price List Templates (paginated, newest first)
exports.getAllPriceListTemplates = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const status = req.query.status || "";

    const match = {};
    if (search) {
      const regex = new RegExp(search, "i");
      match.$or = [{ name: regex }, { description: regex }];
    }
    if (status && status !== "all") {
      match.status = status;
    }

    const total = await PriceListTemplate.countDocuments(match);

   const templates = await PriceListTemplate.aggregate([
  { $match: match },
  { $sort: { createdAt: -1 } },
  { $skip: skip },
  { $limit: limit },
  {
    $addFields: {
      products: {
        $map: {
          input: "$products",
          as: "p",
          in: {
            $mergeObjects: [
              "$$p",
              { price: "$$p.aPrice" }
            ]
          }
        }
      }
    }
  }
]);


      
    res.status(200).json({
      success: true,
      data: templates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

// ✅ Get a single Price List Template by ID
exports.getPriceListTemplateById = async (req, res) => {
  try {
    const template = await PriceListTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }

    res.status(200).json({ success: true, data: template });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

// ✅ Update a Price List Template
exports.updatePriceListTemplate = async (req, res) => {
  try {
    const { name, description, status, products, emailDistributionGroups, lastSent, emailSubject, emailBody, sendEmailNotification } = req.body;

    const updatedTemplate = await PriceListTemplate.findByIdAndUpdate(
      req.params.id,
      { name, description, status, products, emailDistributionGroups, lastSent, emailSubject, emailBody },
      { new: true }
    );

    if (!updatedTemplate) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }

    // Send email notification to all approved stores if requested or if status is active
    if (sendEmailNotification || status === "active") {
      try {
        // 🧪 TEST MODE: Only send to test email
        const TEST_MODE = false;
        const TEST_EMAIL = "rishimaheshwari040@gmail.com";

        let stores;
        if (TEST_MODE) {
          stores = [{ email: TEST_EMAIL, storeName: "Test Store" }];
          console.log(`🧪 TEST MODE: Sending price list update email only to ${TEST_EMAIL}`);
        } else {
          stores = await authModel.find({ 
            role: "store", 
            approvalStatus: "approved",
            email: { $exists: true, $ne: "" }
          }).select('email storeName');
        }

        const priceListUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/store/mobile`;

        for (const store of stores) {
          try {
            const htmlContent = emailTemplates.PRICE_LIST_UPDATED({
              storeName: store.storeName,
              priceListName: updatedTemplate.name,
              description: updatedTemplate.description,
              updatedDate: new Date().toLocaleDateString(),
              productCount: updatedTemplate.products?.length || 0,
              priceListUrl: priceListUrl,
            });

            await mailSender(
              store.email,
              `📋 Price List Updated: ${updatedTemplate.name}`,
              htmlContent
            );
          } catch (emailError) {
            console.error(`Failed to send price list update email to ${store.email}:`, emailError);
          }
        }

        console.log(`Price list update notification sent to ${stores.length} stores`);
      } catch (notificationError) {
        console.error("Error sending price list update notifications:", notificationError);
      }
    }

    res.status(200).json({ success: true, message: "Template updated successfully.", data: updatedTemplate });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

// ✅ Delete a Price List Template
exports.deletePriceListTemplate = async (req, res) => {
  try {
    const deletedTemplate = await PriceListTemplate.findByIdAndDelete(req.params.id);

    if (!deletedTemplate) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }

    res.status(200).json({ success: true, message: "Template deleted successfully." });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

// ✅ Send price list notification email to all stores
exports.sendPriceListNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await PriceListTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Price list template not found." });
    }

    // 🧪 TEST MODE: Only send to test email
    const TEST_MODE = false;
    const TEST_EMAIL = "rishimaheshwari040@gmail.com";

    let stores;
    if (TEST_MODE) {
      stores = [{ email: TEST_EMAIL, storeName: "Test Store" }];
      console.log(`🧪 TEST MODE: Sending price list email only to ${TEST_EMAIL}`);
    } else {
      // Get all approved stores with email
      stores = await authModel.find({ 
        role: "store", 
        approvalStatus: "approved",
        email: { $exists: true, $ne: "" }
      }).select('email storeName');
    }

    if (stores.length === 0) {
      return res.status(400).json({ success: false, message: "No approved stores found to notify." });
    }

    const priceListUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/store/mobile`;
    let successCount = 0;
    let failCount = 0;

    for (const store of stores) {
      try {
        const htmlContent = emailTemplates.NEW_PRICE_LIST({
          storeName: store.storeName,
          priceListName: template.name,
          description: template.description,
          publishedDate: new Date().toLocaleDateString(),
          productCount: template.products?.length || 0,
          priceListUrl: priceListUrl,
        });

        await mailSender(
          store.email,
          `📋 New Price List: ${template.name}`,
          htmlContent
        );
        successCount++;
      } catch (emailError) {
        console.error(`Failed to send price list email to ${store.email}:`, emailError);
        failCount++;
      }
    }

    // Update lastSent timestamp
    await PriceListTemplate.findByIdAndUpdate(id, { lastSent: new Date() });

    res.status(200).json({ 
      success: true, 
      message: `Price list notification sent to ${successCount} stores.`,
      totalStores: stores.length,
      successCount,
      failCount
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};
