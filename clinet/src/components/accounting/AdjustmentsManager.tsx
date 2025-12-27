"use client"

import { useState, useEffect } from "react"
import {
  Plus, Search, Filter, RefreshCw, CheckCircle, XCircle, Eye,
  AlertTriangle, Clock, DollarSign, FileText, MoreVertical, Ban
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import {
  createAdjustmentAPI,
  getAllAdjustmentsAPI,
  approveAdjustmentAPI,
  rejectAdjustmentAPI,
  voidAdjustmentAPI,
  getAdjustmentSummaryAPI
} from "@/services2/operations/adjustment"
import { getAllMembersAPI } from "@/services2/operations/auth"

const ADJUSTMENT_TYPES = [
  { value: "credit", label: "Credit", color: "green" },
  { value: "debit", label: "Debit", color: "red" },
  { value: "write_off", label: "Write Off", color: "orange" },
  { value: "correction", label: "Correction", color: "blue" },
  { value: "refund", label: "Refund", color: "purple" },
  { value: "discount", label: "Discount", color: "yellow" },
]

const REASON_CATEGORIES = [
  { value: "pricing_error", label: "Pricing Error" },
  { value: "damaged_goods", label: "Damaged Goods" },
  { value: "returned_goods", label: "Returned Goods" },
  { value: "customer_goodwill", label: "Customer Goodwill" },
  { value: "promotional_credit", label: "Promotional Credit" },
  { value: "bad_debt", label: "Bad Debt" },
  { value: "duplicate_payment", label: "Duplicate Payment" },
  { value: "overpayment", label: "Overpayment" },
  { value: "underpayment", label: "Underpayment" },
  { value: "service_issue", label: "Service Issue" },
  { value: "billing_error", label: "Billing Error" },
  { value: "other", label: "Other" },
]

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  applied: "bg-green-100 text-green-800",
  voided: "bg-gray-100 text-gray-800 line-through",
}

interface AdjustmentsManagerProps {
  storeId?: string
  showCreateButton?: boolean
}

