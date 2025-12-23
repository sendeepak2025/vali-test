"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search, Plus, Filter, RefreshCw, Download, MoreVertical, Eye, Edit, Trash2,
  DollarSign, Package, Users, AlertTriangle, CheckCircle, Clock, FileText,
  TrendingUp, TrendingDown, CreditCard, Building2, Phone, Mail, ChevronDown,
  Receipt, FileCheck, ShoppingCart, Calendar, ArrowUpDown, X, BarChart3,
  Banknote, Scale, MessageSquareWarning, PieChart, Settings, Percent, Ban,
  Pause, Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import { getAllVendorsAPI, deleteVendorAPI, updateVendorPaymentTermsAPI, updateVendorStatusAPI } from "@/services2/operations/vendor"
import { getAllInvoicesAPI, createInvoiceAPI, approveInvoiceAPI, disputeInvoiceAPI, matchInvoiceAPI, getMatchingComparisonAPI } from "@/services2/operations/vendorInvoice"
import { getAllVendorCreditMemosAPI, createVendorCreditMemoAPI, approveVendorCreditMemoAPI, applyVendorCreditMemoAPI, voidVendorCreditMemoAPI } from "@/services2/operations/vendorCreditMemo"
import { getAllVendorPaymentsAPI, createVendorPaymentAPI, updateCheckStatusAPI, voidVendorPaymentAPI } from "@/services2/operations/vendorPayment"
import { getAllVendorDisputesAPI, createVendorDisputeAPI, updateDisputeStatusAPI, addDisputeCommunicationAPI, resolveVendorDisputeAPI } from "@/services2/operations/vendorDispute"
import { getAllPurchaseOrdersAPI } from "@/services2/operations/purchaseOrder"
import { vendorWithOrderDetails } from "@/services2/operations/auth"
import { getVendorDashboardAPI, getAgingReportAPI, getVendorStatementAPI, getVendorPerformanceAPI, getVendorComparisonAPI } from "@/services2/operations/vendorReports"
import { PaymentStatusPopup } from "@/components/orders/PaymentUpdateModel"
import DateFilterDialog from "@/components/orders/DateFilterPopup"
import Sidebar from "@/components/layout/Sidebar"
import UserDetailsModal from "@/components/admin/user-details-modal"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"

// Stats Card Component
const StatsCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = "blue", onClick, clickable = false }: any) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
    yellow: "bg-yellow-50 text-yellow-600"
  }

  return (
    <Card 
      className={clickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center mt-2 text-xs ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                {trend === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {trendValue}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color] || colorClasses.blue}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const VendorsEnhanced = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 overflow-auto">
        <VendorManagementContent />
      </div>
    </div>
  )
}

