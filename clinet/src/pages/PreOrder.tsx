import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { RootState } from "@/redux/store";
import { getAllPreOrderAPI } from "@/services2/operations/preOrder";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PreOrder = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth?.token ?? null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const fetchOrders = async (page = 1, searchQuery = "") => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      if (searchQuery) queryParams.append("search", searchQuery);

      const data = await getAllPreOrderAPI(token, queryParams.toString());
      setOrders(data.preOrders);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders only on page change or token change
  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage, token]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrders(1, search); // fetch only on search button click
  };

  return (
    <div className="flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">PreOrders</h1>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search by Order Number"
                className="border p-2 rounded-md"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Search
              </button>
            </form>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length > 0 ? (
                  orders.map((order, idx) => (
                    <TableRow
                      key={order._id}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{order.preOrderNumber}</TableCell>
                      <TableCell>{order.store?.storeName || "N/A"}</TableCell>
                      <TableCell>
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })
                          : "N/A"}
                      </TableCell>
<TableCell>{Number(order.total).toFixed(2)}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>
                        <button
                          className="bg-green-600 text-white px-3 py-1 rounded-md"
                          onClick={() => navigate(`/admin/pre-order/${order._id}`)}
                        >
                          Update
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              <button
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md"
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Prev
              </button>
              <span className="px-3 py-1 border rounded-md">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md"
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PreOrder;
