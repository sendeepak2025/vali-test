"use client"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { RootState } from "@/redux/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import { 
  Store, ShoppingCart, Package, Receipt, CreditCard, TrendingUp, Clock, 
  Calendar, Download, FileText, Search, Bell, Settings, LogOut, User,
  ChevronRight, Plus, Minus, Eye, RefreshCw, Phone, Mail, MapPin,
  DollarSign, AlertCircle, CheckCircle2, XCircle, Truck, History,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Loader2, ExternalLink,
  ShoppingBag, Wallet, Building2, Star, Filter, MoreVertical, AlertTriangle
} from "lucide-react"
import { getAllOrderAPI, getUserLatestOrdersAPI, getStatement } from "@/services2/operations/order"
import { getAllProductAPI } from "@/services2/operations/product"
import { format } from "date-fns"
import StorePreOrders from "./StorePreOrders"
import StoreProfileUpdate from "@/components/store/StoreProfileUpdate"
import { logout } from "@/services2/operations/auth";
import StoreInvoiceStatement from "@/components/store/StoreInvoiceStatement"
import QualityIssueReport from "@/components/store/QualityIssueReport"

const StoreDashboardEnhanced = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth?.user ?? null)
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  // States
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [statement, setStatement] = useState<any>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
 const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout(navigate));
  };
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?._id) return
      setLoading(true)
      try {
        // Fetch orders for this store - API already filters by store
        const ordersRes = await getAllOrderAPI(token)
        console.log("Orders response:", ordersRes)
        
        // Use the orders directly from API response since it's already filtered
        const storeOrders = ordersRes?.orders || []
        console.log("Store orders:", storeOrders)
        console.log("First order structure:", storeOrders[0])
        setOrders(storeOrders)

        // Fetch products
        const productsRes = await getAllProductAPI()
        setProducts(productsRes || [])

        // Fetch statement
        try {
          const statementRes = await getStatement(user._id, token)
          setStatement(statementRes)
        } catch (e) {
          console.log("Statement not available")
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({ variant: "destructive", title: "Error", description: "Failed to load data" })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user, token])

  // Calculate stats
  const totalOrders = orders.length
  const pendingOrders = orders.filter(o => o.status === "pending").length
  const completedOrders = orders.filter(o => o.status === "delivered" || o.status === "completed").length
  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const totalPaid = orders.filter(o => o.paymentStatus === "paid").reduce((sum, o) => sum + (o.total || 0), 0)
  const balanceDue = totalSpent - totalPaid

  // Recent orders (last 5)
  const recentOrders = [...orders].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.updatedAt || Date.now())
    const dateB = new Date(b.createdAt || b.updatedAt || Date.now())
    return dateB.getTime() - dateA.getTime()
  }).slice(0, 5)

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.items?.some((i: any) => i.productName?.toLowerCase().includes(searchTerm.toLowerCase()) || i.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = filterStatus === "all" || order.status === filterStatus
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt || a.updatedAt || Date.now())
    const dateB = new Date(b.createdAt || b.updatedAt || Date.now())
    return dateB.getTime() - dateA.getTime()
  })

  // Status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      processing: "bg-blue-100 text-blue-700",
      shipped: "bg-purple-100 text-purple-700",
      delivered: "bg-green-100 text-green-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700"
    }
    return <Badge className={styles[status] || "bg-gray-100 text-gray-700"}>{status}</Badge>
  }

  const getPaymentBadge = (status: string) => {
    if (status === "paid") return <Badge className="bg-green-100 text-green-700">Paid</Badge>
    if (status === "partial") return <Badge className="bg-yellow-100 text-yellow-700">Partial</Badge>
    return <Badge className="bg-red-100 text-red-700">Unpaid</Badge>
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
       <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Store Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{user?.storeName || "My Store"}</h1>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/store/mobile")}
            >
              <ShoppingCart className="h-4 w-4 mr-1" /> New Order
            </Button>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-5 w-5 text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Welcome back, {user?.ownerName || user?.storeName}!</h2>
              <p className="text-blue-100">Here's what's happening with your store today.</p>
            </div>
            <Button className="bg-white text-blue-600 hover:bg-blue-50" onClick={() => navigate("/store/mobile")}>
              <Plus className="h-4 w-4 mr-2" /> Place Order
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold">{totalOrders}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSpent)}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Paid</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Balance Due</p>
                  <p className={`text-2xl font-bold ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(balanceDue)}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${balanceDue > 0 ? "bg-red-100" : "bg-green-100"}`}>
                  <Wallet className="h-5 w-5" style={{ color: balanceDue > 0 ? "#dc2626" : "#16a34a" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Products
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Payments
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="preOrder" className="flex items-center gap-2">
              <User className="h-4 w-4" /> PreOrder
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <User className="h-4 w-4" /> Billing
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Issues
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Orders */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("orders")}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No orders yet</p>
                      <Button className="mt-4" onClick={() => navigate("/store/mobile")}>
                        <Plus className="h-4 w-4 mr-2" /> Place Your First Order
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentOrders.map((order) => (
                        <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer" onClick={() => { setSelectedOrder(order); setOrderDetailOpen(true) }}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">#{order.orderNumber || order._id?.slice(-6)}</p>
                              <p className="text-xs text-gray-500">{order.items?.length || 0} items • {format(new Date(order.createdAt || order.updatedAt || Date.now()), "MMM dd, yyyy")}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(order.total || 0)}</p>
                            {getStatusBadge(order.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/store/mobile")}>
                    <ShoppingCart className="h-4 w-4 mr-3" /> Place New Order
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/store/mobile/nextweek")}>
                    <Calendar className="h-4 w-4 mr-3" /> Next Week Order
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab("orders")}>
                    <History className="h-4 w-4 mr-3" /> View Order History
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab("payments")}>
                    <Receipt className="h-4 w-4 mr-3" /> View Statements
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab("products")}>
                    <Package className="h-4 w-4 mr-3" /> Browse Products
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Order Status Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  <p className="text-2xl font-bold text-yellow-700">{pendingOrders}</p>
                  <p className="text-sm text-yellow-600">Pending</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <Truck className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{orders.filter(o => o.status === "processing" || o.status === "shipped").length}</p>
                  <p className="text-sm text-blue-600">In Transit</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-700">{completedOrders}</p>
                  <p className="text-sm text-green-600">Completed</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <Star className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-purple-700">{products.length}</p>
                  <p className="text-sm text-purple-600">Products Available</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle>Order History</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No orders found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map((order) => (
                      <div key={order._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedOrder(order); setOrderDetailOpen(true) }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-semibold">Order #{order.orderNumber || order._id?.slice(-6)}</p>
                              <p className="text-sm text-gray-500">{format(new Date(order.createdAt || order.updatedAt || Date.now()), "MMMM dd, yyyy 'at' h:mm a")}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{formatCurrency(order.total || 0)}</p>
                            <div className="flex items-center gap-2 justify-end mt-1">
                              {getStatusBadge(order.status)}
                              {getPaymentBadge(order.paymentStatus)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 mt-3 pt-3 border-t">
                          <span>{order.items?.length || 0} items</span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" /> View Details
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Available Products</CardTitle>
                  <Button onClick={() => navigate("/store/mobile")}>
                    <ShoppingCart className="h-4 w-4 mr-2" /> Order Now
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.slice(0, 12).map((product) => (
                    <Card key={product._id} className="overflow-hidden">
                      <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-medium truncate">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.category?.name || "General"}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-blue-600">{formatCurrency(product.pricePerBox || product.price || 0)}</span>
                          <Badge variant="outline">{product.unit || "box"}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {products.length > 12 && (
                  <div className="text-center mt-6">
                    <Button variant="outline" onClick={() => navigate("/store/mobile")}>
                      View All {products.length} Products
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-green-600">Total Paid</p>
                      <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="text-sm text-red-600">Balance Due</p>
                      <p className="text-2xl font-bold text-red-700">{formatCurrency(balanceDue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-600">Total Orders Value</p>
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalSpent)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orders.filter(o => o.paymentStatus === "paid").length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No payment records yet</p>
                    </div>
                  ) : (
                    orders.filter(o => o.paymentStatus === "paid").map((order) => (
                      <div key={order._id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">Payment for Order #{order.orderNumber || order._id?.slice(-6)}</p>
                            <p className="text-sm text-gray-500">{format(new Date(order.updatedAt || order.createdAt || Date.now()), "MMM dd, yyyy")}</p>
                          </div>
                        </div>
                        <span className="font-bold text-green-600">{formatCurrency(order.total || 0)}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Unpaid Orders */}
            {orders.filter(o => o.paymentStatus !== "paid").length > 0 && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Unpaid Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orders.filter(o => o.paymentStatus !== "paid").map((order) => (
                      <div key={order._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium">Order #{order.orderNumber || order._id?.slice(-6)}</p>
                            <p className="text-sm text-gray-500">{format(new Date(order.createdAt || order.updatedAt || Date.now()), "MMM dd, yyyy")}</p>
                          </div>
                        </div>
                        <span className="font-bold text-red-600">{formatCurrency(order.total || 0)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Profile Information */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5" /> Current Store Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building2 className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Store Name</p>
                        <p className="font-medium">{user?.storeName || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <User className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Owner Name</p>
                        <p className="font-medium">{user?.ownerName || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{user?.email || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{user?.phone || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" /> Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium">{user?.address || "No address provided"}</p>
                      <p className="text-gray-600">{user?.city}{user?.state ? `, ${user.state}` : ""} {user?.zipCode}</p>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-blue-600">Member Since</p>
                        <p className="font-medium text-blue-700">{user?.createdAt ? format(new Date(user.createdAt), "MMMM dd, yyyy") : "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Profile Update Form */}
              <div>
                <StoreProfileUpdate />
              </div>
            </div>

            {/* Account Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Account Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{totalOrders}</p>
                    <p className="text-sm text-gray-500">Total Orders</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(totalSpent)}</p>
                    <p className="text-sm text-gray-500">Total Spent</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">{orders.filter(o => o.paymentStatus === "paid").length}</p>
                    <p className="text-sm text-gray-500">Paid Orders</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-orange-600">{totalOrders > 0 ? formatCurrency(totalSpent / totalOrders) : "$0"}</p>
                    <p className="text-sm text-gray-500">Avg Order Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

            <TabsContent value="preOrder" className="space-y-4">
            <StorePreOrders/>

            
          </TabsContent>


           <TabsContent value="billing" className="space-y-4">
                      <StoreInvoiceStatement />

            
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-4">
            <QualityIssueReport orders={orders} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Order Detail Modal */}
      <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Order #{selectedOrder?.orderNumber || selectedOrder?._id?.slice(-6)}</DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Status</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedOrder.status)}
                  {getPaymentBadge(selectedOrder.paymentStatus)}
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Order Date</span>
                <span className="font-medium">{format(new Date(selectedOrder.createdAt || selectedOrder.updatedAt || Date.now()), "MMMM dd, yyyy")}</span>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-medium mb-2">Order Items</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{item.productName || item.name}</p>
                        <p className="text-xs text-gray-500">{item.quantity} × {formatCurrency(item.unitPrice || item.price)}</p>
                      </div>
                      <span className="font-medium">{formatCurrency(item.total || (item.quantity * (item.unitPrice || item.price)))}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="border-t pt-4 space-y-2">
                {/* Items Subtotal */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Items Subtotal</span>
                  <span>{formatCurrency(selectedOrder.items?.reduce((sum: number, item: any) => sum + (item.total || (item.quantity * (item.unitPrice || item.price))), 0) || 0)}</span>
                </div>
                
                {/* Shipping/Delivery Fee */}
                {(selectedOrder.shippinCost > 0 || selectedOrder.shipping > 0) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      <Truck className="h-3 w-3 inline mr-1" />
                      Delivery Fee
                    </span>
                    <span>{formatCurrency(selectedOrder.shippinCost || selectedOrder.shipping || 0)}</span>
                  </div>
                )}

                {/* Pallet Charges */}
                {selectedOrder.palletData?.totalPalletCharge > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      <Package className="h-3 w-3 inline mr-1" />
                      Pallet Charge ({selectedOrder.palletData.palletCount} pallets)
                    </span>
                    <span>{formatCurrency(selectedOrder.palletData.totalPalletCharge)}</span>
                  </div>
                )}

                {/* Extra Charges (if total doesn't match calculated) */}
                {(() => {
                  const itemsTotal = selectedOrder.items?.reduce((sum: number, item: any) => sum + (item.total || (item.quantity * (item.unitPrice || item.price))), 0) || 0;
                  const shippingCost = selectedOrder.shippinCost || selectedOrder.shipping || 0;
                  const palletCharge = selectedOrder.palletData?.totalPalletCharge || 0;
                  const calculatedTotal = itemsTotal + shippingCost + palletCharge;
                  const extraCharges = (selectedOrder.total || 0) - calculatedTotal;
                  
                  if (extraCharges > 0.01) {
                    return (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          <DollarSign className="h-3 w-3 inline mr-1" />
                          Additional Charges
                        </span>
                        <span>{formatCurrency(extraCharges)}</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Total */}
                <div className="flex items-center justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-blue-600">{formatCurrency(selectedOrder.total || 0)}</span>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Shipping Address</p>
                  <p className="font-medium">{selectedOrder.shippingAddress.name}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.shippingAddress.address}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.country} {selectedOrder.shippingAddress.postalCode}</p>
                  {selectedOrder.shippingAddress.phone && (
                    <p className="text-sm text-gray-600">Phone: {selectedOrder.shippingAddress.phone}</p>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    <span className="font-medium">Note:</span> {selectedOrder.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() => {
                setOrderDetailOpen(false);
                setActiveTab("issues");
              }}
            >
              <AlertTriangle className="h-4 w-4 mr-2" /> Report Issue
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOrderDetailOpen(false)}>Close</Button>
              <Button onClick={() => navigate("/store/mobile")}>
                <RefreshCw className="h-4 w-4 mr-2" /> Reorder
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-white border-t mt-10 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} {user?.storeName || "Store Dashboard"}. All rights reserved.</p>
          <p className="mt-1">Need help? Contact support</p>
        </div>
      </footer>
    </div>
  )
}

export default StoreDashboardEnhanced
