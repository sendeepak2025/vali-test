import React, { useEffect, useState } from "react";
import { getTripApi } from "@/services2/operations/trips";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import TripPDF from "./TripPDF";

const SingleTripModal = ({ id, onClose }) => {
  const token = useSelector((state: RootState) => state.auth.token);
  const [trip, setTrip] = useState(null);
  const [storeOrdersCount, setStoreOrdersCount] = useState([]);

  useEffect(() => {
    if (!id) return;

    const fetchTrip = async () => {
      const data = await getTripApi(token, id);
      setTrip(data.data);

      // ✅ Count orders per store
      const storeCountMap = {};
      data.data.orders.forEach((order) => {
        const storeName = order.store?.storeName || "Unknown Store";
        storeCountMap[storeName] = (storeCountMap[storeName] || 0) + 1;
      });
      setStoreOrdersCount(
        Object.entries(storeCountMap).map(([storeName, count]) => ({
          storeName,
          count,
        }))
      );
    };

    fetchTrip();
  }, [id, token]);

  if (!trip)
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-5 relative">
          <p>Loading trip details...</p>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 overflow-auto">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-5 relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          Trip Preview - {trip._id}
        </h2>

        <button
          className="absolute right-3 top-3 text-red-600 text-xl"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Route & Date */}
        <div className="mb-4">
          <p>
            <b>Route:</b> {trip.route.from} → {trip.route.to}
          </p>
          <p>
            <b>Date:</b> {new Date(trip.date).toLocaleDateString()}
          </p>
          <p>
            <b>Status:</b> {trip.status}
          </p>
        </div>

        {/* Driver */}
        <div className="mb-4 border p-3 rounded-lg">
          <h3 className="font-semibold mb-2">Driver Details</h3>
          <p>
            <b>Name:</b> {trip.driver?.name}
          </p>
          <p>
            <b>Phone:</b> {trip.driver?.phone}
          </p>
          <p>
            <b>License No:</b> {trip.driver?.license_number}
          </p>
          <p>
            <b>License Expiry:</b>{" "}
            {trip.driver?.license_expiry_date
              ? new Date(trip.driver.license_expiry_date).toLocaleDateString()
              : "N/A"}
          </p>
        </div>

        {/* Truck */}
        <div className="mb-4 border p-3 rounded-lg">
          <h3 className="font-semibold mb-2">Truck Details</h3>
          <p>
            <b>Truck Number:</b> {trip.selectedTruck?.truck_number}
          </p>
          <p>
            <b>Capacity:</b>{" "}
            {trip.selectedTruck
              ? `${trip.selectedTruck.capacity_kg} kg / ${trip.selectedTruck.capacity_m3} m³`
              : "N/A"}
          </p>
        </div>

        {/* ✅ Orders Count per Store */}
        <div className="mb-4 border p-3 rounded-lg">
          <h3 className="font-semibold mb-2">Orders Per Store</h3>
          {storeOrdersCount.map((store) => (
            <p key={store.storeName}>
              <b>{store.storeName}:</b> {store.count} order(s)
            </p>
          ))}
        </div>

        {/* ✅ Order List with Capacities + Order Numbers */}
        <div className="mb-4 border p-3 rounded-lg">
          <h3 className="font-semibold mb-2">Order Details</h3>
          {trip.orders && trip.orders.length > 0 ? (
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">Order Number</th>
                  <th className="border px-2 py-1 text-left">Store</th>
                  <th className="border px-2 py-1 text-right">Capacity (lbs)</th>
                  <th className="border px-2 py-1 text-right">Box Size</th>
                </tr>
              </thead>
              <tbody>
                {trip.orders.map((o) => (
                  <tr key={o._id}>
                    <td className="border px-2 py-1">
                      {o.orderData?.orderNumber ||
                        o.order_id?.orderNumber ||
                        "-"}
                    </td>
                    <td className="border px-2 py-1">
                      {o.store?.storeName || "Unknown"}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {o.capacity_kg ?? 0}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {o.capacity_m3 ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No orders found in this trip.</p>
          )}
        </div>

        {/* Trip Totals */}
        <div className="mb-4">
          <p>
            <b>Trip Capacity:</b> {trip.capacity_kg} kg / {trip.capacity_m3} m³
          </p>
        </div>

        {/* PDF Button */}
        <TripPDF trip={trip} />
      </div>
    </div>
  );
};

export default SingleTripModal;
