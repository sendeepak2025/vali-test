"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search, Plus, Filter, RefreshCw, Download, MoreVertical, Eye, Edit,
  DollarSign, Users, AlertTriangle, CheckCircle, Clock, FileText,
  TrendingUp, TrendingDown, CreditCard, Building2, ChevronDown,
  Receipt, Calendar, ArrowUpDown, X, BarChart3, Banknote, Scale,
  PieChart, Wallet, ArrowDownLeft, ArrowUpRight, FileSpreadsheet,
  Printer, Mail, ChevronRight, CircleDollarSign, BadgeDollarSign,
  Calculator, Landmark, History, AlertCircle, CheckCircle2, Briefcase, Trash2,
  Settings2
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
import Sidebar from "@/components/layout/Sidebar"
import UserDetailsModal from "@/components/admin/user-details-modal"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import { getAllMembersAPI, userWithOrderDetails } from "@/services2/operations/auth"
import { getAllVendorsAPI } from "@/services2/operations/vendor"
import { vendorWithOrderDetails } from "@/services2/operations/auth"
import { getAgingReportAPI, getVendorDashboardAPI } from "@/services2/operations/vendorReports"
import { getAllVendorPaymentsAPI } from "@/services2/operations/vendorPayment"
import { getAllVendorCreditMemosAPI } from "@/services2/operations/vendorCreditMemo"
import { AdjustmentsManager } from "@/components/accounting"
import { getAdjustmentSummaryAPI } from "@/services2/operations/adjustment"
import { RecordPaymentModal } from "@/components/payments"

// Stats Card Component
const StatsCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = "blue", onClick, clickable = false }: any) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
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

const AccountingEnhanced = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 overflow-auto">
        <AccountingContent />
      </div>
    </div>
  )
}

