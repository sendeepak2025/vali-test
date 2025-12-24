"use client"

import { useEffect, useState, useMemo } from "react"
import { useSelector } from "react-redux"
import { RootState } from "@/redux/store"
import Navbar from "@/components/layout/Navbar"
import Sidebar from "@/components/layout/Sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import PageHeader from "@/components/shared/PageHeader"
import {
  Store, CreditCard, TrendingUp, Search, Download, Plus, Eye,
  Trash2, Phone, Mail, MapPin, DollarSign, AlertCircle, CheckCircle2, Clock,
  History, BarChart3, RefreshCw,
  Package, Receipt, Wallet, ArrowUpRight, ArrowDownRight,
  Loader2, FileText, UserCheck, Star, ThumbsUp,
  TrendingDown, Award, Target, Zap, Activity, PieChart, User, Send,
  FileDown
} from "lucide-react"
import { deleteStoreAPI, getAllStoresAnalyticsAPI, addCommunicationLogAPI, getCommunicationLogsAPI, addPaymentRecordAPI, sendPaymentReminderAPI, sendStatementEmailAPI, userWithOrderDetails } from "@/services2/operations/auth"
import { getAllOrderAPI } from "@/services2/operations/order"
import { format } from "date-fns"
import StoreRegistration from "./StoreRegistration"
import { StatementFilterPopup } from "@/components/admin/StatementPopup"

interface StoreData {
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
  priceCategory: string
  shippingCost: number
  isOrder: boolean
  isProduct: boolean
  createdAt: string
  cheques: any[]
}

interface StoreWithStats extends StoreData {
  totalOrders: number
  totalSpent: number
  totalPaid: number
  balanceDue: number
  creditCount: number
  lastOrderDate: string | null
  paymentStatus: "good" | "warning" | "overdue"
  // New analytics fields
  avgOrderValue: number
  orderFrequency: number // orders per month
  paymentRate: number // percentage of orders paid on time
  lastMonthOrders: number
  thisMonthOrders: number
  orderTrend: "up" | "down" | "stable"
  daysSinceLastOrder: number
  avgPaymentDays: number // average days to pay
}

const AdminStoresEnhanced = () => {
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)
  const user = useSelector((state: RootState) => state.auth?.user ?? null)
