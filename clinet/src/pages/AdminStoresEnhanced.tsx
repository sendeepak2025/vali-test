"use client"

import { useEffect, useState, useCallback } from "react"
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
  Loader2, FileText, UserCheck, Star,
  Activity, PieChart, User,
  FileDown, ChevronLeft, ChevronRight, Settings, Edit, Shield, Calendar, Truck, Tag, ToggleLeft, ToggleRight, Award, TrendingDown, Percent, Image
} from "lucide-react"
import { deleteStoreAPI, getAllStoresAnalyticsAPI, addCommunicationLogAPI, getCommunicationLogsAPI, addPaymentRecordAPI, sendPaymentReminderAPI, userWithOrderDetails, getPaginatedPaymentStoresAPI, getStoreOrdersPaginatedAPI, updateStoreAPI, getChequesByStoreAPI, addChequesAPI, updateChequeStatusAPI } from "@/services2/operations/auth"
import { format } from "date-fns"
import StoreRegistration from "./StoreRegistration"
import { StatementFilterPopup } from "@/components/admin/StatementPopup"
import { AccountStatement, StoreCreditInfo, AdjustmentsManager } from "@/components/accounting"
import { RecordPaymentModal } from "@/components/payments"

interface StoreWithStats {
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
  totalOrders: number
  totalSpent: number
  totalPaid: number
  balanceDue: number
  // Detailed order counts
  paidOrdersCount: number
  partialOrdersCount: number
  unpaidOrdersCount: number
  creditCount: number // unpaid + partial orders
  lastOrderDate: string | null
  paymentStatus: "good_standing" | "warning" | "overdue"
  avgOrderValue: number
  orderFrequency: number
  paymentRate: number
  lastMonthOrders: number
  thisMonthOrders: number
  orderTrend: "up" | "down" | "stable"
  daysSinceLastOrder: number
  // Additional fields for enhanced profile
  storeRating?: string
  ratingScore?: number
  lastLogin?: string
  approvalStatus?: string
  approvedAt?: string
  approvedBy?: string
}

