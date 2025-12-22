"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import { Search, ShoppingCart, Plus, Minus, Check, Loader2, X, Package, Clock, Star, Phone, Mail, MapPin, User, Trash2, Home, Store, Edit2, ArrowRight, CheckCircle2, Building2, Truck, Box, Scale, Layers, TrendingUp, History, Sparkles } from "lucide-react"
import { useSelector } from "react-redux"
import { RootState } from "@/redux/store"
import { useNavigate, useLocation } from "react-router-dom"
import { getSinglePriceAPI } from "@/services2/operations/priceList"
import { getUserAPI } from "@/services2/operations/auth"
import { createPreOrderAPI, getAllPreOrderAPI } from "@/services2/operations/preOrder"
import { getUserLatestOrdersAPI } from "@/services2/operations/order"
import { exportInvoiceToPDF } from "@/utils/pdf"
import { getAllProductAPI } from "@/services2/operations/product"

const DEMO_MODE = false
const PALLET_SIZE = 48 // boxes per pallet

type Step = "welcome" | "address" | "products" | "preorders" | "checkout" | "complete"
type QuantityType = { box: number; unit: number }

const StoreOrderMobile = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  const urlParams = new URLSearchParams(window.location.search)
  const templateId = urlParams.get("templateId") || "all"
  const emailFromUrl = urlParams.get("email")
  const phoneFromUrl = urlParams.get("phone")

  const [currentStep, setCurrentStep] = useState<Step>("welcome")
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState<any>(null)
  const [quantities, setQuantities] = useState<Record<string, QuantityType>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [cartOpen, setCartOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [viewMode, setViewMode] = useState<"all" | "lastWeek">("all")

  const [searchType, setSearchType] = useState<"email" | "phone">("phone")
  const [searchValue, setSearchValue] = useState("")
  const [storeInfo, setStoreInfo] = useState<any>(null)
  const [storeLoading, setStoreLoading] = useState(false)
  const [priceCategory, setPriceCategory] = useState("pricePerBox")
  const [lastWeekOrder, setLastWeekOrder] = useState<any[]>([])
  const [userPreOrders, setUserPreOrders] = useState<any[]>([])
  const [preOrdersLoading, setPreOrdersLoading] = useState(false)
  
  const [billingAddress, setBillingAddress] = useState({ name: "", email: "", phone: "", address: "", street: "", city: "", postalCode: "", state: "", country: "USA" })
  const [shippingAddress, setShippingAddress] = useState({ name: "", email: "", phone: "", address: "", street: "", city: "", postalCode: "", state: "", country: "USA" })
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const isNextWeek = location.pathname.includes('/nextweek')

  // Fetch template/products
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!templateId) { setLoading(false); return }
      try {
        if (templateId === "demo" || templateId === "all") {
          const products = await getAllProductAPI()
          if (products && products.length > 0) {
            const formattedProducts = products.map((p: any) => ({
              id: p._id, name: p.name, category: p.category?.name || "Other",
              pricePerBox: p.pricePerBox || p.price || 0, price: p.price || 0,
              pricePerUnit: p.price || (p.pricePerBox ? p.pricePerBox / (p.boxSize || 1) : 0),
              image: p.image || "", description: p.description || "",
              unit: p.unit || "lb", boxSize: p.boxSize || 1, palette: p.palette || ""
            }))
            setTemplate({ _id: "all-products", name: "All Products", products: formattedProducts })
          }
        } else {
          const data = await getSinglePriceAPI(templateId)
          if (data) { setTemplate(data) }
          else {
            const products = await getAllProductAPI()
            if (products && products.length > 0) {
              const formattedProducts = products.map((p: any) => ({
                id: p._id, name: p.name, category: p.category?.name || "Other",
                pricePerBox: p.pricePerBox || p.price || 0, price: p.price || 0,
                pricePerUnit: p.price || (p.pricePerBox ? p.pricePerBox / (p.boxSize || 1) : 0),
                image: p.image || "", description: p.description || "",
                unit: p.unit || "lb", boxSize: p.boxSize || 1, palette: p.palette || ""
              }))
              setTemplate({ _id: "all-products", name: "All Products", products: formattedProducts })
            }
          }
        }
      } catch (error) {
        console.error("Error fetching template:", error)
        toast({ variant: "destructive", title: "Error", description: "Failed to load products" })
      } finally { setLoading(false) }
    }
    fetchTemplate()
  }, [templateId])

  useEffect(() => {
    if (emailFromUrl) { setSearchType("email"); setSearchValue(emailFromUrl); handleFindStore(emailFromUrl, "email") }
    else if (phoneFromUrl) { setSearchType("phone"); setSearchValue(phoneFromUrl); handleFindStore(phoneFromUrl, "phone") }
  }, [emailFromUrl, phoneFromUrl])

  const handleFindStore = async (value?: string, type?: "email" | "phone") => {
    const searchVal = value || searchValue
    const searchBy = type || searchType
    if (!searchVal) { toast({ variant: "destructive", title: "Required", description: `Please enter your ${searchBy}` }); return }
    
    setStoreLoading(true)
    try {
      const query = searchBy === "email" ? { email: searchVal } : { phone: searchVal }
      const response = await getUserAPI(query)
      if (!response) { toast({ variant: "destructive", title: "Not Found", description: "Store not found." }); return }
      
      setStoreInfo(response)
      setPriceCategory(response.priceCategory === "price" ? "pricePerBox" : response.priceCategory)
      const addr = { 
        name: response.ownerName || response.storeName || "", 
        email: response.email || "", 
        phone: response.phone || "", 
        address: response.address || "", 
        street: response.address || "",
        city: response.city || "", 
        postalCode: response.zipCode || "", 
        state: response.state || "",
        country: "USA"
      }
      setBillingAddress(addr); setShippingAddress(addr)
      
      // Fetch last week's order
      try {
        const ordersRes = await getUserLatestOrdersAPI(response._id, 1)
        if (ordersRes?.orders && ordersRes.orders.length > 0) {
          const lastOrder = ordersRes.orders[0]
          setLastWeekOrder(lastOrder.items || [])
          // Pre-fill quantities from last order
          const prefilledQty: Record<string, QuantityType> = {}
          lastOrder.items?.forEach((item: any) => {
            prefilledQty[item.productId || item.product] = { 
              box: item.pricingType === "box" ? item.quantity : 0,
              unit: item.pricingType === "unit" ? item.quantity : 0
            }
          })
          // Don't auto-fill, just store for reference
        }
      } catch (e) { console.log("No recent orders") }

      // Fetch user preorders
      await fetchUserPreOrders(response._id)
      
      setCurrentStep("address")
      toast({ title: "Welcome!", description: `Hello, ${response.storeName}` })
    } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed to find store." }) }
    finally { setStoreLoading(false) }
  }

  // Fetch user preorders
  const fetchUserPreOrders = async (userId: string) => {
    setPreOrdersLoading(true)
    try {
      const queryParams = `clientId=${userId}&confirmed=false`
      const response = await getAllPreOrderAPI(token, queryParams)
      setUserPreOrders(response?.preOrders || [])
    } catch (error) {
      console.error("Error fetching preorders:", error)
      setUserPreOrders([])
    } finally {
      setPreOrdersLoading(false)
    }
  }

  // Categories
  const categories = template?.products ? ["all", ...new Set(template.products.map((p: any) => p.category || "Other"))] : ["all"]
  
  // Get last week product IDs
  const lastWeekProductIds = new Set(lastWeekOrder.map((item: any) => item.productId || item.product))
  
  // Filter products
  const filteredProducts = template?.products?.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    const matchesView = viewMode === "all" || lastWeekProductIds.has(product.id)
    return matchesSearch && matchesCategory && matchesView
  }).sort((a: any, b: any) => {
    const aIsLastWeek = lastWeekProductIds.has(a.id)
    const bIsLastWeek = lastWeekProductIds.has(b.id)
    if (aIsLastWeek && !bIsLastWeek) return -1
    if (!aIsLastWeek && bIsLastWeek) return 1
    return 0
  }) || []

  // Cart calculations
  const cartItems = template?.products?.filter((p: any) => {
    const qty = quantities[p.id] || { box: 0, unit: 0 }
    return qty.box > 0 || qty.unit > 0
  }) || []
  
  const cartTotal = cartItems.reduce((sum: number, p: any) => {
    const qty = quantities[p.id] || { box: 0, unit: 0 }
    const boxPrice = p.pricePerBox || 0
    const unitPrice = p.pricePerUnit || p.price || 0
    return sum + (boxPrice * qty.box) + (unitPrice * qty.unit)
  }, 0)
  
  const totalBoxes = cartItems.reduce((sum: number, p: any) => sum + (quantities[p.id]?.box || 0), 0)
  const totalUnits = cartItems.reduce((sum: number, p: any) => sum + (quantities[p.id]?.unit || 0), 0)
  const cartCount = totalBoxes + (totalUnits > 0 ? 1 : 0) // Count units as 1 item group
  
  // Pallet calculation
  const palletProgress = (totalBoxes / PALLET_SIZE) * 100
  const palletsComplete = Math.floor(totalBoxes / PALLET_SIZE)
  const boxesToNextPallet = PALLET_SIZE - (totalBoxes % PALLET_SIZE)

  // Quantity handlers
  const updateBoxQuantity = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || { box: 0, unit: 0 }
      return { ...prev, [productId]: { ...current, box: Math.max(0, current.box + delta) } }
    })
  }
  
  const updateUnitQuantity = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || { box: 0, unit: 0 }
      return { ...prev, [productId]: { ...current, unit: Math.max(0, current.unit + delta) } }
    })
  }
  
  const setBoxQuantity = (productId: string, value: number) => {
    setQuantities(prev => {
      const current = prev[productId] || { box: 0, unit: 0 }
      return { ...prev, [productId]: { ...current, box: Math.max(0, value) } }
    })
  }
  
  const setUnitQuantity = (productId: string, value: number) => {
    setQuantities(prev => {
      const current = prev[productId] || { box: 0, unit: 0 }
      return { ...prev, [productId]: { ...current, unit: Math.max(0, value) } }
    })
  }
  
  const removeFromCart = (productId: string) => {
    setQuantities(prev => ({ ...prev, [productId]: { box: 0, unit: 0 } }))
  }
  
  const clearCart = () => { setQuantities({}); setCartOpen(false) }
  
  // Copy last week order
  const copyLastWeekOrder = () => {
    const newQty: Record<string, QuantityType> = {}
    lastWeekOrder.forEach((item: any) => {
      const productId = item.productId || item.product
      newQty[productId] = {
        box: item.pricingType === "box" ? item.quantity : 0,
        unit: item.pricingType === "unit" ? item.quantity : 0
      }
    })
    setQuantities(newQty)
    toast({ title: "Copied!", description: "Last week's order has been copied to your cart" })
  }

  // Submit order
  const handleSubmitOrder = async () => {
    if (!storeInfo || cartItems.length === 0) return
    setIsSubmitting(true)
    try {
      const orderedProducts = cartItems.flatMap((product: any) => {
        const qty = quantities[product.id] || { box: 0, unit: 0 }
        const items = []
        if (qty.box > 0) {
          items.push({
            product: product.id, name: product.name, productId: product.id, productName: product.name,
            price: product.pricePerBox, unitPrice: product.pricePerBox, quantity: qty.box,
            pricingType: "box", total: product.pricePerBox * qty.box
          })
        }
        if (qty.unit > 0) {
          items.push({
            product: product.id, name: product.name, productId: product.id, productName: product.name,
            price: product.pricePerUnit || product.price, unitPrice: product.pricePerUnit || product.price,
            quantity: qty.unit, pricingType: "unit", total: (product.pricePerUnit || product.price) * qty.unit
          })
        }
        return items
      })
      
      const finalShipping = sameAsBilling ? billingAddress : shippingAddress
      const order = {
        date: new Date().toISOString(), clientId: storeInfo._id, clientName: storeInfo.storeName,
        items: orderedProducts, total: cartTotal, status: "pending", paymentStatus: "pending",
        subtotal: cartTotal, shippinCost: 0, store: storeInfo._id, billingAddress,
        shippingAddress: finalShipping, orderType: isNextWeek ? "NextWeek" : "Regular"
      }
      
      const orderRes = await createPreOrderAPI(order, token)
      const orderNumber = orderRes?.preOrderNumber || "ORD-" + Date.now()
      
      setOrderDetails({ ...order, preOrderNumber: orderNumber })
      setCurrentStep("complete")
      
      try {
        exportInvoiceToPDF({
          id: orderNumber, clientId: storeInfo._id, clientName: storeInfo.storeName,
          shippinCost: 0, date: order.date, shippingAddress: finalShipping, billingAddress,
          status: "pending", items: orderedProducts, total: cartTotal, paymentStatus: "pending",
          subtotal: cartTotal, store: storeInfo, paymentDetails: {}
        })
      } catch (e) {}
      
      toast({ title: "Order Placed!", description: `Order #${orderNumber} created` })
    } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed to create order" }) }
    finally { setIsSubmitting(false) }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600 mb-3" /><p className="text-gray-600 font-medium">Loading...</p></div>
      </div>
    )
  }

  if (!templateId || !template) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl"><CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Package className="h-8 w-8 text-red-500" /></div>
          <h2 className="text-xl font-bold mb-2">No Products</h2><p className="text-gray-600">Unable to load products.</p>
          <Button className="mt-6" onClick={() => navigate("/")}>Go Home</Button>
        </CardContent></Card>
      </div>
    )
  }

  // Step Indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 py-3 bg-white border-b">
      {[
        { step: "welcome", label: "Store", icon: Store }, 
        { step: "address", label: "Address", icon: MapPin }, 
        { step: "preorders", label: "Pre-Orders", icon: Clock },
        { step: "products", label: "Products", icon: Package }
      ].map((item, idx) => {
        const Icon = item.icon
        const isActive = currentStep === item.step
        const isComplete = (item.step === "welcome" && ["address", "preorders", "products", "checkout", "complete"].includes(currentStep)) || 
                          (item.step === "address" && ["preorders", "products", "checkout", "complete"].includes(currentStep)) || 
                          (item.step === "preorders" && ["products", "checkout", "complete"].includes(currentStep)) ||
                          (item.step === "products" && ["checkout", "complete"].includes(currentStep))
        return (
          <div key={item.step} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isActive ? "bg-blue-600 text-white" : isComplete ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {isComplete ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}<span>{item.label}</span>
            </div>
            {idx < 3 && <ArrowRight className="h-3 w-3 mx-1 text-gray-300" />}
          </div>
        )
      })}
    </div>
  )

  // Pallet Progress Component
  const PalletProgress = () => {
    if (totalBoxes === 0) return null
    return (
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-orange-600" />
            <span className="font-semibold text-orange-800">Pallet Progress</span>
          </div>
          <Badge className="bg-orange-100 text-orange-700">{palletsComplete} complete</Badge>
        </div>
        <Progress value={palletProgress % 100} className="h-3 mb-2" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-orange-700">{totalBoxes} boxes ({Math.round(palletProgress)}%)</span>
          {boxesToNextPallet < PALLET_SIZE && (
            <span className="text-orange-600 font-medium flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Add {boxesToNextPallet} more for next pallet!
            </span>
          )}
        </div>
      </div>
    )
  }

  // STEP: Complete
  if (currentStep === "complete" && orderDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="p-4 pt-8 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"><Check className="h-10 w-10 text-white" /></div>
            <h1 className="text-2xl font-bold text-green-800">Order Placed!</h1>
            <p className="text-green-700 mt-1 text-lg">Order #{orderDetails.preOrderNumber}</p>
          </div>
          <Card className="mb-4 shadow-lg"><CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Package className="h-4 w-4" /> Order Summary</h3>
            <div className="space-y-2 text-sm">
              {orderDetails.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.quantity} {item.pricingType === "box" ? "box" : "unit"} - {item.name}</span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 font-bold flex justify-between text-base"><span>Total</span><span className="text-green-600">{formatCurrency(orderDetails.total)}</span></div>
            </div>
          </CardContent></Card>
          <div className="space-y-3">
            <Button className="w-full" size="lg" onClick={() => navigate("/")}><Home className="h-4 w-4 mr-2" /> Back to Home</Button>
            <Button variant="outline" className="w-full" size="lg" onClick={() => { setCurrentStep("products"); setQuantities({}) }}><Plus className="h-4 w-4 mr-2" /> Place Another Order</Button>
          </div>
        </div>
      </div>
    )
  }

  // STEP: Welcome
  if (currentStep === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="p-4 pt-8 max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"><Store className="h-10 w-10 text-white" /></div>
            <h1 className="text-2xl font-bold text-gray-800">{isNextWeek ? "Next Week Order" : "Place Your Order"}</h1>
            <p className="text-gray-600 mt-2">{template?.name}</p>
          </div>
          <Card className="shadow-xl"><CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-center">Find Your Store</h2>
            <div className="flex gap-2 mb-4">
              <Button variant={searchType === "phone" ? "default" : "outline"} className="flex-1" onClick={() => setSearchType("phone")}><Phone className="h-4 w-4 mr-2" /> Phone</Button>
              <Button variant={searchType === "email" ? "default" : "outline"} className="flex-1" onClick={() => setSearchType("email")}><Mail className="h-4 w-4 mr-2" /> Email</Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600 mb-1 block">{searchType === "phone" ? "Phone Number" : "Email Address"}</Label>
                <Input type={searchType === "phone" ? "tel" : "email"} placeholder={searchType === "phone" ? "Enter phone number" : "Enter email address"} value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="text-lg py-6" onKeyDown={(e) => e.key === "Enter" && handleFindStore()} />
              </div>
              <Button className="w-full py-6 text-lg" onClick={() => handleFindStore()} disabled={storeLoading || !searchValue}>
                {storeLoading ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Finding...</> : <><Search className="h-5 w-5 mr-2" /> Find My Store</>}
              </Button>
            </div>
          </CardContent></Card>
          <p className="text-center text-sm text-gray-500 mt-6">Don't have an account? <a href="/store-registration" className="text-blue-600 font-medium">Register here</a></p>
        </div>
      </div>
    )
  }

  // STEP: Address
  if (currentStep === "address") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <StepIndicator />
        <div className="p-4 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3"><User className="h-8 w-8 text-blue-600" /></div>
            <h2 className="text-xl font-bold">{storeInfo?.storeName}</h2>
            <p className="text-gray-600 text-sm">{storeInfo?.email}</p>
          </div>
          
          <Card className="shadow-lg mb-4"><CardContent className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Building2 className="h-4 w-4" /> Billing Address</h3>
            <div className="space-y-3">
              <Input placeholder="Name" value={billingAddress.name} onChange={(e) => setBillingAddress(prev => ({ ...prev, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Phone" value={billingAddress.phone} onChange={(e) => setBillingAddress(prev => ({ ...prev, phone: e.target.value }))} />
                <Input placeholder="Email" value={billingAddress.email} onChange={(e) => setBillingAddress(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <Input placeholder="Street Address" value={billingAddress.address} onChange={(e) => setBillingAddress(prev => ({ ...prev, address: e.target.value, street: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="City" value={billingAddress.city} onChange={(e) => setBillingAddress(prev => ({ ...prev, city: e.target.value }))} />
                <Input placeholder="State" value={billingAddress.state} onChange={(e) => setBillingAddress(prev => ({ ...prev, state: e.target.value }))} />
                <Input placeholder="ZIP" value={billingAddress.postalCode} onChange={(e) => setBillingAddress(prev => ({ ...prev, postalCode: e.target.value }))} />
              </div>
            </div>
          </CardContent></Card>

          <Card className="shadow-lg mb-4"><CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><Truck className="h-4 w-4" /> Shipping Address</h3>
              <div className="flex items-center gap-2"><Checkbox id="same" checked={sameAsBilling} onCheckedChange={(c) => { setSameAsBilling(!!c); if (c) setShippingAddress(billingAddress) }} /><Label htmlFor="same" className="text-sm">Same as billing</Label></div>
            </div>
            {!sameAsBilling ? (
              <div className="space-y-3">
                <Input placeholder="Name" value={shippingAddress.name} onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))} />
                <Input placeholder="Phone" value={shippingAddress.phone} onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))} />
                <Input placeholder="Street Address" value={shippingAddress.address} onChange={(e) => setShippingAddress(prev => ({ ...prev, address: e.target.value, street: e.target.value }))} />
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="City" value={shippingAddress.city} onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))} />
                  <Input placeholder="State" value={shippingAddress.state} onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))} />
                  <Input placeholder="ZIP" value={shippingAddress.postalCode} onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))} />
                </div>
              </div>
            ) : billingAddress.address && (<p className="text-sm text-gray-600">{billingAddress.address}, {billingAddress.city}, {billingAddress.state} {billingAddress.postalCode}</p>)}
          </CardContent></Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 py-6" onClick={() => { setCurrentStep("welcome"); setStoreInfo(null) }}>Back</Button>
            <Button className="flex-1 py-6 text-lg" onClick={() => setCurrentStep("preorders")}>Continue <ArrowRight className="h-5 w-5 ml-2" /></Button>
          </div>
        </div>
      </div>
    )
  }

  // STEP: Pre-Orders
  if (currentStep === "preorders") {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <StepIndicator />
      <div className="p-4 max-w-7xl mx-auto grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">

        {/* Header */}
        <div className="text-center mb-6 col-span-full">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
          <h2 className="text-xl font-bold">Your Pre-Orders</h2>
          <p className="text-gray-600 text-sm">Pending pre-orders for {storeInfo?.storeName}</p>
        </div>

        {/* Loading or Empty State */}
        {preOrdersLoading ? (
          <div className="text-center py-8 col-span-full">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-gray-600">Loading pre-orders...</p>
          </div>
        ) : userPreOrders.length === 0 ? (
          <Card className="shadow-lg col-span-full">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Pre-Orders Found</h3>
              <p className="text-gray-600 text-sm mb-4">You don't have any pending pre-orders at the moment.</p>
              <Button className="w-full" onClick={() => setCurrentStep("products")}>
                <Plus className="h-4 w-4 mr-2" /> Create New Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Pre-orders list
          userPreOrders.map((preOrder: any) => (
            <Card key={preOrder._id} className="shadow-lg border-l-4 border-l-orange-400">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">
                      Pre-Order #{preOrder.preOrderNumber || preOrder._id?.slice(-6)}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {new Date(preOrder.createdAt || preOrder.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    <Clock className="h-3 w-3 mr-1" /> Pending
                  </Badge>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="text-xs text-gray-600">
                    <strong>Items:</strong> {preOrder.items?.length || 0} products
                  </div>
                  {preOrder.items?.slice(0, 2).map((item: any, idx: number) => (
                    <div key={idx} className="text-xs bg-gray-50 rounded p-2">
                      <span className="font-medium">{item.quantity} {item.pricingType}</span>
                      <span className="text-gray-600"> - {item.name || item.productName}</span>
                    </div>
                  ))}
                  {preOrder.items?.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{preOrder.items.length - 2} more items
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm">
                    <span className="text-gray-600">Total: </span>
                    <span className="font-bold text-orange-600">
                      ${preOrder.total?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/store/pre-order/${preOrder._id}`)}
                    className="text-xs"
                  >
                    <Edit2 className="h-3 w-3 mr-1" /> View/Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 col-span-full">
          <Button
            variant="outline"
            className="flex-1 py-6"
            onClick={() => setCurrentStep("address")}
          >
            Back
          </Button>
          <Button
            className="flex-1 py-6 text-lg"
            onClick={() => setCurrentStep("products")}
          >
            {userPreOrders.length > 0 ? "New Order" : "Continue"}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>

      </div>
    </div>
  )
}


  // STEP: Products
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <StepIndicator />
      
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div><h1 className="font-bold text-lg">{isNextWeek ? "Next Week Order" : "Select Products"}</h1><p className="text-xs text-gray-500">{storeInfo?.storeName}</p></div>
            <Button variant="outline" size="sm" onClick={() => setCurrentStep("preorders")}><Clock className="h-3 w-3 mr-1" /> Pre-Orders</Button>
          </div>
          
          {/* View Toggle: All vs Last Week */}
          {lastWeekOrder.length > 0 && (
            <div className="flex gap-2 mb-2">
              <Button size="sm" variant={viewMode === "all" ? "default" : "outline"} className="flex-1" onClick={() => setViewMode("all")}>
                <Package className="h-4 w-4 mr-1" /> All Products
              </Button>
              <Button size="sm" variant={viewMode === "lastWeek" ? "default" : "outline"} className="flex-1" onClick={() => setViewMode("lastWeek")}>
                <History className="h-4 w-4 mr-1" /> Last Week ({lastWeekOrder.length})
              </Button>
            </div>
          )}
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10" />
            {searchTerm && (<button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-gray-400" /></button>)}
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="overflow-x-auto">
          <div className="flex gap-2 px-3 pb-2">
            {categories.map((cat: string) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3">
        {/* Pallet Progress */}
        <PalletProgress />
        
        {/* Copy Last Week Button */}
        {lastWeekOrder.length > 0 && viewMode === "lastWeek" && (
          <Button variant="outline" className="w-full mb-3 border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50" onClick={copyLastWeekOrder}>
            <Sparkles className="h-4 w-4 mr-2" /> Copy Last Week's Order to Cart
          </Button>
        )}
        
        {/* Last Week Section Header */}
        {viewMode === "all" && lastWeekProductIds.size > 0 && selectedCategory === "all" && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <History className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 font-medium">Your last week items appear first</span>
          </div>
        )}

        {/* Products Grid */}
       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {filteredProducts.map((product: any) => {
    const qty = quantities[product.id] || { box: 0, unit: 0 }
    const boxPrice = product.pricePerBox || 0
    const unitPrice = product.pricePerUnit || product.price || 0
    const isLastWeek = lastWeekProductIds.has(product.id)
    const lastWeekItem = lastWeekOrder.find((item: any) => (item.productId || item.product) === product.id)
    const hasQty = qty.box > 0 || qty.unit > 0

    return (
      <Card
        key={product.id}
        className={`overflow-hidden transition-all rounded-lg shadow-md hover:shadow-lg border ${
          hasQty ? "ring-2 ring-blue-500" : "border-gray-200"
        } ${isLastWeek ? "border-l-4 border-l-amber-400" : ""}`}
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            {/* Product Image */}
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <Package className="h-8 w-8 text-gray-400" />
              )}
              {isLastWeek && lastWeekItem && (
                <Badge className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] px-1 py-0.5 flex items-center gap-0.5">
                  <History className="h-2.5 w-2.5" /> Last
                </Badge>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold">{product.name}</h3>
                <p className="text-xs text-gray-500">{product.category}</p>
                {isLastWeek && lastWeekItem && (
                  <div className="text-xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 inline-block mt-1">
                    Last: {lastWeekItem.quantity} {lastWeekItem.pricingType || "box"}
                  </div>
                )}
              </div>

              {/* Box Quantity */}
              <div className="flex items-center justify-between mt-2 bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-1">
                  <Box className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium">Box</span>
                  {!isNextWeek && <span className="text-xs text-blue-600 font-bold">{formatCurrency(boxPrice)}</span>}
                </div>
                <div className="flex items-center bg-white border rounded-full overflow-hidden">
                  <button
                    onClick={() => updateBoxQuantity(product.id, -1)}
                    className="w-7 h-7 flex items-center justify-center text-blue-600 hover:bg-blue-50"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    value={qty.box}
                    onChange={(e) => setBoxQuantity(product.id, parseInt(e.target.value) || 0)}
                    className="w-10 text-center text-sm font-bold focus:outline-none"
                  />
                  <button
                    onClick={() => updateBoxQuantity(product.id, 1)}
                    className="w-7 h-7 flex items-center justify-center text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Unit Quantity */}
              <div className="flex items-center justify-between mt-1 bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-1">
                  <Scale className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium">{product.unit || "Unit"}</span>
                  {!isNextWeek && <span className="text-xs text-green-600 font-bold">{formatCurrency(unitPrice)}</span>}
                </div>
                <div className="flex items-center bg-white border rounded-full overflow-hidden">
                  <button
                    onClick={() => updateUnitQuantity(product.id, -1)}
                    className="w-7 h-7 flex items-center justify-center text-green-600 hover:bg-green-50"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    value={qty.unit}
                    onChange={(e) => setUnitQuantity(product.id, parseInt(e.target.value) || 0)}
                    className="w-10 text-center text-sm font-bold focus:outline-none"
                  />
                  <button
                    onClick={() => updateUnitQuantity(product.id, 1)}
                    className="w-7 h-7 flex items-center justify-center text-green-600 hover:bg-green-50"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  })}
</div>

        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No products found</p>
          </div>
        )}
      </div>

      {/* Floating Cart */}
      {(totalBoxes > 0 || totalUnits > 0) && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t shadow-lg z-50">
          {/* Mini Pallet Progress */}
          {totalBoxes > 0 && boxesToNextPallet < PALLET_SIZE && (
            <div className="flex items-center gap-2 mb-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1">
              <Layers className="h-3 w-3" />
              <span>Add {boxesToNextPallet} boxes to complete pallet!</span>
              <Progress value={palletProgress % 100} className="flex-1 h-1.5" />
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs"><Box className="h-3 w-3 mr-1" />{totalBoxes} box</Badge>
              {totalUnits > 0 && <Badge variant="outline" className="text-xs"><Scale className="h-3 w-3 mr-1" />{totalUnits} unit</Badge>}
            </div>
            {!isNextWeek && <span className="font-bold text-lg">{formatCurrency(cartTotal)}</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCartOpen(true)}>View Cart</Button>
            <Button className="flex-1" onClick={() => setCurrentStep("checkout")}><ShoppingCart className="h-4 w-4 mr-2" />Checkout</Button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Your Cart</span>
              {cartItems.length > 0 && <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 text-xs">Clear All</Button>}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2">
              {cartItems.map((product: any) => {
                const qty = quantities[product.id] || { box: 0, unit: 0 }
                return (
                  <div key={product.id} className="p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{product.name}</h4>
                      <button onClick={() => removeFromCart(product.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {qty.box > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600"><Box className="h-3 w-3 inline mr-1" />{qty.box} box × {formatCurrency(product.pricePerBox)}</span>
                        <span className="font-medium">{formatCurrency(product.pricePerBox * qty.box)}</span>
                      </div>
                    )}
                    {qty.unit > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600"><Scale className="h-3 w-3 inline mr-1" />{qty.unit} {product.unit} × {formatCurrency(product.pricePerUnit || product.price)}</span>
                        <span className="font-medium">{formatCurrency((product.pricePerUnit || product.price) * qty.unit)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
          {!isNextWeek && cartItems.length > 0 && (
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-blue-600">{formatCurrency(cartTotal)}</span></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCartOpen(false)} className="flex-1">Continue</Button>
            <Button onClick={() => { setCartOpen(false); setCurrentStep("checkout") }} className="flex-1">Checkout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={currentStep === "checkout"} onOpenChange={(open) => !open && setCurrentStep("products")}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Confirm Order</DialogTitle><DialogDescription>Review before placing</DialogDescription></DialogHeader>
          
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2"><User className="h-4 w-4 text-blue-600" /><span className="font-medium">{storeInfo?.storeName}</span></div>
            <p className="text-sm text-blue-700 mt-1">{storeInfo?.email}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg p-2">
              <h4 className="text-xs font-medium text-gray-500 mb-1"><Building2 className="h-3 w-3 inline mr-1" />Billing</h4>
              <p className="text-xs">{billingAddress.name}</p>
              <p className="text-xs text-gray-600">{billingAddress.address}, {billingAddress.city}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <h4 className="text-xs font-medium text-gray-500 mb-1"><Truck className="h-3 w-3 inline mr-1" />Shipping</h4>
              <p className="text-xs">{sameAsBilling ? billingAddress.name : shippingAddress.name}</p>
              <p className="text-xs text-gray-600">{sameAsBilling ? billingAddress.address : shippingAddress.address}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Order Items</h4>
            <div className="bg-gray-50 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto text-xs">
              {cartItems.map((product: any) => {
                const qty = quantities[product.id] || { box: 0, unit: 0 }
                return (
                  <div key={product.id}>
                    {qty.box > 0 && <div className="flex justify-between"><span>{qty.box} box - {product.name}</span>{!isNextWeek && <span>{formatCurrency(product.pricePerBox * qty.box)}</span>}</div>}
                    {qty.unit > 0 && <div className="flex justify-between"><span>{qty.unit} {product.unit} - {product.name}</span>{!isNextWeek && <span>{formatCurrency((product.pricePerUnit || product.price) * qty.unit)}</span>}</div>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pallet Summary */}
          {totalBoxes > 0 && (
            <div className="bg-orange-50 rounded-lg p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-orange-700"><Layers className="h-4 w-4 inline mr-1" />{palletsComplete} pallet(s) + {totalBoxes % PALLET_SIZE} boxes</span>
              </div>
            </div>
          )}

          {!isNextWeek && (
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(cartTotal)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2">
            <Button className="w-full py-5" onClick={handleSubmitOrder} disabled={isSubmitting || cartItems.length === 0}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Placing...</> : <><Check className="h-4 w-4 mr-2" /> Place Order</>}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setCurrentStep("products")}>Back</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StoreOrderMobile
