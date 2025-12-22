import React, { useState, useEffect } from "react";
import TripModal from "./TripModal";
import TripsList from "./TripsList";
import { getAllTripsAPI } from "@/services2/operations/trips";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

const ManageTrips = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  const [trips, setTrips] = useState([]);
  const token = useSelector((state: RootState) => state.auth.token);

  const fetchTrips = async () => {
    const data = await getAllTripsAPI(token);
    setTrips(data?.data);
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const openAddModal = () => {
    setEditTrip(null);
    setIsModalOpen(true);
  };

  const openEditModal = (trip) => {
    setEditTrip(trip);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Trips</h1>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Add Trip
        </button>
      </div>

      <TripsList trips={trips} onEdit={openEditModal} />

      <TripModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editData={editTrip}
        fetchTrips={fetchTrips}
      />
    </div>
  );
};

export default ManageTrips;
