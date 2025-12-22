"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { PriceListTemplate, InvoiceData } from "@/components/inventory/forms/formTypes"
import { formatCurrency } from "@/utils/formatters"
import { Check, FileText, Loader2, ShoppingCart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { exportInvoiceToPDF } from "@/utils/pdf"
import { getAllStoresAPI } from "@/services2/operations/auth"
import { getSinglePriceAPI } from "@/services2/operations/priceList"
import Select2 from "react-select"
import { createOrderAPI, getUserLatestOrdersAPI } from "@/services2/operations/order"
import { createPreOrderAPI,  } from "@/services2/operations/preOrder"
import { getUserAPI } from "@/services2/operations/auth"
import type { RootState } from "@/redux/store"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import StoreRegistration from "./StoreRegistration"
import AddressForm from "@/components/AddressFields"
import { getAllProductAPI } from "@/services2/operations/product"
import { useLocation } from 'react-router-dom'; // or usePathname() if you're using Next.js
import {
  
  getAllOrderAPI
} from "@/services2/operations/order"
const CreateOrderModalStore = () => {
  const user = useSelector((state: RootState) => state.auth?.user ?? null)
  const [selectedStore, setSelectedStore] = useState<{
    label: string
    value: string
  } | null>(user && user.role !== "admin" ? { label: user.storeName || user.name, value: user._id } : null)

  const [email, setEmail] = useState("")
  const [template, setTemlate] = useState<PriceListTemplate | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isGroupOpen, setIsGroupOpen] = useState(false)

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [priceType, setPriceType] = useState({}); // 'unit' or 'box'

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderConfirmed, setOrderConfirmed] = useState(false)
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [isReviewMode, setIsReviewMode] = useState(false)
  const { toast } = useToast()
  const [stores, setStores] = useState([])
  const token = useSelector((state: RootState) => state.auth?.token ?? null)
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(true)
  const urlParams = new URLSearchParams(window.location.search)
  const storeId = urlParams.get("storeId")
  const templateId = urlParams.get("templateId")
  // const priceCategory = urlParams.get("cat") || "price"
  const [priceCategory,setPriceCategory] = useState("pricePerBox")
  const navigate = useNavigate()
  const location = useLocation(); // React Router v6+
  const [nextWeek, setNextWeek] = useState(false);
  const [userOrders, setUserOrders] = useState([])
  const [purchasedProductIds, setPurchasedProductIds] = useState(new Set())
