"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import Sidebar from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import {
  MapPin, Truck, Users, Building2, Package, RefreshCw, Search,
  Navigation, Route, Clock, AlertTriangle, Warehouse, Store,
  Phone, Mail, DollarSign, Plus, X, GripVertical, Play, Save,
  Trash2, Layers, ZoomIn, ZoomOut, Locate, Timer, Fuel, Eye,
  Circle, Target, Settings, Sparkles
} from "lucide-react"
import { getAllMembersAPI, userWithOrderDetails } from "@/services2/operations/auth"
import { getAllVendorsAPI } from "@/services2/operations/vendor"
import { getAllTripsAPI, addTripAPI } from "@/services2/operations/trips"
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
const createIcon = (color: string, emoji: string) => L.divIcon({
  html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;">${emoji}</div>`,
  className: "custom-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
})

const warehouseIcon = createIcon("#16a34a", "🏭")
const customerIcon = createIcon("#3b82f6", "🏪")
const customerHighBalanceIcon = createIcon("#ef4444", "🏪")
const vendorIcon = createIcon("#8b5cf6", "📦")

const StatsCard = ({ title, value, subtitle, icon: Icon, color = "blue" }: any) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  }
  return (
    <div className="p-3 bg-white rounded-lg border shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-lg font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

// OpenRouteService API helper
const ORS_API_KEY = import.meta.env.VITE_OPENROUTE_API_KEY || ""
const ORS_BASE_URL = "https://api.openrouteservice.org"

const openRouteService = {
  async getRoute(coordinates: [number, number][], profile = "driving-car") {
    const response = await fetch(`${ORS_BASE_URL}/v2/directions/${profile}/geojson`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ORS_API_KEY
      },
      body: JSON.stringify({
        coordinates: coordinates.map(c => [c[1], c[0]]), // ORS uses [lng, lat]
        instructions: true,
        units: "mi"
      })
    })
    if (!response.ok) throw new Error("Route calculation failed")
    return response.json()
  },

  async optimizeRoute(coordinates: [number, number][], profile = "driving-car") {
    // Use optimization endpoint for TSP (Traveling Salesman Problem)
    const jobs = coordinates.slice(1, -1).map((coord, i) => ({
      id: i + 1,
      location: [coord[1], coord[0]]
    }))
    
    const response = await fetch(`${ORS_BASE_URL}/optimization`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ORS_API_KEY
      },
      body: JSON.stringify({
        jobs,
        vehicles: [{
          id: 1,
          profile,
          start: [coordinates[0][1], coordinates[0][0]],
          end: [coordinates[coordinates.length - 1][1], coordinates[coordinates.length - 1][0]]
        }]
      })
    })
    if (!response.ok) throw new Error("Route optimization failed")
    return response.json()
  },

  async getIsochrone(center: [number, number], minutes: number[], profile = "driving-car") {
    const response = await fetch(`${ORS_BASE_URL}/v2/isochrones/${profile}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ORS_API_KEY
      },
      body: JSON.stringify({
        locations: [[center[1], center[0]]],
        range: minutes.map(m => m * 60), // Convert to seconds
        range_type: "time"
      })
    })
    if (!response.ok) throw new Error("Isochrone calculation failed")
    return response.json()
  }
}

const MapOpenRoute = () => {
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
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const isochroneLayerRef = useRef<L.LayerGroup | null>(null)

  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])

  const [showCustomers, setShowCustomers] = useState(true)
  const [showVendors, setShowVendors] = useState(true)
  const [showWarehouses, setShowWarehouses] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const [routePlannerOpen, setRoutePlannerOpen] = useState(false)
  const [routeStops, setRouteStops] = useState<any[]>([])
  const [selectedDriver, setSelectedDriver] = useState("")
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0])
  const [routeInfo, setRouteInfo] = useState<any>(null)
  const [optimizingRoute, setOptimizingRoute] = useState(false)
  const [savingRoute, setSavingRoute] = useState(false)
  const [routeProfile, setRouteProfile] = useState("driving-car")

  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Isochrone state
  const [isochroneOpen, setIsochroneOpen] = useState(false)
  const [isochroneCenter, setIsochroneCenter] = useState<any>(null)
  const [isochroneTimes, setIsochroneTimes] = useState([15, 30, 45])
  const [calculatingIsochrone, setCalculatingIsochrone] = useState(false)

  const [stats, setStats] = useState({
    totalCustomers: 0,
    customersWithBalance: 0,
    totalVendors: 0,
    activeTrips: 0,
    totalReceivables: 0
  })

  const warehouses = [
    { id: "wh1", name: "Main Warehouse", lat: 33.8995, lng: -84.2436, address: "Atlanta, GA" },
    { id: "wh2", name: "Distribution Center", lat: 33.7284, lng: -84.4608, address: "Atlanta West, GA" }
  ]

  const getRandomCoord = (min: number, max: number) => min + Math.random() * (max - min)

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current).setView([33.749, -84.388], 8)
    mapRef.current = map

    // Use OpenStreetMap tiles (free)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> | Routing by <a href="https://openrouteservice.org">OpenRouteService</a>'
    }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)
    routeLayerRef.current = L.layerGroup().addTo(map)
    isochroneLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const membersData = await getAllMembersAPI()
      const stores = membersData?.filter((m: any) => m.role === "store") || []
      const customersWithDetails = await Promise.all(
        stores.slice(0, 50).map(async (store: any) => {
          try {
            const details = await userWithOrderDetails(store._id)
            return {
              ...store, id: store._id,
              balanceDue: details?.balanceDue || 0,
              totalOrders: details?.totalOrders || 0,
              totalSpent: details?.totalSpent || 0,
              lat: getRandomCoord(33.5, 34.2),
              lng: getRandomCoord(-84.8, -83.8)
            }
          } catch { return { ...store, id: store._id, balanceDue: 0, lat: null, lng: null } }
        })
      )
      setCustomers(customersWithDetails.filter(c => c.lat && c.lng))

      const vendorsData = await getAllVendorsAPI()
      const vendorsWithCoords = (vendorsData || []).map((v: any) => ({
        ...v, id: v._id,
        lat: getRandomCoord(33.3, 34.0),
        lng: getRandomCoord(-84.6, -84.0)
      }))
      setVendors(vendorsWithCoords)

      const tripsData = await getAllTripsAPI(token)
      setTrips(Array.isArray(tripsData) ? tripsData : (tripsData?.data || []))

      const driversData = await getAllDriversAPI(token)
      setDrivers(Array.isArray(driversData) ? driversData : (driversData?.data || []))

      const totalReceivables = customersWithDetails.reduce((sum, c) => sum + (c.balanceDue || 0), 0)
      setStats({
        totalCustomers: customersWithDetails.length,
        customersWithBalance: customersWithDetails.filter(c => c.balanceDue > 0).length,
        totalVendors: vendorsWithCoords.length,
        activeTrips: (Array.isArray(tripsData) ? tripsData : (tripsData?.data || [])).filter((t: any) => t.status === "On Route").length,
        totalReceivables
      })
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !markersLayerRef.current) return
    markersLayerRef.current.clearLayers()

    if (showWarehouses) {
      warehouses.forEach(wh => {
        const marker = L.marker([wh.lat, wh.lng], { icon: warehouseIcon })
          .bindPopup(`<b>🏭 ${wh.name}</b><br/>${wh.address}`)
        marker.on("click", () => {
          setSelectedEntity({ type: "warehouse", data: wh })
          setDetailsOpen(true)
        })
        markersLayerRef.current?.addLayer(marker)
      })
    }

    if (showCustomers) {
      customers.filter(c => !searchQuery || c.storeName?.toLowerCase().includes(searchQuery.toLowerCase())).forEach(customer => {
        const icon = customer.balanceDue > 500 ? customerHighBalanceIcon : customerIcon
        const marker = L.marker([customer.lat, customer.lng], { icon })
          .bindPopup(`<b>🏪 ${customer.storeName}</b><br/>Balance: $${(customer.balanceDue || 0).toFixed(2)}`)
        marker.on("click", () => {
          setSelectedEntity({ type: "customer", data: customer })
          setDetailsOpen(true)
        })
        markersLayerRef.current?.addLayer(marker)
      })
    }

    if (showVendors) {
      vendors.filter(v => !searchQuery || v.name?.toLowerCase().includes(searchQuery.toLowerCase())).forEach(vendor => {
        const marker = L.marker([vendor.lat, vendor.lng], { icon: vendorIcon })
          .bindPopup(`<b>📦 ${vendor.name}</b><br/>${vendor.contactName || ""}`)
        marker.on("click", () => {
          setSelectedEntity({ type: "vendor", data: vendor })
          setDetailsOpen(true)
        })
        markersLayerRef.current?.addLayer(marker)
      })
    }
  }, [customers, vendors, showCustomers, showVendors, showWarehouses, searchQuery])

  useEffect(() => { if (!loading) updateMarkers() }, [loading, updateMarkers])

  const addStopToRoute = (entity: any, type: string) => {
    const newStop = {
      id: `${type}-${entity.id}-${Date.now()}`,
      type,
      entityId: entity.id,
      name: type === "customer" ? entity.storeName : entity.name,
      address: entity.address || `${entity.city || ""}, ${entity.state || "GA"}`,
      lat: entity.lat,
      lng: entity.lng,
      balanceDue: entity.balanceDue || 0
    }
    setRouteStops(prev => [...prev, newStop])
    toast({ title: "Stop Added", description: `${newStop.name} added to route` })
  }

  const removeStop = (stopId: string) => setRouteStops(prev => prev.filter(s => s.id !== stopId))

  const moveStop = (index: number, direction: "up" | "down") => {
    const newStops = [...routeStops]
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newStops.length) return
    ;[newStops[index], newStops[newIndex]] = [newStops[newIndex], newStops[index]]
    setRouteStops(newStops)
  }

  const calculateRoute = async () => {
    if (routeStops.length < 2) {
      toast({ variant: "destructive", title: "Error", description: "Add at least 2 stops" })
      return
    }
    if (!ORS_API_KEY) {
      toast({ variant: "destructive", title: "API Key Missing", description: "Add VITE_OPENROUTE_API_KEY to .env" })
      return
    }

    setOptimizingRoute(true)
    try {
      const coords: [number, number][] = routeStops.map(s => [s.lat, s.lng])
      const result = await openRouteService.getRoute(coords, routeProfile)
      
      if (result.features && result.features[0]) {
        const route = result.features[0]
        const summary = route.properties.summary
        
        // Draw route on map
        routeLayerRef.current?.clearLayers()
        const routeLine = L.geoJSON(route, {
          style: { color: "#3b82f6", weight: 5, opacity: 0.8 }
        })
        routeLayerRef.current?.addLayer(routeLine)
        mapRef.current?.fitBounds(routeLine.getBounds(), { padding: [50, 50] })

        setRouteInfo({
          distance: (summary.distance / 1609.34).toFixed(1), // Convert meters to miles
          duration: Math.round(summary.duration / 60), // Convert seconds to minutes
          segments: route.properties.segments
        })
        toast({ title: "Route Calculated", description: `${(summary.distance / 1609.34).toFixed(1)} miles, ~${Math.round(summary.duration / 60)} mins` })
      }
    } catch (error) {
      console.error("Route error:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to calculate route" })
    } finally {
      setOptimizingRoute(false)
    }
  }

  const optimizeRoute = async () => {
    if (routeStops.length < 3) {
      toast({ variant: "destructive", title: "Error", description: "Need at least 3 stops to optimize" })
      return
    }
    if (!ORS_API_KEY) {
      toast({ variant: "destructive", title: "API Key Missing", description: "Add VITE_OPENROUTE_API_KEY to .env" })
      return
    }

    setOptimizingRoute(true)
    try {
      const coords: [number, number][] = routeStops.map(s => [s.lat, s.lng])
      const result = await openRouteService.optimizeRoute(coords, routeProfile)
      
      if (result.routes && result.routes[0]) {
        const optimizedRoute = result.routes[0]
        const steps = optimizedRoute.steps
        
        // Reorder stops based on optimization
        const newOrder: any[] = [routeStops[0]] // Start
        steps.filter((s: any) => s.type === "job").forEach((step: any) => {
          const originalIndex = step.job
          newOrder.push(routeStops[originalIndex])
        })
        newOrder.push(routeStops[routeStops.length - 1]) // End
        setRouteStops(newOrder)

        // Calculate and draw the optimized route
        const optimizedCoords: [number, number][] = newOrder.map(s => [s.lat, s.lng])
        const routeResult = await openRouteService.getRoute(optimizedCoords, routeProfile)
        
        if (routeResult.features && routeResult.features[0]) {
          const route = routeResult.features[0]
          const summary = route.properties.summary
          
          routeLayerRef.current?.clearLayers()
          const routeLine = L.geoJSON(route, {
            style: { color: "#16a34a", weight: 5, opacity: 0.8 }
          })
          routeLayerRef.current?.addLayer(routeLine)
          mapRef.current?.fitBounds(routeLine.getBounds(), { padding: [50, 50] })

          setRouteInfo({
            distance: (summary.distance / 1609.34).toFixed(1),
            duration: Math.round(summary.duration / 60),
            optimized: true
          })
          toast({ title: "Route Optimized!", description: "Stops reordered for shortest path" })
        }
      }
    } catch (error) {
      console.error("Optimization error:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to optimize route" })
    } finally {
      setOptimizingRoute(false)
    }
  }

  const calculateIsochrone = async () => {
    if (!isochroneCenter) {
      toast({ variant: "destructive", title: "Error", description: "Select a location first" })
      return
    }
    if (!ORS_API_KEY) {
      toast({ variant: "destructive", title: "API Key Missing", description: "Add VITE_OPENROUTE_API_KEY to .env" })
      return
    }

    setCalculatingIsochrone(true)
    try {
      const result = await openRouteService.getIsochrone(
        [isochroneCenter.lat, isochroneCenter.lng],
        isochroneTimes,
        routeProfile
      )

      isochroneLayerRef.current?.clearLayers()
      
      const colors = ["#22c55e", "#eab308", "#ef4444"] // Green, Yellow, Red
      result.features.reverse().forEach((feature: any, i: number) => {
        const polygon = L.geoJSON(feature, {
          style: {
            fillColor: colors[i] || "#3b82f6",
            fillOpacity: 0.3,
            color: colors[i] || "#3b82f6",
            weight: 2
          }
        })
        polygon.bindPopup(`${isochroneTimes[result.features.length - 1 - i]} min drive time`)
        isochroneLayerRef.current?.addLayer(polygon)
      })

      mapRef.current?.fitBounds(isochroneLayerRef.current!.getBounds(), { padding: [50, 50] })
      toast({ title: "Isochrone Created", description: "Drive time areas displayed on map" })
    } catch (error) {
      console.error("Isochrone error:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to calculate drive times" })
    } finally {
      setCalculatingIsochrone(false)
    }
  }

  const saveRoute = async () => {
    if (!selectedDriver) {
      toast({ variant: "destructive", title: "Error", description: "Please select a driver" })
      return
    }
    if (routeStops.length < 2) {
      toast({ variant: "destructive", title: "Error", description: "Add at least 2 stops" })
      return
    }
    setSavingRoute(true)
    try {
      const tripData = {
        driver: selectedDriver,
        date: routeDate,
        route: {
          from: routeStops[0].name,
          to: routeStops[routeStops.length - 1].name,
          stops: routeStops.map(s => ({ name: s.name, address: s.address, type: s.type, entityId: s.entityId }))
        },
        status: "Planned",
        estimatedDistance: routeInfo?.distance ? `${routeInfo.distance} miles` : undefined,
        estimatedDuration: routeInfo?.duration ? `${routeInfo.duration} mins` : undefined,
        orders: routeStops.filter(s => s.type === "customer").map(s => s.entityId)
      }
      const result = await addTripAPI(tripData, token)
      if (result?.success !== false) {
        toast({ title: "Success", description: "Trip saved successfully" })
        setRoutePlannerOpen(false)
        setRouteStops([])
        setRouteInfo(null)
        setSelectedDriver("")
        routeLayerRef.current?.clearLayers()
        fetchData()
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save route" })
    } finally {
      setSavingRoute(false)
    }
  }

  const clearRoute = () => {
    setRouteStops([])
    setRouteInfo(null)
    routeLayerRef.current?.clearLayers()
  }

  const clearIsochrone = () => {
    isochroneLayerRef.current?.clearLayers()
    setIsochroneCenter(null)
  }

  const zoomIn = () => mapRef.current?.zoomIn()
  const zoomOut = () => mapRef.current?.zoomOut()
  const centerMap = () => mapRef.current?.setView([33.749, -84.388], 8)

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              OpenRouteService Map
              <Badge variant="secondary" className="ml-2">Free & Open Source</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Advanced routing with optimization & drive time analysis</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-[150px]" />
            </div>
            <Button onClick={() => setRoutePlannerOpen(true)} className="gap-2">
              <Route className="h-4 w-4" /> Plan Route
            </Button>
            <Button variant="outline" onClick={() => setIsochroneOpen(true)} className="gap-2">
              <Target className="h-4 w-4" /> Drive Time
            </Button>
            <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r bg-white overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <StatsCard title="Customers" value={stats.totalCustomers} icon={Users} color="blue" />
            <StatsCard title="Vendors" value={stats.totalVendors} icon={Building2} color="purple" />
            <StatsCard title="Active Trips" value={stats.activeTrips} icon={Truck} color="orange" />
            <StatsCard title="With Balance" value={stats.customersWithBalance} icon={DollarSign} color="red" />
          </div>

          {stats.totalReceivables > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">Outstanding</span>
              </div>
              <p className="text-lg font-bold text-red-600">{formatCurrency(stats.totalReceivables)}</p>
            </div>
          )}

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" />Layers</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { checked: showWarehouses, set: setShowWarehouses, color: "#16a34a", label: `Warehouses (${warehouses.length})` },
                { checked: showCustomers, set: setShowCustomers, color: "#3b82f6", label: `Customers (${customers.length})` },
                { checked: showVendors, set: setShowVendors, color: "#8b5cf6", label: `Vendors (${vendors.length})` }
              ].map((layer, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={layer.checked} onChange={(e) => layer.set(e.target.checked)} className="rounded" />
                  <span className="text-sm flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: layer.color }}></span>
                    {layer.label}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-blue-500" />
                <span>Multi-stop route planning</span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-green-500" />
                <span>Route optimization (TSP)</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span>Isochrone (drive time areas)</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-orange-500" />
                <span>Multiple vehicle profiles</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Top Balances</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {customers.filter(c => c.balanceDue > 0).sort((a, b) => b.balanceDue - a.balanceDue).slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted"
                  onClick={() => mapRef.current?.setView([c.lat, c.lng], 12)}>
                  <span className="text-xs truncate flex-1">{c.storeName}</span>
                  <span className="text-xs font-bold text-red-600">{formatCurrency(c.balanceDue)}</span>
                </div>
              ))}
              {customers.filter(c => c.balanceDue > 0).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No outstanding balances</p>}
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="h-full w-full" />
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
            <Button variant="secondary" size="icon" onClick={zoomIn} className="shadow-md"><ZoomIn className="h-4 w-4" /></Button>
            <Button variant="secondary" size="icon" onClick={zoomOut} className="shadow-md"><ZoomOut className="h-4 w-4" /></Button>
            <Button variant="secondary" size="icon" onClick={centerMap} className="shadow-md"><Locate className="h-4 w-4" /></Button>
          </div>
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[1000]">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading map data...</p>
              </div>
            </div>
          )}
          {!ORS_API_KEY && (
            <div className="absolute bottom-4 left-4 right-4 z-[1000]">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-800">⚠️ OpenRouteService API Key Required</p>
                <p className="text-amber-700 text-xs mt-1">Get a free key at <a href="https://openrouteservice.org/dev/#/signup" target="_blank" className="underline">openrouteservice.org</a> and add VITE_OPENROUTE_API_KEY to .env</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Route Planner Sheet */}
      <Sheet open={routePlannerOpen} onOpenChange={setRoutePlannerOpen}>
        <SheetContent className="w-[400px] sm:max-w-[400px] z-[1001] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Route className="h-5 w-5" />Route Planner</SheetTitle>
            <SheetDescription>Create and optimize delivery routes with OpenRouteService</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Driver</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map((d: any) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={routeDate} onChange={(e) => setRouteDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Vehicle Type</Label>
              <Select value={routeProfile} onValueChange={setRouteProfile}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="driving-car">🚗 Car</SelectItem>
                  <SelectItem value="driving-hgv">🚚 Truck (HGV)</SelectItem>
                  <SelectItem value="cycling-regular">🚴 Bicycle</SelectItem>
                  <SelectItem value="foot-walking">🚶 Walking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Add Stop</Label>
              <Select onValueChange={(val) => {
                const [type, id] = val.split(":")
                const entity = type === "warehouse" ? warehouses.find(w => w.id === id) :
                  type === "customer" ? customers.find(c => c.id === id) : vendors.find(v => v.id === id)
                if (entity) addStopToRoute(entity, type)
              }}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="header-wh" disabled className="font-bold">— Warehouses —</SelectItem>
                  {warehouses.map(w => <SelectItem key={w.id} value={`warehouse:${w.id}`}>🏭 {w.name}</SelectItem>)}
                  <SelectItem value="header-cust" disabled className="font-bold">— Customers —</SelectItem>
                  {customers.slice(0, 20).map(c => <SelectItem key={c.id} value={`customer:${c.id}`}>🏪 {c.storeName}</SelectItem>)}
                  <SelectItem value="header-vend" disabled className="font-bold">— Vendors —</SelectItem>
                  {vendors.slice(0, 10).map(v => <SelectItem key={v.id} value={`vendor:${v.id}`}>📦 {v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Route Stops ({routeStops.length})</Label>
                {routeStops.length > 0 && <Button variant="ghost" size="sm" onClick={clearRoute} className="h-6 text-xs"><Trash2 className="h-3 w-3 mr-1" />Clear</Button>}
              </div>
              <ScrollArea className="h-[180px] border rounded-lg p-2">
                {routeStops.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No stops added yet</p>
                ) : (
                  <div className="space-y-2">
                    {routeStops.map((stop, idx) => (
                      <div key={stop.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded group">
                        <div className="flex flex-col gap-0.5">
                          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveStop(idx, "up")} disabled={idx === 0}>▲</Button>
                          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveStop(idx, "down")} disabled={idx === routeStops.length - 1}>▼</Button>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{idx + 1}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{stop.name}</p>
                          <p className="text-[10px] text-muted-foreground">{stop.type}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeStop(stop.id)}><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={calculateRoute} disabled={routeStops.length < 2 || optimizingRoute}>
                <Play className="h-4 w-4 mr-1" />{optimizingRoute ? "..." : "Calculate"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={optimizeRoute} disabled={routeStops.length < 3 || optimizingRoute}>
                <Navigation className="h-4 w-4 mr-1" />Optimize
              </Button>
            </div>

            {routeInfo && (
              <div className={`p-3 border rounded-lg space-y-2 ${routeInfo.optimized ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${routeInfo.optimized ? "text-green-700" : "text-blue-700"}`}>
                    {routeInfo.optimized ? "✓ Optimized Route" : "Route Summary"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1"><Fuel className="h-3 w-3" />{routeInfo.distance} miles</div>
                  <div className="flex items-center gap-1"><Timer className="h-3 w-3" />{routeInfo.duration} mins</div>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={saveRoute} disabled={savingRoute || routeStops.length < 2 || !selectedDriver}>
              <Save className="h-4 w-4 mr-2" />{savingRoute ? "Saving..." : "Save Trip"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Isochrone (Drive Time) Dialog */}
      <Dialog open={isochroneOpen} onOpenChange={setIsochroneOpen}>
        <DialogContent className="sm:max-w-md z-[1002]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Drive Time Analysis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Show areas reachable within specific drive times from a location. Great for delivery zone planning.
            </p>
            
            <div>
              <Label className="text-xs">Center Location</Label>
              <Select onValueChange={(val) => {
                const [type, id] = val.split(":")
                const entity = type === "warehouse" ? warehouses.find(w => w.id === id) :
                  type === "customer" ? customers.find(c => c.id === id) : vendors.find(v => v.id === id)
                if (entity) setIsochroneCenter(entity)
              }}>
                <SelectTrigger><SelectValue placeholder="Select center point" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="header-wh" disabled className="font-bold">— Warehouses —</SelectItem>
                  {warehouses.map(w => <SelectItem key={w.id} value={`warehouse:${w.id}`}>🏭 {w.name}</SelectItem>)}
                  <SelectItem value="header-cust" disabled className="font-bold">— Customers —</SelectItem>
                  {customers.slice(0, 10).map(c => <SelectItem key={c.id} value={`customer:${c.id}`}>🏪 {c.storeName}</SelectItem>)}
                </SelectContent>
              </Select>
              {isochroneCenter && <p className="text-xs text-muted-foreground mt-1">Selected: {isochroneCenter.name || isochroneCenter.storeName}</p>}
            </div>

            <div>
              <Label className="text-xs">Vehicle Type</Label>
              <Select value={routeProfile} onValueChange={setRouteProfile}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="driving-car">🚗 Car</SelectItem>
                  <SelectItem value="driving-hgv">🚚 Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Time Ranges (minutes)</Label>
              <div className="flex gap-2 mt-2">
                {isochroneTimes.map((t, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full ${i === 0 ? "bg-green-500" : i === 1 ? "bg-yellow-500" : "bg-red-500"}`}></div>
                    <Input 
                      type="number" 
                      value={t} 
                      onChange={(e) => {
                        const newTimes = [...isochroneTimes]
                        newTimes[i] = parseInt(e.target.value) || 0
                        setIsochroneTimes(newTimes)
                      }}
                      className="w-16 h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={clearIsochrone}>Clear</Button>
              <Button onClick={calculateIsochrone} disabled={!isochroneCenter || calculatingIsochrone}>
                {calculatingIsochrone ? "Calculating..." : "Show Drive Times"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Entity Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md z-[1002]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntity?.type === "customer" && <><Store className="h-5 w-5 text-blue-600" />Customer</>}
              {selectedEntity?.type === "vendor" && <><Building2 className="h-5 w-5 text-purple-600" />Vendor</>}
              {selectedEntity?.type === "warehouse" && <><Warehouse className="h-5 w-5 text-green-600" />Warehouse</>}
            </DialogTitle>
          </DialogHeader>
          {selectedEntity && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg">{selectedEntity.data.storeName || selectedEntity.data.name}</h3>
                <p className="text-muted-foreground">{selectedEntity.data.ownerName || selectedEntity.data.contactName || selectedEntity.data.address}</p>
              </div>
              {selectedEntity.type !== "warehouse" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{selectedEntity.data.phone || "N/A"}</span></div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm truncate">{selectedEntity.data.email || "N/A"}</span></div>
                </div>
              )}
              {selectedEntity.type === "customer" && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total Orders</span><span className="font-medium">{selectedEntity.data.totalOrders || 0}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Balance Due</span><span className={`font-bold ${selectedEntity.data.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(selectedEntity.data.balanceDue || 0)}</span></div>
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setIsochroneCenter(selectedEntity.data); setIsochroneOpen(true); setDetailsOpen(false) }}>
                  <Target className="h-4 w-4 mr-2" />Drive Time
                </Button>
                <Button variant="outline" onClick={() => { addStopToRoute(selectedEntity.data, selectedEntity.type); setDetailsOpen(false) }}>
                  <Plus className="h-4 w-4 mr-2" />Add to Route
                </Button>
                {selectedEntity.type === "customer" && (
                  <Button onClick={() => window.location.href = `/clients/${selectedEntity.data.id}`}>
                    <Eye className="h-4 w-4 mr-2" />View
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MapOpenRoute
