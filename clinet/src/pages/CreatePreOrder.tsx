"use client"

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
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
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Zap,
  Hash,
  History,
  Keyboard,
} from "lucide-react"
import { searchProductsForOrderAPI, getProductByShortCodeAPI } from "@/services2/operations/product"
import { createPreOrderAPI } from "@/services2/operations/preOrder"
import { fetchCategoriesAPI } from "@/services2/operations/category"
import { searchStoresAPI } from "@/services2/operations/auth"
import { getAllPriceListAPI } from "@/services2/operations/priceList"
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
  zipCode: string
  state: string
}

interface StoreType {
  _id: string
  storeName: string
  ownerName: string
  email: string
  phone: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  priceCategory?: PriceCategory
}

interface PriceListType {
  id: string
  _id: string
  name: string
  status: string
  products: PriceListProduct[]
}

const CreatePreOrder = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  // Data states
  const [products, setProducts] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Store selection
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null)
  const [storeSearch, setStoreSearch] = useState("")
  const [storeSearchLoading, setStoreSearchLoading] = useState(false)
  const [showStoreDropdown, setShowStoreDropdown] = useState(false)
  const storeSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Price list (auto-loaded)
  const [selectedPriceList, setSelectedPriceList] = useState<PriceListType | null>(null)
  const [priceListLoading, setPriceListLoading] = useState(false)

  // Order data
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [orderStatus, setOrderStatus] = useState("pending")
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  
  // Price category from store
  const [storePriceCategory, setStorePriceCategory] = useState<PriceCategory>("aPrice")

  // Product modal states
  const [showProductModal, setShowProductModal] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [displayedProducts, setDisplayedProducts] = useState<ProductType[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [hasMoreProducts, setHasMoreProducts] = useState(true)
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false)
  const [productSearchLoading, setProductSearchLoading] = useState(false)

  // Address states
  const [billingAddress, setBillingAddress] = useState<AddressType>({
    name: "", email: "", phone: "", address: "", city: "", zipCode: "", state: ""
  })
  const [shippingAddress, setShippingAddress] = useState<AddressType>({
    name: "", email: "", phone: "", address: "", city: "", zipCode: "", state: ""
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
    
    const categoryPrice = product[storePriceCategory as keyof typeof product] as number | undefined
    
    if (categoryPrice && categoryPrice > 0) {
      return categoryPrice
    }
    
    return product.aPrice || product.pricePerBox || 0
  }, [storePriceCategory])

  // Fetch stores with debounce
  const handleStoreSearch = useCallback(async (value: string) => {
    setStoreSearch(value)
    
    if (storeSearchTimeoutRef.current) {
      clearTimeout(storeSearchTimeoutRef.current)
    }
    
    if (!value.trim()) {
      setStores([])
      return
    }
    
    storeSearchTimeoutRef.current = setTimeout(async () => {
      setStoreSearchLoading(true)
      try {
        const results = await searchStoresAPI(value, 10, 0)
        setStores(results)
        setShowStoreDropdown(true)
      } catch (error) {
        console.error("Error searching stores:", error)
      } finally {
        setStoreSearchLoading(false)
      }
    }, 300)
  }, [])

  // Select store and populate address
  const handleSelectStore = useCallback((store: StoreType) => {
    setSelectedStore(store)
    setStorePriceCategory(store.priceCategory || "aPrice")
    setShowStoreDropdown(false)
    setStoreSearch(store.storeName)
    
    // Populate billing address from store
    setBillingAddress({
      name: store.ownerName || store.storeName,
      email: store.email || "",
      phone: store.phone || "",
      address: store.address || "",
      city: store.city || "",
      zipCode: store.zipCode || "",
      state: store.state || ""
    })
    
    // Clear order items when store changes (prices may differ)
    setOrderItems([])
    
    toast({ title: "Store Selected", description: `${store.storeName} - Price Category: ${store.priceCategory || "aPrice"}` })
  }, [toast])

  // Fetch current active price list automatically
  const fetchPriceLists = useCallback(async () => {
    setPriceListLoading(true)
    try {
      // Get the most recent active price list (current week)
      const response = await getAllPriceListAPI("status=active&limit=1")
      if (response?.data && response.data.length > 0) {
        const activePriceList = response.data[0]
        setSelectedPriceList(activePriceList)
        
        // Load all products from the active price list
        if (activePriceList.products && activePriceList.products.length > 0) {
          const formattedProducts: ProductType[] = activePriceList.products.map((p: any, index: number) => ({
            ...p,
            id: p.id || p._id,
            _id: p.id || p._id,
            shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
            salesMode: p.salesMode || "case",
            pricePerBox: p.aPrice || p.pricePerBox || 0,
            price: p.price || 0,
            shippinCost: p.shippinCost || 0
          }))
          setProducts(formattedProducts)
          setDisplayedProducts(formattedProducts)
          setHasMoreProducts(false)
        }
      }
    } catch (error) {
      console.error("Error fetching price list:", error)
    } finally {
      setPriceListLoading(false)
    }
  }, [])

  // Update products when store price category changes
  useEffect(() => {
    if (selectedPriceList && selectedPriceList.products && selectedPriceList.products.length > 0) {
      const formattedProducts: ProductType[] = selectedPriceList.products.map((p: any, index: number) => ({
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
      
      // Only reset displayedProducts if there's no active search
      if (!productSearch.trim()) {
        setDisplayedProducts(formattedProducts)
      } else {
        // Re-apply the current search filter
        const filtered = formattedProducts.filter(p => 
          p.name.toLowerCase().includes(productSearch.toLowerCase())
        )
        setDisplayedProducts(filtered)
      }
    }
  }, [storePriceCategory, selectedPriceList, productSearch])

  // Handle quick add input change
  const handleQuickAddChange = useCallback((value: string) => {
    setQuickAddInput(value)
    
    if (quickAddSearchTimeoutRef.current) {
      clearTimeout(quickAddSearchTimeoutRef.current)
    }
    
    if (!value.trim()) {
      setQuickAddPreview(null)
      return
    }
    
    const parsed = parseQuickAddInput(value)
    
    quickAddSearchTimeoutRef.current = setTimeout(async () => {
      setQuickAddLoading(true)
      try {
        let product = null
        
        // First check in price list products if selected
        if (selectedPriceList && parsed) {
          product = products.find(p => p.shortCode === parsed.code)
          if (product) {
            product = { ...product, id: product._id || product.id }
          }
        }
        
        // If not found in price list, search from backend
        if (!product && parsed) {
          product = await getProductByShortCodeAPI(parsed.code)
          if (product) {
            product = { ...product, id: product._id || product.id, shortCode: product.shortCode || parsed.code }
          }
        }
        
        if (!product && value.trim()) {
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
  }, [parseQuickAddInput, selectedPriceList, products])

  // Handle quick add submit
  const handleQuickAddSubmit = useCallback(() => {
    if (!quickAddPreview) {
      toast({ title: "No product selected", description: "Enter a valid product code first", variant: "destructive" })
      return
    }
    
    if (!selectedStore) {
      toast({ title: "No store selected", description: "Please select a store first", variant: "destructive" })
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
  }, [quickAddPreview, quickAddQuantity, quickAddPricingType, orderItems, toast, getProductPrice, selectedStore])


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

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [categoriesData] = await Promise.all([
          fetchCategoriesAPI(),
          fetchPriceLists()
        ])
        
        const categoryNames = categoriesData.map((c: any) => c.categoryName).filter(Boolean).sort()
        setCategories(categoryNames)
        
        // Products are now loaded from fetchPriceLists if active price list exists
        // No need to fetch products separately
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({ title: "Error", description: "Failed to load initial data", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [fetchPriceLists, toast])

  // Search products from backend with debounce
  const handleProductSearchChange = useCallback(async (value: string) => {
    setProductSearch(value)
    setHasMoreProducts(true)
    
    if (productSearchTimeoutRef.current) {
      clearTimeout(productSearchTimeoutRef.current)
    }
    
    productSearchTimeoutRef.current = setTimeout(async () => {
      setProductSearchLoading(true)
      try {
        // If price list is selected, filter from price list products
        if (selectedPriceList && selectedPriceList.products) {
          // If search is empty, show all products from price list
          if (!value.trim()) {
            const allProducts = selectedPriceList.products.map((p: any, index: number) => ({
              ...p,
              id: p.id || p._id,
              _id: p.id || p._id,
              shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
              salesMode: p.salesMode || "case"
            }))
            setDisplayedProducts(allProducts as ProductType[])
          } else {
            const filtered = selectedPriceList.products.filter(p => 
              p.name.toLowerCase().includes(value.toLowerCase())
            ).map((p: any, index: number) => ({
              ...p,
              id: p.id || p._id,
              _id: p.id || p._id,
              shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
              salesMode: p.salesMode || "case"
            }))
            setDisplayedProducts(filtered as ProductType[])
          }
          setHasMoreProducts(false)
        } else {
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
        }
      } catch (error) {
        console.error("Error searching products:", error)
      } finally {
        setProductSearchLoading(false)
      }
    }, 300)
  }, [selectedCategory, selectedPriceList])

  // Handle category change
  const handleCategoryChange = useCallback(async (category: string) => {
    setSelectedCategory(category)
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
  }, [productSearch])

  // Load more products
  const loadMoreProducts = useCallback(async () => {
    if (loadingMoreProducts || !hasMoreProducts || selectedPriceList) return
    
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
      }
      
      if (results.length < 10) {
        setHasMoreProducts(false)
      }
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoadingMoreProducts(false)
    }
  }, [loadingMoreProducts, hasMoreProducts, displayedProducts.length, productSearch, selectedCategory, selectedPriceList])

  // Handle scroll in product modal
  const handleProductModalScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    
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
    setHasMoreProducts(true)
    
    if (selectedPriceList && selectedPriceList.products) {
      const formattedProducts: ProductType[] = selectedPriceList.products.map((p: any, index: number) => ({
        ...p,
        id: p.id || p._id,
        _id: p.id || p._id,
        shortCode: p.shortCode || String(index + 1).padStart(2, '0'),
        salesMode: p.salesMode || "case"
      }))
      setDisplayedProducts(formattedProducts)
      setHasMoreProducts(false)
    } else {
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

  const addProductToOrder = useCallback((product: ProductType, quantity: number, pricingType: "box" | "unit") => {
    if (!selectedStore) {
      toast({ title: "No store selected", description: "Please select a store first", variant: "destructive" })
      return
    }
    
    const salesMode = product.salesMode || "both"
    if (salesMode === "case" && pricingType === "unit") {
      toast({ title: "Not allowed", description: `${product.name} can only be sold by case/box`, variant: "destructive" })
      return
    }
    if (salesMode === "unit" && pricingType === "box") {
      toast({ title: "Not allowed", description: `${product.name} can only be sold by unit`, variant: "destructive" })
      return
    }
    
    const existingIndex = orderItems.findIndex(
      item => item.productId === product.id && item.pricingType === pricingType
    )
    
    const unitPrice = getProductPrice(product, pricingType)
    
    if (existingIndex >= 0) {
      const updated = [...orderItems]
      updated[existingIndex].quantity += quantity
      setOrderItems(updated)
    } else {
      setOrderItems([...orderItems, {
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        unitPrice: unitPrice,
        pricingType: pricingType,
        shippinCost: product.shippinCost || 0,
        shortCode: product.shortCode
      }])
    }
    
    setRecentlyAddedProducts(prev => {
      const filtered = prev.filter(p => p.id !== product.id)
      return [product, ...filtered].slice(0, 10)
    })
    
    toast({ title: "Added!", description: `${quantity} ${pricingType === 'box' ? 'box(es)' : 'unit(s)'} of ${product.name}` })
    setSelectedProductForAdd(null)
  }, [orderItems, toast, getProductPrice, selectedStore])

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

  const total = subtotal

  const totalQuantity = useMemo(() => 
  orderItems.reduce((sum, item) => sum + item.quantity, 0)
, [orderItems])

  

  const handleSubmit = async () => {
    if (!selectedStore) {
      toast({ title: "Error", description: "Please select a store", variant: "destructive" })
      return
    }
    
    if (orderItems.length === 0) {
      toast({ title: "Error", description: "Please add at least one product", variant: "destructive" })
      return
    }

    const requiredFields = ["name", "email", "phone", "address", "city", "zipCode", "state"]
    const checkEmptyFields = (address: any) => requiredFields.some((field) => !address?.[field])
    const billingInvalid = checkEmptyFields(billingAddress)
    const shippingInvalid = sameAsBilling ? false : checkEmptyFields(shippingAddress)

    if (billingInvalid || shippingInvalid) {
      toast({ title: "Incomplete Address", description: "Please fill all required address fields.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      // Map address fields to backend format (zipCode -> postalCode, state -> country)
      const mapAddressToBackend = (addr: AddressType) => ({
        name: addr.name,
        email: addr.email,
        phone: addr.phone,
        address: addr.address,
        city: addr.city,
        postalCode: addr.zipCode,
        country: addr.state
      })

      const finalData = {
        items: orderItems,
        billingAddress: mapAddressToBackend(billingAddress),
        shippingAddress: mapAddressToBackend(sameAsBilling ? billingAddress : shippingAddress),
        total,
        clientId: selectedStore._id,
        status: orderStatus,
        createdAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
        priceListId: selectedPriceList?._id || selectedPriceList?.id || null,
      }

      const result = await createPreOrderAPI(finalData, token)
      if (result) {
        toast({ title: "Pre-Order Created", description: `Pre-Order has been created successfully` })
        navigate("/admin/pre-orders")
      }
    } catch (error) {
      console.error("Error creating pre-order:", error)
      toast({ title: "Error", description: "Failed to create pre-order", variant: "destructive" })
    } finally {
      setSubmitting(false)
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
                    <Plus className="h-6 w-6" />
                    Create Pre-Order
                  </h1>
                  <p className="text-sm text-muted-foreground">Create a new pre-order for a store with current price list</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-4">
                {/* Store Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Select Store
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search store by name..."
                        value={storeSearch}
                        onChange={(e) => handleStoreSearch(e.target.value)}
                        onFocus={() => stores.length > 0 && setShowStoreDropdown(true)}
                        className="pl-9"
                      />
                      {storeSearchLoading && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      
                      {showStoreDropdown && stores.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                          {stores.map((store) => (
                            <div
                              key={store._id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => handleSelectStore(store)}
                            >
                              <div className="font-medium">{store.storeName}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <User className="h-3 w-3" /> {store.ownerName}
                                <span className="text-gray-300">•</span>
                                <Badge variant="outline" className="text-xs">{store.priceCategory || "aPrice"}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {selectedStore && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="font-semibold text-green-900">{selectedStore.storeName}</div>
                        <div className="text-sm text-green-700 space-y-0.5 mt-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {selectedStore.ownerName}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {selectedStore.address || 'N/A'}, {selectedStore.city || 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {selectedStore.phone || 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Price Category: <Badge variant="secondary" className="text-xs">{storePriceCategory}</Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Current Price List Info */}
                {selectedPriceList && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Current Price List:</span>
                      <span>{selectedPriceList.name}</span>
                      <Badge variant="secondary" className="text-xs">{selectedPriceList.products?.length || 0} products</Badge>
                    </div>
                  </div>
                )}

                {/* Quick Add Section */}
                

                {/* Price List Products - Show all products from current price list */}
                {selectedPriceList && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {selectedPriceList.name} Products ({displayedProducts.length})
                        </CardTitle>
                        <div className="relative w-64">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search products..."
                            value={productSearch}
                            onChange={(e) => handleProductSearchChange(e.target.value)}
                            className="pl-9 h-9"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[400px] overflow-y-auto space-y-2">
                        {displayedProducts.map((product, index) => {
                          const shortCode = product.shortCode || String(index + 1).padStart(2, '0')
                          const salesMode = product.salesMode || "both"
                          const showBoxButton = salesMode === "case" || salesMode === "both"
                          const showUnitButton = salesMode === "unit" || salesMode === "both"
                          const boxPrice = getProductPrice(product, "box")
                          const unitPrice = getProductPrice(product, "unit")
                          
                          // Check if product is already in order
                          const inOrder = orderItems.some(item => item.productId === product.id)
                          
                          return (
                            <div key={`${product.id}-${index}`} className={cn(
                              "flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 group",
                              inOrder && "bg-green-50 border-green-200"
                            )}>
                              <div className="flex items-center gap-3 flex-1">
                                <Badge variant="outline" className="font-mono text-xs bg-gray-100 min-w-[40px] justify-center">#{shortCode}</Badge>
                                <div className="flex-1">
                                  <div className="font-medium flex items-center gap-2">
                                    {product.name}
                                    {inOrder && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    {showBoxButton && <span>Box: ${boxPrice?.toFixed(2)}</span>}
                                    {showBoxButton && showUnitButton && <span>|</span>}
                                    {showUnitButton && <span>Unit: ${unitPrice?.toFixed(2)}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {showBoxButton && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => {
                                      if (!selectedStore) {
                                        toast({ title: "Select Store", description: "Please select a store first", variant: "destructive" })
                                        return
                                      }
                                      addProductToOrder({ ...product, shortCode }, 1, "box")
                                    }} 
                                    className="hover:bg-blue-50 hover:border-blue-400"
                                    disabled={!selectedStore}
                                  >
                                    <Package className="h-3 w-3 mr-1" />
                                    +1 Box
                                  </Button>
                                )}
                                {/* {showUnitButton && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => {
                                      if (!selectedStore) {
                                        toast({ title: "Select Store", description: "Please select a store first", variant: "destructive" })
                                        return
                                      }
                                      addProductToOrder({ ...product, shortCode }, 1, "unit")
                                    }} 
                                    className="hover:bg-green-50 hover:border-green-400"
                                    disabled={!selectedStore}
                                  >
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    +1 Unit
                                  </Button>
                                )} */}
                              </div>
                            </div>
                          )
                        })}
                        
                        {displayedProducts.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>{productSearch ? `No products found for "${productSearch}"` : "No products found"}</p>
                            {productSearch && (
                              <Button 
                                variant="link" 
                                size="sm" 
                                onClick={() => handleProductSearchChange("")}
                                className="mt-2"
                              >
                                Clear search
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Products Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Pre-Order Items ({orderItems.length})
                      </CardTitle>
                      <Button size="sm" onClick={openProductModal} className="bg-orange-600 hover:bg-orange-700" disabled={!selectedStore}>
                        <Plus className="h-4 w-4 mr-1" /> Add Product
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!selectedStore ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Store className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>Please select a store first</p>
                      </div>
                    ) : orderItems.length === 0 ? (
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
                          <Input value={billingAddress.name} onChange={(e) => setBillingAddress({...billingAddress, name: e.target.value})} placeholder="Full name"readOnly={sameAsBilling} className={sameAsBilling ? "bg-gray-100 cursor-not-allowed" : ""} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Phone</label>
                          <Input value={billingAddress.phone} onChange={(e) => setBillingAddress({...billingAddress, phone: e.target.value})} placeholder="Phone number"readOnly={sameAsBilling} className={sameAsBilling ? "bg-gray-100 cursor-not-allowed" : ""} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Email</label>
                          <Input value={billingAddress.email} onChange={(e) => setBillingAddress({...billingAddress, email: e.target.value})} placeholder="Email address"readOnly={sameAsBilling} className={sameAsBilling ? "bg-gray-100 cursor-not-allowed" : ""} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Address</label>
                          <Input value={billingAddress.address} onChange={(e) => setBillingAddress({...billingAddress, address: e.target.value})} placeholder="Street address"readOnly={sameAsBilling} className={sameAsBilling ? "bg-gray-100 cursor-not-allowed" : ""} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">City</label>
                          <Input value={billingAddress.city} onChange={(e) => setBillingAddress({...billingAddress, city: e.target.value})} placeholder="City" readOnly={sameAsBilling} className={sameAsBilling ? "bg-gray-100 cursor-not-allowed" : ""} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">State</label>
                          <Input value={billingAddress.state} onChange={(e) => setBillingAddress({...billingAddress, state: e.target.value})} placeholder="State" readOnly={sameAsBilling} className={sameAsBilling ? "bg-gray-100 cursor-not-allowed" : ""} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Postal Code</label>
                          <Input value={billingAddress.zipCode} onChange={(e) => setBillingAddress({...billingAddress, zipCode: e.target.value})} placeholder="Postal code" readOnly={sameAsBilling} className={sameAsBilling ? "bg-gray-100 cursor-not-allowed" : ""} />
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
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* <div>
                        <label className="text-sm font-medium">Order Date</label>
                        <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                      </div> */}

                      {selectedStore && (
                        <div>
                          <label className="text-sm font-medium">Store</label>
                          <Input value={selectedStore.storeName} disabled className="bg-gray-50" />
                        </div>
                      )}
                      
                      {selectedPriceList && (
                        <div>
                          <label className="text-sm font-medium">Price List</label>
                          <Input value={selectedPriceList.name} disabled className="bg-gray-50" />
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal ({orderItems.length} items) QT - {totalQuantity}</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total</span>
                        <span className="text-orange-600">${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-orange-600 hover:bg-orange-700" 
                      size="lg" 
                      onClick={handleSubmit} 
                      disabled={submitting || orderItems.length === 0 || !selectedStore}
                    >
                      {submitting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                      ) : (
                        <><CheckCircle2 className="h-4 w-4 mr-2" />Create Pre-Order</>
                      )}
                    </Button>

                    <Button variant="outline" className="w-full" onClick={handleCancel} disabled={submitting}>
                      <ArrowLeft className="h-4 w-4 mr-2" />Cancel
                    </Button>

                    {!selectedStore && (
                      <div className="text-xs text-center text-muted-foreground">
                        <p>• Select a store to start adding products</p>
                      </div>
                    )}
                    
                    {selectedStore && orderItems.length === 0 && (
                      <div className="text-xs text-center text-muted-foreground">
                        <p>• Add at least one product to create pre-order</p>
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

              {!selectedPriceList && (
                <div className="w-52">
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-10">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="All Categories" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {selectedPriceList && (
              <div className="text-xs text-blue-600 flex items-center gap-2">
                <FileText className="h-3 w-3" />
                <span>Showing products from: {selectedPriceList.name}</span>
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
                  <div key={`${product.id}-${index}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 group">
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
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                )
              })}
              
              {loadingMoreProducts && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {displayedProducts.length === 0 && !productSearchLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No products found</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Product Quantity Dialog */}
      <Dialog open={!!selectedProductForAdd} onOpenChange={(open) => !open && setSelectedProductForAdd(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          
          {selectedProductForAdd && (() => {
            const salesMode = selectedProductForAdd.salesMode || "both"
            const showBox = salesMode === "case" || salesMode === "both"
            const showUnit = salesMode === "unit" || salesMode === "both"
            const boxPrice = getProductPrice(selectedProductForAdd, "box")
            const unitPrice = getProductPrice(selectedProductForAdd, "unit")
            const currentPrice = addPricingType === "box" ? boxPrice : unitPrice
            
            return (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{selectedProductForAdd.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {showBox && <span>Box: ${boxPrice?.toFixed(2)}</span>}
                    {showBox && showUnit && <span> | </span>}
                    {showUnit && <span>Unit: ${unitPrice?.toFixed(2)}</span>}
                  </div>
                </div>
                
                {salesMode === "both" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Pricing Type</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={addPricingType === "box" ? "default" : "outline"}
                        className={cn("flex-1", addPricingType === "box" && "bg-blue-600 hover:bg-blue-700")}
                        onClick={() => setAddPricingType("box")}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Case (${boxPrice?.toFixed(2)})
                      </Button>
                      {/* <Button
                        type="button"
                        variant={addPricingType === "unit" ? "default" : "outline"}
                        className={cn("flex-1", addPricingType === "unit" && "bg-green-600 hover:bg-green-700")}
                        onClick={() => setAddPricingType("unit")}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Unit (${unitPrice?.toFixed(2)})
                      </Button> */}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity</label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))} disabled={addQuantity <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 text-center"
                    />
                    <Button variant="outline" size="icon" onClick={() => setAddQuantity(addQuantity + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold text-orange-600">${(addQuantity * (currentPrice || 0)).toFixed(2)}</span>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedProductForAdd(null)}>
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-orange-600 hover:bg-orange-700" 
                    onClick={() => addProductToOrder(selectedProductForAdd, addQuantity, addPricingType)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Order
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

export default CreatePreOrder
