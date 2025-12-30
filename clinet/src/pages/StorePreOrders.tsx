import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "@/redux/store";
import { getAllPreOrderAPI } from "@/services2/operations/preOrder";

const StorePreOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth?.token ?? null);

const fetchOrders = async (page = 1, searchQuery = "") => {
  if (!token) {
    return;
  }
  setLoading(true);
  try {
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    if (searchQuery) queryParams.append("search", searchQuery);

    const data = await getAllPreOrderAPI(token, queryParams.toString());

    // Filter orders where confirmed === false
    const unconfirmedOrders = (data.preOrders || []).filter(
      (order: any) => order.confirmed === false
    );

    setOrders(unconfirmedOrders);
    setCurrentPage(data.currentPage);
    setTotalPages(data.pages);
  } catch (err) {
    console.error("Error fetching preorders:", err);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage, token]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrders(1, search);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">My PreOrders</h1>

      <form
        onSubmit={handleSearch}
        className="flex flex-col sm:flex-row items-center gap-3 mb-6"
      >
        <input
          type="text"
          placeholder="Search by Order Number"
          className="flex-1 border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition"
        >
          Search
        </button>
      </form>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No orders found.</div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Order Number</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Store</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order, idx) => (
                <tr key={order._id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{order.preOrderNumber}</td>
                  <td className="px-4 py-2">{order.store?.storeName || "N/A"}</td>
                  <td className="px-4 py-2">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        })
                      : "N/A"}
                  </td>
                  <td className="px-4 py-2">${Number(order.total).toFixed(2)}</td>
                  <td className="px-4 py-2 capitalize">{order.status}</td>
                  <td className="px-4 py-2">
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition"
                      onClick={() => navigate(`/store/pre-order/${order._id}`)}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Prev
              </button>
              <span className="px-3 py-1 border rounded-md">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StorePreOrders;
