"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import Sidebar from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Trash2, Layers, ZoomIn, ZoomOut, Locate, Timer, Fuel, Eye
} from "lucide-react"
import { getAllMembersAPI, userWithOrderDetails } from "@/services2/operations/auth"
import { getAllVendorsAPI } from "@/services2/operations/vendor"
import { getAllTripsAPI, addTripAPI } from "@/services2/operations/trips"
import { getAllDriversAPI } from "@/services2/operations/driverAndTruck"
import { getAllOrderAPI } from "@/services2/operations/order"
import { loadGoogleMaps } from "@/utils/loadGoogleMaps"

declare global {
  interface Window {
    google: any
  }
}

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

const MapGoogle = () => {
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
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const directionsServiceRef = useRef<any>(null)
  const directionsRendererRef = useRef<any>(null)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])

  const [showCustomers, setShowCustomers] = useState(true)
  const [showVendors, setShowVendors] = useState(true)
  const [showWarehouses, setShowWarehouses] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const [routePlannerOpen, setRoutePlannerOpen] = useState(false)
  const [routeStops, setRouteStops] = useState<any[]>([])
  const [selectedDriver, setSelectedDriver] = useState("")
  const [selectedTruck, setSelectedTruck] = useState("")
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0])
  const [routeInfo, setRouteInfo] = useState<any>(null)
  const [optimizingRoute, setOptimizingRoute] = useState(false)
  const [savingRoute, setSavingRoute] = useState(false)

  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

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

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      toast({ variant: "destructive", title: "Error", description: "Google Maps API key not configured. Add VITE_GOOGLE_MAPS_API_KEY to .env" })
      setMapLoaded(true)
      return
    }
    loadGoogleMaps(apiKey)
      .then(() => {
        if (mapRef.current && window.google) {
          googleMapRef.current = new window.google.maps.Map(mapRef.current, {
            center: { lat: 33.749, lng: -84.388 },
            zoom: 8,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
          })
          directionsServiceRef.current = new window.google.maps.DirectionsService()
          directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
            map: googleMapRef.current,
            suppressMarkers: false,
            polylineOptions: { strokeColor: "#3b82f6", strokeWeight: 5 }
          })
          setMapLoaded(true)
        }
      })
      .catch((err) => {
        console.error("Failed to load Google Maps:", err)
        toast({ variant: "destructive", title: "Error", description: "Failed to load Google Maps" })
        setMapLoaded(true)
      })
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

      const ordersData = await getAllOrderAPI(token)
      setOrders(ordersData?.orders || [])

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

  useEffect(() => { if (mapLoaded) fetchData() }, [mapLoaded])

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
  }

  const createMarkerIcon = (color: string, label: string) => ({
    path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
    scale: 12,
    labelOrigin: new window.google.maps.Point(0, 0)
  })

  const updateMarkers = useCallback(() => {
    if (!googleMapRef.current || !window.google) return
    clearMarkers()

    if (showWarehouses) {
      warehouses.forEach(wh => {
        const marker = new window.google.maps.Marker({
          position: { lat: wh.lat, lng: wh.lng },
          map: googleMapRef.current,
          icon: { ...createMarkerIcon("#16a34a", "W"), scale: 14 },
          label: { text: "🏭", fontSize: "16px" },
          title: wh.name
        })
        marker.addListener("click", () => {
          setSelectedEntity({ type: "warehouse", data: wh })
          setDetailsOpen(true)
        })
        markersRef.current.push(marker)
      })
    }

    if (showCustomers) {
      customers.filter(c => !searchQuery || c.storeName?.toLowerCase().includes(searchQuery.toLowerCase())).forEach(customer => {
        const marker = new window.google.maps.Marker({
          position: { lat: customer.lat, lng: customer.lng },
          map: googleMapRef.current,
          icon: createMarkerIcon(customer.balanceDue > 500 ? "#ef4444" : "#3b82f6", "C"),
          label: { text: "🏪", fontSize: "14px" },
          title: customer.storeName
        })
        marker.addListener("click", () => {
          setSelectedEntity({ type: "customer", data: customer })
          setDetailsOpen(true)
        })
        markersRef.current.push(marker)
      })
    }

    if (showVendors) {
      vendors.filter(v => !searchQuery || v.name?.toLowerCase().includes(searchQuery.toLowerCase())).forEach(vendor => {
        const marker = new window.google.maps.Marker({
          position: { lat: vendor.lat, lng: vendor.lng },
          map: googleMapRef.current,
          icon: createMarkerIcon("#8b5cf6", "V"),
          label: { text: "📦", fontSize: "14px" },
          title: vendor.name
        })
        marker.addListener("click", () => {
          setSelectedEntity({ type: "vendor", data: vendor })
          setDetailsOpen(true)
        })
        markersRef.current.push(marker)
      })
    }
  }, [customers, vendors, showCustomers, showVendors, showWarehouses, searchQuery])

  useEffect(() => { if (mapLoaded && !loading) updateMarkers() }, [mapLoaded, loading, updateMarkers])

  const addStopToRoute = (entity: any, type: string) => {
    const newStop = {
      id: `${type}-${entity.id}-${Date.now()}`,
      type,
      entityId: entity.id,
      name: type === "customer" ? entity.storeName : type === "vendor" ? entity.name : entity.name,
      address: entity.address || `${entity.city || ""}, ${entity.state || "GA"}`,
      lat: entity.lat,
      lng: entity.lng,
      balanceDue: entity.balanceDue || 0
    }
    setRouteStops(prev => [...prev, newStop])
    toast({ title: "Stop Added", description: `${newStop.name} added to route` })
  }

  const removeStop = (stopId: string) => {
    setRouteStops(prev => prev.filter(s => s.id !== stopId))
  }

  const moveStop = (index: number, direction: "up" | "down") => {
    const newStops = [...routeStops]
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newStops.length) return
    ;[newStops[index], newStops[newIndex]] = [newStops[newIndex], newStops[index]]
    setRouteStops(newStops)
  }

  const calculateRoute = async () => {
    if (routeStops.length < 2) {
      toast({ variant: "destructive", title: "Error", description: "Add at least 2 stops to calculate route" })
      return
    }
    if (!directionsServiceRef.current || !directionsRendererRef.current) return

    setOptimizingRoute(true)
    try {
      const origin = { lat: routeStops[0].lat, lng: routeStops[0].lng }
      const destination = { lat: routeStops[routeStops.length - 1].lat, lng: routeStops[routeStops.length - 1].lng }
      const waypoints = routeStops.slice(1, -1).map(stop => ({
        location: { lat: stop.lat, lng: stop.lng },
        stopover: true
      }))

      const request = {
        origin,
        destination,
        waypoints,
        optimizeWaypoints: false,
        travelMode: window.google.maps.TravelMode.DRIVING
      }

      directionsServiceRef.current.route(request, (result: any, status: any) => {
        if (status === "OK") {
          directionsRendererRef.current.setDirections(result)
          const route = result.routes[0]
          let totalDistance = 0, totalDuration = 0
          route.legs.forEach((leg: any) => {
            totalDistance += leg.distance.value
            totalDuration += leg.duration.value
          })
          setRouteInfo({
            distance: (totalDistance / 1609.34).toFixed(1),
            duration: Math.round(totalDuration / 60),
            legs: route.legs.map((leg: any) => ({
              distance: leg.distance.text,
              duration: leg.duration.text,
              start: leg.start_address,
              end: leg.end_address
            }))
          })
          toast({ title: "Route Calculated", description: `${(totalDistance / 1609.34).toFixed(1)} miles, ~${Math.round(totalDuration / 60)} mins` })
        } else {
          toast({ variant: "destructive", title: "Error", description: "Could not calculate route" })
        }
        setOptimizingRoute(false)
      })
    } catch (error) {
      console.error("Route calculation error:", error)
      setOptimizingRoute(false)
    }
  }

  const optimizeRoute = async () => {
    if (routeStops.length < 3) {
      toast({ variant: "destructive", title: "Error", description: "Need at least 3 stops to optimize" })
      return
    }
    setOptimizingRoute(true)
    try {
      const origin = { lat: routeStops[0].lat, lng: routeStops[0].lng }
      const destination = { lat: routeStops[routeStops.length - 1].lat, lng: routeStops[routeStops.length - 1].lng }
      const waypoints = routeStops.slice(1, -1).map(stop => ({
        location: { lat: stop.lat, lng: stop.lng },
        stopover: true
      }))

      directionsServiceRef.current.route({
        origin, destination, waypoints,
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result: any, status: any) => {
        if (status === "OK") {
          const optimizedOrder = result.routes[0].waypoint_order
          const middleStops = routeStops.slice(1, -1)
          const reorderedMiddle = optimizedOrder.map((i: number) => middleStops[i])
          setRouteStops([routeStops[0], ...reorderedMiddle, routeStops[routeStops.length - 1]])
          directionsRendererRef.current.setDirections(result)
          const route = result.routes[0]
          let totalDistance = 0, totalDuration = 0
          route.legs.forEach((leg: any) => {
            totalDistance += leg.distance.value
            totalDuration += leg.duration.value
          })
          setRouteInfo({
            distance: (totalDistance / 1609.34).toFixed(1),
            duration: Math.round(totalDuration / 60),
            legs: route.legs.map((leg: any) => ({
              distance: leg.distance.text,
              duration: leg.duration.text,
              start: leg.start_address,
              end: leg.end_address
            }))
          })
          toast({ title: "Route Optimized", description: "Stops reordered for shortest path" })
        }
        setOptimizingRoute(false)
      })
    } catch (error) {
      setOptimizingRoute(false)
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
        truck: selectedTruck || undefined,
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
        toast({ title: "Success", description: "Trip route saved successfully" })
        setRoutePlannerOpen(false)
        setRouteStops([])
        setRouteInfo(null)
        setSelectedDriver("")
        setSelectedTruck("")
        directionsRendererRef.current?.setDirections({ routes: [] })
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
    directionsRendererRef.current?.setDirections({ routes: [] })
  }

  const zoomIn = () => googleMapRef.current?.setZoom((googleMapRef.current.getZoom() || 8) + 1)
  const zoomOut = () => googleMapRef.current?.setZoom((googleMapRef.current.getZoom() || 8) - 1)
  const centerMap = () => googleMapRef.current?.setCenter({ lat: 33.749, lng: -84.388 })

  const availableForRoute = [
    ...warehouses.map(w => ({ ...w, id: w.id, type: "warehouse" })),
    ...customers.map(c => ({ ...c, type: "customer" })),
    ...vendors.map(v => ({ ...v, type: "vendor" }))
  ].filter(e => !routeStops.find(s => s.entityId === e.id && s.type === e.type))

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Google Maps - Route Planner
            </h1>
            <p className="text-sm text-muted-foreground">Plan delivery routes with Google Maps</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-[180px]" />
            </div>
            <Button onClick={() => setRoutePlannerOpen(true)} className="gap-2">
              <Route className="h-4 w-4" /> Plan Route
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
                { checked: showWarehouses, set: setShowWarehouses, color: "green", label: `Warehouses (${warehouses.length})` },
                { checked: showCustomers, set: setShowCustomers, color: "blue", label: `Customers (${customers.length})` },
                { checked: showVendors, set: setShowVendors, color: "purple", label: `Vendors (${vendors.length})` }
              ].map((layer, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={layer.checked} onChange={(e) => layer.set(e.target.checked)} className="rounded" />
                  <span className="text-sm flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-full bg-${layer.color}-500`} style={{ backgroundColor: layer.color === "green" ? "#16a34a" : layer.color === "blue" ? "#3b82f6" : "#8b5cf6" }}></span>
                    {layer.label}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Top Balances</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {customers.filter(c => c.balanceDue > 0).sort((a, b) => b.balanceDue - a.balanceDue).slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted"
                  onClick={() => googleMapRef.current?.panTo({ lat: c.lat, lng: c.lng })}>
                  <span className="text-xs truncate flex-1">{c.storeName}</span>
                  <span className="text-xs font-bold text-red-600">{formatCurrency(c.balanceDue)}</span>
                </div>
              ))}
              {customers.filter(c => c.balanceDue > 0).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No outstanding balances</p>}
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 relative">
          <div ref={mapRef} className="h-full w-full" />
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <Button variant="secondary" size="icon" onClick={zoomIn} className="shadow-md"><ZoomIn className="h-4 w-4" /></Button>
            <Button variant="secondary" size="icon" onClick={zoomOut} className="shadow-md"><ZoomOut className="h-4 w-4" /></Button>
            <Button variant="secondary" size="icon" onClick={centerMap} className="shadow-md"><Locate className="h-4 w-4" /></Button>
          </div>
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading map data...</p>
              </div>
            </div>
          )}
          {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && mapLoaded && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-20">
              <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">Google Maps API Key Required</h3>
                <p className="text-sm text-muted-foreground mb-4">Add VITE_GOOGLE_MAPS_API_KEY to your .env file to enable Google Maps.</p>
                <code className="text-xs bg-gray-100 p-2 rounded block">VITE_GOOGLE_MAPS_API_KEY=your_api_key_here</code>
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet open={routePlannerOpen} onOpenChange={setRoutePlannerOpen}>
        <SheetContent className="w-[450px] sm:max-w-[450px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Route className="h-5 w-5" />Route Planner</SheetTitle>
            <SheetDescription>Create and optimize delivery routes</SheetDescription>
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
              <Label className="text-xs mb-2 block">Add Stop</Label>
              <Select onValueChange={(val) => {
                const [type, id] = val.split(":")
                const entity = type === "warehouse" ? warehouses.find(w => w.id === id) :
                  type === "customer" ? customers.find(c => c.id === id) : vendors.find(v => v.id === id)
                if (entity) addStopToRoute(entity, type)
              }}>
                <SelectTrigger><SelectValue placeholder="Select location to add" /></SelectTrigger>
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
              <ScrollArea className="h-[200px] border rounded-lg p-2">
                {routeStops.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No stops added yet</p>
                ) : (
                  <div className="space-y-2">
                    {routeStops.map((stop, idx) => (
                      <div key={stop.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded group">
                        <div className="flex flex-col gap-0.5">
                          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveStop(idx, "up")} disabled={idx === 0}>
                            <GripVertical className="h-3 w-3 rotate-180" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveStop(idx, "down")} disabled={idx === routeStops.length - 1}>
                            <GripVertical className="h-3 w-3" />
                          </Button>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{idx + 1}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{stop.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{stop.type}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeStop(stop.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={calculateRoute} disabled={routeStops.length < 2 || optimizingRoute}>
                <Play className="h-4 w-4 mr-1" />{optimizingRoute ? "Calculating..." : "Calculate"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={optimizeRoute} disabled={routeStops.length < 3 || optimizingRoute}>
                <Navigation className="h-4 w-4 mr-1" />Optimize
              </Button>
            </div>

            {routeInfo && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">Route Summary</span>
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

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
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
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total Spent</span><span className="font-medium">{formatCurrency(selectedEntity.data.totalSpent || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Balance Due</span><span className={`font-bold ${selectedEntity.data.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(selectedEntity.data.balanceDue || 0)}</span></div>
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { addStopToRoute(selectedEntity.data, selectedEntity.type); setDetailsOpen(false) }}>
                  <Plus className="h-4 w-4 mr-2" />Add to Route
                </Button>
                {selectedEntity.type === "customer" && (
                  <Button onClick={() => window.location.href = `/clients/${selectedEntity.data.id}`}>
                    <Eye className="h-4 w-4 mr-2" />View Profile
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

export default MapGoogle