const [preOrderNum, setPreOrderNum] = useState("");
  useEffect(() => {
    if (location.pathname.includes('/store/nextweek')) {
      setNextWeek(true);
    }
  }, [location.pathname]);
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [storeLoading, setStoreLoading] = useState(false)
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  })
  const [billingAddress, setBillingAddress] = useState({
    name: "",
    email: "",
    address: "",
    phone: "",
    city: "",
    postalCode: "",
    country: "",
  })

  useEffect(() => {
    if (nextWeek) {
      setShippingAddress({
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        address: "123 Dummy Street",
        city: "Dummy City",
        postalCode: "123456",
        country: "Dummyland",
      });
  
      setBillingAddress({
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        address: "123 Dummy Street",
        city: "Dummy City",
        postalCode: "123456",
        country: "Dummyland",
      });
    }
  }, [nextWeek]);

  
  
  const [sameAsBilling, setSameAsBilling] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(true)
  const [shippinC, setShippinC] = useState(0)
  // const [priceCategory, setPriceCate] = useState("aPrice")

  const fetchProducts = async () => {
    try {
      const response = await getAllProductAPI()
      if (response) {
        const updatedProducts = response.map((product) => ({
          ...product,
          id: product._id,
          lastUpdated: product?.updatedAt,
        }))
        setProducts(updatedProducts)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const fetchUserOrders = async (storeId) => {
    try {
      const response = await getUserLatestOrdersAPI(storeId, 5);
      
      if (response && response.success) {
        setUserOrders(response.orders || []);
        
        // Use the purchasedProductIds from backend
        const productIds = new Set(response.purchasedProductIds || []);
        setPurchasedProductIds(productIds);
        
        console.log(`✅ Fetched ${response.orders?.length || 0} latest orders`);
        console.log(`📦 Found ${productIds.size} unique purchased products`);
      }
    } catch (error) {
      console.error("Error fetching user orders:", error);
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const categories = ["all", ...new Set(template?.products.map((product) => product.category || "Uncategorized"))]

  const fetchStores = async () => {
    try {
      const storesData = await getAllStoresAPI()
      const formattedStores = storesData.map(({ _id, storeName }) => ({
        value: _id,
        label: storeName,
      }))

      setStores(formattedStores)
    } catch (error) {
      console.error("Error fetching stores:", error)
    }
  }

  useEffect(() => {
    const fetchTmplate = async () => {
      try {
        const tempLate = await getSinglePriceAPI(templateId)
        console.log(tempLate)
        setTemlate(tempLate)
      } catch (error) {
        console.error("Error fetching stores:", error)
      } finally {
        setTemplateLoading(false)
      }
    }
    fetchTmplate()
    fetchStores()
    
    // If user is already logged in, fetch their orders
    if (user && user._id) {
      fetchUserOrders(user._id);
    }
  }, [])

 const handleFindUser = async (userEmail) => {
    if (!userEmail) return;

    setStoreLoading(true);
    try {
      const response = await getUserAPI({ email: userEmail, setIsGroupOpen });

      if (!response) {
        setIsGroupOpen(true);
        return;
      }

      if (response.priceCategory === "price") {
        setPriceCategory("pricePerBox");
      } else {
        setPriceCategory(response.priceCategory);
      }

      setShippinC(response.shippingCost);

      setBillingAddress({
        name: response.ownerName || "",
        email: response.email || "",
        phone: response.phone || "",
        address: response.address || "",
        city: response.city || "",
        postalCode: response.zipCode || "",
        country: response.state || "",
      });

      setSelectedStore({
        label: response.storeName,
        value: response._id,
      });

      // Fetch user's latest orders to sort products
      await fetchUserOrders(response._id);
    } catch (err) {
      console.error("Error fetching user:", err);
      setIsGroupOpen(true);
    } finally {
      setStoreLoading(false);
    }
  };

  // ✅ Extract email from query and call function with it
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const emailFromQuery = query.get("email");

    if (emailFromQuery) {
      setEmail(emailFromQuery);            // store in state if needed
      handleFindUser(emailFromQuery);      // pass directly to function
    }
  }, [location.search]);
   

  const handleQuantityChange = (productId, value) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: parseInt(value) || 0,
    }));
  };

  const handlePriceTypeChange = (productId, value) => {
    setPriceType((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  const calculateSubtotal = () => {
    if (!template) return 0;

    return template.products.reduce((total, product) => {
      const quantity = quantities[product.id] || 0;
      const type = priceType[product.id] || "box"; // Default to 'box'
      const price = type === "unit" ? product.price : product[priceCategory] ||product.pricePerBox;

      return total + price * quantity;
    }, 0);
  };


  const calculateShipping = () => {
    if (!template) return 0

    let maxShipping = 0

    template.products.forEach((product) => {
      const quantity = quantities[product.id] || 0
      if (quantity <= 0) return

      const matchedProduct = products.find((p) => p.id === product.id)
      const shippingCost = matchedProduct?.shippinCost || 0

      if (shippingCost > maxShipping) {
        maxShipping = shippingCost
      }
    })

    // return maxShipping
    // return shippinC
    return 0
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping()
  }

  const handleCreateOrder = async () => {
    if (!template || !selectedStore) return
    const requiredFields = ["name", "email", "phone", "address", "city", "postalCode", "country"]
    const checkEmptyFields = (address: any) => requiredFields.some((field) => !address?.[field])

    const billingInvalid = checkEmptyFields(billingAddress)
    const shippingInvalid = sameAsBilling ? false : checkEmptyFields(shippingAddress)

    if (billingInvalid || shippingInvalid) {
      toast({
        title: "Incomplete Address",
        description: "Please fill all required address fields.",
        variant: "destructive",
      })

      return
    }

    const orderedProducts = template.products
      .filter((product) => (quantities[product.id] || 0) > 0)
      .map((product) => {
        const quantity = quantities[product.id] || 0;
        const pricingType = priceType[product.id] || "box"; // default to 'box'

        const unitPrice = pricingType === "unit" ? product.price : product[priceCategory] || product.pricePerBox;
 
      
        return {
          product: product.id,
          name: product.name,
          price: unitPrice,
          quantity: quantity,
          pricingType: pricingType,
          productId: product.id,
          productName: product.name,
          unitPrice: unitPrice,
          total: unitPrice * quantity,
        };
      });


    if (orderedProducts.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to create an order",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    const selectedStoreName = stores.find((store) => store.id === selectedStore)?.name || ""
    const totalAmount = calculateTotal()
    const generateOrderNumber = () => {
      const randomNumber = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit random number
      return `${randomNumber}`;
  };
  const ONo = generateOrderNumber()
console.log(ONo)

    const order = {
      id: `${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`,
      date: new Date().toISOString(),
      clientId: selectedStore,
      clientName: selectedStore?.label,
      items: orderedProducts,
      total: totalAmount,
      status: "pending" as const,
      paymentStatus: "pending" as const,
      subtotal: totalAmount,
      shippinCost: calculateShipping(),
      store: selectedStore.value,
      billingAddress,
      orderType:nextWeek ? "NextWeek" :"Regural",
      // orderNumber :ONo,

      shippingAddress: nextWeek ? billingAddress : sameAsBilling ? billingAddress : shippingAddress,
    }
console.log(order)


const orderRes = await createPreOrderAPI(order, token)

console.log(orderRes)

setPreOrderNum(orderRes.preOrderNumber)
    if(nextWeek){
      navigate("/")
      return
    }

    setOrderDetails(order)
    setOrderConfirmed(true)

    try {
      const invoiceData: InvoiceData = {
        invoiceNumber: ONo,
        customerName: selectedStore.label,
        items: orderedProducts.map((item) => ({
          productName: item.productName || item.name,
          price: item.unitPrice,
          quantity: item.quantity,
          total: (item.unitPrice) * item.quantity,
        })),
        total: order.total,
        date: order.date,
        shippinCost: calculateShipping(),
      }
console.log(invoiceData)
exportInvoiceToPDF({
  id: orderRes.preOrderNumber as any,
  clientId: (orderRes.store as any)._id,
  clientName: (orderRes.store as any).storeName,
  shippinCost: orderRes.shippinCost || 0,
  date: orderRes.createdAt,
  shippingAddress: orderRes?.shippingAddress,
  billingAddress: orderRes?.billingAddress,
  status: orderRes.status,
  items: orderRes.items,
  total: orderRes.total,
  paymentStatus: orderRes.paymentStatus || "pending",
  subtotal: orderRes.total,
  store: orderRes.store,
  paymentDetails:orderRes.paymentDetails || {}
});
    } catch (error) {
      console.error("Error generating invoice PDF:", error)
    }

    toast({
      title: "Order Created Successfully",
      description: `Order ${order.id} has been created for ${selectedStore.label}`,
    })

    setIsSubmitting(false)
  }




  const filteredProducts = template?.products?.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory

    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    // If category is "all", sort by purchased products first
    if (selectedCategory === "all") {
      const aIsPurchased = purchasedProductIds.has(a.id);
      const bIsPurchased = purchasedProductIds.has(b.id);
      
      // Purchased products come first
      if (aIsPurchased && !bIsPurchased) return -1;
      if (!aIsPurchased && bIsPurchased) return 1;
    }
    
    // Otherwise maintain original order
    return 0;
  })

  const handleClose = () => {
    setSelectedStore({ label: "", value: "" })
    setQuantities({})
    setOrderConfirmed(false)
    setOrderDetails(null)
    setIsCreateOrderModalOpen(false)
    navigate("/")
  }

  const downloadConfirmation = () => {
  if (!orderDetails) return;

  try {
    exportInvoiceToPDF({
      id: preOrderNum ,       // same as create
      clientId: orderDetails.clientId?._id || orderDetails.clientId, 
      clientName: orderDetails.clientName,
      shippinCost: orderDetails.shippinCost || calculateShipping(),
      date: orderDetails.date,
      shippingAddress: orderDetails.shippingAddress,
      billingAddress: orderDetails.billingAddress,
      status: orderDetails.status || "pending",
      items: orderDetails.items,
      total: orderDetails.total,
      paymentStatus: orderDetails.paymentStatus || "pending",
      subtotal: orderDetails.total,
      store: orderDetails.store, 
      paymentDetails: orderDetails.paymentDetails || {}
    });

    toast({
      title: "Order Invoice Downloaded",
      description: "The order confirmation PDF has been generated",
    });
  } catch (error) {
    console.error("Error generating confirmation PDF:", error);
    toast({
      title: "Error",
      description: "Failed to generate confirmation PDF",
      variant: "destructive",
    });
  }
};


  if (templateLoading) {
    return (
      <Dialog open={isCreateOrderModalOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Loading...</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">Fetching price list data...</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-sm">Loading template...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!templateId) {
    return <h2 className="text-red-500 text-center text-xl">This template is not for you</h2>
  }

  if (!template) return null

  return (
    <div>
      <Dialog open={isCreateOrderModalOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">
              {orderConfirmed 
                ? "Order Invoice" 
                : isReviewMode 
                ? "Review Your Order" 
                : nextWeek 
                ? "Next Week Order"
                : "Create Order from Price List"}
            </DialogTitle>
       { !nextWeek &&    <DialogDescription className="text-sm sm:text-base">
              {orderConfirmed
                ? "Your order has been created successfully. You can download the confirmation PDF."
                : isReviewMode
                ? "Please review your order details before confirming."
                : `Create a new order based on "${template?.name}" price list.`}
            </DialogDescription>}
          </DialogHeader>

          {!orderConfirmed ? (
            <>
              <div className="space-y-4 py-2 sm:py-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="store" className="mb-1">
                    Select Store
                  </Label>

                  <Select2
                    options={stores}
                    value={selectedStore}
                    onChange={setSelectedStore}
                    placeholder="Search and select a store..."
                    isSearchable={true}
                    isDisabled={true}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 sm:mb-0"
                  />
                  <button
                    onClick={handleFindUser}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
                  >
                    Find User
                  </button>
                </div>

                {storeLoading ? (
  <div role="status" className="flex justify-center items-center p-4">
    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
    <span className="text-sm">Finding user details...</span>
  </div>
) : (
  !nextWeek && !isReviewMode && (
    <AddressForm
      billingAddress={billingAddress}
      setBillingAddress={setBillingAddress}
      shippingAddress={shippingAddress}
      setShippingAddress={setShippingAddress}
      sameAsBilling={sameAsBilling}
      setSameAsBilling={setSameAsBilling}
    />
  )
)}

                {/* Review Mode Display */}
                {isReviewMode ? (
                  <div className="space-y-4">
                    {/* Store Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">Store Information</h3>
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Store:</span> {selectedStore?.label}
                      </p>
                    </div>

                    {/* Address Info */}
                    {!nextWeek && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">Billing Address</h3>
                          <div className="text-sm text-gray-700 space-y-1">
                            <p><span className="font-medium">Name:</span> {billingAddress.name}</p>
                            <p><span className="font-medium">Email:</span> {billingAddress.email}</p>
                            <p><span className="font-medium">Phone:</span> {billingAddress.phone}</p>
                            <p><span className="font-medium">Address:</span> {billingAddress.address}</p>
                            <p><span className="font-medium">City:</span> {billingAddress.city}, {billingAddress.postalCode}</p>
                            <p><span className="font-medium">State:</span> {billingAddress.country}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">Shipping Address</h3>
                          {sameAsBilling ? (
                            <p className="text-sm text-gray-600 italic">Same as billing address</p>
                          ) : (
                            <div className="text-sm text-gray-700 space-y-1">
                              <p><span className="font-medium">Name:</span> {shippingAddress.name}</p>
                              <p><span className="font-medium">Email:</span> {shippingAddress.email}</p>
                              <p><span className="font-medium">Phone:</span> {shippingAddress.phone}</p>
                              <p><span className="font-medium">Address:</span> {shippingAddress.address}</p>
                              <p><span className="font-medium">City:</span> {shippingAddress.city}, {shippingAddress.postalCode}</p>
                              <p><span className="font-medium">State:</span> {shippingAddress.country}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Selected Products */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                        <h3 className="font-semibold text-lg">Selected Products</h3>
                        <p className="text-sm text-blue-100">Review your order items below</p>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="font-semibold">Product</TableHead>
                              <TableHead className="hidden sm:table-cell font-semibold">Category</TableHead>
                              {!nextWeek && <TableHead className="text-right font-semibold">Unit Price</TableHead>}
                              <TableHead className="text-center font-semibold">Quantity</TableHead>
                              {!nextWeek && <TableHead className="text-right font-semibold">Total</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {template?.products
                              ?.filter(product => (quantities[product.id] || 0) > 0)
                              .map((product) => {
                                const quantity = quantities[product.id] || 0;
                                const selectedType = priceType[product.id] || "box";
                                const price = selectedType === "unit" ? product.price : product[priceCategory] || product.pricePerBox;
                                const total = price * quantity;

                                return (
                                  <TableRow key={product.id} className="hover:bg-gray-50">
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={product.image || "/placeholder.svg"}
                                          alt={product.name}
                                          className="h-12 w-12 object-cover rounded"
                                          loading="lazy"
                                        />
                                        <span className="text-sm">{product.name}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-sm">{product.category}</TableCell>
                                    {!nextWeek && (
                                      <TableCell className="text-right">
                                        <div className="text-sm">
                                          <span className="font-medium">{formatCurrency(price)}</span>
                                          <span className="text-xs text-gray-500 block">
                                            {selectedType === "unit" ? "per LB" : "per Box"}
                                          </span>
                                        </div>
                                      </TableCell>
                                    )}
                                    <TableCell className="text-center">
                                      <span className="font-semibold text-blue-600">
                                        {quantity} {selectedType === "unit" ? "LB" : selectedType !== "box" ? selectedType : ""}
                                      </span>
                                    </TableCell>
                                    {!nextWeek && (
                                      <TableCell className="text-right font-semibold text-green-600">
                                        {formatCurrency(total)}
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Order Summary */}
                    {!nextWeek && (
                      <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6">
                        <h3 className="font-bold text-lg text-gray-800 mb-4">Order Summary</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                            <span className="text-gray-700">Subtotal:</span>
                            <span className="font-semibold text-lg">{formatCurrency(calculateSubtotal())}</span>
                          </div>
                          {/* <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                            <span className="text-gray-700">Shipping Cost:</span>
                            <span className="font-semibold text-lg">{formatCurrency(calculateShipping())}</span>
                          </div> */}
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-xl font-bold text-gray-900">Total Amount:</span>
                            <span className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotal())}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Product Selection Mode */
                  selectedStore?.value ? 
                  <div className="border rounded-md overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center gap-2 sm:gap-4 p-3 sm:p-4">
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full mb-2 md:mb-0 md:w-1/2"
                    />

                    <Select onValueChange={setSelectedCategory} value={selectedCategory} className="w-full md:w-64">
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px] sm:w-[300px]">Product</TableHead>
                          <TableHead className="hidden sm:table-cell">Category</TableHead>
                      { !nextWeek &&   <TableHead className="text-right">Price</TableHead>}
                          <TableHead className="w-[80px] sm:w-[150px] text-center">Qty</TableHead>
                        {!nextWeek &&  <TableHead className="text-right">Total</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => {
                          const quantity = quantities[product.id] || 0;
                          const selectedType = priceType[product.id] || "box"; // default to box
                          const price = selectedType === "unit" ? product.price : product[priceCategory] || product.pricePerBox;
                          const total = price * quantity;

                          return (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2 sm:gap-4">
                                  <img
                                    src={product.image || "/placeholder.svg"}
                                    alt=""
                                    className="h-10 sm:h-14 w-auto object-contain"
                                    loading="lazy"
                                  />
                                  <span className="text-xs sm:text-sm">{product.name}</span>
                                </div>
                              </TableCell>

                              <TableCell className="hidden sm:table-cell">{product.category}</TableCell>

                         {!nextWeek &&     <TableCell className="text-right text-xs sm:text-sm">
                                <div className="flex flex-col items-end gap-1">
                                  <select
                                    value={selectedType}
                                    onChange={(e) => handlePriceTypeChange(product.id, e.target.value)}
                                    className="text-xs border rounded px-2 py-1"
                                  >
                                    <option value="unit">Per Unit</option>
                                    <option value="box">Per Box</option>
                                  </select>
                                  <span>{formatCurrency(price)}</span>
                                </div>
                              </TableCell>}

                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={quantity || ""}
                                  onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                  className="w-16 sm:w-20 mx-auto text-center"
                                />
                              </TableCell>

                          {!nextWeek &&    <TableCell className="text-right font-medium text-xs sm:text-sm">
                                {formatCurrency(total)}
                              </TableCell>}
                            </TableRow>
                          );
                        })}
                      </TableBody>

                    </Table>
                  </div>
                  
                </div> :
                 <div className="flex justify-center items-center h-[80px] bg-gray-200 p-4">
                 <div className="flex items-center space-x-2">
                   <ShoppingCart className="text-gray-500" />
                   <p className="text-lg font-medium text-gray-800">
                     Select Store then products will appear
                   </p>
                 </div>
               </div>
                )
        }

                {/* Summary Row - Only show in product selection mode */}
             {!nextWeek && !isReviewMode &&   <div className="flex flex-col sm:flex-row justify-end px-3 sm:px-6 py-3 sm:py-4 bg-muted border-t">
                  <div className="w-full sm:max-w-xl">
                    <div className="grid grid-cols-2 gap-2 font-medium text-muted-foreground text-xs sm:text-sm mb-1">
                      <div className="text-center">Subtotal</div>
                      {/* <div className="text-center">Shipping Cost</div> */}
                      <div className="text-center">Total</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-bold text-sm sm:text-lg">
                      <div className="text-center">{formatCurrency(calculateSubtotal())}</div>
                      {/* <div className="text-center">{formatCurrency(calculateShipping())}</div> */}
                      <div className="text-center text-green-600">{formatCurrency(calculateTotal())}</div>
                    </div>
                  </div>
                </div>}
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
                <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto order-2 sm:order-1">
                  Cancel
                </Button>
                
                {isReviewMode ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsReviewMode(false)} 
                      className="w-full sm:w-auto order-1 sm:order-2"
                    >
                      ← Back to Edit
                    </Button>
                    <Button
                      onClick={handleCreateOrder}
                      disabled={!selectedStore || isSubmitting}
                      className="w-full sm:w-auto order-1 sm:order-2 bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Confirm Order
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      const selectedItems = template?.products?.filter(p => (quantities[p.id] || 0) > 0);
                      if (!selectedItems || selectedItems.length === 0) {
                        toast({
                          title: "No Products Selected",
                          description: "Please select at least one product to review",
                          variant: "destructive",
                        });
                        return;
                      }
                      setIsReviewMode(true);
                    }}
                    disabled={!selectedStore || calculateTotal() === 0}
                    className="w-full sm:w-auto order-1 sm:order-2"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {nextWeek ? "Review Week Order" : "Review Order"}
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-100 rounded-md p-3 sm:p-4 mb-4 sm:mb-6 flex items-start gap-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-green-800 text-sm sm:text-base">Order Created Successfully</h3>
                  <p className="text-green-700 text-xs sm:text-sm mt-1">
                    Order #{orderDetails?.id} has been created for {orderDetails?.clientName}
                  </p>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetails?.items.map((product, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium text-xs sm:text-sm">
                            {product.productName || product.name}
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm">
                            {formatCurrency(product[priceCategory] || product.unitPrice || product.pricePerBox)}
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm">
  {product.quantity}{" "}
  {product.pricingType === "unit"
    ? "LB"
    : product.pricingType !== "box"
    ? product.pricingType
    : ""}
</TableCell>


                          <TableCell className="text-right text-xs sm:text-sm">
                            {formatCurrency((product.unitPrice || product.pricePerBox) * product.quantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary Row */}
                <div className="flex flex-col sm:flex-row justify-end px-3 sm:px-6 py-3 sm:py-4 bg-muted border-t">
                  <div className="w-full sm:max-w-xl">
                    <div className="grid grid-cols-3 gap-2 font-medium text-muted-foreground text-xs sm:text-sm mb-1">
                      <div className="text-center">Subtotal</div>
                      <div className="text-center">Shipping Cost</div>
                      <div className="text-center">Total</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-bold text-sm sm:text-lg">
                      <div className="text-center">{formatCurrency(calculateSubtotal())}</div>
                      <div className="text-center">{formatCurrency(calculateShipping())}</div>
                      <div className="text-center text-green-600">{formatCurrency(calculateTotal())}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 mt-4 sm:mt-6">
                <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto order-2 sm:order-1">
                  Close
                </Button>
                <Button
                  onClick={downloadConfirmation}
                  variant="default"
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Download Invoice PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isGroupOpen} onOpenChange={setIsGroupOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add New Store</DialogTitle>
          </DialogHeader>
          <StoreRegistration
            setIsGroupOpen={(value: boolean) => setIsGroupOpen(value)}
            isEdit={false}
            groups={null}
            fetchStores={fetchStores}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CreateOrderModalStore
