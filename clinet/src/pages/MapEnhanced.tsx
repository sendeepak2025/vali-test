"use client"

import React, { useState, useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import Sidebar from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import {
  MapPin, Truck, Users, Building2, Package, RefreshCw, Search,
  Filter, Eye, Navigation, Route, Clock, CheckCircle, AlertTriangle,
  Warehouse, Store, ChevronRight, Phone, Mail, DollarSign, Calendar,
  TrendingUp, Layers, ZoomIn, ZoomOut, Locate, X
} from "lucide-react"
import { getAllMembersAPI, userWithOrderDetails } from "@/services2/operations/auth"
import { getAllVendorsAPI } from "@/services2/operations/vendor"
import { getAllTripsAPI } from "@/services2/operations/trips"
import { getAllDriversAPI } from "@/services2/operations/driverAndTruck"
import { getAllOrderAPI } from "@/services2/operations/order"

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

// Custom marker icons
const createCustomIcon = (color: string, icon: string) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
      <span style="color: white; font-size: 14px;">${icon}</span>
    </div>`,
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })
}

const warehouseIcon = createCustomIcon("#16a34a", "🏭")
const customerIcon = createCustomIcon("#3b82f6", "🏪")
const customerHighBalanceIcon = createCustomIcon("#ef4444", "🏪")
const vendorIcon = createCustomIcon("#8b5cf6", "📦")
const truckIcon = createCustomIcon("#f59e0b", "🚚")
const deliveryIcon = createCustomIcon("#06b6d4", "📍")

// Stats Card Component
const StatsCard = ({ title, value, subtitle, icon: Icon, color = "blue" }: any) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  }

  return (
    <div className="p-4 bg-white rounded-lg border shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

const MapEnhanced = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 overflow-hidden">
        <MapContent />
      </div>
    </div>
  )
}

const MapContent = () => {
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  // Data states
  const [customers, setCustomers] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [showCustomers, setShowCustomers] = useState(true)
  const [showVendors, setShowVendors] = useState(true)
  const [showTrips, setShowTrips] = useState(true)
  const [showWarehouses, setShowWarehouses] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Summary stats
  const [stats, setStats] = useState({
    totalCustomers: 0,
    customersWithBalance: 0,
    totalVendors: 0,
    activeTrips: 0,
    pendingDeliveries: 0,
    totalReceivables: 0
  })

  // Warehouse locations (you can make these configurable)
  const warehouses = [
    { id: "wh1", name: "Main Warehouse", coords: [33.8995, -84.2436] as [number, number], address: "Atlanta, GA" },
    { id: "wh2", name: "Distribution Center", coords: [33.7284, -84.4608] as [number, number], address: "Atlanta West, GA" }
  ]

  // Fetch all data
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch customers
      const membersData = await getAllMembersAPI()
      const stores = membersData?.filter((m: any) => m.role === "store") || []
      
      // Get customer details with balances
      const customersWithDetails = await Promise.all(
        stores.slice(0, 50).map(async (store: any) => {
          try {
            const details = await userWithOrderDetails(store._id)
            return {
              ...store,
              id: store._id,
              balanceDue: details?.balanceDue || 0,
              totalOrders: details?.totalOrders || 0,
              totalSpent: details?.totalSpent || 0,
              // Parse coordinates from address or use default
              coords: parseCoordinates(store.address, store.city, store.state)
            }
          } catch {
            return { ...store, id: store._id, balanceDue: 0, coords: null }
          }
        })
      )
      setCustomers(customersWithDetails.filter(c => c.coords))

      // Fetch vendors
      const vendorsData = await getAllVendorsAPI()
      const vendorsWithCoords = (vendorsData || []).map((v: any) => ({
        ...v,
        id: v._id,
        coords: parseCoordinates(v.address, v.city, v.state)
      })).filter((v: any) => v.coords)
      setVendors(vendorsWithCoords)

      // Fetch trips
      const tripsData = await getAllTripsAPI(token)
      const tripsArray = Array.isArray(tripsData) ? tripsData : (tripsData?.data || [])
      setTrips(tripsArray)

      // Fetch drivers
      const driversData = await getAllDriversAPI(token)
      const driversArray = Array.isArray(driversData) ? driversData : (driversData?.data || [])
      setDrivers(driversArray)

      // Fetch orders
      const ordersData = await getAllOrderAPI(token)
      setOrders(ordersData?.orders || [])

      // Calculate stats
      const totalReceivables = customersWithDetails.reduce((sum, c) => sum + (c.balanceDue || 0), 0)
      const customersWithBalance = customersWithDetails.filter(c => c.balanceDue > 0).length
      const activeTrips = tripsArray.filter((t: any) => t.status === "On Route").length
      const pendingDeliveries = (ordersData?.orders || []).filter((o: any) => o.status === "Processing").length

      setStats({
        totalCustomers: customersWithDetails.length,
        customersWithBalance,
        totalVendors: vendorsWithCoords.length,
        activeTrips,
        pendingDeliveries,
        totalReceivables
      })

    } catch (error) {
      console.error("Error fetching data:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to load map data" })
    } finally {
      setLoading(false)
    }
  }

  // Parse coordinates from address (simplified - in production use geocoding API)
  const parseCoordinates = (address?: string, city?: string, state?: string): [number, number] | null => {
    // Georgia area coordinates with some randomization for demo
    const baseCoords: Record<string, [number, number]> = {
      "GA": [33.749, -84.388],
      "FL": [28.538, -81.379],
      "NC": [35.787, -78.644],
      "SC": [34.000, -81.035],
      "TN": [36.162, -86.781],
      "AL": [32.377, -86.300],
      "default": [33.749, -84.388]
    }
    
    const stateCoords = baseCoords[state?.toUpperCase() || "default"] || baseCoords["default"]
    // Add some randomization to spread markers
    return [
      stateCoords[0] + (Math.random() - 0.5) * 2,
      stateCoords[1] + (Math.random() - 0.5) * 2
    ]
  }

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current).setView([33.749, -84.388], 7)
    mapRef.current = map

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OpenStreetMap contributors"
    }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update markers when data or filters change
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return

    markersLayerRef.current.clearLayers()

    // Add warehouse markers
    if (showWarehouses) {
      warehouses.forEach(wh => {
        const marker = L.marker(wh.coords, { icon: warehouseIcon })
          .bindPopup(`
            <div class="p-2">
              <h3 class="font-bold text-green-600">🏭 ${wh.name}</h3>
              <p class="text-sm">${wh.address}</p>
              <p class="text-xs text-gray-500 mt-1">Distribution Center</p>
            </div>
          `)
        markersLayerRef.current?.addLayer(marker)
      })
    }

    // Add customer markers
    if (showCustomers) {
      customers
        .filter(c => !searchQuery || 
          c.storeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .forEach(customer => {
          if (!customer.coords) return
          const icon = customer.balanceDue > 500 ? customerHighBalanceIcon : customerIcon
          const marker = L.marker(customer.coords, { icon })
            .bindPopup(`
              <div class="p-2 min-w-[200px]">
                <h3 class="font-bold text-blue-600">🏪 ${customer.storeName || "Unknown Store"}</h3>
                <p class="text-sm">${customer.ownerName || ""}</p>
                <p class="text-sm">${customer.phone || ""}</p>
                <div class="mt-2 pt-2 border-t">
                  <p class="text-xs">Orders: <span class="font-medium">${customer.totalOrders || 0}</span></p>
                  <p class="text-xs">Balance: <span class="font-medium ${customer.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}">$${(customer.balanceDue || 0).toFixed(2)}</span></p>
                </div>
              </div>
            `)
          marker.on("click", () => {
            setSelectedEntity({ type: "customer", data: customer })
            setDetailsOpen(true)
          })
          markersLayerRef.current?.addLayer(marker)
        })
    }

    // Add vendor markers
    if (showVendors) {
      vendors
        .filter(v => !searchQuery || 
          v.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .forEach(vendor => {
          if (!vendor.coords) return
          const marker = L.marker(vendor.coords, { icon: vendorIcon })
            .bindPopup(`
              <div class="p-2 min-w-[200px]">
                <h3 class="font-bold text-purple-600">📦 ${vendor.name || "Unknown Vendor"}</h3>
                <p class="text-sm">${vendor.contactName || ""}</p>
                <p class="text-sm">${vendor.phone || ""}</p>
                <div class="mt-2 pt-2 border-t">
                  <p class="text-xs">Products: ${vendor.productsSupplied || "Various"}</p>
                  <p class="text-xs">Status: <span class="font-medium ${vendor.status === 'active' ? 'text-green-600' : 'text-gray-600'}">${vendor.status || "active"}</span></p>
                </div>
              </div>
            `)
          marker.on("click", () => {
            setSelectedEntity({ type: "vendor", data: vendor })
            setDetailsOpen(true)
          })
          markersLayerRef.current?.addLayer(marker)
        })
    }

    // Add trip route lines
    if (showTrips && Array.isArray(trips)) {
      trips
        .filter(t => t.status === "On Route" || t.status === "Planned")
        .forEach(trip => {
          // Draw route line if we have coordinates
          if (trip.route?.from && trip.route?.to) {
            // For demo, create a simple line between warehouse and random point
            const startCoords = warehouses[0].coords
            const endCoords: [number, number] = [
              startCoords[0] + (Math.random() - 0.5) * 3,
              startCoords[1] + (Math.random() - 0.5) * 3
            ]
            
            const routeLine = L.polyline([startCoords, endCoords], {
              color: trip.status === "On Route" ? "#f59e0b" : "#94a3b8",
              weight: 3,
              opacity: 0.7,
              dashArray: trip.status === "Planned" ? "10, 10" : undefined
            })
            
            routeLine.bindPopup(`
              <div class="p-2">
                <h3 class="font-bold">🚚 Trip: ${trip.route.from} → ${trip.route.to}</h3>
                <p class="text-sm">Driver: ${trip.driver?.name || "Unassigned"}</p>
                <p class="text-sm">Status: <span class="font-medium">${trip.status}</span></p>
                <p class="text-sm">Orders: ${trip.orders?.length || 0}</p>
              </div>
            `)
            
            markersLayerRef.current?.addLayer(routeLine)

            // Add truck marker at midpoint for active trips
            if (trip.status === "On Route") {
              const midpoint: [number, number] = [
                (startCoords[0] + endCoords[0]) / 2,
                (startCoords[1] + endCoords[1]) / 2
              ]
              const truckMarker = L.marker(midpoint, { icon: truckIcon })
                .bindPopup(`
                  <div class="p-2">
                    <h3 class="font-bold text-amber-600">🚚 ${trip.driver?.name || "Driver"}</h3>
                    <p class="text-sm">En route to: ${trip.route.to}</p>
                    <p class="text-sm">Orders: ${trip.orders?.length || 0}</p>
                  </div>
                `)
              markersLayerRef.current?.addLayer(truckMarker)
            }
          }
        })
    }

  }, [customers, vendors, trips, showCustomers, showVendors, showTrips, showWarehouses, searchQuery])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [])

  // Map controls
  const zoomIn = () => mapRef.current?.zoomIn()
  const zoomOut = () => mapRef.current?.zoomOut()
  const centerMap = () => mapRef.current?.setView([33.749, -84.388], 7)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Business Map
            </h1>
            <p className="text-sm text-muted-foreground">View customers, vendors, and delivery routes</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Panel */}
        <div className="w-80 border-r bg-white overflow-y-auto p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatsCard title="Customers" value={stats.totalCustomers} icon={Users} color="blue" />
            <StatsCard title="Vendors" value={stats.totalVendors} icon={Building2} color="purple" />
            <StatsCard title="Active Trips" value={stats.activeTrips} icon={Truck} color="orange" />
            <StatsCard title="Pending" value={stats.pendingDeliveries} icon={Package} color="green" />
          </div>

          {/* Receivables Alert */}
          {stats.totalReceivables > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">Outstanding Receivables</span>
              </div>
              <p className="text-lg font-bold text-red-600 mt-1">{formatCurrency(stats.totalReceivables)}</p>
              <p className="text-xs text-red-600">{stats.customersWithBalance} customers with balance</p>
            </div>
          )}

          {/* Layer Controls */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Map Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWarehouses}
                  onChange={(e) => setShowWarehouses(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Warehouses ({warehouses.length})
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCustomers}
                  onChange={(e) => setShowCustomers(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Customers ({customers.length})
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVendors}
                  onChange={(e) => setShowVendors(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  Vendors ({vendors.length})
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTrips}
                  onChange={(e) => setShowTrips(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  Active Trips ({Array.isArray(trips) ? trips.filter(t => t.status === "On Route").length : 0})
                </span>
              </label>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏭</span>
                <span>Warehouse / Distribution Center</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🏪</span>
                <span>Customer Store (Blue = Normal)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px]">🏪</div>
                <span>Customer with High Balance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <span>Vendor / Supplier</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🚚</span>
                <span>Active Delivery Truck</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-amber-500"></div>
                <span>Active Route</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-gray-400" style={{ borderStyle: "dashed" }}></div>
                <span>Planned Route</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => window.location.href = "/admin/orders"}>
                <Package className="h-4 w-4 mr-2" />
                View All Orders
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => window.location.href = "/vendors"}>
                <Building2 className="h-4 w-4 mr-2" />
                Manage Vendors
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => window.location.href = "/accounting"}>
                <DollarSign className="h-4 w-4 mr-2" />
                View Accounting
              </Button>
            </CardContent>
          </Card>

          {/* Top Balances */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Top Outstanding Balances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {customers
                .filter(c => c.balanceDue > 0)
                .sort((a, b) => b.balanceDue - a.balanceDue)
                .slice(0, 5)
                .map((customer) => (
                  <div 
                    key={customer.id} 
                    className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted"
                    onClick={() => {
                      if (customer.coords && mapRef.current) {
                        mapRef.current.setView(customer.coords, 12)
                      }
                    }}
                  >
                    <span className="text-xs truncate flex-1">{customer.storeName}</span>
                    <span className="text-xs font-bold text-red-600">{formatCurrency(customer.balanceDue)}</span>
                  </div>
                ))}
              {customers.filter(c => c.balanceDue > 0).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No outstanding balances</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="h-full w-full" />
          
          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
            <Button variant="secondary" size="icon" onClick={zoomIn} className="shadow-md">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={zoomOut} className="shadow-md">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={centerMap} className="shadow-md">
              <Locate className="h-4 w-4" />
            </Button>
          </div>

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[1000]">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading map data...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entity Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntity?.type === "customer" ? (
                <>
                  <Store className="h-5 w-5 text-blue-600" />
                  Customer Details
                </>
              ) : (
                <>
                  <Building2 className="h-5 w-5 text-purple-600" />
                  Vendor Details
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEntity && (
            <div className="space-y-4">
              {selectedEntity.type === "customer" ? (
                <>
                  <div>
                    <h3 className="font-bold text-lg">{selectedEntity.data.storeName || "Unknown Store"}</h3>
                    <p className="text-muted-foreground">{selectedEntity.data.ownerName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedEntity.data.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{selectedEntity.data.email || "N/A"}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Orders</span>
                      <span className="font-medium">{selectedEntity.data.totalOrders || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Spent</span>
                      <span className="font-medium">{formatCurrency(selectedEntity.data.totalSpent || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Balance Due</span>
                      <span className={`font-bold ${selectedEntity.data.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(selectedEntity.data.balanceDue || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => window.location.href = `/clients/${selectedEntity.data.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => window.location.href = `/orders/new/${selectedEntity.data.id}`}>
                      <Package className="h-4 w-4 mr-2" />
                      New Order
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="font-bold text-lg">{selectedEntity.data.name || "Unknown Vendor"}</h3>
                    <p className="text-muted-foreground">{selectedEntity.data.contactName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedEntity.data.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{selectedEntity.data.email || "N/A"}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm"><span className="text-muted-foreground">Products:</span> {selectedEntity.data.productsSupplied || "Various"}</p>
                    <p className="text-sm mt-1">
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <Badge variant={selectedEntity.data.status === "active" ? "default" : "secondary"}>
                        {selectedEntity.data.status || "active"}
                      </Badge>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => window.location.href = `/vendors`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Vendor
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => window.location.href = `/vendors/new-purchase`}>
                      <Package className="h-4 w-4 mr-2" />
                      New Purchase
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MapEnhanced
