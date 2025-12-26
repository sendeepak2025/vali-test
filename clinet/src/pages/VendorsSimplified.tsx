"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search, Plus, RefreshCw, Eye, Edit, Trash2, Ban,
  DollarSign, Package, Users, CheckCircle, Clock,
  TrendingUp, Building2, Phone, Mail, ChevronDown,
  Calendar, ArrowUpDown, MoreVertical, Settings2
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
import { vendorWithOrderDetails } from "@/services2/operations/auth"
import { PaymentStatusPopup } from "@/components/orders/PaymentUpdateModel"
import DateFilterDialog from "@/components/orders/DateFilterPopup"
import Sidebar from "@/components/layout/Sidebar"
import UserDetailsModal from "@/components/admin/user-details-modal"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"

// Lazy load the enhanced version
import VendorsEnhanced from "./VendorsEnhanced"

// Stats Card Component
const StatsCard = ({ title, value, subtitle, icon: Icon, color = "blue" }: any) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
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
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchPurchaseOrders(), 500)
    return () => clearTimeout(timer)
  }, [poSearch, poPaymentFilter, startDate, endDate, currentPage])

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground">Manage vendors, purchases, and payments</p>
        </div>
        <Button onClick={() => fetchVendors()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          title="Total Paid"
          value={formatCurrency(totalPaid)}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Outstanding"
          value={formatCurrency(totalOwed)}
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vendors">
            <Users className="h-4 w-4 mr-2" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="purchases">
            <Package className="h-4 w-4 mr-2" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="payments">
            <DollarSign className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
        </TabsList>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vendors</CardTitle>
                <CardDescription>Your suppliers and their contact info</CardDescription>
              </div>
              <Button onClick={() => openVendorModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </CardHeader>
            <CardContent>
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

              <Table>
                <TableHeader>
                  <TableRow>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Purchase Orders</CardTitle>
                  <CardDescription>Track what you've ordered from vendors</CardDescription>
                </div>
                <Button onClick={() => navigate("/vendors/new-purchase")}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Purchase Order
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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

              <Table>
                <TableHeader>
                  <TableRow>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab - Simple Payment History */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Recent payments to vendors</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  )
}

export default VendorsSimplified
