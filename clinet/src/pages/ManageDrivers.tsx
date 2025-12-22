import React, { useState, useEffect } from "react";
import DriverModal from "./DriverModal";
import DriversList from "./DriversList";
import { getAllDriversAPI } from "@/services2/operations/driverAndTruck";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

const ManageDrivers = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const token = useSelector((state: RootState) => state.auth.token);

  const fetchDrivers = async () => {
    const data = await getAllDriversAPI(token);
    setDrivers(data);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const openAddModal = () => {
    setEditDriver(null);
    setIsModalOpen(true);
  };

  const openEditModal = (driver) => {
    setEditDriver(driver);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Drivers</h1>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Add Driver
        </button>
      </div>

      <DriversList drivers={drivers} onEdit={openEditModal} />

      <DriverModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editData={editDriver}
        fetchDrivers={fetchDrivers} 
      />
    </div>
  );
};

export default ManageDrivers;