const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isStatementFilterOpen, setIsStatementFilterOpen] = useState(false);
  // States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<StoreWithStats[]>([])
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterState, setFilterState] = useState("all")
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all")
  const [activeTab, setActiveTab] = useState("overview")
  
  // Modal states
  const [selectedStore, setSelectedStore] = useState<StoreWithStats | null>(null)
  const [storeDetailOpen, setStoreDetailOpen] = useState(false)
  const [storeOrders, setStoreOrders] = useState<any[]>([])
  const [loadingStoreDetails, setLoadingStoreDetails] = useState(false)
  const [addStoreOpen, setAddStoreOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<StoreWithStats | null>(null)
  
  // New modal states for store management
  const [logCallOpen, setLogCallOpen] = useState(false)
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)
  const [communicationLogs, setCommunicationLogs] = useState<any[]>([])
  const [loadingAction, setLoadingAction] = useState(false)
  
  // Form states
  const [callNotes, setCallNotes] = useState("")
  const [callOutcome, setCallOutcome] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentType, setPaymentType] = useState("cash")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<string | null>(null)

  // Fetch all stores with analytics from optimized backend API
  const fetchData = async () => {
    setLoading(true)
    try {
      // Use the new optimized API that returns stores with pre-calculated analytics
      const response = await getAllStoresAnalyticsAPI()
      
      if (response?.stores) {
        // Map backend response to frontend interface
        const storesWithStats: StoreWithStats[] = response.stores.map((store: any) => ({
          id: store._id,
          _id: store._id,
          storeName: store.storeName || "",
          ownerName: store.ownerName || "",
          email: store.email || "",
          phone: store.phone || "",
          address: store.address || "",
          city: store.city || "",
          state: store.state || "",
          zipCode: store.zipCode || "",
          priceCategory: store.priceCategory || "",
          shippingCost: store.shippingCost || 0,
          isOrder: store.isOrder || false,
          isProduct: store.isProduct || false,
          createdAt: store.createdAt,
          cheques: store.cheques || [],
          totalOrders: store.totalOrders || 0,
          totalSpent: store.totalSpent || 0,
          totalPaid: store.totalPaid || 0,
          balanceDue: store.balanceDue || 0,
          creditCount: store.creditCount || 0,
          lastOrderDate: store.lastOrderDate,
          paymentStatus: store.paymentStatus || "good",
          avgOrderValue: store.avgOrderValue || 0,
          orderFrequency: store.orderFrequency || 0,
          paymentRate: store.paymentRate || 100,
          lastMonthOrders: store.lastMonthOrders || 0,
          thisMonthOrders: store.thisMonthOrders || 0,
          orderTrend: store.orderTrend || "stable",
          daysSinceLastOrder: store.daysSinceLastOrder || 999,
          avgPaymentDays: store.avgPaymentDays || 0
        }))
        
        setStores(storesWithStats)
        
        // Fetch ALL orders for detail view (no pagination limit)
        const ordersRes = await getAllOrderAPI(token, "limit=10000")
        let orders: any[] = []
        if (Array.isArray(ordersRes)) {
          orders = ordersRes
        } else if (ordersRes?.orders && Array.isArray(ordersRes.orders)) {
          orders = ordersRes.orders
        }
        setAllOrders(orders)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to load stores" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [token])

  // Calculate overall stats
  const stats = useMemo(() => {
    const totalStores = stores.length
    const activeStores = stores.filter(s => s.daysSinceLastOrder < 30).length
    const totalRevenue = stores.reduce((sum, s) => sum + s.totalSpent, 0)
    const totalOutstanding = stores.reduce((sum, s) => sum + s.balanceDue, 0)
    const overdueStores = stores.filter(s => s.paymentStatus === "overdue").length
    const warningStores = stores.filter(s => s.paymentStatus === "warning").length
    const avgOrderValue = stores.length > 0 
      ? stores.reduce((sum, s) => sum + s.avgOrderValue, 0) / stores.length 
      : 0
    const totalOrders = stores.reduce((sum, s) => sum + s.totalOrders, 0)
    const totalCredits = stores.reduce((sum, s) => sum + s.creditCount, 0)
    
    return {
      totalStores,
      activeStores,
      totalRevenue,
      totalOutstanding,
      overdueStores,
      warningStores,
      avgOrderValue,
      totalOrders,
      totalCredits
    }
  }, [stores])

  // Filter stores
  const filteredStores = useMemo(() => {
    return stores.filter(store => {
      const matchesSearch = 
        store.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.phone?.includes(searchTerm)
      
      const matchesState = filterState === "all" || store.state === filterState
      const matchesPayment = filterPaymentStatus === "all" || store.paymentStatus === filterPaymentStatus
      
      return matchesSearch && matchesState && matchesPayment
    })
  }, [stores, searchTerm, filterState, filterPaymentStatus])

  // Get unique states for filter
  const uniqueStates = useMemo(() => {
    const states = [...new Set(stores.map(s => s.state).filter(Boolean))]
    return states.sort()
  }, [stores])

  // View store details
  const viewStoreDetails = async (store: StoreWithStats) => {
    setSelectedStore(store)
    setLoadingStoreDetails(true)
    setStoreDetailOpen(true)
    
    try {
      // Fetch store details with orders directly from API for accurate data
      const storeDetails = await userWithOrderDetails(store._id)
      
      if (storeDetails?.orders && Array.isArray(storeDetails.orders)) {
        // Use orders from API response
        setStoreOrders(storeDetails.orders.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ))
        
        // Update selected store with accurate totals from API
        setSelectedStore({
          ...store,
          totalOrders: storeDetails.totalOrders || storeDetails.orders.length,
          totalSpent: storeDetails.totalSpent || 0,
          totalPaid: storeDetails.totalPay || 0,
          balanceDue: storeDetails.balanceDue || 0
        })
        
        console.log("Store ID:", store._id, "Orders from API:", storeDetails.orders.length)
      } else {
        // Fallback to filtering from allOrders
        const storeOrdersData = allOrders.filter((o: any) => {
          const orderStoreId = o.store?._id?.toString() || o.store?.toString() || ""
          const currentStoreId = store._id?.toString() || ""
          return orderStoreId === currentStoreId
        })
        
        console.log("Store ID:", store._id, "Found orders (fallback):", storeOrdersData.length)
        
        setStoreOrders(storeOrdersData.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ))
      }
      
      // Fetch communication logs
      const logs = await getCommunicationLogsAPI(store._id)
      setCommunicationLogs(logs || [])
    } catch (error) {
      console.error("Error fetching store details:", error)
    } finally {
      setLoadingStoreDetails(false)
    }
  }

  // Handle log call
  const handleLogCall = async () => {
    if (!selectedStore || !callNotes.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter call notes" })
      return
    }
    
    setLoadingAction(true)
    try {
      const result = await addCommunicationLogAPI(selectedStore._id, {
        type: "call",
        subject: "Phone Call",
        notes: callNotes,
        outcome: callOutcome,
        createdByName: "Admin"
      })
      
      if (result) {
        setCommunicationLogs(prev => [result.log, ...prev])
        setCallNotes("")
        setCallOutcome("")
        setLogCallOpen(false)
        toast({ title: "Success", description: "Call logged successfully" })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to log call" })
    } finally {
      setLoadingAction(false)
    }
  }

  // Handle record payment
  const handleRecordPayment = async () => {
    if (!selectedStore || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a valid amount" })
      return
    }
    
    setLoadingAction(true)
    try {
      const result = await addPaymentRecordAPI(selectedStore._id, {
        amount: parseFloat(paymentAmount),
        type: paymentType,
        reference: paymentReference,
        notes: paymentNotes,
        orderId: selectedOrderForPayment
      })
         fetchData();
         viewStoreDetails(selectedStore)
      
      if (result) {
        // Refresh store data
        await fetchData()
        setPaymentAmount("")
        setPaymentType("cash")
        setPaymentReference("")
        setPaymentNotes("")
        setSelectedOrderForPayment(null)
        setRecordPaymentOpen(false)
        toast({ title: "Success", description: "Payment recorded successfully" })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to record payment" })
    } finally {
      setLoadingAction(false)
    }
  }

  // Handle send payment reminder
  const handleSendReminder = async () => {
    if (!selectedStore) return
    
    setLoadingAction(true)
    try {
      const result = await sendPaymentReminderAPI(selectedStore._id)
      if (result) {
        // Refresh communication logs
        const logs = await getCommunicationLogsAPI(selectedStore._id)
        setCommunicationLogs(logs || [])
      }
    } catch (error) {
      console.error("Error sending reminder:", error)
    } finally {
      setLoadingAction(false)
    }
  }

  // Handle send statement
  const handleSendStatement = async () => {
    if (!selectedStore) return
    
    setLoadingAction(true)
    try {
      const result = await sendStatementEmailAPI(selectedStore._id)
      if (result) {
        // Refresh communication logs
        const logs = await getCommunicationLogsAPI(selectedStore._id)
        setCommunicationLogs(logs || [])
      }
    } catch (error) {
      console.error("Error sending statement:", error)
    } finally {
      setLoadingAction(false)
    }
  }

  // Handle download PDF statement
  const handleDownloadStatement = () => {
    if (!selectedStore) return
    
    // Create a simple text-based statement for download
    const statement = `
ACCOUNT STATEMENT
=================
Store: ${selectedStore.storeName}
Owner: ${selectedStore.ownerName}
Address: ${selectedStore.address}, ${selectedStore.city}, ${selectedStore.state} ${selectedStore.zipCode}
Date: ${format(new Date(), "MMM dd, yyyy")}

SUMMARY
-------
Total Invoiced: ${formatCurrency(selectedStore.totalSpent)}
Total Paid: ${formatCurrency(selectedStore.totalPaid)}
Balance Due: ${formatCurrency(selectedStore.balanceDue)}

RECENT TRANSACTIONS
-------------------
${storeOrders.slice(0, 10).map(o => 
  `${format(new Date(o.createdAt), "MM/dd/yy")} - Invoice #${o.orderNumber || o._id?.slice(-6)} - ${formatCurrency(o.total || 0)} - ${o.paymentStatus}`
).join('\n')}
    `.trim()
    
    const blob = new Blob([statement], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `statement-${selectedStore.storeName}-${format(new Date(), "yyyy-MM-dd")}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Downloaded", description: "Statement downloaded successfully" })
  }

  // Delete store
  const handleDeleteStore = async () => {
    if (!storeToDelete) return
    
    try {
      const success = await deleteStoreAPI(storeToDelete._id, token)
      if (success) {
        setStores(prev => prev.filter(s => s._id !== storeToDelete._id))
        toast({ title: "Success", description: "Store deleted successfully" })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete store" })
    } finally {
      setDeleteConfirmOpen(false)
      setStoreToDelete(null)
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Store Name", "Owner", "Email", "Phone", "City", "State", "Total Orders", "Total Spent", "Balance Due", "Payment Status"]
    const rows = filteredStores.map(s => [
      s.storeName, s.ownerName, s.email, s.phone, s.city, s.state,
      s.totalOrders, s.totalSpent.toFixed(2), s.balanceDue.toFixed(2),
      s.paymentStatus
    ])
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stores-export-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "Store data exported to CSV" })
  }

  // Badge helpers
  const getPaymentStatusBadge = (status: string) => {
    if (status === "good_standing") return <Badge className="bg-green-100 text-green-700">Good Standing</Badge>
    if (status === "warning") return <Badge className="bg-yellow-100 text-yellow-700">Warning</Badge>
    return <Badge className="bg-red-100 text-red-700">Overdue</Badge>
  }

  const getOrderTrendBadge = (trend: string) => {
    if (trend === "up") return <Badge className="bg-green-100 text-green-700"><ArrowUpRight className="h-3 w-3 mr-1" />Up</Badge>
    if (trend === "down") return <Badge className="bg-red-100 text-red-700"><ArrowDownRight className="h-3 w-3 mr-1" />Down</Badge>
    return <Badge className="bg-gray-100 text-gray-700">Stable</Badge>
  }

  const getPaymentBadge = (status: string) => {
    if (status === "paid") return <Badge className="bg-green-100 text-green-700">Paid</Badge>
    if (status === "partial") return <Badge className="bg-yellow-100 text-yellow-700">Partial</Badge>
    return <Badge className="bg-red-100 text-red-700">Unpaid</Badge>
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col">
          <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-gray-600">Loading stores...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <PageHeader
            title="Store Management"
            description="Manage stores, track payments, and monitor performance"
            icon={<Store className="h-6 w-6" />}
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Total Stores</p>
                    <p className="text-2xl font-bold">{stats.totalStores}</p>
                  </div>
                  <Store className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Active (30d)</p>
                    <p className="text-2xl font-bold text-green-600">{stats.activeStores}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Total Revenue</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Good Standing</p>
                    <p className="text-2xl font-bold text-green-600">{stores.filter(s => s.paymentStatus === "good_standing").length}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{stores.filter(s => s.paymentStatus === "overdue").length}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <TabsList className="bg-white border">
                <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
                <TabsTrigger value="stores"><Store className="h-4 w-4 mr-1" /> All Stores</TabsTrigger>
                <TabsTrigger value="payments"><CreditCard className="h-4 w-4 mr-1" /> Payments</TabsTrigger>
                <TabsTrigger value="analytics"><PieChart className="h-4 w-4 mr-1" /> Analytics</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchData()}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
                <Button size="sm" onClick={() => setAddStoreOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Store
                </Button>
              </div>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Status */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5" /> Payment Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-700">Good Standing</span>
                      <span className="font-bold text-green-700">{stores.filter(s => s.paymentStatus === "good").length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm text-yellow-700">Warning</span>
                      <span className="font-bold text-yellow-700">{stats.warningStores}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-700">Overdue</span>
                      <span className="font-bold text-red-700">{stats.overdueStores}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5" /> Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Orders</span>
                      <span className="font-semibold">{stats.totalOrders}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Avg Order Value</span>
                      <span className="font-semibold">{formatCurrency(stats.avgOrderValue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Credits</span>
                      <span className="font-semibold text-orange-600">{stats.totalCredits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Collection Rate</span>
                      <span className="font-semibold text-green-600">
                        {stats.totalRevenue > 0 ? ((stats.totalRevenue - stats.totalOutstanding) / stats.totalRevenue * 100).toFixed(1) : 100}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Stores & At Risk */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" /> Top Performing Stores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stores
                        .filter(s => s.totalSpent > 0)
                        .sort((a, b) => b.totalSpent - a.totalSpent)
                        .slice(0, 5)
                        .map((store, idx) => (
                          <div key={store._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={() => viewStoreDetails(store)}>
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                              <div>
                                <p className="font-medium text-sm">{store.storeName}</p>
                                <p className="text-xs text-gray-500">{store.totalOrders} orders</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">{formatCurrency(store.totalSpent)}</p>
                            </div>
                          </div>
                        ))}
                      {stores.filter(s => s.totalSpent > 0).length === 0 && (
                        <p className="text-center text-gray-500 py-4">No stores with orders yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" /> Stores Needing Attention
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stores
                        .filter(s => s.paymentStatus === "overdue" || s.paymentStatus === "warning")
                        .sort((a, b) => b.balanceDue - a.balanceDue)
                        .slice(0, 5)
                        .map(store => (
                          <div key={store._id} className="flex items-center justify-between p-2 bg-red-50 rounded cursor-pointer" onClick={() => viewStoreDetails(store)}>
                            <div>
                              <p className="font-medium text-sm">{store.storeName}</p>
                              <p className="text-xs text-gray-500">{store.daysSinceLastOrder} days since last order</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-red-600">{formatCurrency(store.balanceDue)} due</p>
                            </div>
                          </div>
                        ))}
                      {stores.filter(s => s.paymentStatus === "overdue" || s.paymentStatus === "warning").length === 0 && (
                        <p className="text-center text-gray-500 py-4">No stores needing attention</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* All Stores Tab */}
            <TabsContent value="stores" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search stores..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <select
                      value={filterState}
                      onChange={(e) => setFilterState(e.target.value)}
                      className="border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="all">All States</option>
                      {uniqueStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    <select
                      value={filterPaymentStatus}
                      onChange={(e) => setFilterPaymentStatus(e.target.value)}
                      className="border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="all">All Payment Status</option>
                      <option value="good">Good Standing</option>
                      <option value="warning">Warning</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Stores Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-600">Store</th>
                          <th className="text-left p-4 font-medium text-gray-600">Contact</th>
                          <th className="text-left p-4 font-medium text-gray-600">Orders</th>
                          <th className="text-left p-4 font-medium text-gray-600">Revenue</th>
                          <th className="text-left p-4 font-medium text-gray-600">Balance</th>
                          <th className="text-left p-4 font-medium text-gray-600">Status</th>
                          <th className="text-right p-4 font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStores.map(store => (
                          <tr key={store._id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Store className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{store.storeName}</p>
                                  <p className="text-xs text-gray-500">{store.city}, {store.state}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-sm">{store.ownerName}</p>
                              <p className="text-xs text-gray-500">{store.phone}</p>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{store.totalOrders}</span>
                                {getOrderTrendBadge(store.orderTrend)}
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="font-semibold text-green-600">{formatCurrency(store.totalSpent)}</p>
                            </td>
                            <td className="p-4">
                              <p className={`font-semibold ${store.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
                                {formatCurrency(store.balanceDue)}
                              </p>
                            </td>
                            <td className="p-4">
                              {getPaymentStatusBadge(store.paymentStatus)}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => viewStoreDetails(store)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-600" onClick={() => { setStoreToDelete(store); setDeleteConfirmOpen(true) }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredStores.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No stores found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-10 w-10 text-green-600" />
                      <div>
                        <p className="text-sm text-green-600">Total Collected</p>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalRevenue - stats.totalOutstanding)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-10 w-10 text-red-600" />
                      <div>
                        <p className="text-sm text-red-600">Outstanding</p>
                        <p className="text-2xl font-bold text-red-700">{formatCurrency(stats.totalOutstanding)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-10 w-10 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-600">Collection Rate</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {stats.totalRevenue > 0 ? ((stats.totalRevenue - stats.totalOutstanding) / stats.totalRevenue * 100).toFixed(1) : 100}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Overdue Stores */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> Overdue Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stores
                      .filter(s => s.paymentStatus === "overdue")
                      .sort((a, b) => b.balanceDue - a.balanceDue)
                      .map(store => (
                        <div key={store._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100" onClick={() => viewStoreDetails(store)}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <Store className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium">{store.storeName}</p>
                              <p className="text-sm text-gray-500">{store.creditCount} unpaid orders</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-red-600">{formatCurrency(store.balanceDue)}</p>
                            <p className="text-xs text-gray-500">Last order: {store.lastOrderDate ? format(new Date(store.lastOrderDate), "MMM dd") : "N/A"}</p>
                          </div>
                        </div>
                      ))}
                    {stores.filter(s => s.paymentStatus === "overdue").length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <p>No overdue payments!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Warning Stores */}
              <Card className="border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-yellow-600 flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Payment Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stores
                      .filter(s => s.paymentStatus === "warning")
                      .sort((a, b) => b.balanceDue - a.balanceDue)
                      .map(store => (
                        <div key={store._id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100" onClick={() => viewStoreDetails(store)}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                              <Store className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="font-medium">{store.storeName}</p>
                              <p className="text-sm text-gray-500">{store.creditCount} pending payments</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-yellow-600">{formatCurrency(store.balanceDue)}</p>
                          </div>
                        </div>
                      ))}
                    {stores.filter(s => s.paymentStatus === "warning").length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <p>No payment warnings</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              {/* Order Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" /> Order Trends
                  </CardTitle>
                  <CardDescription>Store ordering patterns this month vs last month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <ArrowUpRight className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-700">{stores.filter(s => s.orderTrend === "up").length}</p>
                      <p className="text-sm text-green-600">Trending Up</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-700">{stores.filter(s => s.orderTrend === "stable").length}</p>
                      <p className="text-sm text-gray-600">Stable</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg text-center">
                      <ArrowDownRight className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-700">{stores.filter(s => s.orderTrend === "down").length}</p>
                      <p className="text-sm text-red-600">Trending Down</p>
                    </div>
                  </div>

                  {/* Stores with declining orders */}
                  {stores.filter(s => s.orderTrend === "down").length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3 text-red-600">Stores with Declining Orders</h4>
                      <div className="space-y-2">
                        {stores
                          .filter(s => s.orderTrend === "down")
                          .sort((a, b) => (b.lastMonthOrders - b.thisMonthOrders) - (a.lastMonthOrders - a.thisMonthOrders))
                          .slice(0, 5)
                          .map(store => (
                            <div key={store._id} className="flex items-center justify-between p-2 bg-red-50 rounded cursor-pointer" onClick={() => viewStoreDetails(store)}>
                              <span className="font-medium">{store.storeName}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500">Last month: {store.lastMonthOrders}</span>
                                <span className="text-sm text-gray-500">This month: {store.thisMonthOrders}</span>
                                <Badge className="bg-red-100 text-red-700">
                                  -{store.lastMonthOrders - store.thisMonthOrders}
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Store Performance Matrix */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" /> Performance Matrix
                  </CardTitle>
                  <CardDescription>Store performance based on orders and payment behavior</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-5 w-5 text-green-600" />
                        <span className="font-medium">High Value</span>
                      </div>
                      <p className="text-2xl font-bold">{stores.filter(s => s.avgOrderValue > stats.avgOrderValue).length}</p>
                      <p className="text-xs text-gray-500">Above avg order value</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Frequent</span>
                      </div>
                      <p className="text-2xl font-bold">{stores.filter(s => s.orderFrequency > 2).length}</p>
                      <p className="text-xs text-gray-500">2+ orders/month</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Good Payers</span>
                      </div>
                      <p className="text-2xl font-bold">{stores.filter(s => s.paymentRate > 80).length}</p>
                      <p className="text-xs text-gray-500">80%+ payment rate</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">Inactive</span>
                      </div>
                      <p className="text-2xl font-bold">{stores.filter(s => s.daysSinceLastOrder > 30).length}</p>
                      <p className="text-xs text-gray-500">No orders in 30 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Credit Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" /> Credit Analysis
                  </CardTitle>
                  <CardDescription>Stores with highest credit usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stores
                      .filter(s => s.creditCount > 0)
                      .sort((a, b) => b.balanceDue - a.balanceDue)
                      .slice(0, 10)
                      .map((store, idx) => (
                        <div key={store._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => viewStoreDetails(store)}>
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                            <div>
                              <p className="font-medium">{store.storeName}</p>
                              <p className="text-xs text-gray-500">{store.creditCount} unpaid orders</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600">{formatCurrency(store.balanceDue)}</p>
                            <Progress value={store.paymentRate} className="w-20 h-2 mt-1" />
                          </div>
                        </div>
                      ))}
                    {stores.filter(s => s.creditCount > 0).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <p>No outstanding credits!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Store Detail Modal - Enhanced with Tabs */}
      <Dialog open={storeDetailOpen} onOpenChange={setStoreDetailOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
              {selectedStore?.storeName}
            </DialogTitle>
            <DialogDescription>
              {selectedStore?.city}, {selectedStore?.state} • {selectedStore?.phone}
            </DialogDescription>
          </DialogHeader>

          {loadingStoreDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : selectedStore && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="orders" className="text-xs">All Orders</TabsTrigger>
                <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
                <TabsTrigger value="followups" className="text-xs">Follow-ups</TabsTrigger>
                <TabsTrigger value="statement" className="text-xs">Statement</TabsTrigger>
              </TabsList>

              <div className="max-h-[55vh] overflow-y-auto pr-2">
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-0">
                  <Card className={`border-2 ${
                    selectedStore.paymentStatus === "good_standing" ? "border-green-300 bg-green-50" :
                    selectedStore.paymentStatus === "warning" ? "border-yellow-300 bg-yellow-50" :
                    "border-red-300 bg-red-50"
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Payment Status</h3>
                          {getPaymentStatusBadge(selectedStore.paymentStatus)}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{formatCurrency(selectedStore.balanceDue)}</div>
                          <p className="text-sm text-gray-500">Balance Due</p>
                        </div>
                      </div>
                      {selectedStore.paymentStatus !== "good_standing" && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Action Required:</p>
                          <ul className="text-sm space-y-1">
                            {selectedStore.paymentStatus === "overdue" && (
                              <li className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                                Payment is overdue - follow up immediately
                              </li>
                            )}
                            {selectedStore.paymentStatus === "warning" && (
                              <li className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                                Payment approaching due date
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card><CardContent className="p-3 text-center">
                      <Package className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                      <p className="text-2xl font-bold">{selectedStore.totalOrders}</p>
                      <p className="text-xs text-gray-500">Total Orders</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 text-center">
                      <DollarSign className="h-6 w-6 mx-auto text-green-600 mb-1" />
                      <p className="text-xl font-bold text-green-600">{formatCurrency(selectedStore.totalSpent)}</p>
                      <p className="text-xs text-gray-500">Total Spent</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 text-center">
                      <Wallet className="h-6 w-6 mx-auto text-red-600 mb-1" />
                      <p className="text-xl font-bold text-red-600">{formatCurrency(selectedStore.balanceDue)}</p>
                      <p className="text-xs text-gray-500">Balance Due</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 text-center">
                      <Receipt className="h-6 w-6 mx-auto text-orange-600 mb-1" />
                      <p className="text-2xl font-bold text-orange-600">{selectedStore.creditCount}</p>
                      <p className="text-xs text-gray-500">Unpaid Orders</p>
                    </CardContent></Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><span className="text-sm">{selectedStore.ownerName}</span></div>
                      <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /><span className="text-sm">{selectedStore.phone}</span></div>
                      <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /><span className="text-sm">{selectedStore.email}</span></div>
                      <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /><span className="text-sm">{selectedStore.address}</span></div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* All Orders Tab */}
                <TabsContent value="orders" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">All Orders ({storeOrders.length})</h3>
                  </div>
                  {storeOrders.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No orders yet</p>
                  ) : (
                    <div className="space-y-2">
                      {storeOrders.map(order => (
                        <div key={order._id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                          <div>
                            <p className="font-medium">#{order.orderNumber || order._id?.slice(-6)}</p>
                            <p className="text-xs text-gray-500">{format(new Date(order.createdAt), "MMM dd, yyyy HH:mm")}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(order.total || 0)}</p>
                              <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                            </div>
                            {getPaymentBadge(order.paymentStatus)}
                            <Button variant="ghost" size="sm" onClick={() => window.open(`/orders/edit/${order._id}`, '_blank')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Payment History</h3>
                    <Button size="sm" onClick={() => setRecordPaymentOpen(true)}><Plus className="h-4 w-4 mr-1" /> Record Payment</Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-green-50"><CardContent className="p-3 text-center">
                      <p className="text-sm text-gray-600">Total Paid</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(selectedStore.totalPaid)}</p>
                    </CardContent></Card>
                    <Card className="bg-red-50"><CardContent className="p-3 text-center">
                      <p className="text-sm text-gray-600">Outstanding</p>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(selectedStore.balanceDue)}</p>
                    </CardContent></Card>
                    <Card className="bg-blue-50"><CardContent className="p-3 text-center">
                      <p className="text-sm text-gray-600">Total Invoiced</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(selectedStore.totalSpent)}</p>
                    </CardContent></Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Unpaid Invoices</CardTitle></CardHeader>
                    <CardContent>
                      {storeOrders.filter(o => o.paymentStatus !== 'paid').length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No unpaid invoices</p>
                      ) : (
                        <div className="space-y-2">
                          {storeOrders.filter(o => o.paymentStatus !== 'paid').map(order => (
                            <div key={order._id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="font-medium text-sm">Invoice #{order.orderNumber || order._id?.slice(-6)}</p>
                                <p className="text-xs text-gray-500">{format(new Date(order.createdAt), "MMM dd, yyyy")}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-red-600">{formatCurrency(order.total || 0)}</p>
                                <Button variant="outline" size="sm" onClick={() => { setSelectedOrderForPayment(order._id); setPaymentAmount((order.total || 0).toString()); setRecordPaymentOpen(true) }}>Pay</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment Records</CardTitle></CardHeader>
                    <CardContent>
                      {!selectedStore.cheques?.length ? (
                        <p className="text-center text-gray-500 py-4">No payment records</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedStore.cheques?.slice(0, 10).map((cheque: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="font-medium text-sm">Cheque #{cheque.chequeNumber || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{cheque.date ? format(new Date(cheque.date), "MMM dd, yyyy") : '-'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={cheque.status === 'cleared' ? 'bg-green-100 text-green-700' : cheque.status === 'bounced' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>{cheque.status || 'pending'}</Badge>
                                <p className="font-semibold text-green-600">{formatCurrency(cheque.amount || 0)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                </TabsContent>

                {/* Follow-ups Tab */}
                <TabsContent value="followups" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Follow-ups & Communications</h3>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setLogCallOpen(true)}><Phone className="h-4 w-4 mr-1" /> Log Call</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
  {/* Send Payment Reminder */}
  <Button 
    variant="outline" 
    className="h-auto py-4 flex flex-col gap-2" 
    onClick={handleSendReminder} 
    disabled={loadingAction}
  >
    {loadingAction ? (
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
    ) : (
      <Mail className="h-6 w-6 text-blue-600" />
    )}
    <span className="text-sm">Send Payment Reminder</span>
  </Button>

  {/* Download Statement */}
  <Button
    variant="outline"
    className="h-auto py-4 flex flex-col gap-2"
    onClick={() => setIsStatementFilterOpen(true)}
    disabled={isGeneratingPDF}
  >
    {isGeneratingPDF ? (
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
    ) : (
      <FileDown className="h-6 w-6 text-blue-600" />
    )}
    <span className="text-sm">Download Statement</span>
  </Button>
</div>


                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Communication History</CardTitle></CardHeader>
                    <CardContent>
                      {communicationLogs.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No communication records yet.<br /><span className="text-sm">Start by logging a call or sending a reminder.</span></p>
                      ) : (
                        <div className="space-y-2">
                          {communicationLogs.map((log: any, idx: number) => (
                            <div key={log._id || idx} className="flex items-start gap-3 p-3 border rounded">
                              <div className={`p-2 rounded-full ${log.type === 'call' ? 'bg-blue-100' : log.type === 'payment_reminder' ? 'bg-orange-100' : 'bg-green-100'}`}>
                                {log.type === 'call' ? <Phone className="h-4 w-4 text-blue-600" /> : log.type === 'payment_reminder' ? <Mail className="h-4 w-4 text-orange-600" /> : <FileText className="h-4 w-4 text-green-600" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-sm">{log.subject || log.type}</p>
                                  <p className="text-xs text-gray-500">{log.createdAt ? format(new Date(log.createdAt), "MMM dd, yyyy HH:mm") : '-'}</p>
                                </div>
                                {log.notes && <p className="text-sm text-gray-600 mt-1">{log.notes}</p>}
                                {log.outcome && <p className="text-xs text-gray-500 mt-1">Outcome: {log.outcome}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Statement Tab */}
                <TabsContent value="statement" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Account Statement</h3>
                    <div className="flex gap-2">
                     {
            <Button
            size="sm" variant="outline"
              onClick={() => setIsStatementFilterOpen(true)}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? "Generating PDF..." : "Download Statement"}
            </Button>
          }
                    </div>
                  </div>

                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">{selectedStore.storeName}</h4>
                          <p className="text-sm text-gray-500">{selectedStore.address}, {selectedStore.city}, {selectedStore.state}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Statement Date</p>
                          <p className="font-medium">{format(new Date(), "MMM dd, yyyy")}</p>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-sm text-gray-500">Total Invoiced</p><p className="text-xl font-bold">{formatCurrency(selectedStore.totalSpent)}</p></div>
                          <div><p className="text-sm text-gray-500">Total Paid</p><p className="text-xl font-bold text-green-600">{formatCurrency(selectedStore.totalPaid)}</p></div>
                        </div>
                        <div className="mt-4 p-3 bg-white rounded border-2 border-dashed">
                          <div className="flex justify-between items-center">
                            <p className="font-semibold">Balance Due</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(selectedStore.balanceDue)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Transaction History</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="grid grid-cols-4 text-xs font-medium text-gray-500 p-2 bg-gray-100 rounded">
                          <span>Date</span><span>Description</span><span className="text-right">Debit</span><span className="text-right">Credit</span>
                        </div>
                        {storeOrders.slice(0, 10).map(order => (
                          <div key={order._id} className="grid grid-cols-4 text-sm p-2 border-b">
                            <span>{format(new Date(order.createdAt), "MM/dd/yy")}</span>
                            <span>Invoice #{order.orderNumber || order._id?.slice(-6)}</span>
                            <span className="text-right text-red-600">{formatCurrency(order.total || 0)}</span>
                            <span className="text-right">-</span>
                          </div>
                        ))}
                        {selectedStore.cheques?.slice(0, 5).map((cheque: any, idx: number) => (
                          <div key={`cheque-${idx}`} className="grid grid-cols-4 text-sm p-2 border-b">
                            <span>{cheque.date ? format(new Date(cheque.date), "MM/dd/yy") : '-'}</span>
                            <span>Payment - {cheque.type || 'Cash'}</span>
                            <span className="text-right">-</span>
                            <span className="text-right text-green-600">{formatCurrency(cheque.amount || 0)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                </TabsContent>
              </div>

            </Tabs>
            
          )}

        

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setStoreDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Store Modal */}
      <Dialog open={addStoreOpen} onOpenChange={setAddStoreOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Add New Store</DialogTitle>
          </DialogHeader>
          <StoreRegistration />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Store</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{storeToDelete?.storeName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteStore}>Delete Store</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Call Modal */}
      <Dialog open={logCallOpen} onOpenChange={setLogCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> Log Call</DialogTitle>
            <DialogDescription>
              Record a phone call with {selectedStore?.storeName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="callNotes">Call Notes</Label>
              <Textarea 
                id="callNotes" 
                placeholder="What was discussed..." 
                value={callNotes} 
                onChange={(e) => setCallNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="callOutcome">Outcome</Label>
              <Input 
                id="callOutcome" 
                placeholder="e.g., Will pay next week, Requested callback..." 
                value={callOutcome} 
                onChange={(e) => setCallOutcome(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLogCallOpen(false); setCallNotes(""); setCallOutcome("") }}>Cancel</Button>
            <Button onClick={handleLogCall} disabled={loadingAction}>
              {loadingAction ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Save Call Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment from {selectedStore?.storeName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input 
                  id="paymentAmount" 
                  type="number" 
                  placeholder="0.00" 
                  value={paymentAmount} 
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type</Label>
              <select 
                id="paymentType" 
                value={paymentType} 
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentReference">Reference (Optional)</Label>
              <Input 
                id="paymentReference" 
                placeholder="Transaction ID, receipt number..." 
                value={paymentReference} 
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes (Optional)</Label>
              <Textarea 
                id="paymentNotes" 
                placeholder="Additional notes..." 
                value={paymentNotes} 
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
              />
            </div>
            {selectedOrderForPayment && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">Payment will be applied to selected invoice</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRecordPaymentOpen(false); setPaymentAmount(""); setPaymentType("cash"); setPaymentReference(""); setPaymentNotes(""); setSelectedOrderForPayment(null) }}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={loadingAction}>
              {loadingAction ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statement Filter Popup */}
      {selectedStore && (
        <StatementFilterPopup
          isOpen={isStatementFilterOpen}
          onClose={() => setIsStatementFilterOpen(false)}
          userId={selectedStore._id}
          token={token}
          vendor={true}
        />
      )}
    </div>
  )
}

export default AdminStoresEnhanced