export default function AdjustmentsManager({ storeId, showCreateButton = true }: AdjustmentsManagerProps) {
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  const [adjustments, setAdjustments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [summary, setSummary] = useState<any>(null)
  const [stores, setStores] = useState<any[]>([])

  // Create adjustment modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [formData, setFormData] = useState({
    storeId: storeId || "",
    type: "credit",
    amount: "",
    reasonCategory: "other",
    reason: "",
    internalNotes: "",
  })

  // Action modals
  const [selectedAdjustment, setSelectedAdjustment] = useState<any>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [actionNotes, setActionNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchAdjustments()
    fetchSummary()
    if (!storeId) {
      fetchStores()
    }
  }, [page, statusFilter, typeFilter])

  const fetchStores = async () => {
    try {
      const data = await getAllMembersAPI()
      const storeList = data?.filter((m: any) => m.role === "store") || []
      setStores(storeList)
    } catch (error) {
      console.error("Error fetching stores:", error)
    }
  }

  const fetchAdjustments = async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: 20 }
      if (storeId) params.storeId = storeId
      if (statusFilter !== "all") params.status = statusFilter
      if (typeFilter !== "all") params.type = typeFilter

      const result = await getAllAdjustmentsAPI(params, token)
      if (result) {
        setAdjustments(result.data || [])
        setTotalPages(result.pagination?.pages || 1)
      }
    } catch (error) {
      console.error("Error fetching adjustments:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const params: any = {}
      if (storeId) params.storeId = storeId
      const result = await getAdjustmentSummaryAPI(params, token)
      if (result) {
        setSummary(result)
      }
    } catch (error) {
      console.error("Error fetching summary:", error)
    }
  }

  const handleCreate = async () => {
    if (!formData.storeId || !formData.amount || !formData.reason) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" })
      return
    }

    setCreateLoading(true)
    try {
      const result = await createAdjustmentAPI({
        ...formData,
        amount: parseFloat(formData.amount),
      }, token)

      if (result) {
        setCreateOpen(false)
        setFormData({
          storeId: storeId || "",
          type: "credit",
          amount: "",
          reasonCategory: "other",
          reason: "",
          internalNotes: "",
        })
        fetchAdjustments()
        fetchSummary()
      }
    } finally {
      setCreateLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedAdjustment) return
    setActionLoading(true)
    try {
      const result = await approveAdjustmentAPI(selectedAdjustment._id, actionNotes, token)
      if (result) {
        setApproveOpen(false)
        setActionNotes("")
        fetchAdjustments()
        fetchSummary()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedAdjustment || !actionNotes) {
      toast({ title: "Error", description: "Rejection reason is required", variant: "destructive" })
      return
    }
    setActionLoading(true)
    try {
      const result = await rejectAdjustmentAPI(selectedAdjustment._id, actionNotes, token)
      if (result) {
        setRejectOpen(false)
        setActionNotes("")
        fetchAdjustments()
        fetchSummary()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleVoid = async () => {
    if (!selectedAdjustment || !actionNotes) {
      toast({ title: "Error", description: "Void reason is required", variant: "destructive" })
      return
    }
    setActionLoading(true)
    try {
      const result = await voidAdjustmentAPI(selectedAdjustment._id, actionNotes, token)
      if (result) {
        setVoidOpen(false)
        setActionNotes("")
        fetchAdjustments()
        fetchSummary()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const filteredAdjustments = adjustments.filter(adj => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      adj.adjustmentNumber?.toLowerCase().includes(searchLower) ||
      adj.storeId?.storeName?.toLowerCase().includes(searchLower) ||
      adj.reason?.toLowerCase().includes(searchLower)
    )
  })

  const getTypeColor = (type: string) => {
    const found = ADJUSTMENT_TYPES.find(t => t.value === type)
    return found?.color || "gray"
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{summary?.pendingCount || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        {summary?.byType?.map((item: any) => (
          <Card key={item._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground capitalize">{item._id}s</p>
                  <p className="text-2xl font-bold">{formatCurrency(item.totalAmount)}</p>
                  <p className="text-xs text-muted-foreground">{item.totalCount} total</p>
                </div>
                <DollarSign className={`h-8 w-8 text-${getTypeColor(item._id)}-500`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search adjustments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ADJUSTMENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchAdjustments(); fetchSummary(); }}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {showCreateButton && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Adjustment
            </Button>
          )}
        </div>
      </div>

      {/* Adjustments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {/* <TableHead>Adjustment #</TableHead> */}
                <TableHead>Store</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredAdjustments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No adjustments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAdjustments.map((adj) => (
                  <TableRow key={adj._id}>
                    {/* <TableCell className="font-medium">{adj.adjustmentNumber}</TableCell> */}
                    <TableCell>{adj.storeId?.storeName || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`bg-${getTypeColor(adj.type)}-50 text-${getTypeColor(adj.type)}-700`}>
                        {adj.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={adj.type === "debit" || adj.type === "write_off" ? "text-red-600" : "text-green-600"}>
                      {adj.type === "debit" || adj.type === "write_off" ? "-" : "+"}{formatCurrency(adj.amount)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{adj.reason}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[adj.status]}>{adj.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(adj.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedAdjustment(adj); setViewOpen(true); }}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {adj.status === "pending" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedAdjustment(adj); setApproveOpen(true); }}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedAdjustment(adj); setRejectOpen(true); }}>
                                <XCircle className="h-4 w-4 mr-2 text-red-600" /> Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {(adj.status === "approved" || adj.status === "applied") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedAdjustment(adj); setVoidOpen(true); }}>
                                <Ban className="h-4 w-4 mr-2 text-orange-600" /> Void
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="py-2 px-4 text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Create Adjustment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
<DialogContent className="sm:max-w-[450px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Adjustment</DialogTitle>
            <DialogDescription>Create a financial adjustment for a store account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!storeId && (
              <div>
                <Label>Store *</Label>
                <Select value={formData.storeId} onValueChange={(v) => setFormData({ ...formData, storeId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store._id} value={store._id}>{store.storeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Type *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Reason Category *</Label>
              <Select value={formData.reasonCategory} onValueChange={(v) => setFormData({ ...formData, reasonCategory: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASON_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason / Description *</Label>
              <Textarea
                placeholder="Describe the reason for this adjustment..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
            <div>
              <Label>Internal Notes</Label>
              <Textarea
                placeholder="Optional internal notes..."
                value={formData.internalNotes}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createLoading}>
              {createLoading ? "Creating..." : "Create Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Adjustment</DialogTitle>
            <DialogDescription>
              Approve adjustment {selectedAdjustment?.adjustmentNumber} for {formatCurrency(selectedAdjustment?.amount)}?
              This will apply the adjustment to the store's credit balance.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Approval Notes (Optional)</Label>
            <Textarea
              placeholder="Add any notes..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveOpen(false); setActionNotes(""); }}>Cancel</Button>
            <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
              {actionLoading ? "Approving..." : "Approve & Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Adjustment</DialogTitle>
            <DialogDescription>
              Reject adjustment {selectedAdjustment?.adjustmentNumber}?
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Rejection Reason *</Label>
            <Textarea
              placeholder="Provide a reason for rejection..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOpen(false); setActionNotes(""); }}>Cancel</Button>
            <Button onClick={handleReject} disabled={actionLoading} variant="destructive">
              {actionLoading ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Adjustment</DialogTitle>
            <DialogDescription>
              Void adjustment {selectedAdjustment?.adjustmentNumber}?
              {selectedAdjustment?.status === "applied" && " This will reverse the balance change."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Void Reason *</Label>
            <Textarea
              placeholder="Provide a reason for voiding..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVoidOpen(false); setActionNotes(""); }}>Cancel</Button>
            <Button onClick={handleVoid} disabled={actionLoading} variant="destructive">
              {actionLoading ? "Voiding..." : "Void Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
<DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjustment Details</DialogTitle>
          </DialogHeader>
          {selectedAdjustment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Adjustment #</Label>
                  <p className="font-medium">{selectedAdjustment.adjustmentNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={STATUS_COLORS[selectedAdjustment.status]}>{selectedAdjustment.status}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Store</Label>
                  <p className="font-medium">{selectedAdjustment.storeId?.storeName || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <Badge variant="outline">{selectedAdjustment.type}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className={`font-bold text-lg ${selectedAdjustment.type === "debit" || selectedAdjustment.type === "write_off" ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(selectedAdjustment.amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p>{REASON_CATEGORIES.find(c => c.value === selectedAdjustment.reasonCategory)?.label || selectedAdjustment.reasonCategory}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p>{selectedAdjustment.reason}</p>
              </div>
              {selectedAdjustment.internalNotes && (
                <div>
                  <Label className="text-muted-foreground">Internal Notes</Label>
                  <p className="text-sm">{selectedAdjustment.internalNotes}</p>
                </div>
              )}
              {selectedAdjustment.status === "applied" && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <Label className="text-muted-foreground">Balance Change</Label>
                  <p className="text-sm">
                    Before: {formatCurrency(selectedAdjustment.balanceBefore || 0)} → 
                    After: {formatCurrency(selectedAdjustment.balanceAfter || 0)}
                  </p>
                </div>
              )}
              {selectedAdjustment.status === "rejected" && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <Label className="text-muted-foreground">Rejection Reason</Label>
                  <p className="text-sm">{selectedAdjustment.rejectionReason}</p>
                </div>
              )}
              {selectedAdjustment.auditLog?.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Audit Trail</Label>
                  <div className="mt-2 space-y-2 ">
                    {selectedAdjustment.auditLog.map((log: any, idx: number) => (
                      <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium">{log.action}</span> by {log.performedByName || "System"} 
                        <span className="text-muted-foreground ml-2">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        {log.notes && <p className="mt-1 text-muted-foreground">{log.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