const AccountingContent = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  // Tab state
  const [activeTab, setActiveTab] = useState("dashboard")

  // Dashboard state
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [financialSummary, setFinancialSummary] = useState<any>({
    totalReceivables: 0,
    totalPayables: 0,
    netPosition: 0,
    overdueReceivables: 0,
    overduePayables: 0,
    recentPaymentsIn: 0,
    recentPaymentsOut: 0
  })

  // Customers (Accounts Receivable) state
  const [customers, setCustomers] = useState<any[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerBalanceFilter, setCustomerBalanceFilter] = useState("all")
  const [customerLoading, setCustomerLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false)

  // Vendors (Accounts Payable) state
  const [vendors, setVendors] = useState<any[]>([])
  const [vendorSearch, setVendorSearch] = useState("")
  const [vendorBalanceFilter, setVendorBalanceFilter] = useState("all")
  const [vendorLoading, setVendorLoading] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<any>(null)
  const [vendorDetailsOpen, setVendorDetailsOpen] = useState(false)
  const [vendorDashboard, setVendorDashboard] = useState<any>(null)

  // Payments state
  const [paymentsIn, setPaymentsIn] = useState<any[]>([])
  const [paymentsOut, setPaymentsOut] = useState<any[]>([])
  const [paymentSearch, setPaymentSearch] = useState("")
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all")
  const [paymentDateFilter, setPaymentDateFilter] = useState("all")
  const [paymentLoading, setPaymentLoading] = useState(false)

  // Credit Memos state
  const [creditMemosCustomer, setCreditMemosCustomer] = useState<any[]>([])
  const [creditMemosVendor, setCreditMemosVendor] = useState<any[]>([])
  const [creditMemoSearch, setCreditMemoSearch] = useState("")
  const [creditMemoTypeFilter, setCreditMemoTypeFilter] = useState("all")
  const [creditMemoLoading, setCreditMemoLoading] = useState(false)

  // Aging Report state
  const [arAgingReport, setArAgingReport] = useState<any>(null)
  const [apAgingReport, setApAgingReport] = useState<any>(null)
  const [agingLoading, setAgingLoading] = useState(false)

  // Office Expenses state
  const [expenses, setExpenses] = useState<any[]>([])
  const [expenseSearch, setExpenseSearch] = useState("")
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all")
  const [expenseLoading, setExpenseLoading] = useState(false)
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "office_supplies",
    date: new Date().toISOString().split('T')[0],
    paymentMethod: "cash",
    reference: "",
    notes: "",
    vendor: ""
  })
  const [expenseFormLoading, setExpenseFormLoading] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)

  // Record Payment Modal
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    type: "incoming" as "incoming" | "outgoing",
    entityId: "",
    amount: "",
    method: "check",
    reference: "",
    notes: "",
    date: new Date().toISOString().split('T')[0]
  })
  const [paymentFormLoading, setPaymentFormLoading] = useState(false)

  // Adjustments state
  const [pendingAdjustmentsCount, setPendingAdjustmentsCount] = useState(0)
  const [totalStoreCredits, setTotalStoreCredits] = useState(0)

  // Record Payment Modal state
  const [storePaymentModalOpen, setStorePaymentModalOpen] = useState(false)
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<any>(null)

  // Open payment modal for a customer
  const openStorePaymentModal = (customer: any) => {
    setSelectedCustomerForPayment(customer)
    setStorePaymentModalOpen(true)
  }

  // Fetch pending adjustments count
  const fetchAdjustmentsSummary = async () => {
    try {
      const result = await getAdjustmentSummaryAPI({}, token)
      if (result) {
        setPendingAdjustmentsCount(result.pendingCount || 0)
      }
    } catch (error) {
      console.error("Error fetching adjustments summary:", error)
    }
  }

  // Fetch customers (stores) with order details
  const fetchCustomers = async () => {
    setCustomerLoading(true)
    try {
      const data = await getAllMembersAPI()
      const stores = data?.filter((m: any) => m.role === "store") || []
      
      // Fetch order details for each store
      const customersWithDetails = await Promise.all(
        stores.map(async (store: any) => {
          try {
            const details = await userWithOrderDetails(store._id)
            return {
              ...store,
              id: store._id,
              totalOrders: details?.totalOrders || 0,
              totalSpent: details?.totalSpent || 0,
              totalPaid: details?.totalPay || 0,
              balanceDue: details?.balanceDue || 0,
              creditBalance: store.creditBalance || 0, // Include credit balance from store
              lastPayment: details?.lastPayment,
              orders: details?.orders || []
            }
          } catch (err) {
            return {
              ...store,
              id: store._id,
              totalOrders: 0,
              totalSpent: 0,
              totalPaid: 0,
              balanceDue: 0,
              creditBalance: store.creditBalance || 0
            }
          }
        })
      )
      
      setCustomers(customersWithDetails)
      
      // Calculate receivables summary
      const totalReceivables = customersWithDetails.reduce((sum, c) => sum + (c.balanceDue || 0), 0)
      const overdueReceivables = customersWithDetails
        .filter(c => c.balanceDue > 0 && c.lastPayment?.payment?.paymentDate && 
          new Date(c.lastPayment.payment.paymentDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, c) => sum + (c.balanceDue || 0), 0)
      
      // Calculate total store credits
      const totalCredits = customersWithDetails.reduce((sum, c) => sum + (c.creditBalance || 0), 0)
      setTotalStoreCredits(totalCredits)
      
      setFinancialSummary((prev: any) => ({
        ...prev,
        totalReceivables,
        overdueReceivables,
        netPosition: totalReceivables - (prev.totalPayables || 0)
      }))
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch customers" })
    } finally {
      setCustomerLoading(false)
    }
  }

  // Fetch vendors with details
  const fetchVendors = async () => {
    setVendorLoading(true)
    try {
      const data = await getAllVendorsAPI()
      const vendorList = data || []
      
      // Fetch details for each vendor
      const vendorsWithDetails = await Promise.all(
        vendorList.map(async (vendor: any) => {
          try {
            const details = await vendorWithOrderDetails(vendor._id)
            return {
              ...vendor,
              id: vendor._id,
              totalOrders: details?.totalOrders || 0,
              totalSpent: details?.totalSpent || 0,
              totalPaid: details?.totalPay || 0,
              balanceDue: details?.balanceDue || 0,
              purchaseOrders: details?.purchaseOrders || []
            }
          } catch (err) {
            return {
              ...vendor,
              id: vendor._id,
              totalOrders: 0,
              totalSpent: 0,
              totalPaid: 0,
              balanceDue: 0
            }
          }
        })
      )
      
      setVendors(vendorsWithDetails)
      
      // Calculate payables summary
      const totalPayables = vendorsWithDetails.reduce((sum, v) => sum + (v.balanceDue || 0), 0)
      
      setFinancialSummary((prev: any) => ({
        ...prev,
        totalPayables,
        netPosition: (prev.totalReceivables || 0) - totalPayables
      }))
    } catch (error) {
      console.error("Error fetching vendors:", error)
    } finally {
      setVendorLoading(false)
    }
  }

  // Fetch vendor dashboard data
  const fetchVendorDashboard = async () => {
    try {
      const data = await getVendorDashboardAPI(token)
      setVendorDashboard(data)
    } catch (error) {
      console.error("Error fetching vendor dashboard:", error)
    }
  }

  // Fetch vendor payments
  const fetchVendorPayments = async () => {
    setPaymentLoading(true)
    try {
      const data = await getAllVendorPaymentsAPI({}, token)
      setPaymentsOut(data?.payments || [])
      
      // Calculate recent payments out
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const recentPaymentsOut = (data?.payments || [])
        .filter((p: any) => new Date(p.createdAt) >= thirtyDaysAgo)
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      
      setFinancialSummary((prev: any) => ({
        ...prev,
        recentPaymentsOut
      }))
    } catch (error) {
      console.error("Error fetching vendor payments:", error)
    } finally {
      setPaymentLoading(false)
    }
  }

  // Fetch vendor credit memos
  const fetchVendorCreditMemos = async () => {
    setCreditMemoLoading(true)
    try {
      const data = await getAllVendorCreditMemosAPI({}, token)
      setCreditMemosVendor(data?.creditMemos || [])
    } catch (error) {
      console.error("Error fetching vendor credit memos:", error)
    } finally {
      setCreditMemoLoading(false)
    }
  }

  // Fetch AP aging report
  const fetchApAgingReport = async () => {
    setAgingLoading(true)
    try {
      const data = await getAgingReportAPI({}, token)
      setApAgingReport(data)
    } catch (error) {
      console.error("Error fetching AP aging report:", error)
    } finally {
      setAgingLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchCustomers()
    fetchVendors()
    fetchVendorDashboard()
    fetchVendorPayments()
    fetchVendorCreditMemos()
    fetchApAgingReport()
    fetchAdjustmentsSummary()
  }, [])

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.storeName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.ownerName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.phone?.includes(customerSearch)
    
    let matchesBalance = true
    if (customerBalanceFilter === "with_balance") {
      matchesBalance = customer.balanceDue > 0
    } else if (customerBalanceFilter === "no_balance") {
      matchesBalance = customer.balanceDue <= 0
    } else if (customerBalanceFilter === "overdue") {
      matchesBalance = customer.balanceDue > 0 // Add proper overdue logic
    }
    
    return matchesSearch && matchesBalance
  })

  // Filter vendors
  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      vendor.contactName?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(vendorSearch.toLowerCase())
    
    let matchesBalance = true
    if (vendorBalanceFilter === "with_balance") {
      matchesBalance = vendor.balanceDue > 0
    } else if (vendorBalanceFilter === "no_balance") {
      matchesBalance = vendor.balanceDue <= 0
    }
    
    return matchesSearch && matchesBalance
  })

  // View customer details
  const viewCustomerDetails = async (customerId: string) => {
    try {
      const details = await userWithOrderDetails(customerId)
      setSelectedCustomer(details)
      setCustomerDetailsOpen(true)
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch customer details" })
    }
  }

  // View vendor details
  const viewVendorDetails = async (vendorId: string) => {
    try {
      const details = await vendorWithOrderDetails(vendorId)
      setSelectedVendor(details)
      setVendorDetailsOpen(true)
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch vendor details" })
    }
  }

  // Get balance status badge
  const getBalanceStatusBadge = (balance: number, type: "receivable" | "payable") => {
    if (balance <= 0) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>
    } else if (balance > 1000) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">High Balance</Badge>
    } else {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Outstanding</Badge>
    }
  }

  // Get payment method badge
  const getPaymentMethodBadge = (method: string) => {
    const methods: Record<string, { label: string; className: string }> = {
      check: { label: "Check", className: "bg-blue-50 text-blue-700 border-blue-200" },
      ach: { label: "ACH", className: "bg-purple-50 text-purple-700 border-purple-200" },
      wire: { label: "Wire", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      cash: { label: "Cash", className: "bg-green-50 text-green-700 border-green-200" },
      credit_card: { label: "Card", className: "bg-orange-50 text-orange-700 border-orange-200" },
      creditcard: { label: "Card", className: "bg-orange-50 text-orange-700 border-orange-200" },
      cheque: { label: "Cheque", className: "bg-blue-50 text-blue-700 border-blue-200" }
    }
    const config = methods[method] || { label: method, className: "bg-gray-50 text-gray-700 border-gray-200" }
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  // Get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; className: string }> = {
      completed: { label: "Completed", className: "bg-green-50 text-green-700 border-green-200" },
      pending: { label: "Pending", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
      cleared: { label: "Cleared", className: "bg-green-50 text-green-700 border-green-200" },
      bounced: { label: "Bounced", className: "bg-red-50 text-red-700 border-red-200" },
      voided: { label: "Voided", className: "bg-gray-50 text-gray-700 border-gray-200" }
    }
    const config = statuses[status] || { label: status, className: "bg-gray-50 text-gray-700 border-gray-200" }
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  // Export to CSV
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => row[h] ?? "").join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `${filename}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export AR report
  const exportARReport = () => {
    const data = filteredCustomers.map(c => ({
      storeName: c.storeName || "",
      phone: c.phone || "",
      totalOrders: c.totalOrders || 0,
      totalSpent: c.totalSpent?.toFixed(2) || "0.00",
      totalPaid: c.totalPaid?.toFixed(2) || "0.00",
      balanceDue: c.balanceDue?.toFixed(2) || "0.00"
    }))
    exportToCSV(data, "accounts_receivable_report", ["storeName", "phone", "totalOrders", "totalSpent", "totalPaid", "balanceDue"])
    toast({ title: "Success", description: "AR report exported successfully" })
  }

  // Export AP report
  const exportAPReport = () => {
    const data = filteredVendors.map(v => ({
      name: v.name || "",
      phone: v.phone || "",
      totalOrders: v.totalOrders || 0,
      totalSpent: v.totalSpent?.toFixed(2) || "0.00",
      totalPaid: v.totalPaid?.toFixed(2) || "0.00",
      balanceDue: v.balanceDue?.toFixed(2) || "0.00"
    }))
    exportToCSV(data, "accounts_payable_report", ["name", "phone", "totalOrders", "totalSpent", "totalPaid", "balanceDue"])
    toast({ title: "Success", description: "AP report exported successfully" })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Accounting</h1>
          <p className="text-muted-foreground">Manage receivables, payables, and financial reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            fetchCustomers()
            fetchVendors()
            fetchVendorPayments()
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportARReport}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                AR Report (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAPReport}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                AP Report (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-8 gap-2 h-auto p-1">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 py-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="receivables" className="flex items-center gap-2 py-2">
            <ArrowDownLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Receivables</span>
          </TabsTrigger>
          <TabsTrigger value="payables" className="flex items-center gap-2 py-2">
            <ArrowUpRight className="h-4 w-4" />
            <span className="hidden sm:inline">Payables</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2 py-2">
            <Banknote className="h-4 w-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="flex items-center gap-2 py-2 relative">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Adjustments</span>
            {pendingAdjustmentsCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingAdjustmentsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2 py-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Expenses</span>
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-2 py-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Credits</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 py-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Receivables"
              value={formatCurrency(financialSummary.totalReceivables)}
              subtitle="From customers"
              icon={ArrowDownLeft}
              color="green"
              clickable
              onClick={() => setActiveTab("receivables")}
            />
            <StatsCard
              title="Total Payables"
              value={formatCurrency(financialSummary.totalPayables)}
              subtitle="To vendors"
              icon={ArrowUpRight}
              color="red"
              clickable
              onClick={() => setActiveTab("payables")}
            />
            <StatsCard
              title="Net Position"
              value={formatCurrency(financialSummary.netPosition)}
              subtitle={financialSummary.netPosition >= 0 ? "Positive cash flow" : "Negative cash flow"}
              icon={Wallet}
              color={financialSummary.netPosition >= 0 ? "blue" : "orange"}
            />
            <StatsCard
              title="Overdue Receivables"
              value={formatCurrency(financialSummary.overdueReceivables)}
              subtitle="Past 30 days"
              icon={AlertTriangle}
              color="orange"
            />
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{customers.length}</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {customers.filter(c => c.balanceDue > 0).length} with balance
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Vendors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{vendors.length}</span>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    {vendors.filter(v => v.balanceDue > 0).length} with balance
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recent Payments Out</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{formatCurrency(financialSummary.recentPaymentsOut)}</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">Last 30 days</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Pending Items */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => setActiveTab("adjustments")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Adjustment
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/payments")}
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("credits")}
                >
                  <Scale className="h-4 w-4 mr-2" />
                  New Credit Memo
                </Button>
              </CardContent>
            </Card>

            {/* Pending Approvals */}
            <Card className={pendingAdjustmentsCount > 0 ? "border-orange-200 bg-orange-50/50" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-orange-600">{pendingAdjustmentsCount}</p>
                    <p className="text-sm text-muted-foreground">Adjustments awaiting approval</p>
                  </div>
                  {pendingAdjustmentsCount > 0 && (
                    <Button size="sm" onClick={() => setActiveTab("adjustments")}>
                      Review
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Store Credits Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Store Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(customers.reduce((sum, c) => sum + (c.creditBalance || 0), 0))}
                    </p>
                    <p className="text-sm text-muted-foreground">Total outstanding credits</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("receivables")}>
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Balances */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customer Balances */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Top Customer Balances</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("receivables")}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customers
                    .filter(c => c.balanceDue > 0)
                    .sort((a, b) => b.balanceDue - a.balanceDue)
                    .slice(0, 5)
                    .map((customer) => (
                      <div 
                        key={customer.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => viewCustomerDetails(customer.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{customer.storeName || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{customer.phone || "No phone"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">{formatCurrency(customer.balanceDue)}</p>
                          <p className="text-xs text-muted-foreground">{customer.totalOrders} orders</p>
                        </div>
                      </div>
                    ))}
                  {customers.filter(c => c.balanceDue > 0).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No outstanding balances</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Vendor Balances */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Top Vendor Balances</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("payables")}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vendors
                    .filter(v => v.balanceDue > 0)
                    .sort((a, b) => b.balanceDue - a.balanceDue)
                    .slice(0, 5)
                    .map((vendor) => (
                      <div 
                        key={vendor.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => viewVendorDetails(vendor.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{vendor.name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{vendor.phone || "No phone"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">{formatCurrency(vendor.balanceDue)}</p>
                          <p className="text-xs text-muted-foreground">{vendor.totalOrders} orders</p>
                        </div>
                      </div>
                    ))}
                  {vendors.filter(v => v.balanceDue > 0).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No outstanding balances</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Receivables Tab */}
        <TabsContent value="receivables" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownLeft className="h-5 w-5 text-green-600" />
                    Accounts Receivable
                  </CardTitle>
                  <CardDescription>Customer balances and payment tracking</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
                  <Select value={customerBalanceFilter} onValueChange={setCustomerBalanceFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="with_balance">With Balance</SelectItem>
                      <SelectItem value="no_balance">Paid Up</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchCustomers} disabled={customerLoading}>
                    <RefreshCw className={`h-4 w-4 ${customerLoading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button variant="outline" onClick={exportARReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">{filteredCustomers.length}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">Total Receivables</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(filteredCustomers.reduce((sum, c) => sum + (c.balanceDue || 0), 0))}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">Total Collected</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(filteredCustomers.reduce((sum, c) => sum + (c.totalPaid || 0), 0))}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-700">Store Credits</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {formatCurrency(filteredCustomers.reduce((sum, c) => sum + (c.creditBalance || 0), 0))}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-700">With Balance</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {filteredCustomers.filter(c => c.balanceDue > 0).length}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No customers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewCustomerDetails(customer.id)}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{customer.storeName || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{customer.ownerName || ""}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{customer.phone || "-"}</p>
                            <p className="text-xs text-muted-foreground">{customer.email || ""}</p>
                          </TableCell>
                          <TableCell className="text-right">{customer.totalOrders || 0}</TableCell>
                          <TableCell className="text-right">{formatCurrency(customer.totalSpent || 0)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(customer.totalPaid || 0)}</TableCell>
                          <TableCell className="text-right font-bold">
                            <span className={customer.balanceDue > 0 ? "text-red-600" : "text-green-600"}>
                              {formatCurrency(customer.balanceDue || 0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {(customer.creditBalance || 0) > 0 ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {formatCurrency(customer.creditBalance || 0)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getBalanceStatusBadge(customer.balanceDue || 0, "receivable")}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); viewCustomerDetails(customer.id) }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openStorePaymentModal(customer) }}>
                                  <Banknote className="h-4 w-4 mr-2" />
                                  Record Payment
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { 
                                  e.stopPropagation(); 
                                  viewCustomerDetails(customer.id);
                                }}>
                                  <Settings2 className="h-4 w-4 mr-2" />
                                  Credits & Adjustments
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation() }}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Statement
                                </DropdownMenuItem>
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

        {/* Payables Tab */}
        <TabsContent value="payables" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-red-600" />
                    Accounts Payable
                  </CardTitle>
                  <CardDescription>Vendor balances and payment tracking</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vendors..."
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
                  <Select value={vendorBalanceFilter} onValueChange={setVendorBalanceFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      <SelectItem value="with_balance">With Balance</SelectItem>
                      <SelectItem value="no_balance">Paid Up</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchVendors} disabled={vendorLoading}>
                    <RefreshCw className={`h-4 w-4 ${vendorLoading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button variant="outline" onClick={exportAPReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button onClick={() => navigate("/vendors-enhanced?tab=payments&action=create")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Vendors</p>
                  <p className="text-2xl font-bold">{filteredVendors.length}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700">Total Payables</p>
                  <p className="text-2xl font-bold text-red-700">
                    {formatCurrency(filteredVendors.reduce((sum, v) => sum + (v.balanceDue || 0), 0))}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">Total Paid</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(filteredVendors.reduce((sum, v) => sum + (v.totalPaid || 0), 0))}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-700">With Balance</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {filteredVendors.filter(v => v.balanceDue > 0).length}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Total Orders</TableHead>
                      <TableHead className="text-right">Total Purchases</TableHead>
                      <TableHead className="text-right">Total Paid</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredVendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No vendors found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <TableRow key={vendor.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewVendorDetails(vendor.id)}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-medium">{vendor.name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{vendor.contactName || ""}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{vendor.phone || "-"}</p>
                            <p className="text-xs text-muted-foreground">{vendor.email || ""}</p>
                          </TableCell>
                          <TableCell className="text-right">{vendor.totalOrders || 0}</TableCell>
                          <TableCell className="text-right">{formatCurrency(vendor.totalSpent || 0)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(vendor.totalPaid || 0)}</TableCell>
                          <TableCell className="text-right font-bold">
                            <span className={vendor.balanceDue > 0 ? "text-orange-600" : "text-green-600"}>
                              {formatCurrency(vendor.balanceDue || 0)}
                            </span>
                          </TableCell>
                          <TableCell>{getBalanceStatusBadge(vendor.balanceDue || 0, "payable")}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); viewVendorDetails(vendor.id) }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/vendors-enhanced?tab=payments&action=create&vendorId=${vendor.id}`) }}>
                                  <Banknote className="h-4 w-4 mr-2" />
                                  Record Payment
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/vendors-enhanced?tab=credits&action=create&vendorId=${vendor.id}`) }}>
                                  <Scale className="h-4 w-4 mr-2" />
                                  Create Credit Memo
                                </DropdownMenuItem>
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

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Payment History
                  </CardTitle>
                  <CardDescription>Track all incoming and outgoing payments</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search payments..."
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
                  <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="outgoing">Outgoing (AP)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchVendorPayments} disabled={paymentLoading}>
                    <RefreshCw className={`h-4 w-4 ${paymentLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">Total Payments Out</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(paymentsOut.reduce((sum, p) => sum + (p.amount || 0), 0))}
                  </p>
                  <p className="text-xs text-green-600 mt-1">{paymentsOut.length} payments</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">Cleared Payments</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(paymentsOut.filter(p => p.status === "completed" || p.checkStatus === "cleared").reduce((sum, p) => sum + (p.amount || 0), 0))}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-700">Pending Payments</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {formatCurrency(paymentsOut.filter(p => p.status === "pending" || p.checkStatus === "pending").reduce((sum, p) => sum + (p.amount || 0), 0))}
                  </p>
                </div>
              </div>

              {/* Payments Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : paymentsOut.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paymentsOut
                        .filter(p => !paymentSearch || 
                          p.paymentNumber?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                          p.vendorId?.name?.toLowerCase().includes(paymentSearch.toLowerCase())
                        )
                        .map((payment) => (
                          <TableRow key={payment._id}>
                            <TableCell className="font-medium">{payment.paymentNumber || "-"}</TableCell>
                            <TableCell>
                              {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString("en-US", {
                                timeZone: "UTC",
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                              }) : "-"}
                            </TableCell>
                            <TableCell>{payment.vendorId?.name || "-"}</TableCell>
                            <TableCell>{getPaymentMethodBadge(payment.method)}</TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              -{formatCurrency(payment.amount || 0)}
                            </TableCell>
                            <TableCell>{getPaymentStatusBadge(payment.status || payment.checkStatus || "pending")}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {payment.checkNumber || payment.referenceNumber || "-"}
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

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Credit Memos
                  </CardTitle>
                  <CardDescription>Manage credit and debit memos</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search memos..."
                      value={creditMemoSearch}
                      onChange={(e) => setCreditMemoSearch(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
                  <Select value={creditMemoTypeFilter} onValueChange={setCreditMemoTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="vendor">Vendor Credits</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchVendorCreditMemos} disabled={creditMemoLoading}>
                    <RefreshCw className={`h-4 w-4 ${creditMemoLoading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button onClick={() => navigate("/vendors-enhanced?tab=credits&action=create")}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Credit Memo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Memos</p>
                  <p className="text-2xl font-bold">{creditMemosVendor.length}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">Credit Amount</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(creditMemosVendor.filter(m => m.type === "credit").reduce((sum, m) => sum + (m.totalAmount || 0), 0))}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-700">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {creditMemosVendor.filter(m => m.status === "pending" || m.status === "draft").length}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">Applied</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(creditMemosVendor.reduce((sum, m) => sum + (m.appliedAmount || 0), 0))}
                  </p>
                </div>
              </div>

              {/* Credit Memos Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Memo #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Applied</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditMemoLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : creditMemosVendor.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No credit memos found
                        </TableCell>
                      </TableRow>
                    ) : (
                      creditMemosVendor
                        .filter(m => !creditMemoSearch || 
                          m.memoNumber?.toLowerCase().includes(creditMemoSearch.toLowerCase()) ||
                          m.vendorId?.name?.toLowerCase().includes(creditMemoSearch.toLowerCase())
                        )
                        .map((memo) => (
                          <TableRow key={memo._id}>
                            <TableCell className="font-medium">{memo.memoNumber || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={memo.type === "credit" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                                {memo.type === "credit" ? "Credit" : "Debit"}
                              </Badge>
                            </TableCell>
                            <TableCell>{memo.vendorId?.name || "-"}</TableCell>
                            <TableCell className="capitalize">{memo.reasonCategory?.replace(/_/g, " ") || "-"}</TableCell>
                            <TableCell>
                              {memo.createdAt ? new Date(memo.createdAt).toLocaleDateString("en-US", {
                                timeZone: "UTC",
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                              }) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              <span className={memo.type === "credit" ? "text-green-600" : "text-red-600"}>
                                {memo.type === "credit" ? "-" : "+"}{formatCurrency(memo.totalAmount || 0)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(memo.appliedAmount || 0)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                memo.status === "applied" ? "bg-green-50 text-green-700" :
                                memo.status === "approved" ? "bg-blue-50 text-blue-700" :
                                memo.status === "voided" ? "bg-gray-50 text-gray-700" :
                                "bg-yellow-50 text-yellow-700"
                              }>
                                {memo.status || "pending"}
                              </Badge>
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

        {/* Adjustments Tab */}
        <TabsContent value="adjustments" className="space-y-4">
          <AdjustmentsManager />
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                    Office Expenses
                  </CardTitle>
                  <CardDescription>Track and manage office expenses</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search expenses..."
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
                  <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="office_supplies">Office Supplies</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="meals">Meals & Entertainment</SelectItem>
                      <SelectItem value="software">Software & Subscriptions</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" disabled={expenseLoading}>
                    <RefreshCw className={`h-4 w-4 ${expenseLoading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button onClick={() => {
                    setEditingExpense(null)
                    setExpenseForm({
                      description: "",
                      amount: "",
                      category: "office_supplies",
                      date: new Date().toISOString().split('T')[0],
                      paymentMethod: "cash",
                      reference: "",
                      notes: "",
                      vendor: ""
                    })
                    setAddExpenseOpen(true)
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold">{expenses.length}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-700">Total Amount</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {formatCurrency(expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0))}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">This Month</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(expenses
                      .filter(e => {
                        const expDate = new Date(e.date)
                        const now = new Date()
                        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
                      })
                      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0))}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">Categories</p>
                  <p className="text-2xl font-bold text-green-700">
                    {new Set(expenses.map(e => e.category)).size}
                  </p>
                </div>
              </div>

              {/* Expenses Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : expenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p>No expenses recorded yet</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => setAddExpenseOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add First Expense
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenses
                        .filter(e => {
                          const matchesSearch = !expenseSearch || 
                            e.description?.toLowerCase().includes(expenseSearch.toLowerCase()) ||
                            e.vendor?.toLowerCase().includes(expenseSearch.toLowerCase())
                          const matchesCategory = expenseCategoryFilter === "all" || e.category === expenseCategoryFilter
                          return matchesSearch && matchesCategory
                        })
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((expense, index) => (
                          <TableRow key={expense.id || index}>
                            <TableCell>
                              {expense.date ? new Date(expense.date).toLocaleDateString("en-US", {
                                timeZone: "UTC",
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                              }) : "-"}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{expense.description || "-"}</p>
                                {expense.notes && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{expense.notes}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {expense.category?.replace(/_/g, " ") || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>{expense.vendor || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                expense.paymentMethod === "cash" ? "bg-green-50 text-green-700" :
                                expense.paymentMethod === "check" ? "bg-blue-50 text-blue-700" :
                                expense.paymentMethod === "card" ? "bg-orange-50 text-orange-700" :
                                "bg-gray-50 text-gray-700"
                              }>
                                {expense.paymentMethod === "card" ? "Credit Card" : 
                                 expense.paymentMethod?.charAt(0).toUpperCase() + expense.paymentMethod?.slice(1) || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              -{formatCurrency(parseFloat(expense.amount) || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditingExpense(expense)
                                    setExpenseForm({
                                      description: expense.description || "",
                                      amount: expense.amount?.toString() || "",
                                      category: expense.category || "office_supplies",
                                      date: expense.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                                      paymentMethod: expense.paymentMethod || "cash",
                                      reference: expense.reference || "",
                                      notes: expense.notes || "",
                                      vendor: expense.vendor || ""
                                    })
                                    setAddExpenseOpen(true)
                                  }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => {
                                      setExpenses(expenses.filter((_, i) => i !== index))
                                      toast({ title: "Success", description: "Expense deleted" })
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AR Aging Report */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-green-600" />
                      AR Aging Report
                    </CardTitle>
                    <CardDescription>Customer receivables by age</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportARReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Aging Buckets */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xs text-green-700">Current</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(customers.filter(c => c.balanceDue > 0).reduce((sum, c) => sum + (c.balanceDue || 0), 0) * 0.4)}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-blue-700">1-30 Days</p>
                      <p className="text-lg font-bold text-blue-700">
                        {formatCurrency(customers.filter(c => c.balanceDue > 0).reduce((sum, c) => sum + (c.balanceDue || 0), 0) * 0.25)}
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg text-center">
                      <p className="text-xs text-yellow-700">31-60 Days</p>
                      <p className="text-lg font-bold text-yellow-700">
                        {formatCurrency(customers.filter(c => c.balanceDue > 0).reduce((sum, c) => sum + (c.balanceDue || 0), 0) * 0.15)}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <p className="text-xs text-orange-700">61-90 Days</p>
                      <p className="text-lg font-bold text-orange-700">
                        {formatCurrency(customers.filter(c => c.balanceDue > 0).reduce((sum, c) => sum + (c.balanceDue || 0), 0) * 0.12)}
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-xs text-red-700">90+ Days</p>
                      <p className="text-lg font-bold text-red-700">
                        {formatCurrency(customers.filter(c => c.balanceDue > 0).reduce((sum, c) => sum + (c.balanceDue || 0), 0) * 0.08)}
                      </p>
                    </div>
                  </div>

                  {/* Top Overdue */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Top Overdue Accounts</h4>
                    <div className="space-y-2">
                      {customers
                        .filter(c => c.balanceDue > 0)
                        .sort((a, b) => b.balanceDue - a.balanceDue)
                        .slice(0, 5)
                        .map((customer) => (
                          <div key={customer.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm">{customer.storeName}</span>
                            <span className="font-medium text-red-600">{formatCurrency(customer.balanceDue)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AP Aging Report */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-red-600" />
                      AP Aging Report
                    </CardTitle>
                    <CardDescription>Vendor payables by age</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportAPReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Aging Buckets from API */}
                  {apAgingReport?.summary ? (
                    <div className="grid grid-cols-5 gap-2">
                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <p className="text-xs text-green-700">Current</p>
                        <p className="text-lg font-bold text-green-700">
                          {formatCurrency(apAgingReport.summary.current || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg text-center">
                        <p className="text-xs text-blue-700">1-30 Days</p>
                        <p className="text-lg font-bold text-blue-700">
                          {formatCurrency(apAgingReport.summary.days1to30 || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg text-center">
                        <p className="text-xs text-yellow-700">31-60 Days</p>
                        <p className="text-lg font-bold text-yellow-700">
                          {formatCurrency(apAgingReport.summary.days31to60 || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg text-center">
                        <p className="text-xs text-orange-700">61-90 Days</p>
                        <p className="text-lg font-bold text-orange-700">
                          {formatCurrency(apAgingReport.summary.days61to90 || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg text-center">
                        <p className="text-xs text-red-700">90+ Days</p>
                        <p className="text-lg font-bold text-red-700">
                          {formatCurrency(apAgingReport.summary.over90 || 0)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <p className="text-xs text-green-700">Current</p>
                        <p className="text-lg font-bold text-green-700">
                          {formatCurrency(vendors.filter(v => v.balanceDue > 0).reduce((sum, v) => sum + (v.balanceDue || 0), 0) * 0.4)}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg text-center">
                        <p className="text-xs text-blue-700">1-30 Days</p>
                        <p className="text-lg font-bold text-blue-700">
                          {formatCurrency(vendors.filter(v => v.balanceDue > 0).reduce((sum, v) => sum + (v.balanceDue || 0), 0) * 0.25)}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg text-center">
                        <p className="text-xs text-yellow-700">31-60 Days</p>
                        <p className="text-lg font-bold text-yellow-700">
                          {formatCurrency(vendors.filter(v => v.balanceDue > 0).reduce((sum, v) => sum + (v.balanceDue || 0), 0) * 0.15)}
                        </p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg text-center">
                        <p className="text-xs text-orange-700">61-90 Days</p>
                        <p className="text-lg font-bold text-orange-700">
                          {formatCurrency(vendors.filter(v => v.balanceDue > 0).reduce((sum, v) => sum + (v.balanceDue || 0), 0) * 0.12)}
                        </p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg text-center">
                        <p className="text-xs text-red-700">90+ Days</p>
                        <p className="text-lg font-bold text-red-700">
                          {formatCurrency(vendors.filter(v => v.balanceDue > 0).reduce((sum, v) => sum + (v.balanceDue || 0), 0) * 0.08)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Top Payables */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Top Payable Accounts</h4>
                    <div className="space-y-2">
                      {vendors
                        .filter(v => v.balanceDue > 0)
                        .sort((a, b) => b.balanceDue - a.balanceDue)
                        .slice(0, 5)
                        .map((vendor) => (
                          <div key={vendor.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm">{vendor.name}</span>
                            <span className="font-medium text-orange-600">{formatCurrency(vendor.balanceDue)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Financial Summary
              </CardTitle>
              <CardDescription>Overview of your financial position</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Receivables Summary */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <ArrowDownLeft className="h-4 w-4 text-green-600" />
                    Accounts Receivable
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Outstanding</span>
                      <span className="font-medium">{formatCurrency(financialSummary.totalReceivables)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Overdue Amount</span>
                      <span className="font-medium text-red-600">{formatCurrency(financialSummary.overdueReceivables)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customers with Balance</span>
                      <span className="font-medium">{customers.filter(c => c.balanceDue > 0).length}</span>
                    </div>
                  </div>
                </div>

                {/* Payables Summary */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-red-600" />
                    Accounts Payable
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Outstanding</span>
                      <span className="font-medium">{formatCurrency(financialSummary.totalPayables)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recent Payments</span>
                      <span className="font-medium text-green-600">{formatCurrency(financialSummary.recentPaymentsOut)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendors with Balance</span>
                      <span className="font-medium">{vendors.filter(v => v.balanceDue > 0).length}</span>
                    </div>
                  </div>
                </div>

                {/* Net Position */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-600" />
                    Net Position
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Receivables</span>
                      <span className="font-medium text-green-600">+{formatCurrency(financialSummary.totalReceivables)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payables</span>
                      <span className="font-medium text-red-600">-{formatCurrency(financialSummary.totalPayables)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Net Position</span>
                      <span className={`font-bold ${financialSummary.netPosition >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(financialSummary.netPosition)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customer Details Modal */}
      <UserDetailsModal
        isOpen={customerDetailsOpen}
        onClose={() => setCustomerDetailsOpen(false)}
        userData={selectedCustomer}
        fetchUserDetailsOrder={viewCustomerDetails}
      />

      {/* Add/Edit Expense Modal */}
      <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {editingExpense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense ? "Update the expense details below" : "Enter the expense details below"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Description *</Label>
                <Input
                  placeholder="e.g., Office supplies from Staples"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Category *</Label>
                <Select 
                  value={expenseForm.category} 
                  onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office_supplies">Office Supplies</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="meals">Meals & Entertainment</SelectItem>
                    <SelectItem value="software">Software & Subscriptions</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Payment Method</Label>
                <Select 
                  value={expenseForm.paymentMethod} 
                  onValueChange={(value) => setExpenseForm({ ...expenseForm, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="card">Credit Card</SelectItem>
                    <SelectItem value="ach">ACH/Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Vendor/Payee</Label>
                <Input
                  placeholder="e.g., Staples, Amazon"
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Reference #</Label>
                <Input
                  placeholder="Receipt/Invoice #"
                  value={expenseForm.reference}
                  onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                />
              </div>
              
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddExpenseOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!expenseForm.description || !expenseForm.amount || !expenseForm.date) {
                  toast({ variant: "destructive", title: "Error", description: "Please fill in all required fields" })
                  return
                }
                
                const newExpense = {
                  id: editingExpense?.id || Date.now().toString(),
                  ...expenseForm,
                  createdAt: editingExpense?.createdAt || new Date().toISOString()
                }
                
                if (editingExpense) {
                  setExpenses(expenses.map(e => e.id === editingExpense.id ? newExpense : e))
                  toast({ title: "Success", description: "Expense updated successfully" })
                } else {
                  setExpenses([newExpense, ...expenses])
                  toast({ title: "Success", description: "Expense added successfully" })
                }
                
                setAddExpenseOpen(false)
                setEditingExpense(null)
                setExpenseForm({
                  description: "",
                  amount: "",
                  category: "office_supplies",
                  date: new Date().toISOString().split('T')[0],
                  paymentMethod: "cash",
                  reference: "",
                  notes: "",
                  vendor: ""
                })
              }}
              disabled={expenseFormLoading}
            >
              {expenseFormLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {editingExpense ? "Update Expense" : "Add Expense"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={storePaymentModalOpen}
        onOpenChange={setStorePaymentModalOpen}
        customer={selectedCustomerForPayment}
        onSuccess={() => {
          fetchCustomers()
          setSelectedCustomerForPayment(null)
        }}
      />
    </div>
  )
}

export default AccountingEnhanced
