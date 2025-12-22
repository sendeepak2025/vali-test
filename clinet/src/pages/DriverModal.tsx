import React, { useEffect, useState } from "react";
import { addDriverAPI, updateDriverAPI } from "@/services2/operations/driverAndTruck";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

const DriverModal = ({ isOpen, onClose, editData, fetchDrivers }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    license_number: "",
    license_expiry_date: "",
    active: true,
    trucks: [], // array of truck objects
  });

  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    if (editData) {
      setFormData({
        ...editData,
        trucks: editData.trucks || [],
      });
    } else {
      setFormData({
        name: "",
        phone: "",
        license_number: "",
        license_expiry_date: "",
        active: true,
        trucks: [],
      });
    }
  }, [editData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTruckChange = (index, field, value) => {
    const updatedTrucks = [...formData.trucks];
    if (field === "capacity_kg" || field === "capacity_m3") {
      updatedTrucks[index][field] = Number(value);
    } else if (field === "active") {
      updatedTrucks[index][field] = value;
    } else {
      updatedTrucks[index][field] = value;
    }
    setFormData((prev) => ({ ...prev, trucks: updatedTrucks }));
  };

  const addTruck = () => {
    setFormData((prev) => ({
      ...prev,
      trucks: [
        ...prev.trucks,
        { truck_number: "", capacity_kg: 0, capacity_m3: 0, active: true },
      ],
    }));
  };

  const removeTruck = (index) => {
    const updatedTrucks = [...formData.trucks];
    updatedTrucks.splice(index, 1);
    setFormData((prev) => ({ ...prev, trucks: updatedTrucks }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editData) {
      await updateDriverAPI(editData._id, formData, token)();
    } else {
      await addDriverAPI(formData, token);
    }
    await fetchDrivers();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-md w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-6">{editData ? "Edit" : "Add"} Driver</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Driver Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">License Number</label>
              <input
                type="text"
                name="license_number"
                value={formData.license_number}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">License Expiry</label>
              <input
                type="date"
                name="license_expiry_date"
                value={formData.license_expiry_date?.slice(0, 10) || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
                className="h-5 w-5"
              />
              <label className="text-sm font-medium">Active</label>
            </div>
          </div>

          {/* Trucks */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Trucks</label>
            {formData.trucks.map((truck, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 items-center">
                <div>
                  <label className="block text-xs font-medium">Truck Number</label>
                  <input
                    type="text"
                    value={truck.truck_number}
                    onChange={(e) => handleTruckChange(index, "truck_number", e.target.value)}
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium">Capacity (lbs)</label>
                  <input
                    type="number"
                    value={truck.capacity_kg}
                    onChange={(e) => handleTruckChange(index, "capacity_kg", e.target.value)}
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium">Box size</label>
                  <input
                    type="number"
                    value={truck.capacity_m3}
                    onChange={(e) => handleTruckChange(index, "capacity_m3", e.target.value)}
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div className="flex items-center gap-1 mt-4 md:mt-0">
                  <input
                    type="checkbox"
                    checked={truck.active}
                    onChange={(e) => handleTruckChange(index, "active", e.target.checked)}
                    className="h-5 w-5"
                  />
                  <label className="text-sm font-medium">Active</label>
                </div>

                <div className="mt-4 md:mt-0">
                  <button
                    type="button"
                    onClick={() => removeTruck(index)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addTruck}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 mt-2"
            >
              Add Truck
            </button>
          </div>

          {/* Form Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editData ? "Update" : "Add"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default DriverModal;
