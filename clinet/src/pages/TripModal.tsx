import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { addTripAPI, updateTripAPI } from "@/services2/operations/trips";
import { getAllDriversAPI } from "@/services2/operations/driverAndTruck";
import { getAllOrderAPI } from "@/services2/operations/order";
import { Loader2, MapPin, Calendar, User, Truck, Package, ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { calculateTripWeightAPI } from "@/services2/operations/product";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";

const TRIP_STATUSES = ["Planned", "On Route", "Delivered", "Cancelled"];

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: any;
  fetchTrips: () => void;
}

const TripModal = ({ isOpen, onClose, editData, fetchTrips }: TripModalProps) => {
  console.log(editData, "trip data")

  const token = useSelector((state: RootState) => state.auth.token);

  const [formData, setFormData] = useState({
    routeFrom: "",
    routeTo: "",
    date: "",
    driver: "",
    truck: "",
    orders: [], 
    capacity_kg: 0,
    capacity_m3: 0,
    status: "Planned", 
  });

  const [drivers, setDrivers] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrdersDetails, setSelectedOrdersDetails] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOrdersDropdown, setShowOrdersDropdown] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pageSize = 100;
  const currentPage = 1;
  const paymentFilter = "all";
  const startDate = "";
  const endDate = "";
  const activeTab = "Regural";

  const fetchDrivers = async () => {
    const data = await getAllDriversAPI(token);
    setDrivers(data);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);


const calculateWeightForSelectedOrders = async (selectedIds: string[]) => {
  try {
    console.log("🟢 [calculateWeightForSelectedOrders] selectedIds:", selectedIds);

    const result = await calculateTripWeightAPI(selectedIds, token);
    if (!result) return;

    console.log("🧩 API Raw Result:", result);

    // ✅ Update overall totals
    setFormData((prev) => ({
      ...prev,
      capacity_kg: result.totalWeightKg || 0,
      capacity_m3: result.totalVolumeM3 || 0,
    }));

    // ✅ Replace selectedOrdersDetails directly
    const updatedOrders = result.orderWiseDetails?.map((o: any) => ({
      _id: o.orderId,
      capacity_kg: o.totalWeightKg || 0,
      capacity_m3: o.totalVolumeM3 || 0,
    })) || [];

    console.log("✅ [Updated Orders for State]:", updatedOrders);

    setSelectedOrdersDetails(updatedOrders);
  } catch (error) {
    console.error("❌ [calculateWeightForSelectedOrders] Error:", error);
  }
};






  const fetchSelectedOrdersDetails = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    try {
      setLoadingOrders(true);
      const params = new URLSearchParams();
      // Ensure orderIds is an array of strings
      const validOrderIds = orderIds.filter((id: any) => typeof id === 'string');
      if (validOrderIds.length === 0) {
        setSelectedOrdersDetails([]);
        setLoadingOrders(false);
        return;
      }
      params.append("orderIds", validOrderIds.join(","));

      const response = await getAllOrderAPI(token, params.toString());

      if (response && Array.isArray(response.orders)) {
        setSelectedOrdersDetails(
          response.orders.map((order: any) => ({
            id: order?._id,
            orderNumber: order?.orderNumber || `#${order._id.toString().slice(-5)}`,
            clientName: order.store?.storeName || "Unknown",
            ...order,
          }))
        );
      } else {
        setSelectedOrdersDetails([]);
      }
    } catch (error) {
      console.error("Error fetching selected orders details:", error);
    } finally {
      setLoadingOrders(false);
    }
  };


