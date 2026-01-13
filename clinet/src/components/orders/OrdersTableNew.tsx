"use client"

import type React from "react"
import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Edit,
  Trash,
  FileText,
  Search,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  FileSpreadsheet,
  User,
  Wrench,
  Download,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Calendar,
  Filter,
  Printer,
  CreditCard,
  Eye,
  Ban,
  MoveRight,
  X,
} from "lucide-react"
import { type Order, formatCurrency, formatDate } from "@/lib/data"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import InvoiceGenerator from "./InvoiceGenerator"
import TransportationReceipt from "./TransportationReceipt"
import OrderDetailsModal from "./OrderView"
import type { RootState } from "@/redux/store"
import { useSelector } from "react-redux"
import WorkOrderForm from "./WorkOrder"
import { PaymentStatusPopup } from "./PaymentUpdateModel"
import {
  deleteOrderAPI,
  getAllOrderAPI,
  updateOrderAPI,
  updateOrderUnpaidAPI,
  deleteHardOrderAPI
} from "@/services2/operations/order"
import Swal from "sweetalert2"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { userWithOrderDetails } from "@/services2/operations/auth"
import UserDetailsModal from "../admin/user-details-modal"
import { CSVLink } from "react-csv"
import { Card, CardContent } from "@/components/ui/card"
import CreditMemoForm from "./credit-memo-form"
import CreditMemoList from "./CreditMemoList"

interface OrdersTableProps {
  orders: Order[]
  fetchOrders: () => void
  onDelete: (id: string) => void
  onPayment: (id: string, paymentMethod: any) => void
}

