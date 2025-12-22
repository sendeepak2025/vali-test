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
  ReceiptText,
  FilePlus2,
  PencilRuler,
  Wrench,
  Download,
  ShoppingBag,
  DollarSign,
  BarChart,
  CreditCard,
  Badge,
  Eye,
  Ban,
  MoveRight,
  AlertTriangle,
  Calendar,
} from "lucide-react"
import OrderQuickFilters from "./OrderQuickFilters"
import OrderBulkActions from "./OrderBulkActions"
import { type Order, formatCurrency, formatDate } from "@/lib/data"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import OrderEditForm from "./OrderEditForm"
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DateFilterDialog from "./DateFilterPopup"
import { userWithOrderDetails } from "@/services2/operations/auth"
import UserDetailsModal from "../admin/user-details-modal"
import { CSVLink } from "react-csv"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@radix-ui/react-progress"
import CreditMemoForm from "./credit-memo-form" // Import the new component
import CreditMemoList from "./CreditMemoList"

interface OrdersTableProps {
  orders: Order[]
  fetchOrders: () => void
  onDelete: (id: string) => void
  onPayment: (id: string, paymentMethod: any) => void
}

const OrdersTable: React.FC<OrdersTableProps> = ({
  orders: initialOrders,
  fetchOrders: initialFetchOrders,
  onDelete,
  onPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState("")

  const { toast } = useToast()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isTransportReceiptOpen, setIsTransportReceiptOpen] = useState(false)
  const [isCreditMemoOpen, setIsCreditMemoOpen] = useState(false) // Added state for Credit Memo
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth?.user ?? null)
  const [workOrderDialogOrder, setWorkOrderDialogOrder] = useState<Order | null>(null)
  const token = useSelector((state: RootState) => state.auth?.token ?? null)
  const [activeTab, setActiveTab] = useState<"Regural" | "NextWeek">("Regural")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [totalOrders, setTotalOrders] = useState(0)

  // REFETCH
  const [startDate, setStartDate] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [endDate, setEndDate] = useState("")

  // NEW: Order Status Filter
  const [orderStatusFilter, setOrderStatusFilter] = useState("all")
  
  // NEW: Quick Filter
  const [quickFilter, setQuickFilter] = useState("all")
  
  // NEW: Sorting
  const [sortField, setSortField] = useState<string>("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  
  // NEW: Bulk Selection
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [isProcessingBulk, setIsProcessingBulk] = useState(false)

  // PAYMENT MODEL
  const [open, setOpen] = useState(false)
  const [orderId, setOrderId] = useState("")
  const [paymentOrder, setpaymentOrder] = useState<Order | null>(null)
  const [orderIdDB, setOrderIdDB] = useState("")
  const [totalAmount, setTotalAmount] = useState(0)

  const [statusOpen, setStatusOpen] = useState(false)
  const [statusOrderId, setStatusOrderId] = useState("")
  const [statusOrder, setStatusOrder] = useState<Order | null>(null)
  const [selectedUserData, setSelectedUserData] = useState(null)
  const [userDetailsOpen, setUserDetailsOpen] = useState(false)
  const [exportData, setExportData] = useState([])
  const [isPreparing, setIsPreparing] = useState(false)
  const [csvReady, setCsvReady] = useState(false)
  const [summary, setSummary] = useState(null)
  const csvLinkRef = useRef(null)

  // CREDIT MEMO
  const [isCreditMemoListOpen, setIsCreditMemoListOpen] = useState(false)

  // Order Notes state
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
  const [selectedOrderForNotes, setSelectedOrderForNotes] = useState<Order | null>(null)
  const [orderNotes, setOrderNotes] = useState("")
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false)

  const handleResetDates = () => {
    setStartDate("")
    setEndDate("")
  }

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // NEW: Calculate quick filter counts and apply filters
  const getQuickFilterDates = useCallback((filter: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)

    switch (filter) {
      case "today":
        return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] }
      case "thisWeek":
        return { start: startOfWeek.toISOString().split('T')[0], end: endOfWeek.toISOString().split('T')[0] }
      default:
        return { start: "", end: "" }
    }
  }, [])

  // NEW: Handle quick filter change
  const handleQuickFilterChange = useCallback((filter: string) => {
    setQuickFilter(filter)
    setCurrentPage(1)
    
    if (filter === "all") {
      setStartDate("")
      setEndDate("")
      setOrderStatusFilter("all")
    } else if (filter === "today" || filter === "thisWeek") {
      const dates = getQuickFilterDates(filter)
      setStartDate(dates.start)
      setEndDate(dates.end)
      setOrderStatusFilter("all")
    } else if (filter === "overdue") {
      // Overdue = pending status + created more than 3 days ago
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      setEndDate(threeDaysAgo.toISOString().split('T')[0])
      setStartDate("")
      setOrderStatusFilter("pending")
    } else if (filter === "pending" || filter === "delivered") {
      setStartDate("")
      setEndDate("")
      setOrderStatusFilter(filter)
    }
  }, [getQuickFilterDates])

  // NEW: Handle sorting
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }, [sortField])

  // NEW: Sort icon component
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="ml-1 opacity-50" />
    return sortDirection === "asc" 
      ? <ArrowUp size={14} className="ml-1" /> 
      : <ArrowDown size={14} className="ml-1" />
  }

  // NEW: Sorted orders
  const sortedOrders = useMemo(() => {
    let filtered = [...orders]
    
    // Apply order status filter
    if (orderStatusFilter && orderStatusFilter !== "all") {
      filtered = filtered.filter(order => order.status?.toLowerCase() === orderStatusFilter.toLowerCase())
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
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
        case "status":
          aVal = a.status || ""
          bVal = b.status || ""
          break
        case "clientName":
          aVal = a.clientName || ""
          bVal = b.clientName || ""
          break
        default:
          aVal = a[sortField] || ""
          bVal = b[sortField] || ""
      }
      
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })
    
    return filtered
  }, [orders, orderStatusFilter, sortField, sortDirection])

  // NEW: Calculate order stats
  const orderStats = useMemo(() => {
    const now = new Date()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status?.toLowerCase() === "pending").length,
      processingOrders: orders.filter(o => o.status?.toLowerCase() === "processing").length,
      deliveredOrders: orders.filter(o => o.status?.toLowerCase() === "delivered").length,
      cancelledOrders: orders.filter(o => o.status?.toLowerCase() === "cancelled" || o.isDelete).length,
      totalAmount: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      overdueOrders: orders.filter(o => 
        o.status?.toLowerCase() === "pending" && 
        new Date(o.createdAt) < threeDaysAgo
      ).length,
    }
  }, [orders])

  // NEW: Check if order is overdue (pending + older than 3 days)
  const isOrderOverdue = useCallback((order: Order) => {
    if (order.status?.toLowerCase() !== "pending") return false
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    return new Date(order.createdAt) < threeDaysAgo
  }, [])

  // NEW: Bulk selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(sortedOrders.map(o => o._id || o.id)))
    } else {
      setSelectedOrders(new Set())
    }
  }, [sortedOrders])

  const handleSelectOrder = useCallback((orderId: string, checked: boolean) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(orderId)
      } else {
        newSet.delete(orderId)
      }
      return newSet
    })
  }, [])

  const isAllSelected = useMemo(() => {
    return sortedOrders.length > 0 && selectedOrders.size === sortedOrders.length
  }, [sortedOrders, selectedOrders])

  // NEW: Bulk actions
  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedOrders.size === 0) return
    setIsProcessingBulk(true)
    
    try {
      const updatePromises = Array.from(selectedOrders).map(orderId => 
        updateOrderAPI({ status }, token, orderId)
      )
      await Promise.all(updatePromises)
      
      toast({
        title: "Status Updated",
        description: `${selectedOrders.size} orders updated to ${status}`,
      })
      
      setSelectedOrders(new Set())
      fetchOrders()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update some orders",
        variant: "destructive",
      })
    } finally {
      setIsProcessingBulk(false)
    }
  }

  const handleBulkPrint = async () => {
    if (selectedOrders.size === 0) return
    
    const selectedOrdersList = sortedOrders.filter(o => selectedOrders.has(o._id || o.id))
    
    // Open each order's invoice in sequence
    for (const order of selectedOrdersList) {
      setSelectedOrder(order)
      setIsInvoiceOpen(true)
      // Small delay between prints
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    toast({
      title: "Print Started",
      description: `Printing ${selectedOrders.size} invoices`,
    })
  }

  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) return
    setIsProcessingBulk(true)
    
    try {
      const deletePromises = Array.from(selectedOrders).map(orderId => 
        deleteOrderAPI(orderId, token, "Bulk delete")
      )
      await Promise.all(deletePromises)
      
      toast({
        title: "Orders Deleted",
        description: `${selectedOrders.size} orders deleted`,
      })
      
      setSelectedOrders(new Set())
      fetchOrders()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete some orders",
        variant: "destructive",
      })
    } finally {
      setIsProcessingBulk(false)
    }
  }

  // Fetch orders with pagination and filtering
  const fetchOrders = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.append("page", currentPage.toString())
      params.append("limit", pageSize.toString())
      params.append("paymentStatus", paymentFilter.toString())

      if (debouncedSearchQuery) {
        params.append("search", debouncedSearchQuery)
      }
      if (startDate) {
        params.append("startDate", startDate)
      }
      if (endDate) {
        params.append("endDate", endDate)
      }
      params.append("orderType", activeTab)

      // Make API call with query parameters
      const response = await getAllOrderAPI(token, params.toString())
      console.log(response)
      if (response && Array.isArray(response.orders)) {
        setOrders(
          response.orders.map((order) => ({
            id: order?.orderNumber || `#${order._id.toString().slice(-5)}`,
            date: new Date(order.createdAt).toLocaleDateString('en-US', {
              timeZone: 'UTC', // ⬅️ Force UTC
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),

            clientName: order.store?.storeName || "Unknown",
            ...order,
          })),
        )
        setSummary(response.summary)
        setTotalOrders(response.totalOrders || response.orders.length)
        setTotalPages(Math.ceil((response.totalOrders || response.orders.length) / pageSize))
      } else {
        setOrders([])
        setTotalPages(1)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch orders when page, pageSize, search query or tab changes
  useEffect(() => {
    fetchOrders()
  }, [currentPage, pageSize, debouncedSearchQuery, activeTab, token, paymentFilter, endDate, startDate])

  useEffect(() => {
    if (!open) {
      setOrderId("")
      setTotalAmount(0)
    }
  }, [open])

  const handleEdit = (order: Order) => {
    navigate(`/orders/edit/${order._id}`)
  }
  const handleUnpaid = async (order: Order) => {
    // 1. Confirmation dialog
    const confirmed = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to mark payment for order ${order.orderNumber} as unpaid. This action cannot be undone!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, mark as unpaid!",
    });

    if (confirmed.isConfirmed) {
      // 2. Show loading toast

      try {
        // 3. Call API
        const updatedOrder = await updateOrderUnpaidAPI(order?._id, token);


        // 5. UI refresh
        if (updatedOrder) {
          fetchOrders(); // Refresh orders list
        }
      } catch (error) {
        console.error("UNPAID API ERROR:", error);

      }
    }
  };


  const handleDelete = async (id: string, orderNumber: string) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Reason for Deletion",
      input: "textarea",
      inputLabel: `Why are you deleting order ${orderNumber}?`,
      inputPlaceholder: "Enter the reason here...",
      inputAttributes: {
        "aria-label": "Type your reason here",
      },
      showCancelButton: true,
      confirmButtonText: "Submit",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      inputValidator: (value) => {
        if (!value) {
          return "Reason is required!"
        }
      },
    })

    if (isConfirmed && reason) {
      const confirmed = await Swal.fire({
        title: "Are you sure?",
        text: `You are about to delete order ${orderNumber}. This action cannot be undone!`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!",
      })

      if (confirmed.isConfirmed) {
        const deletedOrder = await deleteOrderAPI(id, token, reason)
        console.log(reason)

        if (deletedOrder) {
          onDelete(id)
          fetchOrders()
        }
      }
    }
  }






  const handleHardDelete = async (id: string, orderNumber: string) => {
    const { isConfirmed } = await Swal.fire({
      title: `Permanently delete order ${orderNumber}?`,
      text: "This action cannot be undone. Are you sure?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete permanently",
    });

    if (isConfirmed) {
      try {
        const deletedOrder = await deleteHardOrderAPI(id, token); // Make sure your API is correctly hooked
        if (deletedOrder) {
          onDelete(id);
          fetchOrders();

          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: `Order ${orderNumber} has been permanently deleted.`,
            timer: 2000,
            showConfirmButton: false,
          });
        }
      } catch (err) {
        console.error("Delete error:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Something went wrong while deleting the order.",
        });
      }
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailsModalOpen(true)
  }

  const handleViewClientProfile = (clientId: string) => {
    navigate(`/clients/profile/${clientId}`)
  }

  const handleSaveOrder = (updatedOrder: Order) => {
    toast({
      title: "Order Updated",
      description: `Order ${updatedOrder.id} has been updated successfully`,
    })
    setIsEditDialogOpen(false)
    fetchOrders()
  }

  const handleGenerateInvoice = (order: Order) => {
    setSelectedOrder(order)
    setIsInvoiceOpen(true)
  }

  const handleTransportationReceipt = (order: Order) => {
    setSelectedOrder(order)
    setIsTransportReceiptOpen(true)
  }

  // Added Credit Memo handler
  const handleCreateCreditMemo = (order: Order) => {
    setSelectedOrder(order)
    setIsCreditMemoOpen(true)
  }

  const handleCreateDocument = (order: Order, docType: string) => {
    setSelectedOrder(order)

    switch (docType) {
      case "invoice":
        setIsInvoiceOpen(true)
        break
      case "transport":
        setIsTransportReceiptOpen(true)
        break
      case "credit_memo": // Added credit memo case
        setIsCreditMemoOpen(true)
        break
      default:
        toast({
          title: "Document Creation",
          description: `Creating ${docType} for order ${order.id}`,
        })
    }
  }

  const handleCreateWorkOrder = (order: Order) => {
    setWorkOrderDialogOrder(order)
  }

  const handleNewOrder = () => {
    navigate("/orders/new")
  }

  const handleConvertToRegular = (order: Order) => {
    // You would implement the API call here to update the order type
    toast({
      title: "Order Converted",
      description: `Order ${order.id} has been converted to Regular`,
    })
    fetchOrders() // Refresh orders after conversion
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock size={14} />
      case "processing":
        return <Package size={14} />
      case "shipped":
        return <Truck size={14} />
      case "delivered":
        return <CheckCircle2 size={14} />
      case "cancelled":
        return <XCircle size={14} />
      case "paid":
        return <CheckCircle2 size={14} /> // You can change icon if needed
      default:
        return null
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700"
      case "processing":
        return "bg-blue-100 text-blue-700"
      case "shipped":
        return "bg-purple-100 text-purple-700"
      case "delivered":
        return "bg-green-100 text-green-700"
      case "cancelled":
        return "bg-red-100 text-red-700"
      case "paid":
        return "bg-emerald-100 text-emerald-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const renderInvoiceGenerator = () => {
    if (!selectedOrder) return null

    return (
      <InvoiceGenerator
        orderSingle={selectedOrder}
        open={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false)
          setTimeout(() => setSelectedOrder(null), 300)
          fetchOrders()
        }}
        fetchOrders={fetchOrders}
        onViewClientProfile={() => selectedOrder.clientId && handleViewClientProfile(selectedOrder.clientId)}
      />
    )
  }

  const renderTransportationReceipt = () => {
    if (!selectedOrder) return null

    return (
      <TransportationReceipt
        order={selectedOrder}
        open={isTransportReceiptOpen}
        onClose={() => {
          setIsTransportReceiptOpen(false)
          setTimeout(() => setSelectedOrder(null), 300)
        }}
        onViewClientProfile={() => selectedOrder.clientId && handleViewClientProfile(selectedOrder.clientId)}
      />
    )
  }

  // Added Credit Memo renderer
  const renderCreditMemoForm = () => {
    if (!selectedOrder) return null

    return (
      <CreditMemoForm
        open={isCreditMemoOpen}
        onClose={() => {
          setIsCreditMemoOpen(false)
          setTimeout(() => setSelectedOrder(null), 300)
        }}
        order={selectedOrder}
        token={token}
        onSuccess={() => {
          fetchOrders()
          toast({
            title: "Success",
            description: "Credit memo created successfully",
          })
        }}
      />
    )
  }

  const renderCreditMemoList = () => {
    if (!selectedOrder) return null

    return (
      <CreditMemoList
        open={isCreditMemoListOpen}
        onClose={() => {
          setIsCreditMemoListOpen(false)
          setTimeout(() => setSelectedOrder(null), 300)
        }}
        order={selectedOrder}
        token={token}
      />
    )
  }
  const handleViewCreditMemos = (order: Order) => {
    setSelectedOrder(order)
    setIsCreditMemoListOpen(true)
  }

  const handleDownloadAllOrders = async (type: string) => {
    setLoading(true)
    try {
      // Fetch all orders for the selected type without pagination
      const params = new URLSearchParams()

      params.append("limit", "5000000")
      params.append("paymentStatus", paymentFilter.toString())

      if (debouncedSearchQuery) {
        params.append("search", debouncedSearchQuery)
      }
      if (startDate) {
        params.append("startDate", startDate)
      }
      if (endDate) {
        params.append("endDate", endDate)
      }
      params.append("orderType", activeTab)
      const response = await getAllOrderAPI(token, params.toString())

      if (!response || !Array.isArray(response.orders) || response.orders.length === 0) {
        toast({
          title: "No orders found",
          description: `There are no ${type} orders to download`,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const allOrders = response.orders

      // Find oldest and newest order dates
      const orderDates = allOrders.map((order) => new Date(order.createdAt))
      const oldestDate = new Date(Math.min(...orderDates.map((date) => date.getTime())))
      const newestDate = new Date(Math.max(...orderDates.map((date) => date.getTime())))

      // Format dates for display
      const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      }

      const dateRangeText = `${type} Orders (${formatDate(oldestDate)} - ${formatDate(newestDate)})`

      // Create a map to store merged product quantities
      const productMap = new Map()

      // Loop through all orders and their items
      allOrders.forEach((order) => {
        order.items.forEach((item) => {
          const productId = item.product || item.productId || ""
          const productName = item.name || item.productName || ""
          const pricingType = item.pricingType?.toLowerCase() || "unit"

          if (!productMap.has(productId)) {
            productMap.set(productId, {
              id: productId,
              name: productName,
              boxQuantity: 0,
              unitQuantity: 0,
              unitLabel: "", // to show proper unit like "kg", "piece"
              totalPrice: 0,
            })
          }

          const productEntry = productMap.get(productId)

          if (pricingType === "box") {
            productEntry.boxQuantity += item.quantity
          } else {
            productEntry.unitQuantity += item.quantity
            productEntry.unitLabel = pricingType // store last non-box label
          }

          productEntry.totalPrice += item.total || item.price * item.quantity
        })
      })

      // Convert map to array
      const mergedProducts = Array.from(productMap.values())

      // Create PDF document
      const doc = new jsPDF()

      // Add title with date range
      doc.setFontSize(16)
      doc.text(dateRangeText, 14, 20)

      // Add order count information
      doc.setFontSize(12)
      doc.text(`Total User Order: ${allOrders.length}`, 14, 30)

      // Prepare data for table
      const tableData = Array.from(productMap.values()).map((product) => [
        product.name,
        product.boxQuantity > 0 ? product.boxQuantity.toString() : "",
        product.unitQuantity > 0 ? `${product.unitQuantity} ${product.unitLabel}` : "",
      ])

      // Calculate total value of all products
      const totalValue = mergedProducts.reduce((sum, product) => sum + product.totalPrice, 0)

      // Add table to PDF
      autoTable(doc, {
        head: [["Product Name", "Box Quantity", "Unit Quantity"]],
        body: tableData,
        startY: 40,
        theme: "striped",
        headStyles: { fillColor: [66, 66, 66] },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
      })

      // Save the PDF
      doc.save(`${type}-orders-${new Date().toISOString().split("T")[0]}.pdf`)

      toast({
        title: "PDF Download Started",
        description: `All ${type} orders have been downloaded`,
      })
    } catch (error) {
      console.error("Error downloading orders:", error)
      toast({
        title: "Error",
        description: "Failed to download orders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate pagination items
  const renderPaginationItems = () => {
    const items = []

    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink
          onClick={() => setCurrentPage(1)}
          isActive={currentPage === 1}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer",
            currentPage === 1 ? "bg-primary text-white shadow" : "text-muted-foreground hover:bg-muted",
          )}
        >
          1
        </PaginationLink>
      </PaginationItem>,
    )

    // Show ellipsis if needed (before current range)
    if (currentPage > 3) {
      items.push(
        <PaginationItem key="ellipsis-1">
          <PaginationEllipsis />
        </PaginationItem>,
      )
    }

    // Show surrounding pages: currentPage - 1 to currentPage + 1
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i === 1 || i === totalPages) continue // Already rendered
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              currentPage === i ? "bg-primary text-white shadow" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      )
    }

    // Show ellipsis if needed (after current range)
    if (currentPage < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis-2">
          <PaginationEllipsis />
        </PaginationItem>,
      )
    }

    // Always show last page (if more than one page)
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink
            onClick={() => setCurrentPage(totalPages)}
            isActive={currentPage === totalPages}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer",
              currentPage === totalPages ? "bg-primary text-white shadow" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      )
    }

    return items
  }

  const fetchUserDetailsOrder = async (id: any) => {
    try {
      const res = await userWithOrderDetails(id)
      console.log(res)
      setSelectedUserData(res)
      setUserDetailsOpen(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch user details",
        variant: "destructive",
      })
    }
  }

  const handleExportClick = async () => {
    if (csvReady) {
      csvLinkRef.current.link.click() // Auto trigger CSV download
      return
    }

    setIsPreparing(true)

    try {
      const params = new URLSearchParams()
      params.append("limit", "1000000")
      params.append("page", "1")
      params.append("paymentStatus", paymentFilter.toString())
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery)
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      params.append("orderType", activeTab)

      const response = await getAllOrderAPI(token, params.toString())

      if (response && Array.isArray(response.orders)) {
        const formatted = response.orders.map((order) => ({
          "Order ID": order?.orderNumber || `#${order._id.toString().slice(-5)}`,
          Date: new Date(order.createdAt).toLocaleDateString(),
          Client: order.store?.storeName || "Unknown",
          Status: order.status,
          "Payment Status": order.paymentStatus,
          Items: order.items.length,
          Total: order.total,
        }))

        setExportData(formatted)
        setCsvReady(true)

        setTimeout(() => {
          csvLinkRef.current.link.click() // Trigger download
          setCsvReady(false)
        }, 500)
      }
    } catch (err) {
      console.error("CSV Export Error:", err)
      toast({
        title: "Error",
        description: "Failed to prepare CSV",
        variant: "destructive",
      })
    } finally {
      setIsPreparing(false)
    }
  }

  const receivedPercentage =
    summary && summary.totalAmount > 0 ? Math.round((summary.totalReceived / summary.totalAmount) * 100) : 0

  const [orderCreditMemos, setOrderCreditMemos] = useState<{ [orderId: string]: number }>({})

  const getCreditMemoCount = (orderId: string) => {
    return orderCreditMemos[orderId] || 0
  }

  const handleOrderNotes = (order: Order) => {
    setSelectedOrderForNotes(order)
    setOrderNotes(order.notes || "")
    setIsNotesDialogOpen(true)
  }

  const handleUpdateNotes = async () => {
    if (!selectedOrderForNotes) return

    setIsUpdatingNotes(true)
    try {
      const updateData = {
        notes: orderNotes,
      }

      const updatedOrder = await updateOrderAPI(
        updateData,
        token,
        selectedOrderForNotes._id || selectedOrderForNotes.id,
      )

      if (updatedOrder) {
        // Update the orders state
        const updatedOrders = orders.map((order) => {
          if (order._id === selectedOrderForNotes._id || order.id === selectedOrderForNotes.id) {
            return { ...order, notes: orderNotes }
          }
          return order
        })
        setOrders(updatedOrders)

        toast({
          title: "Notes Updated",
          description: `Notes for order ${selectedOrderForNotes.id} have been updated successfully`,
        })

        setIsNotesDialogOpen(false)
        setSelectedOrderForNotes(null)
        setOrderNotes("")
      }
    } catch (error) {
      console.error("Error updating notes:", error)
      toast({
        title: "Error",
        description: "Failed to update order notes",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingNotes(false)
    }
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Quick Filters */}
      <OrderQuickFilters 
        activeFilter={quickFilter}
        onFilterChange={handleQuickFilterChange}
        counts={{
          today: 0,
          thisWeek: 0,
          overdue: orderStats.overdueOrders,
          pending: orderStats.pendingOrders,
          delivered: orderStats.deliveredOrders,
        }}
      />

      {/* Bulk Actions */}
      {user.role === "admin" && (
        <OrderBulkActions
          selectedCount={selectedOrders.size}
          onClearSelection={() => setSelectedOrders(new Set())}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkPrint={handleBulkPrint}
          onBulkDelete={handleBulkDelete}
          isProcessing={isProcessingBulk}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Order Status Filter */}
          <select
            value={orderStatusFilter}
            onChange={(e) => {
              setOrderStatusFilter(e.target.value)
              setQuickFilter("all")
            }}
            className="h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Unpaid</option>
          </select>

          {/* Custom Date Range Filters */}
          <DateFilterDialog
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            handleResetDates={handleResetDates}
          />

          <Button size="sm" variant="outline" className="h-10" onClick={fetchOrders} disabled={loading}>
            {loading ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <RefreshCw size={16} className="mr-2" />}
            Refresh
          </Button>
          {user.role === "admin" && (
            <Button size="sm" className="h-10" onClick={handleNewOrder}>
              <Plus size={16} className="mr-2" />
              New Order
            </Button>
          )}
        </div>
      </div>

      {/* Status Stats Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOrderStatusFilter("all")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{orderStats.totalOrders}</p>
              </div>
              <ShoppingBag className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOrderStatusFilter("pending")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{orderStats.pendingOrders}</p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOrderStatusFilter("processing")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Processing</p>
                <p className="text-xl font-bold">{orderStats.processingOrders}</p>
              </div>
              <Package className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOrderStatusFilter("delivered")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="text-xl font-bold">{orderStats.deliveredOrders}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleQuickFilterChange("overdue")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-xl font-bold text-orange-600">{orderStats.overdueOrders}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOrderStatusFilter("cancelled")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Cancelled</p>
                <p className="text-xl font-bold">{orderStats.cancelledOrders}</p>
              </div>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        {/* Total Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary?.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">All time sales</p>
          </CardContent>
        </Card>

        {/* Received Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received Amount</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {summary?.totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{receivedPercentage}% of total</span>
                <span className="text-muted-foreground">
                  $
                  {summary?.totalPending.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  pending
                </span>
              </div>
              <Progress value={receivedPercentage} className="h-1" />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-between items-center border-b">
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 font-medium ${activeTab === "Regural" ? "border-b-2 border-primary text-primary" : "text-gray-500"
              }`}
            onClick={() => {
              setActiveTab("Regural")
              setCurrentPage(1)
            }}
          >
            Regular Orders
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === "NextWeek" ? "border-b-2 border-primary text-primary" : "text-gray-500"
              }`}
            onClick={() => {
              setActiveTab("NextWeek")
              setCurrentPage(1)
            }}
          >
            Next Week Orders
          </button>
        </div>
        <div className="flex gap-2 mb-2">
          <Button size="sm" variant="outline" onClick={() => handleDownloadAllOrders(activeTab)} disabled={loading}>
            <Download size={16} className="mr-2" />
            All Orders
          </Button>

          <button
            onClick={handleExportClick}
            disabled={isPreparing}
            className={`px-4 py-2 rounded text-white text-sm ${isPreparing ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              } transition`}
          >
            {isPreparing ? "Preparing..." : "Download CSV"}
          </button>

          <CSVLink
            data={exportData}
            filename={`orders-${new Date().toISOString()}.csv`}
            className="hidden"
            ref={csvLinkRef}
          />
        </div>
      </div>
      <OrderDetailsModal
        order={selectedOrder}
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        userRole={user.role}
      />
      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {user.role === "admin" && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead className="w-[100px]">
                <button 
                  onClick={() => handleSort("orderNumber")}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Order ID
                  <SortIcon field="orderNumber" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  onClick={() => handleSort("clientName")}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Client
                  <SortIcon field="clientName" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  onClick={() => handleSort("createdAt")}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Date
                  <SortIcon field="createdAt" />
                </button>
              </TableHead>
              <TableHead>
                <button 
                  onClick={() => handleSort("status")}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Status
                  <SortIcon field="status" />
                </button>
              </TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>
                <button 
                  onClick={() => handleSort("total")}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Total
                  <SortIcon field="total" />
                </button>
              </TableHead>
              <TableHead>Overdue</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={user.role === "admin" ? 10 : 9} className="text-center py-10">
                  <RefreshCw size={24} className="animate-spin mx-auto" />
                  <p className="mt-2 text-muted-foreground">Loading orders...</p>
                </TableCell>
              </TableRow>
            ) : sortedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={user.role === "admin" ? 10 : 9} className="text-center py-6 text-muted-foreground">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              sortedOrders.map((order) => {
                const creditMemoCount = getCreditMemoCount(order._id || order.id)
                const overdue = isOrderOverdue(order)
                const orderId = order._id || order.id

                return (
                  <TableRow 
                    key={order.id}
                    className={cn(
                      overdue && "bg-orange-50 hover:bg-orange-100",
                      selectedOrders.has(orderId) && "bg-primary/5"
                    )}
                  >
                    {user.role === "admin" && (
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.has(orderId)}
                          onCheckedChange={(checked) => handleSelectOrder(orderId, !!checked)}
                          aria-label={`Select order ${order.id}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start">
                        <button
                          className="cursor-pointer text-blue-600 underline hover:text-primary hover:underline text-left"
                          onClick={() => {
                            order.clientId && handleViewClientProfile(order.clientId)
                            fetchUserDetailsOrder(order?.store?._id)
                          }}
                        >
                          <div>{order.clientName}</div>
                          {order?.isDelete && (
                            <div className="flex items-center text-red-500 text-xs font-semibold mt-0.5">
                              <Ban className="w-4 h-4 mr-1" />
                              VOIDED
                            </div>
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(order.date)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <div
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs w-fit",
                            getStatusClass(order.status),
                          )}
                        >
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status}</span>
                        </div>

                        {!order?.isDelete && order.status !== "delivered" && (
                          <button
                            onClick={() => {
                              setStatusOrderId(order.orderNumber)
                              setStatusOpen(true)
                              setStatusOrder(order)
                              setOrderIdDB(order?._id || order?.id)
                            }}
                            className="mt-1 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                          >
                            Change Status
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <div
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs w-fit",
                            getStatusClass(order.paymentStatus),
                          )}
                        >
                          {getStatusIcon(order.paymentStatus)}
                          <span className="capitalize">{order.paymentStatus}</span>
                        </div>

                        {!order?.isDelete && (
                          <button
                            onClick={() => {
                              setOrderId(order.orderNumber)
                              setOpen(true)
                              setTotalAmount(order.total)
                              setOrderIdDB(order?._id || order?.id)
                              setpaymentOrder(order)
                            }}
                            className="mt-1 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                          >
                            {order.paymentStatus === "pending" ? "Pay Now" : "Edit"}
                          </button>
                        )}

                        {activeTab === "NextWeek" && (
                          <button
                            onClick={() => handleConvertToRegular(order)}
                            className="mt-1 text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                          >
                            Convert to Regular
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell className="font-medium">
                      {order?.isDelete ? formatCurrency(order?.deleted?.amount) : formatCurrency(order.total)}

                      {/* {formatCurrency(order.total)} */}
                      {order.paymentStatus === "partial" && <p>{formatCurrency(order.paymentAmount - order.total)}</p>}
                    </TableCell>

                    {/* Overdue Indicator Column */}
                    <TableCell>
                      {overdue ? (
                        <div className="flex items-center gap-1 text-orange-600">
                          <AlertTriangle size={14} />
                          <span className="text-xs font-medium">Overdue</span>
                        </div>
                      ) : order.status?.toLowerCase() === "delivered" ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 size={14} />
                          <span className="text-xs">Completed</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">On Track</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                            <FileText size={14} className="mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {order.clientId && (
                            <DropdownMenuItem onClick={() => handleViewClientProfile(order.clientId!)}>
                              <User size={14} className="mr-2" />
                              View Client Profile
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleOrderNotes(order)}>
                            <FileText size={14} className="mr-2" />
                            Order Notes
                          </DropdownMenuItem>
                          {!order?.isDelete && user.role === "admin" && (
                            <DropdownMenuItem onClick={() => handleEdit(order)}>
                              <Edit size={14} className="mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {order?.paymentStatus != "pending" && !order?.isDelete && user.role === "admin" && (
                            <DropdownMenuItem onClick={() => handleUnpaid(order)}>
                              <MoveRight size={14} className="mr-2" />
                              Mark as unpaid
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {/* Credit Memo Section */}
                          {!order?.isDelete && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <CreditCard size={14} className="mr-2" />
                                Credit Memos
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="min-w-[200px]">
                                <DropdownMenuItem onClick={() => handleCreateCreditMemo(order)}>
                                  <Plus size={14} className="mr-2" />
                                  Create New
                                </DropdownMenuItem>
                                {creditMemoCount > 0 && (
                                  <DropdownMenuItem onClick={() => handleViewCreditMemos(order)}>
                                    <Eye size={14} className="mr-2" />
                                    View Existing ({creditMemoCount})
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}

                          {!order?.isDelete && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <FilePlus2 size={14} className="mr-2" />
                                Generate Documents
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="min-w-[220px]">
                                <DropdownMenuItem onClick={() => handleCreateDocument(order, "invoice")}>
                                  <FileSpreadsheet size={14} className="mr-2" />
                                  Invoice
                                </DropdownMenuItem>
                                {(!order.orderType || order.orderType === "Regural") && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleCreateDocument(order, "transport")}>
                                      <Receipt size={14} className="mr-2" />
                                      Transportation Receipt
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCreateDocument(order, "delivery")}>
                                      <ReceiptText size={14} className="mr-2" />
                                      Delivery Note
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCreateDocument(order, "custom")}>
                                      <PencilRuler size={14} className="mr-2" />
                                      Custom Document
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCreateWorkOrder(order)}>
                                      <Wrench className="mr-2 h-4 w-4" /> Create Work Order
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}

                          <DropdownMenuSeparator />

                          {!order?.isDelete && user.role === "admin" && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(order?._id, order?.id)}
                              className="text-red-600 hover:text-red-700 focus:text-red-700"
                            >
                              <Trash size={14} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                          {order?.isDelete && user.role === "admin" && (
                            <DropdownMenuItem
                              onClick={() => handleHardDelete(order?._id, order?.id)}
                              className="text-red-600 hover:text-red-700 focus:text-red-700"
                            >
                              <Trash size={14} className="mr-2" />
                              Delete Permanet
                            </DropdownMenuItem>
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
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-2 bg-white rounded-xl shadow-sm border border-muted">
        {/* Showing Results Text */}
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {orders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </span>{" "}
          to <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, totalOrders)}</span> of{" "}
          <span className="font-medium text-foreground">{totalOrders}</span> orders
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center flex-wrap gap-4">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>

              </SelectContent>
            </Select>
          </div>

          {/* Page Navigation */}
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="cursor-pointer"
                />
              </PaginationItem>

              {renderPaginationItems()}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
                  className="cursor-pointer"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
      {renderInvoiceGenerator()}
      {renderTransportationReceipt()}
      {renderCreditMemoForm()} {/* Added Credit Memo renderer */}
      {selectedOrder && isEditDialogOpen && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl">
            <OrderEditForm
              order={selectedOrder}
              onSubmit={handleSaveOrder}
              onCancel={() => setIsEditDialogOpen(false)}
              onViewClientProfile={() => selectedOrder.clientId && handleViewClientProfile(selectedOrder.clientId)}
            />
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={!!workOrderDialogOrder} onOpenChange={(open) => !open && setWorkOrderDialogOrder(null)}>
        <DialogContent className="max-w-4xl p-0">
          {workOrderDialogOrder && (
            <WorkOrderForm order={workOrderDialogOrder} onClose={() => setWorkOrderDialogOrder(null)} />
          )}
        </DialogContent>
      </Dialog>
      <PaymentStatusPopup
        open={open}
        onOpenChange={setOpen}
        orderId={orderId}
        totalAmount={totalAmount}
        id={orderIdDB}
        fetchOrders={fetchOrders}
        onPayment={onPayment}
        paymentOrder={paymentOrder}
      />
      <StatusUpdatePopup
        open={statusOpen}
        onOpenChange={setStatusOpen}
        orderId={statusOrderId}
        id={orderIdDB}
        fetchOrders={fetchOrders}
        statusOrder={statusOrder}
        setOrders={setOrders}
        orders={orders}
      />
      <UserDetailsModal
        isOpen={userDetailsOpen}
        onClose={() => setUserDetailsOpen(false)}
        userData={selectedUserData}
        fetchUserDetailsOrder={fetchUserDetailsOrder}
      />
      {renderCreditMemoList()}
      {/* Order Notes Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-4">
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <h3 className="text-lg font-semibold">Order Notes</h3>
              <p className="text-sm text-muted-foreground">
                {selectedOrderForNotes ? `Notes for order ${selectedOrderForNotes.id}` : ""}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Enter order notes here..."
                  className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNotesDialogOpen(false)
                    setSelectedOrderForNotes(null)
                    setOrderNotes("")
                  }}
                  disabled={isUpdatingNotes}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleUpdateNotes} disabled={isUpdatingNotes}>
                  {isUpdatingNotes ? (
                    <>
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Notes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const StatusUpdatePopup = ({
  open,
  onOpenChange,
  orderId,
  id,
  fetchOrders,
  statusOrder,
  setOrders,
  orders,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  id: string
  fetchOrders: () => void
  statusOrder: Order | null
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>
  orders: Order[]
}) => {
  const [status, setStatus] = useState(statusOrder?.status || "pending")
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const finalData = {
        status,
      }

      // Call the API to update the status
      const updatedOrder = await updateOrderAPI(finalData, token, id)

      if (updatedOrder) {
        // Find the order in the orders array and update its status
        const updatedOrders = orders.map((order) => {
          if (order._id === id || order.id === id) {
            return { ...order, status }
          }
          return order
        })

        // Update the orders state directly
        setOrders(updatedOrders)

        toast({
          title: "Status Updated",
          description: `Order ${orderId} status has been updated to ${status}`,
        })

        // Close the popup
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-4">
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <h3 className="text-lg font-semibold">Update Order Status</h3>
            <p className="text-sm text-muted-foreground">Change the status for order {orderId}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`border rounded-md p-4 cursor-pointer ${status === "pending" ? "border-primary bg-primary/10" : "border-gray-200"}`}
                  onClick={() => setStatus("pending")}
                >
                  <div className="flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-500 mr-2" />
                    <span className="font-medium">PENDING</span>
                  </div>
                </div>

                <div
                  className={`border rounded-md p-4 cursor-pointer ${status === "delivered" ? "border-primary bg-primary/10" : "border-gray-200"}`}
                  onClick={() => setStatus("delivered")}
                >
                  <div className="flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mr-2" />
                    <span className="font-medium">DELIVERED</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Status</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OrdersTable
