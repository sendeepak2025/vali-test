"use client"

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import Navbar from "@/components/layout/Navbar"
import Sidebar from "@/components/layout/Sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  MapPin,
  Package,
  DollarSign,
  CheckCircle2,
  Store,
  Phone,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Zap,
  Hash,
  History,
  Keyboard,
  Edit3,
  Send,
} from "lucide-react"
import { searchProductsForOrderAPI, getProductByShortCodeAPI } from "@/services2/operations/product"
import { getSinglePreOrderAPI, updatePreOrderAPI, confirmPreOrderAPI } from "@/services2/operations/preOrder"
import { fetchCategoriesAPI } from "@/services2/operations/category"
import { cn } from "@/lib/utils"

type SalesMode = "case" | "unit" | "both"
type PriceCategory = "aPrice" | "bPrice" | "cPrice" | "restaurantPrice"

interface ProductType {
  id: string
  _id: string
  name: string
  price: number
  pricePerBox: number
  aPrice?: number
  bPrice?: number
  cPrice?: number
  restaurantPrice?: number
  shippinCost: number
  category?: string
  image?: string
  stock?: number
  shortCode?: string
  salesMode?: SalesMode
}

interface PriceListProduct {
  id: string
  _id?: string
  name: string
  category?: string
  aPrice?: number
  bPrice?: number
  cPrice?: number
  restaurantPrice?: number
  price?: number
  pricePerBox?: number
  salesMode?: SalesMode
  image?: string
  shippinCost?: number
}

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  pricingType: "box" | "unit"
  shippinCost: number
  shortCode?: string
}

interface AddressType {
  name: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  country: string
}

interface Order {
  id: string
  _id: string
  orderId: string
  preOrderNumber?: string
  store: any
  date: string
  items: OrderItem[]
  status: string
  shippingAddress: AddressType
  billingAddress: AddressType
  shipping: number
  total: number
  confirmed?: boolean
  linkedOrderId?: string
  priceListId?: {
    _id: string
    name: string
    products: PriceListProduct[]
  } | null
}

const UpdatePreOrder = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { id } = useParams()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  // Data states
  const [products, setProducts] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Order data
  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [orderStatus, setOrderStatus] = useState("pending")
  const [orderDate, setOrderDate] = useState("")
  
  // Price category from store
  const [storePriceCategory, setStorePriceCategory] = useState<PriceCategory>("aPrice")

  // Product modal states
  const [showProductModal, setShowProductModal] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [displayedProducts, setDisplayedProducts] = useState<ProductType[]>([])
  const [productsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState<string[]>([])
  const [hasMoreProducts, setHasMoreProducts] = useState(true)
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false)
  const [productSearchLoading, setProductSearchLoading] = useState(false)

  // Address states
  const [billingAddress, setBillingAddress] = useState<AddressType>({
    name: "", email: "", phone: "", address: "", city: "", postalCode: "", country: ""
  })
  const [shippingAddress, setShippingAddress] = useState<AddressType>({
    name: "", email: "", phone: "", address: "", city: "", postalCode: "", country: ""
  })
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [showAddressSection, setShowAddressSection] = useState(false)

  // Quick Add states
  const [quickAddInput, setQuickAddInput] = useState("")
  const [quickAddPreview, setQuickAddPreview] = useState<ProductType | null>(null)
  const [recentlyAddedProducts, setRecentlyAddedProducts] = useState<ProductType[]>([])
  const quickAddRef = useRef<HTMLInputElement>(null)
  const [quickAddQuantity, setQuickAddQuantity] = useState(1)
  const [quickAddPricingType, setQuickAddPricingType] = useState<"box" | "unit">("box")
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const quickAddSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const productSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Product add with quantity selection state
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<ProductType | null>(null)
  const [addQuantity, setAddQuantity] = useState(1)
  const [addPricingType, setAddPricingType] = useState<"box" | "unit">("box")

  // Parse quick add input
  const parseQuickAddInput = useCallback((input: string) => {
    const trimmed = input.trim().toUpperCase()
    const match = trimmed.match(/^(\d+)(?:([XU])(\d+))?$/i)
    if (!match) return null
    const code = match[1].padStart(2, '0')
    const type = match[2]?.toLowerCase() || 'x'
    const qty = match[3] ? parseInt(match[3], 10) : 1
    return {
      code,
      pricingType: type === 'u' ? 'unit' as const : 'box' as const,
      quantity: qty
    }
  }, [])

  // Helper function to get correct price based on store's price category
  const getProductPrice = useCallback((product: ProductType | PriceListProduct, pricingType: "box" | "unit" = "box"): number => {
    if (pricingType === "unit") {
      return product.price || 0
    }
    
    // Get price based on store's price category
    const categoryPrice = product[storePriceCategory as keyof typeof product] as number | undefined
    
    // If category price is set and > 0, use it
    if (categoryPrice && categoryPrice > 0) {
      return categoryPrice
    }
    
    // Fallback to aPrice or pricePerBox
    return product.aPrice || product.pricePerBox || 0
  }, [storePriceCategory])

  // Handle quick add input change - search from backend
  const handleQuickAddChange = useCallback((value: string) => {
    setQuickAddInput(value)
    
    // Clear previous timeout
    if (quickAddSearchTimeoutRef.current) {
      clearTimeout(quickAddSearchTimeoutRef.current)
    }
    
    if (!value.trim()) {
      setQuickAddPreview(null)
      return
    }
    
    const parsed = parseQuickAddInput(value)
    
    // Debounce backend search
    quickAddSearchTimeoutRef.current = setTimeout(async () => {
      setQuickAddLoading(true)
      try {
        let product = null
        
        if (parsed) {
          // Search by short code from backend
          product = await getProductByShortCodeAPI(parsed.code)
          if (product) {
            product = { ...product, id: product._id || product.id, shortCode: product.shortCode || parsed.code }
          }
        }
        
        if (!product && value.trim()) {
          // Search by name from backend
          const results = await searchProductsForOrderAPI(value, 1)
          if (results.length > 0) {
            product = { ...results[0], id: results[0]._id || results[0].id }
          }
        }
        
        setQuickAddPreview(product)
        if (product) {
          const salesMode = product.salesMode || "both"
          const defaultType = salesMode === "unit" ? "unit" : "box"
          setQuickAddPricingType(defaultType)
          setQuickAddQuantity(1)
        }
      } catch (error) {
        console.error("Error searching product:", error)
        setQuickAddPreview(null)
      } finally {
        setQuickAddLoading(false)
      }
    }, 300)
  }, [parseQuickAddInput])

  // Handle quick add submit
  const handleQuickAddSubmit = useCallback(() => {
    if (!quickAddPreview) {
      toast({ title: "No product selected", description: "Enter a valid product code first", variant: "destructive" })
      return
    }
    const product = quickAddPreview
    const salesMode = product.salesMode || "both"
    if (salesMode === "case" && quickAddPricingType === "unit") {
      toast({ title: "Not allowed", description: `${product.name} can only be sold by case/box`, variant: "destructive" })
      return
    }
    if (salesMode === "unit" && quickAddPricingType === "box") {
      toast({ title: "Not allowed", description: `${product.name} can only be sold by unit`, variant: "destructive" })
      return
    }
    
    const existingIndex = orderItems.findIndex(
      item => item.productId === product.id && item.pricingType === quickAddPricingType
    )
    
    // Get correct price based on store's price category
    const unitPrice = getProductPrice(product, quickAddPricingType)
    
    if (existingIndex >= 0) {
      const updated = [...orderItems]
      updated[existingIndex].quantity += quickAddQuantity
      setOrderItems(updated)
    } else {
      setOrderItems([...orderItems, {
        productId: product.id,
        productName: product.name,
        quantity: quickAddQuantity,
        unitPrice: unitPrice,
        pricingType: quickAddPricingType,
        shippinCost: product.shippinCost || 0,
        shortCode: product.shortCode
      }])
    }
    
    setRecentlyAddedProducts(prev => {
      const filtered = prev.filter(p => p.id !== product.id)
      return [product, ...filtered].slice(0, 10)
    })
    
    toast({ title: "Added!", description: `${quickAddQuantity} ${quickAddPricingType === 'box' ? 'box(es)' : 'unit(s)'} of ${product.name}` })
    setQuickAddInput("")
    setQuickAddPreview(null)
    setQuickAddQuantity(1)
    quickAddRef.current?.focus()
  }, [quickAddPreview, quickAddQuantity, quickAddPricingType, orderItems, toast, getProductPrice])

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          quickAddRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch products and pre-order data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // First fetch the pre-order to get priceListId and store info
        const [res, categoriesData] = await Promise.all([
          getSinglePreOrderAPI(id, token),
          fetchCategoriesAPI()
        ])
        
        // Set store's price category
        const storeCategory = res?.store?.priceCategory || "aPrice"
        setStorePriceCategory(storeCategory as PriceCategory)
        
        // Check if preorder has a price list linked
        let formattedProducts: ProductType[] = []
        
        if (res?.priceListId && res.priceListId.products && res.priceListId.products.length > 0) {
          // Use products from the linked price list - only first 10
          const priceListProducts = res.priceListId.products.slice(0, 10)
          formattedProducts = priceListProducts.map((p: any, index: number) => ({
            ...p,
            id: p.id || p._id,
            _id: p.id || p._id,
            shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
            salesMode: p.salesMode || "case",
            // Use price from price list based on store's category
            pricePerBox: p[storeCategory] || p.aPrice || p.pricePerBox || 0,
            price: p.price || 0,
            shippinCost: p.shippinCost || 0
          }))
          setHasMoreProducts(res.priceListId.products.length > 10)
        } else {
          // Fallback to search products from backend - only 10
          const productsData = await searchProductsForOrderAPI("", 10)
          formattedProducts = productsData.map((p: any, index: number) => ({
            ...p,
            id: p._id || p.id,
            shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
            salesMode: p.salesMode || "both",
            // Use price based on store's category
            pricePerBox: p[storeCategory] || p.aPrice || p.pricePerBox || 0
          }))
          setHasMoreProducts(productsData.length === 10)
        }
        
        setProducts(formattedProducts)
        setDisplayedProducts(formattedProducts)

        // Set categories from backend
        const categoryNames = categoriesData.map((c: any) => c.categoryName).filter(Boolean).sort()
        setCategories(categoryNames)
        
        setShippingAddress(res?.shippingAddress || {
          name: "", email: "", phone: "", address: "", city: "", postalCode: "", country: ""
        })
        setBillingAddress(res?.billingAddress || {
          name: "", email: "", phone: "", address: "", city: "", postalCode: "", country: ""
        })
        
        const formattedOrder = {
          id: res._id || "",
          _id: res._id,
          orderId: res._id,
          preOrderNumber: res.preOrderNumber,
          store: res.store,
          date: res.createdAt,
          items: res.items.map((item: any) => ({
            ...item,
            productName: item.name || item.productName,
            productId: item.id || item._id || item.productId,
            pricingType: item.pricingType || "box",
            shippinCost: item.shippinCost || 0,
          })),
          status: res.status,
          shippingAddress: res.shippingAddress,
          billingAddress: res.billingAddress,
          shipping: res.shippinCost || 0,
          total: res.total,
          confirmed: res.confirmed || false,
          linkedOrderId: res.orderId,
          priceListId: res.priceListId || null,
        }

        setOrder(formattedOrder)
        setOrderItems(formattedOrder.items)
       setOrderStatus(formattedOrder.status.toLowerCase())
        setOrderDate(formattedOrder.date ? new Date(formattedOrder.date).toISOString().split('T')[0] : "")
        setSameAsBilling(JSON.stringify(res?.shippingAddress) === JSON.stringify(res?.billingAddress))
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({ title: "Error", description: "Failed to load pre-order data", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id, token])

  // Search products from backend with debounce (or filter price list products locally)
  const handleProductSearchChange = useCallback(async (value: string) => {
    setProductSearch(value)
    setCurrentPage(1)
    
    // Clear previous timeout
    if (productSearchTimeoutRef.current) {
      clearTimeout(productSearchTimeoutRef.current)
    }
    
    // If preorder has a price list, filter locally
    if (order?.priceListId && order.priceListId.products && order.priceListId.products.length > 0) {
      const priceListProducts = order.priceListId.products
      const searchLower = value.toLowerCase()
      
      let filtered = priceListProducts
      if (value.trim()) {
        filtered = priceListProducts.filter((p: any) => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.shortCode?.toLowerCase().includes(searchLower)
        )
      }
      
      // Also filter by category if selected
      if (selectedCategory !== "all") {
        filtered = filtered.filter((p: any) => p.category === selectedCategory)
      }
      
      const formattedProducts: ProductType[] = filtered.map((p: any, index: number) => ({
        ...p,
        id: p.id || p._id,
        _id: p.id || p._id,
        shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
        salesMode: p.salesMode || "case",
        pricePerBox: p[storePriceCategory] || p.aPrice || p.pricePerBox || 0,
        price: p.price || 0,
        shippinCost: p.shippinCost || 0
      }))
      setProducts(formattedProducts)
      setDisplayedProducts(formattedProducts)
      setHasMoreProducts(false)
      return
    }
    
    // Fallback to backend search if no price list
    setHasMoreProducts(true)
    
    // Debounce search - wait 300ms after user stops typing
    productSearchTimeoutRef.current = setTimeout(async () => {
      setProductSearchLoading(true)
      try {
        const results = await searchProductsForOrderAPI(value, 10, selectedCategory === "all" ? "" : selectedCategory)
        const formattedProducts: ProductType[] = results.map((p: any, index: number) => ({
          ...p,
          id: p._id || p.id,
          shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
          salesMode: p.salesMode || "both"
        }))
        setProducts(formattedProducts)
        setDisplayedProducts(formattedProducts)
        setHasMoreProducts(results.length === 10)
      } catch (error) {
        console.error("Error searching products:", error)
      } finally {
        setProductSearchLoading(false)
      }
    }, 300)
  }, [selectedCategory, order, storePriceCategory])

  // Handle category change - filter price list products or fetch from backend
  const handleCategoryChange = useCallback(async (category: string) => {
    setSelectedCategory(category)
    setCurrentPage(1)
    
    // If preorder has a price list, filter locally
    if (order?.priceListId && order.priceListId.products && order.priceListId.products.length > 0) {
      const priceListProducts = order.priceListId.products
      const searchLower = productSearch.toLowerCase()
      
      let filtered = priceListProducts
      
      // Filter by search term
      if (productSearch.trim()) {
        filtered = filtered.filter((p: any) => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.shortCode?.toLowerCase().includes(searchLower)
        )
      }
      
      // Filter by category
      if (category !== "all") {
        filtered = filtered.filter((p: any) => p.category === category)
      }
      
      const formattedProducts: ProductType[] = filtered.map((p: any, index: number) => ({
        ...p,
        id: p.id || p._id,
        _id: p.id || p._id,
        shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
        salesMode: p.salesMode || "case",
        pricePerBox: p[storePriceCategory] || p.aPrice || p.pricePerBox || 0,
        price: p.price || 0,
        shippinCost: p.shippinCost || 0
      }))
      setProducts(formattedProducts)
      setDisplayedProducts(formattedProducts)
      setHasMoreProducts(false)
      return
    }
    
    // Fallback to backend search if no price list
    setHasMoreProducts(true)
    setProductSearchLoading(true)
    try {
      const results = await searchProductsForOrderAPI(productSearch, 10, category === "all" ? "" : category)
      const formattedProducts: ProductType[] = results.map((p: any, index: number) => ({
        ...p,
        id: p._id || p.id,
        shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
        salesMode: p.salesMode || "both"
      }))
      setProducts(formattedProducts)
      setDisplayedProducts(formattedProducts)
      setHasMoreProducts(results.length === 10)
    } catch (error) {
      console.error("Error fetching products by category:", error)
    } finally {
      setProductSearchLoading(false)
    }
  }, [productSearch, order, storePriceCategory])

  // Filter products - now just returns products from backend search
  const filteredProducts = products

  // Load more products from backend (infinite scroll) - only for non-price-list case
  const loadMoreProducts = useCallback(async () => {
    // If preorder has a price list, don't load more (all products already shown)
    if (order?.priceListId && order.priceListId.products && order.priceListId.products.length > 0) {
      return
    }
    
    if (loadingMoreProducts || !hasMoreProducts) return
    
    setLoadingMoreProducts(true)
    try {
      const skip = displayedProducts.length
      const results = await searchProductsForOrderAPI(
        productSearch, 
        10, 
        selectedCategory === "all" ? "" : selectedCategory,
        skip
      )
      
      if (results.length > 0) {
        const formattedProducts: ProductType[] = results.map((p: any, index: number) => ({
          ...p,
          id: p._id || p.id,
          shortCode: p.shortCode || String(skip + index + 1).padStart(2, '0'),
          salesMode: p.salesMode || "both"
        }))
        setDisplayedProducts(prev => [...prev, ...formattedProducts])
        setCurrentPage(prev => prev + 1)
      }
      
      // If less than 10 results, no more products available
      if (results.length < 10) {
        setHasMoreProducts(false)
      }
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoadingMoreProducts(false)
    }
  }, [loadingMoreProducts, hasMoreProducts, displayedProducts.length, productSearch, selectedCategory, order])

  // Handle scroll in product modal - load more on scroll
  const handleProductModalScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    
    // Load more when scrolled to bottom (with 100px threshold)
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (hasMoreProducts && !loadingMoreProducts) {
        loadMoreProducts()
      }
    }
  }, [hasMoreProducts, loadingMoreProducts, loadMoreProducts])

  const openProductModal = async () => {
    setShowProductModal(true)
    setProductSearch("")
    setSelectedCategory("all")
    setCurrentPage(1)
    
    // If preorder has a price list, show only price list products
    if (order?.priceListId && order.priceListId.products && order.priceListId.products.length > 0) {
      const priceListProducts = order.priceListId.products
      const formattedProducts: ProductType[] = priceListProducts.map((p: any, index: number) => ({
        ...p,
        id: p.id || p._id,
        _id: p.id || p._id,
        shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
        salesMode: p.salesMode || "case",
        pricePerBox: p[storePriceCategory] || p.aPrice || p.pricePerBox || 0,
        price: p.price || 0,
        shippinCost: p.shippinCost || 0
      }))
      setProducts(formattedProducts)
      setDisplayedProducts(formattedProducts)
      setHasMoreProducts(false) // Price list has fixed products, no more to load
    } else {
      // Fallback to search products from backend if no price list
      setHasMoreProducts(true)
      setProductSearchLoading(true)
      try {
        const results = await searchProductsForOrderAPI("", 10)
        const formattedProducts: ProductType[] = results.map((p: any, index: number) => ({
          ...p,
          id: p._id || p.id,
          shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
          salesMode: p.salesMode || "both"
        }))
        setProducts(formattedProducts)
        setDisplayedProducts(formattedProducts)
        setHasMoreProducts(results.length === 10)
      } catch (error) {
        console.error("Error fetching products:", error)
      } finally {
        setProductSearchLoading(false)
      }
    }
  }

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...orderItems]
    updated[index].quantity = Math.max(1, updated[index].quantity + delta)
    setOrderItems(updated)
  }

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const subtotal = useMemo(() => 
    orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  , [orderItems])

  const totalQuantity = useMemo(() => 
  orderItems.reduce((sum, item) => sum + item.quantity, 0)
, [orderItems])


  const shippingCost = order?.shipping || 0
  const total = subtotal + shippingCost

  const handleSubmit = async () => {
    if (!id) return
    if (orderItems.length === 0) {
      toast({ title: "Error", description: "Please add at least one product", variant: "destructive" })
      return
    }

    const requiredFields = ["name", "email", "phone", "address", "city", "postalCode", "country"]
    const checkEmptyFields = (address: any) => requiredFields.some((field) => !address?.[field])
    const billingInvalid = checkEmptyFields(billingAddress)
    const shippingInvalid = sameAsBilling ? false : checkEmptyFields(shippingAddress)

    if (billingInvalid || shippingInvalid) {
      toast({ title: "Incomplete Address", description: "Please fill all required address fields.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const finalData = {
        items: orderItems,
        billingAddress,
        shippingAddress: sameAsBilling ? billingAddress : shippingAddress,
        total,
        subtotal,
        status: orderStatus,
        date: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
        store: order?.store?.id || order?.store?._id || order?.store,
        shippinCost: shippingCost,
      }

      await updatePreOrderAPI(finalData, token, id)
      toast({ title: "Pre-Order Updated", description: `Pre-Order has been updated successfully` })
      navigate("/admin/pre-orders")
    } catch (error) {
      console.error("Error updating pre-order:", error)
      toast({ title: "Error", description: "Failed to update pre-order", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmPreOrder = async () => {
    if (!id) return
    if (orderItems.length === 0) {
      toast({ title: "Error", description: "Please add at least one product", variant: "destructive" })
      return
    }

    setConfirming(true)
    try {
      // Directly confirm without updating - just call confirm API
      const confirmResponse = await confirmPreOrderAPI(token, id)
      
      if (confirmResponse) {
        // Show pallet info if available
        const palletInfo = confirmResponse.palletInfo
        let description = `Pre-Order has been confirmed and converted to a regular order`
        if (palletInfo && palletInfo.totalPallets > 0) {
          description += ` | Pallets: ${palletInfo.totalPallets} | Boxes: ${palletInfo.totalBoxes}`
        }
        toast({ title: "Pre-Order Confirmed!", description })
        navigate("/admin/orders")
      }
    } catch (error) {
      console.error("Error confirming pre-order:", error)
      toast({ title: "Error", description: "Failed to confirm pre-order", variant: "destructive" })
    } finally {
      setConfirming(false)
    }
  }

  const handleCancel = () => navigate("/admin/pre-orders")

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-6xl mx-auto p-4 md:p-6">
              <Card>
                <CardContent className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500 opacity-50" />
                  <h2 className="text-xl font-medium text-red-600 mb-2">Pre-Order not found</h2>
                  <Button onClick={handleCancel}><ArrowLeft className="h-4 w-4 mr-2" />Back to Pre-Orders</Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-6xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={handleCancel}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Edit3 className="h-6 w-6" />
                    Edit Pre-Order {order.preOrderNumber}
                  </h1>
                  <p className="text-sm text-muted-foreground">Update pre-order details and products</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(order.date).toLocaleDateString()}
                </Badge>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pre-Order</Badge>
                {order.priceListId && (
                  <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200">
                    <FileText className="h-3 w-3 mr-1" />
                    {order.priceListId.name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-4">
                {/* Store Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Store Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="font-semibold text-orange-900">{order.store?.storeName || 'Store Name'}</div>
                      <div className="text-sm text-orange-700 space-y-0.5 mt-1">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {order.store?.ownerName || 'Owner Name'}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {billingAddress?.address || 'Address'}, {billingAddress?.city || 'City'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {billingAddress?.phone || 'Phone'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Add Section */}
                

                {/* Products Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Pre-Order Items ({orderItems.length})
                      </CardTitle>
                      <Button size="sm" onClick={openProductModal} className="bg-orange-600 hover:bg-orange-700">
                        <Plus className="h-4 w-4 mr-1" /> Add Product
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {orderItems.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>No products added yet</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={openProductModal}>
                          <Plus className="h-4 w-4 mr-1" /> Add First Product
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orderItems.map((item, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {item.shortCode && (
                                <Badge variant="outline" className="font-mono text-xs bg-orange-100 text-orange-700 shrink-0">
                                  #{item.shortCode}
                                </Badge>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{item.productName}</div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {item.pricingType === "box" ? "Per Box" : "Per Unit"}
                                  </Badge>
                                  <span>@ ${item.unitPrice.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(index, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...orderItems]
                                  updated[index].quantity = Math.max(1, parseInt(e.target.value) || 1)
                                  setOrderItems(updated)
                                }}
                                className="w-16 h-8 text-center"
                              />
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(index, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            <div className="w-24 text-right font-medium">
                              ${(item.quantity * item.unitPrice).toFixed(2)}
                            </div>

                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeItem(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        
                        <Button variant="outline" className="w-full border-dashed border-2 hover:border-orange-400 hover:bg-orange-50" onClick={openProductModal}>
                          <Plus className="h-4 w-4 mr-2" /> Add Another Product
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Address Section */}
                <Card>
                  <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowAddressSection(!showAddressSection)}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Address Details
                        {billingAddress.name && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </CardTitle>
                      {showAddressSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </CardHeader>
                  
                  {showAddressSection && (
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Name</label>
                          <Input value={billingAddress.name} onChange={(e) => setBillingAddress({...billingAddress, name: e.target.value})} placeholder="Full name" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Phone</label>
                          <Input value={billingAddress.phone} onChange={(e) => setBillingAddress({...billingAddress, phone: e.target.value})} placeholder="Phone number" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Email</label>
                          <Input value={billingAddress.email} onChange={(e) => setBillingAddress({...billingAddress, email: e.target.value})} placeholder="Email address" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Address</label>
                          <Input value={billingAddress.address} onChange={(e) => setBillingAddress({...billingAddress, address: e.target.value})} placeholder="Street address" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">City</label>
                          <Input value={billingAddress.city} onChange={(e) => setBillingAddress({...billingAddress, city: e.target.value})} placeholder="City" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">State</label>
                          <Input value={billingAddress.country} onChange={(e) => setBillingAddress({...billingAddress, country: e.target.value})} placeholder="State" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Postal Code</label>
                          <Input value={billingAddress.postalCode} onChange={(e) => setBillingAddress({...billingAddress, postalCode: e.target.value})} placeholder="Postal code" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox checked={sameAsBilling} onCheckedChange={(checked) => setSameAsBilling(checked as boolean)} />
                        <label className="text-sm">Shipping address same as billing</label>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>

              {/* Right Column - Order Summary */}
              <div className="space-y-4">
                <Card className="sticky top-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Pre-Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <Select value={orderStatus} onValueChange={setOrderStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Order Date</label>
                        <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Pre-Order Number</label>
                        <Input value={order.preOrderNumber || order.orderId} disabled className="bg-gray-50" />
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal ({orderItems.length} items) QT - {totalQuantity}</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>${shippingCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total</span>
                        <span className="text-orange-600">${total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Confirm Pre-Order Button */}
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400" 
                      size="lg" 
                      onClick={handleConfirmPreOrder} 
                      disabled={confirming || submitting || orderItems.length === 0 || order?.confirmed}
                    >
                      {confirming ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirming...</>
                      ) : order?.confirmed ? (
                        <><CheckCircle2 className="h-4 w-4 mr-2" />Already Confirmed</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" />Confirm & Create Order</>
                      )}
                    </Button>

                    <Button className="w-full bg-orange-600 hover:bg-orange-700" size="lg" onClick={handleSubmit} disabled={submitting || confirming || orderItems.length === 0 || order?.confirmed}>
                      {submitting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>
                      ) : (
                        <><CheckCircle2 className="h-4 w-4 mr-2" />Update Pre-Order</>
                      )}
                    </Button>

                    <Button variant="outline" className="w-full" onClick={handleCancel} disabled={submitting || confirming}>
                      <ArrowLeft className="h-4 w-4 mr-2" />Cancel
                    </Button>

                    {order?.confirmed && order?.linkedOrderId && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                        <p className="text-sm text-green-700 font-medium">✓ This pre-order has been confirmed</p>
                        <Button 
                          variant="link" 
                          className="text-green-600 p-0 h-auto text-sm"
                          onClick={() => navigate(`/admin/orders`)}
                        >
                          View Order →
                        </Button>
                      </div>
                    )}

                    {orderItems.length === 0 && (
                      <div className="text-xs text-center text-muted-foreground">
                        <p>• Add at least one product to update</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Product Selection Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Add Product</span>
              <Badge variant="outline" className="text-xs">
                {displayedProducts.length} products {hasMoreProducts && "(scroll for more)"}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search products..." value={productSearch} onChange={(e) => handleProductSearchChange(e.target.value)} className="pl-9" autoFocus />
                {productSearchLoading && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="w-52">
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-10">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="All Categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span>All Categories</span>
                      </div>
                    </SelectItem>
                    {categories.map(cat => {
                      return (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center justify-between w-full">
                            <span>{cat}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(selectedCategory !== "all" || productSearch) && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Showing {displayedProducts.length} products</span>
                {selectedCategory !== "all" && <Badge variant="outline" className="text-xs">{selectedCategory}</Badge>}
                {productSearch && <Badge variant="outline" className="text-xs">"{productSearch}"</Badge>}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto mt-4" onScroll={handleProductModalScroll}>
            <div className="grid grid-cols-1 gap-2">
              {displayedProducts.map((product, index) => {
                const shortCode = product.shortCode || String(index + 1).padStart(2, '0')
                const salesMode = product.salesMode || "both"
                const showBoxButton = salesMode === "case" || salesMode === "both"
                const showUnitButton = salesMode === "unit" || salesMode === "both"
                const boxPrice = getProductPrice(product, "box")
                const unitPrice = getProductPrice(product, "unit")
                
                return (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 group">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className="font-mono text-xs bg-gray-100 min-w-[40px] justify-center">#{shortCode}</Badge>
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {product.name}
                          <Badge variant="secondary" className={cn(
                            "text-[10px] px-1.5",
                            salesMode === "unit" && "bg-blue-100 text-blue-700",
                            salesMode === "case" && "bg-green-100 text-green-700",
                            salesMode === "both" && "bg-purple-100 text-purple-700"
                          )}>
                            {salesMode === "unit" ? "Unit Only" : salesMode === "case" ? "Case Only" : "Both"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          {showBoxButton && <span>Box: ${boxPrice?.toFixed(2)}</span>}
                          {showBoxButton && showUnitButton && <span>|</span>}
                          {showUnitButton && <span>Unit: ${unitPrice?.toFixed(2)}</span>}
                          {product.category && (
                            <>
                              <span className="text-gray-300">•</span>
                              <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedProductForAdd({ ...product, shortCode })
                        setAddQuantity(1)
                        setAddPricingType(showBoxButton ? "box" : "unit")
                      }} className="hover:bg-orange-50 hover:border-orange-400">
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                )
              })}
              
              {/* Loading more products indicator */}
              {loadingMoreProducts && (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 mx-auto animate-spin text-orange-600" />
                  <p className="text-sm text-muted-foreground mt-2">Loading more products...</p>
                </div>
              )}
              
              {filteredProducts.length === 0 && !productSearchLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No products found</p>
                  <p className="text-sm">Try a different search term or category</p>
                </div>
              )}
              
              {/* All products loaded */}
              {displayedProducts.length > 0 && !hasMoreProducts && !loadingMoreProducts && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All products loaded ({displayedProducts.length} total)</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Add Product Button */}
      <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform bg-orange-600 hover:bg-orange-700" onClick={openProductModal}>
        <Plus className="h-6 w-6" />
      </Button>

      {/* Product Quantity Selection Dialog */}
      <Dialog open={!!selectedProductForAdd} onOpenChange={(open) => !open && setSelectedProductForAdd(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product to Pre-Order</DialogTitle>
          </DialogHeader>
          
          {selectedProductForAdd && (() => {
            const salesMode = selectedProductForAdd.salesMode || "both"
            const showBoxOption = salesMode === "case" || salesMode === "both"
            const showUnitOption = salesMode === "unit" || salesMode === "both"
            const boxPrice = getProductPrice(selectedProductForAdd, "box")
            const unitPrice = getProductPrice(selectedProductForAdd, "unit")
            const currentPrice = addPricingType === "box" ? boxPrice : unitPrice
            
            return (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {selectedProductForAdd.shortCode && (
                      <Badge variant="outline" className="font-mono text-xs bg-orange-100 text-orange-700">#{selectedProductForAdd.shortCode}</Badge>
                    )}
                    <span className="font-medium">{selectedProductForAdd.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {showBoxOption && <span>Box: ${boxPrice?.toFixed(2)}</span>}
                    {/* {showBoxOption && showUnitOption && <span> | </span>}
                    {showUnitOption && <span>Unit: ${unitPrice?.toFixed(2)}</span>} */}
                  </div>
                </div>

                {salesMode === "both" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant={addPricingType === "box" ? "default" : "outline"} className={cn("h-12", addPricingType === "box" && "bg-blue-600 hover:bg-blue-700")} onClick={() => setAddPricingType("box")}>
                        <Package className="h-4 w-4 mr-2" />Case/Box
                      </Button>
                      {/* <Button type="button" variant={addPricingType === "unit" ? "default" : "outline"} className={cn("h-12", addPricingType === "unit" && "bg-green-600 hover:bg-green-700")} onClick={() => setAddPricingType("unit")}>
                        <DollarSign className="h-4 w-4 mr-2" />Unit
                      </Button> */}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity (min: 1)</label>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))} disabled={addQuantity <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input type="number" min={1} value={addQuantity} onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-24 text-center text-lg font-medium" />
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => setAddQuantity(addQuantity + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{addQuantity} × ${currentPrice?.toFixed(2)} ({addPricingType === "box" ? "per box" : "per unit"})</span>
                    <span className="text-lg font-bold text-orange-600">${(addQuantity * (currentPrice || 0)).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedProductForAdd(null)}>Cancel</Button>
                  <Button type="button" className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={() => {
                    const existingIndex = orderItems.findIndex(item => item.productId === selectedProductForAdd.id && item.pricingType === addPricingType)
                    
                    if (existingIndex >= 0) {
                      const updated = [...orderItems]
                      updated[existingIndex].quantity += addQuantity
                      setOrderItems(updated)
                    } else {
                      setOrderItems([...orderItems, {
                        productId: selectedProductForAdd.id,
                        productName: selectedProductForAdd.name,
                        quantity: addQuantity,
                        unitPrice: currentPrice || 0,
                        pricingType: addPricingType,
                        shippinCost: selectedProductForAdd.shippinCost || 0,
                        shortCode: selectedProductForAdd.shortCode
                      }])
                    }
                    
                    setRecentlyAddedProducts(prev => {
                      const filtered = prev.filter(p => p.id !== selectedProductForAdd.id)
                      return [selectedProductForAdd, ...filtered].slice(0, 10)
                    })
                    
                    toast({ title: "Added!", description: `${addQuantity} ${addPricingType === "box" ? "box(es)" : "unit(s)"} of ${selectedProductForAdd.name}` })
                    setSelectedProductForAdd(null)
                    setAddQuantity(1)
                  }}>
                    <Plus className="h-4 w-4 mr-2" />Add to Pre-Order
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UpdatePreOrder
