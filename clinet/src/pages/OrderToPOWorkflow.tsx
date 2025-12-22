"use client"

import { useEffect, useState, useMemo } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { RootState } from "@/redux/store"
import Navbar from "@/components/layout/Navbar"
import Sidebar from "@/components/layout/Sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import PageHeader from "@/components/shared/PageHeader"
import {
  Package, ShoppingCart, FileText, CheckCircle2, AlertCircle,
  Search, RefreshCw, Plus, Eye, Loader2, Edit, Trash2,
  Store, Building2, DollarSign, ClipboardList, Send, Check,
  X, Box, Scale, Save, AlertTriangle
} from "lucide-react"
import { getAllOrderAPI, updateOrderAPI } from "@/services2/operations/order"
import { getAllProductAPI } from "@/services2/operations/product"
import { getAllVendorsAPI } from "@/services2/operations/vendor"
import { createPurchaseOrderAPI, getAllPurchaseOrdersAPI, updatePurchaseOrderQualityAPI } from "@/services2/operations/purchaseOrder"
import { format, startOfWeek, endOfWeek, addDays } from "date-fns"

interface AggregatedProduct {
  productId: string
  productName: string
  totalBoxes: number
  totalUnits: number
  totalQuantity: number
  orders: { orderId: string; storeName: string; quantity: number; boxQty: number; unitQty: number }[]
  unitPrice: number
  selected: boolean
  poQuantity: number
}

interface ProductStoreMatrix {
  productId: string
  productName: string
  stores: { [storeId: string]: { boxQty: number; unitQty: number; orderId: string } }
  totalQty: number
}

