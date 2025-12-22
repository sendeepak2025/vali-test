"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  User,
  Edit,
  RefreshCw,
  CheckCircle2,
  Phone,
  Loader2,
  X,
  CreditCard,
  Calendar,
  Trash2,
  Eye,
  UserCheck,
  UserX,
} from "lucide-react"
import { getAllDriversAPI, addDriverAPI, updateDriverAPI } from "@/services2/operations/driverAndTruck"
import { cn } from "@/lib/utils"

interface TruckType {
  _id?: string
  truck_number: string
  capacity_kg: number
  capacity_m3: number
  active: boolean
}

interface DriverType {
  _id: string
  name: string
  phone: string
  license_number: string
  license_expiry_date: string
  active: boolean
  trucks: TruckType[]
  createdAt: string
}

const ManageDriversEnhanced = () => {
  const token = useSelector((state: RootState) => state.auth.token)
  const { toast } = useToast()

  // Data states
  const [drivers, setDrivers] = useState<DriverType[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")

  // Modal states
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [showTrucksModal, setShowTrucksModal] = useState(false)
  const [editDriver, setEditDriver] = useState<DriverType | null>(null)
  const [viewTrucks, setViewTrucks] = useState<TruckType[]>([])

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    license_number: "",
    license_expiry_date: "",
    active: true,
    trucks: [] as TruckType[],
  })
  const [submitting, setSubmitting] = useState(false)

  // Fetch drivers
  const fetchDrivers = async () => {
    try {
      const data = await getAllDriversAPI(token)
      setDrivers(data || [])
    } catch (error) {
      console.error("Error fetching drivers:", error)
      toast({ title: "Error", description: "Failed to fetch drivers", variant: "destructive" })
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchDrivers()
      setLoading(false)
    }
    loadData()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDrivers()
    setRefreshing(false)
  }

  // Filter drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      const matchesSearch = !searchQuery || 
        driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone?.includes(searchQuery) ||
        driver.license_number?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesActive = activeFilter === "all" || 
        (activeFilter === "active" && driver.active) ||
        (activeFilter === "inactive" && !driver.active)
      
      return matchesSearch && matchesActive
    })
  }, [drivers, searchQuery, activeFilter])

  // Stats
  const stats = useMemo(() => ({
    total: drivers.length,
    active: drivers.filter(d => d.active).length,
    inactive: drivers.filter(d => !d.active).length,
    totalTrucks: drivers.reduce((sum, d) => sum + (d.trucks?.length || 0), 0),
  }), [drivers])

  // Open add modal
  const openAddModal = () => {
    setEditDriver(null)
    setFormData({
      name: "",
      phone: "",
      license_number: "",
      license_expiry_date: "",
      active: true,
      trucks: [],
    })
    setShowDriverModal(true)
  }

  // Open edit modal
  const openEditModal = (driver: DriverType) => {
    setEditDriver(driver)
    setFormData({
      name: driver.name || "",
      phone: driver.phone || "",
      license_number: driver.license_number || "",
      license_expiry_date: driver.license_expiry_date?.slice(0, 10) || "",
      active: driver.active,
      trucks: driver.trucks || [],
    })
    setShowDriverModal(true)
  }

  // Add truck to form
  const addTruck = () => {
    setFormData(prev => ({
      ...prev,
      trucks: [...prev.trucks, { truck_number: "", capacity_kg: 0, capacity_m3: 0, active: true }]
    }))
  }

  // Remove truck from form
  const removeTruck = (index: number) => {
    setFormData(prev => ({
      ...prev,
      trucks: prev.trucks.filter((_, i) => i !== index)
    }))
  }

  // Update truck in form
  const updateTruck = (index: number, field: keyof TruckType, value: any) => {
    setFormData(prev => {
      const trucks = [...prev.trucks]
      trucks[index] = { ...trucks[index], [field]: value }
      return { ...prev, trucks }
    })
  }

  // Submit driver
  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.license_number) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      if (editDriver) {
        await updateDriverAPI(editDriver._id, formData, token)()
        toast({ title: "Success", description: "Driver updated successfully!" })
      } else {
        await addDriverAPI(formData, token)
        toast({ title: "Success", description: "Driver added successfully!" })
      }

      setShowDriverModal(false)
      fetchDrivers()
    } catch (error) {
      toast({ title: "Error", description: "Failed to save driver", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // Check if license is expiring soon (within 30 days)
  const isLicenseExpiringSoon = (date: string) => {
    if (!date) return false
    const expiry = new Date(date)
    const today = new Date()
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 30 && diffDays > 0
  }

  const isLicenseExpired = (date: string) => {
    if (!date) return false
    return new Date(date) < new Date()
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
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveFilter("all")}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Drivers</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
            <User className="h-5 w-5 text-blue-500" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveFilter("active")}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold text-green-600">{stats.active}</p>
            </div>
            <UserCheck className="h-5 w-5 text-green-500" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveFilter("inactive")}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Inactive</p>
              <p className="text-xl font-bold text-red-600">{stats.inactive}</p>
            </div>
            <UserX className="h-5 w-5 text-red-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Trucks</p>
              <p className="text-xl font-bold text-purple-600">{stats.totalTrucks}</p>
            </div>
            <Truck className="h-5 w-5 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-[200px] h-9"
            />
          </div>
          
          <div className="flex gap-1">
            {(["all", "active", "inactive"] as const).map(filter => (
              <Button
                key={filter}
                size="sm"
                variant={activeFilter === filter ? "default" : "outline"}
                onClick={() => setActiveFilter(filter)}
                className="h-9 capitalize"
              >
                {filter}
              </Button>
            ))}
          </div>

          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="h-9">
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
            Add Driver
          </Button>
        </div>
      </div>

      {/* Drivers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Driver</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>License</TableHead>
                <TableHead>License Expiry</TableHead>
                <TableHead className="text-center">Trucks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No drivers found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map(driver => (
                  <TableRow key={driver._id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
                          driver.active ? "bg-green-500" : "bg-gray-400"
                        )}>
                          {driver.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="font-medium">{driver.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" /> {driver.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <CreditCard className="h-3 w-3" /> {driver.license_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isLicenseExpired(driver.license_expiry_date) ? (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        ) : isLicenseExpiringSoon(driver.license_expiry_date) ? (
                          <Badge className="bg-amber-100 text-amber-700 text-xs">Expiring Soon</Badge>
                        ) : (
                          <span className="text-sm">
                            {driver.license_expiry_date ? new Date(driver.license_expiry_date).toLocaleDateString() : "-"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => { setViewTrucks(driver.trucks || []); setShowTrucksModal(true) }}
                      >
                        <Truck className="h-3 w-3 mr-1" />
                        {driver.trucks?.length || 0}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge className={driver.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                        {driver.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openEditModal(driver)}
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

      {/* Add/Edit Driver Modal */}
      <Dialog open={showDriverModal} onOpenChange={setShowDriverModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDriver ? "Edit Driver" : "Add New Driver"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Driver Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Driver name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone *</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">License Number *</label>
                <Input
                  value={formData.license_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                  placeholder="License number"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">License Expiry</label>
                <Input
                  type="date"
                  value={formData.license_expiry_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, license_expiry_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked as boolean }))}
              />
              <label className="text-sm font-medium">Active Driver</label>
            </div>

            {/* Trucks Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Trucks ({formData.trucks.length})</h3>
                <Button size="sm" variant="outline" onClick={addTruck}>
                  <Plus className="h-4 w-4 mr-1" /> Add Truck
                </Button>
              </div>

              {formData.trucks.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-gray-50 rounded-lg">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No trucks added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.trucks.map((truck, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                      <div className="col-span-3">
                        <label className="text-xs font-medium">Truck Number</label>
                        <Input
                          value={truck.truck_number}
                          onChange={(e) => updateTruck(index, "truck_number", e.target.value)}
                          placeholder="ABC-123"
                          className="mt-1 h-9"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs font-medium">Capacity (lbs)</label>
                        <Input
                          type="number"
                          value={truck.capacity_kg}
                          onChange={(e) => updateTruck(index, "capacity_kg", Number(e.target.value))}
                          className="mt-1 h-9"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium">Volume (m³)</label>
                        <Input
                          type="number"
                          value={truck.capacity_m3}
                          onChange={(e) => updateTruck(index, "capacity_m3", Number(e.target.value))}
                          className="mt-1 h-9"
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-2 pb-1">
                        <Checkbox
                          checked={truck.active}
                          onCheckedChange={(checked) => updateTruck(index, "active", checked)}
                        />
                        <span className="text-xs">Active</span>
                      </div>
                      <div className="col-span-2 flex justify-end pb-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeTruck(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDriverModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editDriver ? "Update Driver" : "Add Driver"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Trucks Modal */}
      <Dialog open={showTrucksModal} onOpenChange={setShowTrucksModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Trucks ({viewTrucks.length})</DialogTitle>
          </DialogHeader>
          
          {viewTrucks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No trucks assigned</p>
            </div>
          ) : (
            <div className="space-y-2">
              {viewTrucks.map((truck, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{truck.truck_number}</span>
                    <Badge className={truck.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                      {truck.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>Capacity: {truck.capacity_kg} lbs</div>
                    <div>Volume: {truck.capacity_m3} m³</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ManageDriversEnhanced
