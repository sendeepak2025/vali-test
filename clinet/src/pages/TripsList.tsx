import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SingleTripModal from "./SingleTripModal"; // import modal

const TripsList = ({ trips = [], onEdit }) => {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [previewTripId, setPreviewTripId] = useState(null);

  return (
    <div className="overflow-x-auto">

      {/* ================= ORDER VIEW MODAL ================= */}
      {selectedTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-5 relative">

            <h2 className="text-xl font-semibold mb-3">
              Orders for Trip #{selectedTrip?._id}
            </h2>

            <button
              className="absolute right-3 top-3 text-red-600 text-xl"
              onClick={() => setSelectedTrip(null)}
            >
              ✕
            </button>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedTrip?.orders?.length === 0 && <p>No orders found.</p>}

              {selectedTrip?.orders?.map((order) => (
                <div key={order?._id} className="border p-3 rounded-lg">
                  <p><b>Order ID:</b> {order?._id}</p>
                  <p><b>Client:</b> {order?.store || "N/A"}</p>
                  <p><b>Status:</b> {order?.status || "-"}</p>
                  <p><b>Total Items:</b> {order?.items?.length || 0}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ================= PREVIEW MODAL ================= */}
      {previewTripId && (
        <SingleTripModal id={previewTripId} onClose={() => setPreviewTripId(null)} />
      )}

      {/* ================= TRIPS TABLE ================= */}
      <Table className="min-w-full border rounded-lg overflow-hidden">
        <TableHeader className="bg-gray-200 text-sm font-semibold">
          <TableRow>
            <TableHead>Driver</TableHead>
            <TableHead>Truck</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {trips?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center p-4">
                No trips found
              </TableCell>
            </TableRow>
          ) : (
            trips?.map((trip) => {
              const driver = trip?.driver;
              const truck = trip?.selectedTruck;

              return (
                <TableRow key={trip?._id} className="text-sm">

                  <TableCell>
                    <div className="font-semibold">{driver?.name || "No Driver"}</div>
                    <div className="text-xs text-gray-500">{driver?.phone || "-"}</div>
                  </TableCell>

                  <TableCell>
                    <div className="text-blue-600 font-semibold">
                      {truck?.truck_number || "No Truck"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {truck?.capacity_kg ? `${truck.capacity_kg} kg / ${truck.capacity_m3 || 0} m³` : "-"}
                    </div>
                  </TableCell>

                  <TableCell>
                    {trip?.route?.from || "-"} → {trip?.route?.to || "-"}
                  </TableCell>

                  <TableCell>
                    {trip?.date ? new Date(trip.date).toLocaleDateString() : "--"}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-700">
                        {trip?.orders?.length || 0}
                      </span>
                      {trip?.orders?.length > 0 && (
                        <button
                          onClick={() => setSelectedTrip(trip)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {trip?.capacity_kg || 0} kg / {trip?.capacity_m3 || 0} m³
                  </TableCell>

                  <TableCell>{trip?.status || "-"}</TableCell>

                  <TableCell className="flex gap-2">
                    <button
                      onClick={() => onEdit?.(trip)}
                      className="px-2 py-1 bg-yellow-500 text-white rounded text-xs"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => setPreviewTripId(trip._id)}
                      className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                    >
                      Preview
                    </button>
                  </TableCell>

                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TripsList;