const OrdersTableNew: React.FC<OrdersTableProps> = ({
  orders: initialOrders,
  fetchOrders: initialFetchOrders,
  onDelete,
  onPayment,
}) => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth?.user ?? null)
  const token = useSelector((state: RootState) => state.auth?.token ?? null)
  const csvLinkRef = useRef<any>(null)

  // Core State
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  
  // Filters
  const [activeTab, setActiveTab] = useState<"Regural" | "NextWeek">("Regural")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [quickFilter, setQuickFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [stateFilter, setStateFilter] = useState("all") // NEW: State filter
  
  // Available states from orders
  const [availableStates, setAvailableStates] = useState<string[]>([])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalOrders, setTotalOrders] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  
  // Sorting
  const [sortField, setSortField] = useState("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)
  
  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [showTransport, setShowTransport] = useState(false)
  const [showCreditMemo, setShowCreditMemo] = useState(false)
  const [showCreditMemoList, setShowCreditMemoList] = useState(false)
  const [showWorkOrder, setShowWorkOrder] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showStatus, setShowStatus] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showUserDetails, setShowUserDetails] = useState(false)
  
  // Modal Data
  const [paymentOrderId, setPaymentOrderId] = useState("")
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [orderNotes, setOrderNotes] = useState("")
  const [userData, setUserData] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  
  // Export
  const [exportData, setExportData] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch orders function
  const fetchOrders = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", currentPage.toString())
      params.append("limit", pageSize.toString())
      params.append("orderType", activeTab)
      if (paymentFilter !== "all") params.append("paymentStatus", paymentFilter)
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const response = await getAllOrderAPI(token, params.toString())
      
      if (response?.orders && Array.isArray(response.orders)) {
        const formatted = response.orders.map((order: any) => ({
          ...order,
          id: order.orderNumber || `#${order._id?.slice(-5) || 'N/A'}`,
          clientName: order.store?.storeName || "Unknown",
          clientId: order.store?._id || "Unknown",
          storeState: order.store?.state || "",
          storeCity: order.store?.city || "",
          date: new Date(order.createdAt).toLocaleDateString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
        }))
        setOrders(formatted)
        setSummary(response.summary)
        setTotalOrders(response.totalOrders || formatted.length)
        setTotalPages(Math.ceil((response.totalOrders || formatted.length) / pageSize))
        
        // Extract unique states
        const states = [...new Set(formatted.map((o: any) => o.storeState).filter(Boolean))]
        setAvailableStates(states.sort())
      } else {
        setOrders([])
        setTotalPages(1)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({ title: "Error", description: "Failed to fetch orders. Check if server is running.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchOrders()
  }, [token, currentPage, pageSize, activeTab, paymentFilter, debouncedSearch, startDate, endDate])

  // Filter & Sort orders locally
  const filteredOrders = useMemo(() => {
    let result = [...orders]
    
    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(o => o.status?.toLowerCase() === statusFilter)
    }
    
    // State filter
    if (stateFilter !== "all") {
      result = result.filter(o => o.storeState === stateFilter)
    }
    
    // Quick filter - overdue (pending + older than 3 days)
    if (quickFilter === "overdue") {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      result = result.filter(o => 
        o.status?.toLowerCase() === "pending" && 
        new Date(o.createdAt) < threeDaysAgo
      )
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortField) {
        case "createdAt":
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        case "total":
          aVal = a.total || 0
          bVal = b.total || 0
          break
        case "clientName":
          aVal = (a.clientName || "").toLowerCase()
          bVal = (b.clientName || "").toLowerCase()
          break
        default:
          aVal = a[sortField] || ""
          bVal = b[sortField] || ""
      }
      return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
    })
    
    return result
  }, [orders, statusFilter, stateFilter, quickFilter, sortField, sortDir])

  // Stats
  const stats = useMemo(() => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    return {
      total: orders.length,
      pending: orders.filter(o => o.status?.toLowerCase() === "pending").length,
      processing: orders.filter(o => o.status?.toLowerCase() === "processing").length,
      delivered: orders.filter(o => o.status?.toLowerCase() === "delivered").length,
      overdue: orders.filter(o => 
        o.status?.toLowerCase() === "pending" && new Date(o.createdAt) < threeDaysAgo
      ).length,
    }
  }, [orders])

  // Check if order is overdue
  const isOverdue = useCallback((order: Order) => {
    if (order.status?.toLowerCase() !== "pending") return false
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    return new Date(order.createdAt) < threeDaysAgo
  }, [])

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o._id)))
    }
  }, [filteredOrders, selectedIds])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Sort handler
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }, [sortField])

  // Quick filter handler
  const handleQuickFilter = useCallback((filter: string) => {
    setQuickFilter(filter)
    setCurrentPage(1)
    if (filter === "all") {
      setStatusFilter("all")
      setStartDate("")
      setEndDate("")
    } else if (filter === "today") {
      const today = new Date().toISOString().split('T')[0]
      setStartDate(today)
      setEndDate(today)
      setStatusFilter("all")
    } else if (filter === "thisWeek") {
      const now = new Date()
      const start = new Date(now.setDate(now.getDate() - now.getDay()))
      const end = new Date(now.setDate(now.getDate() + 6))
      setStartDate(start.toISOString().split('T')[0])
      setEndDate(end.toISOString().split('T')[0])
      setStatusFilter("all")
    } else if (filter === "overdue") {
      setStatusFilter("all")
      setStartDate("")
      setEndDate("")
    } else {
      setStatusFilter(filter)
      setStartDate("")
      setEndDate("")
    }
  }, [])

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchQuery("")
    setStatusFilter("all")
    setPaymentFilter("all")
    setStateFilter("all")
    setQuickFilter("all")
    setStartDate("")
    setEndDate("")
    setCurrentPage(1)
  }, [])

  // Bulk actions
  const handleBulkStatus = async (status: string) => {
    if (selectedIds.size === 0) return
    setBulkProcessing(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => updateOrderAPI({ status }, token, id))
      )
      toast({ title: "Success", description: `${selectedIds.size} orders updated to ${status}` })
      setSelectedIds(new Set())
      fetchOrders()
    } catch (error) {
      toast({ title: "Error", description: "Failed to update orders", variant: "destructive" })
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleBulkPrint = async () => {
    const selected = filteredOrders.filter(o => selectedIds.has(o._id))
    for (const order of selected) {
      setSelectedOrder(order)
      setShowInvoice(true)
      await new Promise(r => setTimeout(r, 300))
    }
    toast({ title: "Printing", description: `${selected.length} invoices queued` })
  }

  const handleBulkDelete = async () => {
    const confirmed = await Swal.fire({
      title: `Delete ${selectedIds.size} orders?`,
      text: "This cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete All",
    })
    
    if (confirmed.isConfirmed) {
      setBulkProcessing(true)
      try {
        await Promise.all(
          Array.from(selectedIds).map(id => deleteOrderAPI(id, token, "Bulk delete"))
        )
        toast({ title: "Deleted", description: `${selectedIds.size} orders deleted` })
        setSelectedIds(new Set())
        fetchOrders()
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete orders", variant: "destructive" })
      } finally {
        setBulkProcessing(false)
      }
    }
  }

  // Single order actions
  const handleView = (order: Order) => {
    setSelectedOrder(order)
    setShowDetails(true)
  }

  const handleEdit = (order: Order) => {
    navigate(`/orders/edit/${order._id}`)
  }

  const handleVoidOrder = async (order: Order) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Void Order",
      input: "textarea",
      inputLabel: `Reason for voiding order ${order.id}?`,
      inputPlaceholder: "Enter reason for voiding this order...",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Void Order",
      inputValidator: (v) => !v ? "Reason is required!" : null,
    })
    
    if (isConfirmed && reason) {
      const res = await deleteOrderAPI(order._id, token, reason)
      if (res) {
        onDelete(order._id)
        fetchOrders()
      }
    }
  }

  const handleMarkUnpaid = async (order: Order) => {
    const creditApplied = parseFloat((order as any).creditApplied || 0);
    const creditInfo = creditApplied > 0 
      ? `\n\nNote: $${creditApplied.toFixed(2)} credit will be refunded to store.`
      : '';
    
    const result = await Swal.fire({
      title: "Mark as Unpaid?",
      html: `Order ${order.orderNumber || order.id} will be marked as unpaid.${creditInfo}<br><br>Please provide a reason:`,
      icon: "warning",
      input: "textarea",
      inputPlaceholder: "Enter reason for marking as unpaid...",
      inputAttributes: {
        "aria-label": "Reason"
      },
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Mark Unpaid",
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return "Please enter a reason";
        }
      }
    })
    
    if (result.isConfirmed && result.value) {
      try {
        await updateOrderUnpaidAPI(order._id, token, result.value)
        toast({ title: "Success", description: creditApplied > 0 
          ? `Order marked as unpaid. $${creditApplied.toFixed(2)} credit refunded.`
          : "Order marked as unpaid" })
        fetchOrders()
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to mark order as unpaid" })
      }
    }
  }

  const handleInvoice = (order: Order) => {
    
    setSelectedOrder(order)
    setShowInvoice(true)
  }

  const handleTransport = (order: Order) => {
    setSelectedOrder(order)
    setShowTransport(true)
  }

  const handleCreditMemo = (order: Order) => {
    setSelectedOrder(order)
    setShowCreditMemoList(true)  // Changed to show list instead of form directly
  }

  const handleWorkOrder = (order: Order) => {
    setSelectedOrder(order)
    setShowWorkOrder(true)
  }

  const handlePayment = (order: Order) => {
    setSelectedOrder(order)
    setPaymentOrderId(order.id)
    setPaymentAmount(order.total)
    setShowPayment(true)
  }

  const handleStatusChange = (order: Order) => {
    setSelectedOrder(order)
    setShowStatus(true)
  }

  const handleNotes = (order: Order) => {
    setSelectedOrder(order)
    setOrderNotes(order.notes || "")
    setShowNotes(true)
  }

  const handleUserDetails = async (storeId: string) => {
    try {
      const res = await userWithOrderDetails(storeId)
      setUserData(res)
      setShowUserDetails(true)
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch user details", variant: "destructive" })
    }
  }

  // Save notes
  const saveNotes = async () => {
    if (!selectedOrder) return
    try {
      await updateOrderAPI({ notes: orderNotes }, token, selectedOrder._id)
      toast({ title: "Saved", description: "Notes updated" })
      setShowNotes(false)
      fetchOrders()
    } catch (error) {
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" })
    }
  }

  // Export CSV
  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.append("limit", "100000")
      params.append("orderType", activeTab)
      const response = await getAllOrderAPI(token, params.toString())
      
      if (response?.orders) {
        const data = response.orders.map((o: any) => ({
          "Order ID": o.orderNumber || o._id.slice(-5),
          "Date": new Date(o.createdAt).toLocaleDateString(),
          "Client": o.store?.storeName || "Unknown",
          "Status": o.status,
          "Payment": o.paymentStatus,
          "Items": o.items?.length || 0,
          "Total": o.total,
        }))
        setExportData(data)
        setTimeout(() => csvLinkRef.current?.link?.click(), 100)
      }
    } catch (error) {
      toast({ title: "Error", description: "Export failed", variant: "destructive" })
    } finally {
      setExporting(false)
    }
  }

  // Status helpers
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending": return "bg-amber-100 text-amber-700"
      case "processing": return "bg-blue-100 text-blue-700"
      case "shipped": return "bg-purple-100 text-purple-700"
      case "delivered": return "bg-green-100 text-green-700"
      case "cancelled": return "bg-red-100 text-red-700"
      case "paid": return "bg-emerald-100 text-emerald-700"
      case "partial": return "bg-orange-100 text-orange-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending": return <Clock size={12} />
      case "processing": return <Package size={12} />
      case "shipped": return <Truck size={12} />
      case "delivered": return <CheckCircle2 size={12} />
      case "cancelled": return <XCircle size={12} />
      case "paid": return <CheckCircle2 size={12} />
      default: return null
    }
  }

  // Sort icon
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="ml-1 opacity-40" />
    return sortDir === "asc" ? <ArrowUp size={12} className="ml-1" /> : <ArrowDown size={12} className="ml-1" />
  }

  return (
    <div className="space-y-4">
      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All", icon: ShoppingBag },
          { id: "today", label: "Today", icon: Calendar },
          { id: "thisWeek", label: "This Week", icon: Calendar },
          { id: "pending", label: "Pending", icon: Clock, count: stats.pending },
          { id: "delivered", label: "Delivered", icon: CheckCircle2, count: stats.delivered },
          { id: "overdue", label: "Overdue", icon: AlertTriangle, count: stats.overdue },
        ].map(f => (
          <Button
            key={f.id}
            size="sm"
            variant={quickFilter === f.id ? "default" : "outline"}
            onClick={() => handleQuickFilter(f.id)}
            className="h-8"
          >
            <f.icon size={14} className="mr-1" />
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{f.count}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Search & Filters Row */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-[200px] h-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setQuickFilter("all") }}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>

          {/* Payment Filter */}
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="pending">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          {/* State Filter */}
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {availableStates.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[130px] h-9"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[130px] h-9"
            />
          </div>

          {/* Reset */}
          {(statusFilter !== "all" || paymentFilter !== "all" || stateFilter !== "all" || startDate || endDate || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9">
              <X size={14} className="mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchOrders} disabled={loading} className="h-9">
            <RefreshCw size={14} className={cn("mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting} className="h-9">
            <Download size={14} className="mr-1" />
            Export
          </Button>
          {user?.role === "admin" && (
            <Button size="sm" onClick={() => navigate("/orders/new")} className="h-9">
              <Plus size={14} className="mr-1" />
              New Order
            </Button>
          )}
        </div>
      </div>

      <CSVLink data={exportData} filename={`orders-${Date.now()}.csv`} className="hidden" ref={csvLinkRef} />

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && user?.role === "admin" && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            <X size={14} className="mr-1" /> Clear
          </Button>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={bulkProcessing}>
                <CheckCircle2 size={14} className="mr-1" /> Update Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkStatus("pending")}>
                <Clock size={14} className="mr-2 text-amber-500" /> Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus("processing")}>
                <Package size={14} className="mr-2 text-blue-500" /> Processing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus("delivered")}>
                <CheckCircle2 size={14} className="mr-2 text-green-500" /> Delivered
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={handleBulkPrint} disabled={bulkProcessing}>
            <Printer size={14} className="mr-1" /> Print
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkDelete} disabled={bulkProcessing} className="text-red-600 hover:text-red-700">
            <Trash size={14} className="mr-1" /> Delete
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => handleQuickFilter("all")}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-xl font-bold">{summary?.totalOrders || stats.total}</p>
            </div>
            <ShoppingBag className="h-5 w-5 text-blue-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-xl font-bold">${(summary?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Received</p>
              <p className="text-xl font-bold">${(summary?.totalReceived || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => handleQuickFilter("overdue")}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="text-xl font-bold text-orange-600">{stats.overdue}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </CardContent>
        </Card>
      </div>

      {/* Order Type Tabs */}
      <div className="flex gap-1 border-b">
        <button
          className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px", 
            activeTab === "Regural" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
          onClick={() => { setActiveTab("Regural"); setCurrentPage(1) }}
        >
          Regular Orders
        </button>
        {/* <button
          className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px",
            activeTab === "NextWeek" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
          onClick={() => { setActiveTab("NextWeek"); setCurrentPage(1) }}
        >
          Next Week Orders
        </button> */}
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {user?.role === "admin" && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="w-[100px]">
                <button onClick={() => handleSort("orderNumber")} className="flex items-center text-xs font-medium">
                  Order <SortIcon field="orderNumber" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort("clientName")} className="flex items-center text-xs font-medium">
                  Client <SortIcon field="clientName" />
                </button>
              </TableHead>
              <TableHead className="text-xs font-medium">State</TableHead>
              <TableHead>
                <button onClick={() => handleSort("createdAt")} className="flex items-center text-xs font-medium">
                  Date <SortIcon field="createdAt" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead>
                <button onClick={() => handleSort("total")} className="flex items-center text-xs font-medium">
                  Total <SortIcon field="total" />
                </button>
              </TableHead>
              <TableHead className="w-[80px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const overdue = isOverdue(order)
                return (
                  <TableRow 
                    key={order._id} 
                    className={cn(
                      overdue && "bg-orange-50",
                      selectedIds.has(order._id) && "bg-blue-50"
                    )}
                  >
                    {user?.role === "admin" && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(order._id)}
                          onCheckedChange={() => toggleSelect(order._id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <button 
                        onClick={() => handleView(order)}
                        className="font-medium text-primary hover:underline"
                      >
                        {order.id}
                      </button>
                      {order.isDelete && (
                        <Badge variant="destructive" className="ml-1 text-[10px]">VOID</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => handleUserDetails(order.store?._id || order.store)}
                        className="text-sm hover:text-primary hover:underline"
                      >
                        {order.clientName}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{order.storeState || "-"}</TableCell>
                    <TableCell className="text-sm">{order.date}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs w-fit", getStatusColor(order.status))}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                        {overdue && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-orange-600">
                            <AlertTriangle size={10} /> Overdue
                          </span>
                        )}
                        {!order.isDelete && order.status !== "delivered" && user?.role === "admin" && (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleStatusChange(order)}>
                            Change
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs w-fit", getStatusColor(order.paymentStatus))}>
                          {getStatusIcon(order.paymentStatus)}
                          {order.paymentStatus}
                        </span>
                        {!order.isDelete && (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handlePayment(order)}>
                            {order.paymentStatus === "pending" ? "Pay" : "Edit"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">{order.items?.length || 0}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{formatCurrency(order.isDelete ? order.deleted?.amount : order.total)}</span>
                        {/* Show paid amount for partial payments (cash/card + credit applied) */}
                        {order.paymentStatus === "partial" && (parseFloat((order as any).paymentAmount || 0) + parseFloat((order as any).creditApplied || 0)) > 0 && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            Paid: {formatCurrency(parseFloat((order as any).paymentAmount || 0) + parseFloat((order as any).creditApplied || 0))}
                          </span>
                        )}
                        {/* Show Credit Used - only for store credit (entries without creditMemoNumber) */}
                        {(() => {
                          const creditApps = (order as any).creditApplications || [];
                          const storeCreditUsed = creditApps
                            .filter((app: any) => !app.creditMemoNumber)
                            .reduce((sum: number, app: any) => sum + (app.amount || 0), 0);
                          return storeCreditUsed > 0 ? (
                            <span className="text-xs text-purple-600 flex items-center gap-1">
                              <CreditCard size={10} />
                              Credit Used: {formatCurrency(storeCreditUsed)}
                            </span>
                          ) : null;
                        })()}
                        {/* Show Credit Memo Applied - only for credit memo (entries with creditMemoNumber) */}
                        {(() => {
                          const creditApps = (order as any).creditApplications || [];
                          const hasCreditMemo = creditApps.some((app: any) => app.creditMemoNumber);
                          return hasCreditMemo ? (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <CreditCard size={10} />
                              Credit Memo Applied
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleView(order)}>
                            <Eye size={14} className="mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleNotes(order)}>
                            <FileText size={14} className="mr-2" /> Notes
                          </DropdownMenuItem>
                          {!order.isDelete && user?.role === "admin" && (
                            <DropdownMenuItem onClick={() => handleEdit(order)}>
                              <Edit size={14} className="mr-2" /> Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FileSpreadsheet size={14} className="mr-2" /> Documents
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleInvoice(order)}>Invoice</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleTransport(order)}>Transport Receipt</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleWorkOrder(order)}>Work Order</DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {!order.isDelete && (
                            <DropdownMenuItem onClick={() => handleCreditMemo(order)}>
                              <CreditCard size={14} className="mr-2" /> Credit Memo
                            </DropdownMenuItem>
                          )}
                          {order.paymentStatus !== "pending" && !order.isDelete && user?.role === "admin" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleMarkUnpaid(order)}>
                                <MoveRight size={14} className="mr-2" /> Mark Unpaid
                              </DropdownMenuItem>
                            </>
                          )}
                          {user?.role === "admin" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleVoidOrder(order)} className="text-red-600">
                                <Ban size={14} className="mr-2" /> Void
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-3">
        <div className="text-sm text-muted-foreground">
          Showing {filteredOrders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalOrders)} of {totalOrders}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Per page:</span>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = currentPage <= 3 ? i + 1 : currentPage + i - 2
                if (page > totalPages || page < 1) return null
                return (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={cn(currentPage >= totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* Modals */}
      <OrderDetailsModal
        order={selectedOrder}
        open={showDetails}
        onClose={() => setShowDetails(false)}
        userRole={user?.role}
      />

      {selectedOrder && (
        <>
          <InvoiceGenerator
            orderSingle={selectedOrder}
            open={showInvoice}
            onClose={() => { setShowInvoice(false); setSelectedOrder(null) }}
            fetchOrders={fetchOrders}
          />
          <TransportationReceipt
            order={selectedOrder}
            open={showTransport}
            onClose={() => { setShowTransport(false); setSelectedOrder(null) }}
          />
          <CreditMemoForm
            open={showCreditMemo}
            onClose={() => { setShowCreditMemo(false); setSelectedOrder(null) }}
            order={selectedOrder}
            token={token}
            onSuccess={fetchOrders}
          />
          <CreditMemoList
            open={showCreditMemoList}
            onClose={() => { setShowCreditMemoList(false); setSelectedOrder(null) }}
            order={selectedOrder}
            token={token}
          />
        </>
      )}

      <Dialog open={showWorkOrder} onOpenChange={setShowWorkOrder}>
        <DialogContent className="max-w-4xl p-0">
          {selectedOrder && <WorkOrderForm order={selectedOrder} onClose={() => setShowWorkOrder(false)} />}
        </DialogContent>
      </Dialog>

      <PaymentStatusPopup
        open={showPayment}
        onOpenChange={setShowPayment}
        orderId={paymentOrderId}
        totalAmount={paymentAmount}
        id={selectedOrder?._id || ""}
        fetchOrders={fetchOrders}
        onPayment={onPayment}
        paymentOrder={selectedOrder}
      />

      <StatusUpdateDialog
        open={showStatus}
        onOpenChange={setShowStatus}
        order={selectedOrder}
        token={token}
        onSuccess={() => { fetchOrders(); setShowStatus(false) }}
      />

      <UserDetailsModal
        isOpen={showUserDetails}
        onClose={() => setShowUserDetails(false)}
        userData={userData}
        fetchUserDetailsOrder={handleUserDetails}
      />

      {/* Notes Dialog */}
      <Dialog open={showNotes} onOpenChange={setShowNotes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order Notes - {selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          <textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Enter notes..."
            className="w-full min-h-[100px] p-3 border rounded-md"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNotes(false)}>Cancel</Button>
            <Button onClick={saveNotes}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Status Update Dialog Component
const StatusUpdateDialog = ({
  open,
  onOpenChange,
  order,
  token,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  token: string | null
  onSuccess: () => void
}) => {
  const [status, setStatus] = useState(order?.status || "pending")
  const { toast } = useToast()

  useEffect(() => {
    if (order) setStatus(order.status || "pending")
  }, [order])

  const handleSubmit = async () => {
    if (!order) return
    try {
      await updateOrderAPI({ status }, token, order._id)
      toast({ title: "Updated", description: `Order status changed to ${status}` })
      onSuccess()
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Status - {order?.id}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {[
            { value: "pending", label: "Pending", icon: Clock, color: "text-amber-500" },
            { value: "processing", label: "Processing", icon: Package, color: "text-blue-500" },
            { value: "shipped", label: "Shipped", icon: Truck, color: "text-purple-500" },
            { value: "delivered", label: "Delivered", icon: CheckCircle2, color: "text-green-500" },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                status === s.value ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <s.icon className={cn("h-5 w-5", s.color)} />
              <span className="font-medium">{s.label}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OrdersTableNew
