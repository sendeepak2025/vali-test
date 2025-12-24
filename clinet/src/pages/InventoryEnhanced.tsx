"use client"

import React, { useState, useEffect, useRef } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Navbar from "@/components/layout/Navbar"
import PageHeader from "@/components/shared/PageHeader"
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import {
  Package, Search, RefreshCw, Plus, Eye, Trash2, Edit, Download,
  Upload, AlertTriangle, TrendingUp, TrendingDown, DollarSign,
  MoreVertical, ArrowUpDown, Leaf, Snowflake, Sun, ChevronLeft, ChevronRight,
  Percent, Box, ImageIcon, Loader, XCircle, RotateCcw, Zap, MapPin,
  Store, ListFilter, Tags, ChevronsLeft, ChevronsRight
} from "lucide-react"
import { getLowStockProducts, type Product, createReorder, getReorders, type Reorder } from "@/lib/data"
import { getAllProductSummaryAPI } from "@/services2/operations/product"
import { getAllCategoriesAPI } from "@/services2/operations/category"
import { useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import Swal from "sweetalert2"
import AddProductForm from "@/components/inventory/AddProductForm"
import InventoryTable from "@/components/inventory/InventoryTable"
import BulkActions from "@/components/inventory/BulkActions"
import ReorderForm from "@/components/inventory/ReorderForm"
import PriceUpdateModal from "@/components/inventory/PriceUpdateModal"
import PriceListUpdateModal from "@/components/inventory/PriceListUpdateModal"
import BulkDiscountModal from "@/components/inventory/BulkDiscountModal"
import CategoriesManagement from "@/components/inventory/CategoriesManagement"
import QuickStockAdjustment from "@/components/inventory/QuickStockAdjustment"
import FilterPresets from "@/components/inventory/FilterPresets"
import StoreInventorySummary from "@/components/inventory/StoreInventorySummary"
import KeyboardShortcutsHelp from "@/components/inventory/KeyboardShortcutsHelp"
import StoreInventoryFilter from "@/components/inventory/StoreInventoryFilter"
import WeeklyOrderMatrix from "@/components/inventory/WeeklyOrderMatrix"
import { useInventoryShortcuts } from "@/hooks/useInventoryShortcuts"

// Stats Card Component
const StatsCard = ({ title, value, subtitle, icon: Icon, color = "blue", trend, onClick }: any) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    red: "bg-red-50 text-red-600 border-red-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
  }
  return (
    <Card 
      className={`border ${colorClasses[color].split(' ')[2]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
                {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-full ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Stock Level Badge
const StockBadge = ({ purchased, sold, remaining }: { purchased: number; sold: number; remaining: number }) => {
  const stockPercent = purchased > 0 ? (remaining / purchased) * 100 : 0
  
  if (remaining <= 0) return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>
  if (stockPercent <= 10) return <Badge className="bg-red-100 text-red-800">Critical</Badge>
  if (stockPercent <= 25) return <Badge className="bg-orange-100 text-orange-800">Low Stock</Badge>
  if (stockPercent <= 50) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
  return <Badge className="bg-green-100 text-green-800">In Stock</Badge>
}

// Storage Type Badge
const StorageBadge = ({ type }: { type?: string }) => {
  const config: Record<string, { icon: any; color: string; label: string }> = {
    cooler: { icon: Snowflake, color: "bg-blue-100 text-blue-700", label: "Cooler" },
    frozen: { icon: Snowflake, color: "bg-cyan-100 text-cyan-700", label: "Frozen" },
    dry: { icon: Sun, color: "bg-amber-100 text-amber-700", label: "Dry" },
    fresh: { icon: Leaf, color: "bg-green-100 text-green-700", label: "Fresh" },
  }
  const cfg = config[type || "fresh"] || config.fresh
  const IconComp = cfg.icon
  return (
    <Badge className={`${cfg.color} gap-1`}>
      <IconComp className="h-3 w-3" />
      {cfg.label}
    </Badge>
  )
}

// Margin Indicator
const MarginIndicator = ({ cost, price }: { cost: number; price: number }) => {
  if (!cost || !price) return <span className="text-muted-foreground">-</span>
  const margin = ((price - cost) / price) * 100
  const color = margin >= 30 ? "text-green-600" : margin >= 15 ? "text-yellow-600" : "text-red-600"
  return (
    <span className={`font-medium ${color}`}>
      {margin.toFixed(1)}%
    </span>
  )
}

interface FilterState {
  search: string
  category: string
  sortBy: string
  sortOrder: "asc" | "desc"
  stockLevel: string
  startDate: string
  endDate: string
}

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

const InventoryEnhanced = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { toast } = useToast()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState("products")
  const [viewMode, setViewMode] = useState<"table" | "enhanced">("enhanced")

  // Data states
  const [products, setProducts] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAllProducts, setLoadingAllProducts] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  // Modal states
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [isAddCateOpen, setIsAddCateOpen] = useState(false)
  const [quickEditOpen, setQuickEditOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [lowStockAlertOpen, setLowStockAlertOpen] = useState(false)
  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false)
  const [selectedProductForReorder, setSelectedProductForReorder] = useState<Product | null>(null)
  const [reorders, setReorders] = useState<Reorder[]>(getReorders())
  const [isPriceUpdateOpen, setIsPriceUpdateOpen] = useState(false)
  const [isPriceListOpen, setIsPriceListOpen] = useState(false)
  const [isBulkDiscountOpen, setIsBulkDiscountOpen] = useState(false)
  const [isQuickAdjustOpen, setIsQuickAdjustOpen] = useState(false)
  const [isStoreViewOpen, setIsStoreViewOpen] = useState(false)
  const [isStoreInventoryOpen, setIsStoreInventoryOpen] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStock: 0,
    outOfStock: 0,
    avgMargin: 0
  })

  // Date range
  const getCurrentWeekRange = () => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      startDate: monday.toISOString().split("T")[0],
      endDate: sunday.toISOString().split("T")[0]
    }
  }

  const { startDate, endDate } = getCurrentWeekRange()

  // Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  })

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "all",
    sortBy: "name",
    sortOrder: "asc",
    stockLevel: "all",
    startDate,
    endDate
  })

  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 500)
    return () => clearTimeout(timer)
  }, [filters.search])

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [debouncedSearch, filters.category, filters.stockLevel, filters.startDate, filters.endDate])


  const fetchProducts = async (hard = false) => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filters.category !== "all" && { categoryId: filters.category }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
        ...(filters.stockLevel !== "all" && { stockLevel: filters.stockLevel }),
      })

      const response = await getAllProductSummaryAPI(`?${queryParams.toString()}&hard=${hard}`)

      if (response) {
        const productList = (response.products || response.data || response).map((p: any) => ({
          ...p,
          id: p._id,
          summary: p.summary || { totalPurchase: 0, totalSell: 0, totalRemaining: 0 },
          lastUpdated: p?.updatedAt,
        }))
        setProducts(productList)
        
        setPagination((prev) => ({
          ...prev,
          total: response.total || response.totalCount || productList.length,
          totalPages: response.totalPages || Math.ceil((response.total || productList.length) / prev.limit),
        }))

        // Calculate stats
        let lowStock = 0, outOfStock = 0, totalValue = 0, totalMargin = 0, marginCount = 0
        productList.forEach((p: any) => {
          const remaining = p.summary?.totalRemaining || 0
          const purchased = p.summary?.totalPurchase || 0
          if (remaining <= 0) outOfStock++
          else if (purchased > 0 && (remaining / purchased) <= 0.25) lowStock++
          totalValue += (p.price || 0) * remaining
          if (p.cost && p.price) {
            totalMargin += ((p.price - p.cost) / p.price) * 100
            marginCount++
          }
        })
        setStats({
          totalProducts: response.total || productList.length,
          totalValue,
          lowStock,
          outOfStock,
          avgMargin: marginCount > 0 ? Math.round(totalMargin / marginCount) : 0
        })
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch products" })
    } finally {
      setLoading(false)
    }
  }

  const fetchAllProducts = async () => {
    if (allProducts.length > 0) return
    setLoadingAllProducts(true)
    try {
      const queryParams = new URLSearchParams({
        page: "1",
        limit: "1000",
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      })
      const response = await getAllProductSummaryAPI(`?${queryParams.toString()}`)
      if (response) {
        const updatedProducts = (response.products || response.data || response).map((product: any) => ({
          ...product,
          id: product._id,
          lastUpdated: product?.updatedAt,
        }))
        setAllProducts(updatedProducts)
      }
    } catch (error) {
      console.error("Error fetching all products:", error)
    } finally {
      setLoadingAllProducts(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await dispatch(getAllCategoriesAPI())
      setCategories(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  useEffect(() => { fetchCategories() }, [])
  
  useEffect(() => {
    fetchProducts()
  }, [pagination.page, pagination.limit, debouncedSearch, filters.category, filters.stockLevel, 
      filters.startDate, filters.endDate, filters.sortBy, filters.sortOrder])

  useEffect(() => {
    if (activeTab === "order-matrix") {
      fetchAllProducts()
    }
  }, [activeTab])

  const lowStockProducts = getLowStockProducts()

  useEffect(() => {
    if (lowStockProducts.length > 0 && !lowStockAlertOpen) {
      setTimeout(() => setLowStockAlertOpen(true), 1000)
    }
  }, [])

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "all",
      sortBy: "name",
      sortOrder: "asc",
      stockLevel: "all",
      startDate,
      endDate
    })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleApplyPreset = (presetFilters: FilterState) => {
    setFilters(presetFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const focusSearch = () => searchInputRef.current?.focus()

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }))
    }
  }

  const handleLimitChange = (newLimit: string) => {
    setPagination((prev) => ({
      ...prev,
      limit: Number.parseInt(newLimit),
      page: 1,
    }))
  }

  const handleHardRefresh = async () => {
    const result = await Swal.fire({
      title: "Hard Refresh",
      text: "This process may take time. Do you want to continue?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, continue",
      cancelButtonText: "Cancel",
    })

    if (result.isConfirmed) {
      setLoading(true)
      try {
        await fetchProducts(true)
        setAllProducts([])
        Swal.fire({ title: "Refreshed!", text: "Product list has been updated.", icon: "success", timer: 1500, showConfirmButton: false })
      } catch (err) {
        Swal.fire("Error", "Failed to refresh products.", "error")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleExport = () => {
    if (products.length === 0) {
      toast({ title: "No Data", description: "No products to export" })
      return
    }
    const headers = ["Product Name", "Category", "Purchased", "Sold", "Remaining", "Price", "Value"]
    const csvData = products.map(p => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      p.category?.categoryName || "N/A",
      p.summary?.totalPurchase || 0,
      p.summary?.totalSell || 0,
      p.summary?.totalRemaining || 0,
      p.price || 0,
      ((p.price || 0) * (p.summary?.totalRemaining || 0)).toFixed(2)
    ].join(','))
    
    const csvContent = [headers.join(','), ...csvData].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "Inventory data downloaded" })
  }

  const { shortcuts } = useInventoryShortcuts({
    onAddProduct: () => setIsAddProductOpen(true),
    onQuickAdjust: () => setIsQuickAdjustOpen(true),
    onExport: handleExport,
    onRefresh: () => fetchProducts(),
    onSearch: focusSearch,
    onClearFilters: clearFilters,
    onStoreView: () => setIsStoreViewOpen(true),
    onToggleSelect: () => setSelectedProducts([]),
  }, { showToast: false })

  const handleImport = () => {
    toast({ title: "Import Inventory", description: "Please select a CSV file to import" })
  }

  const handleProductsSelect = (productIds: string[]) => setSelectedProducts(productIds)

  const handleUpdateProducts = () => fetchProducts()

  const handleOpenReorderDialog = (product: Product) => {
    setSelectedProductForReorder(product)
    setIsReorderDialogOpen(true)
  }

  const handleReorder = (reorderData: Omit<Reorder, "id" | "dateCreated" | "expectedDelivery" | "status" | "productName">) => {
    if (!selectedProductForReorder) return
    const newReorder = createReorder({ ...reorderData, productName: selectedProductForReorder.name })
    setReorders((prev) => [newReorder, ...prev])
    toast({ title: "Reorder Created", description: `${reorderData.quantity} ${selectedProductForReorder.unit} of ${selectedProductForReorder.name} has been reordered` })
  }

  const handleBulkReorder = () => {
    if (selectedProducts.length === 0) return
    const productToReorder = products.find((p) => p.id === selectedProducts[0])
    if (productToReorder) handleOpenReorderDialog(productToReorder)
  }

  const handleOpenPriceList = () => setIsPriceListOpen(true)
  const handleOpenBulkDiscount = () => setIsBulkDiscountOpen(true)
  const navigateToPriceList = () => navigate("/price-list")

  const handleQuickEdit = (product: any) => {
    setSelectedProduct(product)
    setQuickEditOpen(true)
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedProducts(checked ? products.map(p => p.id) : [])
  }

  const handleSelectProduct = (id: string, checked: boolean) => {
    setSelectedProducts(prev => checked ? [...prev, id] : prev.filter(p => p !== id))
  }

  const handleSort = (field: string) => {
    if (filters.sortBy === field) {
      setFilters(prev => ({ ...prev, sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" }))
    } else {
      setFilters(prev => ({ ...prev, sortBy: field, sortOrder: "asc" }))
    }
  }

  const filteredProducts = products.filter(p => {
    if (filters.stockLevel === "out") return (p.summary?.totalRemaining || 0) <= 0
    if (filters.stockLevel === "low") {
      const remaining = p.summary?.totalRemaining || 0
      const purchased = p.summary?.totalPurchase || 0
      return remaining > 0 && purchased > 0 && (remaining / purchased) <= 0.25
    }
    if (filters.stockLevel === "in") return (p.summary?.totalRemaining || 0) > 0
    return true
  })


  // Pagination Controls Component
  const PaginationControls = () => (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <p className="text-sm text-muted-foreground">
        Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
      </p>
      <div className="flex items-center gap-2">
        <Select value={pagination.limit.toString()} onValueChange={handleLimitChange}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((size) => (
              <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(1)} disabled={pagination.page === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">Page {pagination.page} of {pagination.totalPages || 1}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(pagination.totalPages)} disabled={pagination.page >= pagination.totalPages}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  // Enhanced Table View Component
  const EnhancedTableView = () => (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-4" />
            <p>No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("summary.totalRemaining")} className="h-auto p-0 font-medium">
                      Stock Status <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Purchased</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product, index) => {
                  const purchased = product.summary?.totalPurchase || 0
                  const sold = product.summary?.totalSell || 0
                  const remaining = product.summary?.totalRemaining || 0
                  const value = (product.price || 0) * remaining
                  // Generate shortCode: use existing or create from index
const shortCode = product.shortCode || String(index + 1).padStart(3, '0');

                  return (
                    <TableRow key={product.id} className="hover:bg-muted/50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              <span className="text-primary font-mono mr-2">#{shortCode}</span>
                              {product.name}
                            </p>
                            {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category?.categoryName || "Uncategorized"}</Badge>
                      </TableCell>
                      <TableCell>
                        <StockBadge purchased={purchased} sold={sold} remaining={remaining} />
                      </TableCell>
                      <TableCell className="text-right font-medium">{purchased}</TableCell>
                      <TableCell className="text-right font-medium">{sold}</TableCell>
                      <TableCell className="text-right font-medium">{remaining}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.price || 0)}</TableCell>
                      <TableCell className="text-right">
                        <MarginIndicator cost={product.cost || 0} price={product.price || 0} />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(value)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleQuickEdit(product)}>
                              <Edit className="h-4 w-4 mr-2" /> Quick Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenReorderDialog(product)}>
                              <Package className="h-4 w-4 mr-2" /> Reorder
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {!loading && filteredProducts.length > 0 && <PaginationControls />}
      </CardContent>
    </Card>
  )


  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

        <main className="flex-1 overflow-y-auto">
          <div className="container px-4 py-6 mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-6">
              <PageHeader title="Inventory Management" description="Track stock levels, freshness, and margins">
                <div className="flex flex-wrap gap-2">
                  <KeyboardShortcutsHelp shortcuts={shortcuts} />
                  <Button variant="outline" size="sm" className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100" onClick={() => setIsQuickAdjustOpen(true)}>
                    <Zap size={16} className="mr-2" /> Quick Adjust
                  </Button>
                  <Button variant="outline" size="sm" className="bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100" onClick={() => setIsStoreViewOpen(true)}>
                    <MapPin size={16} className="mr-2" /> Stores by State
                  </Button>
                  <Button variant="outline" size="sm" className="bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100" onClick={() => setIsStoreInventoryOpen(true)}>
                    <Store size={16} className="mr-2" /> Store Inventory
                  </Button>
                  <Button variant="outline" size="sm" className="hidden sm:flex" onClick={handleExport}>
                    <Download size={16} className="mr-2" /> Export
                  </Button>
                  <Button variant="outline" size="sm" className="hidden sm:flex" onClick={handleImport}>
                    <Upload size={16} className="mr-2" /> Import
                  </Button>
                  {/* <Button variant="outline" size="sm" className="bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hidden sm:flex" onClick={handleOpenPriceList}>
                    <ListFilter size={16} className="mr-2" /> Price List
                  </Button> */}
                  <Button variant="outline" size="sm" className="bg-green-50 border-green-200 text-green-600 hover:bg-green-100 hidden sm:flex" onClick={handleOpenBulkDiscount}>
                    <Tags size={16} className="mr-2" /> Volume Discounts
                  </Button>
                  <Button variant="outline" size="sm" className="bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100 hidden sm:flex" onClick={navigateToPriceList}>
                    <Store size={16} className="mr-2" /> Store Price Lists
                  </Button>
                  <Button onClick={() => setIsAddProductOpen(true)}>
                    <Plus size={16} className="mr-2" /> Add Product
                  </Button>
                  <Button onClick={() => setIsAddCateOpen(true)} className="bg-green-600">
                    Manage Categories
                  </Button>
                </div>
              </PageHeader>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <StatsCard title="Total Products" value={stats.totalProducts} icon={Package} color="blue" />
              <StatsCard title="Inventory Value" value={formatCurrency(stats.totalValue)} icon={DollarSign} color="green" />
              <StatsCard 
                title="Low Stock" 
                value={stats.lowStock} 
                subtitle="Need reorder" 
                icon={AlertTriangle} 
                color="orange"
                onClick={() => setFilters(prev => ({ ...prev, stockLevel: "low" }))}
              />
              <StatsCard 
                title="Out of Stock" 
                value={stats.outOfStock} 
                subtitle="Urgent attention" 
                icon={Box} 
                color="red"
                onClick={() => setFilters(prev => ({ ...prev, stockLevel: "out" }))}
              />
              <StatsCard title="Avg Margin" value={`${stats.avgMargin}%`} icon={Percent} color="purple" />
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" /> Search & Filter Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  <div className="relative lg:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search products... (Ctrl+K)"
                      value={filters.search}
                      onChange={(e) => handleFilterChange("search", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <FilterPresets currentFilters={filters} onApplyPreset={handleApplyPreset} />
                  <Select value={filters.category} onValueChange={(v) => handleFilterChange("category", v)}>
                    <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat._id} value={cat._id}>{cat.categoryName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={filters.startDate} onChange={(e) => handleFilterChange("startDate", e.target.value)} />
                  <Input type="date" value={filters.endDate} onChange={(e) => handleFilterChange("endDate", e.target.value)} />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <Select value={filters.stockLevel} onValueChange={(v) => handleFilterChange("stockLevel", v)}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Stock Level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock Levels</SelectItem>
                      <SelectItem value="in">In Stock</SelectItem>
                      <SelectItem value="low">Low Stock</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={clearFilters} className="bg-red-50 text-red-700 hover:bg-red-100">
                    <XCircle className="w-4 h-4 mr-2" /> Clear Filters
                  </Button>
                  <Button variant="outline" onClick={() => fetchProducts()} className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                    <RotateCcw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                  <Button variant="outline" onClick={handleHardRefresh} disabled={loading} className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                    <RotateCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    {loading ? "Refreshing..." : "Hard Refresh"}
                  </Button>
                </div>
                {/* Filter Summary */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {filters.search && <Badge variant="secondary">Search: "{filters.search}"</Badge>}
                  {filters.startDate && <Badge variant="secondary">From: {filters.startDate}</Badge>}
                  {filters.endDate && <Badge variant="secondary">To: {filters.endDate}</Badge>}
                  {filters.stockLevel !== "all" && <Badge variant="secondary">Stock: {filters.stockLevel}</Badge>}
                  <Badge variant="outline">Showing {filteredProducts.length} of {pagination.total} products</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            {lowStockAlertOpen && lowStockProducts.length > 0 && (
              <Card className="mb-6 border-amber-500 bg-amber-50">
                <CardHeader className="py-3">
                  <div className="flex flex-wrap justify-between items-center">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <CardTitle className="text-base text-amber-700">
                        Low Stock Alert: {lowStockProducts.length} {lowStockProducts.length === 1 ? "Product" : "Products"}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="border-amber-500 text-amber-700 hover:bg-amber-100"
                        onClick={() => lowStockProducts.length > 0 && handleOpenReorderDialog(lowStockProducts[0])}>
                        <Package className="h-4 w-4 mr-1" /> Reorder
                      </Button>
                      <Button variant="outline" size="sm" className="border-amber-500 text-amber-700 hover:bg-amber-100"
                        onClick={() => setLowStockAlertOpen(false)}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {lowStockProducts.slice(0, 3).map((product) => (
                      <Badge key={product.id} variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 cursor-pointer"
                        onClick={() => handleOpenReorderDialog(product)}>
                        {product.name}: {product.quantity} {product.unit} left
                      </Badge>
                    ))}
                    {lowStockProducts.length > 3 && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                        +{lowStockProducts.length - 3} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulk Actions */}
            <BulkActions
              selectedProducts={selectedProducts}
              onClearSelection={() => setSelectedProducts([])}
              onUpdateProducts={handleUpdateProducts}
              products={products}
              onReorder={handleBulkReorder}
              onPriceUpdate={handleOpenPriceList}
              onBulkDiscount={handleOpenBulkDiscount}
            />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="products">Products</TabsTrigger>
                  <TabsTrigger value="order-matrix">Order Matrix</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">View:</span>
                  <Select value={viewMode} onValueChange={(v: "table" | "enhanced") => setViewMode(v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enhanced">Enhanced</SelectItem>
                      <SelectItem value="table">Classic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="products" className="space-y-4">
                {viewMode === "enhanced" ? (
                  <EnhancedTableView />
                ) : (
                  <Card>
                    <CardContent className="p-1 sm:p-6">
                      <InventoryTable
                        products={products}
                        onProductsSelect={handleProductsSelect}
                        selectedProducts={selectedProducts}
                        onReorderProduct={handleOpenReorderDialog}
                        fetchProducts={fetchProducts}
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                      />
                    </CardContent>
                    {pagination.totalPages > 1 && <PaginationControls />}
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="order-matrix">
                {loadingAllProducts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading all products...</span>
                  </div>
                ) : (
                  <WeeklyOrderMatrix products={allProducts.length > 0 ? allProducts : products} onRefresh={() => { setAllProducts([]); fetchAllProducts(); }} />
                )}
              </TabsContent>
            </Tabs>


            {/* All Dialogs */}
            <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
              <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Add New Product</DialogTitle>
                </DialogHeader>
                <AddProductForm
                  onSuccess={() => { setIsAddProductOpen(false); fetchProducts(); }}
                  onAddProduct={() => { fetchProducts(); toast({ title: "Product Added", description: "Product has been added to inventory" }); }}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isReorderDialogOpen} onOpenChange={setIsReorderDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Reorder Product</DialogTitle>
                </DialogHeader>
                {selectedProductForReorder && (
                  <ReorderForm
                    product={selectedProductForReorder}
                    onSuccess={() => setIsReorderDialogOpen(false)}
                    onReorder={handleReorder}
                  />
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={quickEditOpen} onOpenChange={setQuickEditOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quick Edit - {selectedProduct?.name}</DialogTitle>
                  <DialogDescription>Update product details quickly</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        value={selectedProduct?.price || ""}
                        onChange={(e) => setSelectedProduct((p: any) => ({ ...p, price: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cost</Label>
                      <Input
                        type="number"
                        value={selectedProduct?.cost || ""}
                        onChange={(e) => setSelectedProduct((p: any) => ({ ...p, cost: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Storage Type</Label>
                    <Select
                      value={selectedProduct?.storageType || "fresh"}
                      onValueChange={(v) => setSelectedProduct((p: any) => ({ ...p, storageType: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fresh">Fresh</SelectItem>
                        <SelectItem value="cooler">Cooler</SelectItem>
                        <SelectItem value="frozen">Frozen</SelectItem>
                        <SelectItem value="dry">Dry Storage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setQuickEditOpen(false)}>Cancel</Button>
                  <Button onClick={() => {
                    setQuickEditOpen(false)
                    toast({ title: "Updated", description: "Product updated successfully" })
                  }}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <PriceUpdateModal
              isOpen={isPriceUpdateOpen}
              onClose={() => setIsPriceUpdateOpen(false)}
              selectedProducts={selectedProducts.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[]}
              allProducts={products}
              onUpdateProducts={handleUpdateProducts}
            />

            <PriceListUpdateModal
              isOpen={isPriceListOpen}
              onClose={() => setIsPriceListOpen(false)}
              products={products}
              onUpdateProducts={handleUpdateProducts}
            />

            <BulkDiscountModal
              isOpen={isBulkDiscountOpen}
              onClose={() => setIsBulkDiscountOpen(false)}
              products={products}
              selectedProducts={selectedProducts}
              onUpdateProducts={handleUpdateProducts}
            />

            <CategoriesManagement isopen={isAddCateOpen} onclose={setIsAddCateOpen} />

            <QuickStockAdjustment
              isOpen={isQuickAdjustOpen}
              onClose={() => setIsQuickAdjustOpen(false)}
              products={products}
              onSuccess={() => fetchProducts()}
            />

            <StoreInventorySummary
              isOpen={isStoreViewOpen}
              onClose={() => setIsStoreViewOpen(false)}
            />

            <StoreInventoryFilter
              isOpen={isStoreInventoryOpen}
              onClose={() => setIsStoreInventoryOpen(false)}
              products={products}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default InventoryEnhanced
