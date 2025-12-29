"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search, Plus, RefreshCw, Eye, Edit, Trash2, Ban,
  DollarSign, Package, Users, CheckCircle, Clock,
  TrendingUp, Building2, Phone, Mail, ChevronDown,
  Calendar, ArrowUpDown, MoreVertical, Settings2,
  Receipt, FileText, AlertCircle, CreditCard
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import { getAllVendorsAPI, deleteVendorAPI, createVendorAPI, updateVendorAPI } from "@/services2/operations/vendor"
import { getAllPurchaseOrdersAPI } from "@/services2/operations/purchaseOrder"
import { getAllInvoicesAPI, createInvoiceAPI } from "@/services2/operations/vendorInvoice"
import { vendorWithOrderDetails } from "@/services2/operations/auth"
import { PaymentStatusPopup } from "@/components/orders/PaymentUpdateModel"
import DateFilterDialog from "@/components/orders/DateFilterPopup"
import Sidebar from "@/components/layout/Sidebar"
import UserDetailsModal from "@/components/admin/user-details-modal"
import CreateInvoiceModal from "@/components/vendors/CreateInvoiceModal"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"

// Lazy load the enhanced version
import VendorsEnhanced from "./VendorsEnhanced"

// Stats Card Component
const StatsCard = ({ title, value, subtitle, icon: Icon, color = "blue", trend, trendValue }: any) => {
  const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
    green: { bg: "bg-green-50", text: "text-green-600", iconBg: "bg-green-100" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", iconBg: "bg-orange-100" },
    red: { bg: "bg-red-50", text: "text-red-600", iconBg: "bg-red-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", iconBg: "bg-purple-100" },
  }

  const colors = colorClasses[color] || colorClasses.blue

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className={`${colors.bg} p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className={`text-2xl font-bold mt-1 ${colors.text}`}>{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
              {trend && (
                <div className={`flex items-center mt-2 text-xs ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                  <TrendingUp className={`h-3 w-3 mr-1 ${trend === "down" ? "rotate-180" : ""}`} />
                  {trendValue}
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl ${colors.iconBg}`}>
              <Icon className={`h-6 w-6 ${colors.text}`} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const VendorsSimplified = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [useAdvancedMode, setUseAdvancedMode] = useState(() => {
    // Check localStorage for saved preference
    return localStorage.getItem("vendorViewMode") === "advanced"
  })

  const toggleViewMode = () => {
    const newMode = !useAdvancedMode
    setUseAdvancedMode(newMode)
    localStorage.setItem("vendorViewMode", newMode ? "advanced" : "simple")
  }

  // If advanced mode, render the enhanced version
  if (useAdvancedMode) {
    return (
      <div className="relative">
        {/* Floating toggle button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={toggleViewMode}
            className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Switch to Simple View
          </Button>
        </div>
        <VendorsEnhanced />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 overflow-auto relative">
        {/* Floating toggle button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={toggleViewMode}
            className="rounded-full shadow-lg bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Switch to Advanced View
          </Button>
        </div>
        <VendorContent />
      </div>
    </div>
  )
}

const VendorContent = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  // Tab state
  const [activeTab, setActiveTab] = useState("vendors")

  // Vendors state
  const [vendors, setVendors] = useState<any[]>([])
  const [vendorSearch, setVendorSearch] = useState("")
  const [vendorLoading, setVendorLoading] = useState(false)

  // Purchase Orders state
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [poSearch, setPoSearch] = useState("")
  const [poPaymentFilter, setPoPaymentFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [poLoading, setPoLoading] = useState(false)
  const [poSummary, setPoSummary] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Invoice state
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState("")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all")
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoiceCreateLoading, setInvoiceCreateLoading] = useState(false)

  // Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  // Vendor Details Modal
  const [vendorDetailsOpen, setVendorDetailsOpen] = useState(false)
  const [selectedVendorData, setSelectedVendorData] = useState<any>(null)

  // Vendor Create/Edit Modal
  const [vendorModalOpen, setVendorModalOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<any>(null)
  const [vendorForm, setVendorForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    productsSupplied: "",
    notes: ""
  })
  const [vendorSaving, setVendorSaving] = useState(false)

  // Sort state
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Fetch vendors
  const fetchVendors = async () => {
    setVendorLoading(true)
    try {
      const response = await getAllVendorsAPI()
      setVendors(response?.data || [])
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
      if (invoiceSearch) params.search = invoiceSearch
      const data = await getAllInvoicesAPI(params, token)
      setInvoices(data?.invoices || [])
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setInvoiceLoading(false)
    }
  }

  // Get linked PO IDs (already linked to invoices)
  const getLinkedPOIds = (): Set<string> => {
    const linkedIds = new Set<string>()
    invoices.forEach((invoice: any) => {
      invoice.linkedPurchaseOrders?.forEach((poId: string) => {
        linkedIds.add(poId)
      })
    })
    return linkedIds
  }

  // Handle create invoice
  const handleCreateInvoice = async (formData: any) => {
    setInvoiceCreateLoading(true)
    try {
      const result = await createInvoiceAPI(formData, token)
      if (result) {
        setInvoiceModalOpen(false)
        fetchInvoices()
        fetchPurchaseOrders()
        toast({ title: "Success", description: "Invoice created successfully" })
      }
    } catch (error) {
      console.error("Error creating invoice:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to create invoice" })
    } finally {
      setInvoiceCreateLoading(false)
    }
  }
  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    setPoLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", currentPage.toString())
      params.append("limit", "50")
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
    fetchVendors()
    fetchPurchaseOrders()
    fetchInvoices()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchPurchaseOrders(), 500)
    return () => clearTimeout(timer)
  }, [poSearch, poPaymentFilter, startDate, endDate, currentPage])

  useEffect(() => {
    const timer = setTimeout(() => fetchInvoices(), 500)
    return () => clearTimeout(timer)
  }, [invoiceSearch, invoiceStatusFilter])

  // Filter vendors
  const filteredVendors = vendors.filter((vendor) => {
    return (
      vendor.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      vendor.contactName?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      vendor.phone?.includes(vendorSearch)
    )
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

  // Sorted purchase orders
  const sortedPurchaseOrders = [...purchaseOrders].sort((a, b) => {
    if (!sortField) return 0
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (sortDirection === "asc") return aVal > bVal ? 1 : -1
    return aVal < bVal ? 1 : -1
  })

  // Transform vendor data for details modal
  const transformVendorWithOrders = (data: any) => ({
    _id: data._id,
    totalOrders: data.totalOrders,
    totalSpent: data.totalSpent,
    balanceDue: data.balanceDue,
    totalPay: data.totalPay,
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
  })

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

  // Vendor CRUD
  const openVendorModal = (vendor?: any) => {
    if (vendor) {
      setEditingVendor(vendor)
      setVendorForm({
        name: vendor.name || "",
        contactName: vendor.contactName || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        address: vendor.address || "",
        productsSupplied: vendor.productsSupplied || "",
        notes: vendor.notes || ""
      })
    } else {
      setEditingVendor(null)
      setVendorForm({ name: "", contactName: "", email: "", phone: "", address: "", productsSupplied: "", notes: "" })
    }
    setVendorModalOpen(true)
  }

  const handleSaveVendor = async () => {
    if (!vendorForm.name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Vendor name is required" })
      return
    }
    setVendorSaving(true)
    try {
      if (editingVendor) {
        await updateVendorAPI(editingVendor._id, vendorForm, token)
        toast({ title: "Success", description: "Vendor updated" })
      } else {
        await createVendorAPI(vendorForm, token)
        toast({ title: "Success", description: "Vendor created" })
      }
      setVendorModalOpen(false)
      fetchVendors()
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save vendor" })
    } finally {
      setVendorSaving(false)
    }
  }

  const handleDeactivateVendor = async (id: string) => {
    const reason = prompt("Reason for deactivating this vendor:")
    if (!reason) return
    try {
      await deleteVendorAPI(id, token)
      toast({ title: "Success", description: "Vendor deactivated" })
      fetchVendors()
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to deactivate vendor" })
    }
  }

  // Calculate summary stats
  const totalOwed = poSummary?.totalUnpaid || purchaseOrders.filter(po => po.paymentStatus !== "paid").reduce((sum, po) => sum + (po.totalAmount || 0), 0)
  const totalPaid = poSummary?.totalPaid || purchaseOrders.filter(po => po.paymentStatus === "paid").reduce((sum, po) => sum + (po.totalAmount || 0), 0)

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      partial: "bg-yellow-100 text-yellow-800",
      unpaid: "bg-red-100 text-red-800",
    }
    return <Badge className={styles[status] || "bg-gray-100"}>{status}</Badge>
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-muted-foreground">Manage vendors, purchases, invoices and payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setInvoiceModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Receipt className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
          <Button onClick={() => navigate("/vendors/new-purchase")} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
          <Button onClick={() => { fetchVendors(); fetchPurchaseOrders(); fetchInvoices(); }} variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Vendors"
          value={vendors.length}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Purchase Orders"
          value={purchaseOrders.length}
          icon={Package}
          color="green"
        />
        <StatsCard
          title="Invoices"
          value={invoices.length}
          subtitle={`${invoices.filter((i: any) => i.status === 'pending').length} pending`}
          icon={Receipt}
          color="purple"
        />
        <StatsCard
          title="Amount Paid"
          value={formatCurrency(totalPaid)}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Pending Payment"
          value={formatCurrency(totalOwed)}
          icon={AlertCircle}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b px-4 pt-4">
            <TabsList className="grid w-full max-w-2xl grid-cols-2 h-12">
              <TabsTrigger value="vendors" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Vendors</span>
              </TabsTrigger>
              <TabsTrigger value="purchases" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Purchase Orders</span>
              </TabsTrigger>
              {/* <TabsTrigger value="invoices" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Invoices</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger> */}
            </TabsList>
          </div>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Vendors</h3>
              <p className="text-sm text-muted-foreground">Your suppliers and their contact info</p>
            </div>
            <Button onClick={() => openVendorModal()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {vendorLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredVendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No vendors found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendors.map((vendor) => (
                      <TableRow key={vendor._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {vendor.name}
                          </div>
                        </TableCell>
                        <TableCell>{vendor.contactName || "-"}</TableCell>
                        <TableCell>
                          {vendor.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {vendor.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {vendor.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {vendor.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {vendor.productsSupplied || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => fetchVendorDetails(vendor._id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openVendorModal(vendor)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeactivateVendor(vendor._id)}
                                className="text-red-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Deactivate
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
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchases" className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Purchase Orders</h3>
              <p className="text-sm text-muted-foreground">Track what you've ordered from vendors</p>
            </div>
            <Button onClick={() => navigate("/vendors/new-purchase")} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              New Purchase Order
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PO#, vendor..."
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="pl-10"
              />
            </div>
                <Select value={poPaymentFilter} onValueChange={setPoPaymentFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
                <DateFilterDialog
                  startDate={startDate}
                  endDate={endDate}
                  setStartDate={setStartDate}
                  setEndDate={setEndDate}
                  onReset={handleResetDates}
                />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort("purchaseOrderNumber")}
                  >
                    PO # <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort("purchaseDate")}
                  >
                    Date <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer text-right"
                    onClick={() => handleSort("totalAmount")}
                  >
                    Amount <ArrowUpDown className="inline h-3 w-3 ml-1" />
                  </TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : sortedPurchaseOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No purchase orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedPurchaseOrders.map((po) => (
                      <TableRow key={po._id}>
                        <TableCell className="font-mono font-medium">
                          {po.purchaseOrderNumber}
                        </TableCell>
                        <TableCell>{po.vendorName}</TableCell>
                        <TableCell>
                          {po.purchaseDate ? new Date(po.purchaseDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(po.totalAmount)}
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(po.paymentStatus)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${po._id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {po.paymentStatus !== "paid" && (
                                <DropdownMenuItem onClick={() => handlePayment(po)}>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Record Payment
                                </DropdownMenuItem>
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
        </TabsContent>

        {/* Payments Tab - Simple Payment History */}
        <TabsContent value="payments" className="p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <p className="text-sm text-muted-foreground">Recent payments to vendors</p>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders
                  .filter(po => po.paymentStatus === "paid" || po.paymentStatus === "partial")
                    .slice(0, 20)
                    .map((po) => (
                      <TableRow key={po._id}>
                        <TableCell className="font-mono">{po.purchaseOrderNumber}</TableCell>
                        <TableCell>{po.vendorName}</TableCell>
                        <TableCell>
                          {po.paymentDetails?.paidAt 
                            ? new Date(po.paymentDetails.paidAt).toLocaleDateString()
                            : po.purchaseDate 
                              ? new Date(po.purchaseDate).toLocaleDateString()
                              : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(po.paymentAmount || po.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {po.paymentDetails?.method || "Cash"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(po.paymentStatus)}</TableCell>
                      </TableRow>
                    ))
                }
                {purchaseOrders.filter(po => po.paymentStatus === "paid" || po.paymentStatus === "partial").length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No payments recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Vendor Invoices
              </h3>
              <p className="text-sm text-muted-foreground">Track and manage invoices from your vendors</p>
            </div>
            <Button onClick={() => setInvoiceModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchInvoices}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[120px]">Invoice #</TableHead>
                  <TableHead className="w-[130px]">Vendor</TableHead>
                  <TableHead className="w-[70px] text-center">POs</TableHead>
                  <TableHead className="w-[90px]">Date</TableHead>
                  <TableHead className="w-[90px]">Due Date</TableHead>
                  <TableHead className="w-[100px] text-right">Amount</TableHead>
                  <TableHead className="w-[80px] text-center">Status</TableHead>
                  <TableHead className="w-[80px] text-center">Matching</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <Receipt className="h-12 w-12 opacity-30" />
                        <div>
                          <p className="font-medium">No invoices found</p>
                          <p className="text-sm">Create your first invoice to get started</p>
                        </div>
                        <Button onClick={() => setInvoiceModalOpen(true)} variant="outline" className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Invoice
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice: any) => {
                    const linkedPOCount = invoice.linkedPurchaseOrders?.length || 0;
                    
                    return (
                    <TableRow key={invoice._id}>
                      <TableCell className="font-mono font-medium text-sm">
                        {invoice.invoiceNumber || `INV-${invoice._id?.slice(-6)}`}
                      </TableCell>
                      <TableCell>
                        <span className="truncate block max-w-[120px] text-sm">{invoice.vendor?.name || invoice.vendorId?.name || "-"}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {linkedPOCount > 0 ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            {linkedPOCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(invoice.totalAmount || invoice.invoiceSettledAmount || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-xs ${
                          invoice.status === "paid" ? "bg-green-100 text-green-800" :
                          invoice.status === "approved" ? "bg-blue-100 text-blue-800" :
                          invoice.status === "disputed" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {invoice.status || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${
                          invoice.matchingStatus === "matched" ? "border-green-500 text-green-700" :
                          invoice.matchingStatus === "partial" ? "border-yellow-500 text-yellow-700" :
                          "border-gray-300 text-gray-600"
                        }`}>
                          {invoice.matchingStatus === "matched" ? "Matched" : invoice.matchingStatus === "partial" ? "Partial" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/vendors/invoice/${invoice._id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/vendors/invoice/${invoice._id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Invoice
                            </DropdownMenuItem>
                            {invoice.status !== "paid" && (invoice.remainingAmount > 0 || !invoice.paidAmount) && (
                              <DropdownMenuItem onClick={() => navigate(`/vendors/payment/${invoice._id}`)}>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Record Payment
                              </DropdownMenuItem>
                            )}
                            {invoice.status === "pending" && (
                              <DropdownMenuItem>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
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
          </div>
        </TabsContent>
        </Tabs>
      </div>

      {/* Vendor Create/Edit Modal */}
      <Dialog open={vendorModalOpen} onOpenChange={setVendorModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendor Name *</Label>
              <Input
                value={vendorForm.name}
                onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                placeholder="e.g., Green Valley Farms"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input
                  value={vendorForm.contactName}
                  onChange={(e) => setVendorForm({ ...vendorForm, contactName: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={vendorForm.phone}
                  onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={vendorForm.email}
                onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                placeholder="vendor@example.com"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={vendorForm.address}
                onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                placeholder="123 Farm Road, City, State"
              />
            </div>
            <div>
              <Label>Products Supplied</Label>
              <Input
                value={vendorForm.productsSupplied}
                onChange={(e) => setVendorForm({ ...vendorForm, productsSupplied: e.target.value })}
                placeholder="e.g., Apples, Oranges, Lettuce"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={vendorForm.notes}
                onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVendorModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveVendor} disabled={vendorSaving}>
              {vendorSaving ? "Saving..." : editingVendor ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      {selectedOrder && (
        <PaymentStatusPopup
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setSelectedOrder(null)
          }}
          order={selectedOrder}
          onUpdate={() => {
            fetchPurchaseOrders()
            setPaymentModalOpen(false)
            setSelectedOrder(null)
          }}
          type="vendor"
        />
      )}

      {/* Vendor Details Modal */}
      {selectedVendorData && (
        <UserDetailsModal
          isOpen={vendorDetailsOpen}
          onClose={() => {
            setVendorDetailsOpen(false)
            setSelectedVendorData(null)
          }}
          userData={selectedVendorData}
          onPaymentUpdate={() => {
            fetchPurchaseOrders()
            fetchVendors()
          }}
          type="vendor"
        />
      )}

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        open={invoiceModalOpen}
        onOpenChange={setInvoiceModalOpen}
        vendors={vendors}
        purchaseOrders={purchaseOrders}
        linkedPOIds={getLinkedPOIds()}
        onCreateInvoice={handleCreateInvoice}
        loading={invoiceCreateLoading}
      />
    </div>
  )
}

export default VendorsSimplified