interface PaginationInfo {
  page: number
  limit: number
  totalStores: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface SummaryStats {
  totalStores: number
  activeStores: number
  totalRevenue: number
  totalOutstanding: number
  overdueStores: number
  warningStores: number
  goodStandingStores: number
  totalOrders: number
  totalCredits: number
  avgOrderValue: number
}

interface OverviewData {
  topPerformingStores: StoreWithStats[]
  storesNeedingAttention: StoreWithStats[]
  overdueStoresList: StoreWithStats[]
  warningStoresList: StoreWithStats[]
  decliningStores: StoreWithStats[]
  creditAnalysisStores: StoreWithStats[]
  analyticsTrends: {
    trendingUp: number
    stable: number
    trendingDown: number
  }
}

const ITEMS_PER_PAGE = 20
const PAYMENTS_PER_PAGE = 10

const AdminStoresEnhanced = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isStatementFilterOpen, setIsStatementFilterOpen] = useState(false)
  
  // States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<StoreWithStats[]>([])
  const [overview, setOverview] = useState<OverviewData>({
    topPerformingStores: [],
    storesNeedingAttention: [],
    overdueStoresList: [],
    warningStoresList: [],
    decliningStores: [],
    creditAnalysisStores: [],
    analyticsTrends: { trendingUp: 0, stable: 0, trendingDown: 0 }
  })
  const [summary, setSummary] = useState<SummaryStats>({
    totalStores: 0, activeStores: 0, totalRevenue: 0, totalOutstanding: 0,
    overdueStores: 0, warningStores: 0, goodStandingStores: 0, totalOrders: 0, totalCredits: 0, avgOrderValue: 0
  })
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, limit: ITEMS_PER_PAGE, totalStores: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false
  })
  const [uniqueStates, setUniqueStates] = useState<string[]>([])
  
  // Pagination for Payments tab - server-side
  const [overdueCurrentPage, setOverdueCurrentPage] = useState(1)
  const [warningCurrentPage, setWarningCurrentPage] = useState(1)
  const [overdueStores, setOverdueStores] = useState<StoreWithStats[]>([])
  const [warningStores, setWarningStores] = useState<StoreWithStats[]>([])
  const [overduePagination, setOverduePagination] = useState({ totalStores: 0, totalPages: 0 })
  const [warningPagination, setWarningPagination] = useState({ totalStores: 0, totalPages: 0 })
  const [loadingOverdue, setLoadingOverdue] = useState(false)
  const [loadingWarning, setLoadingWarning] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filterState, setFilterState] = useState("all")
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all")
  const [activeTab, setActiveTab] = useState("overview")
  
  // Modal states
  const [selectedStore, setSelectedStore] = useState<StoreWithStats | null>(null)
  const [storeDetailOpen, setStoreDetailOpen] = useState(false)
  const [storeOrders, setStoreOrders] = useState<any[]>([])
  const [loadingStoreDetails, setLoadingStoreDetails] = useState(false)
  const [modalOrdersPage, setModalOrdersPage] = useState(1) // Pagination for modal orders
  const [modalOrdersPagination, setModalOrdersPagination] = useState({ totalOrders: 0, totalPages: 0 })
  const [loadingModalOrders, setLoadingModalOrders] = useState(false)
  const [addStoreOpen, setAddStoreOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<StoreWithStats | null>(null)
  
  // New modal states for store management
  const [logCallOpen, setLogCallOpen] = useState(false)
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)
  const [communicationLogs, setCommunicationLogs] = useState<any[]>([])
  const [loadingAction, setLoadingAction] = useState(false)
  
  // Form states for log call
  const [callNotes, setCallNotes] = useState("")
  const [callOutcome, setCallOutcome] = useState("")

  // Enhanced Store Profile States
  const [editStoreOpen, setEditStoreOpen] = useState(false)
  const [storeCheques, setStoreCheques] = useState<any[]>([])
  const [addChequeOpen, setAddChequeOpen] = useState(false)
  const [chequeStatusOpen, setChequeStatusOpen] = useState(false)
  const [selectedCheque, setSelectedCheque] = useState<any>(null)
  
  // Edit Store Form
  const [editFormData, setEditFormData] = useState({
    storeName: "", ownerName: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "",
    priceCategory: "aPrice", shippingCost: 0, isOrder: true, isProduct: true
  })
  
  // Add Cheque Form
  const [chequeFormData, setChequeFormData] = useState({
    chequeNumber: "", amount: "", date: "", notes: "", images: [] as string[]
  })
  
  // Cheque Status Form
  const [chequeStatusData, setChequeStatusData] = useState({
    status: "pending", clearedDate: "", bankReference: ""
  })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch overdue stores (server-side pagination)
  const fetchOverdueStores = useCallback(async (page = 1) => {
    setLoadingOverdue(true)
    try {
      const response = await getPaginatedPaymentStoresAPI({ page, limit: PAYMENTS_PER_PAGE, type: "overdue" })
      setOverdueStores(response.stores || [])
      setOverduePagination({
        totalStores: response.pagination?.totalStores || 0,
        totalPages: response.pagination?.totalPages || 0
      })
    } catch (error) {
      console.error("Error fetching overdue stores:", error)
    } finally {
      setLoadingOverdue(false)
    }
  }, [])

  // Fetch warning stores (server-side pagination)
  const fetchWarningStores = useCallback(async (page = 1) => {
    setLoadingWarning(true)
    try {
      const response = await getPaginatedPaymentStoresAPI({ page, limit: PAYMENTS_PER_PAGE, type: "warning" })
      setWarningStores(response.stores || [])
      setWarningPagination({
        totalStores: response.pagination?.totalStores || 0,
        totalPages: response.pagination?.totalPages || 0
      })
    } catch (error) {
      console.error("Error fetching warning stores:", error)
    } finally {
      setLoadingWarning(false)
    }
  }, [])

  // Fetch modal orders (server-side pagination)
  const fetchModalOrders = useCallback(async (storeId: string, page = 1) => {
    setLoadingModalOrders(true)
    try {
      const response = await getStoreOrdersPaginatedAPI(storeId, { page, limit: PAYMENTS_PER_PAGE })
      setStoreOrders(response.orders || [])
      setModalOrdersPagination({
        totalOrders: response.pagination?.totalOrders || 0,
        totalPages: response.pagination?.totalPages || 0
      })
    } catch (error) {
      console.error("Error fetching modal orders:", error)
    } finally {
      setLoadingModalOrders(false)
    }
  }, [])

  // Effect to fetch overdue stores when page changes
  useEffect(() => {
    if (activeTab === "payments") {
      fetchOverdueStores(overdueCurrentPage)
    }
  }, [overdueCurrentPage, activeTab, fetchOverdueStores])

  // Effect to fetch warning stores when page changes
  useEffect(() => {
    if (activeTab === "payments") {
      fetchWarningStores(warningCurrentPage)
    }
  }, [warningCurrentPage, activeTab, fetchWarningStores])

  // Effect to fetch modal orders when page changes
  useEffect(() => {
    if (selectedStore && storeDetailOpen) {
      fetchModalOrders(selectedStore._id, modalOrdersPage)
    }
  }, [modalOrdersPage, selectedStore, storeDetailOpen, fetchModalOrders])
  // Fetch stores with pagination
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch,
        state: filterState === "all" ? "" : filterState,
        paymentStatus: filterPaymentStatus === "all" ? "" : filterPaymentStatus
      }
      
      const response = await getAllStoresAnalyticsAPI(params)
      
      if (response?.stores) {
        setStores(response.stores)
        setSummary(response.summary || {
          totalStores: 0, activeStores: 0, totalRevenue: 0, totalOutstanding: 0,
          overdueStores: 0, warningStores: 0, goodStandingStores: 0, totalOrders: 0, totalCredits: 0, avgOrderValue: 0
        })
        setPagination(response.pagination || { page: 1, limit: ITEMS_PER_PAGE, totalStores: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false })
        
        // Set overview data from backend
        if (response.overview) {
          setOverview(response.overview)
        }
        
        if (response.filters?.uniqueStates) {
          setUniqueStates(response.filters.uniqueStates)
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to load stores" })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, filterState, filterPaymentStatus, toast])

  // Initial load
  useEffect(() => {
    fetchData(1)
  }, [])

  // Refetch when filters change
  useEffect(() => {
    fetchData(1)
  }, [debouncedSearch, filterState, filterPaymentStatus])

  // Page change handler
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchData(newPage)
    }
  }

  // View store details
  const viewStoreDetails = async (store: StoreWithStats) => {
    setSelectedStore(store)
    setLoadingStoreDetails(true)
    setStoreDetailOpen(true)
    setModalOrdersPage(1) // Reset pagination when opening modal
    setStoreOrders([]) // Clear previous orders
    setStoreCheques([]) // Clear previous cheques
    
    try {
      // Fetch first page of orders via paginated API
      const ordersResponse = await getStoreOrdersPaginatedAPI(store._id, { page: 1, limit: PAYMENTS_PER_PAGE })
      setStoreOrders(ordersResponse.orders || [])
      setModalOrdersPagination({
        totalOrders: ordersResponse.pagination?.totalOrders || 0,
        totalPages: ordersResponse.pagination?.totalPages || 0
      })
      
      // Also fetch store details for totals
      const storeDetails = await userWithOrderDetails(store._id)
      if (storeDetails) {
        setSelectedStore({
          ...store,
          totalOrders: storeDetails.totalOrders || ordersResponse.pagination?.totalOrders || 0,
          totalSpent: storeDetails.totalSpent || 0,
          totalPaid: storeDetails.totalPay || 0,
          balanceDue: storeDetails.balanceDue || 0
        })
      }
      
      const logs = await getCommunicationLogsAPI(store._id)
      setCommunicationLogs(logs || [])
      
      // Fetch cheques
      const cheques = await getChequesByStoreAPI(store._id)
      setStoreCheques(cheques || [])
    } catch (error) {
      console.error("Error fetching store details:", error)
    } finally {
      setLoadingStoreDetails(false)
    }
  }

  // Open Edit Store Modal
  const openEditStore = () => {
    if (!selectedStore) return
    setEditFormData({
      storeName: selectedStore.storeName || "",
      ownerName: selectedStore.ownerName || "",
      email: selectedStore.email || "",
      phone: selectedStore.phone || "",
      address: selectedStore.address || "",
      city: selectedStore.city || "",
      state: selectedStore.state || "",
      zipCode: selectedStore.zipCode || "",
      priceCategory: selectedStore.priceCategory || "aPrice",
      shippingCost: selectedStore.shippingCost || 0,
      isOrder: selectedStore.isOrder !== undefined ? selectedStore.isOrder : true,
      isProduct: selectedStore.isProduct !== undefined ? selectedStore.isProduct : true
    })
    setEditStoreOpen(true)
  }

  // Handle Update Store
  const handleUpdateStore = async () => {
    if (!selectedStore) return
    setLoadingAction(true)
    try {
      const result = await updateStoreAPI(selectedStore._id, editFormData, token)
      if (result) {
        setSelectedStore({ ...selectedStore, ...editFormData })
        setEditStoreOpen(false)
        toast({ title: "Success", description: "Store updated successfully" })
        fetchData(pagination.page)
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update store" })
    } finally {
      setLoadingAction(false)
    }
  }

  // Handle Update Cheque Status
  const handleUpdateChequeStatus = async () => {
    if (!selectedStore || !selectedCheque) return
    setLoadingAction(true)
    try {
      const result = await updateChequeStatusAPI(selectedStore._id, selectedCheque._id, chequeStatusData)
      if (result) {
        const cheques = await getChequesByStoreAPI(selectedStore._id)
        setStoreCheques(cheques || [])
        setChequeStatusOpen(false)
        setSelectedCheque(null)
        toast({ title: "Success", description: "Cheque status updated" })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update cheque status" })
    } finally {
      setLoadingAction(false)
    }
  }

  // Get Price Category Label
  const getPriceCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      aPrice: "Price List A",
      bPrice: "Price List B",
      cPrice: "Price List C",
      restaurantPrice: "Restaurant Price"
    }
    return labels[category] || category
  }

  // Get Cheque Status Badge
  const getChequeStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-700", label: "Pending" },
      cleared: { color: "bg-green-100 text-green-700", label: "Cleared" },
      bounced: { color: "bg-red-100 text-red-700", label: "Bounced" },
      cancelled: { color: "bg-gray-100 text-gray-700", label: "Cancelled" }
    }
    const cfg = config[status] || config.pending
    return <Badge className={cfg.color}>{cfg.label}</Badge>
  }

  // Get Store Rating Badge
  const getStoreRatingBadge = (rating?: string, score?: number) => {
    if (!rating) return null
    const config: Record<string, { color: string; icon: any }> = {
      excellent: { color: "bg-green-100 text-green-700", icon: Star },
      good: { color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
      needs_improvement: { color: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
      at_risk: { color: "bg-red-100 text-red-700", icon: AlertCircle }
    }
    const cfg = config[rating] || config.good
    const Icon = cfg.icon
    return (
      <Badge className={cfg.color}>
        <Icon className="h-3 w-3 mr-1" />
        {rating.replace("_", " ").toUpperCase()} {score ? `(${score})` : ""}
      </Badge>
    )
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

  // Handle send payment reminder
  const handleSendReminder = async () => {
    if (!selectedStore) return
    
    setLoadingAction(true)
    try {
      const result = await sendPaymentReminderAPI(selectedStore._id)
      if (result) {
        const logs = await getCommunicationLogsAPI(selectedStore._id)
        setCommunicationLogs(logs || [])
      }
    } catch (error) {
      console.error("Error sending reminder:", error)
    } finally {
      setLoadingAction(false)
    }
  }

  // Delete store
  const handleDeleteStore = async () => {
    if (!storeToDelete) return
    
    try {
      const success = await deleteStoreAPI(storeToDelete._id, token)
      if (success) {
        await fetchData(pagination.page)
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
    const rows = stores.map(s => [
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
  if (loading && stores.length === 0) {
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
                    <p className="text-2xl font-bold">{summary.totalStores}</p>
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
                    <p className="text-2xl font-bold text-green-600">{summary.activeStores}</p>
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
                    <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</p>
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
                    <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalOutstanding)}</p>
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
                    <p className="text-2xl font-bold text-green-600">{summary.goodStandingStores || 0}</p>
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
                    <p className="text-2xl font-bold text-red-600">{summary.overdueStores}</p>
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
                <Button variant="outline" size="sm" onClick={() => fetchData(pagination.page)} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
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
                      <span className="font-bold text-green-700">{summary.goodStandingStores || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm text-yellow-700">Warning</span>
                      <span className="font-bold text-yellow-700">{summary.warningStores}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-700">Overdue</span>
                      <span className="font-bold text-red-700">{summary.overdueStores}</span>
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
                      <span className="font-semibold">{summary.totalOrders}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Avg Order Value</span>
                      <span className="font-semibold">{formatCurrency(summary.avgOrderValue || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Credits</span>
                      <span className="font-semibold text-orange-600">{summary.totalCredits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Collection Rate</span>
                      <span className="font-semibold text-green-600">
                        {summary.totalRevenue > 0 ? ((summary.totalRevenue - summary.totalOutstanding) / summary.totalRevenue * 100).toFixed(1) : 100}%
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
                      {overview.topPerformingStores.map((store, idx) => (
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
                      {overview.topPerformingStores.length === 0 && (
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
                      {overview.storesNeedingAttention.map(store => (
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
                      {overview.storesNeedingAttention.length === 0 && (
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
                      <option value="good_standing">Good Standing</option>
                      <option value="warning">Warning</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Stores Table */}
              <Card>
                <CardContent className="p-0">
                  {loading && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  )}
                  <div className="overflow-x-auto relative">
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
                        {stores.map(store => (
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
                  {stores.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-500">
                      <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No stores found</p>
                    </div>
                  )}
                  
                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t">
                      <p className="text-sm text-gray-500">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalStores)} of {pagination.totalStores} stores
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={!pagination.hasPrevPage || loading}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-3">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={!pagination.hasNextPage || loading}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
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
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalRevenue - summary.totalOutstanding)}</p>
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
                        <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.totalOutstanding)}</p>
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
                          {summary.totalRevenue > 0 ? ((summary.totalRevenue - summary.totalOutstanding) / summary.totalRevenue * 100).toFixed(1) : 100}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Overdue Stores */}
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" /> Overdue Payments
                    </CardTitle>
                    <span className="text-sm text-gray-500">{overduePagination.totalStores} stores</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingOverdue ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {overdueStores.map(store => (
                          <div key={store._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100" onClick={() => viewStoreDetails(store)}>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <Store className="h-5 w-5 text-red-600" />
                              </div>
                              <div>
                                <p className="font-medium">{store.storeName}</p>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-500">{store.totalOrders} total</span>
                                  <span className="text-green-600">{store.paidOrdersCount} paid</span>
                                  <span className="text-yellow-600">{store.partialOrdersCount} partial</span>
                                  <span className="text-red-600">{store.unpaidOrdersCount} unpaid</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-red-600">{formatCurrency(store.balanceDue)}</p>
                              <p className="text-xs text-gray-500">Last order: {store.lastOrderDate ? format(new Date(store.lastOrderDate), "MMM dd") : "N/A"}</p>
                            </div>
                          </div>
                        ))}
                      {overdueStores.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                          <p>No overdue payments!</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Overdue Pagination */}
                  {overduePagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-4 border-t">
                      <p className="text-sm text-gray-500">
                        Showing {((overdueCurrentPage - 1) * PAYMENTS_PER_PAGE) + 1} to {Math.min(overdueCurrentPage * PAYMENTS_PER_PAGE, overduePagination.totalStores)} of {overduePagination.totalStores}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOverdueCurrentPage(p => Math.max(1, p - 1))}
                          disabled={overdueCurrentPage === 1 || loadingOverdue}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-2">
                          {overdueCurrentPage} / {overduePagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOverdueCurrentPage(p => Math.min(overduePagination.totalPages, p + 1))}
                          disabled={overdueCurrentPage === overduePagination.totalPages || loadingOverdue}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Warning Stores */}
              <Card className="border-yellow-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-yellow-600 flex items-center gap-2">
                      <Clock className="h-5 w-5" /> Payment Warnings
                    </CardTitle>
                    <span className="text-sm text-gray-500">{warningPagination.totalStores} stores</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingWarning ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {warningStores.map(store => (
                          <div key={store._id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100" onClick={() => viewStoreDetails(store)}>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Store className="h-5 w-5 text-yellow-600" />
                              </div>
                              <div>
                                <p className="font-medium">{store.storeName}</p>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-500">{store.totalOrders} total</span>
                                  <span className="text-green-600">{store.paidOrdersCount} paid</span>
                                  <span className="text-yellow-600">{store.partialOrdersCount} partial</span>
                                  <span className="text-red-600">{store.unpaidOrdersCount} unpaid</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-yellow-600">{formatCurrency(store.balanceDue)}</p>
                            </div>
                          </div>
                        ))}
                      {warningStores.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                          <p>No payment warnings</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Warning Pagination */}
                  {warningPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-4 border-t">
                      <p className="text-sm text-gray-500">
                        Showing {((warningCurrentPage - 1) * PAYMENTS_PER_PAGE) + 1} to {Math.min(warningCurrentPage * PAYMENTS_PER_PAGE, warningPagination.totalStores)} of {warningPagination.totalStores}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWarningCurrentPage(p => Math.max(1, p - 1))}
                          disabled={warningCurrentPage === 1 || loadingWarning}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-2">
                          {warningCurrentPage} / {warningPagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWarningCurrentPage(p => Math.min(warningPagination.totalPages, p + 1))}
                          disabled={warningCurrentPage === warningPagination.totalPages || loadingWarning}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
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
                      <p className="text-2xl font-bold text-green-700">{overview.analyticsTrends.trendingUp}</p>
                      <p className="text-sm text-green-600">Trending Up</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-700">{overview.analyticsTrends.stable}</p>
                      <p className="text-sm text-gray-600">Stable</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg text-center">
                      <ArrowDownRight className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-700">{overview.analyticsTrends.trendingDown}</p>
                      <p className="text-sm text-red-600">Trending Down</p>
                    </div>
                  </div>

                  {/* Stores with declining orders */}
                  {overview.decliningStores.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3 text-red-600">Stores with Declining Orders</h4>
                      <div className="space-y-2">
                        {overview.decliningStores.map(store => (
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
                    {overview.creditAnalysisStores.map((store, idx) => (
                        <div key={store._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => viewStoreDetails(store)}>
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                            <div>
                              <p className="font-medium">{store.storeName}</p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500">{store.totalOrders} total</span>
                                <span className="text-green-600">{store.paidOrdersCount} paid</span>
                                <span className="text-yellow-600">{store.partialOrdersCount} partial</span>
                                <span className="text-red-600">{store.unpaidOrdersCount} unpaid</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600">{formatCurrency(store.balanceDue)}</p>
                            <Progress value={store.paymentRate} className="w-20 h-2 mt-1" />
                          </div>
                        </div>
                      ))}
                    {overview.creditAnalysisStores.length === 0 && (
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

      {/* Store Detail Modal */}
      <Dialog open={storeDetailOpen} onOpenChange={setStoreDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
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
              <TabsList className="grid w-full grid-cols-8 mb-4">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
                <TabsTrigger value="cheques" className="text-xs">Cheques</TabsTrigger>
                <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
                <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
                <TabsTrigger value="credits" className="text-xs">Credits</TabsTrigger>
                <TabsTrigger value="followups" className="text-xs">Follow-ups</TabsTrigger>
              </TabsList>

              <div className="max-h-[55vh] overflow-y-auto pr-2">
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-0">
                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={openEditStore}>
                      <Edit className="h-4 w-4 mr-1" /> Edit Store
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setLogCallOpen(true)}>
                      <Phone className="h-4 w-4 mr-1" /> Log Call
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRecordPaymentOpen(true)}>
                      <DollarSign className="h-4 w-4 mr-1" /> Record Payment
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsStatementFilterOpen(true)}>
                      <FileDown className="h-4 w-4 mr-1" /> Statement
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/admin/store/${selectedStore._id}/legal`)}>
                      <FileText className="h-4 w-4 mr-1" /> Legal Docs
                    </Button>
                  </div>

                  {/* Payment Status Card */}
                  <Card className={`border-2 ${
                    selectedStore.paymentStatus === "good_standing" ? "border-green-300 bg-green-50" :
                    selectedStore.paymentStatus === "warning" ? "border-yellow-300 bg-yellow-50" :
                    "border-red-300 bg-red-50"
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Payment Status</h3>
                          <div className="flex items-center gap-2">
                            {getPaymentStatusBadge(selectedStore.paymentStatus)}
                            {getStoreRatingBadge(selectedStore.storeRating, selectedStore.ratingScore)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{formatCurrency(selectedStore.balanceDue)}</div>
                          <p className="text-sm text-gray-500">Balance Due</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card><CardContent className="p-3 text-center">
                      <Package className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                      <p className="text-xl font-bold">{selectedStore.totalOrders}</p>
                      <p className="text-xs text-gray-500">Total Orders</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 text-center">
                      <DollarSign className="h-5 w-5 mx-auto text-green-600 mb-1" />
                      <p className="text-lg font-bold text-green-600">{formatCurrency(selectedStore.totalSpent)}</p>
                      <p className="text-xs text-gray-500">Total Spent</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 text-center">
                      <Wallet className="h-5 w-5 mx-auto text-red-600 mb-1" />
                      <p className="text-lg font-bold text-red-600">{formatCurrency(selectedStore.balanceDue)}</p>
                      <p className="text-xs text-gray-500">Balance Due</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 text-center">
                      <Receipt className="h-5 w-5 mx-auto text-orange-600 mb-1" />
                      <p className="text-xl font-bold text-orange-600">{selectedStore.creditCount || 0}</p>
                      <p className="text-xs text-gray-500">Unpaid Orders</p>
                    </CardContent></Card>
                  </div>

                  {/* Credit Analysis */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Credit Analysis</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-2 bg-green-50 rounded">
                          <p className="text-lg font-bold text-green-600">{selectedStore.paidOrdersCount || 0}</p>
                          <p className="text-xs text-gray-500">Paid Orders</p>
                        </div>
                        <div className="p-2 bg-yellow-50 rounded">
                          <p className="text-lg font-bold text-yellow-600">{selectedStore.partialOrdersCount || 0}</p>
                          <p className="text-xs text-gray-500">Partial Orders</p>
                        </div>
                        <div className="p-2 bg-red-50 rounded">
                          <p className="text-lg font-bold text-red-600">{selectedStore.unpaidOrdersCount || 0}</p>
                          <p className="text-xs text-gray-500">Unpaid Orders</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Payment Rate</span>
                          <span className="font-medium">{selectedStore.paymentRate?.toFixed(1) || 0}%</span>
                        </div>
                        <Progress value={selectedStore.paymentRate || 0} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact & Store Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><span className="text-sm">{selectedStore.ownerName}</span></div>
                        <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /><span className="text-sm">{selectedStore.phone}</span></div>
                        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /><span className="text-sm">{selectedStore.email}</span></div>
                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /><span className="text-sm">{selectedStore.address}, {selectedStore.city}, {selectedStore.state} {selectedStore.zipCode}</span></div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-base">Store Activity</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Registered</span>
                          <span className="text-sm font-medium">{selectedStore.createdAt ? format(new Date(selectedStore.createdAt), "MMM dd, yyyy") : "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Last Order</span>
                          <span className="text-sm font-medium">{selectedStore.lastOrderDate ? format(new Date(selectedStore.lastOrderDate), "MMM dd, yyyy") : "Never"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Days Since Order</span>
                          <span className="text-sm font-medium">{selectedStore.daysSinceLastOrder < 999 ? `${selectedStore.daysSinceLastOrder} days` : "N/A"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Status</span>
                          <Badge className={selectedStore.daysSinceLastOrder < 30 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {selectedStore.daysSinceLastOrder < 30 ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Performance Analytics</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <p className="text-lg font-bold">{formatCurrency(selectedStore.avgOrderValue || 0)}</p>
                          <p className="text-xs text-gray-500">Avg Order Value</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <p className="text-lg font-bold">{selectedStore.orderFrequency?.toFixed(1) || 0}</p>
                          <p className="text-xs text-gray-500">Orders/Month</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <p className="text-lg font-bold">{selectedStore.paymentRate?.toFixed(0) || 0}%</p>
                          <p className="text-xs text-gray-500">Payment Rate</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <p className="text-lg font-bold">{selectedStore.daysSinceLastOrder < 999 ? selectedStore.daysSinceLastOrder : "N/A"}</p>
                          <p className="text-xs text-gray-500">Days Since Order</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Order Trends</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 border rounded">
                          <p className="text-sm text-gray-500">Last Month</p>
                          <p className="text-2xl font-bold">{selectedStore.lastMonthOrders || 0}</p>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <p className="text-sm text-gray-500">This Month</p>
                          <p className="text-2xl font-bold">{selectedStore.thisMonthOrders || 0}</p>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <p className="text-sm text-gray-500">Trend</p>
                          <div className="flex items-center justify-center gap-1">
                            {selectedStore.orderTrend === "up" && <ArrowUpRight className="h-5 w-5 text-green-600" />}
                            {selectedStore.orderTrend === "down" && <ArrowDownRight className="h-5 w-5 text-red-600" />}
                            {selectedStore.orderTrend === "stable" && <Activity className="h-5 w-5 text-gray-600" />}
                            {getOrderTrendBadge(selectedStore.orderTrend)}
                          </div>
                        </div>
                      </div>
                      {selectedStore.orderTrend === "down" && (
                        <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                          <AlertCircle className="h-4 w-4 inline mr-1" />
                          Orders decreased by {(selectedStore.lastMonthOrders || 0) - (selectedStore.thisMonthOrders || 0)} compared to last month
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Store Rating</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Overall Score</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStoreRatingBadge(selectedStore.storeRating, selectedStore.ratingScore)}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold">{selectedStore.ratingScore || 0}</p>
                          <p className="text-xs text-gray-500">out of 100</p>
                        </div>
                      </div>
                      <Progress value={selectedStore.ratingScore || 0} className="h-3 mt-3" />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Store Configuration</CardTitle>
                        <Button size="sm" variant="outline" onClick={openEditStore}><Edit className="h-4 w-4 mr-1" /> Edit</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <Tag className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Price Category</span>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700">{getPriceCategoryLabel(selectedStore.priceCategory)}</Badge>
                        </div>
                        <div className="p-3 border rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <Truck className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Shipping Cost</span>
                          </div>
                          <p className="font-semibold">{formatCurrency(selectedStore.shippingCost || 0)}</p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Permissions</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">Can Order</span>
                            </div>
                            {selectedStore.isOrder ? (
                              <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Yes</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700"><AlertCircle className="h-3 w-3 mr-1" />No</Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">Can View Products</span>
                            </div>
                            {selectedStore.isProduct ? (
                              <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Yes</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700"><AlertCircle className="h-3 w-3 mr-1" />No</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Cheques Tab */}
                <TabsContent value="cheques" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Cheques ({storeCheques.length})</h3>
                  </div>

                  {/* Cheque Summary */}
                  <div className="grid grid-cols-4 gap-3">
                    <Card className="bg-yellow-50"><CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-yellow-600">{storeCheques.filter(c => c.status === "pending").length}</p>
                      <p className="text-xs text-gray-500">Pending</p>
                    </CardContent></Card>
                    <Card className="bg-green-50"><CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-green-600">{storeCheques.filter(c => c.status === "cleared").length}</p>
                      <p className="text-xs text-gray-500">Cleared</p>
                    </CardContent></Card>
                    <Card className="bg-red-50"><CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-red-600">{storeCheques.filter(c => c.status === "bounced").length}</p>
                      <p className="text-xs text-gray-500">Bounced</p>
                    </CardContent></Card>
                    <Card className="bg-gray-50"><CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-gray-600">{formatCurrency(storeCheques.filter(c => c.status === "pending").reduce((sum, c) => sum + (c.amount || 0), 0))}</p>
                      <p className="text-xs text-gray-500">Pending Amount</p>
                    </CardContent></Card>
                  </div>

                  {/* Cheques List */}
                  {storeCheques.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No cheques recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {storeCheques.map(cheque => (
                        <div key={cheque._id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                              <CreditCard className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium">#{cheque.chequeNumber}</p>
                              <p className="text-xs text-gray-500">{cheque.date ? format(new Date(cheque.date), "MMM dd, yyyy") : "-"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(cheque.amount || 0)}</p>
                              {cheque.notes && <p className="text-xs text-gray-500 truncate max-w-[150px]">{cheque.notes}</p>}
                            </div>
                            {getChequeStatusBadge(cheque.status)}
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedCheque(cheque); setChequeStatusData({ status: cheque.status, clearedDate: cheque.clearedDate || "", bankReference: cheque.bankReference || "" }); setChequeStatusOpen(true) }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">All Orders ({modalOrdersPagination.totalOrders})</h3>
                  </div>
                  {loadingModalOrders ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : storeOrders.length === 0 ? (
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
                      {/* Pagination Controls */}
                      {modalOrdersPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t">
                          <p className="text-sm text-gray-500">
                            Showing {((modalOrdersPage - 1) * PAYMENTS_PER_PAGE) + 1} to {Math.min(modalOrdersPage * PAYMENTS_PER_PAGE, modalOrdersPagination.totalOrders)} of {modalOrdersPagination.totalOrders}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setModalOrdersPage(p => Math.max(1, p - 1))}
                              disabled={modalOrdersPage === 1 || loadingModalOrders}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm px-2">
                              Page {modalOrdersPage} of {modalOrdersPagination.totalPages}
                            </span>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setModalOrdersPage(p => Math.min(modalOrdersPagination.totalPages, p + 1))}
                              disabled={modalOrdersPage >= modalOrdersPagination.totalPages || loadingModalOrders}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
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
                          {storeOrders.filter(o => o.paymentStatus !== 'paid').slice(0, 10).map(order => (
                            <div key={order._id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="font-medium text-sm">Invoice #{order.orderNumber || order._id?.slice(-6)}</p>
                                <p className="text-xs text-gray-500">{format(new Date(order.createdAt), "MMM dd, yyyy")}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-red-600">{formatCurrency(order.total || 0)}</p>
                                <Button variant="outline" size="sm" onClick={() => setRecordPaymentOpen(true)}>Pay</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Credits & Adjustments Tab */}
                <TabsContent value="credits" className="space-y-4 mt-0">
                  <Tabs defaultValue="statement" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="statement" className="text-xs gap-1">
                        <Receipt className="h-3 w-3" /> Statement
                      </TabsTrigger>
                      <TabsTrigger value="store-credits" className="text-xs gap-1">
                        <CreditCard className="h-3 w-3" /> Store Credits
                      </TabsTrigger>
                      <TabsTrigger value="adjustments" className="text-xs gap-1">
                        <Settings className="h-3 w-3" /> Adjustments
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="statement">
                      <AccountStatement 
                        storeId={selectedStore._id} 
                        storeName={selectedStore.storeName}
                      />
                    </TabsContent>

                    <TabsContent value="store-credits">
                      <StoreCreditInfo 
                        storeId={selectedStore._id} 
                        storeName={selectedStore.storeName}
                      />
                    </TabsContent>

                    <TabsContent value="adjustments">
                      <AdjustmentsManager 
                        storeId={selectedStore._id} 
                        showCreateButton={true} 
                      />
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {/* Follow-ups Tab */}
                <TabsContent value="followups" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Follow-ups & Communications</h3>
                    <Button size="sm" variant="outline" onClick={() => setLogCallOpen(true)}><Phone className="h-4 w-4 mr-1" /> Log Call</Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={handleSendReminder} disabled={loadingAction}>
                      {loadingAction ? <Loader2 className="h-6 w-6 animate-spin text-blue-600" /> : <Mail className="h-6 w-6 text-blue-600" />}
                      <span className="text-sm">Send Payment Reminder</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => setIsStatementFilterOpen(true)} disabled={isGeneratingPDF}>
                      {isGeneratingPDF ? <Loader2 className="h-6 w-6 animate-spin text-blue-600" /> : <FileDown className="h-6 w-6 text-blue-600" />}
                      <span className="text-sm">Download Statement</span>
                    </Button>
                  </div>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Communication History</CardTitle></CardHeader>
                    <CardContent>
                      {communicationLogs.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No communication records yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {communicationLogs.slice(0, 10).map((log: any, idx: number) => (
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
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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

      {/* Edit Store Modal */}
      <Dialog open={editStoreOpen} onOpenChange={setEditStoreOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> Edit Store</DialogTitle>
            <DialogDescription>Update store information and settings</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input value={editFormData.storeName} onChange={(e) => setEditFormData({...editFormData, storeName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Owner Name</Label>
              <Input value={editFormData.ownerName} onChange={(e) => setEditFormData({...editFormData, ownerName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editFormData.email} onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editFormData.phone} onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Input value={editFormData.address} onChange={(e) => setEditFormData({...editFormData, address: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={editFormData.city} onChange={(e) => setEditFormData({...editFormData, city: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={editFormData.state} onChange={(e) => setEditFormData({...editFormData, state: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Zip Code</Label>
              <Input value={editFormData.zipCode} onChange={(e) => setEditFormData({...editFormData, zipCode: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Price Category</Label>
              <select 
                value={editFormData.priceCategory} 
                onChange={(e) => setEditFormData({...editFormData, priceCategory: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="aPrice">Price List A</option>
                <option value="bPrice">Price List B</option>
                <option value="cPrice">Price List C</option>
                <option value="restaurantPrice">Restaurant Price</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Shipping Cost ($)</Label>
              <Input type="number" value={editFormData.shippingCost} onChange={(e) => setEditFormData({...editFormData, shippingCost: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="col-span-2 border-t pt-4">
              <h4 className="font-medium mb-3">Permissions</h4>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editFormData.isOrder} onChange={(e) => setEditFormData({...editFormData, isOrder: e.target.checked})} className="w-4 h-4" />
                  <span>Can Place Orders</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editFormData.isProduct} onChange={(e) => setEditFormData({...editFormData, isProduct: e.target.checked})} className="w-4 h-4" />
                  <span>Can View Products</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStoreOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStore} disabled={loadingAction}>
              {loadingAction ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Cheque Status Modal */}
      <Dialog open={chequeStatusOpen} onOpenChange={setChequeStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Update Cheque Status</DialogTitle>
            <DialogDescription>Cheque #{selectedCheque?.chequeNumber} - {formatCurrency(selectedCheque?.amount || 0)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <select 
                value={chequeStatusData.status} 
                onChange={(e) => setChequeStatusData({...chequeStatusData, status: e.target.value})}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
                <option value="bounced">Bounced</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {chequeStatusData.status === "cleared" && (
              <div className="space-y-2">
                <Label>Cleared Date</Label>
                <Input type="date" value={chequeStatusData.clearedDate} onChange={(e) => setChequeStatusData({...chequeStatusData, clearedDate: e.target.value})} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Bank Reference (Optional)</Label>
              <Input value={chequeStatusData.bankReference} onChange={(e) => setChequeStatusData({...chequeStatusData, bankReference: e.target.value})} placeholder="Transaction ID or reference" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setChequeStatusOpen(false); setSelectedCheque(null) }}>Cancel</Button>
            <Button onClick={handleUpdateChequeStatus} disabled={loadingAction}>
              {loadingAction ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Update Status
            </Button>
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
      {selectedStore && (
        <RecordPaymentModal
          open={recordPaymentOpen}
          onOpenChange={setRecordPaymentOpen}
          customer={{
            id: selectedStore._id,
            storeName: selectedStore.storeName,
            totalPaid: selectedStore.totalPaid,
            totalSpent: selectedStore.totalSpent,
            balanceDue: selectedStore.balanceDue,
            orders: storeOrders
          }}
          onSuccess={() => {
            fetchData(pagination.page)
            viewStoreDetails(selectedStore)
          }}
        />
      )}

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