const VendorManagementContent = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  // Tab state
  const [activeTab, setActiveTab] = useState("dashboard")

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  // Vendors state
  const [vendors, setVendors] = useState<any[]>([])
  const [vendorSearch, setVendorSearch] = useState("")
  const [vendorTypeFilter, setVendorTypeFilter] = useState("all")
  const [vendorLoading, setVendorLoading] = useState(false)

  // Purchase Orders state
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [poSearch, setPoSearch] = useState("")
  const [poPaymentFilter, setPoPaymentFilter] = useState("all")
  const [poStatusFilter, setPoStatusFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [poLoading, setPoLoading] = useState(false)
  const [poSummary, setPoSummary] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)

  // Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  // Vendor Details Modal
  const [vendorDetailsOpen, setVendorDetailsOpen] = useState(false)
  const [selectedVendorData, setSelectedVendorData] = useState<any>(null)

  // Sort state
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Payment Terms Modal state
  const [paymentTermsModalOpen, setPaymentTermsModalOpen] = useState(false)
  const [selectedVendorForTerms, setSelectedVendorForTerms] = useState<any>(null)
  const [paymentTermsForm, setPaymentTermsForm] = useState({
    type: "net30",
    customDays: 30,
    earlyPaymentDiscount: {
      percentage: 0,
      withinDays: 10
    }
  })
  const [paymentTermsLoading, setPaymentTermsLoading] = useState(false)

  // Status Modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [selectedVendorForStatus, setSelectedVendorForStatus] = useState<any>(null)
  const [statusForm, setStatusForm] = useState({
    status: "active",
    statusReason: ""
  })
  const [statusLoading, setStatusLoading] = useState(false)

  // Vendor Status Filter
  const [vendorStatusFilter, setVendorStatusFilter] = useState("all")

  // Invoices state
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoiceSearch, setInvoiceSearch] = useState("")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all")
  const [invoiceVendorFilter, setInvoiceVendorFilter] = useState("all")
  const [invoiceLoading, setInvoiceLoading] = useState(false)

  // Invoice Create Modal state
  const [invoiceCreateModalOpen, setInvoiceCreateModalOpen] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    vendorId: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    linkedPurchaseOrders: [] as string[],
    lineItems: [] as any[],
    notes: ""
  })
  const [invoiceCreateLoading, setInvoiceCreateLoading] = useState(false)

  // Three-Way Matching Modal state
  const [matchingModalOpen, setMatchingModalOpen] = useState(false)
  const [selectedInvoiceForMatching, setSelectedInvoiceForMatching] = useState<any>(null)
  const [matchingComparison, setMatchingComparison] = useState<any>(null)
  const [matchingLoading, setMatchingLoading] = useState(false)

  // Credit Memos state
  const [creditMemos, setCreditMemos] = useState<any[]>([])
  const [creditMemoSearch, setCreditMemoSearch] = useState("")
  const [creditMemoStatusFilter, setCreditMemoStatusFilter] = useState("all")
  const [creditMemoTypeFilter, setCreditMemoTypeFilter] = useState("all")
  const [creditMemoVendorFilter, setCreditMemoVendorFilter] = useState("all")
  const [creditMemoLoading, setCreditMemoLoading] = useState(false)

  // Credit Memo Create Modal state
  const [creditMemoCreateModalOpen, setCreditMemoCreateModalOpen] = useState(false)
  const [creditMemoForm, setCreditMemoForm] = useState({
    vendorId: "",
    type: "credit" as "credit" | "debit",
    linkedPurchaseOrder: "",
    linkedInvoice: "",
    reasonCategory: "",
    description: "",
    lineItems: [] as any[],
    notes: ""
  })
  const [creditMemoCreateLoading, setCreditMemoCreateLoading] = useState(false)

  // Credit Memo Apply Modal state
  const [creditMemoApplyModalOpen, setCreditMemoApplyModalOpen] = useState(false)
  const [selectedCreditMemoForApply, setSelectedCreditMemoForApply] = useState<any>(null)
  const [applyAmount, setApplyAmount] = useState("")
  const [applyLoading, setApplyLoading] = useState(false)

  // Payments state
  const [payments, setPayments] = useState<any[]>([])
  const [paymentSearch, setPaymentSearch] = useState("")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all")
  const [paymentVendorFilter, setPaymentVendorFilter] = useState("all")
  const [paymentLoading, setPaymentLoading] = useState(false)

  // Payment Create Modal state
  const [paymentCreateModalOpen, setPaymentCreateModalOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    vendorId: "",
    invoiceIds: [] as string[],
    amount: "",
    method: "check" as "check" | "ach" | "wire" | "cash" | "credit_card",
    checkNumber: "",
    referenceNumber: "",
    appliedCredits: [] as { creditMemoId: string; amount: number }[],
    notes: ""
  })
  const [paymentCreateLoading, setPaymentCreateLoading] = useState(false)

  // Check Status Modal state
  const [checkStatusModalOpen, setCheckStatusModalOpen] = useState(false)
  const [selectedPaymentForCheck, setSelectedPaymentForCheck] = useState<any>(null)
  const [checkStatusForm, setCheckStatusForm] = useState({
    status: "cleared" as "pending" | "cleared" | "bounced",
    clearedDate: "",
    notes: ""
  })
  const [checkStatusLoading, setCheckStatusLoading] = useState(false)

  // Reports state
  const [activeReportTab, setActiveReportTab] = useState("aging")
  const [agingReport, setAgingReport] = useState<any>(null)
  const [agingReportLoading, setAgingReportLoading] = useState(false)
  const [agingVendorFilter, setAgingVendorFilter] = useState("all")
  
  const [vendorStatement, setVendorStatement] = useState<any>(null)
  const [statementLoading, setStatementLoading] = useState(false)
  const [statementVendorId, setStatementVendorId] = useState("")
  const [statementStartDate, setStatementStartDate] = useState("")
  const [statementEndDate, setStatementEndDate] = useState("")

  const [vendorPerformance, setVendorPerformance] = useState<any>(null)
  const [performanceLoading, setPerformanceLoading] = useState(false)
  const [performanceVendorId, setPerformanceVendorId] = useState("")

  const [vendorComparison, setVendorComparison] = useState<any[]>([])
  const [comparisonLoading, setComparisonLoading] = useState(false)

  // Disputes state
  const [disputes, setDisputes] = useState<any[]>([])
  const [disputeSearch, setDisputeSearch] = useState("")
  const [disputeStatusFilter, setDisputeStatusFilter] = useState("all")
  const [disputeTypeFilter, setDisputeTypeFilter] = useState("all")
  const [disputeVendorFilter, setDisputeVendorFilter] = useState("all")
  const [disputeLoading, setDisputeLoading] = useState(false)

  // Dispute Create Modal state
  const [disputeCreateModalOpen, setDisputeCreateModalOpen] = useState(false)
  const [disputeForm, setDisputeForm] = useState({
    vendorId: "",
    type: "pricing" as string,
    linkedPurchaseOrder: "",
    linkedInvoice: "",
    description: "",
    holdInvoices: false
  })
  const [disputeCreateLoading, setDisputeCreateLoading] = useState(false)

  // Dispute Detail Modal state
  const [disputeDetailModalOpen, setDisputeDetailModalOpen] = useState(false)
  const [selectedDispute, setSelectedDispute] = useState<any>(null)
  const [newMessage, setNewMessage] = useState("")
  const [messageLoading, setMessageLoading] = useState(false)

  // Dispute Resolve Modal state
  const [disputeResolveModalOpen, setDisputeResolveModalOpen] = useState(false)
  const [resolveForm, setResolveForm] = useState({
    resolution: "",
    resolutionNotes: "",
    creditMemoAmount: ""
  })
  const [resolveLoading, setResolveLoading] = useState(false)

  // Fetch dashboard data
  const fetchDashboard = async () => {
    setDashboardLoading(true)
    try {
      const data = await getVendorDashboardAPI(token)
      setDashboardData(data)
    } catch (error) {
      console.error("Error fetching dashboard:", error)
    } finally {
      setDashboardLoading(false)
    }
  }

  // Fetch vendors
  const fetchVendors = async () => {
    setVendorLoading(true)
    try {
      const data = await getAllVendorsAPI();
      // console.log(data, "all vendors")
      setVendors(data || [])
    } catch (error) {
      console.error("Error fetching vendors:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch vendors" })
    } finally {
      setVendorLoading(false)
    }
  }

  // Fetch invoices
  const fetchInvoices = async () => {
    setInvoiceLoading(true)
    try {
      const params: any = {}
      if (invoiceStatusFilter !== "all") params.status = invoiceStatusFilter
      if (invoiceVendorFilter !== "all") params.vendorId = invoiceVendorFilter
      if (invoiceSearch) params.search = invoiceSearch
      const data = await getAllInvoicesAPI(params, token)
      setInvoices(data?.invoices || [])
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setInvoiceLoading(false)
    }
  }

  // Fetch credit memos
  const fetchCreditMemos = async () => {
    setCreditMemoLoading(true)
    try {
      const params: any = {}
      if (creditMemoStatusFilter !== "all") params.status = creditMemoStatusFilter
      if (creditMemoTypeFilter !== "all") params.type = creditMemoTypeFilter
      if (creditMemoVendorFilter !== "all") params.vendorId = creditMemoVendorFilter
      if (creditMemoSearch) params.search = creditMemoSearch
      const data = await getAllVendorCreditMemosAPI(params, token)
      setCreditMemos(data?.creditMemos || [])
    } catch (error) {
      console.error("Error fetching credit memos:", error)
    } finally {
      setCreditMemoLoading(false)
    }
  }

  // Fetch payments
  const fetchPayments = async () => {
    setPaymentLoading(true)
    try {
      const params: any = {}
      if (paymentMethodFilter !== "all") params.method = paymentMethodFilter
      if (paymentStatusFilter !== "all") params.status = paymentStatusFilter
      if (paymentVendorFilter !== "all") params.vendorId = paymentVendorFilter
      if (paymentSearch) params.search = paymentSearch
      const data = await getAllVendorPaymentsAPI(params, token)
      setPayments(data?.payments || [])
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setPaymentLoading(false)
    }
  }

  // Fetch aging report
  const fetchAgingReport = async () => {
    setAgingReportLoading(true)
    try {
      const params: any = {}
      if (agingVendorFilter !== "all") params.vendorId = agingVendorFilter
      const data = await getAgingReportAPI(params, token)
      setAgingReport(data)
    } catch (error) {
      console.error("Error fetching aging report:", error)
    } finally {
      setAgingReportLoading(false)
    }
  }

  // Fetch vendor statement
  const fetchVendorStatement = async () => {
    if (!statementVendorId) return
    setStatementLoading(true)
    try {
      const params: any = {}
      if (statementStartDate) params.startDate = statementStartDate
      if (statementEndDate) params.endDate = statementEndDate
      const data = await getVendorStatementAPI(statementVendorId, params, token)
      setVendorStatement(data)
    } catch (error) {
      console.error("Error fetching vendor statement:", error)
    } finally {
      setStatementLoading(false)
    }
  }

  // Fetch vendor performance
  const fetchVendorPerformance = async () => {
    if (!performanceVendorId) return
    setPerformanceLoading(true)
    try {
      const data = await getVendorPerformanceAPI(performanceVendorId, {}, token)
      setVendorPerformance(data)
    } catch (error) {
      console.error("Error fetching vendor performance:", error)
    } finally {
      setPerformanceLoading(false)
    }
  }

  // Fetch vendor comparison
  const fetchVendorComparison = async () => {
    setComparisonLoading(true)
    try {
      const data = await getVendorComparisonAPI({}, token)
      setVendorComparison(data?.vendors || [])
    } catch (error) {
      console.error("Error fetching vendor comparison:", error)
    } finally {
      setComparisonLoading(false)
    }
  }

  // Fetch disputes
  const fetchDisputes = async () => {
    setDisputeLoading(true)
    try {
      const params: any = {}
      if (disputeStatusFilter !== "all") params.status = disputeStatusFilter
      if (disputeTypeFilter !== "all") params.type = disputeTypeFilter
      if (disputeVendorFilter !== "all") params.vendorId = disputeVendorFilter
      if (disputeSearch) params.search = disputeSearch
      const data = await getAllVendorDisputesAPI(params, token)
      console.log(data, "disputed data")
      setDisputes(data?.disputes || [])
    } catch (error) {
      console.error("Error fetching disputes:", error)
    } finally {
      setDisputeLoading(false)
    }
  }

  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    setPoLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", currentPage.toString())
      params.append("limit", pageSize.toString())
      if (poPaymentFilter !== "all") params.append("paymentStatus", poPaymentFilter)
      if (poSearch) params.append("search", poSearch)
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const res = await getAllPurchaseOrdersAPI(params.toString(), token)
      if (res?.orders) {
        const transformed = res.orders.map((order: any) => ({
          ...order,
          id: order._id,
          vendorName: order.vendor?.name || order.vendorId?.name || "",
        }))
        setPurchaseOrders(transformed)
        setPoSummary(res.summary)
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error)
    } finally {
      setPoLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    fetchVendors()
    fetchPurchaseOrders()
    fetchInvoices()
    fetchCreditMemos()
    fetchPayments()
    fetchDisputes()
    
    // Check for credit memo suggestion from quality control
    const creditMemoSuggestionStr = sessionStorage.getItem('creditMemoSuggestion')
    if (creditMemoSuggestionStr) {
      try {
        const suggestion = JSON.parse(creditMemoSuggestionStr)
        // Pre-fill credit memo form
        setCreditMemoForm({
          vendorId: suggestion.vendorId || "",
          type: "credit",
          linkedPurchaseOrder: suggestion.purchaseOrderId || "",
          linkedInvoice: "",
          reasonCategory: "quality_issue",
          description: `Credit for rejected items from PO ${suggestion.purchaseOrderNumber}. Items: ${suggestion.items.map((i: any) => `${i.productName} (${i.quantity} units - ${i.rejectionReason})`).join(', ')}`,
          lineItems: suggestion.items.map((item: any) => ({
            description: `${item.productName} - ${item.rejectionReason}`,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.totalPrice
          })),
          notes: `Auto-generated from quality control rejection`
        })
        // Switch to credits tab and open modal
        setActiveTab("credits")
        setCreditMemoCreateModalOpen(true)
        // Clear the suggestion from storage
        sessionStorage.removeItem('creditMemoSuggestion')
      } catch (e) {
        console.error('Error parsing credit memo suggestion:', e)
        sessionStorage.removeItem('creditMemoSuggestion')
      }
    }
    
    // Check URL params for tab and action
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab')
    const action = urlParams.get('action')
    if (tab) {
      setActiveTab(tab)
    }
    if (action === 'create' && tab === 'credits') {
      setCreditMemoCreateModalOpen(true)
    }
  }, [])

  // Refetch invoices when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices()
    }, 500)
    return () => clearTimeout(timer)
  }, [invoiceSearch, invoiceStatusFilter, invoiceVendorFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchaseOrders()
    }, 500)
    return () => clearTimeout(timer)
  }, [poSearch, poPaymentFilter, startDate, endDate, currentPage])

  // Refetch credit memos when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCreditMemos()
    }, 500)
    return () => clearTimeout(timer)
  }, [creditMemoSearch, creditMemoStatusFilter, creditMemoTypeFilter, creditMemoVendorFilter])

  // Refetch payments when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments()
    }, 500)
    return () => clearTimeout(timer)
  }, [paymentSearch, paymentMethodFilter, paymentStatusFilter, paymentVendorFilter])

  // Refetch disputes when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDisputes()
    }, 500)
    return () => clearTimeout(timer)
  }, [disputeSearch, disputeStatusFilter, disputeTypeFilter, disputeVendorFilter])

  // Filter vendors
  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      vendor.contactName?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      vendor.phone?.includes(vendorSearch)
    const matchesType = vendorTypeFilter === "all" || vendor.type === vendorTypeFilter
    const matchesStatus = vendorStatusFilter === "all" || vendor.status === vendorStatusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  // Filter purchase orders by status
  const filteredPurchaseOrders = purchaseOrders.filter((po) => {
    if (poStatusFilter === "all") return true
    return po.status === poStatusFilter
  })

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // Sorted data
  const sortedPurchaseOrders = [...filteredPurchaseOrders].sort((a, b) => {
    if (!sortField) return 0
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (sortDirection === "asc") return aVal > bVal ? 1 : -1
    return aVal < bVal ? 1 : -1
  })

  // Transform vendor data for details modal
  const transformVendorWithOrders = (data: any) => {
    return {
      _id: data._id,
      totalOrders: data.totalOrders,
      totalSpent: data.totalSpent,
      balanceDue: data.balanceDue,
      totalPay: data.totalPay,
      totalCreditApplied: data.totalCreditApplied || 0,
      paymentTerms: data.paymentTerms,
      orders: data.purchaseOrders?.map((order: any) => ({
        _id: order._id,
        purchaseOrderNumber: order.purchaseOrderNumber,
        purchaseDate: order.purchaseDate,
        deliveryDate: order.deliveryDate,
        dueDate: order.dueDate,
        totalAmount: order.totalAmount,
        total: order.totalAmount,
        paymentStatus: order.paymentStatus,
        paymentDetails: order.paymentDetails,
        paymentAmount: order.paymentAmount,
        totalCreditApplied: order.totalCreditApplied || 0,
        creditAdjustments: order.creditAdjustments || [],
        notes: order.notes,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items?.map((item: any) => ({
          productId: item.productId,
          product: item.productId,
          name: item.productName,
          price: item.totalPrice,
          quantity: item.quantity,
          total: item.totalPrice,
          unitPrice: item.unitPrice,
        })) || [],
      })) || [],
      user: {
        _id: data._id,
        email: data.email || "",
        phone: data.phone || "",
        storeName: data.name || "",
        ownerName: data.contactName || "",
        address: data.address || "",
        businessDescription: data.productsSupplied || "",
        role: "vendor",
        createdAt: data.createdAt,
      },
    }
  }

  const fetchVendorDetails = async (id: string) => {
    try {
      const res = await vendorWithOrderDetails(id)
      const transformed = transformVendorWithOrders(res)
      setSelectedVendorData(transformed)
      setVendorDetailsOpen(true)
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch vendor details" })
    }
  }

  const handlePayment = (order: any) => {
    setSelectedOrder(order)
    setPaymentModalOpen(true)
  }

  const handleResetDates = () => {
    setStartDate("")
    setEndDate("")
  }

  // Open Payment Terms Modal
  const openPaymentTermsModal = (vendor: any) => {
    setSelectedVendorForTerms(vendor)
    setPaymentTermsForm({
      type: vendor.paymentTerms?.type || "net30",
      customDays: vendor.paymentTerms?.customDays || 30,
      earlyPaymentDiscount: {
        percentage: vendor.paymentTerms?.earlyPaymentDiscount?.percentage || 0,
        withinDays: vendor.paymentTerms?.earlyPaymentDiscount?.withinDays || 10
      }
    })
    setPaymentTermsModalOpen(true)
  }

  // Save Payment Terms
  const handleSavePaymentTerms = async () => {
    if (!selectedVendorForTerms) return
    setPaymentTermsLoading(true)
    try {
      const data: any = {
        type: paymentTermsForm.type,
      }
      if (paymentTermsForm.type === "custom") {
        data.customDays = paymentTermsForm.customDays
      }
      if (paymentTermsForm.earlyPaymentDiscount.percentage > 0) {
        data.earlyPaymentDiscount = paymentTermsForm.earlyPaymentDiscount
      }
      const result = await updateVendorPaymentTermsAPI(selectedVendorForTerms._id, data, token)
      if (result) {
        setPaymentTermsModalOpen(false)
        fetchVendors()
      }
    } catch (error) {
      console.error("Error updating payment terms:", error)
    } finally {
      setPaymentTermsLoading(false)
    }
  }

  // Open Status Modal
  const openStatusModal = (vendor: any) => {
    setSelectedVendorForStatus(vendor)
    setStatusForm({
      status: vendor.status || "active",
      statusReason: vendor.statusReason || ""
    })
    setStatusModalOpen(true)
  }

  // Save Status
  const handleSaveStatus = async () => {
    if (!selectedVendorForStatus) return
    if (statusForm.status !== "active" && !statusForm.statusReason.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please provide a reason for the status change" })
      return
    }
    setStatusLoading(true)
    try {
      const result = await updateVendorStatusAPI(selectedVendorForStatus._id, statusForm, token)
      if (result) {
        setStatusModalOpen(false)
        fetchVendors()
      }
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setStatusLoading(false)
    }
  }

  // Get payment terms display text
  const getPaymentTermsDisplay = (vendor: any) => {
    const terms = vendor.paymentTerms
    if (!terms?.type) return "Not Set"
    const typeLabels: Record<string, string> = {
      cod: "COD",
      net15: "Net 15",
      net30: "Net 30",
      net45: "Net 45",
      net60: "Net 60",
      custom: `Net ${terms.customDays || 0}`
    }
    let display = typeLabels[terms.type] || terms.type
    if (terms.earlyPaymentDiscount?.percentage > 0) {
      display += ` (${terms.earlyPaymentDiscount.percentage}%/${terms.earlyPaymentDiscount.withinDays}d)`
    }
    return display
  }

  // Get vendor status badge
  const getVendorStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      active: { variant: "success", icon: CheckCircle, label: "Active" },
      inactive: { variant: "secondary", icon: Ban, label: "Inactive" },
      on_hold: { variant: "warning", icon: Pause, label: "On Hold" },
      blacklisted: { variant: "destructive", icon: AlertTriangle, label: "Blacklisted" }
    }
    const config = variants[status] || variants.active
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  // Get invoice status badge
  const getInvoiceStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: "outline", label: "Draft" },
      pending: { variant: "warning", label: "Pending" },
      matched: { variant: "secondary", label: "Matched" },
      approved: { variant: "success", label: "Approved" },
      disputed: { variant: "destructive", label: "Disputed" },
      paid: { variant: "success", label: "Paid" },
      partially_paid: { variant: "secondary", label: "Partial" },
      cancelled: { variant: "outline", label: "Cancelled" }
    }
    const config = variants[status] || variants.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Get matching status badge
  const getMatchingStatusBadge = (matchingStatus: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      not_matched: { variant: "outline", label: "Not Matched" },
      matched: { variant: "success", label: "Matched" },
      discrepancy: { variant: "destructive", label: "Discrepancy" },
      partial_match: { variant: "warning", label: "Partial Match" }
    }
    const config = variants[matchingStatus] || variants.not_matched
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Open invoice create modal
  const openInvoiceCreateModal = () => {
    setInvoiceForm({
      vendorId: "",
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: "",
      linkedPurchaseOrders: [],
      lineItems: [],
      notes: ""
    })
    setInvoiceCreateModalOpen(true)
  }

  // Handle create invoice
  const handleCreateInvoice = async () => {
    if (!invoiceForm.vendorId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a vendor" })
      return
    }
    setInvoiceCreateLoading(true)
    try {
      const result = await createInvoiceAPI(invoiceForm, token)
      if (result) {
        setInvoiceCreateModalOpen(false)
        fetchInvoices()
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error creating invoice:", error)
    } finally {
      setInvoiceCreateLoading(false)
    }
  }

  // Open matching modal
  const openMatchingModal = async (invoice: any) => {
    setSelectedInvoiceForMatching(invoice)
    setMatchingModalOpen(true)
    setMatchingLoading(true)
    try {
      const comparison = await getMatchingComparisonAPI(invoice._id, token)
      setMatchingComparison(comparison)
    } catch (error) {
      console.error("Error fetching matching comparison:", error)
    } finally {
      setMatchingLoading(false)
    }
  }

  // Handle approve invoice
  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      const result = await approveInvoiceAPI(invoiceId, {}, token)
      if (result) {
        fetchInvoices()
        fetchDashboard()
        setMatchingModalOpen(false)
      }
    } catch (error) {
      console.error("Error approving invoice:", error)
    }
  }

  // Handle dispute invoice
  const handleDisputeInvoice = async (invoiceId: string, reason: string) => {
    try {
      const result = await disputeInvoiceAPI(invoiceId, { reason }, token)
      if (result) {
        fetchInvoices()
        fetchDashboard()
        setMatchingModalOpen(false)
      }
    } catch (error) {
      console.error("Error disputing invoice:", error)
    }
  }

  // Handle run matching
  const handleRunMatching = async (invoiceId: string) => {
    setMatchingLoading(true)
    try {
      const result = await matchInvoiceAPI(invoiceId, {}, token)
      if (result) {
        const comparison = await getMatchingComparisonAPI(invoiceId, token)
        setMatchingComparison(comparison)
        fetchInvoices()
      }
    } catch (error) {
      console.error("Error running matching:", error)
    } finally {
      setMatchingLoading(false)
    }
  }

  // Open credit memo create modal
  const openCreditMemoCreateModal = () => {
    setCreditMemoForm({
      vendorId: "",
      type: "credit",
      linkedPurchaseOrder: "",
      linkedInvoice: "",
      reasonCategory: "",
      description: "",
      lineItems: [],
      notes: ""
    })
    setCreditMemoCreateModalOpen(true)
  }

  // Handle create credit memo
  const handleCreateCreditMemo = async () => {
    if (!creditMemoForm.vendorId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a vendor" })
      return
    }
    if (!creditMemoForm.reasonCategory) {
      toast({ variant: "destructive", title: "Error", description: "Please select a reason category" })
      return
    }
    setCreditMemoCreateLoading(true)
    try {
      const result = await createVendorCreditMemoAPI(creditMemoForm, token)
      if (result) {
        setCreditMemoCreateModalOpen(false)
        fetchCreditMemos()
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error creating credit memo:", error)
    } finally {
      setCreditMemoCreateLoading(false)
    }
  }

  // Handle approve credit memo
  const handleApproveCreditMemo = async (memoId: string) => {
    try {
      const result = await approveVendorCreditMemoAPI(memoId, {}, token)
      if (result) {
        fetchCreditMemos()
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error approving credit memo:", error)
    }
  }

  // Open apply credit memo modal
  const openApplyCreditMemoModal = (memo: any) => {
    setSelectedCreditMemoForApply(memo)
    setApplyAmount(memo.remainingAmount?.toString() || memo.totalAmount?.toString() || "")
    setCreditMemoApplyModalOpen(true)
  }

  // Handle apply credit memo
  const handleApplyCreditMemo = async () => {
    if (!selectedCreditMemoForApply || !applyAmount) return
    setApplyLoading(true)
    try {
      const result = await applyVendorCreditMemoAPI(selectedCreditMemoForApply._id, { 
        amount: parseFloat(applyAmount) 
      }, token)
      if (result) {
        setCreditMemoApplyModalOpen(false)
        fetchCreditMemos()
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error applying credit memo:", error)
    } finally {
      setApplyLoading(false)
    }
  }

  // Handle void credit memo
  const handleVoidCreditMemo = async (memoId: string) => {
    if (!confirm("Are you sure you want to void this credit memo?")) return
    try {
      const result = await voidVendorCreditMemoAPI(memoId, { reason: "Voided by user" }, token)
      if (result) {
        fetchCreditMemos()
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error voiding credit memo:", error)
    }
  }

  // Get credit memo status badge
  const getCreditMemoStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: "outline", label: "Draft" },
      pending_approval: { variant: "warning", label: "Pending Approval" },
      approved: { variant: "success", label: "Approved" },
      partially_applied: { variant: "secondary", label: "Partially Applied" },
      applied: { variant: "success", label: "Applied" },
      voided: { variant: "destructive", label: "Voided" }
    }
    const config = variants[status] || variants.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Get credit memo type badge
  const getCreditMemoTypeBadge = (type: string) => {
    if (type === "credit") {
      return <Badge variant="success" className="bg-green-100 text-green-700">Credit</Badge>
    }
    return <Badge variant="destructive" className="bg-red-100 text-red-700">Debit</Badge>
  }

  // Filter credit memos
  const filteredCreditMemos = creditMemos.filter((memo) => {
    const matchesSearch = 
      memo.memoNumber?.toLowerCase().includes(creditMemoSearch.toLowerCase()) ||
      memo.vendorId?.name?.toLowerCase().includes(creditMemoSearch.toLowerCase())
    return matchesSearch
  })

  // Reason categories for credit memos (including produce-specific)
  const reasonCategories = [
    { value: "quality_issue", label: "Quality Issue" },
    { value: "quantity_discrepancy", label: "Quantity Discrepancy" },
    { value: "price_adjustment", label: "Price Adjustment" },
    { value: "return", label: "Return" },
    { value: "spoilage", label: "Spoilage (Produce)" },
    { value: "bruising", label: "Bruising (Produce)" },
    { value: "size_variance", label: "Size Variance (Produce)" },
    { value: "temperature_damage", label: "Temperature Damage (Produce)" },
    { value: "pest_damage", label: "Pest Damage (Produce)" },
    { value: "ripeness_issues", label: "Ripeness Issues (Produce)" },
    { value: "weight_variance", label: "Weight Variance (Produce)" },
    { value: "other", label: "Other" }
  ]

  // Open payment create modal
  const openPaymentCreateModal = () => {
    setPaymentForm({
      vendorId: "",
      invoiceIds: [],
      amount: "",
      method: "check",
      checkNumber: "",
      referenceNumber: "",
      appliedCredits: [],
      notes: ""
    })
    setPaymentCreateModalOpen(true)
  }

  // Handle create payment
  const handleCreatePayment = async () => {
    if (!paymentForm.vendorId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a vendor" })
      return
    }
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a valid amount" })
      return
    }
    setPaymentCreateLoading(true)
    try {
      const result = await createVendorPaymentAPI({
        ...paymentForm,
        amount: parseFloat(paymentForm.amount)
      }, token)
      if (result) {
        setPaymentCreateModalOpen(false)
        fetchPayments()
        fetchInvoices()
        fetchCreditMemos()
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error creating payment:", error)
    } finally {
      setPaymentCreateLoading(false)
    }
  }

  // Open check status modal
  const openCheckStatusModal = (payment: any) => {
    setSelectedPaymentForCheck(payment)
    setCheckStatusForm({
      status: payment.checkStatus || "pending",
      clearedDate: payment.checkClearedDate ? new Date(payment.checkClearedDate).toISOString().split('T')[0] : "",
      notes: ""
    })
    setCheckStatusModalOpen(true)
  }

  // Handle update check status
  const handleUpdateCheckStatus = async () => {
    if (!selectedPaymentForCheck) return
    setCheckStatusLoading(true)
    try {
      const result = await updateCheckStatusAPI(selectedPaymentForCheck._id, checkStatusForm, token)
      if (result) {
        setCheckStatusModalOpen(false)
        fetchPayments()
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error updating check status:", error)
    } finally {
      setCheckStatusLoading(false)
    }
  }

  // Handle void payment
  const handleVoidPayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to void this payment? This will reverse all applied amounts.")) return
    try {
      const result = await voidVendorPaymentAPI(paymentId, { reason: "Voided by user" }, token)
      if (result) {
        fetchPayments()
        fetchInvoices()
        fetchCreditMemos()
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error voiding payment:", error)
    }
  }

  // Get payment method badge
  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      check: { variant: "outline", label: "Check" },
      ach: { variant: "secondary", label: "ACH" },
      wire: { variant: "secondary", label: "Wire" },
      cash: { variant: "outline", label: "Cash" },
      credit_card: { variant: "outline", label: "Credit Card" }
    }
    const config = variants[method] || variants.check
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Get check status badge
  const getCheckStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: "warning", label: "Pending" },
      cleared: { variant: "success", label: "Cleared" },
      bounced: { variant: "destructive", label: "Bounced" }
    }
    const config = variants[status] || variants.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Get vendor payment status badge
  const getVendorPaymentStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      completed: { variant: "success", label: "Completed" },
      pending: { variant: "warning", label: "Pending" },
      voided: { variant: "destructive", label: "Voided" }
    }
    const config = variants[status] || variants.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = 
      payment.paymentNumber?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      payment.vendorId?.name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      payment.checkNumber?.toLowerCase().includes(paymentSearch.toLowerCase())
    return matchesSearch
  })

  // Get available invoices for payment (unpaid/partially paid for selected vendor)
  const getAvailableInvoicesForPayment = () => {
    return invoices.filter(inv => 
      (paymentForm.vendorId ? inv.vendorId?._id === paymentForm.vendorId : true) &&
      (inv.status === 'approved' || inv.status === 'partially_paid') &&
      (inv.remainingAmount > 0 || inv.totalAmount > (inv.paidAmount || 0))
    )
  }

  // Get available credits for payment (approved/partially applied for selected vendor)
  const getAvailableCreditsForPayment = () => {
    return creditMemos.filter(memo => 
      (paymentForm.vendorId ? memo.vendorId?._id === paymentForm.vendorId : true) &&
      memo.type === 'credit' &&
      (memo.status === 'approved' || memo.status === 'partially_applied') &&
      (memo.remainingAmount > 0)
    )
  }

  // Open dispute create modal
  const openDisputeCreateModal = () => {
    setDisputeForm({
      vendorId: "",
      type: "pricing",
      linkedPurchaseOrder: "",
      linkedInvoice: "",
      description: "",
      holdInvoices: false
    })
    setDisputeCreateModalOpen(true)
  }

  // Handle create dispute
  const handleCreateDispute = async () => {
    if (!disputeForm.vendorId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a vendor" })
      return
    }
    if (!disputeForm.description) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a description" })
      return
    }
    setDisputeCreateLoading(true)
    try {
      const result = await createVendorDisputeAPI(disputeForm, token)
      if (result) {
        setDisputeCreateModalOpen(false)
        fetchDisputes()
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error creating dispute:", error)
    } finally {
      setDisputeCreateLoading(false)
    }
  }

  // Open dispute detail modal
  const openDisputeDetailModal = (dispute: any) => {
    setSelectedDispute(dispute)
    setNewMessage("")
    setDisputeDetailModalOpen(true)
  }

  // Handle add message
  const handleAddMessage = async () => {
    if (!selectedDispute || !newMessage.trim()) return
    setMessageLoading(true)
    try {
      const result = await addDisputeCommunicationAPI(selectedDispute._id, { 
        message: newMessage,
        direction: 'internal'
      }, token)
      if (result) {
        setNewMessage("")
        // Refresh the dispute to get updated communications
        const updatedDisputes = await getAllVendorDisputesAPI({}, token)
        setDisputes(updatedDisputes?.disputes || [])
        const updated = updatedDisputes?.disputes?.find((d: any) => d._id === selectedDispute._id)
        if (updated) setSelectedDispute(updated)
      }
    } catch (error) {
      console.error("Error adding message:", error)
    } finally {
      setMessageLoading(false)
    }
  }

  // Open resolve modal
  const openResolveModal = (dispute: any) => {
    setSelectedDispute(dispute)
    setResolveForm({
      resolution: "",
      resolutionNotes: "",
      creditMemoAmount: ""
    })
    setDisputeResolveModalOpen(true)
  }

  // Handle resolve dispute
  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolveForm.resolution) {
      toast({ variant: "destructive", title: "Error", description: "Please select a resolution" })
      return
    }
    setResolveLoading(true)
    try {
      const data: any = {
        resolution: resolveForm.resolution,
        resolutionNotes: resolveForm.resolutionNotes
      }
      if (resolveForm.creditMemoAmount) {
        data.creditMemoAmount = parseFloat(resolveForm.creditMemoAmount)
      }
      const result = await resolveVendorDisputeAPI(selectedDispute._id, data, token)
      if (result) {
        setDisputeResolveModalOpen(false)
        setDisputeDetailModalOpen(false)
        fetchDisputes()
        fetchCreditMemos()
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error resolving dispute:", error)
    } finally {
      setResolveLoading(false)
    }
  }

  // Handle update dispute status
  const handleUpdateDisputeStatus = async (disputeId: string, status: string) => {
    try {
      const result = await updateDisputeStatusAPI(disputeId, { status }, token)
      if (result) {
        fetchDisputes()
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error updating dispute status:", error)
    }
  }

  // Get dispute status badge
  const getDisputeStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      open: { variant: "warning", label: "Open" },
      in_progress: { variant: "secondary", label: "In Progress" },
      pending_vendor: { variant: "outline", label: "Pending Vendor" },
      escalated: { variant: "destructive", label: "Escalated" },
      resolved: { variant: "success", label: "Resolved" },
      closed: { variant: "outline", label: "Closed" }
    }
    const config = variants[status] || variants.open
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Get dispute type badge
  const getDisputeTypeBadge = (type: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pricing: { variant: "outline", label: "Pricing" },
      quality: { variant: "secondary", label: "Quality" },
      quantity: { variant: "secondary", label: "Quantity" },
      delivery: { variant: "outline", label: "Delivery" },
      invoice: { variant: "outline", label: "Invoice" },
      other: { variant: "outline", label: "Other" }
    }
    const config = variants[type] || variants.other
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Filter disputes
  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch = 
      dispute.disputeNumber?.toLowerCase().includes(disputeSearch.toLowerCase()) ||
      dispute.vendorId?.name?.toLowerCase().includes(disputeSearch.toLowerCase())
    return matchesSearch
  })

  // Dispute types
  const disputeTypes = [
    { value: "pricing", label: "Pricing Discrepancy" },
    { value: "quality", label: "Quality Issue" },
    { value: "quantity", label: "Quantity Discrepancy" },
    { value: "delivery", label: "Delivery Issue" },
    { value: "invoice", label: "Invoice Error" },
    { value: "other", label: "Other" }
  ]

  // Resolution options
  const resolutionOptions = [
    { value: "credit_issued", label: "Credit Memo Issued" },
    { value: "price_adjusted", label: "Price Adjusted" },
    { value: "replacement_sent", label: "Replacement Sent" },
    { value: "vendor_accepted", label: "Vendor Accepted Claim" },
    { value: "claim_withdrawn", label: "Claim Withdrawn" },
    { value: "no_action", label: "No Action Required" }
  ]

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoiceNumber?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      invoice.vendorId?.name?.toLowerCase().includes(invoiceSearch.toLowerCase())
    return matchesSearch
  })

  // Calculate vendor stats
  const vendorStats = {
    total: vendors.length,
    farmers: vendors.filter((v) => v.type === "farmer").length,
    suppliers: vendors.filter((v) => v.type === "supplier").length,
    distributors: vendors.filter((v) => v.type === "distributor").length,
  }

  // Payment status badge
  const getPaymentBadge = (status: string) => {
    const variants: any = {
      paid: { variant: "success", icon: CheckCircle, label: "Paid" },
      pending: { variant: "warning", icon: Clock, label: "Pending" },
      partial: { variant: "secondary", icon: DollarSign, label: "Partial" },
    }
    const config = variants[status] || variants.pending
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  // Status badge
  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: { variant: "outline", label: "Pending" },
      received: { variant: "secondary", label: "Received" },
      "quality-check": { variant: "warning", label: "Quality Check" },
      approved: { variant: "success", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    }
    const config = variants[status] || variants.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const receivedPercentage = poSummary?.totalAmount > 0
    ? Math.round((poSummary.totalPaid / poSummary.totalAmount) * 100)
    : 0

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Management</h1>
          <p className="text-muted-foreground">Manage vendors, purchases, payments & quality control</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/vendors/new-vendor")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
          <Button onClick={() => navigate("/vendors/new-purchase")}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Vendors"
          value={vendorStats.total}
          subtitle={`${vendorStats.farmers} farmers, ${vendorStats.suppliers} suppliers`}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Total Purchases"
          value={formatCurrency(poSummary?.totalAmount || 0)}
          subtitle={`${poSummary?.totalOrders || 0} orders`}
          icon={Package}
          color="purple"
        />
        <StatsCard
          title="Amount Paid"
          value={formatCurrency(poSummary?.totalPaid || 0)}
          subtitle={`${receivedPercentage}% of total`}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Pending Payment"
          value={formatCurrency(poSummary?.totalPending || 0)}
          subtitle="Outstanding balance"
          icon={AlertTriangle}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Vendors ({vendors.length})
          </TabsTrigger>
          <TabsTrigger value="purchases" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Purchase Orders ({purchaseOrders.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Vendor Bills
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Vendor Credits
          </TabsTrigger>
          <TabsTrigger value="disputes" className="flex items-center gap-2">
            <MessageSquareWarning className="h-4 w-4" />
            Disputes
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Main KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Billed"
              value={formatCurrency(dashboardData?.invoices?.totalAmount || 0)}
              subtitle={`${dashboardData?.invoices?.totalInvoices || 0} vendor bills`}
              icon={Receipt}
              color="blue"
              clickable
              onClick={() => setActiveTab("invoices")}
            />
            <StatsCard
              title="Total Paid"
              value={formatCurrency(dashboardData?.invoices?.totalPaid || 0)}
              subtitle={dashboardData?.invoices?.totalAmount > 0 
                ? `${Math.round((dashboardData.invoices.totalPaid / dashboardData.invoices.totalAmount) * 100)}% of total`
                : "0% of total"}
              icon={CheckCircle}
              color="green"
              clickable
              onClick={() => setActiveTab("payments")}
            />
            <StatsCard
              title="Outstanding Balance"
              value={formatCurrency(dashboardData?.invoices?.totalOutstanding || 0)}
              subtitle="Unpaid invoices"
              icon={DollarSign}
              color="purple"
              clickable
              onClick={() => setActiveTab("invoices")}
            />
            <StatsCard
              title="Overdue Amount"
              value={formatCurrency(dashboardData?.overdue?.totalAmount || 0)}
              subtitle={`${dashboardData?.overdue?.count || 0} overdue invoices`}
              icon={AlertTriangle}
              color="red"
              clickable
              onClick={() => setActiveTab("reports")}
            />
          </div>

          {/* Secondary Stats Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Active Vendors"
              value={dashboardData?.vendors?.total || vendors.length}
              subtitle={`${dashboardData?.vendors?.byStatus?.active || 0} active`}
              icon={Users}
              color="blue"
              clickable
              onClick={() => setActiveTab("vendors")}
            />
            <StatsCard
              title="Open Disputes"
              value={dashboardData?.openDisputes || 0}
              subtitle="Requires attention"
              icon={MessageSquareWarning}
              color={dashboardData?.openDisputes > 0 ? "orange" : "green"}
              clickable
              onClick={() => setActiveTab("disputes")}
            />
            <StatsCard
              title="Pending Checks"
              value={dashboardData?.pendingChecks?.count || 0}
              subtitle={formatCurrency(dashboardData?.pendingChecks?.totalAmount || 0)}
              icon={CreditCard}
              color="yellow"
              clickable
              onClick={() => setActiveTab("payments")}
            />
            <StatsCard
              title="Purchase Orders"
              value={dashboardData?.purchaseOrders?.total || purchaseOrders.length}
              subtitle={`${poSummary?.totalOrders || 0} this period`}
              icon={ShoppingCart}
              color="purple"
              clickable
              onClick={() => setActiveTab("purchases")}
            />
          </div>

          {/* Payment Progress & Top Vendors */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Payment Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Progress</CardTitle>
                <CardDescription>Overall payment status across all invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Paid</span>
                    <span className="font-medium">
                      {dashboardData?.invoices?.totalAmount > 0 
                        ? `${Math.round((dashboardData.invoices.totalPaid / dashboardData.invoices.totalAmount) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                  <Progress 
                    value={dashboardData?.invoices?.totalAmount > 0 
                      ? (dashboardData.invoices.totalPaid / dashboardData.invoices.totalAmount) * 100
                      : 0} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Paid: {formatCurrency(dashboardData?.invoices?.totalPaid || 0)}</span>
                    <span>Outstanding: {formatCurrency(dashboardData?.invoices?.totalOutstanding || 0)}</span>
                  </div>
                </div>

                {/* PO Status Breakdown */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Purchase Order Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(dashboardData?.purchaseOrders?.byStatus || {}).map(([status, data]: [string, any]) => (
                      <div key={status} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="text-xs capitalize">{status.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className="text-xs">{data?.count || 0}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Vendors by Outstanding */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Vendors by Outstanding</CardTitle>
                <CardDescription>Vendors with highest unpaid balances</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.topVendorsByOutstanding?.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.topVendorsByOutstanding.map((vendor: any, index: number) => (
                      <div key={vendor.vendorId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                            ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                              index === 1 ? 'bg-gray-100 text-gray-700' : 
                              index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                            {index + 1}
                          </div>
                          <span className="font-medium">{vendor.vendorName}</span>
                        </div>
                        <span className="font-semibold text-red-600">{formatCurrency(vendor.outstanding)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No outstanding balances</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate("/vendors/new-vendor")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vendor
                </Button>
                <Button variant="outline" onClick={() => navigate("/vendors/new-purchase")}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  New Purchase
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("invoices")}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("payments")}>
                  <Banknote className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("reports")}>
                  <PieChart className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
                <Button variant="ghost" size="icon" onClick={fetchDashboard} disabled={dashboardLoading}>
                  <RefreshCw className={`h-4 w-4 ${dashboardLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={vendorTypeFilter} onValueChange={setVendorTypeFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="farmer">Farmers</SelectItem>
                      <SelectItem value="supplier">Suppliers</SelectItem>
                      <SelectItem value="distributor">Distributors</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={vendorStatusFilter} onValueChange={setVendorStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchVendors} disabled={vendorLoading}>
                    <RefreshCw className={`h-4 w-4 ${vendorLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No vendors found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendors.map((vendor) => (
                      <TableRow key={vendor._id} className={vendor.isBelowThreshold ? "bg-red-50/50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="font-medium text-blue-600 hover:underline cursor-pointer"
                              onClick={() => fetchVendorDetails(vendor._id)}
                            >
                              {vendor.name}
                            </div>
                            {vendor.isBelowThreshold && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Low Performance
                              </Badge>
                            )}
                          </div>
                          {vendor.email && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {vendor.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {vendor.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div 
                            className="cursor-pointer"
                            onClick={() => openStatusModal(vendor)}
                          >
                            {getVendorStatusBadge(vendor.status || "active")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                            onClick={() => openPaymentTermsModal(vendor)}
                          >
                            <span className="text-sm">{getPaymentTermsDisplay(vendor)}</span>
                            <Settings className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{vendor.contactName}</div>
                          {vendor.phone && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {vendor.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => fetchVendorDetails(vendor._id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/vendors/edit/${vendor._id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Vendor
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openPaymentTermsModal(vendor)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Payment Terms
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openStatusModal(vendor)}>
                                <Activity className="h-4 w-4 mr-2" />
                                Change Status
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={async () => {
                                  if (confirm("Are you sure you want to delete this vendor?")) {
                                    await deleteVendorAPI(vendor._id, token)
                                    fetchVendors()
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={poSearch}
                    onChange={(e) => setPoSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={poPaymentFilter} onValueChange={setPoPaymentFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Payment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={poStatusFilter} onValueChange={setPoStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="quality-check">Quality Check</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <DateFilterDialog
                    startDate={startDate}
                    endDate={endDate}
                    setStartDate={setStartDate}
                    setEndDate={setEndDate}
                    handleResetDates={handleResetDates}
                  />
                  <Button variant="outline" size="icon" onClick={fetchPurchaseOrders} disabled={poLoading}>
                    <RefreshCw className={`h-4 w-4 ${poLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Payment Progress */}
              {poSummary && (
                <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Payment Progress</span>
                    <span>{receivedPercentage}% paid</span>
                  </div>
                  <Progress value={receivedPercentage} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Paid: {formatCurrency(poSummary.totalPaid)}</span>
                    <span>Pending: {formatCurrency(poSummary.totalPending)}</span>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("purchaseDate")}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("totalAmount")}
                    >
                      <div className="flex items-center gap-1">
                        Amount
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPurchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No purchase orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedPurchaseOrders.map((po) => (
                      <TableRow key={po._id}>
                        <TableCell className="font-medium">{po.purchaseOrderNumber}</TableCell>
                        <TableCell>{po.vendor?.name || po.vendorName}</TableCell>
                        <TableCell>
                          {new Date(po.purchaseDate).toLocaleDateString("en-US", {
                            timeZone: "UTC",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <div>{formatCurrency(po.totalAmount)}</div>
                          {po.paymentStatus === "partial" && po.paymentAmount && (
                            <div className="text-xs text-muted-foreground">
                              Paid: {formatCurrency(po.paymentAmount)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(po.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getPaymentBadge(po.paymentStatus)}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-6"
                              onClick={() => handlePayment(po)}
                            >
                              {po.paymentStatus === "pending" ? "Pay Now" : "Edit Payment"}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/vendors/purchase/${po._id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/vendors/edit-purchase/${po._id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Purchase
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/vendors/quality-control/${po._id}`)}>
                                <FileCheck className="h-4 w-4 mr-2" />
                                Quality Control
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handlePayment(po)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Record Payment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Bills Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {/* Bill Stats */}
          {(() => {
            const overdueInvoices = invoices.filter(inv => 
              inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'paid'
            );
            const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || inv.totalAmount || 0), 0);
            const pendingInvoices = invoices.filter(inv => inv.status === 'pending' || inv.status === 'approved');
            const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || inv.totalAmount || 0), 0);
            
            return (
              <div className="grid gap-4 md:grid-cols-4">
                <StatsCard
                  title="Total Bills"
                  value={invoices.length}
                  subtitle="All vendor bills"
                  icon={Receipt}
                  color="blue"
                />
                <StatsCard
                  title="Pending Payment"
                  value={formatCurrency(pendingAmount)}
                  subtitle={`${pendingInvoices.length} bills`}
                  icon={Clock}
                  color="yellow"
                />
                <StatsCard
                  title="Overdue"
                  value={formatCurrency(overdueAmount)}
                  subtitle={`${overdueInvoices.length} bills overdue`}
                  icon={AlertTriangle}
                  color={overdueInvoices.length > 0 ? "red" : "green"}
                />
                <StatsCard
                  title="Paid This Month"
                  value={invoices.filter(inv => inv.status === 'paid').length}
                  subtitle="Completed"
                  icon={CheckCircle}
                  color="green"
                />
              </div>
            );
          })()}
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendor bills..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={invoiceVendorFilter} onValueChange={setInvoiceVendorFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="matched">Matched</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="disputed">Disputed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchInvoices} disabled={invoiceLoading}>
                    <RefreshCw className={`h-4 w-4 ${invoiceLoading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button onClick={openInvoiceCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Bill
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Matching</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No vendor bills found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => {
                      const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid';
                      const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                      
                      return (
                      <TableRow key={invoice._id} className={isOverdue ? "bg-red-50/50" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {invoice.invoiceNumber}
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {daysOverdue}d overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{invoice.vendorId?.name || "-"}</TableCell>
                        <TableCell>
                          {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-US", {
                            timeZone: "UTC",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className={isOverdue ? "text-red-600 font-medium" : ""}>
                            {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-US", {
                              timeZone: "UTC",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }) : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{formatCurrency(invoice.totalAmount || 0)}</div>
                          {invoice.remainingAmount > 0 && invoice.remainingAmount !== invoice.totalAmount && (
                            <div className="text-xs text-muted-foreground">
                              Due: {formatCurrency(invoice.remainingAmount)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                        <TableCell>{getMatchingStatusBadge(invoice.matchingStatus || 'not_matched')}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openMatchingModal(invoice)}>
                                <FileCheck className="h-4 w-4 mr-2" />
                                Three-Way Match
                              </DropdownMenuItem>
                              {invoice.status === 'pending' && (
                                <DropdownMenuItem onClick={() => handleApproveInvoice(invoice._id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {invoice.status !== 'disputed' && invoice.status !== 'paid' && (
                                <DropdownMenuItem onClick={() => handleDisputeInvoice(invoice._id, "Discrepancy found")}>
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Dispute
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )})
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search payments..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={paymentVendorFilter} onValueChange={setPaymentVendorFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="ach">ACH</SelectItem>
                      <SelectItem value="wire">Wire</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="voided">Voided</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchPayments} disabled={paymentLoading}>
                    <RefreshCw className={`h-4 w-4 ${paymentLoading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button onClick={openPaymentCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Check #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Check Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                        <TableCell>{payment.vendorId?.name || "-"}</TableCell>
                        <TableCell>
                          {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString("en-US", {
                            timeZone: "UTC",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }) : "-"}
                        </TableCell>
                        <TableCell>{getPaymentMethodBadge(payment.method)}</TableCell>
                        <TableCell>{payment.checkNumber || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount || 0)}
                          {payment.appliedCredits?.length > 0 && (
                            <div className="text-xs text-green-600">
                              Credits: {formatCurrency(payment.appliedCredits.reduce((sum: number, c: any) => sum + c.amount, 0))}
                            </div>
                          )}
                          {payment.earlyPaymentDiscountTaken > 0 && (
                            <div className="text-xs text-blue-600">
                              Discount: {formatCurrency(payment.earlyPaymentDiscountTaken)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.method === 'check' ? (
                            <div 
                              className="cursor-pointer"
                              onClick={() => openCheckStatusModal(payment)}
                            >
                              {getCheckStatusBadge(payment.checkStatus || 'pending')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{getVendorPaymentStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {}}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {payment.method === 'check' && payment.status !== 'voided' && (
                                <DropdownMenuItem onClick={() => openCheckStatusModal(payment)}>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Update Check Status
                                </DropdownMenuItem>
                              )}
                              {payment.status !== 'voided' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleVoidPayment(payment._id)}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Void Payment
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Credits Tab */}
        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendor credits..."
                    value={creditMemoSearch}
                    onChange={(e) => setCreditMemoSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={creditMemoVendorFilter} onValueChange={setCreditMemoVendorFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={creditMemoTypeFilter} onValueChange={setCreditMemoTypeFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="debit">Debit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={creditMemoStatusFilter} onValueChange={setCreditMemoStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="partially_applied">Partially Applied</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="voided">Voided</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchCreditMemos} disabled={creditMemoLoading}>
                    <RefreshCw className={`h-4 w-4 ${creditMemoLoading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button onClick={openCreditMemoCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Credit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Applied</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCreditMemos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No vendor credits found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCreditMemos.map((memo) => (
                      <TableRow key={memo._id}>
                        <TableCell className="font-medium">{memo.memoNumber}</TableCell>
                        <TableCell>{getCreditMemoTypeBadge(memo.type)}</TableCell>
                        <TableCell>{memo.vendorId?.name || "-"}</TableCell>
                        <TableCell>
                          <span className="capitalize">{memo.reasonCategory?.replace(/_/g, ' ') || "-"}</span>
                        </TableCell>
                        <TableCell>
                          {memo.createdAt ? new Date(memo.createdAt).toLocaleDateString("en-US", {
                            timeZone: "UTC",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={memo.type === "credit" ? "text-green-600" : "text-red-600"}>
                            {memo.type === "credit" ? "-" : "+"}{formatCurrency(memo.totalAmount || 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(memo.appliedAmount || 0)}
                          {memo.remainingAmount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Remaining: {formatCurrency(memo.remainingAmount)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getCreditMemoStatusBadge(memo.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {}}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {memo.status === 'pending_approval' && (
                                <DropdownMenuItem onClick={() => handleApproveCreditMemo(memo._id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {(memo.status === 'approved' || memo.status === 'partially_applied') && memo.remainingAmount > 0 && (
                                <DropdownMenuItem onClick={() => openApplyCreditMemoModal(memo)}>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Apply to Payment
                                </DropdownMenuItem>
                              )}
                              {memo.status !== 'voided' && memo.status !== 'applied' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleVoidCreditMemo(memo._id)}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Void
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="space-y-4">
          {/* Dispute Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatsCard
              title="Total Disputes"
              value={disputes.length}
              subtitle="All time"
              icon={MessageSquareWarning}
              color="blue"
            />
            <StatsCard
              title="Open Disputes"
              value={disputes.filter(d => d.status === 'open' || d.status === 'in_progress').length}
              subtitle="Requires attention"
              icon={AlertTriangle}
              color="orange"
            />
            <StatsCard
              title="Pending Vendor"
              value={disputes.filter(d => d.status === 'pending_vendor').length}
              subtitle="Awaiting response"
              icon={Clock}
              color="yellow"
            />
            <StatsCard
              title="Resolved"
              value={disputes.filter(d => d.status === 'resolved' || d.status === 'closed').length}
              subtitle="Completed"
              icon={CheckCircle}
              color="green"
            />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareWarning className="h-5 w-5" />
                    Vendor Disputes
                  </CardTitle>
                  <CardDescription>Track and resolve disputes with vendors</CardDescription>
                </div>
                <Button onClick={openDisputeCreateModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Dispute
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search disputes..."
                    value={disputeSearch}
                    onChange={(e) => setDisputeSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={disputeStatusFilter} onValueChange={setDisputeStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending_vendor">Pending Vendor</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={disputeTypeFilter} onValueChange={setDisputeTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {disputeTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={disputeVendorFilter} onValueChange={setDisputeVendorFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchDisputes} disabled={disputeLoading}>
                  <RefreshCw className={`h-4 w-4 ${disputeLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {/* Disputes Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispute #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Linked Documents</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disputeLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading disputes...
                        </TableCell>
                      </TableRow>
                    ) : filteredDisputes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No disputes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDisputes.map((dispute) => (
                        <TableRow key={dispute._id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDisputeDetailModal(dispute)}>
                          <TableCell className="font-medium">{dispute.disputeNumber}</TableCell>
                          <TableCell>{dispute.vendor?.name || "N/A"}</TableCell>
                          <TableCell>{getDisputeTypeBadge(dispute.type)}</TableCell>
                          <TableCell>{getDisputeStatusBadge(dispute.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="text-muted-foreground">
   {dispute?.linkedPurchaseOrder
        ? (dispute.linkedPurchaseOrder?.purchaseOrderNumber ||
           dispute.linkedPurchaseOrder)
        : "None"}
</span>

                              {dispute.linkedInvoice && (
                                <span className="text-muted-foreground">INV: {dispute.linkedInvoice?.invoiceNumber || dispute.linkedInvoice}</span>
                              )}
                              {!dispute.linkedPurchaseOrder && !dispute.linkedInvoice && (
                                <span className="text-muted-foreground"></span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(dispute.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDisputeDetailModal(dispute); }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateDisputeStatus(dispute._id, 'in_progress'); }}>
                                      <Activity className="h-4 w-4 mr-2" />
                                      Mark In Progress
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateDisputeStatus(dispute._id, 'pending_vendor'); }}>
                                      <Clock className="h-4 w-4 mr-2" />
                                      Pending Vendor
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateDisputeStatus(dispute._id, 'escalated'); }}>
                                      <AlertTriangle className="h-4 w-4 mr-2" />
                                      Escalate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openResolveModal(dispute); }}>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Resolve
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Tabs value={activeReportTab} onValueChange={setActiveReportTab}>
            <TabsList>
              <TabsTrigger value="aging">Aging Report</TabsTrigger>
              <TabsTrigger value="statement">Vendor Statement</TabsTrigger>
              <TabsTrigger value="scorecard">Performance Scorecard</TabsTrigger>
              <TabsTrigger value="comparison">Vendor Comparison</TabsTrigger>
            </TabsList>

            {/* Aging Report */}
            <TabsContent value="aging" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row gap-3 justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Accounts Payable Aging
                      </CardTitle>
                      <CardDescription>Outstanding balances by age bucket</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Select value={agingVendorFilter} onValueChange={setAgingVendorFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Vendors</SelectItem>
                          {vendors.map((v) => (
                            <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={fetchAgingReport} disabled={agingReportLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${agingReportLoading ? "animate-spin" : ""}`} />
                        Generate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {agingReport ? (
                    <div className="space-y-6">
                      {/* Summary Cards */}
                      <div className="grid gap-4 md:grid-cols-5">
                        <Card className="bg-green-50">
                          <CardContent className="p-4">
                            <p className="text-sm text-green-700">Current</p>
                            <p className="text-xl font-bold text-green-800">{formatCurrency(agingReport.summary?.current || 0)}</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-yellow-50">
                          <CardContent className="p-4">
                            <p className="text-sm text-yellow-700">1-30 Days</p>
                            <p className="text-xl font-bold text-yellow-800">{formatCurrency(agingReport.summary?.days1to30 || 0)}</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-orange-50">
                          <CardContent className="p-4">
                            <p className="text-sm text-orange-700">31-60 Days</p>
                            <p className="text-xl font-bold text-orange-800">{formatCurrency(agingReport.summary?.days31to60 || 0)}</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-red-50">
                          <CardContent className="p-4">
                            <p className="text-sm text-red-700">61-90 Days</p>
                            <p className="text-xl font-bold text-red-800">{formatCurrency(agingReport.summary?.days61to90 || 0)}</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-red-100">
                          <CardContent className="p-4">
                            <p className="text-sm text-red-800">90+ Days</p>
                            <p className="text-xl font-bold text-red-900">{formatCurrency(agingReport.summary?.days90plus || 0)}</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Total */}
                      <div className="flex justify-end">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Outstanding</p>
                          <p className="text-2xl font-bold">{formatCurrency(agingReport.summary?.total || 0)}</p>
                        </div>
                      </div>

                      {/* Vendor Breakdown Table */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vendor</TableHead>
                            <TableHead className="text-right">Current</TableHead>
                            <TableHead className="text-right">1-30</TableHead>
                            <TableHead className="text-right">31-60</TableHead>
                            <TableHead className="text-right">61-90</TableHead>
                            <TableHead className="text-right">90+</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agingReport.vendors?.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                No outstanding balances
                              </TableCell>
                            </TableRow>
                          ) : (
                            agingReport.vendors?.map((vendor: any) => (
                              <TableRow key={vendor.vendorId}>
                                <TableCell className="font-medium">{vendor.vendorName}</TableCell>
                                <TableCell className="text-right">{formatCurrency(vendor.current || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(vendor.days1to30 || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(vendor.days31to60 || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(vendor.days61to90 || 0)}</TableCell>
                                <TableCell className="text-right text-red-600">{formatCurrency(vendor.days90plus || 0)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(vendor.total || 0)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Click "Generate" to view the aging report</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vendor Statement */}
            <TabsContent value="statement" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row gap-3 justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Vendor Statement
                      </CardTitle>
                      <CardDescription>Transaction history and running balance</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select value={statementVendorId} onValueChange={setStatementVendorId}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={statementStartDate}
                        onChange={(e) => setStatementStartDate(e.target.value)}
                        className="w-[150px]"
                        placeholder="Start date"
                      />
                      <Input
                        type="date"
                        value={statementEndDate}
                        onChange={(e) => setStatementEndDate(e.target.value)}
                        className="w-[150px]"
                        placeholder="End date"
                      />
                      <Button onClick={fetchVendorStatement} disabled={statementLoading || !statementVendorId}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${statementLoading ? "animate-spin" : ""}`} />
                        Generate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {vendorStatement ? (
                    <div className="space-y-6">
                      {/* Vendor Info */}
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Vendor</p>
                            <p className="font-medium">{vendorStatement.vendor?.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Opening Balance</p>
                            <p className="font-medium">{formatCurrency(vendorStatement.openingBalance || 0)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Closing Balance</p>
                            <p className="font-bold text-lg">{formatCurrency(vendorStatement.closingBalance || 0)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Period</p>
                            <p className="font-medium">{vendorStatement.period || 'All time'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Transactions Table */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vendorStatement.transactions?.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                No transactions found
                              </TableCell>
                            </TableRow>
                          ) : (
                            vendorStatement.transactions?.map((txn: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {txn.date ? new Date(txn.date).toLocaleDateString() : '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">{txn.type}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">{txn.reference || '-'}</TableCell>
                                <TableCell>{txn.description || '-'}</TableCell>
                                <TableCell className="text-right text-red-600">
                                  {txn.debit > 0 ? formatCurrency(txn.debit) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-green-600">
                                  {txn.credit > 0 ? formatCurrency(txn.credit) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(txn.runningBalance || 0)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a vendor and click "Generate" to view the statement</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Scorecard */}
            <TabsContent value="scorecard" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row gap-3 justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Vendor Performance Scorecard
                      </CardTitle>
                      <CardDescription>Quality, delivery, and fill rate metrics</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Select value={performanceVendorId} onValueChange={setPerformanceVendorId}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={fetchVendorPerformance} disabled={performanceLoading || !performanceVendorId}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${performanceLoading ? "animate-spin" : ""}`} />
                        Generate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {vendorPerformance ? (
                    <div className="space-y-6">
                      {/* Vendor Info */}
                      <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-lg font-medium">{vendorPerformance.vendor?.name}</p>
                          <p className="text-sm text-muted-foreground">{vendorPerformance.vendor?.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Overall Score</p>
                          <p className={`text-3xl font-bold ${
                            (vendorPerformance.overallScore || 0) >= 80 ? 'text-green-600' :
                            (vendorPerformance.overallScore || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {vendorPerformance.overallScore?.toFixed(1) || 0}%
                          </p>
                        </div>
                      </div>

                      {/* Metrics Cards */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-sm font-medium">On-Time Delivery</p>
                              <CheckCircle className="h-5 w-5 text-blue-500" />
                            </div>
                            <p className={`text-3xl font-bold ${
                              (vendorPerformance.onTimeDeliveryRate || 0) >= 90 ? 'text-green-600' :
                              (vendorPerformance.onTimeDeliveryRate || 0) >= 75 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {vendorPerformance.onTimeDeliveryRate?.toFixed(1) || 0}%
                            </p>
                            <Progress 
                              value={vendorPerformance.onTimeDeliveryRate || 0} 
                              className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                              {vendorPerformance.onTimeDeliveries || 0} of {vendorPerformance.totalDeliveries || 0} deliveries
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-sm font-medium">Quality Acceptance</p>
                              <FileCheck className="h-5 w-5 text-green-500" />
                            </div>
                            <p className={`text-3xl font-bold ${
                              (vendorPerformance.qualityAcceptanceRate || 0) >= 95 ? 'text-green-600' :
                              (vendorPerformance.qualityAcceptanceRate || 0) >= 85 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {vendorPerformance.qualityAcceptanceRate?.toFixed(1) || 0}%
                            </p>
                            <Progress 
                              value={vendorPerformance.qualityAcceptanceRate || 0} 
                              className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                              {vendorPerformance.acceptedItems || 0} of {vendorPerformance.totalItems || 0} items accepted
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-sm font-medium">Fill Rate</p>
                              <Package className="h-5 w-5 text-purple-500" />
                            </div>
                            <p className={`text-3xl font-bold ${
                              (vendorPerformance.fillRate || 0) >= 95 ? 'text-green-600' :
                              (vendorPerformance.fillRate || 0) >= 85 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {vendorPerformance.fillRate?.toFixed(1) || 0}%
                            </p>
                            <Progress 
                              value={vendorPerformance.fillRate || 0} 
                              className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                              {vendorPerformance.fulfilledQuantity || 0} of {vendorPerformance.orderedQuantity || 0} units
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Additional Stats */}
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Total Orders</p>
                          <p className="text-xl font-bold">{vendorPerformance.totalOrders || 0}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Total Spend</p>
                          <p className="text-xl font-bold">{formatCurrency(vendorPerformance.totalSpend || 0)}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Avg Order Value</p>
                          <p className="text-xl font-bold">{formatCurrency(vendorPerformance.avgOrderValue || 0)}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Disputes</p>
                          <p className="text-xl font-bold">{vendorPerformance.disputeCount || 0}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a vendor and click "Generate" to view the scorecard</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vendor Comparison */}
            <TabsContent value="comparison" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row gap-3 justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Vendor Comparison
                      </CardTitle>
                      <CardDescription>Compare performance across all vendors</CardDescription>
                    </div>
                    <Button onClick={fetchVendorComparison} disabled={comparisonLoading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${comparisonLoading ? "animate-spin" : ""}`} />
                      Generate
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {vendorComparison.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">On-Time %</TableHead>
                          <TableHead className="text-right">Quality %</TableHead>
                          <TableHead className="text-right">Fill Rate %</TableHead>
                          <TableHead className="text-right">Overall Score</TableHead>
                          <TableHead className="text-right">Total Spend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendorComparison.map((vendor: any, index: number) => (
                          <TableRow key={vendor.vendorId}>
                            <TableCell>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                  index === 1 ? 'bg-gray-100 text-gray-700' : 
                                  index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                                {index + 1}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{vendor.vendorName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{vendor.type}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={
                                (vendor.onTimeDeliveryRate || 0) >= 90 ? 'text-green-600' :
                                (vendor.onTimeDeliveryRate || 0) >= 75 ? 'text-yellow-600' : 'text-red-600'
                              }>
                                {vendor.onTimeDeliveryRate?.toFixed(1) || 0}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={
                                (vendor.qualityAcceptanceRate || 0) >= 95 ? 'text-green-600' :
                                (vendor.qualityAcceptanceRate || 0) >= 85 ? 'text-yellow-600' : 'text-red-600'
                              }>
                                {vendor.qualityAcceptanceRate?.toFixed(1) || 0}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={
                                (vendor.fillRate || 0) >= 95 ? 'text-green-600' :
                                (vendor.fillRate || 0) >= 85 ? 'text-yellow-600' : 'text-red-600'
                              }>
                                {vendor.fillRate?.toFixed(1) || 0}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-bold ${
                                (vendor.overallScore || 0) >= 80 ? 'text-green-600' :
                                (vendor.overallScore || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {vendor.overallScore?.toFixed(1) || 0}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(vendor.totalSpend || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Click "Generate" to compare all vendors</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      {selectedOrder && (
        <PaymentStatusPopup
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          orderId={selectedOrder.purchaseOrderNumber}
          totalAmount={selectedOrder.totalAmount}
          id={selectedOrder._id}
          fetchOrders={fetchPurchaseOrders}
          onPayment={() => {}}
          paymentOrder={selectedOrder}
          purchase={true}
        />
      )}

      {/* Vendor Details Modal */}
      <UserDetailsModal
        isOpen={vendorDetailsOpen}
        onClose={() => setVendorDetailsOpen(false)}
        userData={selectedVendorData}
        fetchUserDetailsOrder={fetchVendorDetails}
        vendor={true}
      />

      {/* Payment Terms Modal */}
      <Dialog open={paymentTermsModalOpen} onOpenChange={setPaymentTermsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Terms
            </DialogTitle>
            <DialogDescription>
              Configure payment terms for {selectedVendorForTerms?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Term Type</Label>
              <Select 
                value={paymentTermsForm.type} 
                onValueChange={(value) => setPaymentTermsForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">COD (Cash on Delivery)</SelectItem>
                  <SelectItem value="net15">Net 15</SelectItem>
                  <SelectItem value="net30">Net 30</SelectItem>
                  <SelectItem value="net45">Net 45</SelectItem>
                  <SelectItem value="net60">Net 60</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentTermsForm.type === "custom" && (
              <div className="space-y-2">
                <Label>Custom Days</Label>
                <Input
                  type="number"
                  min={1}
                  value={paymentTermsForm.customDays}
                  onChange={(e) => setPaymentTermsForm(prev => ({ 
                    ...prev, 
                    customDays: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>
            )}

            <div className="border-t pt-4">
              <Label className="flex items-center gap-2 mb-3">
                <Percent className="h-4 w-4" />
                Early Payment Discount (Optional)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Discount %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={paymentTermsForm.earlyPaymentDiscount.percentage}
                    onChange={(e) => setPaymentTermsForm(prev => ({
                      ...prev,
                      earlyPaymentDiscount: {
                        ...prev.earlyPaymentDiscount,
                        percentage: parseFloat(e.target.value) || 0
                      }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">If paid within (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={paymentTermsForm.earlyPaymentDiscount.withinDays}
                    onChange={(e) => setPaymentTermsForm(prev => ({
                      ...prev,
                      earlyPaymentDiscount: {
                        ...prev.earlyPaymentDiscount,
                        withinDays: parseInt(e.target.value) || 1
                      }
                    }))}
                  />
                </div>
              </div>
              {paymentTermsForm.earlyPaymentDiscount.percentage > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {paymentTermsForm.earlyPaymentDiscount.percentage}% discount if paid within {paymentTermsForm.earlyPaymentDiscount.withinDays} days
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentTermsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePaymentTerms} disabled={paymentTermsLoading}>
              {paymentTermsLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Vendor Status
            </DialogTitle>
            <DialogDescription>
              Update status for {selectedVendorForStatus?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={statusForm.status} 
                onValueChange={(value) => setStatusForm(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center gap-2">
                      <Ban className="h-4 w-4 text-gray-600" />
                      Inactive
                    </div>
                  </SelectItem>
                  <SelectItem value="on_hold">
                    <div className="flex items-center gap-2">
                      <Pause className="h-4 w-4 text-yellow-600" />
                      On Hold
                    </div>
                  </SelectItem>
                  <SelectItem value="blacklisted">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      Blacklisted
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {statusForm.status !== "active" && (
              <div className="space-y-2">
                <Label>Reason for Status Change *</Label>
                <Textarea
                  placeholder="Enter reason for changing vendor status..."
                  value={statusForm.statusReason}
                  onChange={(e) => setStatusForm(prev => ({ ...prev, statusReason: e.target.value }))}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  A reason is required when setting vendor to non-active status
                </p>
              </div>
            )}

            {selectedVendorForStatus?.statusReason && selectedVendorForStatus?.status !== "active" && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Current Status Reason:</p>
                <p className="text-sm">{selectedVendorForStatus.statusReason}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStatus} disabled={statusLoading}>
              {statusLoading ? "Saving..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Create Modal */}
      <Dialog open={invoiceCreateModalOpen} onOpenChange={setInvoiceCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Create Invoice
            </DialogTitle>
            <DialogDescription>
              Create a new vendor invoice
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select 
                value={invoiceForm.vendorId || undefined} 
                onValueChange={(value) => setInvoiceForm(prev => ({ ...prev, vendorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.filter(v => v.status === 'active' || !v.status).map((v) => (
                    <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  placeholder="Auto-generated if empty"
                  value={invoiceForm.invoiceNumber}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Date *</Label>
                <Input
                  type="date"
                  value={invoiceForm.invoiceDate}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to calculate from vendor payment terms
              </p>
            </div>

            <div className="space-y-2">
              <Label>Link Purchase Orders</Label>
              <Select 
                value={undefined}
                onValueChange={(value) => {
                  if (value && !invoiceForm.linkedPurchaseOrders.includes(value)) {
                    setInvoiceForm(prev => ({ 
                      ...prev, 
                      linkedPurchaseOrders: [...prev.linkedPurchaseOrders, value] 
                    }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PO to link" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders
                    .filter(po => 
                      (invoiceForm.vendorId ? po.vendor?._id === invoiceForm.vendorId || po.vendorId === invoiceForm.vendorId : true) &&
                      !invoiceForm.linkedPurchaseOrders.includes(po._id)
                    )
                    .map((po) => (
                      <SelectItem key={po._id} value={po._id}>
                        {po.purchaseOrderNumber} - {formatCurrency(po.totalAmount)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {invoiceForm.linkedPurchaseOrders.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {invoiceForm.linkedPurchaseOrders.map((poId) => {
                    const po = purchaseOrders.find(p => p._id === poId)
                    return (
                      <Badge key={poId} variant="secondary" className="flex items-center gap-1">
                        {po?.purchaseOrderNumber || poId}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => setInvoiceForm(prev => ({
                            ...prev,
                            linkedPurchaseOrders: prev.linkedPurchaseOrders.filter(id => id !== poId)
                          }))}
                        />
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateInvoice} disabled={invoiceCreateLoading}>
              {invoiceCreateLoading ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Three-Way Matching Modal */}
      <Dialog open={matchingModalOpen} onOpenChange={setMatchingModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Three-Way Matching
            </DialogTitle>
            <DialogDescription>
              Compare PO, Received, and Invoice quantities for {selectedInvoiceForMatching?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          
          {matchingLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : matchingComparison ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">PO Total</p>
                    <p className="text-xl font-bold">{formatCurrency(matchingComparison.summary?.poTotal || 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Received Total</p>
                    <p className="text-xl font-bold">{formatCurrency(matchingComparison.summary?.receivedTotal || 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Invoice Total</p>
                    <p className="text-xl font-bold">{formatCurrency(matchingComparison.summary?.invoiceTotal || 0)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Variance Alert */}
              {matchingComparison.summary?.hasDiscrepancy && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">Discrepancy Detected</p>
                    <p className="text-sm text-red-600">
                      Variance: {formatCurrency(Math.abs(matchingComparison.summary?.variance || 0))} 
                      ({matchingComparison.summary?.variancePercentage?.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              )}

              {/* Line Items Comparison */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">PO Qty</TableHead>
                      <TableHead className="text-center">Received</TableHead>
                      <TableHead className="text-center">Invoice Qty</TableHead>
                      <TableHead className="text-right">PO Price</TableHead>
                      <TableHead className="text-right">Invoice Price</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchingComparison.lineItems?.map((item: any, index: number) => (
                      <TableRow key={index} className={item.hasDiscrepancy ? "bg-red-50" : ""}>
                        <TableCell className="font-medium">{item.productName || item.description}</TableCell>
                        <TableCell className="text-center">{item.poQuantity || 0}</TableCell>
                        <TableCell className="text-center">{item.receivedQuantity || 0}</TableCell>
                        <TableCell className="text-center">{item.invoiceQuantity || 0}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.poPrice || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.invoicePrice || 0)}</TableCell>
                        <TableCell className="text-center">
                          {item.hasDiscrepancy ? (
                            <Badge variant="destructive">Mismatch</Badge>
                          ) : (
                            <Badge variant="success">Match</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Matching Results */}
              {selectedInvoiceForMatching?.matchingResults && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Matching Results</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity Match:</span>{" "}
                      <span className={selectedInvoiceForMatching.matchingResults.quantityMatch ? "text-green-600" : "text-red-600"}>
                        {selectedInvoiceForMatching.matchingResults.quantityMatch ? "Yes" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price Match:</span>{" "}
                      <span className={selectedInvoiceForMatching.matchingResults.priceMatch ? "text-green-600" : "text-red-600"}>
                        {selectedInvoiceForMatching.matchingResults.priceMatch ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No matching data available</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => selectedInvoiceForMatching && handleRunMatching(selectedInvoiceForMatching._id)}
              >
                Run Matching
              </Button>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setMatchingModalOpen(false)}>
              Close
            </Button>
            {selectedInvoiceForMatching && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => handleRunMatching(selectedInvoiceForMatching._id)}
                  disabled={matchingLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${matchingLoading ? "animate-spin" : ""}`} />
                  Re-run Matching
                </Button>
                {selectedInvoiceForMatching.status === 'pending' && (
                  <>
                    <Button 
                      variant="destructive"
                      onClick={() => handleDisputeInvoice(selectedInvoiceForMatching._id, "Discrepancy found during matching")}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Dispute
                    </Button>
                    <Button 
                      onClick={() => handleApproveInvoice(selectedInvoiceForMatching._id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Memo Create Modal */}
      <Dialog open={creditMemoCreateModalOpen} onOpenChange={setCreditMemoCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Create Credit/Debit Memo
            </DialogTitle>
            <DialogDescription>
              Create a new credit or debit memo for a vendor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select 
                  value={creditMemoForm.vendorId || undefined} 
                  onValueChange={(value) => setCreditMemoForm(prev => ({ ...prev, vendorId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.filter(v => v.status === 'active' || !v.status).map((v) => (
                      <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select 
                  value={creditMemoForm.type || "credit"} 
                  onValueChange={(value: "credit" | "debit") => setCreditMemoForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Credit (Reduces Balance)
                      </div>
                    </SelectItem>
                    <SelectItem value="debit">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Debit (Increases Balance)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason Category *</Label>
              <Select 
                value={creditMemoForm.reasonCategory || undefined} 
                onValueChange={(value) => setCreditMemoForm(prev => ({ ...prev, reasonCategory: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasonCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link Purchase Order</Label>
                <Select 
                  value={creditMemoForm.linkedPurchaseOrder || "none"}
                  onValueChange={(value) => setCreditMemoForm(prev => ({ ...prev, linkedPurchaseOrder: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select PO (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {purchaseOrders
                      .filter(po => creditMemoForm.vendorId ? (po.vendor?._id === creditMemoForm.vendorId || po.vendorId === creditMemoForm.vendorId) : true)
                      .map((po) => (
                        <SelectItem key={po._id} value={po._id}>
                          {po.purchaseOrderNumber}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Link Invoice</Label>
                <Select 
                  value={creditMemoForm.linkedInvoice || "none"}
                  onValueChange={(value) => setCreditMemoForm(prev => ({ ...prev, linkedInvoice: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Invoice (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {invoices
                      .filter(inv => creditMemoForm.vendorId ? inv.vendorId?._id === creditMemoForm.vendorId : true)
                      .map((inv) => (
                        <SelectItem key={inv._id} value={inv._id}>
                          {inv.invoiceNumber}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe the reason for this memo..."
                value={creditMemoForm.description}
                onChange={(e) => setCreditMemoForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCreditMemoForm(prev => ({
                    ...prev,
                    lineItems: [...prev.lineItems, { description: "", quantity: 1, unitPrice: 0 }]
                  }))}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>
              {creditMemoForm.lineItems.length > 0 ? (
                <div className="space-y-2">
                  {creditMemoForm.lineItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start p-2 bg-muted/50 rounded">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...creditMemoForm.lineItems]
                          newItems[index].description = e.target.value
                          setCreditMemoForm(prev => ({ ...prev, lineItems: newItems }))
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...creditMemoForm.lineItems]
                          newItems[index].quantity = parseFloat(e.target.value) || 0
                          setCreditMemoForm(prev => ({ ...prev, lineItems: newItems }))
                        }}
                        className="w-20"
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const newItems = [...creditMemoForm.lineItems]
                          newItems[index].unitPrice = parseFloat(e.target.value) || 0
                          setCreditMemoForm(prev => ({ ...prev, lineItems: newItems }))
                        }}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newItems = creditMemoForm.lineItems.filter((_, i) => i !== index)
                          setCreditMemoForm(prev => ({ ...prev, lineItems: newItems }))
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="text-right text-sm font-medium">
                    Total: {formatCurrency(creditMemoForm.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No line items added. Add items to specify amounts.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={creditMemoForm.notes}
                onChange={(e) => setCreditMemoForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditMemoCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCreditMemo} disabled={creditMemoCreateLoading}>
              {creditMemoCreateLoading ? "Creating..." : "Create Memo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Memo Apply Modal */}
      <Dialog open={creditMemoApplyModalOpen} onOpenChange={setCreditMemoApplyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Apply Credit Memo
            </DialogTitle>
            <DialogDescription>
              Apply credit memo {selectedCreditMemoForApply?.memoNumber} to reduce vendor balance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCreditMemoForApply && (
              <>
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Memo Number:</span>
                    <span className="font-medium">{selectedCreditMemoForApply.memoNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendor:</span>
                    <span>{selectedCreditMemoForApply.vendorId?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(selectedCreditMemoForApply.totalAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Already Applied:</span>
                    <span>{formatCurrency(selectedCreditMemoForApply.appliedAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(selectedCreditMemoForApply.remainingAmount || selectedCreditMemoForApply.totalAmount || 0)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Amount to Apply *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedCreditMemoForApply.remainingAmount || selectedCreditMemoForApply.totalAmount}
                    value={applyAmount}
                    onChange={(e) => setApplyAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum: {formatCurrency(selectedCreditMemoForApply.remainingAmount || selectedCreditMemoForApply.totalAmount || 0)}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditMemoApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyCreditMemo} disabled={applyLoading || !applyAmount}>
              {applyLoading ? "Applying..." : "Apply Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Create Modal */}
      <Dialog open={paymentCreateModalOpen} onOpenChange={setPaymentCreateModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Record a payment to a vendor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select 
                  value={paymentForm.vendorId || undefined} 
                  onValueChange={(value) => setPaymentForm(prev => ({ 
                    ...prev, 
                    vendorId: value,
                    invoiceIds: [],
                    appliedCredits: []
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.filter(v => v.status === 'active' || !v.status).map((v) => (
                      <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select 
                  value={paymentForm.method || "check"} 
                  onValueChange={(value: any) => setPaymentForm(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="ach">ACH Transfer</SelectItem>
                    <SelectItem value="wire">Wire Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                />
              </div>
              {paymentForm.method === 'check' && (
                <div className="space-y-2">
                  <Label>Check Number</Label>
                  <Input
                    value={paymentForm.checkNumber}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, checkNumber: e.target.value }))}
                    placeholder="Enter check number"
                  />
                </div>
              )}
              {paymentForm.method !== 'check' && paymentForm.method !== 'cash' && (
                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    placeholder="Enter reference number"
                  />
                </div>
              )}
            </div>

            {/* Select Invoices to Pay */}
            {paymentForm.vendorId && (
              <div className="space-y-2">
                <Label>Apply to Invoices</Label>
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {getAvailableInvoicesForPayment().length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No unpaid invoices for this vendor</p>
                  ) : (
                    getAvailableInvoicesForPayment().map((inv) => (
                      <div 
                        key={inv._id} 
                        className={`flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                          paymentForm.invoiceIds.includes(inv._id) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setPaymentForm(prev => ({
                            ...prev,
                            invoiceIds: prev.invoiceIds.includes(inv._id)
                              ? prev.invoiceIds.filter(id => id !== inv._id)
                              : [...prev.invoiceIds, inv._id]
                          }))
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={paymentForm.invoiceIds.includes(inv._id)}
                            onChange={() => {}}
                            className="rounded"
                          />
                          <div>
                            <span className="font-medium">{inv.invoiceNumber}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(inv.remainingAmount || inv.totalAmount || 0)}</div>
                          <div className="text-xs text-muted-foreground">Outstanding</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {paymentForm.invoiceIds.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {paymentForm.invoiceIds.length} invoice(s) selected
                  </p>
                )}
              </div>
            )}

            {/* Apply Credits */}
            {paymentForm.vendorId && getAvailableCreditsForPayment().length > 0 && (
              <div className="space-y-2">
                <Label>Apply Credits (Optional)</Label>
                <div className="border rounded-lg max-h-32 overflow-y-auto">
                  {getAvailableCreditsForPayment().map((memo) => (
                    <div 
                      key={memo._id} 
                      className={`flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                        paymentForm.appliedCredits.some(c => c.creditMemoId === memo._id) ? 'bg-green-50' : ''
                      }`}
                      onClick={() => {
                        setPaymentForm(prev => ({
                          ...prev,
                          appliedCredits: prev.appliedCredits.some(c => c.creditMemoId === memo._id)
                            ? prev.appliedCredits.filter(c => c.creditMemoId !== memo._id)
                            : [...prev.appliedCredits, { creditMemoId: memo._id, amount: memo.remainingAmount || memo.totalAmount }]
                        }))
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={paymentForm.appliedCredits.some(c => c.creditMemoId === memo._id)}
                          onChange={() => {}}
                          className="rounded"
                        />
                        <div>
                          <span className="font-medium">{memo.memoNumber}</span>
                          <span className="text-xs text-muted-foreground ml-2 capitalize">
                            {memo.reasonCategory?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">-{formatCurrency(memo.remainingAmount || memo.totalAmount || 0)}</div>
                        <div className="text-xs text-muted-foreground">Available</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Payment Summary */}
            {paymentForm.amount && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm font-medium">Payment Summary</p>
                <div className="flex justify-between text-sm">
                  <span>Payment Amount:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(paymentForm.amount) || 0)}</span>
                </div>
                {paymentForm.appliedCredits.length > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Credits Applied:</span>
                    <span>-{formatCurrency(paymentForm.appliedCredits.reduce((sum, c) => sum + c.amount, 0))}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t pt-2">
                  <span>Net Payment:</span>
                  <span>{formatCurrency(
                    (parseFloat(paymentForm.amount) || 0) - 
                    paymentForm.appliedCredits.reduce((sum, c) => sum + c.amount, 0)
                  )}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePayment} disabled={paymentCreateLoading}>
              {paymentCreateLoading ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check Status Modal */}
      <Dialog open={checkStatusModalOpen} onOpenChange={setCheckStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Update Check Status
            </DialogTitle>
            <DialogDescription>
              Update the clearance status for check {selectedPaymentForCheck?.checkNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPaymentForCheck && (
              <>
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment #:</span>
                    <span className="font-medium">{selectedPaymentForCheck.paymentNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check #:</span>
                    <span className="font-medium">{selectedPaymentForCheck.checkNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">{formatCurrency(selectedPaymentForCheck.amount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Status:</span>
                    {getCheckStatusBadge(selectedPaymentForCheck.checkStatus || 'pending')}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>New Status *</Label>
                  <Select 
                    value={checkStatusForm.status} 
                    onValueChange={(value: any) => setCheckStatusForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          Pending
                        </div>
                      </SelectItem>
                      <SelectItem value="cleared">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Cleared
                        </div>
                      </SelectItem>
                      <SelectItem value="bounced">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          Bounced
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {checkStatusForm.status === 'cleared' && (
                  <div className="space-y-2">
                    <Label>Cleared Date</Label>
                    <Input
                      type="date"
                      value={checkStatusForm.clearedDate}
                      onChange={(e) => setCheckStatusForm(prev => ({ ...prev, clearedDate: e.target.value }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={checkStatusForm.notes}
                    onChange={(e) => setCheckStatusForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>

                {checkStatusForm.status === 'bounced' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Marking a check as bounced will reverse the payment and restore invoice balances.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCheckStatus} disabled={checkStatusLoading}>
              {checkStatusLoading ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Create Modal */}
      <Dialog open={disputeCreateModalOpen} onOpenChange={setDisputeCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5" />
              Create New Dispute
            </DialogTitle>
            <DialogDescription>
              Open a dispute with a vendor for pricing, quality, or other issues
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select 
                value={disputeForm.vendorId || undefined} 
                onValueChange={(value) => setDisputeForm(prev => ({ ...prev, vendorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dispute Type *</Label>
              <Select 
                value={disputeForm.type || "pricing"} 
                onValueChange={(value) => setDisputeForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {disputeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Linked PO (Optional)</Label>
                <Select 
                  value={disputeForm.linkedPurchaseOrder || "none"} 
                  onValueChange={(value) => setDisputeForm(prev => ({ ...prev, linkedPurchaseOrder: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select PO" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {purchaseOrders
                      .filter(po => !disputeForm.vendorId || po.vendorId?._id === disputeForm.vendorId || po.vendor?._id === disputeForm.vendorId)
                      .slice(0, 50)
                      .map((po) => (
                        <SelectItem key={po._id} value={po._id}>{po.purchaseOrderNumber}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Linked Invoice (Optional)</Label>
                <Select 
                  value={disputeForm.linkedInvoice || "none"} 
                  onValueChange={(value) => setDisputeForm(prev => ({ ...prev, linkedInvoice: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {invoices
                      .filter(inv => !disputeForm.vendorId || inv.vendorId?._id === disputeForm.vendorId)
                      .map((inv) => (
                        <SelectItem key={inv._id} value={inv._id}>{inv.invoiceNumber}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe the issue in detail..."
                value={disputeForm.description}
                onChange={(e) => setDisputeForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="holdInvoices"
                checked={disputeForm.holdInvoices}
                onChange={(e) => setDisputeForm(prev => ({ ...prev, holdInvoices: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="holdInvoices" className="text-sm font-normal cursor-pointer">
                Hold linked invoices from payment until resolved
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDispute} disabled={disputeCreateLoading}>
              {disputeCreateLoading ? "Creating..." : "Create Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Detail Modal */}
      <Dialog open={disputeDetailModalOpen} onOpenChange={setDisputeDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5" />
              Dispute Details - {selectedDispute?.disputeNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-6 py-4">
              {/* Dispute Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{selectedDispute.vendor?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getDisputeStatusBadge(selectedDispute.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <div className="mt-1">{getDisputeTypeBadge(selectedDispute.type)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(selectedDispute.createdAt).toLocaleDateString()}</p>
                </div>
                {selectedDispute.linkedPurchaseOrder && (
                  <div>
                    <p className="text-sm text-muted-foreground">Linked PO</p>
                    <p className="font-medium">{selectedDispute.linkedPurchaseOrder?.purchaseOrderNumber || selectedDispute.linkedPurchaseOrder}</p>
                  </div>
                )}
                {selectedDispute.linkedInvoice && (
                  <div>
                    <p className="text-sm text-muted-foreground">Linked Invoice</p>
                    <p className="font-medium">{selectedDispute.linkedInvoice?.invoiceNumber || selectedDispute.linkedInvoice}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {selectedDispute.description || "No description provided"}
                </p>
              </div>

              {/* Resolution (if resolved) */}
              {selectedDispute.resolution && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Resolution
                  </h4>
                  <p className="text-sm text-green-700 capitalize">{selectedDispute.resolution.replace(/_/g, ' ')}</p>
                  {selectedDispute.resolutionNotes && (
                    <p className="text-sm text-green-600 mt-2">{selectedDispute.resolutionNotes}</p>
                  )}
                  {selectedDispute.resolvedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      Resolved on {new Date(selectedDispute.resolvedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Communication Timeline */}
              <div>
                <h4 className="font-medium mb-3">Communication History</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedDispute.communications?.length > 0 ? (
                    selectedDispute.communications.map((comm: any, index: number) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg ${
                          comm.direction === 'outgoing' || comm.direction === 'internal' 
                            ? 'bg-blue-50 border border-blue-200 ml-8' 
                            : 'bg-gray-50 border border-gray-200 mr-8'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-medium capitalize">
                            {comm.direction === 'internal' ? 'Internal Note' : comm.direction === 'outgoing' ? 'Sent to Vendor' : 'From Vendor'}
                          </span>
                          
                        </div>
                        <p className="text-sm">{comm.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No communications yet</p>
                  )}
                </div>
              </div>

              {/* Add Message */}
              {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' && (
                <div className="space-y-2">
                  <Label>Add Message</Label>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleAddMessage} 
                      disabled={messageLoading || !newMessage.trim()}
                      className="self-end"
                    >
                      {messageLoading ? "..." : "Send"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDetailModalOpen(false)}>
              Close
            </Button>
            {selectedDispute && selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' && (
              <Button onClick={() => { setDisputeDetailModalOpen(false); openResolveModal(selectedDispute); }}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolve Dispute
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Resolve Modal */}
      <Dialog open={disputeResolveModalOpen} onOpenChange={setDisputeResolveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Resolve Dispute
            </DialogTitle>
            <DialogDescription>
              Close dispute {selectedDispute?.disputeNumber} with a resolution
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Resolution *</Label>
              <Select 
                value={resolveForm.resolution} 
                onValueChange={(value) => setResolveForm(prev => ({ ...prev, resolution: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  {resolutionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {resolveForm.resolution === 'credit_issued' && (
              <div className="space-y-2">
                <Label>Credit Memo Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={resolveForm.creditMemoAmount}
                    onChange={(e) => setResolveForm(prev => ({ ...prev, creditMemoAmount: e.target.value }))}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  A credit memo will be automatically created for this amount
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea
                placeholder="Add any notes about the resolution..."
                value={resolveForm.resolutionNotes}
                onChange={(e) => setResolveForm(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveDispute} disabled={resolveLoading || !resolveForm.resolution}>
              {resolveLoading ? "Resolving..." : "Resolve Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VendorsEnhanced
