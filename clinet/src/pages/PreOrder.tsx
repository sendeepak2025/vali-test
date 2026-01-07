import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { RootState } from "@/redux/store";
import { getAllPreOrderAPI, getSinglePreOrderAPI, confirmPreOrderAPI } from "@/services2/operations/preOrder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Loader2, Eye, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

const PreOrder = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);

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

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage, token]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrders(1, search);
  };

  const handleViewOrder = async (orderId: string) => {
    setLoadingOrderDetails(true);
    setShowViewModal(true);
    try {
      const orderData = await getSinglePreOrderAPI(orderId, token);
      console.log("PreOrder Data:", orderData); // Debug log
      setSelectedOrder(orderData);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
      setShowViewModal(false);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    const result = await Swal.fire({
      title: "Confirm PreOrder?",
      text: "This will convert the PreOrder to a regular Order",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, Confirm!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setConfirmingOrder(true);
      try {
        const response = await confirmPreOrderAPI(token, orderId);
        if (response) {
          toast.success("PreOrder confirmed successfully!");
          fetchOrders(currentPage, search);
          setShowViewModal(false);
        }
      } catch (error) {
        console.error("Error confirming order:", error);
      } finally {
        setConfirmingOrder(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      confirmed: "bg-green-100 text-green-800 border-green-300",
      cancelled: "bg-red-100 text-red-800 border-red-300",
      completed: "bg-blue-100 text-blue-800 border-blue-300",
    };
    
    return (
      <Badge 
        variant="outline" 
        className={`${statusColors[status?.toLowerCase()] || "bg-gray-100 text-gray-800"} capitalize`}
      >
        {status || "pending"}
      </Badge>
    );
  };

  return (
    <div className="flex overflow-hidden h-screen">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Card className="bg-white shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">PreOrders</h1>
                <div className="flex gap-3 items-center">
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by Order Number"
                        className="pl-10 w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <Button type="submit" variant="outline">
                      Search
                    </Button>
                  </form>
                  <Button
                    onClick={() => navigate("/admin/pre-order/create")}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    + Create PreOrder
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Number
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Store Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Confirm to Order
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.length > 0 ? (
                        orders.map((order, idx) => (
                          <tr
                            key={order._id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(currentPage - 1) * 10 + idx + 1}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {order.preOrderNumber}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {order.store?.storeName || "N/A"}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "2-digit",
                                    year: "numeric",
                                  })
                                : "N/A"}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {Number(order.total).toFixed(2)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              {getStatusBadge(order.status)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              {order.status?.toLowerCase() === "pending" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-600 text-green-600 hover:bg-green-50"
                                  onClick={() => handleConfirmOrder(order._id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Confirm
                                </Button>
                              ) : order.status?.toLowerCase() === "confirmed" ? (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Confirmed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                                  Not Confirmed
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                  onClick={() => handleViewOrder(order._id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => navigate(`/admin/pre-order/${order._id}`)}
                                >
                                  Update
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                            No preorders found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-6 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* View PreOrder Modal */}
          <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  PreOrder Details
                </DialogTitle>
                <DialogDescription>
                  View complete information about this preorder
                </DialogDescription>
              </DialogHeader>

              {loadingOrderDetails ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                </div>
              ) : selectedOrder ? (
                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Order Number</p>
                      <p className="font-semibold">{selectedOrder.preOrderNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Store Name</p>
                      <p className="font-semibold">{selectedOrder.store?.storeName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-semibold">
                        {selectedOrder.createdAt
                          ? new Date(selectedOrder.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Billing Address */}
                  {selectedOrder.billingAddress && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold mb-2">Billing Address</h3>
                      <p className="text-sm">{selectedOrder.billingAddress.name}</p>
                      <p className="text-sm">{selectedOrder.billingAddress.address}</p>
                      <p className="text-sm">
                        {selectedOrder.billingAddress.city}, {selectedOrder.billingAddress.state}{" "}
                        {selectedOrder.billingAddress.zipCode}
                      </p>
                      {selectedOrder.billingAddress.phone && (
                        <p className="text-sm">Phone: {selectedOrder.billingAddress.phone}</p>
                      )}
                    </div>
                  )}

                  {/* Products Table */}
                  <div>
                    <h3 className="font-semibold mb-3 text-lg">Products</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              #
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Product Name
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Price
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(selectedOrder.items || selectedOrder.products) && (selectedOrder.items || selectedOrder.products).length > 0 ? (
                            (selectedOrder.items || selectedOrder.products).map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{idx + 1}</td>
                                <td className="px-4 py-3 text-sm font-medium">
                                  {item.product?.name || item.productName || item.name || "N/A"}
                                </td>
                                <td className="px-4 py-3 text-sm text-right">{item.quantity || 0}</td>
                                <td className="px-4 py-3 text-sm text-right">
                                  ${Number(item.price || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-semibold">
                                  ${Number((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                No products found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t pt-4">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-semibold">
                            ${Number(selectedOrder.total - (selectedOrder.shippinCost || 0)).toFixed(2)}
                          </span>
                        </div>
                        {selectedOrder.shippinCost > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Shipping:</span>
                            <span className="font-semibold">
                              ${Number(selectedOrder.shippinCost).toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                          <span>Total:</span>
                          <span className="text-orange-600">
                            ${Number(selectedOrder.total).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h3 className="font-semibold mb-2">Notes</h3>
                      <p className="text-sm">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No order details available
                </div>
              )}

              <DialogFooter className="gap-2">
                
                <Button
                  variant="outline"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default PreOrder;
