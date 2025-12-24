"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Search,
  Truck,
  MapPin,
  Calendar,
  User,
  Package,
  Edit,
  Eye,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Phone,
  Loader2,
  Filter,
  X,
  Route,
  Weight,
  Box,
} from "lucide-react"
import { getAllTripsAPI, addTripAPI, updateTripAPI } from "@/services2/operations/trips"
import { getAllDriversAPI } from "@/services2/operations/driverAndTruck"
import { getAllOrderAPI } from "@/services2/operations/order"
import { calculateTripWeightAPI } from "@/services2/operations/product"
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete"
import { cn } from "@/lib/utils"

const TRIP_STATUSES = ["Planned", "On Route", "Delivered", "Cancelled"]

interface TripType {
  _id: string
  route: { from: string; to: string }
  date: string
  driver: any
  selectedTruck?: any
  truck?: string
  orders: any[]
  capacity_kg: number
  capacity_m3: number
  status: string
}

interface DriverType {
  _id: string
  name: string
  phone: string
  trucks: any[]
  active: boolean
}

const ManageTripsEnhanced = () => {
  const token = useSelector((state: RootState) => state.auth.token)
  const { toast } = useToast()

  // Data states
  const [trips, setTrips] = useState<TripType[]>([])
  const [drivers, setDrivers] = useState<DriverType[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")

  // Modal states
  const [showTripModal, setShowTripModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editTrip, setEditTrip] = useState<TripType | null>(null)
  const [viewTrip, setViewTrip] = useState<TripType | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    routeFrom: "",
    routeTo: "",
    date: "",
    driver: "",
    truck: "",
    orders: [] as string[],
    capacity_kg: 0,
    capacity_m3: 0,
    status: "Planned",
  })
  const [availableTrucks, setAvailableTrucks] = useState<any[]>([])
  const [selectedOrdersDetails, setSelectedOrdersDetails] = useState<any[]>([])
  const [orderSearch, setOrderSearch] = useState("")
  const [showOrderDropdown, setShowOrderDropdown] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Fetch data
  const fetchTrips = async () => {
    try {
      const data = await getAllTripsAPI(token)
      setTrips(data?.data || [])
    } catch (error) {
      console.error("Error fetching trips:", error)
    }
  }

  const fetchDrivers = async () => {
    try {
      const data = await getAllDriversAPI(token)
      setDrivers(data || [])
    } catch (error) {
      console.error("Error fetching drivers:", error)
    }
  }

  const fetchOrders = async (search = "") => {
    setLoadingOrders(true)
    try {
      const params = new URLSearchParams()
      params.append("limit", "100")
      params.append("orderType", "Regural")
      if (search) params.append("search", search)
      
      const response = await getAllOrderAPI(token, params.toString())
      if (response?.orders) {
        setOrders(response.orders.map((o: any) => ({
          ...o,
          id: o._id,
          orderNumber: o.orderNumber || `#${o._id.slice(-5)}`,
          clientName: o.store?.storeName || "Unknown",
        })))
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchTrips(), fetchDrivers()])
      setLoading(false)
    }
    loadData()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchTrips()
    setRefreshing(false)
  }

  // Filter trips
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const matchesSearch = !searchQuery || 
        trip.driver?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.route?.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.route?.to?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || trip.status === statusFilter
      const matchesDate = !dateFilter || trip.date?.startsWith(dateFilter)
      
      return matchesSearch && matchesStatus && matchesDate
    })
  }, [trips, searchQuery, statusFilter, dateFilter])

  // Stats
  const stats = useMemo(() => ({
    total: trips.length,
    planned: trips.filter(t => t.status === "Planned").length,
    onRoute: trips.filter(t => t.status === "On Route").length,
    delivered: trips.filter(t => t.status === "Delivered").length,
  }), [trips])

  // Open add modal
  const openAddModal = () => {
    setEditTrip(null)
    setFormData({
      routeFrom: "",
      routeTo: "",
      date: new Date().toISOString().split('T')[0],
      driver: "",
      truck: "",
      orders: [],
      capacity_kg: 0,
      capacity_m3: 0,
      status: "Planned",
    })
    setAvailableTrucks([])
    setSelectedOrdersDetails([])
    setCurrentStep(1)
    setShowTripModal(true)
  }

  // Open edit modal
  const openEditModal = (trip: TripType) => {
    setEditTrip(trip)
    const orderIds = (trip.orders || []).map((o: any) => o.order_id?._id || o._id).filter(Boolean)
    
    setFormData({
      routeFrom: trip.route?.from || "",
      routeTo: trip.route?.to || "",
      date: trip.date?.slice(0, 10) || "",
      driver: trip.driver?._id || "",
      truck: trip.truck || trip.selectedTruck?._id || "",
      orders: orderIds,
      capacity_kg: trip.capacity_kg || 0,
      capacity_m3: trip.capacity_m3 || 0,
      status: trip.status || "Planned",
    })
    
    // Set available trucks for selected driver
    const selectedDriver = drivers.find(d => d._id === trip.driver?._id)
    setAvailableTrucks(selectedDriver?.trucks?.filter((t: any) => t.active) || [])
    
    setCurrentStep(1)
    setShowTripModal(true)
  }

  // Handle driver change
  const handleDriverChange = (driverId: string) => {
    const driver = drivers.find(d => d._id === driverId)
    setAvailableTrucks(driver?.trucks?.filter((t: any) => t.active) || [])
    setFormData(prev => ({ ...prev, driver: driverId, truck: "" }))
  }

  // Toggle order selection
  const toggleOrder = async (orderId: string) => {
    const isSelected = formData.orders.includes(orderId)
    const newOrders = isSelected 
      ? formData.orders.filter(id => id !== orderId)
      : [...formData.orders, orderId]
    
    setFormData(prev => ({ ...prev, orders: newOrders }))
    
    // Calculate weight
    if (newOrders.length > 0) {
      try {
        const result = await calculateTripWeightAPI(newOrders, token)
        if (result) {
          setFormData(prev => ({
            ...prev,
            capacity_kg: result.totalWeightKg || 0,
            capacity_m3: result.totalVolumeM3 || 0,
          }))
          setSelectedOrdersDetails(result.orderWiseDetails || [])
        }
      } catch (error) {
        console.error("Error calculating weight:", error)
      }
    } else {
      setFormData(prev => ({ ...prev, capacity_kg: 0, capacity_m3: 0 }))
      setSelectedOrdersDetails([])
    }
  }

  // Submit trip
  const handleSubmit = async () => {
    if (!formData.routeFrom || !formData.routeTo || !formData.date || !formData.driver || !formData.truck) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const formattedOrders = formData.orders.map(orderId => {
        const detail = selectedOrdersDetails.find((o: any) => o.orderId === orderId)
        return {
          order_id: orderId,
          capacity_kg: detail?.totalWeightKg || 0,
          capacity_m3: detail?.totalVolumeM3 || 0,
        }
      })

      const payload = {
        route: { from: formData.routeFrom, to: formData.routeTo },
        date: formData.date,
        driver: formData.driver,
        truck: formData.truck,
        orders: formattedOrders,
        capacity_kg: formData.capacity_kg,
        capacity_m3: formData.capacity_m3,
        status: formData.status,
      }

      if (editTrip) {
        await updateTripAPI(editTrip._id, payload, token)()
        toast({ title: "Success", description: "Trip updated successfully!" })
      } else {
        await addTripAPI(payload, token)
        toast({ title: "Success", description: "Trip created successfully!" })
      }

      setShowTripModal(false)
      fetchTrips()
    } catch (error) {
      toast({ title: "Error", description: "Failed to save trip", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Planned": return "bg-blue-100 text-blue-700"
      case "On Route": return "bg-amber-100 text-amber-700"
      case "Delivered": return "bg-green-100 text-green-700"
      case "Cancelled": return "bg-red-100 text-red-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Planned": return <Clock className="h-3 w-3" />
      case "On Route": return <Truck className="h-3 w-3" />
      case "Delivered": return <CheckCircle2 className="h-3 w-3" />
      case "Cancelled": return <X className="h-3 w-3" />
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("all")}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Trips</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
            <Route className="h-5 w-5 text-blue-500" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("Planned")}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Planned</p>
              <p className="text-xl font-bold text-blue-600">{stats.planned}</p>
            </div>
            <Clock className="h-5 w-5 text-blue-500" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("On Route")}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">On Route</p>
              <p className="text-xl font-bold text-amber-600">{stats.onRoute}</p>
            </div>
            <Truck className="h-5 w-5 text-amber-500" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter("Delivered")}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Delivered</p>
              <p className="text-xl font-bold text-green-600">{stats.delivered}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-[200px] h-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {TRIP_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-[150px] h-9"
          />

          {(searchQuery || statusFilter !== "all" || dateFilter) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSearchQuery(""); setStatusFilter("all"); setDateFilter("") }}
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-9">
            <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={openAddModal} className="h-9">
            <Plus className="h-4 w-4 mr-1" />
            Add Trip
          </Button>
        </div>
      </div>

      {/* Trips Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Driver</TableHead>
                <TableHead>Truck</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Route className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No trips found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map(trip => (
                  <TableRow key={trip._id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium">{trip.driver?.name || "No Driver"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {trip.driver?.phone || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-blue-600">
                        {trip.selectedTruck?.truck_number || "No Truck"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {trip.selectedTruck?.capacity_kg || 0} lbs
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-green-500" />
                        <span className="truncate max-w-[100px]">{trip.route?.from || "-"}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{trip.route?.to || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {trip.date ? new Date(trip.date).toLocaleDateString() : "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{trip.orders?.length || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Weight className="h-3 w-3" /> {trip.capacity_kg || 0} lbs
                        </div>
                        <div className="flex items-center gap-1">
                          <Box className="h-3 w-3" /> {trip.capacity_m3 || 0} m³
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", getStatusColor(trip.status))}>
                        {getStatusIcon(trip.status)}
                        <span className="ml-1">{trip.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => { setViewTrip(trip); setShowViewModal(true) }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openEditModal(trip)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Trip Modal */}
      <Dialog open={showTripModal} onOpenChange={setShowTripModal}>
        <DialogContent className="max-w-2xl h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTrip ? "Edit Trip" : "Create New Trip"}</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            {[1, 2, 3].map(step => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  currentStep === step ? "bg-primary text-white" : 
                  currentStep > step ? "bg-green-500 text-white" : "bg-gray-200"
                )}>
                  {currentStep > step ? <CheckCircle2 className="h-4 w-4" /> : step}
                </div>
                {step < 3 && <div className={cn("w-12 h-1 mx-1", currentStep > step ? "bg-green-500" : "bg-gray-200")} />}
              </div>
            ))}
          </div>

          {/* Step 1: Route & Date */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <MapPin className="h-10 w-10 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Route & Schedule</h3>
              </div>
              
              <div>
                <label className="text-sm font-medium">From Location</label>
                <GooglePlacesAutocomplete
                  value={formData.routeFrom}
                  onChange={(v) => setFormData(prev => ({ ...prev, routeFrom: v }))}
                  placeholder="Enter starting location"
                  className="w-full border p-2 rounded-lg mt-1"
                  name="routeFrom"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">To Location</label>
                <GooglePlacesAutocomplete
                  value={formData.routeTo}
                  onChange={(v) => setFormData(prev => ({ ...prev, routeTo: v }))}
                  placeholder="Enter destination"
                  className="w-full border p-2 rounded-lg mt-1"
                  name="routeTo"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Trip Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {editTrip && (
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIP_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Driver & Truck */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <User className="h-10 w-10 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Driver & Vehicle</h3>
              </div>
              
              <div>
                <label className="text-sm font-medium">Select Driver</label>
                <Select value={formData.driver} onValueChange={handleDriverChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.active).map(d => (
                      <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Select Truck</label>
                <Select 
                  value={formData.truck} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, truck: v }))}
                  disabled={!formData.driver}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={formData.driver ? "Choose a truck" : "Select driver first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTrucks.map((t: any) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.truck_number} ({t.capacity_kg} lbs)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.truck && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 text-sm mb-2">Truck Details</h4>
                  {(() => {
                    const truck = availableTrucks.find((t: any) => t._id === formData.truck)
                    return truck ? (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Capacity: <span className="font-medium">{truck.capacity_kg} lbs</span></div>
                        <div>Volume: <span className="font-medium">{truck.capacity_m3} m³</span></div>
                      </div>
                    ) : null
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Orders */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <Package className="h-10 w-10 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Select Orders</h3>
              </div>
              
              <div className="relative">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => { setShowOrderDropdown(!showOrderDropdown); if (!showOrderDropdown) fetchOrders() }}
                >
                  {formData.orders.length > 0 ? `${formData.orders.length} Orders Selected` : "Click to select orders"}
                  <Package className="h-4 w-4" />
                </Button>

                {showOrderDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 border-b sticky top-0 bg-white">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search orders..."
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="h-8"
                        />
                        <Button size="sm" onClick={() => fetchOrders(orderSearch)} className="h-8">
                          Search
                        </Button>
                      </div>
                    </div>
                    
                    {loadingOrders ? (
                      <div className="p-4 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </div>
                    ) : orders.length > 0 ? (
                      orders.map(order => (
                        <div
                          key={order.id}
                          className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b"
                          onClick={() => toggleOrder(order.id)}
                        >
                          <input
                            type="checkbox"
                            checked={formData.orders.includes(order.id)}
                            onChange={() => {}}
                            className="mr-2"
                          />
                          <div>
                            <div className="font-medium text-sm">{order.orderNumber}</div>
                            <div className="text-xs text-muted-foreground">{order.clientName}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground text-sm">No orders found</div>
                    )}
                  </div>
                )}
              </div>

              {formData.orders.length > 0 && (
                <div className="space-y-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900 text-sm mb-2">Selected: {formData.orders.length} orders</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground">Total Weight</div>
                      <div className="font-bold text-lg">{formData.capacity_kg} lbs</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground">Total Volume</div>
                      <div className="font-bold text-lg">{formData.capacity_m3} m³</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowTripModal(false)}>Cancel</Button>
              {currentStep > 1 && (
                <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)}>Previous</Button>
              )}
            </div>
            
            {currentStep < 3 ? (
              <Button onClick={() => setCurrentStep(prev => prev + 1)}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editTrip ? "Update Trip" : "Create Trip"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Trip Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Trip Details</DialogTitle>
          </DialogHeader>
          
          {viewTrip && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Route
                </h4>
                <div className="text-sm">
                  <div>{viewTrip.route?.from}</div>
                  <ArrowRight className="h-4 w-4 my-1" />
                  <div>{viewTrip.route?.to}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Driver</h4>
                  <div className="text-sm">{viewTrip.driver?.name}</div>
                  <div className="text-xs text-muted-foreground">{viewTrip.driver?.phone}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Truck</h4>
                  <div className="text-sm">{viewTrip.selectedTruck?.truck_number}</div>
                  <div className="text-xs text-muted-foreground">{viewTrip.selectedTruck?.capacity_kg} lbs</div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Orders ({viewTrip.orders?.length || 0})</h4>
                <div className="space-y-1 max-h-40 overflow-auto">
                  {viewTrip.orders?.map((order: any, i: number) => (
                    <div key={i} className="text-xs bg-white p-2 rounded border">
                      {order.order_id?.orderNumber || order._id?.slice(-5)}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <Badge className={getStatusColor(viewTrip.status)}>{viewTrip.status}</Badge>
                <div className="text-sm text-muted-foreground">
                  {viewTrip.date ? new Date(viewTrip.date).toLocaleDateString() : "-"}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ManageTripsEnhanced
