"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import Navbar from "@/components/layout/Navbar"
import Sidebar from "@/components/layout/Sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  MapPin,
  Package,
  DollarSign,
  CheckCircle2,
  Store,
  Phone,
  Mail,
  Calendar,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  AlertCircle,
} from "lucide-react"
import { getAllMembersAPI, getUserAPI } from "@/services2/operations/auth"
import { getAllProductAPI } from "@/services2/operations/product"
import { createOrderAPI, getUserLatestOrdersAPI } from "@/services2/operations/order"
import { cn } from "@/lib/utils"

interface StoreType {
  id: string
  _id: string
  storeName: string
  ownerName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  shippingCost: number
}

interface ProductType {
  id: string
  _id: string
  name: string
  price: number
  pricePerBox: number
  shippinCost: number
  category?: string
  image?: string
  stock?: number
}

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  pricingType: "box" | "unit"
  shippinCost: number
}

interface AddressType {
  name: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  country: string
}

const NewOrderEnhanced = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  // Data states
  const [stores, setStores] = useState<StoreType[]>([])
  const [products, setProducts] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null)
  const [storeSearch, setStoreSearch] = useState("")
  const [showStoreDropdown, setShowStoreDropdown] = useState(false)
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [displayedProducts, setDisplayedProducts] = useState<ProductType[]>([])
  const [productsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState<string[]>([])
  
  const [orderStatus, setOrderStatus] = useState("pending")
  const [orderNumber, setOrderNumber] = useState("")
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  
  const [billingAddress, setBillingAddress] = useState<AddressType>({
    name: "", email: "", phone: "", address: "", city: "", postalCode: "", country: ""
  })
  const [shippingAddress, setShippingAddress] = useState<AddressType>({
    name: "", email: "", phone: "", address: "", city: "", postalCode: "", country: ""
  })
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [showAddressSection, setShowAddressSection] = useState(false)

  // Recent orders for selected store
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  // Fetch stores and products
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [storesData, productsData] = await Promise.all([
          getAllMembersAPI(),
          getAllProductAPI()
        ])
        
        const filteredStores = storesData
          .filter((s: any) => s.role === "store")
          .map((s: any) => ({ ...s, id: s._id }))
        setStores(filteredStores)
        
        const formattedProducts: ProductType[] = productsData.map((p: any) => ({ ...p, id: p._id }))
        setProducts(formattedProducts)
        console.log(formattedProducts, "product data")

        // Extract unique categories
        const uniqueCategories: string[] = formattedProducts
          .filter((p: ProductType) => p.category && typeof p.category === 'string')
          .map((p: ProductType) => p.category as string)
          .filter((cat, index, arr) => arr.indexOf(cat) === index) // Remove duplicates
          .sort()
        setCategories(uniqueCategories)

        // Check if clientId is in URL params
        const clientId = searchParams.get('clientId')
        if (clientId) {
          const store = filteredStores.find((s: StoreType) => s.id === clientId)
          if (store) handleSelectStore(store)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Handle store selection
  const handleSelectStore = async (store: StoreType) => {
    setSelectedStore(store)
    setStoreSearch(store.storeName)
    setShowStoreDropdown(false)
    
    // Auto-fill billing address
    setBillingAddress({
      name: store.ownerName || "",
      email: store.email || "",
      phone: store.phone || "",
      address: store.address || "",
      city: store.city || "",
      postalCode: store.zipCode || "",
      country: store.state || "",
    })

    // Fetch recent orders
    try {
      const res = await getUserLatestOrdersAPI(store.id, 3)
      if (res?.orders) setRecentOrders(res.orders)
    } catch (error) {
      console.error("Error fetching recent orders:", error)
    }
  }

  // Filter stores based on search
  const filteredStores = useMemo(() => {
    if (!storeSearch) return stores
    const search = storeSearch.toLowerCase()
    return stores.filter(s => 
      s.storeName?.toLowerCase().includes(search) ||
      s.ownerName?.toLowerCase().includes(search) ||
      s.city?.toLowerCase().includes(search)
    )
  }, [stores, storeSearch])

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    let filtered = products
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }
    
    // Filter by search
    if (productSearch) {
      const search = productSearch.toLowerCase()
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(search) ||
        p.category?.toLowerCase().includes(search)
      )
    }
    
    return filtered
  }, [products, productSearch, selectedCategory])

  // Update displayed products when filters change
  useEffect(() => {
    setCurrentPage(1)
    setDisplayedProducts(filteredProducts.slice(0, productsPerPage))
  }, [filteredProducts, productsPerPage])

  // Load more products (infinite scroll)
  const loadMoreProducts = () => {
    const nextPage = currentPage + 1
    const startIndex = (nextPage - 1) * productsPerPage
    const endIndex = startIndex + productsPerPage
    const newProducts = filteredProducts.slice(startIndex, endIndex)
    
    if (newProducts.length > 0) {
      setDisplayedProducts(prev => [...prev, ...newProducts])
      setCurrentPage(nextPage)
    }
  }

  // Handle scroll in product modal
  const handleProductModalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    
    // Load more when scrolled to bottom (with 100px threshold)
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      const hasMore = displayedProducts.length < filteredProducts.length
      if (hasMore) {
        loadMoreProducts()
      }
    }
  }

  // Add product to order
  const addProduct = (product: ProductType, pricingType: "box" | "unit" = "box") => {
    const existingIndex = orderItems.findIndex(
      item => item.productId === product.id && item.pricingType === pricingType
    )
    
    if (existingIndex >= 0) {
      const updated = [...orderItems]
      updated[existingIndex].quantity += 1
      setOrderItems(updated)
    } else {
      setOrderItems([...orderItems, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: pricingType === "box" ? product.pricePerBox : product.price,
        pricingType,
        shippinCost: product.shippinCost || 0
      }])
    }
    // setShowProductModal(false)
    toast({
    title: "Success",
    description: `${product.name} added successfully!`,
  });

    setProductSearch("")
  }

  // Reset modal state when opening
  const openProductModal = () => {
    setShowProductModal(true)
    setProductSearch("")
    setSelectedCategory("all")
    setCurrentPage(1)
    setDisplayedProducts(products.slice(0, productsPerPage))
  }

  // Update item quantity
  const updateQuantity = (index: number, delta: number) => {
    const updated = [...orderItems]
    updated[index].quantity = Math.max(1, updated[index].quantity + delta)
    setOrderItems(updated)
  }

  // Remove item
  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  // Update item price
  const updatePrice = (index: number, price: number) => {
    const updated = [...orderItems]
    updated[index].unitPrice = price
    setOrderItems(updated)
  }

  // Calculate totals
  const subtotal = useMemo(() => 
    orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  , [orderItems])

  const shippingCost = selectedStore?.shippingCost || 0
  const total = subtotal + shippingCost

  // Submit order
  const handleSubmit = async () => {
    if (!selectedStore) {
      toast({ title: "Error", description: "Please select a store", variant: "destructive" })
      return
    }
    if (orderItems.length === 0) {
      toast({ title: "Error", description: "Please add at least one product", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const orderData = {
        orderNumber: orderNumber || null,
        createdAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
        date: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
        clientId: { value: selectedStore.id },
        items: orderItems,
        total,
        status: orderStatus,
        shippinCost: shippingCost,
        billingAddress,
        shippingAddress: sameAsBilling ? billingAddress : shippingAddress,
      }

      const res = await createOrderAPI(orderData, token)
      if (res) {
        toast({ title: "Success", description: "Order created successfully!" })
        navigate("/admin/orders")
      }
    } catch (error) {
      console.error("Error creating order:", error)
      toast({ title: "Error", description: "Failed to create order", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-6xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orders")}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Create New Order</h1>
                  <p className="text-sm text-muted-foreground">Add products and customer details</p>
                </div>
              </div>
              <Badge variant="outline" className="text-sm">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date().toLocaleDateString()}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Store & Products */}
              <div className="lg:col-span-2 space-y-4">
                {/* Store Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Select Store
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search store by name, owner, or city..."
                        value={storeSearch}
                        onChange={(e) => {
                          setStoreSearch(e.target.value)
                          setShowStoreDropdown(true)
                          if (!e.target.value) setSelectedStore(null)
                        }}
                        onFocus={() => setShowStoreDropdown(true)}
                        className="pl-9"
                      />
                      
                      {showStoreDropdown && filteredStores.length > 0 && !selectedStore && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-auto">
                          {filteredStores.slice(0, 10).map(store => (
                            <div
                              key={store.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                              onClick={() => handleSelectStore(store)}
                            >
                              <div className="font-medium">{store.storeName}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <User className="h-3 w-3" /> {store.ownerName}
                                <span className="text-gray-300">|</span>
                                <MapPin className="h-3 w-3" /> {store.city}, {store.state}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Store Info */}
                    {selectedStore && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-blue-900">{selectedStore.storeName}</div>
                            <div className="text-sm text-blue-700 space-y-0.5 mt-1">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" /> {selectedStore.ownerName}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {selectedStore.address}, {selectedStore.city}
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {selectedStore.phone}
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedStore(null)
                              setStoreSearch("")
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Products Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Order Items ({orderItems.length})
                      </CardTitle>
                      <Button size="sm" onClick={openProductModal}>
                        <Plus className="h-4 w-4 mr-1" /> Add Product
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {orderItems.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>No products added yet</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={openProductModal}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add First Product
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orderItems.map((item, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{item.productName}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {item.pricingType === "box" ? "Per Box" : "Per Unit"}
                                </Badge>
                                <span>@ ${item.unitPrice.toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => updateQuantity(index, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...orderItems]
                                  updated[index].quantity = Math.max(1, parseInt(e.target.value) || 1)
                                  setOrderItems(updated)
                                }}
                                className="w-16 h-8 text-center"
                              />
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => updateQuantity(index, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            <div className="w-24 text-right font-medium">
                              ${(item.quantity * item.unitPrice).toFixed(2)}
                            </div>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        
                        {/* Quick Add Another Product Button */}
                        <Button 
                          variant="outline" 
                          className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5"
                          onClick={openProductModal}
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Another Product
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Address Section (Collapsible) */}
                <Card>
                  <CardHeader 
                    className="pb-3 cursor-pointer"
                    onClick={() => setShowAddressSection(!showAddressSection)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Address Details
                        {billingAddress.name && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </CardTitle>
                      {showAddressSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </CardHeader>
                  
                  {showAddressSection && (
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Name</label>
                          <Input 
                            value={billingAddress.name}
                            onChange={(e) => setBillingAddress({...billingAddress, name: e.target.value})}
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Phone</label>
                          <Input 
                            value={billingAddress.phone}
                            onChange={(e) => setBillingAddress({...billingAddress, phone: e.target.value})}
                            placeholder="Phone number"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Email</label>
                          <Input 
                            value={billingAddress.email}
                            onChange={(e) => setBillingAddress({...billingAddress, email: e.target.value})}
                            placeholder="Email address"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Address</label>
                          <Input 
                            value={billingAddress.address}
                            onChange={(e) => setBillingAddress({...billingAddress, address: e.target.value})}
                            placeholder="Street address"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">City</label>
                          <Input 
                            value={billingAddress.city}
                            onChange={(e) => setBillingAddress({...billingAddress, city: e.target.value})}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">State</label>
                          <Input 
                            value={billingAddress.country}
                            onChange={(e) => setBillingAddress({...billingAddress, country: e.target.value})}
                            placeholder="State"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Postal Code</label>
                          <Input 
                            value={billingAddress.postalCode}
                            onChange={(e) => setBillingAddress({...billingAddress, postalCode: e.target.value})}
                            placeholder="Postal code"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={sameAsBilling} 
                          onCheckedChange={(checked) => setSameAsBilling(checked as boolean)}
                        />
                        <label className="text-sm">Shipping address same as billing</label>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>

              {/* Right Column - Order Summary */}
              <div className="space-y-4">
                {/* Order Summary Card */}
                <Card className="sticky top-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Order Settings */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <Select value={orderStatus} onValueChange={setOrderStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Order Date</label>
                        <Input 
                          type="date" 
                          value={orderDate}
                          onChange={(e) => setOrderDate(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Order # (Optional)</label>
                        <Input 
                          placeholder="Auto-generated if empty"
                          value={orderNumber}
                          onChange={(e) => setOrderNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal ({orderItems.length} items)</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>${shippingCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total</span>
                        <span className="text-primary">${total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleSubmit}
                      disabled={submitting || !selectedStore || orderItems.length === 0}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Create Order
                        </>
                      )}
                    </Button>

                    {(!selectedStore || orderItems.length === 0) && (
                      <div className="text-xs text-center text-muted-foreground">
                        {!selectedStore && <p>• Select a store</p>}
                        {orderItems.length === 0 && <p>• Add at least one product</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Orders */}
                {recentOrders.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Recent Orders
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {recentOrders.map((order, i) => (
                          <div key={i} className="text-xs p-2 bg-gray-50 rounded">
                            <div className="flex justify-between">
                              <span className="font-medium">{order.orderNumber}</span>
                              <span>${order.total?.toFixed(2)}</span>
                            </div>
                            <div className="text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Product Selection Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Add Product</span>
              <Badge variant="outline" className="text-xs">
                {displayedProducts.length} of {filteredProducts.length} products
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {/* Search and Filter Row */}
          <div className="space-y-2">
            <div className="flex gap-3 items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              {/* Category Dropdown */}
              <div className="w-52">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-10">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="All Categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span>All Categories</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {products.length}
                        </Badge>
                      </div>
                    </SelectItem>
                    {categories.map(cat => {
                      const categoryCount = products.filter(p => p.category === cat).length
                      return (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center justify-between w-full">
                            <span>{cat}</span>
                            <Badge variant="outline" className="text-xs ml-2">
                              {categoryCount}
                            </Badge>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Status */}
            {(selectedCategory !== "all" || productSearch) && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>
                  Showing {filteredProducts.length} of {products.length} products
                </span>
                {selectedCategory !== "all" && (
                  <Badge variant="outline" className="text-xs">
                    {selectedCategory}
                  </Badge>
                )}
                {productSearch && (
                  <Badge variant="outline" className="text-xs">
                    "{productSearch}"
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Products List with Infinite Scroll */}
          <div 
            className="flex-1 overflow-auto mt-4" 
            onScroll={handleProductModalScroll}
          >
            <div className="grid grid-cols-1 gap-2">
              {displayedProducts.map(product => (
                <div 
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 group"
                >
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>Box: ${product.pricePerBox?.toFixed(2)} | Unit: ${product.price?.toFixed(2)}</span>
                      {product.category && (
                        <>
                          <span className="text-gray-300">•</span>
                          <Badge variant="secondary" className="text-xs">
                            {product.category}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => addProduct(product, "box")}
                      className="hover:bg-blue-50 hover:border-blue-300"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Box
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => addProduct(product, "unit")}
                      className="hover:bg-green-50 hover:border-green-300"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Unit
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {displayedProducts.length < filteredProducts.length && (
                <div className="text-center py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Scroll down to load more products...</p>
                </div>
              )}
              
              {/* No products found */}
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No products found</p>
                  <p className="text-sm">Try a different search term or category</p>
                </div>
              )}
              
              {/* All products loaded */}
              {displayedProducts.length > 0 && displayedProducts.length === filteredProducts.length && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All products loaded ({filteredProducts.length} total)</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Add Product Button - Always visible */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
        onClick={openProductModal}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  )
}

export default NewOrderEnhanced
