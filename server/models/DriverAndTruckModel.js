const mongoose = require("mongoose");

const TruckSchema = new mongoose.Schema(
  {
    truck_number: {
      type: String,
      required: true,
      trim: true,
    },
    capacity_kg: {
      type: Number,
      required: true,
    },
    capacity_m3: {
      type: Number,
      default: 0, 
    },
    active: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

const DriverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    license_number: {
      type: String,
      required: true,
      trim: true,
    },

    license_expiry_date: {
      type: Date,
      required: true,
    },

    trucks: [TruckSchema],

    active: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", DriverSchema);
