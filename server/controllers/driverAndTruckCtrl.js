const Driver = require("../models/DriverAndTruckModel");

// ======================================
// ✅ Create Driver Controller
// ======================================
const createDriverCtrl = async (req, res) => {
  try {
    const {
      name,
      phone,
      license_number,
      license_expiry_date,
      trucks
    } = req.body;

    // Check required fields
    if (!name || !phone || !license_number || !license_expiry_date) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    // Check if phone already exists
    const existing = await Driver.findOne({ phone });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Driver with this phone already exists",
      });
    }

    const newDriver = await Driver.create({
      name,
      phone,
      license_number,
      license_expiry_date,
      trucks: trucks || [],
    });

    res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: newDriver,
    });

  } catch (error) {
    console.error("Error creating driver:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ======================================
// ✅ Edit Driver Controller
// ======================================
const editDriverCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );

    if (!updatedDriver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Driver updated successfully",
      data: updatedDriver,
    });

  } catch (error) {
    console.error("Error editing driver:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ======================================
// ✅ Get All Drivers
// ======================================
const getAllDriver = async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Drivers fetched successfully",
      data: drivers,
    });

  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createDriverCtrl,
  editDriverCtrl,
  getAllDriver,
};
