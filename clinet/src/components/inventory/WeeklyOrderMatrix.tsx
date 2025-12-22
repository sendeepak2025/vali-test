"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  RefreshCw,
  Search,
  Calendar,
  Package,
  Store,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Save,
  Eye,
  EyeOff,
  Edit3,
  Check,
  MapPin,
  Filter,
} from "lucide-react";
import { getAllStoresAPI } from "@/services2/operations/auth";
import { toast } from "react-toastify";
import { assignProductToStoreAPI } from "@/services2/operations/order";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

interface WeeklyOrderMatrixProps {
  products: any[];
  onRefresh?: () => void;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Debounce hook
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// Editable Cell Component for performance
const EditableCell = React.memo(({ 
  value, 
  onChange, 
  productId, 
  storeId,
  isHighlighted 
}: { 
  value: number; 
  onChange: (productId: string, storeId: string, value: number) => void;
  productId: string;
  storeId: string;
  isHighlighted: boolean;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(productId, storeId, localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      handleBlur();
    }
  };

  return (
    <td 
      className={`p-0 text-center border cursor-pointer transition-colors ${
        isHighlighted ? 'bg-yellow-100' : ''
      } ${localValue > 0 ? 'bg-green-50' : ''}`}
      onClick={() => {
        setIsEditing(true);
        setTimeout(() => inputRef.current?.select(), 0);
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          min="0"
          value={localValue}
          onChange={(e) => setLocalValue(parseInt(e.target.value) || 0)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full h-full p-1 text-center text-xs border-2 border-blue-500 focus:outline-none"
        />
      ) : (
        <span className={`block p-1 text-xs ${localValue > 0 ? 'font-bold text-green-700' : 'text-gray-400'}`}>
          {localValue}
        </span>
      )}
    </td>
  );
});

EditableCell.displayName = 'EditableCell';


const WeeklyOrderMatrix: React.FC<WeeklyOrderMatrixProps> = ({ products, onRefresh }) => {
  const token = useSelector((state: RootState) => state.auth?.token ?? null);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    return DAYS_OF_WEEK[today === 0 ? 6 : today - 1];
  });
  const [weekOffset, setWeekOffset] = useState(0);
  
  // Smart filtering - show only stores with orders by default
  const [showOnlyWithOrders, setShowOnlyWithOrders] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("all");
  
  // Store visibility for pagination
  const [visibleStoreRange, setVisibleStoreRange] = useState({ start: 0, end: 20 });
  const [showAllStores, setShowAllStores] = useState(false);
  
  // All editable data
  const [editableData, setEditableData] = useState<Map<string, {
    storeOrders: Record<string, number>;
    requirement: number;
    purchaseTotal: number;
  }>>(new Map());
  
  // Track changes for saving
  const [changedCells, setChangedCells] = useState<Set<string>>(new Set());
  
  // Row virtualization
  const [visibleRowRange, setVisibleRowRange] = useState({ start: 0, end: 50 });
  const containerRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 40;

