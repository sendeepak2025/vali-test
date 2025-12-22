"use client"

import React, { useEffect, useState } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Navbar from "@/components/layout/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import {
  CreditCard, Search, RefreshCw, Plus, Eye, Trash2, CheckCircle,
  XCircle, Clock, AlertTriangle, DollarSign, Building2, Calendar,
  FileText, Filter, Download, Edit, Ban
} from "lucide-react"
import {
  getAllMembersAPI, userWithOrderDetails, getChequesByStoreAPI,
  deleteChequeAPI, updateChequeStatusAPI, getAllChequesAPI
} from "@/services2/operations/auth"
import ChequeModal from "./ChequeModal"

const StatsCard = ({ title, value, subtitle, icon: Icon, color = "blue" }: any) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    red: "bg-red-50 text-red-600 border-red-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  }
  return (
    <Card className={`border ${colorClasses[color].split(' ')[2]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-full ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const StoreChequePaymentEnhanced = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { toast } = useToast()

  // Data states
  const [stores, setStores] = useState<any[]>([])
  const [allCheques, setAllCheques] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [loading, setLoading] = useState(true)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("reconciliation")

  // Modal states
  const [chequeModalOpen, setChequeModalOpen] = useState(false)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [selectedCheque, setSelectedCheque] = useState<any>(null)
  const [storeCheques, setStoreCheques] = useState<any[]>([])
  const [storeChequesOpen, setStoreChequesOpen] = useState(false)
  const [selectedStoreName, setSelectedStoreName] = useState("")

  // Status update modal
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [chequeToUpdate, setChequeToUpdate] = useState<any>(null)
  const [newStatus, setNewStatus] = useState("")
  const [clearedDate, setClearedDate] = useState("")
  const [bankReference, setBankReference] = useState("")

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [chequeToDelete, setChequeToDelete] = useState<any>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch stores
      const membersData = await getAllMembersAPI()
      const storesList = membersData?.filter((m: any) => m.role === "store") || []
      setStores(storesList)

      // Fetch all cheques for reconciliation
      const chequesData = await getAllChequesAPI()
      setAllCheques(chequesData?.cheques || [])
      setSummary(chequesData?.summary || {})
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const fetchStoreCheques = async (storeId: string, storeName: string) => {
    try {
      const cheques = await getChequesByStoreAPI(storeId)
      setStoreCheques(cheques)
      setSelectedStoreId(storeId)
      setSelectedStoreName(storeName)
      setStoreChequesOpen(true)
    } catch (error) {
      console.error("Error fetching store cheques:", error)
    }
  }

  const handleAddCheque = (storeId: string) => {
    setSelectedStoreId(storeId)
    setSelectedCheque(null)
    setChequeModalOpen(true)
  }

  const handleEditCheque = (cheque: any) => {
    setSelectedCheque(cheque)
    setChequeModalOpen(true)
  }

  const handleDeleteClick = (cheque: any) => {
    setChequeToDelete(cheque)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!chequeToDelete) return
    const result = await deleteChequeAPI(chequeToDelete.storeId || selectedStoreId, chequeToDelete._id)
    if (result) {
      fetchData()
      if (storeChequesOpen && selectedStoreId) {
        fetchStoreCheques(selectedStoreId, selectedStoreName)
      }
    }
    setDeleteDialogOpen(false)
    setChequeToDelete(null)
  }

  const handleStatusClick = (cheque: any) => {
    setChequeToUpdate(cheque)
    setNewStatus(cheque.status || "pending")
    setClearedDate(cheque.clearedDate ? new Date(cheque.clearedDate).toISOString().split('T')[0] : "")
    setBankReference(cheque.bankReference || "")
    setStatusModalOpen(true)
  }

  const confirmStatusUpdate = async () => {
    if (!chequeToUpdate) return
    const result = await updateChequeStatusAPI(
      chequeToUpdate.storeId || selectedStoreId,
      chequeToUpdate._id,
      { status: newStatus, clearedDate, bankReference }
    )
    if (result) {
      fetchData()
      if (storeChequesOpen && selectedStoreId) {
        fetchStoreCheques(selectedStoreId, selectedStoreName)
      }
    }
    setStatusModalOpen(false)
    setChequeToUpdate(null)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pending" },
      cleared: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Cleared" },
      bounced: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Bounced" },
      cancelled: { color: "bg-gray-100 text-gray-800", icon: Ban, label: "Cancelled" },
    }
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const filteredCheques = allCheques.filter(c => {
    const matchesSearch = !searchQuery ||
      c.chequeNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.storeName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredStores = stores.filter(s =>
    !searchQuery ||
    s.storeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-primary" />
                  Cheque Management & Reconciliation
                </h1>
                <p className="text-sm text-muted-foreground">Track, reconcile, and manage customer cheques</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatsCard title="Total Cheques" value={summary.total || 0} icon={FileText} color="blue" />
              <StatsCard title="Pending" value={summary.pending || 0} subtitle={formatCurrency(summary.pendingAmount || 0)} icon={Clock} color="orange" />
              <StatsCard title="Cleared" value={summary.cleared || 0} subtitle={formatCurrency(summary.clearedAmount || 0)} icon={CheckCircle} color="green" />
              <StatsCard title="Bounced" value={summary.bounced || 0} icon={XCircle} color="red" />
              <StatsCard title="Cancelled" value={summary.cancelled || 0} icon={Ban} color="gray" />
              <StatsCard title="Total Amount" value={formatCurrency(summary.totalAmount || 0)} icon={DollarSign} color="purple" />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="reconciliation" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Reconciliation
                </TabsTrigger>
                <TabsTrigger value="stores" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  By Store
                </TabsTrigger>
              </TabsList>

              {/* Reconciliation Tab */}
              <TabsContent value="reconciliation" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <CardTitle className="text-lg">All Cheques</CardTitle>
                      <div className="flex gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Search cheque #, store..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-[200px]" />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-[140px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="cleared">Cleared</SelectItem>
                            <SelectItem value="bounced">Bounced</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cheque #</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Cleared Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                          ) : filteredCheques.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No cheques found</TableCell></TableRow>
                          ) : (
                            filteredCheques.map((cheque) => (
                              <TableRow key={cheque._id}>
                                <TableCell className="font-medium">{cheque.chequeNumber}</TableCell>
                                <TableCell>{cheque.storeName || "N/A"}</TableCell>
                                <TableCell className="font-medium">{formatCurrency(cheque.amount)}</TableCell>
                                <TableCell>{formatDate(cheque.date)}</TableCell>
                                <TableCell>{getStatusBadge(cheque.status || "pending")}</TableCell>
                                <TableCell>{cheque.clearedDate ? formatDate(cheque.clearedDate) : "-"}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleStatusClick(cheque)} title="Update Status">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(cheque)} className="text-red-600 hover:text-red-700" title="Delete">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
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

              {/* Stores Tab */}
              <TabsContent value="stores" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Stores</CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search stores..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-[200px]" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Store Name</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow><TableCell colSpan={3} className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                          ) : filteredStores.length === 0 ? (
                            <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No stores found</TableCell></TableRow>
                          ) : (
                            filteredStores.map((store) => (
                              <TableRow key={store._id}>
                                <TableCell className="font-medium">{store.storeName || "N/A"}</TableCell>
                                <TableCell>{store.ownerName || "N/A"}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" onClick={() => handleAddCheque(store._id)}>
                                      <Plus className="h-4 w-4 mr-1" />Add Cheque
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => fetchStoreCheques(store._id, store.storeName)}>
                                      <Eye className="h-4 w-4 mr-1" />View Cheques
                                    </Button>
                                  </div>
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
            </Tabs>
          </div>
        </main>
      </div>

      {/* Store Cheques Dialog */}
      <Dialog open={storeChequesOpen} onOpenChange={setStoreChequesOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Cheques for {selectedStoreName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {storeCheques.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No cheques found for this store</p>
            ) : (
              <div className="space-y-3">
                {storeCheques.map((cheque) => (
                  <div key={cheque._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">#{cheque.chequeNumber}</span>
                        {getStatusBadge(cheque.status || "pending")}
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{formatCurrency(cheque.amount)}</span>
                        <span>{formatDate(cheque.date)}</span>
                        {cheque.notes && <span className="truncate max-w-[200px]">{cheque.notes}</span>}
                      </div>
                      {cheque.images && cheque.images.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {cheque.images.slice(0, 3).map((img: string, idx: number) => (
                            <img key={idx} src={img} alt="Cheque" className="w-16 h-16 object-cover rounded border" />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleStatusClick({ ...cheque, storeId: selectedStoreId })} title="Update Status">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditCheque(cheque)} title="Edit">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick({ ...cheque, storeId: selectedStoreId })} className="text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreChequesOpen(false)}>Close</Button>
            <Button onClick={() => { setStoreChequesOpen(false); handleAddCheque(selectedStoreId!) }}>
              <Plus className="h-4 w-4 mr-1" />Add Cheque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Cheque Status</DialogTitle>
            <DialogDescription>
              Update the reconciliation status for cheque #{chequeToUpdate?.chequeNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-yellow-600" />Pending</div>
                  </SelectItem>
                  <SelectItem value="cleared">
                    <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" />Cleared</div>
                  </SelectItem>
                  <SelectItem value="bounced">
                    <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600" />Bounced</div>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <div className="flex items-center gap-2"><Ban className="h-4 w-4 text-gray-600" />Cancelled</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newStatus === "cleared" && (
              <div>
                <Label>Cleared Date</Label>
                <Input type="date" value={clearedDate} onChange={(e) => setClearedDate(e.target.value)} />
              </div>
            )}
            <div>
              <Label>Bank Reference (Optional)</Label>
              <Input placeholder="Enter bank reference number" value={bankReference} onChange={(e) => setBankReference(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmStatusUpdate}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cheque?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete cheque #{chequeToDelete?.chequeNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Cheque Modal */}
      {chequeModalOpen && (
        <ChequeModal
          isOpen={chequeModalOpen}
          onClose={() => setChequeModalOpen(false)}
          storeId={selectedStoreId}
          cheque={selectedCheque}
          onSuccess={() => {
            fetchData()
            if (storeChequesOpen && selectedStoreId) {
              fetchStoreCheques(selectedStoreId, selectedStoreName)
            }
          }}
        />
      )}
    </div>
  )
}

export default StoreChequePaymentEnhanced
