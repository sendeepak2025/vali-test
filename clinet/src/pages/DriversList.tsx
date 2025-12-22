import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Truck details modal
const TrucksModal = ({ isOpen, onClose, trucks }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-md w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Trucks Details</h2>
        {trucks.length === 0 ? (
          <p>No trucks found</p>
        ) : (
          <ul className="space-y-3">
            {trucks.map((truck) => (
              <li key={truck._id} className="border p-3 rounded">
                <div><strong>Truck Number:</strong> {truck.truck_number}</div>
                <div><strong>Capacity:</strong> {truck.capacity_kg} kg, {truck.capacity_m3} m³</div>
                <div><strong>Active:</strong> {truck.active ? "Yes" : "No"}</div>
                <div><strong>Created At:</strong> {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(truck.createdAt))}</div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const formatDateTime = (isoDate) => {
  if (!isoDate) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
};

const DriversList = ({ drivers, onEdit }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTrucks, setSelectedTrucks] = useState([]);

  const handleViewTrucks = (trucks) => {
    setSelectedTrucks(trucks);
    setModalOpen(true);
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>License Number</TableHead>
            <TableHead>License Expiry</TableHead>
            <TableHead>Driver Created</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Trucks</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                No drivers found
              </TableCell>
            </TableRow>
          ) : (
            drivers.map((driver) => (
              <TableRow key={driver._id} className="hover:bg-gray-50">
                <TableCell>{driver.name}</TableCell>
                <TableCell>{driver.phone}</TableCell>
                <TableCell>{driver.license_number}</TableCell>
                <TableCell>{formatDateTime(driver.license_expiry_date)}</TableCell>
                <TableCell>{formatDateTime(driver.createdAt)}</TableCell>
                <TableCell>{driver.active ? "Yes" : "No"}</TableCell>
                <TableCell>
                  {driver.trucks.length} {driver.trucks.length === 1 ? "Truck" : "Trucks"}{" "}
                  {driver.trucks.length > 0 && (
                    <button
                      onClick={() => handleViewTrucks(driver.trucks)}
                      className="ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      View
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => onEdit(driver)}
                    className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Trucks Modal */}
      <TrucksModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        trucks={selectedTrucks}
      />
    </div>
  );
};

export default DriversList;
