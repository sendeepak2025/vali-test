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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import PageHeader from "@/components/shared/PageHeader"
import {
  Store, Search, RefreshCw, CheckCircle, XCircle, Clock,
  Mail, Phone, MapPin, Loader2, AlertCircle, User, Calendar
} from "lucide-react"
import { getPendingStoresAPI, approveStoreAPI, rejectStoreAPI } from "@/services2/operations/auth"
import { format } from "date-fns"

interface PendingStore {
  _id: string
  storeName: string
  ownerName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  registrationRef: string
  createdAt: string
}

const AdminApprovalDashboard = () => {
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  // States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pendingStores, setPendingStores] = useState<PendingStore[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  // Modal states
  const [selectedStore, setSelectedStore] = useState<PendingStore | null>(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch pending stores
  const fetchPendingStores = async () => {
    setLoading(true)
    try {
      const stores = await getPendingStoresAPI(token)
      setPendingStores(stores || [])
    } catch (error) {
      console.error("Error fetching pending stores:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to load pending stores" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchPendingStores()
    }
  }, [token])

  // Filter stores by search
  const filteredStores = useMemo(() => {
    if (!searchTerm) return pendingStores
    const term = searchTerm.toLowerCase()
    return pendingStores.filter(store =>
      store.storeName?.toLowerCase().includes(term) ||
      store.ownerName?.toLowerCase().includes(term) ||
      store.email?.toLowerCase().includes(term) ||
      store.phone?.includes(term) ||
      store.registrationRef?.toLowerCase().includes(term)
    )
  }, [pendingStores, searchTerm])

  // Handle approve
  const handleApprove = async () => {
    if (!selectedStore) return
    
    setActionLoading(true)
    try {
      const result = await approveStoreAPI(selectedStore._id, token)
      if (result) {
        setPendingStores(prev => prev.filter(s => s._id !== selectedStore._id))
        setApproveDialogOpen(false)
        setSelectedStore(null)
      }
    } catch (error) {
      console.error("Error approving store:", error)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle reject
  const handleReject = async () => {
    if (!selectedStore) return
    
    if (!rejectionReason.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please provide a rejection reason" })
      return
    }
    
    setActionLoading(true)
    try {
      const result = await rejectStoreAPI(selectedStore._id, rejectionReason, token)
      if (result) {
        setPendingStores(prev => prev.filter(s => s._id !== selectedStore._id))
        setRejectDialogOpen(false)
        setSelectedStore(null)
        setRejectionReason("")
      }
    } catch (error) {
      console.error("Error rejecting store:", error)
    } finally {
      setActionLoading(false)
    }
  }

  // Open approve dialog
  const openApproveDialog = (store: PendingStore) => {
    setSelectedStore(store)
    setApproveDialogOpen(true)
  }

  // Open reject dialog
  const openRejectDialog = (store: PendingStore) => {
    setSelectedStore(store)
    setRejectionReason("")
    setRejectDialogOpen(true)
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
              <p className="text-gray-600">Loading pending registrations...</p>
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
            title="Store Approval"
            description="Review and approve pending store registrations"
            icon={<Store className="h-6 w-6" />}
          />

          {/* Stats Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Pending Approvals</p>
                    <p className="text-2xl font-bold text-amber-600">{pendingStores.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by store name, owner, email, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchPendingStores}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {/* Pending Stores List */}
          {filteredStores.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-gray-500">No pending store registrations to review.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredStores.map((store) => (
                <Card key={store._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Store Info */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Store className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">{store.storeName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <User className="h-3 w-3" />
                            <span>{store.ownerName}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3 w-3" />
                            <span>{store.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-3 w-3" />
                            <span>{store.phone}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-3 w-3" />
                            <span>{store.address}, {store.city}, {store.state} {store.zipCode}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>Submitted: {format(new Date(store.createdAt), "MMM dd, yyyy 'at' h:mm a")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Reference & Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          Ref: {store.registrationRef}
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => openApproveDialog(store)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => openRejectDialog(store)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Approve Store Registration
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this store registration?
            </DialogDescription>
          </DialogHeader>
          
          {selectedStore && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Store Name:</span>
                <span className="font-medium">{selectedStore.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Owner:</span>
                <span className="font-medium">{selectedStore.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-medium">{selectedStore.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reference:</span>
                <span className="font-mono text-sm">{selectedStore.registrationRef}</span>
              </div>
            </div>
          )}
          
          <p className="text-sm text-gray-600">
            The store owner will receive an email notification and will be able to access their dashboard.
          </p>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Reject Store Registration
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this registration.
            </DialogDescription>
          </DialogHeader>
          
          {selectedStore && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Store Name:</span>
                <span className="font-medium">{selectedStore.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Owner:</span>
                <span className="font-medium">{selectedStore.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-medium">{selectedStore.email}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Please explain why this registration is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              This reason will be included in the notification email sent to the store owner.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={actionLoading || !rejectionReason.trim()} 
              variant="destructive"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminApprovalDashboard
