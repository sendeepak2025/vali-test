"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Navbar from "@/components/layout/Navbar"
import PageHeader from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import {
  FileText, Search, RefreshCw, Plus, Eye, Trash2, Edit, Download,
  Send, Copy, MoreVertical, ArrowLeft, Store, Mail, Users, Clock,
  CheckCircle, AlertCircle, TrendingUp, Link2, ExternalLink, Loader2,
  ChevronLeft, ChevronRight, Filter, ListFilter, Zap, Globe, Upload,
  FileSpreadsheet, Check, X, HelpCircle
} from "lucide-react"
import * as XLSX from "xlsx"
import { useSelector } from "react-redux"
import { RootState } from "@/redux/store"
import { useNavigate } from "react-router-dom"
import {
  createPriceListAPI,
  getAllPriceListAPI,
  updatePriceList,
  deltePriceAPI,
  getSinglePriceAPI
} from "@/services2/operations/priceList"
import { getAllProductAPI, searchProductsForOrderAPI, getProductByShortCodeAPI } from "@/services2/operations/product"
import { priceListEmailMulti } from "@/services2/operations/email"
import { exportPriceListToPDF } from "@/utils/pdf"
import SelecteStores from "@/components/inventory/pricelist/SelecteStores"
import { fetchCategoriesAPI } from "@/services2/operations/category"
import { getAllStoresAPI, searchStoresAPI } from "@/services2/operations/auth"

// Stats Card Component
const StatsCard = ({ title, value, subtitle, icon: Icon, color = "blue" }: any) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
  }
  return (
    <Card className={`border ${colorClasses[color].split(' ')[2]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { color: string; label: string }> = {
    active: { color: "bg-green-100 text-green-800", label: "Active" },
    draft: { color: "bg-gray-100 text-gray-800", label: "Draft" },
    archived: { color: "bg-red-100 text-red-800", label: "Archived" },
  }
  const cfg = config[status] || config.draft
  return <Badge className={cfg.color}>{cfg.label}</Badge>
}

const PriceListEnhanced = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  // Data states
  const [templates, setTemplates] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const PAGE_SIZE = 10

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [sendMode, setSendMode] = useState<"single" | "bulk" | "category">("single")

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
    products: [] as any[]
  })
  const [selectedStores, setSelectedStores] = useState<any[]>([])
  const [isSending, setIsSending] = useState(false)
  
  // Category mode stores
  const [categoryStores, setCategoryStores] = useState<any[]>([])
  const [selectedCategoryStores, setSelectedCategoryStores] = useState<string[]>([])
  const [loadingCategoryStores, setLoadingCategoryStores] = useState(false)
  const [categoryStoresPage, setCategoryStoresPage] = useState(1)
  const [totalCategoryStores, setTotalCategoryStores] = useState(0)
  const [storeSearchQuery, setStoreSearchQuery] = useState("")
  const STORES_LIMIT = 20

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    archived: 0
  })

  // Price editing states
  const [editingCell, setEditingCell] = useState<{ productId: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [bulkActionOpen, setBulkActionOpen] = useState(false)
  const [bulkPercent, setBulkPercent] = useState("")
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [productSearch, setProductSearch] = useState("")

  // Excel upload states
  const [excelModalOpen, setExcelModalOpen] = useState(false)
  const [excelData, setExcelData] = useState<any[]>([])
  const [excelColumns, setExcelColumns] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<{
    productName: string;
    shortCode: string;
    price: string;
    aPrice: string;
    bPrice: string;
    cPrice: string;
    restaurantPrice: string;
  }>({
    productName: "",
    shortCode: "",
    price: "",
    aPrice: "",
    bPrice: "",
    cPrice: "",
    restaurantPrice: ""
  })
  const [matchedProducts, setMatchedProducts] = useState<any[]>([])
  const [uploadStep, setUploadStep] = useState<"upload" | "mapping" | "preview">("upload")
  const [excelCategoryFilter, setExcelCategoryFilter] = useState("all")
  const [excelBulkPercent, setExcelBulkPercent] = useState("")
  const [selectedExcelRows, setSelectedExcelRows] = useState<number[]>([])

  // Quick Price Update states
  const [quickPriceInput, setQuickPriceInput] = useState("")
  const [quickPriceHistory, setQuickPriceHistory] = useState<{code: string; field: string; oldPrice: number; newPrice: number; productName: string}[]>([])
  const [quickPriceFilter, setQuickPriceFilter] = useState("")
  
  // Quick Add Product states (for adding products to price list)
  const [quickAddInput, setQuickAddInput] = useState("")
  const [quickAddPreview, setQuickAddPreview] = useState<any>(null)
  const [quickAddQuantity, setQuickAddQuantity] = useState(1)
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const quickAddRef = useRef<HTMLInputElement>(null)
  const quickAddSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Product table states for pagination and search
  const [productTableSearch, setProductTableSearch] = useState("")
  const [productTableCategory, setProductTableCategory] = useState("all")
  const [displayedProducts, setDisplayedProducts] = useState<any[]>([])
  const [hasMoreProducts, setHasMoreProducts] = useState(true)
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false)
  const [productSearchLoading, setProductSearchLoading] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [downloadingFullList, setDownloadingFullList] = useState(false)
  const [matchingProducts, setMatchingProducts] = useState(false)
  const [matchingSummary, setMatchingSummary] = useState<{ total: number; matched: number; zeroPriceCount: number; willAdd: number } | null>(null)
  const productSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Keyboard shortcut: Focus quick add with /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && createModalOpen) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          quickAddRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createModalOpen])

  // Fetch templates
  const fetchTemplates = async (targetPage = 1) => {
    setLoading(true)
    try {
      const query = `page=${targetPage}&limit=${PAGE_SIZE}`
      const response = await getAllPriceListAPI(query)
      if (response) {
        setTemplates(response.data || [])
        setTotal(response.total || 0)
        setTotalPages(response.totalPages || 1)
        setPage(response.page || targetPage)

        // Calculate stats
        const all = response.data || []
        setStats({
          total: response.total || all.length,
          active: all.filter((t: any) => t.status === "active").length,
          draft: all.filter((t: any) => t.status === "draft").length,
          archived: all.filter((t: any) => t.status === "archived").length
        })
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch price lists" })
    } finally {
      setLoading(false)
    }
  }

  // Fetch products for template creation - only 10 initially
  const fetchProducts = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        searchProductsForOrderAPI("", 10),
        fetchCategoriesAPI()
      ])
      
      if (productsData) {
        const updatedProducts = productsData.map((product: any) => ({
          ...product,
          id: product._id || product.id,
        }))
        setProducts(updatedProducts)
        setDisplayedProducts(updatedProducts)
        setHasMoreProducts(productsData.length === 10)
      }
      
      // Set categories
      if (categoriesData) {
        const categoryNames = categoriesData.map((c: any) => c.categoryName).filter(Boolean).sort()
        setCategories(categoryNames)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  useEffect(() => {
    fetchTemplates(1)
    fetchProducts()
  }, [])

  // Handle create/edit template
  const handleSaveTemplate = async () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Template name is required" })
      return
    }
    if (formData.products.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Select at least one product" })
      return
    }

    try {
      if (selectedTemplate) {
        await updatePriceList(selectedTemplate.id, formData, token)
        toast({ title: "Updated", description: "Price list updated successfully" })
      } else {
        await createPriceListAPI(formData, token)
        toast({ title: "Created", description: "Price list created successfully" })
      }
      setCreateModalOpen(false)
      resetForm()
      fetchTemplates(page)
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save price list" })
    }
  }

  // Handle delete
  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this price list?")) return
    try {
      await deltePriceAPI(templateId)
      toast({ title: "Deleted", description: "Price list deleted successfully" })
      fetchTemplates(page)
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete price list" })
    }
  }

  // Handle duplicate
  const handleDuplicate = async (template: any) => {
    try {
      const newTemplate = {
        ...template,
        name: `${template.name} (Copy)`,
        status: "draft"
      }
      delete newTemplate.id
      delete newTemplate._id
      delete newTemplate.createdAt
      await createPriceListAPI(newTemplate, token)
      toast({ title: "Duplicated", description: "Price list duplicated successfully" })
      fetchTemplates(1)
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to duplicate price list" })
    }
  }

  // Copy URL to clipboard
  // const copyUrl = (template: any, type: "template" | "nextweek" = "template") => {
  //   const baseUrl = "http://valiproduce.shop/store"
  //   const url = type === "template" 
  //     ? `${baseUrl}/template?templateId=${template.id}`
  //     : `${baseUrl}/nextweek?templateId=${template.id}`
  //   navigator.clipboard.writeText(url)
  //   toast({ title: "Copied!", description: `${type === "template" ? "Template" : "Next week"} URL copied to clipboard` })
  // }

  const copyUrl = (template: any, type: "template" | "nextweek" = "template") => {
const baseUrl = `${import.meta.env.VITE_APP_CLIENT_URL}/store/mobile`;
  
  // const url = type === "template"
  //   ? `${baseUrl}/template?templateId=${template.id}`
  //   : `${baseUrl}/nextweek?templateId=${template.id}`;

  navigator.clipboard.writeText(baseUrl);

  toast({
    title: "Copied!",
    description: `${type === "template" ? "Template" : "Next week"} URL copied to clipboard`,
  });
};


  // Download PDF
  const handleDownloadPDF = async (template: any, priceType: string = "all") => {
    try {
      setDownloadingFullList(true)
      
      // Fetch the complete template data with all products
      const fullTemplate = await getSinglePriceAPI(template.id || template._id)
      
      if (!fullTemplate || !fullTemplate.products || fullTemplate.products.length === 0) {
        toast({ variant: "destructive", title: "Error", description: "No products found in this price list" })
        return
      }
      
      console.log("Full template data for PDF:", fullTemplate)
      console.log("Total products to include in PDF:", fullTemplate.products.length)
      
      exportPriceListToPDF(fullTemplate, priceType)
      toast({ title: "Downloaded", description: `PDF generated with ${fullTemplate.products.length} products` })
    } catch (error) {
      console.error("PDF generation error:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to generate PDF" })
    } finally {
      setDownloadingFullList(false)
    }
  }

  // Send to stores
  const handleSend = async () => {
    if (sendMode === "bulk" && selectedStores.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Select at least one store" })
      return
    }
    
    if (sendMode === "category" && selectedCategoryStores.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Select at least one store" })
      return
    }

    setIsSending(true)
    try {
      if (sendMode === "bulk") {
        // const url = `http://valiproduce.shop/store/template?templateId=${selectedTemplate.id}`
        const url = `${import.meta.env.VITE_APP_CLIENT_URL}/store/mobile`;
        await priceListEmailMulti({ url, selectedStore: selectedStores }, token)
        toast({ title: "Sent!", description: `Price list sent to ${selectedStores.length} stores` })
      } else if (sendMode === "category") {
        // Send to selected stores from category list
        // Note: selectedCategoryStores contains emails, we need to send them directly
        const selectedStoreObjects = selectedCategoryStores.map(email => {
          const store = categoryStores.find(s => s.email === email)
          return { 
            value: email, 
            label: store?.storeName || email 
          }
        })
        
        console.log("=== Email Send Debug ===")
        console.log("Selected emails:", selectedCategoryStores)
        console.log("Store objects to send:", selectedStoreObjects)
        console.log("Total count:", selectedStoreObjects.length)
        
        const url = `${import.meta.env.VITE_APP_CLIENT_URL}/store/mobile`;
        await priceListEmailMulti({ url, selectedStore: selectedStoreObjects }, token)
        toast({ title: "Sent!", description: `Price list sent to ${selectedStoreObjects.length} stores` })
      }
      setSendModalOpen(false)
      setSelectedStores([])
      setSelectedCategoryStores([])
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to send" })
    } finally {
      setIsSending(false)
    }
  }
  
  // Fetch stores for category mode
  const fetchCategoryStores = async (pageNum = 1, search = storeSearchQuery) => {
    setLoadingCategoryStores(true)
    
    try {
      const skip = (pageNum - 1) * STORES_LIMIT
      const storesData = await searchStoresAPI(search, STORES_LIMIT, skip)
      
      if (storesData && storesData.length > 0) {
        setCategoryStores(storesData)
        // If we got full page, assume there might be more
        if (storesData.length === STORES_LIMIT) {
          setTotalCategoryStores(Math.max(totalCategoryStores, skip + storesData.length + 1))
        } else {
          setTotalCategoryStores(skip + storesData.length)
        }
      } else {
        setCategoryStores([])
        if (pageNum === 1) setTotalCategoryStores(0)
      }
      setCategoryStoresPage(pageNum)
    } catch (error) {
      console.error("Error fetching stores:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch stores" })
    } finally {
      setLoadingCategoryStores(false)
    }
  }
  
  // Handle store search
  const handleStoreSearch = (value: string) => {
    setStoreSearchQuery(value)
    setCategoryStoresPage(1)
    fetchCategoryStores(1, value)
  }
  
  // Pagination handlers
  const totalStorePages = Math.ceil(totalCategoryStores / STORES_LIMIT)
  
  const goToNextStorePage = () => {
    if (categoryStoresPage < totalStorePages) {
      fetchCategoryStores(categoryStoresPage + 1)
    }
  }
  
  const goToPrevStorePage = () => {
    if (categoryStoresPage > 1) {
      fetchCategoryStores(categoryStoresPage - 1)
    }
  }
  
  // Toggle store selection in category mode
  const toggleCategoryStore = (email: string) => {
    setSelectedCategoryStores(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    )
  }
  
  // Select all stores in category mode
  const selectAllCategoryStores = () => {
    if (selectedCategoryStores.length === categoryStores.length) {
      setSelectedCategoryStores([])
    } else {
      setSelectedCategoryStores(categoryStores.map(s => s.email))
    }
  }

  // Open edit modal
  const handleEdit = (template: any) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || "",
      status: template.status,
      products: template.products || []
    })
    setCreateModalOpen(true)
  }

  // Open send modal
  const openSendModal = (template: any) => {
    setSelectedTemplate(template)
    setSendMode("bulk")
    setSendModalOpen(true)
  }

  // Reset form
  const resetForm = () => {
    setSelectedTemplate(null)
    setFormData({ name: "", description: "", status: "active", products: [] })
    setSelectedProductIds([])
    setProductSearch("")
  }

  // Inline price editing functions
  const startEditing = (productId: string, field: string, value: number) => {
    setEditingCell({ productId, field })
    setEditValue(String(value || 0))
  }

  const saveEdit = () => {
    if (!editingCell) return
    const newValue = parseFloat(editValue) || 0
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.id === editingCell.productId 
          ? { ...p, [editingCell.field]: newValue }
          : p
      )
    }))
    setEditingCell(null)
    setEditValue("")
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit()
    if (e.key === "Escape") {
      setEditingCell(null)
      setEditValue("")
    }
  }

  // Copy base price to all tiers for a single product
  const copyPriceToAllTiers = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id === productId) {
          const basePrice = p.pricePerBox || p.price || 0
          return { ...p, aPrice: basePrice, bPrice: basePrice, cPrice: basePrice, restaurantPrice: basePrice }
        }
        return p
      })
    }))
    toast({ title: "Copied", description: "Base price copied to all tiers" })
  }

  // Toggle product selection for bulk actions
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  // Select/deselect all products
  const toggleSelectAll = () => {
    if (selectedProductIds.length === formData.products.length) {
      setSelectedProductIds([])
    } else {
      setSelectedProductIds(formData.products.map(p => p.id))
    }
  }

  // Apply bulk percentage change
  const applyBulkPercentage = (increase: boolean) => {
    const percent = parseFloat(bulkPercent) || 0
    if (percent === 0 || selectedProductIds.length === 0) return
    
    const multiplier = increase ? (1 + percent / 100) : (1 - percent / 100)
    
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (selectedProductIds.includes(p.id)) {
          return {
            ...p,
            pricePerBox: Math.round((p.pricePerBox || 0) * multiplier * 100) / 100,
            aPrice: Math.round((p.aPrice || 0) * multiplier * 100) / 100,
            bPrice: Math.round((p.bPrice || 0) * multiplier * 100) / 100,
            cPrice: Math.round((p.cPrice || 0) * multiplier * 100) / 100,
          }
        }
        return p
      })
    }))
    
    toast({ 
      title: "Prices Updated", 
      description: `${increase ? "Increased" : "Decreased"} prices by ${percent}% for ${selectedProductIds.length} products` 
    })
    setBulkPercent("")
    setBulkActionOpen(false)
  }

  // Copy all base prices to all tiers (bulk)
  const copyAllPricesToTiers = () => {
    const targetIds = selectedProductIds.length > 0 ? selectedProductIds : formData.products.map(p => p.id)
    
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (targetIds.includes(p.id)) {
          const basePrice = p.pricePerBox || p.price || 0
          return { ...p, aPrice: basePrice, bPrice: basePrice, cPrice: basePrice, restaurantPrice: basePrice }
        }
        return p
      })
    }))
    
    toast({ 
      title: "Prices Copied", 
      description: `Base price copied to all tiers for ${targetIds.length} products` 
    })
  }

  // Remove selected products from the price list
  const removeSelectedProducts = () => {
    if (selectedProductIds.length === 0) return
    
    const removedCount = selectedProductIds.length
    
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(p => !selectedProductIds.includes(p.id))
    }))
    
    setSelectedProductIds([])
    
    toast({ 
      title: "Products Removed", 
      description: `Removed ${removedCount} products from the price list` 
    })
  }

  // Import products from existing price list
  const importFromTemplate = (template: any) => {
    if (!template?.products?.length) return
    
    // Merge products - add new ones, update existing
    const existingIds = formData.products.map(p => p.id)
    const newProducts = template.products.filter((p: any) => !existingIds.includes(p.id))
    
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, ...newProducts]
    }))
    
    toast({ 
      title: "Imported", 
      description: `Added ${newProducts.length} products from "${template.name}"` 
    })
    setImportModalOpen(false)
  }

  // Filter products in modal - using useMemo for real-time filtering
  const filteredFormProducts = useMemo(() => {
    if (!productSearch.trim()) {
      return formData.products
    }
    return formData.products.filter(p => 
      (p.name || p.productName || "").toLowerCase().includes(productSearch.toLowerCase())
    )
  }, [formData.products, productSearch])

  // Excel Upload Functions
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
        
        if (data.length < 2) {
          toast({ variant: "destructive", title: "Error", description: "Excel file is empty or has no data rows" })
          return
        }

        // First row is headers
        const headers = (data[0] as string[]).map(h => String(h || "").trim())
        const rows = data.slice(1).filter((row: any) => row.some((cell: any) => cell !== undefined && cell !== ""))
        
        setExcelColumns(headers)
        setExcelData(rows.map((row: any) => {
          const obj: any = {}
          headers.forEach((h, i) => {
            obj[h] = row[i]
          })
          return obj
        }))

        // Auto-detect column mapping - improved regex patterns
        const autoMapping = {
          productName: headers.find(h => 
            /^product\s*name$|^name$|^item\s*name$|^description$|^product$/i.test(h)
          ) || headers.find(h => 
            /product|name|item/i.test(h)
          ) || "",
          shortCode: headers.find(h => 
            /^short\s*code$|^code$|^sku$|^product\s*code$|^item\s*code$/i.test(h)
          ) || "",
          price: headers.find(h => 
            /^base\s*price$|^price$|^new\s*base\s*price$|price\s*per\s*box|^cost$/i.test(h)
          ) || headers.find(h => 
            /base.*price|new.*price|price/i.test(h) && !/a\s*price|b\s*price|c\s*price|restaurant/i.test(h)
          ) || "",
          aPrice: headers.find(h => 
            /^a\s*price$|^new\s*a\s*price$|^tier\s*a$|^price\s*a$/i.test(h)
          ) || headers.find(h => 
            /a.*price|price.*a|tier.*a/i.test(h)
          ) || "",
          bPrice: headers.find(h => 
            /^b\s*price$|^new\s*b\s*price$|^tier\s*b$|^price\s*b$/i.test(h)
          ) || headers.find(h => 
            /b.*price|price.*b|tier.*b/i.test(h)
          ) || "",
          cPrice: headers.find(h => 
            /^c\s*price$|^new\s*c\s*price$|^tier\s*c$|^price\s*c$/i.test(h)
          ) || headers.find(h => 
            /c.*price|price.*c|tier.*c/i.test(h)
          ) || "",
          restaurantPrice: headers.find(h => 
            /restaurant|resto|new\s*restaurant/i.test(h)
          ) || ""
        }
        setColumnMapping(autoMapping)
        setUploadStep("mapping")
        
        toast({ title: "File Loaded", description: `Found ${rows.length} rows and ${headers.length} columns` })
      } catch (error) {
        console.error("Excel parse error:", error)
        toast({ variant: "destructive", title: "Error", description: "Failed to parse Excel file" })
      }
    }
    reader.readAsBinaryString(file)
  }

  // Match Excel data with existing products - improved matching
  const matchExcelToProducts = async () => {
    if (!columnMapping.productName && !columnMapping.shortCode) {
      toast({ variant: "destructive", title: "Error", description: "Please select at least Product Name or Short Code column" })
      return
    }

    setMatchingProducts(true)

    try {
      // Fetch ALL products from backend for matching
      const allProductsFromBackend = await getAllProductAPI()
      const allProducts = formData.products.length > 0 ? formData.products : (allProductsFromBackend || []).map((p: any) => ({ ...p, id: p._id || p.id }))

      const matched: any[] = []

      excelData.forEach((row) => {
        const excelName = String(row[columnMapping.productName] || "").toLowerCase().trim()
        const excelShortCode = columnMapping.shortCode ? String(row[columnMapping.shortCode] || "").trim() : ""
        
        if (!excelName && !excelShortCode) return

        // Find matching product - priority: shortCode > exact name > fuzzy name
        let matchedProduct = null
        
        // 1. Try matching by short code first (most accurate)
        if (excelShortCode) {
          matchedProduct = allProducts.find((p: any) => {
            const productCode = String(p.shortCode || "").trim()
            return productCode && productCode === excelShortCode
          })
        }
        
        // 2. If no shortCode match, try exact name match
        if (!matchedProduct && excelName) {
          matchedProduct = allProducts.find((p: any) => {
            const productName = (p.name || p.productName || "").toLowerCase().trim()
            return productName === excelName
          })
        }
        
        // 3. If still no match, try fuzzy name matching
        if (!matchedProduct && excelName) {
          matchedProduct = allProducts.find((p: any) => {
            const productName = (p.name || p.productName || "").toLowerCase().trim()
            
            // Contains match (one contains the other)
            if (productName.includes(excelName) || excelName.includes(productName)) return true
            
            // Word match - at least 2 significant words match
            const excelWords = excelName.split(/\s+/).filter(w => w.length > 2)
            const productWords = productName.split(/\s+/).filter(w => w.length > 2)
            const matchingWords = excelWords.filter(w => 
              productWords.some(pw => pw.includes(w) || w.includes(pw))
            )
            
            // Match if 2+ words match, or 1 word matches for single-word names
            return matchingWords.length >= 2 || 
                   (matchingWords.length === 1 && excelWords.length === 1)
          })
        }

        // Parse prices from Excel
        const basePrice = columnMapping.price ? parseFloat(row[columnMapping.price]) || null : null
        const aPrice = columnMapping.aPrice ? parseFloat(row[columnMapping.aPrice]) || null : null
        const bPrice = columnMapping.bPrice ? parseFloat(row[columnMapping.bPrice]) || null : null
        const cPrice = columnMapping.cPrice ? parseFloat(row[columnMapping.cPrice]) || null : null
        const restaurantPrice = columnMapping.restaurantPrice ? parseFloat(row[columnMapping.restaurantPrice]) || null : null

        // Skip products with base price = 0 (remove them from list)
        if (basePrice === 0) return

        // Use base price as default for all tiers if tier price is 0 or not provided
        const effectiveBasePrice = basePrice
        const effectiveAPrice = (aPrice !== null && aPrice > 0) ? aPrice : effectiveBasePrice
        const effectiveBPrice = (bPrice !== null && bPrice > 0) ? bPrice : effectiveBasePrice
        const effectiveCPrice = (cPrice !== null && cPrice > 0) ? cPrice : effectiveBasePrice
        const effectiveRestaurantPrice = (restaurantPrice !== null && restaurantPrice > 0) ? restaurantPrice : effectiveBasePrice

        matched.push({
          excelName: row[columnMapping.productName] || "",
        excelShortCode: excelShortCode,
        excelPrice: effectiveBasePrice,
        excelAPrice: effectiveAPrice,
        excelBPrice: effectiveBPrice,
        excelCPrice: effectiveCPrice,
        excelRestaurantPrice: effectiveRestaurantPrice,
        matchedProduct: matchedProduct || null,
        isMatched: !!matchedProduct,
        matchType: matchedProduct ? (excelShortCode && matchedProduct.shortCode === excelShortCode ? "code" : "name") : null
      })
    })

    setMatchedProducts(matched)
    setUploadStep("preview")
    
    const matchCount = matched.filter(m => m.isMatched).length
    const zeroPriceCount = matched.filter(m => m.isMatched && (!m.excelPrice || m.excelPrice === 0)).length
    const willBeAdded = matchCount - zeroPriceCount
    
    // Set summary for display in modal
    setMatchingSummary({
      total: matched.length,
      matched: matchCount,
      zeroPriceCount: zeroPriceCount,
      willAdd: willBeAdded
    })
    
    toast({ title: "Matching Complete", description: `${matchCount} products matched` })
    } catch (error) {
      console.error("Error matching products:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to match products" })
    } finally {
      setMatchingProducts(false)
    }
  }

  // Apply Excel prices to products
  const applyExcelPrices = () => {
    const updates = matchedProducts.filter(m => m.isMatched && m.matchedProduct)
    
    if (updates.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No matched products to update" })
      return
    }

    // If we have products in form, update them
    if (formData.products.length > 0) {
      setFormData(prev => ({
        ...prev,
        products: prev.products.map(p => {
          const match = updates.find(u => (u.matchedProduct.id || u.matchedProduct._id) === (p.id || p._id))
          if (match) {
            // Get base price - use excel price or keep existing
            const basePrice = (match.excelPrice !== null && match.excelPrice > 0) ? match.excelPrice : p.pricePerBox
            
            return {
              ...p,
              // Base price
              pricePerBox: basePrice,
              // Other tiers - use excel value if provided, otherwise use base price as default
              aPrice: (match.excelAPrice !== null && match.excelAPrice > 0) ? match.excelAPrice : basePrice,
              bPrice: (match.excelBPrice !== null && match.excelBPrice > 0) ? match.excelBPrice : basePrice,
              cPrice: (match.excelCPrice !== null && match.excelCPrice > 0) ? match.excelCPrice : basePrice,
              restaurantPrice: (match.excelRestaurantPrice !== null && match.excelRestaurantPrice > 0) ? match.excelRestaurantPrice : basePrice,
            }
          }
          return p
        })
      }))
    } else {
      // Add matched products to form - filter out products with base price 0
      const productsToAdd = updates
        .filter(u => {
          const basePrice = (u.excelPrice !== null && u.excelPrice > 0) ? u.excelPrice : u.matchedProduct.pricePerBox
          return basePrice > 0 // Only add products with valid base price
        })
        .map(u => {
          const basePrice = (u.excelPrice !== null && u.excelPrice > 0) ? u.excelPrice : u.matchedProduct.pricePerBox
          return {
            ...u.matchedProduct,
            pricePerBox: basePrice,
            aPrice: (u.excelAPrice !== null && u.excelAPrice > 0) ? u.excelAPrice : basePrice,
            bPrice: (u.excelBPrice !== null && u.excelBPrice > 0) ? u.excelBPrice : basePrice,
            cPrice: (u.excelCPrice !== null && u.excelCPrice > 0) ? u.excelCPrice : basePrice,
            restaurantPrice: (u.excelRestaurantPrice !== null && u.excelRestaurantPrice > 0) ? u.excelRestaurantPrice : basePrice,
          }
        })
      setFormData(prev => ({ ...prev, products: productsToAdd }))
    }

    toast({ title: "Prices Updated", description: `Updated ${updates.length} products from Excel` })
    resetExcelUpload()
  }

  // Update a single matched product price in preview
  const updateMatchedPrice = (idx: number, field: string, value: string) => {
    const numValue = value === "" ? null : parseFloat(value) || 0
    setMatchedProducts(prev => prev.map((item, i) => 
      i === idx ? { ...item, [field]: numValue } : item
    ))
  }

  // Get unique categories from matched products
  const excelCategories = ["all", ...new Set(
    matchedProducts
      .filter(m => m.isMatched && m.matchedProduct)
      .map(m => m.matchedProduct.category?.categoryName || m.matchedProduct.category || "Uncategorized")
  )]

  // Filter matched products by category
  const filteredMatchedProducts = matchedProducts.filter(m => {
    if (excelCategoryFilter === "all") return true
    const cat = m.matchedProduct?.category?.categoryName || m.matchedProduct?.category || "Uncategorized"
    return cat === excelCategoryFilter
  })

  // Toggle Excel row selection
  const toggleExcelRowSelection = (idx: number) => {
    setSelectedExcelRows(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    )
  }

  // Select all visible Excel rows
  const selectAllExcelRows = () => {
    const visibleIndices = matchedProducts
      .map((m, idx) => ({ m, idx }))
      .filter(({ m }) => {
        if (!m.isMatched) return false
        if (excelCategoryFilter === "all") return true
        const cat = m.matchedProduct?.category?.categoryName || m.matchedProduct?.category || "Uncategorized"
        return cat === excelCategoryFilter
      })
      .map(({ idx }) => idx)
    
    if (selectedExcelRows.length === visibleIndices.length) {
      setSelectedExcelRows([])
    } else {
      setSelectedExcelRows(visibleIndices)
    }
  }

  // Apply bulk percentage to selected Excel rows
  const applyExcelBulkPercent = (increase: boolean) => {
    const percent = parseFloat(excelBulkPercent) || 0
    if (percent === 0 || selectedExcelRows.length === 0) return
    
    const multiplier = increase ? (1 + percent / 100) : (1 - percent / 100)
    
    setMatchedProducts(prev => prev.map((item, idx) => {
      if (!selectedExcelRows.includes(idx) || !item.isMatched) return item
      
      const oldPrice = item.matchedProduct?.pricePerBox || 0
      const oldA = item.matchedProduct?.aPrice || 0
      const oldB = item.matchedProduct?.bPrice || 0
      const oldC = item.matchedProduct?.cPrice || 0
      
      return {
        ...item,
        excelPrice: Math.round((item.excelPrice ?? oldPrice) * multiplier * 100) / 100,
        excelAPrice: Math.round((item.excelAPrice ?? oldA) * multiplier * 100) / 100,
        excelBPrice: Math.round((item.excelBPrice ?? oldB) * multiplier * 100) / 100,
        excelCPrice: Math.round((item.excelCPrice ?? oldC) * multiplier * 100) / 100,
      }
    }))
    
    toast({ 
      title: "Prices Updated", 
      description: `${increase ? "Increased" : "Decreased"} by ${percent}% for ${selectedExcelRows.length} products` 
    })
    setExcelBulkPercent("")
  }

  // Copy base price to all tiers for selected Excel rows
  const copyExcelBasePriceToTiers = () => {
    if (selectedExcelRows.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Select products first" })
      return
    }
    
    setMatchedProducts(prev => prev.map((item, idx) => {
      if (!selectedExcelRows.includes(idx) || !item.isMatched) return item
      
      const basePrice = item.excelPrice ?? item.matchedProduct?.pricePerBox ?? 0
      return {
        ...item,
        excelAPrice: basePrice,
        excelBPrice: basePrice,
        excelCPrice: basePrice,
      }
    }))
    
    toast({ title: "Copied", description: `Base price copied to all tiers for ${selectedExcelRows.length} products` })
  }

  // Set same price for all selected rows
  const setUniformPrice = (field: string, value: string) => {
    const numValue = value === "" ? null : parseFloat(value) || 0
    if (selectedExcelRows.length === 0) return
    
    setMatchedProducts(prev => prev.map((item, idx) => {
      if (!selectedExcelRows.includes(idx) || !item.isMatched) return item
      return { ...item, [field]: numValue }
    }))
  }

  // Reset Excel upload state
  const resetExcelUpload = () => {
    setExcelModalOpen(false)
    setExcelData([])
    setExcelColumns([])
    setColumnMapping({ productName: "", shortCode: "", price: "", aPrice: "", bPrice: "", cPrice: "", restaurantPrice: "" })
    setMatchedProducts([])
    setUploadStep("upload")
    setExcelCategoryFilter("all")
    setExcelBulkPercent("")
    setSelectedExcelRows([])
    setMatchingSummary(null)
  }

  // Download sample Excel template - with actual products
  const downloadSampleExcel = () => {
    // Use actual products if available, otherwise use sample data
    const productsToExport = products.length > 0 ? products.slice(0, 50) : []
    
    if (productsToExport.length > 0) {
      // Export actual products with current prices
      // If A/B/C/Restaurant price is 0, use Base Price as default
      const headers = ["Product Name", "Short Code", "Category", "Base Price", "A Price", "B Price", "C Price", "Restaurant Price"]
      const rows = productsToExport.map((p: any) => {
        const basePrice = p.pricePerBox || 0
        return [
          p.name || p.productName || "",
          p.shortCode || "",
          p.category?.categoryName || p.category || "",
          basePrice,
          (p.aPrice && p.aPrice > 0) ? p.aPrice : basePrice,
          (p.bPrice && p.bPrice > 0) ? p.bPrice : basePrice,
          (p.cPrice && p.cPrice > 0) ? p.cPrice : basePrice,
          (p.restaurantPrice && p.restaurantPrice > 0) ? p.restaurantPrice : basePrice
        ]
      })
      
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      
      // Set column widths
      ws['!cols'] = [
        { wch: 35 }, // Product Name
        { wch: 10 }, // Short Code
        { wch: 15 }, // Category
        { wch: 12 }, // Base Price
        { wch: 12 }, // A Price
        { wch: 12 }, // B Price
        { wch: 12 }, // C Price
        { wch: 15 }, // Restaurant Price
      ]
      
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Price List")
      XLSX.writeFile(wb, `price_list_template_${new Date().toISOString().slice(0,10)}.xlsx`)
      
      toast({ title: "Downloaded", description: `Template with ${productsToExport.length} products downloaded` })
    } else {
      // Fallback sample data
      const sampleData = [
        ["Product Name", "Short Code", "Category", "Base Price", "A Price", "B Price", "C Price", "Restaurant Price"],
        ["Tomatoes Roma 25lb", "01", "Vegetables", 25.99, 24.99, 23.99, 22.99, 21.99],
        ["Onions Yellow 50lb", "02", "Vegetables", 18.50, 17.50, 16.50, 15.50, 14.50],
        ["Peppers Green Bell 25lb", "03", "Vegetables", 32.00, 31.00, 30.00, 29.00, 28.00],
        ["Cilantro Bunch 60ct", "04", "Herbs", 15.00, 14.50, 14.00, 13.50, 13.00],
        ["Limes 200ct", "05", "Fruits", 28.00, 27.00, 26.00, 25.00, 24.00],
      ]
      
      const ws = XLSX.utils.aoa_to_sheet(sampleData)
      ws['!cols'] = [
        { wch: 35 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
      ]
      
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Price List")
      XLSX.writeFile(wb, "price_list_template.xlsx")
      
      toast({ title: "Downloaded", description: "Sample Excel template downloaded" })
    }
  }

  // Download full product list for price update - using backend API
  const downloadFullProductList = async () => {
    setDownloadingFullList(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/product/export-excel`, {
        method: 'GET',
      })
      
      if (!response.ok) {
        throw new Error('Failed to download')
      }
      
      // Get the blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `price_update_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({ title: "Downloaded", description: "Full product list downloaded successfully" })
    } catch (error) {
      console.error("Error downloading full product list:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to download product list" })
    } finally {
      setDownloadingFullList(false)
    }
  }

  // Quick Price Update - Parse input and update price
  // Formats: "01 25.99" (base), "01a 24.99" (A), "01b 23.99" (B), "01c 22.99" (C), "01r 21.99" (Restaurant)
  const handleQuickPriceUpdate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    
    const input = quickPriceInput.trim()
    if (!input) return
    
    // Parse input: "01 25.99" or "01a/b/c/r 24.99"
    const match = input.match(/^(\d+)(a|b|c|r)?\s+([\d.]+)$/i)
    if (!match) {
      toast({ variant: "destructive", title: "Invalid format", description: "Use: 01 25.99 (base) or 01a/b/c/r for price tiers" })
      return
    }
    
    const [, code, tier, priceStr] = match
    const shortCode = code.padStart(2, '0')
    const newPrice = parseFloat(priceStr)
    
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ variant: "destructive", title: "Invalid price", description: "Please enter a valid price" })
      return
    }
    
    // Determine which field to update
    let field = "pricePerBox"
    let fieldLabel = "Base"
    if (tier) {
      const tierLower = tier.toLowerCase()
      if (tierLower === "a") { field = "aPrice"; fieldLabel = "A" }
      else if (tierLower === "b") { field = "bPrice"; fieldLabel = "B" }
      else if (tierLower === "c") { field = "cPrice"; fieldLabel = "C" }
      else if (tierLower === "r") { field = "restaurantPrice"; fieldLabel = "Restaurant" }
    }
    
    // Find product by shortCode
    const productIndex = formData.products.findIndex(p => p.shortCode === shortCode)
    if (productIndex === -1) {
      toast({ variant: "destructive", title: "Product not found", description: `No product with code ${shortCode}` })
      return
    }
    
    const product = formData.products[productIndex]
    const oldPrice = product[field] || 0
    
    // Update the price
    setFormData(prev => ({
      ...prev,
      products: prev.products.map((p, idx) => 
        idx === productIndex ? { ...p, [field]: newPrice } : p
      )
    }))
    
    // Add to history
    setQuickPriceHistory(prev => [{
      code: shortCode,
      field: fieldLabel,
      oldPrice,
      newPrice,
      productName: product.name || product.productName
    }, ...prev.slice(0, 19)]) // Keep last 20
    
    // Clear input
    setQuickPriceInput("")
    
    toast({ 
      title: "Price Updated", 
      description: `${shortCode} ${product.name || product.productName} ${fieldLabel}: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)}` 
    })
  }

  // Undo last quick price update
  const undoLastQuickPrice = () => {
    if (quickPriceHistory.length === 0) return
    
    const last = quickPriceHistory[0]
    const fieldMap: Record<string, string> = { "Base": "pricePerBox", "A": "aPrice", "B": "bPrice", "C": "cPrice", "Restaurant": "restaurantPrice" }
    const field = fieldMap[last.field]
    
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.shortCode === last.code ? { ...p, [field]: last.oldPrice } : p
      )
    }))
    
    setQuickPriceHistory(prev => prev.slice(1))
    toast({ title: "Undone", description: `Reverted ${last.code} ${last.field} to $${last.oldPrice.toFixed(2)}` })
  }

  // Quick Add - Handle input change and show preview (backend search)
  const handleQuickAddChange = (value: string) => {
    setQuickAddInput(value)
    const trimmedValue = value.trim()
    
    if (!trimmedValue) {
      setQuickAddPreview(null)
      return
    }
    
    // Clear previous timeout
    if (quickAddSearchTimeoutRef.current) {
      clearTimeout(quickAddSearchTimeoutRef.current)
    }
    
    // Debounce backend search
    quickAddSearchTimeoutRef.current = setTimeout(async () => {
      setQuickAddLoading(true)
      try {
        let product = null
        
        // Check if input is numeric (product code) or text (product name)
        const isNumeric = /^\d+$/.test(trimmedValue)
        
        if (isNumeric) {
          // Search by product code from backend
          const code = trimmedValue.padStart(2, '0')
          product = await getProductByShortCodeAPI(code)
          if (product) {
            product = { ...product, id: product._id || product.id }
          }
        }
        
        if (!product && trimmedValue) {
          // Search by name from backend
          const results = await searchProductsForOrderAPI(trimmedValue, 1)
          if (results.length > 0) {
            product = { ...results[0], id: results[0]._id || results[0].id }
          }
        }
        
        setQuickAddPreview(product)
      } catch (error) {
        console.error("Error searching product:", error)
        setQuickAddPreview(null)
      } finally {
        setQuickAddLoading(false)
      }
    }, 300)
  }

  // Quick Add - Add product to price list
  const handleQuickAddProduct = () => {
    if (!quickAddPreview) {
      toast({ variant: "destructive", title: "No product", description: "Enter a valid product code" })
      return
    }
    
    // Check if already in list
    const exists = formData.products.some(p => p.id === quickAddPreview.id)
    if (exists) {
      toast({ variant: "destructive", title: "Already added", description: `${quickAddPreview.name} is already in the list` })
      setQuickAddInput("")
      setQuickAddPreview(null)
      quickAddRef.current?.focus()
      return
    }
    
    // Add to products
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, quickAddPreview]
    }))
    
    toast({ title: "Added!", description: `${quickAddPreview.shortCode} ${quickAddPreview.name} added to price list` })
    setQuickAddInput("")
    setQuickAddPreview(null)
    quickAddRef.current?.focus()
  }

  // Quick Add - Handle Enter key
  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleQuickAddProduct()
    }
  }

  // Product table search with debounce
  const handleProductTableSearch = (value: string) => {
    setProductTableSearch(value)
    setHasMoreProducts(true)
    
    // Clear previous timeout
    if (productSearchTimeoutRef.current) {
      clearTimeout(productSearchTimeoutRef.current)
    }
    
    // Debounce search
    productSearchTimeoutRef.current = setTimeout(async () => {
      setProductSearchLoading(true)
      try {
        const results = await searchProductsForOrderAPI(value, 10, productTableCategory === "all" ? "" : productTableCategory)
        const updatedProducts = results.map((product: any) => ({
          ...product,
          id: product._id || product.id,
        }))
        setProducts(updatedProducts)
        setDisplayedProducts(updatedProducts)
        setHasMoreProducts(results.length === 10)
      } catch (error) {
        console.error("Error searching products:", error)
      } finally {
        setProductSearchLoading(false)
      }
    }, 300)
  }

  // Product table category change
  const handleProductTableCategoryChange = async (category: string) => {
    setProductTableCategory(category)
    setHasMoreProducts(true)
    setProductSearchLoading(true)
    try {
      const results = await searchProductsForOrderAPI(productTableSearch, 10, category === "all" ? "" : category)
      const updatedProducts = results.map((product: any) => ({
        ...product,
        id: product._id || product.id,
      }))
      setProducts(updatedProducts)
      setDisplayedProducts(updatedProducts)
      setHasMoreProducts(results.length === 10)
    } catch (error) {
      console.error("Error fetching products by category:", error)
    } finally {
      setProductSearchLoading(false)
    }
  }

  // Load more products (infinite scroll)
  const loadMoreProductsForTable = async () => {
    if (loadingMoreProducts || !hasMoreProducts) return
    
    setLoadingMoreProducts(true)
    try {
      const skip = displayedProducts.length
      const results = await searchProductsForOrderAPI(
        productTableSearch, 
        10, 
        productTableCategory === "all" ? "" : productTableCategory,
        skip
      )
      
      if (results.length > 0) {
        const updatedProducts = results.map((product: any) => ({
          ...product,
          id: product._id || product.id,
        }))
        setDisplayedProducts(prev => [...prev, ...updatedProducts])
        setProducts(prev => [...prev, ...updatedProducts])
      }
      
      if (results.length < 10) {
        setHasMoreProducts(false)
      }
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoadingMoreProducts(false)
    }
  }

  // Handle scroll in product table
  const handleProductTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (hasMoreProducts && !loadingMoreProducts) {
        loadMoreProductsForTable()
      }
    }
  }

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    })
  }


  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

        <main className="flex-1 overflow-y-auto">
          <div className="container px-4 py-6 mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-6">
              <PageHeader title="Price Lists" description="Create and manage price lists to share with stores">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} className="mr-2" /> Back
                  </Button>
                  <Button onClick={() => { resetForm(); setCreateModalOpen(true); }}>
                    <Plus size={16} className="mr-2" /> New Price List
                  </Button>
                </div>
              </PageHeader>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatsCard title="Total Lists" value={stats.total} icon={FileText} color="blue" />
              <StatsCard title="Active" value={stats.active} subtitle="Ready to share" icon={CheckCircle} color="green" />
              <StatsCard title="Drafts" value={stats.draft} subtitle="In progress" icon={Edit} color="orange" />
              <StatsCard title="Archived" value={stats.archived} icon={Clock} color="purple" />
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search price lists..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => fetchTemplates(page)}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Price Lists */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Price Lists Yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first price list to share with stores
                  </p>
                  <Button onClick={() => { resetForm(); setCreateModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Create First Price List
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Template Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{template.name}</h3>
                            <StatusBadge status={template.status} />
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {template.description || "No description"}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {template.products?.length || 0} products
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Created {formatDate(template.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-2">
                          {/* Copy URLs */}
                          <Button variant="outline" size="sm" onClick={() => copyUrl(template, "template")}>
                            <Copy className="h-4 w-4 mr-1" /> Copy URL
                          </Button>
                          {/* <Button variant="outline" size="sm" onClick={() => copyUrl(template, "nextweek")} className="text-purple-600 border-purple-200 hover:bg-purple-50">
                            <Link2 className="h-4 w-4 mr-1" /> Next Week URL
                          </Button> */}

                          {/* Send */}
                          <Button variant="outline" size="sm" onClick={() => openSendModal(template)} className="text-green-600 border-green-200 hover:bg-green-50">
                            <Send className="h-4 w-4 mr-1" /> Send
                          </Button>

                          {/* More Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(template)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                                <Copy className="h-4 w-4 mr-2" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadPDF(template)}>
                                <Download className="h-4 w-4 mr-2" /> Download PDF
                              </DropdownMenuItem>
                          
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(template.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchTemplates(page - 1)} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <span className="text-sm">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => fetchTemplates(page + 1)} disabled={page >= totalPages}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>


      {/* Create/Edit Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? "Edit Price List" : "Create New Price List"}</DialogTitle>
            <DialogDescription>
              {selectedTemplate ? "Update your price list details and products" : "Set up a new price list to share with stores"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details & Products</TabsTrigger>
              <TabsTrigger value="quick">⚡ Quick Update</TabsTrigger>
              <TabsTrigger value="prices">Edit Prices ({formData.products.length})</TabsTrigger>
            </TabsList>

            {/* Tab 1: Details & Product Selection */}
            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    placeholder="e.g., Weekly Produce List"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Optional description for this price list"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Quick Add by Code */}
              <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">Quick Add by Code</h3>
                    </div>
                    <span className="text-xs text-blue-600">Press / to focus</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-bold">#</span>
                      <Input
                        ref={quickAddRef}
                        placeholder="Enter product code (e.g., 21) or name"
                        value={quickAddInput}
                        onChange={(e) => handleQuickAddChange(e.target.value)}
                        onKeyDown={handleQuickAddKeyDown}
                        className="pl-8 text-lg font-mono bg-white"
                      />
                      {quickAddLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <Button onClick={handleQuickAddProduct} disabled={!quickAddPreview || quickAddLoading}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                  
                  {/* Product Preview */}
                  {quickAddPreview && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-green-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-blue-100 text-blue-700 font-mono text-lg">#{quickAddPreview.shortCode}</Badge>
                        <div>
                          <p className="font-semibold">{quickAddPreview.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Box: {formatCurrency(quickAddPreview.pricePerBox || 0)} | Unit: {formatCurrency(quickAddPreview.price || 0)}
                          </p>
                        </div>
                      </div>
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                  )}
                  
                  {quickAddInput && !quickAddPreview && !quickAddLoading && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 text-red-600 text-sm">
                      No product found with "{quickAddInput}"
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    toast({ title: "Loading...", description: "Fetching all products" })
                    const allProducts = await getAllProductAPI()
                    if (allProducts) {
                      const formattedProducts = allProducts.map((p: any) => ({ ...p, id: p._id || p.id }))
                      setFormData(prev => ({ ...prev, products: formattedProducts }))
                      toast({ title: "Added", description: `${formattedProducts.length} products added` })
                    }
                  } catch (error) {
                    toast({ variant: "destructive", title: "Error", description: "Failed to fetch products" })
                  }
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Select All Products
                </Button>
                <Button variant="outline" size="sm" onClick={() => setFormData(prev => ({ ...prev, products: [...prev.products, ...displayedProducts.filter(p => !prev.products.some(fp => fp.id === p.id))] }))}>
                  <Plus className="h-4 w-4 mr-1" /> Add Displayed ({displayedProducts.length})
                </Button>
                <Button variant="outline" size="sm" onClick={() => setFormData(prev => ({ ...prev, products: [] }))}>
                  Clear All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)} className="text-purple-600">
                  <Download className="h-4 w-4 mr-1" /> Import from List
                </Button>
                <Button variant="outline" size="sm" onClick={() => setExcelModalOpen(true)} className="text-green-600">
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Upload Excel
                </Button>
              </div>

              {/* Product Selection with Search and Category Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Products ({formData.products.length} selected)</Label>
                  <Badge variant="outline" className="text-xs">
                    {displayedProducts.length} products {hasMoreProducts && "(scroll for more)"}
                  </Badge>
                </div>
                
                {/* Search and Category Filter */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={productTableSearch}
                      onChange={(e) => handleProductTableSearch(e.target.value)}
                      className="pl-9"
                    />
                    {productSearchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <Select value={productTableCategory} onValueChange={handleProductTableCategoryChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <ScrollArea className="h-[280px] border rounded-md" onScrollCapture={handleProductTableScroll}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedProducts.map((product, index) => {
                        const isSelected = formData.products.some(p => p.id === product.id)
                        return (
                          <TableRow key={`${product.id}-${index}`} className={isSelected ? "bg-blue-50" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      products: [...prev.products, product]
                                    }))
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      products: prev.products.filter(p => p.id !== product.id)
                                    }))
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.category?.categoryName || product.category || "-"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.pricePerBox || product.price || 0)}</TableCell>
                          </TableRow>
                        )
                      })}
                      {/* Loading more indicator */}
                      {loadingMoreProducts && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            <Loader2 className="h-5 w-5 mx-auto animate-spin text-blue-600" />
                            <p className="text-sm text-muted-foreground mt-1">Loading more products...</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* No products found */}
                      {displayedProducts.length === 0 && !productSearchLoading && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No products found
                          </TableCell>
                        </TableRow>
                      )}
                      {/* All products loaded */}
                      {displayedProducts.length > 0 && !hasMoreProducts && !loadingMoreProducts && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-2 text-muted-foreground text-xs">
                            All products loaded ({displayedProducts.length} total)
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Tab 2: Quick Price Update with Short Codes */}
            <TabsContent value="quick" className="space-y-4 mt-4">
              {formData.products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No products selected. Go to "Details & Products" tab to add products first.</p>
                </div>
              ) : (
                <>
                  {/* Quick Input Section */}
                  <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Zap className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">Quick Price Entry</h3>
                      </div>
                      
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Type: 01 25.99 or 01a/b/c/r 24.99"
                          value={quickPriceInput}
                          onChange={(e) => setQuickPriceInput(e.target.value)}
                          onKeyDown={handleQuickPriceUpdate}
                          className="flex-1 text-lg font-mono bg-white"
                          autoFocus
                        />
                        <Button 
                          variant="outline" 
                          onClick={undoLastQuickPrice}
                          disabled={quickPriceHistory.length === 0}
                          className="text-orange-600"
                        >
                          Undo
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-xs text-blue-800">
                        <span className="bg-white px-2 py-1 rounded"><strong>01 25.99</strong> = Base Price</span>
                        <span className="bg-white px-2 py-1 rounded"><strong>01a 24.99</strong> = A Price</span>
                        <span className="bg-white px-2 py-1 rounded"><strong>01b 23.99</strong> = B Price</span>
                        <span className="bg-white px-2 py-1 rounded"><strong>01c 22.99</strong> = C Price</span>
                        <span className="bg-white px-2 py-1 rounded"><strong>01r 21.99</strong> = Restaurant</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Updates */}
                  {quickPriceHistory.length > 0 && (
                    <Card>
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4" /> Recent Updates ({quickPriceHistory.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-2">
                        <div className="flex flex-wrap gap-2">
                          {quickPriceHistory.slice(0, 10).map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs py-1">
                              <span className="font-mono text-blue-600 mr-1">{item.code}</span>
                              {item.field}: ${item.oldPrice.toFixed(2)} → <span className="text-green-600">${item.newPrice.toFixed(2)}</span>
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Product List with Short Codes */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Products with Short Codes</Label>
                      <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Filter products..."
                          value={quickPriceFilter}
                          onChange={(e) => setQuickPriceFilter(e.target.value)}
                          className="pl-8 h-8"
                        />
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[320px] border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-16 font-bold">Code</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="text-right w-24">Base</TableHead>
                            <TableHead className="text-right w-24">A Price</TableHead>
                            <TableHead className="text-right w-24">B Price</TableHead>
                            <TableHead className="text-right w-24">C Price</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.products
                            .filter(p => {
                              if (!quickPriceFilter) return true
                              const name = (p.name || p.productName || "").toLowerCase()
                              const code = (p.shortCode || "").toLowerCase()
                              return name.includes(quickPriceFilter.toLowerCase()) || code.includes(quickPriceFilter.toLowerCase())
                            })
                            .sort((a, b) => (a.shortCode || "99").localeCompare(b.shortCode || "99"))
                            .map((product, index) => {
                              // Check if this product was recently updated
                              const recentUpdate = quickPriceHistory.find(h => h.code === product.shortCode)
                              return (
                                <TableRow key={`${product.id}-${index}`} className={recentUpdate ? "bg-green-50" : ""}>
                                  <TableCell className="font-mono font-bold text-blue-600 text-lg">
                                    {product.shortCode || "—"}
                                  </TableCell>
                                  <TableCell className="font-medium text-sm">
                                    {product.name || product.productName}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    ${(product.pricePerBox || 0).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-orange-600">
                                    ${(product.aPrice || 0).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-purple-600">
                                    ${(product.bPrice || 0).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-teal-600">
                                    ${(product.cPrice || 0).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    💡 Type product code + price and press Enter. Example: <code className="bg-muted px-1 rounded">15 29.99</code> updates product #15 base price to $29.99
                  </p>
                </>
              )}
            </TabsContent>

            {/* Tab 3: Fast Price Editing */}
            <TabsContent value="prices" className="space-y-4 mt-4">
              {formData.products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No products selected. Go to "Details & Products" tab to add products first.</p>
                </div>
              ) : (
                <>
                  {/* Bulk Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={selectedProductIds.length === formData.products.length && formData.products.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedProductIds.length > 0 ? `${selectedProductIds.length} selected` : "Select all"}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-border mx-2" />
                    
                    {/* Bulk % Change */}
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        placeholder="%"
                        value={bulkPercent}
                        onChange={(e) => setBulkPercent(e.target.value)}
                        className="w-16 h-8 text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => applyBulkPercentage(true)}
                        disabled={!bulkPercent || selectedProductIds.length === 0}
                        className="text-green-600"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" /> +%
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => applyBulkPercentage(false)}
                        disabled={!bulkPercent || selectedProductIds.length === 0}
                        className="text-red-600"
                      >
                        <TrendingUp className="h-3 w-3 mr-1 rotate-180" /> -%
                      </Button>
                    </div>
                    
                    <div className="h-4 w-px bg-border mx-2" />
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyAllPricesToTiers}
                      className="text-blue-600"
                    >
                      <Zap className="h-3 w-3 mr-1" /> Copy Base → All Tiers
                    </Button>
                    
                    <div className="h-4 w-px bg-border mx-2" />
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={removeSelectedProducts}
                      disabled={selectedProductIds.length === 0}
                      className="text-red-600"
                      title={selectedProductIds.length > 0 ? `Remove ${selectedProductIds.length} selected products` : "Select products to remove"}
                    >
                      <X className="h-3 w-3 mr-1" /> Clear Selected
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Price Editing Table */}
                  <ScrollArea className="h-[350px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead className="min-w-[150px]">Product</TableHead>
                          <TableHead className="text-right w-24">Base Price</TableHead>
                          <TableHead className="text-right w-24">A Price</TableHead>
                          <TableHead className="text-right w-24">B Price</TableHead>
                          <TableHead className="text-right w-24">C Price</TableHead>
                          <TableHead className="text-right w-24">Restaurant</TableHead>
                          <TableHead className="w-20 text-center">Quick</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFormProducts.map((product, index) => {
                          const isSelected = selectedProductIds.includes(product.id)
                          return (
                            <TableRow key={`${product.id}-${index}`} className={isSelected ? "bg-blue-50" : ""}>
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleProductSelection(product.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {product.name || product.productName}
                              </TableCell>
                              
                              {/* Editable Price Cells */}
                              {["pricePerBox", "aPrice", "bPrice", "cPrice", "restaurantPrice"].map((field) => (
                                <TableCell key={field} className="text-right p-1">
                                  {editingCell?.productId === product.id && editingCell?.field === field ? (
                                    <Input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={handleEditKeyDown}
                                      onBlur={saveEdit}
                                      autoFocus
                                      step="0.01"
                                      className="w-20 h-8 text-right text-sm"
                                    />
                                  ) : (
                                    <button
                                      onClick={() => startEditing(product.id, field, product[field] || 0)}
                                      className="w-full text-right px-2 py-1 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                                    >
                                      {formatCurrency(product[field] || 0)}
                                    </button>
                                  )}
                                </TableCell>
                              ))}
                              
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyPriceToAllTiers(product.id)}
                                  className="h-7 text-xs text-blue-600 hover:text-blue-800"
                                  title="Copy base price to A, B, C"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  <p className="text-xs text-muted-foreground">
                    💡 Click any price to edit inline. Use bulk actions to update multiple products at once.
                  </p>
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>
              {selectedTemplate ? "Update Price List" : "Create Price List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Existing List Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import from Existing List</DialogTitle>
            <DialogDescription>
              Select a price list to import products from
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {templates.filter(t => t.id !== selectedTemplate?.id).map((template) => (
                <Card 
                  key={template.id} 
                  className="cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => importFromTemplate(template)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.products?.length || 0} products
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {templates.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No other price lists available</p>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Upload Modal */}
      <Dialog open={excelModalOpen} onOpenChange={(open) => { if (!open) resetExcelUpload(); else setExcelModalOpen(true); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Upload Price List from Excel
            </DialogTitle>
            <DialogDescription>
              Upload an Excel file to update prices. The system will automatically match products by name.
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-2">
            {["upload", "mapping", "preview"].map((step, idx) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  uploadStep === step ? "bg-green-600 text-white" : 
                  ["upload", "mapping", "preview"].indexOf(uploadStep) > idx ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                }`}>
                  {idx + 1}
                </div>
                {idx < 2 && <div className={`w-12 h-0.5 ${["upload", "mapping", "preview"].indexOf(uploadStep) > idx ? "bg-green-600" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Upload */}
          {uploadStep === "upload" && (
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium mb-2">Drop Excel file here or click to browse</p>
                <p className="text-sm text-muted-foreground mb-4">Supports .xlsx, .xls files</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span><Upload className="h-4 w-4 mr-2" /> Select File</span>
                  </Button>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" /> How it works
                </h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Upload your Excel file with product names/codes and prices</li>
                  <li>Map columns to match our price fields</li>
                  <li>System auto-matches products by Short Code (exact) or Name (fuzzy)</li>
                  <li>Review matches and apply price updates</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={downloadSampleExcel} className="w-full">
                  <Download className="h-4 w-4 mr-2" /> Sample Template
                </Button>
                <Button variant="outline" onClick={downloadFullProductList} disabled={downloadingFullList} className="w-full text-blue-600">
                  {downloadingFullList ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Downloading...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Full Product List
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {uploadStep === "mapping" && (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <Check className="h-4 w-4 inline mr-1" />
                  Found {excelData.length} rows with {excelColumns.length} columns
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Map Excel Columns to Price Fields</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Product Name Column *</Label>
                    <Select value={columnMapping.productName || "__none__"} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, productName: v === "__none__" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {excelColumns.filter(col => col).map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">Short Code Column</Label>
                    <Select value={columnMapping.shortCode || "__none__"} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, shortCode: v === "__none__" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="For exact matching" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {excelColumns.filter(col => col).map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">Base Price Column</Label>
                    <Select value={columnMapping.price || "__none__"} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, price: v === "__none__" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {excelColumns.filter(col => col).map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">A Price Column</Label>
                    <Select value={columnMapping.aPrice || "__none__"} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, aPrice: v === "__none__" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {excelColumns.filter(col => col).map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">B Price Column</Label>
                    <Select value={columnMapping.bPrice || "__none__"} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, bPrice: v === "__none__" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {excelColumns.filter(col => col).map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">C Price Column</Label>
                    <Select value={columnMapping.cPrice || "__none__"} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, cPrice: v === "__none__" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {excelColumns.filter(col => col).map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">Restaurant Price Column</Label>
                    <Select value={columnMapping.restaurantPrice || "__none__"} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, restaurantPrice: v === "__none__" ? "" : v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {excelColumns.filter(col => col).map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Preview first few rows */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Excel (first 5 rows)</Label>
                <ScrollArea className="h-[180px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {excelColumns.slice(0, 8).map(col => (
                          <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {excelData.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          {excelColumns.slice(0, 8).map(col => (
                            <TableCell key={col} className="text-xs py-1 whitespace-nowrap">{row[col]}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Step 3: Preview Matches */}
          {uploadStep === "preview" && (
            <div className="space-y-4 py-4">
              {/* Summary Banner */}
              {matchingSummary && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium text-blue-900">Summary:</span>
                      <span className="text-blue-700">Total: <strong>{matchingSummary.total}</strong></span>
                      <span className="text-green-700">Matched: <strong>{matchingSummary.matched}</strong></span>
                      <span className="text-red-700">Price 0 (won't add): <strong>{matchingSummary.zeroPriceCount}</strong></span>
                      <span className="text-blue-900 font-semibold">Will Add: <strong>{matchingSummary.willAdd}</strong></span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Stats Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <Check className="h-3 w-3 mr-1" />
                    {matchedProducts.filter(m => m.isMatched).length} Matched
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    <X className="h-3 w-3 mr-1" />
                    {matchedProducts.filter(m => !m.isMatched).length} Not Found
                  </Badge>
                  {selectedExcelRows.length > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {selectedExcelRows.length} Selected
                    </Badge>
                  )}
                </div>
                
                {/* Category Filter */}
                <Select value={excelCategoryFilter} onValueChange={setExcelCategoryFilter}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {excelCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "all" ? "All Categories" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Actions Bar */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedExcelRows.length > 0 && selectedExcelRows.length === filteredMatchedProducts.filter(m => m.isMatched).length}
                    onCheckedChange={selectAllExcelRows}
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
                
                <div className="h-4 w-px bg-border mx-1" />
                
                {/* Bulk % Change */}
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    placeholder="%"
                    value={excelBulkPercent}
                    onChange={(e) => setExcelBulkPercent(e.target.value)}
                    className="w-14 h-7 text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyExcelBulkPercent(true)}
                    disabled={!excelBulkPercent || selectedExcelRows.length === 0}
                    className="h-7 text-green-600 text-xs"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" /> +%
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyExcelBulkPercent(false)}
                    disabled={!excelBulkPercent || selectedExcelRows.length === 0}
                    className="h-7 text-red-600 text-xs"
                  >
                    <TrendingUp className="h-3 w-3 mr-1 rotate-180" /> -%
                  </Button>
                </div>
                
                <div className="h-4 w-px bg-border mx-1" />
                
                {/* Copy Base to Tiers */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyExcelBasePriceToTiers}
                  disabled={selectedExcelRows.length === 0}
                  className="h-7 text-blue-600 text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" /> Base → All Tiers
                </Button>
              </div>

              {/* Products Table - Grouped by Category */}
              <ScrollArea className="h-[320px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Old Price</TableHead>
                      <TableHead className="text-right">New Price</TableHead>
                      <TableHead className="text-right">New A</TableHead>
                      <TableHead className="text-right">New B</TableHead>
                      <TableHead className="text-right">New C</TableHead>
                      <TableHead className="text-right">New Rest.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedProducts.map((item, idx) => {
                      // Filter by category
                      if (excelCategoryFilter !== "all") {
                        const cat = item.matchedProduct?.category?.categoryName || item.matchedProduct?.category || "Uncategorized"
                        if (cat !== excelCategoryFilter) return null
                      }
                      
                      const isSelected = selectedExcelRows.includes(idx)
                      const category = item.matchedProduct?.category?.categoryName || item.matchedProduct?.category || "Uncategorized"
                      
                      return (
                        <TableRow key={idx} className={`${item.isMatched ? "" : "bg-red-50"} ${isSelected ? "bg-blue-50" : ""}`}>
                          <TableCell className="p-1">
                            {item.isMatched && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleExcelRowSelection(idx)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {item.isMatched ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.matchedProduct ? (
                              <span className="text-green-700 font-medium">{item.matchedProduct.name || item.matchedProduct.productName}</span>
                            ) : (
                              <span className="text-red-500 italic">{item.excelName} (No match)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.isMatched ? (
                              <Badge variant="outline" className="text-xs">{category}</Badge>
                            ) : "-"}
                          </TableCell>
                          {/* Old Price (read-only) */}
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {item.matchedProduct ? formatCurrency(item.matchedProduct.pricePerBox || 0) : "-"}
                          </TableCell>
                          {/* Editable New Price */}
                          <TableCell className="text-right p-1">
                            {item.isMatched ? (
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={String(item.matchedProduct?.pricePerBox || 0)}
                                value={item.excelPrice ?? ""}
                                onChange={(e) => updateMatchedPrice(idx, "excelPrice", e.target.value)}
                                className="w-16 h-7 text-right text-sm"
                              />
                            ) : "-"}
                          </TableCell>
                          {/* Editable A Price */}
                          <TableCell className="text-right p-1">
                            {item.isMatched ? (
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={String(item.matchedProduct?.aPrice || 0)}
                                value={item.excelAPrice ?? ""}
                                onChange={(e) => updateMatchedPrice(idx, "excelAPrice", e.target.value)}
                                className="w-16 h-7 text-right text-sm"
                              />
                            ) : "-"}
                          </TableCell>
                          {/* Editable B Price */}
                          <TableCell className="text-right p-1">
                            {item.isMatched ? (
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={String(item.matchedProduct?.bPrice || 0)}
                                value={item.excelBPrice ?? ""}
                                onChange={(e) => updateMatchedPrice(idx, "excelBPrice", e.target.value)}
                                className="w-16 h-7 text-right text-sm"
                              />
                            ) : "-"}
                          </TableCell>
                          {/* Editable C Price */}
                          <TableCell className="text-right p-1">
                            {item.isMatched ? (
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={String(item.matchedProduct?.cPrice || 0)}
                                value={item.excelCPrice ?? ""}
                                onChange={(e) => updateMatchedPrice(idx, "excelCPrice", e.target.value)}
                                className="w-16 h-7 text-right text-sm"
                              />
                            ) : "-"}
                          </TableCell>
                          {/* Editable Restaurant Price */}
                          <TableCell className="text-right p-1">
                            {item.isMatched ? (
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={String(item.matchedProduct?.restaurantPrice || 0)}
                                value={item.excelRestaurantPrice ?? ""}
                                onChange={(e) => updateMatchedPrice(idx, "excelRestaurantPrice", e.target.value)}
                                className="w-16 h-7 text-right text-sm"
                              />
                            ) : "-"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <p>💡 Leave price fields blank to keep old price. Select products to apply bulk changes.</p>
                <p>Showing: {filteredMatchedProducts.filter(m => m.isMatched).length} products</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {uploadStep !== "upload" && (
              <Button variant="outline" onClick={() => setUploadStep(uploadStep === "preview" ? "mapping" : "upload")}>
                Back
              </Button>
            )}
            <Button variant="outline" onClick={resetExcelUpload}>Cancel</Button>
            
            {uploadStep === "mapping" && (
              <Button onClick={matchExcelToProducts} disabled={!columnMapping.productName || matchingProducts}>
                {matchingProducts ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Matching...
                  </>
                ) : (
                  "Match Products"
                )}
              </Button>
            )}
            
            {uploadStep === "preview" && (
              <Button 
                onClick={applyExcelPrices} 
                disabled={matchedProducts.filter(m => m.isMatched).length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Apply {matchedProducts.filter(m => m.isMatched).length} Updates
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Modal */}
      <Dialog open={sendModalOpen} onOpenChange={(open) => {
        setSendModalOpen(open)
        if (!open) {
          setSelectedCategoryStores([])
          setCategoryStores([])
          setCategoryStoresPage(1)
          setTotalCategoryStores(0)
          setStoreSearchQuery("")
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Price List</DialogTitle>
            <DialogDescription>
              Choose how you want to send "{selectedTemplate?.name}" to stores
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Send Mode Selection */}
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer transition-all ${sendMode === "bulk" ? "border-blue-500 bg-blue-50" : "hover:border-gray-300"}`}
                onClick={() => setSendMode("bulk")}
              >
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h4 className="font-medium">Select Stores</h4>
                  <p className="text-xs text-muted-foreground">Choose specific stores</p>
                </CardContent>
              </Card>
              <Card 
                className={`cursor-pointer transition-all ${sendMode === "category" ? "border-orange-500 bg-orange-50" : "hover:border-gray-300"}`}
                onClick={() => {
                  setSendMode("category")
                  if (categoryStores.length === 0) {
                    fetchCategoryStores()
                  }
                }}
              >
                <CardContent className="p-4 text-center">
                  <Globe className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <h4 className="font-medium">By Price Category</h4>
                  <p className="text-xs text-muted-foreground">Select stores by category</p>
                </CardContent>
              </Card>
            </div>

            {/* Store Selection (for bulk mode) */}
            {sendMode === "bulk" && (
              <div className="space-y-2">
                <Label>Select Stores</Label>
                <SelecteStores
                  selectedStore={selectedStores}
                  setSelectedStore={setSelectedStores}
                />
              </div>
            )}

            {/* Category Mode - Direct Store List */}
            {sendMode === "category" && (
              <div>
                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search stores by name or email..."
                    value={storeSearchQuery}
                    onChange={(e) => handleStoreSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {loadingCategoryStores ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading stores...</span>
                  </div>
                ) : categoryStores.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {storeSearchQuery ? "No stores found for your search" : "No stores found"}
                  </div>
                ) : (
                  <>
                    {/* Select All Header */}
                    <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedCategoryStores.length === categoryStores.length && categoryStores.length > 0}
                          onCheckedChange={selectAllCategoryStores}
                          className="h-5 w-5"
                        />
                        <span className="font-medium cursor-pointer" onClick={selectAllCategoryStores}>
                          Select All (Page {categoryStoresPage})
                        </span>
                      </div>
                      <Badge className={selectedCategoryStores.length > 0 ? "bg-blue-600" : "bg-gray-400"}>
                        {selectedCategoryStores.length} selected
                      </Badge>
                    </div>
                    
                    {/* Simple Stores List */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="h-[280px] overflow-y-auto divide-y">
                        {categoryStores.map((store: any) => (
                          <label 
                            key={store.email} 
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={selectedCategoryStores.includes(store.email)}
                              onCheckedChange={() => toggleCategoryStore(store.email)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{store.storeName}</p>
                              <p className="text-xs text-muted-foreground truncate">{store.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-sm text-muted-foreground">
                        Page {categoryStoresPage} of {totalStorePages || 1}
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={goToPrevStorePage}
                          disabled={categoryStoresPage <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={goToNextStorePage}
                          disabled={categoryStores.length < STORES_LIMIT}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Quick Copy URLs */}
            <div className="border-t pt-4">
              <Label className="text-muted-foreground">Or copy URL manually:</Label>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => selectedTemplate && copyUrl(selectedTemplate, "template")}>
                  <Copy className="h-4 w-4 mr-1" /> Template URL
                </Button>
                {/* <Button variant="outline" size="sm" className="flex-1" onClick={() => selectedTemplate && copyUrl(selectedTemplate, "nextweek")}>
                  <Copy className="h-4 w-4 mr-1" /> Next Week URL
                </Button> */}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendModalOpen(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSending || (sendMode === "bulk" && selectedStores.length === 0) || (sendMode === "category" && selectedCategoryStores.length === 0)}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Send Price List
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PriceListEnhanced
