const Trip = require("../models/tripModel");
const Driver = require("../models/DriverAndTruckModel");
const Order = require("../models/orderModle");

// ======================================
// ✅ Create Trip
// ======================================
const createTripCtrl = async (req, res) => {
  try {
    const {
      route,
      date,
      driver: driverId,
      truck: truckId,
      orders = [],
      capacity_kg = 0,
      capacity_m3 = 0,
      status = "Planned",
    } = req.body;

    if (!route?.from || !route?.to || !date || !driverId || !truckId) {
      return res.status(400).json({
        success: false,
        message: "Route, date, driver, and truck are required",
      });
    }

    // Validate driver and truck
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }
    const truck = driver.trucks.id(truckId);
    if (!truck) {
      return res.status(404).json({ success: false, message: "Truck not found for this driver" });
    }

    // Validate total trip capacity
    if (capacity_kg > truck.capacity_kg) {
      return res.status(400).json({
        success: false,
        message: `Trip weight ${capacity_kg}kg exceeds truck capacity ${truck.capacity_kg}kg`,
      });
    }
    if (capacity_m3 > truck.capacity_m3) {
      return res.status(400).json({
        success: false,
        message: `Trip volume ${capacity_m3}m³ exceeds truck capacity ${truck.capacity_m3}m³`,
      });
    }

    // Validate orders
    const formattedOrders = orders.map((o) => ({
      order_id: o.order_id,
      capacity_kg: o.capacity_kg || 0,
      capacity_m3: o.capacity_m3 || 0,
    }));

    const newTrip = await Trip.create({
      route,
      date,
      driver: driverId,
      truck: truckId,
      orders: formattedOrders,
      capacity_kg,
      capacity_m3,
      status,
    });

    res.status(201).json({
      success: true,
      message: "Trip created successfully",
      data: newTrip,
    });
  } catch (error) {
    console.error("CREATE TRIP ERROR:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ======================================
// ✅ Edit Trip
// ======================================
const editTripCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      route,
      date,
      driver,
      truck,
      orders = [],
      capacity_kg,
      capacity_m3,
      status,
    } = req.body;

    const driverData = await Driver.findById(driver);
    if (!driverData) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const truckData = driverData.trucks.id(truck);
    if (!truckData) {
      return res.status(404).json({ success: false, message: "Truck not found for this driver" });
    }

    if (capacity_kg > truckData.capacity_kg) {
      return res.status(400).json({
        success: false,
        message: `Trip weight ${capacity_kg}kg exceeds truck capacity ${truckData.capacity_kg}kg`,
      });
    }
    if (capacity_m3 > truckData.capacity_m3) {
      return res.status(400).json({
        success: false,
        message: `Trip volume ${capacity_m3}m³ exceeds truck capacity ${truckData.capacity_m3}m³`,
      });
    }

    const formattedOrders = orders.map((o) => ({
      order_id: o.order_id,
      capacity_kg: o.capacity_kg || 0,
      capacity_m3: o.capacity_m3 || 0,
    }));

    const updatedTrip = await Trip.findByIdAndUpdate(
      id,
      {
        route,
        date,
        driver,
        truck,
        orders: formattedOrders,
        capacity_kg,
        capacity_m3,
        status,
      },
      { new: true }
    );

    if (!updatedTrip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      data: updatedTrip,
    });
  } catch (error) {
    console.error("EDIT TRIP ERROR:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ======================================
// ✅ Get All Trips
// ======================================
const getAllTripsCtrl = async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate("driver")
      .populate("orders.order_id")
      .lean();

    const updatedTrips = trips.map((trip) => {
      const driver = trip.driver;
      let fullTruck = null;
      if (driver?.trucks?.length) {
        fullTruck = driver.trucks.find(
          (t) => t._id.toString() === trip.truck.toString()
        );
      }
      return {
        ...trip,
        driver,
        selectedTruck: fullTruck || null,
      };
    });

    res.status(200).json({ success: true, data: updatedTrips });
  } catch (error) {
    console.error("GET ALL TRIPS ERROR:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ======================================
// ✅ Get Single Trip
// ======================================
const getSingleTripCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findById(id)
      .populate("driver")
      .populate({
        path: "orders.order_id",
        populate: { path: "store", model: "auth" },
      })
      .lean();

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    const driver = trip.driver;
    let fullTruck = null;
    if (driver?.trucks?.length) {
      fullTruck = driver.trucks.find(
        (t) => t._id.toString() === trip.truck.toString()
      );
    }

    // 🧩 Combine populated order_id info with trip.orders capacity
    const mergedOrders = trip.orders.map((o) => ({
      ...o,
      orderData: o.order_id, // populated Order
      store: o.order_id?.store || null,
    }));

    res.status(200).json({
      success: true,
      data: {
        ...trip,
        orders: mergedOrders,
        selectedTruck: fullTruck || null,
      },
    });
  } catch (error) {
    console.error("GET SINGLE TRIP ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


module.exports = {
  createTripCtrl,
  editTripCtrl,
  getAllTripsCtrl,
  getSingleTripCtrl,
};