  const getWeekDates = useCallback((offset: number = 0) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + (offset * 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday,
      end: sunday,
      label: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    };
  }, []);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset, getWeekDates]);


  // Get unique states from stores
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    stores.forEach((store) => {
      if (store.state) states.add(store.state);
      else if (store.city) states.add(store.city);
    });
    return Array.from(states).sort();
  }, [stores]);

  useEffect(() => {
    fetchStores();
  }, []);

  // Initialize editable data when products/stores load
  useEffect(() => {
    if (products.length > 0 && stores.length > 0) {
      const initialData = new Map();
      products.forEach((product) => {
        const productId = product._id || product.id;
        const storeOrders: Record<string, number> = {};
        stores.forEach((store) => {
          storeOrders[store._id] = 0;
        });
        initialData.set(productId, {
          storeOrders,
          requirement: 0,
          purchaseTotal: 0,
        });
      });
      setEditableData(initialData);
    }
  }, [products, stores]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const response = await getAllStoresAPI();
      if (response && Array.isArray(response)) {
        setStores(response);
        setVisibleStoreRange({ start: 0, end: Math.min(20, response.length) });
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error("Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!debouncedSearch) return products;
    const searchLower = debouncedSearch.toLowerCase();
    return products.filter((p) => p.name?.toLowerCase().includes(searchLower));
  }, [products, debouncedSearch]);


  // Smart store filtering - by state and by orders
  const filteredStores = useMemo(() => {
    let result = stores;
    
    // Filter by state
    if (selectedState !== "all") {
      result = result.filter((store) => 
        store.state === selectedState || store.city === selectedState
      );
    }
    
    // Filter to show only stores with orders
    if (showOnlyWithOrders) {
      const storesWithOrders = new Set<string>();
      editableData.forEach((data) => {
        Object.entries(data.storeOrders).forEach(([storeId, qty]) => {
          if (qty > 0) storesWithOrders.add(storeId);
        });
      });
      // Also include stores with changes
      changedCells.forEach((cellKey) => {
        const [, storeId] = cellKey.split('-');
        if (storeId && storeId !== 'requirement' && storeId !== 'purchaseTotal') {
          storesWithOrders.add(storeId);
        }
      });
      result = result.filter((store) => storesWithOrders.has(store._id));
    }
    
    return result;
  }, [stores, selectedState, showOnlyWithOrders, editableData, changedCells]);

  // Visible stores based on pagination
  const visibleStores = useMemo(() => {
    if (showAllStores) return filteredStores;
    return filteredStores.slice(visibleStoreRange.start, visibleStoreRange.end);
  }, [filteredStores, visibleStoreRange, showAllStores]);

  // Handle store order change
  const handleStoreOrderChange = useCallback((productId: string, storeId: string, value: number) => {
    setEditableData((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(productId) || { storeOrders: {}, requirement: 0, purchaseTotal: 0 };
      const newStoreOrders = { ...existing.storeOrders, [storeId]: value };
      
      const orderTotal = Object.values(newStoreOrders).reduce((sum, qty) => sum + (qty || 0), 0);
      const product = products.find(p => (p._id || p.id) === productId);
      const currentStock = product?.summary?.totalRemaining || 0;
      const requirement = Math.max(0, orderTotal - currentStock);
      
      newMap.set(productId, { 
        ...existing, 
        storeOrders: newStoreOrders,
        requirement: requirement,
      });
      return newMap;
    });
    setChangedCells((prev) => new Set(prev).add(`${productId}-${storeId}`));
  }, [products]);

  const handleFieldChange = useCallback((productId: string, field: 'requirement' | 'purchaseTotal', value: number) => {
    setEditableData((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(productId) || { storeOrders: {}, requirement: 0, purchaseTotal: 0 };
      newMap.set(productId, { ...existing, [field]: value });
      return newMap;
    });
    setChangedCells((prev) => new Set(prev).add(`${productId}-${field}`));
  }, []);


  // Save all changes to real orders
  const handleSaveAll = async () => {
    if (changedCells.size === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const storeChanges: Record<string, { productId: string; quantity: number }[]> = {};
      
      for (const cellKey of changedCells) {
        const [productId, storeId] = cellKey.split('-');
        if (storeId && storeId !== 'requirement' && storeId !== 'purchaseTotal') {
          const data = editableData.get(productId);
          const quantity = data?.storeOrders[storeId] || 0;
          
          if (quantity > 0) {
            if (!storeChanges[storeId]) storeChanges[storeId] = [];
            storeChanges[storeId].push({ productId, quantity });
          }
        }
      }

      for (const [storeId, items] of Object.entries(storeChanges)) {
        for (const item of items) {
          try {
            await assignProductToStoreAPI({
              productId: item.productId,
              storeId: storeId,
              quantity: item.quantity,
            }, token);
            successCount++;
          } catch (error) {
            console.error(`Error assigning product ${item.productId} to store ${storeId}:`, error);
            errorCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully saved ${successCount} order items`);
        setChangedCells(new Set());
        onRefresh?.();
      }
      if (errorCount > 0) {
        toast.error(`Failed to save ${errorCount} items`);
      }
    } catch (error) {
      console.error("Error saving orders:", error);
      toast.error("Failed to save orders");
    } finally {
      setSaving(false);
    }
  };


  // Build matrix data
  const matrixData = useMemo(() => {
    return filteredProducts.map((product) => {
      const productId = product._id || product.id;
      const currentStock = product.summary?.totalRemaining || 0;
      const editData = editableData.get(productId);
      
      const storeOrders = editData?.storeOrders || {};
      const orderTotal = Object.values(storeOrders).reduce((sum: number, qty: any) => sum + (qty || 0), 0);
      const requirement = editData?.requirement ?? Math.max(0, orderTotal - currentStock);
      const purchaseTotal = editData?.purchaseTotal ?? 0;
      
      return {
        productId,
        productName: product.name,
        image: product.image,
        storeOrders,
        orderTotal,
        currentStock,
        requirement,
        purchaseTotal,
      };
    });
  }, [filteredProducts, editableData]);

  const virtualizedRows = useMemo(() => {
    return matrixData.slice(visibleRowRange.start, visibleRowRange.end);
  }, [matrixData, visibleRowRange]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const start = Math.floor(scrollTop / ROW_HEIGHT);
    const end = Math.min(start + 50, matrixData.length);
    if (start !== visibleRowRange.start) {
      setVisibleRowRange({ start, end });
    }
  }, [matrixData.length, visibleRowRange.start]);

  const handleStoreNavigation = useCallback((direction: 'prev' | 'next') => {
    const step = 15;
    setVisibleStoreRange((prev) => {
      if (direction === 'prev') {
        const newStart = Math.max(0, prev.start - step);
        return { start: newStart, end: newStart + 20 };
      } else {
        const newStart = Math.min(filteredStores.length - 20, prev.start + step);
        return { start: Math.max(0, newStart), end: Math.min(filteredStores.length, newStart + 20) };
      }
    });
  }, [filteredStores.length]);


  const handleExport = useCallback(() => {
    const exportStores = filteredStores;
    const headers = [
      "PRODUCTS",
      ...exportStores.map((s) => s.storeName || `Store`),
      "ORDER TOTAL",
      "STOCK",
      "REQUIREMENT",
      "PURCHASE",
      "STATUS",
    ];
    const csvData = matrixData.map((row) => [
      row.productName,
      ...exportStores.map((s) => row.storeOrders[s._id] || 0),
      row.orderTotal,
      row.currentStock,
      row.requirement,
      row.purchaseTotal,
      "",
    ]);
    const csvContent = [headers.join(","), ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `order_matrix_${weekDates.label.replace(/\s/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exported!");
  }, [filteredStores, matrixData, selectedDay, weekDates.label]);

  const totals = useMemo(() => ({
    orderTotal: matrixData.reduce((sum, row) => sum + row.orderTotal, 0),
    requirement: matrixData.reduce((sum, row) => sum + row.requirement, 0),
    purchaseTotal: matrixData.reduce((sum, row) => sum + row.purchaseTotal, 0),
    currentStock: matrixData.reduce((sum, row) => sum + row.currentStock, 0),
  }), [matrixData]);

  // Count stores with orders
  const storesWithOrdersCount = useMemo(() => {
    const storesWithOrders = new Set<string>();
    editableData.forEach((data) => {
      Object.entries(data.storeOrders).forEach(([storeId, qty]) => {
        if (qty > 0) storesWithOrders.add(storeId);
      });
    });
    changedCells.forEach((cellKey) => {
      const [, storeId] = cellKey.split('-');
      if (storeId && storeId !== 'requirement' && storeId !== 'purchaseTotal') {
        const productId = cellKey.split('-')[0];
        const data = editableData.get(productId);
        if (data?.storeOrders[storeId] > 0) storesWithOrders.add(storeId);
      }
    });
    return storesWithOrders.size;
  }, [editableData, changedCells]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading stores...</span>
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Weekly Order Matrix</CardTitle>
              <Badge variant="outline">{filteredStores.length} Stores</Badge>
              <Badge variant="outline">{filteredProducts.length} Products</Badge>
              {changedCells.size > 0 && (
                <Badge className="bg-orange-500">{changedCells.size} unsaved</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setWeekOffset((prev) => prev - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={weekOffset.toString()} onValueChange={(val) => setWeekOffset(parseInt(val))}>
                <SelectTrigger className="w-[220px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue>{weekDates.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">This Week</SelectItem>
                  <SelectItem value="-1">Last Week</SelectItem>
                  <SelectItem value="-2">2 Weeks Ago</SelectItem>
                  <SelectItem value="-3">3 Weeks Ago</SelectItem>
                  <SelectItem value="-4">4 Weeks Ago</SelectItem>
                  <SelectItem value="1">Next Week</SelectItem>
                  <SelectItem value="2">2 Weeks Ahead</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset((prev) => prev + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters Row */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            
            {/* State Filter */}
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-[150px]">
                <MapPin className="h-4 w-4 mr-1" />
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {availableStates.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Smart Filter - Only With Orders */}
            <Button 
              variant={showOnlyWithOrders ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowOnlyWithOrders(!showOnlyWithOrders)}
              className={showOnlyWithOrders ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Filter className="h-4 w-4 mr-1" />
              {showOnlyWithOrders ? `With Orders (${storesWithOrdersCount})` : "Only With Orders"}
            </Button>
            
            {/* Show All Stores Toggle */}
            <Button variant={showAllStores ? "default" : "outline"} size="sm" onClick={() => setShowAllStores(!showAllStores)}>
              {showAllStores ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showAllStores ? "Paginate" : `All ${filteredStores.length}`}
            </Button>
            
            {changedCells.size > 0 && (
              <Button onClick={handleSaveAll} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save to Orders
              </Button>
            )}
            <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export</Button>
            <Button variant="outline" onClick={fetchStores}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-1 text-blue-700 text-xs"><Store className="h-3 w-3" />Stores</div>
              <div className="text-lg font-bold text-blue-900">{filteredStores.length} <span className="text-xs font-normal">/ {stores.length}</span></div>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <div className="flex items-center gap-1 text-green-700 text-xs"><ShoppingCart className="h-3 w-3" />Order Total</div>
              <div className="text-lg font-bold text-green-900">{totals.orderTotal.toLocaleString()}</div>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <div className="flex items-center gap-1 text-gray-700 text-xs"><Package className="h-3 w-3" />Stock</div>
              <div className="text-lg font-bold text-gray-900">{totals.currentStock.toLocaleString()}</div>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-1 text-yellow-700 text-xs"><AlertTriangle className="h-3 w-3" />Requirement</div>
              <div className="text-lg font-bold text-yellow-900">{totals.requirement.toLocaleString()}</div>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-1 text-purple-700 text-xs"><Truck className="h-3 w-3" />Purchase</div>
              <div className="text-lg font-bold text-purple-900">{totals.purchaseTotal.toLocaleString()}</div>
            </div>
          </div>


          {/* Store Navigation */}
          {!showAllStores && filteredStores.length > 20 && (
            <div className="flex items-center justify-center gap-2 mt-3 p-2 bg-gray-50 rounded">
              <Button variant="outline" size="sm" onClick={() => handleStoreNavigation('prev')} disabled={visibleStoreRange.start === 0}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-sm">Stores {visibleStoreRange.start + 1}-{Math.min(visibleStoreRange.end, filteredStores.length)} of {filteredStores.length}</span>
              <Button variant="outline" size="sm" onClick={() => handleStoreNavigation('next')} disabled={visibleStoreRange.end >= filteredStores.length}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matrix Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-2 bg-blue-50 border-b flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700">Click any cell to edit. Changes will be saved to real orders when you click "Save to Orders".</span>
          </div>
          <div ref={containerRef} className="overflow-auto max-h-[550px]" onScroll={handleScroll}>
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="bg-yellow-100">
                  <th className="sticky left-0 z-30 bg-yellow-100 p-2 text-left font-bold border min-w-[180px]">PRODUCT NAME</th>
                  {visibleStores.map((store) => (
                    <th key={store._id} className="p-1 text-center font-medium border bg-yellow-50 min-w-[70px]" title={`${store.storeName} - ${store.city || store.state || ''}`}>
                      <div className="truncate text-[10px]">{store.storeName?.substring(0, 10) || 'Store'}</div>
                      {store.state && <div className="text-[8px] text-gray-500">{store.state}</div>}
                    </th>
                  ))}
                  <th className="p-1 text-center font-bold border bg-cyan-100 min-w-[60px]">TOTAL</th>
                  <th className="p-1 text-center font-bold border bg-gray-200 min-w-[60px]">STOCK</th>
                  <th className="p-1 text-center font-bold border bg-green-100 min-w-[70px]">REQ</th>
                  <th className="p-1 text-center font-bold border bg-blue-100 min-w-[70px]">PURCHASE</th>
                  <th className="p-1 text-center font-bold border bg-orange-100 min-w-[60px]">STATUS</th>
                </tr>
              </thead>

              <tbody>
                {visibleRowRange.start > 0 && <tr style={{ height: visibleRowRange.start * ROW_HEIGHT }}><td colSpan={visibleStores.length + 6}></td></tr>}
                {virtualizedRows.length === 0 ? (
                  <tr><td colSpan={visibleStores.length + 6} className="text-center py-8 text-muted-foreground">No products found</td></tr>
                ) : (
                  virtualizedRows.map((row, idx) => {
                    const actualIdx = visibleRowRange.start + idx;
                    const diff = row.purchaseTotal - row.requirement;
                    return (
                      <tr key={row.productId} className={`${actualIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}`} style={{ height: ROW_HEIGHT }}>
                        <td className="sticky left-0 z-10 p-1 border font-medium bg-inherit">
                          <div className="flex items-center gap-1">
                            {row.image ? <img src={row.image} alt="" className="w-6 h-6 rounded object-cover" loading="lazy" /> : <Package className="h-4 w-4 text-gray-300" />}
                            <span className="truncate" title={row.productName}>{row.productName}</span>
                          </div>
                        </td>
                        {visibleStores.map((store) => (
                          <EditableCell
                            key={store._id}
                            value={row.storeOrders[store._id] || 0}
                            onChange={handleStoreOrderChange}
                            productId={row.productId}
                            storeId={store._id}
                            isHighlighted={changedCells.has(`${row.productId}-${store._id}`)}
                          />
                        ))}
                        <td className="p-1 text-center border bg-cyan-50 font-bold">{row.orderTotal}</td>
                        <td className="p-1 text-center border bg-gray-100">{row.currentStock}</td>
                        <td className="p-0 text-center border bg-green-50">
                          <input type="number" min="0" value={row.requirement} onChange={(e) => handleFieldChange(row.productId, 'requirement', parseInt(e.target.value) || 0)} className="w-full h-full p-1 text-center text-xs border-0 bg-transparent focus:ring-1 focus:ring-green-500" />
                        </td>
                        <td className="p-0 text-center border bg-blue-50">
                          <input type="number" min="0" value={row.purchaseTotal} onChange={(e) => handleFieldChange(row.productId, 'purchaseTotal', parseInt(e.target.value) || 0)} className="w-full h-full p-1 text-center text-xs border-0 bg-transparent focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="p-1 text-center border bg-orange-50">
                          {(row.purchaseTotal > 0 || row.requirement > 0) && (
                            <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${diff >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {diff >= 0 ? <Check className="h-3 w-3 inline" /> : diff}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
                {visibleRowRange.end < matrixData.length && <tr style={{ height: (matrixData.length - visibleRowRange.end) * ROW_HEIGHT }}><td colSpan={visibleStores.length + 6}></td></tr>}
              </tbody>

              <tfoot className="sticky bottom-0 z-20">
                <tr className="bg-gray-300 font-bold text-xs">
                  <td className="sticky left-0 z-30 bg-gray-300 p-1 border">TOTALS</td>
                  {visibleStores.map((store) => (
                    <td key={store._id} className="p-1 text-center border">{matrixData.reduce((sum, row) => sum + (row.storeOrders[store._id] || 0), 0)}</td>
                  ))}
                  <td className="p-1 text-center border bg-cyan-200">{totals.orderTotal}</td>
                  <td className="p-1 text-center border bg-gray-400">{totals.currentStock}</td>
                  <td className="p-1 text-center border bg-green-200">{totals.requirement}</td>
                  <td className="p-1 text-center border bg-blue-200">{totals.purchaseTotal}</td>
                  <td className="p-1 text-center border bg-orange-200"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="text-xs text-center text-muted-foreground">
        Click cells to edit • Yellow = changed • Green = has orders • Use filters to show stores by state or only with orders
      </div>
    </div>
  );
};

export default WeeklyOrderMatrix;