const OrderToPOWorkflow = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  // States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("orders-matrix")
  
  // Data states
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  
  // Selection states
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [aggregatedProducts, setAggregatedProducts] = useState<AggregatedProduct[]>([])
  
  // Modal states
  const [createPOOpen, setCreatePOOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<string>("")
  const [poNotes, setPONotes] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [isCreatingPO, setIsCreatingPO] = useState(false)
  
  // Edit states
  const [editingCell, setEditingCell] = useState<{productId: string, storeId: string} | null>(null)
  const [editedQuantities, setEditedQuantities] = useState<{[key: string]: {boxQty: number, unitQty: number}}>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [savingChanges, setSavingChanges] = useState(false)
  
  // Quality check states
  const [qualityCheckOpen, setQualityCheckOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<any>(null)
  const [qualityItems, setQualityItems] = useState<any[]>([])
  const [savingQuality, setSavingQuality] = useState(false)
  
  // Edit order modal states
  const [editOrderOpen, setEditOrderOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [editOrderItems, setEditOrderItems] = useState<any[]>([])
  const [savingOrder, setSavingOrder] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("this-week")

  // Fetch all data
  const fetchData = async () => {
    setLoading(true)
    try {
      const [ordersRes, productsRes, vendorsRes, poRes] = await Promise.all([
        getAllOrderAPI(token),
        getAllProductAPI(),
        getAllVendorsAPI(),
        getAllPurchaseOrdersAPI(token)
      ])

      let ordersData: any[] = []
      if (Array.isArray(ordersRes)) {
        ordersData = ordersRes
      } else if (ordersRes?.orders) {
        ordersData = ordersRes.orders
      }
      
      setOrders(ordersData.filter(o => !o.isDelete))
      setProducts(productsRes || [])
      setVendors(vendorsRes || [])
      
      let poData: any[] = []
      if (Array.isArray(poRes)) {
        poData = poRes
      } else if (poRes?.orders) {
        poData = poRes.orders
      }
      setPurchaseOrders(poData)
      
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to load data" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [token])

  // Filter orders based on criteria
  const filteredOrders = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    return orders.filter(order => {
      const matchesSearch = 
        order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.store?.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.billingAddress?.name?.toLowerCase().includes(searchTerm.toLowerCase())

      let matchesDate = true
      const orderDate = new Date(order.createdAt)
      if (dateFilter === "today") {
        matchesDate = orderDate.toDateString() === now.toDateString()
      } else if (dateFilter === "this-week") {
        matchesDate = orderDate >= weekStart && orderDate <= weekEnd
      }

      return matchesSearch && matchesDate && order.status === "Processing"
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, searchTerm, dateFilter])

  // Get unique stores from filtered orders
  const uniqueStores = useMemo(() => {
    const storeMap = new Map()
    filteredOrders.forEach(order => {
      const storeId = order.store?._id || order._id
      const storeName = order.store?.storeName || order.billingAddress?.name || "Unknown"
      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, { id: storeId, name: storeName, orderId: order._id })
      }
    })
    return Array.from(storeMap.values())
  }, [filteredOrders])

  // Build product-store matrix
  const productStoreMatrix = useMemo(() => {
    const matrix: ProductStoreMatrix[] = []
    const productMap = new Map<string, ProductStoreMatrix>()

    filteredOrders.forEach(order => {
      const storeId = order.store?._id || order._id
      
      order.items?.forEach((item: any) => {
        const productId = item.productId || item._id || item.id
        const productName = item.name || item.productName || "Unknown"
        
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            productId,
            productName,
            stores: {},
            totalQty: 0
          })
        }
        
        const product = productMap.get(productId)!
        const boxQty = item.boxQuantity || item.quantity || 0
        const unitQty = item.unitQuantity || 0
        
        product.stores[storeId] = {
          boxQty,
          unitQty,
          orderId: order._id
        }
        product.totalQty += boxQty + unitQty
      })
    })

    return Array.from(productMap.values()).sort((a, b) => a.productName.localeCompare(b.productName))
  }, [filteredOrders])

  // Handle cell edit
  const handleCellEdit = (productId: string, storeId: string, boxQty: number, unitQty: number) => {
    const key = `${productId}-${storeId}`
    setEditedQuantities(prev => ({
      ...prev,
      [key]: { boxQty, unitQty }
    }))
    setHasChanges(true)
  }

  // Save all changes to orders
  const saveAllChanges = async () => {
    setSavingChanges(true)
    try {
      // Group changes by order
      const orderChanges: { [orderId: string]: any[] } = {}
      
      Object.entries(editedQuantities).forEach(([key, qty]) => {
        const [productId, storeId] = key.split('-')
        const product = productStoreMatrix.find(p => p.productId === productId)
        if (product && product.stores[storeId]) {
          const orderId = product.stores[storeId].orderId
          if (!orderChanges[orderId]) {
            orderChanges[orderId] = []
          }
          orderChanges[orderId].push({
            productId,
            boxQuantity: qty.boxQty,
            unitQuantity: qty.unitQty
          })
        }
      })

      // Update each order
      for (const [orderId, items] of Object.entries(orderChanges)) {
        const order = orders.find(o => o._id === orderId)
        if (order) {
          const updatedItems = order.items.map((item: any) => {
            const change = items.find(c => c.productId === (item.productId || item._id || item.id))
            if (change) {
              return {
                ...item,
                boxQuantity: change.boxQuantity,
                quantity: change.boxQuantity,
                unitQuantity: change.unitQuantity
              }
            }
            return item
          })
          
          await updateOrderAPI({ items: updatedItems }, token, orderId)
        }
      }

      toast({ title: "Success", description: "All changes saved to orders" })
      setEditedQuantities({})
      setHasChanges(false)
      setEditingCell(null)
      fetchData()
    } catch (error) {
      console.error("Error saving changes:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to save changes" })
    } finally {
      setSavingChanges(false)
    }
  }

  // Get cell value (edited or original)
  const getCellValue = (productId: string, storeId: string) => {
    const key = `${productId}-${storeId}`
    if (editedQuantities[key]) {
      return editedQuantities[key]
    }
    const product = productStoreMatrix.find(p => p.productId === productId)
    if (product && product.stores[storeId]) {
      return { boxQty: product.stores[storeId].boxQty, unitQty: product.stores[storeId].unitQty }
    }
    return { boxQty: 0, unitQty: 0 }
  }

  // Calculate row total
  const getRowTotal = (productId: string) => {
    let total = 0
    uniqueStores.forEach(store => {
      const val = getCellValue(productId, store.id)
      total += val.boxQty + val.unitQty
    })
    return total
  }

  // Calculate column total
  const getColumnTotal = (storeId: string) => {
    let total = 0
    productStoreMatrix.forEach(product => {
      const val = getCellValue(product.productId, storeId)
      total += val.boxQty + val.unitQty
    })
    return total
  }

  // Select all orders for PO
  const selectAllOrders = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredOrders.map(o => o._id))
    }
  }

  // Aggregate products from selected orders
  const aggregateSelectedOrders = () => {
    const productMap = new Map<string, AggregatedProduct>()

    filteredOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        const productId = item.productId || item._id || item.id
        const existing = productMap.get(productId)
        const boxQty = item.boxQuantity || item.quantity || 0
        const unitQty = item.unitQuantity || 0

        if (existing) {
          existing.totalBoxes += boxQty
          existing.totalUnits += unitQty
          existing.totalQuantity += boxQty + unitQty
          existing.orders.push({
            orderId: order._id,
            storeName: order.store?.storeName || order.billingAddress?.name || "Unknown",
            quantity: boxQty + unitQty,
            boxQty,
            unitQty
          })
        } else {
          productMap.set(productId, {
            productId,
            productName: item.name || item.productName || "Unknown Product",
            totalBoxes: boxQty,
            totalUnits: unitQty,
            totalQuantity: boxQty + unitQty,
            orders: [{
              orderId: order._id,
              storeName: order.store?.storeName || order.billingAddress?.name || "Unknown",
              quantity: boxQty + unitQty,
              boxQty,
              unitQty
            }],
            unitPrice: item.price || item.pricePerBox || 0,
            selected: true,
            poQuantity: boxQty + unitQty
          })
        }
      })
    })

    setAggregatedProducts(Array.from(productMap.values()))
    setCreatePOOpen(true)
  }

  // Toggle product selection for PO
  const toggleProductSelection = (productId: string) => {
    setAggregatedProducts(prev => 
      prev.map(p => p.productId === productId ? { ...p, selected: !p.selected } : p)
    )
  }

  // Update PO quantity
  const updatePOQuantity = (productId: string, quantity: number) => {
    setAggregatedProducts(prev => 
      prev.map(p => p.productId === productId ? { ...p, poQuantity: quantity } : p)
    )
  }

  // Create Purchase Order
  const handleCreatePO = async () => {
    if (!selectedVendor) {
      toast({ variant: "destructive", title: "Error", description: "Please select a vendor" })
      return
    }

    const selectedProducts = aggregatedProducts.filter(p => p.selected && p.poQuantity > 0)
    if (selectedProducts.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select at least one product" })
      return
    }

    setIsCreatingPO(true)
    try {
      const poNumber = `PO-${Date.now()}`
      const items = selectedProducts.map(p => ({
        productId: p.productId,
        productName: p.productName,
        quantity: p.poQuantity,
        unitPrice: p.unitPrice,
        totalPrice: p.poQuantity * p.unitPrice
      }))

      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0)

      const poData = {
        vendorId: selectedVendor,
        purchaseOrderNumber: poNumber,
        purchaseDate: new Date().toISOString().split('T')[0],
        deliveryDate: deliveryDate || addDays(new Date(), 3).toISOString().split('T')[0],
        notes: poNotes || `Created from ${filteredOrders.length} store orders`,
        items,
        totalAmount,
        mail: 1
      }

      const result = await createPurchaseOrderAPI(poData, token)
      
      if (result) {
        toast({ title: "Success", description: "Purchase Order created successfully" })
        setCreatePOOpen(false)
        setSelectedOrders([])
        setAggregatedProducts([])
        setSelectedVendor("")
        setPONotes("")
        fetchData()
      }
    } catch (error) {
      console.error("Error creating PO:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to create Purchase Order" })
    } finally {
      setIsCreatingPO(false)
    }
  }

  // Open quality check modal
  const openQualityCheck = (po: any) => {
    setSelectedPO(po)
    setQualityItems(po.items?.map((item: any) => ({
      ...item,
      qualityStatus: item.qualityStatus || 'pending',
      qualityNotes: item.qualityNotes || '',
      receivedQuantity: item.quantity
    })) || [])
    setQualityCheckOpen(true)
  }

  // Update quality item
  const updateQualityItem = (index: number, field: string, value: any) => {
    setQualityItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  // Save quality check
  const saveQualityCheck = async () => {
    if (!selectedPO) return
    
    setSavingQuality(true)
    try {
      await updatePurchaseOrderQualityAPI(selectedPO._id, qualityItems, token)
      toast({ title: "Success", description: "Quality check saved" })
      setQualityCheckOpen(false)
      fetchData()
    } catch (error) {
      console.error("Error saving quality check:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to save quality check" })
    } finally {
      setSavingQuality(false)
    }
  }

  // Open edit order modal
  const handleEditOrder = (order: any) => {
    setSelectedOrder(order)
    setEditOrderItems(order.items?.map((item: any) => ({
      ...item,
      productId: item.productId || item._id || item.id,
      productName: item.name || item.productName || "Unknown",
      boxQuantity: item.boxQuantity || item.quantity || 0,
      unitQuantity: item.unitQuantity || 0,
      price: item.price || item.pricePerBox || item.unitPrice || 0
    })) || [])
    setEditOrderOpen(true)
  }

  // Update edit order item
  const updateEditOrderItem = (index: number, field: string, value: any) => {
    setEditOrderItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  // Remove item from order
  const removeEditOrderItem = (index: number) => {
    setEditOrderItems(prev => prev.filter((_, i) => i !== index))
  }

  // Save edited order
  const saveEditedOrder = async () => {
    if (!selectedOrder) return
    
    setSavingOrder(true)
    try {
      const updatedItems = editOrderItems.map(item => ({
        ...item,
        name: item.productName,
        quantity: item.boxQuantity,
        boxQuantity: item.boxQuantity,
        unitQuantity: item.unitQuantity
      }))
      
      const total = updatedItems.reduce((sum, item) => {
        return sum + ((item.boxQuantity + item.unitQuantity) * item.price)
      }, 0)
      
      await updateOrderAPI({ 
        items: updatedItems,
        subtotal: total,
        total: total + (selectedOrder.shipping || 0)
      }, token, selectedOrder._id)
      
      toast({ title: "Success", description: "Order updated successfully" })
      setEditOrderOpen(false)
      setSelectedOrder(null)
      fetchData()
    } catch (error) {
      console.error("Error saving order:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to update order" })
    } finally {
      setSavingOrder(false)
    }
  }

  // Calculate order total
  const calculateEditOrderTotal = () => {
    return editOrderItems.reduce((sum, item) => {
      return sum + ((item.boxQuantity + item.unitQuantity) * item.price)
    }, 0)
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Processing: "bg-yellow-100 text-yellow-700",
      Confirmed: "bg-blue-100 text-blue-700",
      Shipped: "bg-purple-100 text-purple-700",
      Delivered: "bg-green-100 text-green-700",
      Cancelled: "bg-red-100 text-red-700"
    }
    return <Badge className={styles[status] || "bg-gray-100 text-gray-700"}>{status}</Badge>
  }

  const getPOStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "quality-check": "bg-yellow-100 text-yellow-700",
      "approved": "bg-green-100 text-green-700",
      "partial": "bg-blue-100 text-blue-700",
      "rejected": "bg-red-100 text-red-700"
    }
    return <Badge className={styles[status] || "bg-gray-100 text-gray-700"}>{status}</Badge>
  }

  // Stats calculations
  const stats = useMemo(() => {
    const pendingOrders = filteredOrders.length
    const totalPOs = purchaseOrders.length
    const qualityCheckPOs = purchaseOrders.filter(po => po.status === "quality-check").length
    const completedPOs = purchaseOrders.filter(po => 
      po.items?.every((item: any) => item.qualityStatus === "approved" || item.qualityStatus === "rejected")
    ).length
    
    return { pendingOrders, totalPOs, qualityCheckPOs, completedPOs }
  }, [filteredOrders, purchaseOrders])

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="flex-1 flex flex-col">
          <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-gray-600">Loading workflow data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <PageHeader
            title="Order to PO Workflow"
            description="View orders matrix, create purchase orders, and manage quality checks"
            icon={<ClipboardList className="h-6 w-6" />}
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Pending Orders</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Total POs</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalPOs}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Quality Check</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.qualityCheckPOs}</p>
                  </div>
                  <Scale className="h-8 w-8 text-yellow-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completedPOs}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <TabsList className="bg-white border">
                <TabsTrigger value="orders-matrix">
                  <Package className="h-4 w-4 mr-1" /> Orders Matrix
                </TabsTrigger>
                <TabsTrigger value="all-orders">
                  <ShoppingCart className="h-4 w-4 mr-1" /> All Orders
                </TabsTrigger>
                <TabsTrigger value="purchase-orders">
                  <FileText className="h-4 w-4 mr-1" /> Purchase Orders
                </TabsTrigger>
                <TabsTrigger value="quality-check">
                  <Scale className="h-4 w-4 mr-1" /> Quality Check
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchData()}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
                {hasChanges && (
                  <Button size="sm" onClick={saveAllChanges} disabled={savingChanges}>
                    {savingChanges ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Save Changes
                  </Button>
                )}
              </div>
            </div>

            {/* Orders Matrix Tab - Like the screenshot */}
            <TabsContent value="orders-matrix" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Edit className="h-5 w-5" /> Orders Matrix
                      </CardTitle>
                      <CardDescription>
                        Click any cell to edit. Changes will be saved to real orders when you click "Save Changes".
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-48"
                        />
                      </div>
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="this-week">This Week</option>
                      </select>
                      <Button onClick={aggregateSelectedOrders} disabled={productStoreMatrix.length === 0}>
                        <Plus className="h-4 w-4 mr-1" /> Create PO
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {hasChanges && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm text-yellow-700">You have unsaved changes. Click "Save Changes" to update orders.</span>
                    </div>
                  )}
                  
                  {productStoreMatrix.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No orders found for the selected period</p>
                    </div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border p-2 text-left font-semibold sticky left-0 bg-gray-50 min-w-[200px]">
                              PRODUCT NAME
                            </th>
                            {uniqueStores.map(store => {
                              const storeOrder = filteredOrders.find(o => o._id === store.orderId)
                              return (
                                <th key={store.id} className="border p-2 text-center font-semibold min-w-[100px]">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="text-xs truncate max-w-[90px]" title={store.name}>
                                      {store.name.length > 10 ? store.name.substring(0, 10) + '...' : store.name}
                                    </div>
                                    {storeOrder && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-1 text-xs text-blue-600 hover:text-blue-800"
                                        onClick={() => handleEditOrder(storeOrder)}
                                      >
                                        <Edit className="h-3 w-3 mr-1" /> Edit
                                      </Button>
                                    )}
                                  </div>
                                </th>
                              )
                            })}
                            <th className="border p-2 text-center font-semibold bg-blue-50 min-w-[60px]">
                              TOTAL
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {productStoreMatrix.map(product => (
                            <tr key={product.productId} className="hover:bg-gray-50">
                              <td className="border p-2 sticky left-0 bg-white">
                                <div className="flex items-center gap-2">
                                  <Box className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium truncate max-w-[180px]" title={product.productName}>
                                    {product.productName}
                                  </span>
                                </div>
                              </td>
                              {uniqueStores.map(store => {
                                const cellValue = getCellValue(product.productId, store.id)
                                const isEditing = editingCell?.productId === product.productId && editingCell?.storeId === store.id
                                const hasValue = cellValue.boxQty > 0 || cellValue.unitQty > 0
                                const key = `${product.productId}-${store.id}`
                                const isEdited = !!editedQuantities[key]
                                
                                return (
                                  <td 
                                    key={store.id} 
                                    className={`border p-1 text-center cursor-pointer transition-colors ${
                                      isEdited ? 'bg-yellow-100' : hasValue ? 'bg-green-50' : ''
                                    } hover:bg-blue-50`}
                                    onClick={() => setEditingCell({ productId: product.productId, storeId: store.id })}
                                  >
                                    {isEditing ? (
                                      <div className="flex flex-col gap-1">
                                        <Input
                                          type="number"
                                          min={0}
                                          value={cellValue.boxQty}
                                          onChange={(e) => handleCellEdit(product.productId, store.id, parseInt(e.target.value) || 0, cellValue.unitQty)}
                                          className="h-6 text-xs text-center p-1"
                                          placeholder="Box"
                                          autoFocus
                                          onBlur={() => setEditingCell(null)}
                                          onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                                        />
                                      </div>
                                    ) : (
                                      <span className={`${hasValue ? 'font-medium' : 'text-gray-300'}`}>
                                        {hasValue ? cellValue.boxQty + cellValue.unitQty : 0}
                                      </span>
                                    )}
                                  </td>
                                )
                              })}
                              <td className="border p-2 text-center font-bold bg-blue-50">
                                {getRowTotal(product.productId)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-100 font-bold">
                            <td className="border p-2 sticky left-0 bg-gray-100">TOTALS</td>
                            {uniqueStores.map(store => (
                              <td key={store.id} className="border p-2 text-center">
                                {getColumnTotal(store.id)}
                              </td>
                            ))}
                            <td className="border p-2 text-center bg-blue-100">
                              {productStoreMatrix.reduce((sum, p) => sum + getRowTotal(p.productId), 0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Orders Tab */}
            <TabsContent value="all-orders" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">All Orders</CardTitle>
                      <CardDescription>View and edit individual orders</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search orders..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="this-week">This Week</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No orders found</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {filteredOrders.map(order => (
                          <div key={order._id} className="p-4 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">#{order.orderNumber}</span>
                                {getStatusBadge(order.status)}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {format(new Date(order.createdAt), "MMM dd, yyyy")}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => navigate(`/orders/edit/${order._id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-1" /> View
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditOrder(order)}
                                >
                                  <Edit className="h-4 w-4 mr-1" /> Edit Items
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <Store className="h-4 w-4" />
                                {order.store?.storeName || order.billingAddress?.name || "Unknown Store"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                {order.items?.length || 0} items
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {formatCurrency(order.total || 0)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {order.items?.slice(0, 5).map((item: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {item.name || item.productName} x{item.boxQuantity || item.quantity}
                                </Badge>
                              ))}
                              {order.items?.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{order.items.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Purchase Orders Tab */}
            <TabsContent value="purchase-orders" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">All Purchase Orders</CardTitle>
                  <CardDescription>View and manage purchase orders</CardDescription>
                </CardHeader>
                <CardContent>
                  {purchaseOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No purchase orders yet</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {purchaseOrders.map(po => (
                          <div key={po._id} className="p-4 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{po.purchaseOrderNumber}</span>
                                {getPOStatusBadge(po.status)}
                                <Badge variant="outline">
                                  {po.paymentStatus === "paid" ? "Paid" : po.paymentStatus === "partial" ? "Partial" : "Pending"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {format(new Date(po.purchaseDate || po.createdAt), "MMM dd, yyyy")}
                                </span>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/vendors/edit-purchase/${po._id}`)}
                                >
                                  <Edit className="h-4 w-4 mr-1" /> Edit
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => openQualityCheck(po)}
                                >
                                  <Scale className="h-4 w-4 mr-1" /> Quality Check
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {po.vendor?.name || "Unknown Vendor"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                {po.items?.length || 0} items
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {formatCurrency(po.totalAmount || 0)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {po.items?.map((item: any, idx: number) => {
                                const statusColor = item.qualityStatus === "approved" 
                                  ? "bg-green-100 text-green-700" 
                                  : item.qualityStatus === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                                return (
                                  <Badge key={idx} className={`text-xs ${statusColor}`}>
                                    {item.productName || item.productId?.name} x{item.quantity}
                                  </Badge>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quality Check Tab */}
            <TabsContent value="quality-check" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Quality Check</CardTitle>
                  <CardDescription>Confirm what products and quantities you received</CardDescription>
                </CardHeader>
                <CardContent>
                  {purchaseOrders.filter(po => po.status === "quality-check").length === 0 ? (
                    <div className="text-center py-12">
                      <Scale className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No purchase orders pending quality check</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4">
                        {purchaseOrders
                          .filter(po => po.status === "quality-check")
                          .map(po => (
                            <div key={po._id} className="border rounded-lg overflow-hidden">
                              <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                                <div>
                                  <span className="font-semibold">{po.purchaseOrderNumber}</span>
                                  <span className="text-sm text-gray-500 ml-2">
                                    from {po.vendor?.name || "Unknown Vendor"}
                                  </span>
                                </div>
                                <Button size="sm" onClick={() => openQualityCheck(po)}>
                                  <Check className="h-4 w-4 mr-1" /> Confirm Items
                                </Button>
                              </div>
                              <div className="p-4">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left p-2">Product</th>
                                      <th className="text-center p-2">Ordered</th>
                                      <th className="text-center p-2">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {po.items?.map((item: any, idx: number) => (
                                      <tr key={idx} className="border-b last:border-0">
                                        <td className="p-2">{item.productName || item.productId?.name}</td>
                                        <td className="p-2 text-center font-medium">{item.quantity}</td>
                                        <td className="p-2 text-center">
                                          {item.qualityStatus === "pending" ? (
                                            <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                                          ) : item.qualityStatus === "approved" ? (
                                            <Badge className="bg-green-100 text-green-700">
                                              <Check className="h-3 w-3 mr-1" /> Approved
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-red-100 text-red-700">
                                              <X className="h-3 w-3 mr-1" /> Rejected
                                            </Badge>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Create PO Modal */}
      <Dialog open={createPOOpen} onOpenChange={setCreatePOOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Create Purchase Order
            </DialogTitle>
            <DialogDescription>
              Review aggregated products from {filteredOrders.length} orders
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4 py-4">
            {/* Vendor Selection */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Select Vendor *</Label>
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Choose a vendor...</option>
                  {vendors.map(vendor => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Delivery Date</Label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Optional notes..."
                  value={poNotes}
                  onChange={(e) => setPONotes(e.target.value)}
                />
              </div>
            </div>

            {/* Products Table */}
            <div className="space-y-2">
              <Label>Products Summary</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left">
                        <Checkbox
                          checked={aggregatedProducts.every(p => p.selected)}
                          onCheckedChange={() => {
                            const allSelected = aggregatedProducts.every(p => p.selected)
                            setAggregatedProducts(prev => prev.map(p => ({ ...p, selected: !allSelected })))
                          }}
                        />
                      </th>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3 text-center">From Orders</th>
                      <th className="p-3 text-center">PO Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedProducts.map(product => (
                      <tr key={product.productId} className={`border-t ${product.selected ? '' : 'opacity-50'}`}>
                        <td className="p-3">
                          <Checkbox
                            checked={product.selected}
                            onCheckedChange={() => toggleProductSelection(product.productId)}
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-xs text-gray-500">
                            {product.orders.map(o => `${o.storeName}: ${o.quantity}`).join(', ')}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline">{product.totalQuantity}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Input
                            type="number"
                            min={0}
                            value={product.poQuantity}
                            onChange={(e) => updatePOQuantity(product.productId, parseInt(e.target.value) || 0)}
                            className="w-20 h-8 text-center mx-auto"
                            disabled={!product.selected}
                          />
                        </td>
                        <td className="p-3 text-right">{formatCurrency(product.unitPrice)}</td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(product.poQuantity * product.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr className="border-t">
                      <td colSpan={5} className="p-3 text-right font-semibold">Total PO Amount:</td>
                      <td className="p-3 text-right font-bold text-green-600 text-lg">
                        {formatCurrency(
                          aggregatedProducts
                            .filter(p => p.selected)
                            .reduce((sum, p) => sum + (p.poQuantity * p.unitPrice), 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePOOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePO} disabled={isCreatingPO || !selectedVendor}>
              {isCreatingPO ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" /> Create & Send PO
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quality Check Modal */}
      <Dialog open={qualityCheckOpen} onOpenChange={setQualityCheckOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" /> Quality Check - {selectedPO?.purchaseOrderNumber}
            </DialogTitle>
            <DialogDescription>
              Confirm what products and quantities you received from the vendor
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-center">Ordered</th>
                    <th className="p-3 text-center">Received</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {qualityItems.map((item, idx) => (
                    <tr key={idx} className={`border-t ${
                      item.qualityStatus === 'approved' ? 'bg-green-50' : 
                      item.qualityStatus === 'rejected' ? 'bg-red-50' : ''
                    }`}>
                      <td className="p-3">
                        <div className="font-medium">{item.productName || item.productId?.name}</div>
                      </td>
                      <td className="p-3 text-center font-medium">{item.quantity}</td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min={0}
                          value={item.receivedQuantity}
                          onChange={(e) => updateQualityItem(idx, 'receivedQuantity', parseInt(e.target.value) || 0)}
                          className="w-20 h-8 text-center mx-auto"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant={item.qualityStatus === 'approved' ? 'default' : 'outline'}
                            className={item.qualityStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                            onClick={() => updateQualityItem(idx, 'qualityStatus', 'approved')}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={item.qualityStatus === 'rejected' ? 'default' : 'outline'}
                            className={item.qualityStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                            onClick={() => updateQualityItem(idx, 'qualityStatus', 'rejected')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-3">
                        <Input
                          placeholder="Add notes..."
                          value={item.qualityNotes}
                          onChange={(e) => updateQualityItem(idx, 'qualityNotes', e.target.value)}
                          className="h-8"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {qualityItems.filter(i => i.qualityStatus === 'approved').length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">
                    {qualityItems.filter(i => i.qualityStatus === 'rejected').length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {qualityItems.filter(i => i.qualityStatus === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQualityCheckOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveQualityCheck} disabled={savingQuality}>
              {savingQuality ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" /> Save Quality Check
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Modal */}
      <Dialog open={editOrderOpen} onOpenChange={setEditOrderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" /> Edit Order - #{selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Edit product quantities for {selectedOrder?.store?.storeName || selectedOrder?.billingAddress?.name || "this store"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            {/* Order Info */}
            <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Store</p>
                <p className="font-medium">{selectedOrder?.store?.storeName || selectedOrder?.billingAddress?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Order Date</p>
                <p className="font-medium">{selectedOrder?.createdAt ? format(new Date(selectedOrder.createdAt), "MMM dd, yyyy") : "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                {selectedOrder?.status && getStatusBadge(selectedOrder.status)}
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-center">Box Qty</th>
                    <th className="p-3 text-center">Unit Qty</th>
                    <th className="p-3 text-center">Total Qty</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {editOrderItems.map((item, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{item.productName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min={0}
                          value={item.boxQuantity}
                          onChange={(e) => updateEditOrderItem(idx, 'boxQuantity', parseInt(e.target.value) || 0)}
                          className="w-20 h-8 text-center mx-auto"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min={0}
                          value={item.unitQuantity}
                          onChange={(e) => updateEditOrderItem(idx, 'unitQuantity', parseInt(e.target.value) || 0)}
                          className="w-20 h-8 text-center mx-auto"
                        />
                      </td>
                      <td className="p-3 text-center font-medium">
                        {item.boxQuantity + item.unitQuantity}
                      </td>
                      <td className="p-3 text-right">{formatCurrency(item.price)}</td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency((item.boxQuantity + item.unitQuantity) * item.price)}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeEditOrderItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr className="border-t">
                    <td colSpan={3} className="p-3 text-right font-semibold">Totals:</td>
                    <td className="p-3 text-center font-bold">
                      {editOrderItems.reduce((sum, item) => sum + item.boxQuantity + item.unitQuantity, 0)}
                    </td>
                    <td className="p-3"></td>
                    <td className="p-3 text-right font-bold text-green-600 text-lg">
                      {formatCurrency(calculateEditOrderTotal())}
                    </td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pallet Info */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Pallet Progress</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-blue-600">
                    {editOrderItems.reduce((sum, item) => sum + item.boxQuantity, 0)}
                  </span>
                  <span className="text-blue-600"> / 48 boxes</span>
                  <span className="text-sm text-blue-500 ml-2">
                    ({Math.floor(editOrderItems.reduce((sum, item) => sum + item.boxQuantity, 0) / 48)} full pallets)
                  </span>
                </div>
              </div>
              <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all"
                  style={{ 
                    width: `${Math.min(100, (editOrderItems.reduce((sum, item) => sum + item.boxQuantity, 0) % 48) / 48 * 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditedOrder} disabled={savingOrder}>
              {savingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" /> Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OrderToPOWorkflow