useEffect(() => {
    if (editData) {
        // ✅ FIX: Extract the actual Order ID (order_id._id)
        const initialOrderIds = (editData.orders || [])
            .map((order: any) => order.order_id?._id) // <-- FIX IS HERE
            .filter((id: any) => id); // Remove any null/undefined entries

        setFormData({
            routeFrom: editData.route.from,
            routeTo: editData.route.to,
            date: editData.date.slice(0, 10),
            driver: editData.driver._id,
            truck: editData.truck,
            orders: initialOrderIds, // Use the correct extracted Order IDs
            capacity_kg: editData.capacity_kg,
            capacity_m3: editData.capacity_m3,
            status: editData.status || "Planned",
        });

        if (initialOrderIds.length > 0) {
            // Note: fetchSelectedOrdersDetails is designed to fetch details for Order IDs
            fetchSelectedOrdersDetails(initialOrderIds);
            
            // Additionally, trigger the calculation to set the initial selectedOrdersDetails state
            // to be used by handleSubmit later.
            calculateWeightForSelectedOrders(initialOrderIds); 

        } else {
            setSelectedOrdersDetails([]);
        }
        
        const selectedDriver = drivers.find((d: any) => d._id === editData.driver._id);
        const activeTrucks = selectedDriver?.trucks.filter((t: any) => t.active) || [];
        setTrucks(activeTrucks);

    } 
}, [editData, drivers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "driver") {
      const selectedDriver = drivers.find((d: any) => d._id === value);
      const activeTrucks = selectedDriver?.trucks.filter((t: any) => t.active) || [];
      setTrucks(activeTrucks);
      setFormData((prev) => ({
        ...prev,
        truck: "",
        capacity_kg: 0,
        capacity_m3: 0,
      }));
    }

    if (name === "truck") {
      const selectedTruck = trucks.find((t: any) => t._id === value);
      if (selectedTruck) {
        setFormData((prev) => ({
          ...prev,
          truck: selectedTruck._id,
          capacity_kg: 0,
          capacity_m3: 0,
        }));
      }
    }
  };

  const handleLocationChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

 const toggleSelectOrder = (orderId: string) => {
  setFormData((prev) => {
    const isSelected = prev.orders.includes(orderId);
    const newOrders = isSelected
      ? prev.orders.filter((id) => id !== orderId)
      : [...prev.orders, orderId];

    // Fetch details if needed
    if (!isSelected && !selectedOrdersDetails.find((o: any) => o.id === orderId)) {
      fetchSelectedOrdersDetails([orderId]);
    }

    // Calculate after short delay to ensure updated state
    setTimeout(() => calculateWeightForSelectedOrders(newOrders), 300);

    return { ...prev, orders: newOrders };
  });
};


  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", pageSize.toString());
      params.append("paymentStatus", paymentFilter);
      if (searchQuery) params.append("search", searchQuery);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("orderType", activeTab);

      const response = await getAllOrderAPI(token, params.toString());

      if (response && Array.isArray(response.orders)) {
        setOrders(
          response.orders.map((order: any) => ({
            id: order?._id,
            orderNumber: order?.orderNumber || `#${order._id.toString().slice(-5)}`,
            clientName: order.store?.storeName || "Unknown",
            ...order,
          }))
        );
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleToggleOrdersDropdown = () => {
    setShowOrdersDropdown(!showOrdersDropdown);
    if (!showOrdersDropdown) {
      fetchOrders();
    }
  };

  const handleSearchOrders = () => fetchOrders();

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.routeFrom && formData.routeTo && formData.date;
      case 2:
        return formData.driver && formData.truck;
      case 3:
        return formData.orders.length > 0;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      toast({ 
        title: "Incomplete Information", 
        description: "Please fill all required fields before proceeding", 
        variant: "destructive" 
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 🟢 Prepare order-wise capacity array
      const formattedOrders = formData.orders.map((orderId: string) => {
        const orderDetail = selectedOrdersDetails.find(
          (o) => o._id?.toString() === orderId?.toString()
        );

        return {
          order_id: orderId,
          capacity_kg: Number(orderDetail?.capacity_kg || 0),
          capacity_m3: Number(orderDetail?.capacity_m3 || 0),
        };
      });

      const payload = {
        route: { from: formData.routeFrom, to: formData.routeTo },
        date: formData.date,
        driver: formData.driver,
        truck: formData.truck,
        orders: formattedOrders,
        capacity_kg: Number(formData.capacity_kg) || 0,
        capacity_m3: Number(formData.capacity_m3) || 0,
        status: formData.status,
      };

      if (editData) {
        await updateTripAPI(editData._id, payload, token)();
        toast({ title: "Success", description: "Trip updated successfully!" });
      } else {
        await addTripAPI(payload, token);
        toast({ title: "Success", description: "Trip created successfully!" });
      }

      fetchTrips();
      onClose();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to save trip. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };





  if (!isOpen) return null;

  const selectedTruck = trucks.find((t: any) => t._id === formData.truck);
  const selectedDriver = drivers.find((d: any) => d._id === formData.driver);

  // Combine the paginated list (orders) and the already selected orders details 
  const allOrdersForDropdown = [
    ...orders,
    ...selectedOrdersDetails.filter(
      (selectedOrder: any) => !orders.some((order: any) => order.id === selectedOrder.id)
    ),
  ];

  const getSelectedOrdersForDisplay = () => {
    return formData.orders.map(orderId => {
      const order = allOrdersForDropdown.find((o: any) => o.id === orderId);
      return order || { id: orderId, orderNumber: `#${orderId.slice(-5)}`, clientName: "Unknown" };
    });
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === step 
              ? 'bg-blue-600 text-white' 
              : currentStep > step 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-600'
          }`}>
            {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
          </div>
          {step < 4 && (
            <div className={`w-16 h-1 mx-2 ${
              currentStep > step ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-gray-800">Route & Schedule</h3>
        <p className="text-sm text-gray-600">Set your trip route and date</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Route From
          </label>
          <GooglePlacesAutocomplete
            value={formData.routeFrom}
            onChange={(value) => handleLocationChange("routeFrom", value)}
            placeholder="Enter starting location"
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            name="routeFrom"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Route To
          </label>
          <GooglePlacesAutocomplete
            value={formData.routeTo}
            onChange={(value) => handleLocationChange("routeTo", value)}
            placeholder="Enter destination"
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            name="routeTo"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Trip Date
          </label>
          <input 
            type="date" 
            name="date" 
            value={formData.date} 
            onChange={handleChange} 
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            required 
          />
        </div>

        {editData && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select 
              name="status" 
              value={formData.status} 
              onChange={handleChange} 
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              required
            >
              {TRIP_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <User className="w-12 h-12 text-blue-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-gray-800">Driver & Vehicle</h3>
        <p className="text-sm text-gray-600">Assign driver and truck for this trip</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Select Driver
          </label>
          <select 
            name="driver" 
            value={formData.driver} 
            onChange={handleChange} 
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            required
          >
            <option value="">Choose a driver</option>
            {drivers.map((d: any) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Truck className="w-4 h-4 inline mr-1" />
            Select Truck
          </label>
          <select 
            name="truck" 
            value={formData.truck} 
            onChange={handleChange} 
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            required
            disabled={!formData.driver}
          >
            <option value="">Choose a truck</option>
            {trucks.map((t: any) => (
              <option key={t._id} value={t._id}>{t.truck_number}</option>
            ))}
          </select>
          {!formData.driver && (
            <p className="text-sm text-gray-500 mt-1">Please select a driver first</p>
          )}
        </div>

        {selectedTruck && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Truck Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Capacity:</span>
                <span className="font-medium ml-2">{selectedTruck.capacity_kg} lbs</span>
              </div>
              <div>
                <span className="text-gray-600">Box Size:</span>
                <span className="font-medium ml-2">{selectedTruck.capacity_m3} m³</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Package className="w-12 h-12 text-blue-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-gray-800">Select Orders</h3>
        <p className="text-sm text-gray-600">Choose orders to include in this trip</p>
      </div>

      <div className="relative">
        <button 
          type="button" 
          onClick={handleToggleOrdersDropdown} 
          className="w-full border border-gray-300 p-3 rounded-lg text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
        >
          <span>
            {formData.orders.length > 0 
              ? `${formData.orders.length} Orders Selected` 
              : "Click to select orders"
            }
          </span>
          <Package className="w-4 h-4 text-gray-400" />
        </button>

        {showOrdersDropdown && (
          <div className="absolute z-50 w-full max-h-80 overflow-y-auto border border-gray-200 rounded-lg bg-white mt-2 shadow-lg">
            <div className="p-3 border-b border-gray-200">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Search orders..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="border border-gray-300 rounded px-3 py-2 flex-1 text-sm" 
                />
                <button 
                  type="button" 
                  onClick={handleSearchOrders} 
                  className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {loadingOrders ? (
                <div className="flex justify-center items-center h-20">
                  <Loader2 className="animate-spin w-6 h-6 text-blue-500" />
                </div>
              ) : allOrdersForDropdown.length > 0 ? (
                allOrdersForDropdown.map((o: any) => (
                  <div key={o.id} className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100">
                    <input 
                      type="checkbox" 
                      checked={formData.orders.includes(o.id)} 
                      onChange={() => toggleSelectOrder(o.id)} 
                      className="mr-3 w-4 h-4 text-blue-600" 
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{o.orderNumber}</div>
                      <div className="text-xs text-gray-500">{o.clientName}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 p-4 text-center">No orders found</p>
              )}
            </div>
          </div>
        )}
      </div>

      {formData.orders.length > 0 && (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-3">Selected Orders</h4>
            <div className="space-y-2">
              {getSelectedOrdersForDisplay().map((order: any) => (
                <div key={order.id} className="flex items-center justify-between bg-white p-2 rounded border">
                  <div>
                    <span className="font-medium text-sm">{order.orderNumber}</span>
                    <span className="text-xs text-gray-500 ml-2">{order.clientName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSelectOrder(order.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Weight (lbs)</label>
              <input 
                type="number" 
                readOnly 
                value={formData.capacity_kg} 
                className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Volume (m³)</label>
              <input 
                type="number" 
                readOnly 
                value={formData.capacity_m3} 
                className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50" 
              />
            </div>
          </div>

          {selectedTruck && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-800">Capacity Check</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Weight:</span>
                  <span className={`font-medium ml-2 ${
                    formData.capacity_kg > selectedTruck.capacity_kg ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formData.capacity_kg} / {selectedTruck.capacity_kg} lbs
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Volume:</span>
                  <span className={`font-medium ml-2 ${
                    formData.capacity_m3 > selectedTruck.capacity_m3 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formData.capacity_m3} / {selectedTruck.capacity_m3} m³
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-gray-800">Review Trip Details</h3>
        <p className="text-sm text-gray-600">Please review all information before creating the trip</p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Route Information
          </h4>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-600">From:</span> <span className="font-medium">{formData.routeFrom}</span></div>
            <div><span className="text-gray-600">To:</span> <span className="font-medium">{formData.routeTo}</span></div>
            <div><span className="text-gray-600">Date:</span> <span className="font-medium">{formData.date}</span></div>
            {editData && <div><span className="text-gray-600">Status:</span> <span className="font-medium">{formData.status}</span></div>}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <User className="w-4 h-4 mr-2" />
            Driver & Vehicle
          </h4>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-600">Driver:</span> <span className="font-medium">{selectedDriver?.name}</span></div>
            <div><span className="text-gray-600">Truck:</span> <span className="font-medium">{selectedTruck?.truck_number}</span></div>
            <div><span className="text-gray-600">Truck Capacity:</span> <span className="font-medium">{selectedTruck?.capacity_kg} lbs, {selectedTruck?.capacity_m3} m³</span></div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <Package className="w-4 h-4 mr-2" />
            Orders & Capacity
          </h4>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-600">Total Orders:</span> <span className="font-medium">{formData.orders.length}</span></div>
            <div><span className="text-gray-600">Total Weight:</span> <span className="font-medium">{formData.capacity_kg} lbs</span></div>
            <div><span className="text-gray-600">Total Volume:</span> <span className="font-medium">{formData.capacity_m3} m³</span></div>
          </div>
          
          {formData.orders.length > 0 && (
            <div className="mt-3">
              <span className="text-gray-600 text-sm">Selected Orders:</span>
              <div className="mt-2 space-y-1">
                {getSelectedOrdersForDisplay().map((order: any) => (
                  <div key={order.id} className="text-xs bg-white p-2 rounded border">
                    {order.orderNumber} - {order.clientName}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 text-center">
            {editData ? "Edit Trip" : "Create New Trip"}
          </h2>
        </div>

        <div className="p-6">
          {renderStepIndicator()}

          <div className="min-h-[400px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              {currentStep > 1 && (
                <button 
                  type="button" 
                  onClick={prevStep} 
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </button>
              )}
            </div>

            <div>
              {currentStep < 4 ? (
                <button 
                  type="button" 
                  onClick={nextStep} 
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editData ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {editData ? "Update Trip" : "Create Trip"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripModal;