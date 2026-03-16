"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Store,
  Box,
  TrendingDown,
  ClipboardList,
  Search,
  Filter,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getWorkOrderByWeekAPI,
  getAllWorkOrdersAPI,
  getShortagesSummaryAPI,
  updatePickingStatusAPI,
} from "@/services2/operations/workOrder"

interface WorkOrderType {
  _id: string
  workOrderNumber: string
  weekStart: string
  weekEnd: string
  weekLabel: string
  status: string
  totalProducts: number
  totalStores: number
  totalOrders: number
  hasShortage: boolean
  shortProductCount: number
  totalShortageQuantity: number
  products: any[]
  storeAllocations: any[]
  createdAt: string
}

const WorkOrders = () => {
  const token = useSelector((state: RootState) => state.auth.token)
  const { toast } = useToast()

  // State
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [workOrder, setWorkOrder] = useState<WorkOrderType | null>(null)
  const [allWorkOrders, setAllWorkOrders] = useState<WorkOrderType[]>([])
  const [shortagesSummary, setShortagesSummary] = useState<any>(null)
  const [viewMode, setViewMode] = useState<"current" | "all">("current")
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedStore, setSelectedStore] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch current week work order
  const fetchWorkOrder = async () => {
    try {
      const response = await getWorkOrderByWeekAPI(weekOffset, token)
      if (response?.success) {
        setWorkOrder(response.data)
      } else {
        setWorkOrder(null)
      }
    } catch (error) {
      console.error("Error fetching work order:", error)
      setWorkOrder(null)
    }
  }

  // Fetch shortages summary
  const fetchShortagesSummary = async () => {
    try {
      const response = await getShortagesSummaryAPI(weekOffset, token)
      if (response?.success) {
        setShortagesSummary(response.data)
      }
    } catch (error) {
      console.error("Error fetching shortages:", error)
    }
  }

  // Fetch all work orders
  const fetchAllWorkOrders = async () => {
    try {
      const params: any = { limit: 20 }
      if (statusFilter !== "all") params.status = statusFilter
      
      const response = await getAllWorkOrdersAPI(params, token)
      if (response?.success) {
        setAllWorkOrders(response.data || [])
      }
    } catch (error) {
      console.error("Error fetching all work orders:", error)
    }
  }

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchWorkOrder(), fetchShortagesSummary()])
      setLoading(false)
    }
    loadData()
  }, [weekOffset])

  // Load all work orders when switching to "all" view
  useEffect(() => {
    if (viewMode === "all") {
      fetchAllWorkOrders()
    }
  }, [viewMode, statusFilter])

  // Refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    if (viewMode === "current") {
      await Promise.all([fetchWorkOrder(), fetchShortagesSummary()])
    } else {
      await fetchAllWorkOrders()
    }
    setRefreshing(false)
  }

  // Week navigation
  const getWeekLabel = () => {
    const now = new Date()
    const day = now.getUTCDay()
    const monday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - ((day + 6) % 7) + weekOffset * 7,
        0, 0, 0, 0
      )
    )
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  // Handle picking status update
  const handlePickingToggle = async (storeId: string, productId: string, picked: boolean) => {
    if (!workOrder) return
    
    const response = await updatePickingStatusAPI(
      workOrder._id,
      { storeId, productId, picked },
      token
    )
    
    if (response?.success) {
      // Refresh work order
      fetchWorkOrder()
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>
      case "confirmed":
        return <Badge className="bg-blue-100 text-blue-700"><ClipboardList className="h-3 w-3 mr-1" />Confirmed</Badge>
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-700"><Package className="h-3 w-3 mr-1" />In Progress</Badge>
      case "completed":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Calculate picking progress
  const getPickingProgress = (storeAllocation: any) => {
    const total = storeAllocation.items?.length || 0
    const picked = storeAllocation.items?.filter((i: any) => i.picked).length || 0
    return total > 0 ? Math.round((picked / total) * 100) : 0
  }

  // Filter stores
  const filteredStores = useMemo(() => {
    if (!workOrder?.storeAllocations) return []
    return workOrder.storeAllocations.filter(store => {
      if (!searchQuery) return true
      return store.storeName?.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [workOrder, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Work Orders
          </h1>
          <p className="text-muted-foreground text-sm">Track picking, shortages, and fulfillment</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "current" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("current")}
          >
            Current Week
          </Button>
          <Button
            variant={viewMode === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("all")}
          >
            All Work Orders
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {viewMode === "current" ? (
        <>
          {/* Week Navigation */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <div className="text-center">
                  <div className="font-semibold flex items-center gap-2 justify-center">
                    <Calendar className="h-4 w-4" />
                    {getWeekLabel()}
                  </div>
                  {weekOffset === 0 && <Badge variant="secondary" className="mt-1">Current Week</Badge>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          {workOrder && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Work Order</p>
                    <p className="font-bold text-blue-600">{workOrder.workOrderNumber}</p>
                  </div>
                  <ClipboardList className="h-5 w-5 text-blue-500" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Stores</p>
                    <p className="text-xl font-bold">{workOrder.totalStores}</p>
                  </div>
                  <Store className="h-5 w-5 text-purple-500" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Products</p>
                    <p className="text-xl font-bold">{workOrder.totalProducts}</p>
                  </div>
                  <Box className="h-5 w-5 text-green-500" />
                </CardContent>
              </Card>
              <Card className={workOrder.hasShortage ? "border-red-200 bg-red-50" : ""}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Shortages</p>
                    <p className={cn("text-xl font-bold", workOrder.hasShortage ? "text-red-600" : "text-green-600")}>
                      {workOrder.shortProductCount}
                    </p>
                  </div>
                  {workOrder.hasShortage ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Shortage Alert */}
          {shortagesSummary?.hasShortage && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-red-700 flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5" />
                  Shortage Alert - {shortagesSummary.shortProducts?.length} Product(s) Short
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {shortagesSummary.shortProducts?.slice(0, 5).map((product: any) => (
                    <div key={product.productId} className="flex items-center justify-between bg-white p-2 rounded border">
                      <span className="font-medium">{product.productName}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Ordered: <strong>{product.totalOrdered}</strong></span>
                        <span>Available: <strong>{product.totalAvailable}</strong></span>
                        <Badge variant="destructive">Short: {product.shortage}</Badge>
                      </div>
                    </div>
                  ))}
                  {shortagesSummary.shortProducts?.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      +{shortagesSummary.shortProducts.length - 5} more products with shortages
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Work Order */}
          {!workOrder && (
            <Card>
              <CardContent className="p-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No Work Order for This Week</h3>
                <p className="text-muted-foreground text-sm">
                  Work orders are created automatically when PreOrders are confirmed from the Order Matrix.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Store Allocations */}
          {workOrder && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Store Allocations & Picking</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search stores..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-[200px] h-9"
                      />
                    </div>
                    {getStatusBadge(workOrder.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Store</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-center">Ordered</TableHead>
                      <TableHead className="text-center">Allocated</TableHead>
                      <TableHead className="text-center">Shortage</TableHead>
                      <TableHead>Picking Progress</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No stores found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStores.map((store: any) => (
                        <TableRow key={store.store} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="font-medium">{store.storeName}</div>
                            <div className="text-xs text-muted-foreground">
                              {store.storeCity}, {store.storeState}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{store.items?.length || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {store.totalOrdered}
                          </TableCell>
                          <TableCell className="text-center font-medium text-green-600">
                            {store.totalAllocated}
                          </TableCell>
                          <TableCell className="text-center">
                            {store.totalShortage > 0 ? (
                              <Badge variant="destructive">{store.totalShortage}</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700">0</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={getPickingProgress(store)} className="h-2 w-20" />
                              <span className="text-xs text-muted-foreground">
                                {getPickingProgress(store)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedStore(store); setShowDetailModal(true) }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* All Work Orders View */
        <>
          <div className="flex items-center gap-2 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Work Order #</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-center">Stores</TableHead>
                    <TableHead className="text-center">Products</TableHead>
                    <TableHead className="text-center">Shortages</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allWorkOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No work orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    allWorkOrders.map((wo) => (
                      <TableRow key={wo._id} className="hover:bg-muted/30 cursor-pointer">
                        <TableCell className="font-medium text-blue-600">
                          {wo.workOrderNumber}
                        </TableCell>
                        <TableCell>{wo.weekLabel}</TableCell>
                        <TableCell className="text-center">{wo.totalStores}</TableCell>
                        <TableCell className="text-center">{wo.totalProducts}</TableCell>
                        <TableCell className="text-center">
                          {wo.hasShortage ? (
                            <Badge variant="destructive">{wo.shortProductCount}</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">0</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(wo.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(wo.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Store Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              {selectedStore?.storeName} - Picking List
            </DialogTitle>
          </DialogHeader>
          
          {selectedStore && (
            <div className="space-y-4">
              {/* Store Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Ordered</p>
                  <p className="text-lg font-bold">{selectedStore.totalOrdered}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Allocated</p>
                  <p className="text-lg font-bold text-green-600">{selectedStore.totalAllocated}</p>
                </div>
                <div className={cn("p-3 rounded-lg text-center", selectedStore.totalShortage > 0 ? "bg-red-50" : "bg-gray-50")}>
                  <p className="text-xs text-muted-foreground">Shortage</p>
                  <p className={cn("text-lg font-bold", selectedStore.totalShortage > 0 ? "text-red-600" : "")}>
                    {selectedStore.totalShortage}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Pick</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Ordered</TableHead>
                      <TableHead className="text-center">Allocated</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedStore.items?.map((item: any) => (
                      <TableRow key={item.product} className={item.picked ? "bg-green-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={item.picked}
                            onCheckedChange={(checked) => 
                              handlePickingToggle(selectedStore.store, item.product, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-center">{item.ordered}</TableCell>
                        <TableCell className="text-center font-medium text-green-600">
                          {item.allocated}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.shortage > 0 ? (
                            <Badge variant="destructive" className="text-xs">Short: {item.shortage}</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 text-xs">Full</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Picking Progress:</span>
                <Progress value={getPickingProgress(selectedStore)} className="flex-1 h-3" />
                <span className="text-sm font-bold">{getPickingProgress(selectedStore)}%</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WorkOrders
