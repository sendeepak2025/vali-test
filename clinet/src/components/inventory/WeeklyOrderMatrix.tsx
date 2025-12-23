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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Eye,
  EyeOff,
  Edit3,
  Check,
  MapPin,
  Filter,
  History,
  ClipboardList,
  CheckCircle2,
  Lock,
  FileText,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "react-toastify";
import { getOrderMatrixDataAPI, updateOrderMatrixItemAPI, updatePreOrderMatrixItemAPI } from "@/services2/operations/order";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { orderEvents } from "@/utils/orderEvents";

// Matrix operation modes
type MatrixMode = "ORDER" | "PREORDER" | "VIEW";

// Size presets
type SizePreset = "compact" | "normal" | "large";

interface WeeklyOrderMatrixProps {
  products: any[];
  onRefresh?: () => void;
}

// Size configurations
const sizeConfig = {
  compact: {
    cellPadding: "p-0.5",
    fontSize: "text-[10px]",
    headerFontSize: "text-[9px]",
    minWidth: "min-w-[40px]",
    maxWidth: "max-w-[50px]",
    productWidth: "min-w-[120px] max-w-[120px]",
    iconSize: "h-2 w-2",
    badgeSize: "text-[8px]",
  },
  normal: {
    cellPadding: "p-1",
    fontSize: "text-xs",
    headerFontSize: "text-[10px]",
    minWidth: "min-w-[55px]",
    maxWidth: "max-w-[65px]",
    productWidth: "min-w-[160px] max-w-[160px]",
    iconSize: "h-2.5 w-2.5",
    badgeSize: "text-[9px]",
  },
  large: {
    cellPadding: "p-2",
    fontSize: "text-sm",
    headerFontSize: "text-xs",
    minWidth: "min-w-[70px]",
    maxWidth: "max-w-[80px]",
    productWidth: "min-w-[200px] max-w-[200px]",
    iconSize: "h-3 w-3",
    badgeSize: "text-[10px]",
  },
};

// Debounce hook
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// Editable Cell Component
const EditableCell = React.memo(({ 
  value, 
  previousValue,
  preOrderValue,
  pendingReq,
  isPreOrderFulfilled,
  onChange,
  productId, 
  storeId,
  isHighlighted,
  orderId,
  saving,
  disabled,
  mode
}: { 
  value: number; 
  previousValue: number;
  preOrderValue: number;
  pendingReq: number;
  isPreOrderFulfilled: boolean;
  onChange: (productId: string, storeId: string, value: number) => void;
  productId: string;
  storeId: string;
  isHighlighted: boolean;
  orderId: string | null;
  saving: boolean;
  disabled: boolean;
  mode: MatrixMode;
}) => {
  const [localValue, setLocalValue] = useState(mode === "PREORDER" ? preOrderValue : value);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value when mode or values change
  useEffect(() => {
    setLocalValue(mode === "PREORDER" ? preOrderValue : value);
  }, [value, preOrderValue, mode]);

  const handleBlur = () => {
    setIsEditing(false);
    const compareValue = mode === "PREORDER" ? preOrderValue : value;
    if (localValue !== compareValue) {
      onChange(productId, storeId, localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setLocalValue(mode === "PREORDER" ? preOrderValue : value);
      setIsEditing(false);
    }
  };

  // Mode-based styling
  let bgClass = '';
  if (disabled || mode === "VIEW") bgClass = 'bg-gray-100 cursor-not-allowed';
  else if (isHighlighted) bgClass = mode === "PREORDER" ? 'bg-orange-200' : 'bg-yellow-100';
  else if (mode === "PREORDER") {
    if (preOrderValue > 0) bgClass = 'bg-orange-50';
  } else {
    if (isPreOrderFulfilled && preOrderValue > 0) bgClass = 'bg-green-100';
    else if (preOrderValue > 0 && pendingReq > 0) bgClass = 'bg-orange-50';
    else if (value > 0) bgClass = 'bg-blue-50';
  }

  const displayValue = mode === "PREORDER" ? preOrderValue : value;
  const isDisabled = disabled || mode === "VIEW";

  return (
    <td 
      className={`p-0 text-center border transition-colors relative ${bgClass} ${saving ? 'opacity-50' : ''} ${isDisabled ? '' : 'cursor-pointer'}`}
      onClick={() => {
        if (!saving && !isDisabled) {
          setIsEditing(true);
          setTimeout(() => inputRef.current?.select(), 0);
        }
      }}
    >
      {isEditing && !isDisabled ? (
        <input
          ref={inputRef}
          type="number"
          min="0"
          value={localValue}
          onChange={(e) => setLocalValue(parseInt(e.target.value) || 0)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={saving}
          className={`w-full h-full p-1 text-center text-xs border-2 focus:outline-none ${mode === "PREORDER" ? 'border-orange-500' : 'border-blue-500'}`}
        />
      ) : (
        <div className="flex flex-col items-center p-0.5">
          <span className={`text-xs ${displayValue > 0 ? `font-bold ${mode === "PREORDER" ? 'text-orange-700' : 'text-blue-700'}` : 'text-gray-400'}`}>
            {displayValue}
          </span>
          <div className="flex gap-1 text-[8px]">
            {mode === "ORDER" && previousValue > 0 && (
              <span className="text-gray-400 flex items-center">
                <History className="h-2 w-2" />{previousValue}
              </span>
            )}
            {mode === "ORDER" && preOrderValue > 0 && (
              <span className={`flex items-center font-medium ${isPreOrderFulfilled ? 'text-green-600' : 'text-orange-500'}`}>
                <ClipboardList className="h-2 w-2" />{preOrderValue}
                {isPreOrderFulfilled && <CheckCircle2 className="h-2 w-2 ml-0.5" />}
              </span>
            )}
            {mode === "PREORDER" && value > 0 && (
              <span className="text-blue-500 flex items-center font-medium">
                <ShoppingCart className="h-2 w-2" />{value}
              </span>
            )}
          </div>
        </div>
      )}
      {mode === "ORDER" && orderId && value > 0 && (
        <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full" />
      )}
      {mode === "PREORDER" && preOrderValue > 0 && (
        <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-orange-500 rounded-full" />
      )}
    </td>
  );
});

EditableCell.displayName = 'EditableCell';


const WeeklyOrderMatrix: React.FC<WeeklyOrderMatrixProps> = ({ products, onRefresh }) => {
  const token = useSelector((state: RootState) => state.auth?.token ?? null);
  const [stores, setStores] = useState<any[]>([]);
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Matrix Mode State
  const [matrixMode, setMatrixMode] = useState<MatrixMode>("ORDER");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  
  // Maximize/Fullscreen state
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Size control
  const [sizePreset, setSizePreset] = useState<SizePreset>("normal");
  const currentSize = sizeConfig[sizePreset];
  
  // Store filter - show only stores with orders/preorders
  const [showOnlyActiveStores, setShowOnlyActiveStores] = useState(true); // Default to true
  
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekRange, setWeekRange] = useState<any>(null);
  const [preOrdersCount, setPreOrdersCount] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  
  // Smart filtering
  const [showOnlyWithOrders, setShowOnlyWithOrders] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("all");
  
  // Store visibility for pagination
  const [visibleStoreRange, setVisibleStoreRange] = useState({ start: 0, end: 20 });
  const [showAllStores, setShowAllStores] = useState(false);
  
  // Track changes
  const [changedCells, setChangedCells] = useState<Set<string>>(new Set());
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Check week status for editing permissions
  const isCurrentWeek = weekOffset === 0;
  const isPastWeek = weekOffset < 0;
  const isFutureWeek = weekOffset > 0;
  
  // Determine if editing is allowed based on mode and week
  const canEdit = useMemo(() => {
    if (matrixMode === "VIEW") return false;
    if (matrixMode === "ORDER") return isCurrentWeek; // ORDER mode only for current week
    if (matrixMode === "PREORDER") return isCurrentWeek || isFutureWeek; // PREORDER for current and future weeks
    return false;
  }, [matrixMode, isCurrentWeek, isFutureWeek]);

  // Fetch matrix data from API with pagination
  const fetchMatrixData = useCallback(async (page = 1, search = "") => {
    setLoading(true);
    try {
      const response = await getOrderMatrixDataAPI(token, weekOffset, page, pageSize, search);
      if (response?.success && response?.data) {
        setMatrixData(response.data.matrix || []);
        setStores(response.data.stores || []);
        setWeekRange(response.data.weekRange);
        setPreOrdersCount(response.data.preOrdersCount || 0);
        setVisibleStoreRange({ start: 0, end: Math.min(20, response.data.stores?.length || 0) });
        setChangedCells(new Set());
        
        if (response.data.pagination) {
          setCurrentPage(response.data.pagination.currentPage);
          setTotalPages(response.data.pagination.totalPages);
          setTotalProducts(response.data.pagination.totalProducts);
        }
      }
    } catch (error) {
      console.error("Error fetching matrix data:", error);
      toast.error("Failed to load order matrix data");
    } finally {
      setLoading(false);
    }
  }, [token, weekOffset, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
    fetchMatrixData(1, searchTerm);
  }, [weekOffset]);

  useEffect(() => {
    setSearchTerm(debouncedSearch);
    setCurrentPage(1);
    fetchMatrixData(1, debouncedSearch);
  }, [debouncedSearch]);

  // Listen for order/preorder changes from other components
  useEffect(() => {
    const unsubscribe = orderEvents.onAnyOrderChange((data) => {
      console.log("Order/PreOrder change detected, refreshing matrix...", data);
      // Small delay to ensure backend has processed the change
      setTimeout(() => {
        fetchMatrixData(currentPage, searchTerm);
      }, 500);
    });

    return () => unsubscribe();
  }, [currentPage, searchTerm, fetchMatrixData]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  // Prevent body scroll when maximized
  useEffect(() => {
    if (isMaximized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMaximized]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchMatrixData(newPage, searchTerm);
    }
  };

  const availableStates = useMemo(() => {
    const states = new Set<string>();
    stores.forEach((store) => {
      if (store.state) states.add(store.state);
      else if (store.city) states.add(store.city);
    });
    return Array.from(states).sort();
  }, [stores]);

  // Get stores with orders/preorders (used for filtering and sorting)
  const storesWithOrdersSet = useMemo(() => {
    const storesWithOrders = new Set<string>();
    matrixData.forEach((row) => {
      Object.entries(row.storeOrders || {}).forEach(([storeId, data]: [string, any]) => {
        if (data?.currentQty > 0 || data?.preOrderQty > 0) {
          storesWithOrders.add(storeId);
        }
      });
    });
    return storesWithOrders;
  }, [matrixData]);

  const filteredStores = useMemo(() => {
    let result = stores;
    
    if (selectedState !== "all") {
      result = result.filter((store) => 
        store.state === selectedState || store.city === selectedState
      );
    }
    
    // Filter to show only stores with orders/preorders if enabled
    if (showOnlyActiveStores) {
      result = result.filter((store) => storesWithOrdersSet.has(store._id));
    }
    
    if (showOnlyWithOrders) {
      result = result.filter((store) => storesWithOrdersSet.has(store._id));
    }
    
    // Sort: stores with orders first, then others
    result = [...result].sort((a, b) => {
      const aHasOrder = storesWithOrdersSet.has(a._id) ? 0 : 1;
      const bHasOrder = storesWithOrdersSet.has(b._id) ? 0 : 1;
      return aHasOrder - bHasOrder;
    });
    
    return result;
  }, [stores, selectedState, showOnlyWithOrders, showOnlyActiveStores, storesWithOrdersSet]);

  const visibleStores = useMemo(() => {
    if (showAllStores) return filteredStores;
    return filteredStores.slice(visibleStoreRange.start, visibleStoreRange.end);
  }, [filteredStores, visibleStoreRange, showAllStores]);

  // Handle cell change - mode aware
  const handleCellChange = useCallback(async (productId: string, storeId: string, quantity: number) => {
    if (!canEdit) {
      if (matrixMode === "VIEW") {
        toast.error("View mode - editing disabled");
      } else if (matrixMode === "ORDER" && !isCurrentWeek) {
        toast.error("ORDER mode only works for current week");
      } else if (matrixMode === "PREORDER" && isPastWeek) {
        toast.error("Cannot create PreOrders for past weeks");
      }
      return;
    }
    
    const cellKey = `${productId}-${storeId}`;
    setSavingCell(cellKey);
    
    try {
      let response;
      
      if (matrixMode === "PREORDER") {
        // PREORDER Mode - Create/Update PreOrder
        response = await updatePreOrderMatrixItemAPI({
          productId,
          storeId,
          quantity,
          weekOffset
        }, token);

        if (response?.success) {
          setMatrixData(prev => prev.map(row => {
            if (row.productId === productId) {
              const newStoreOrders = { ...row.storeOrders };
              const oldData = newStoreOrders[storeId] || { currentQty: 0, previousQty: 0, preOrderQty: 0, pendingReq: 0, orderId: null };
              
              newStoreOrders[storeId] = {
                ...oldData,
                preOrderQty: quantity,
                pendingReq: Math.max(0, quantity - (oldData.currentQty || 0)),
                isPreOrderFulfilled: (oldData.currentQty || 0) >= quantity && quantity > 0
              };
              
              return { ...row, storeOrders: newStoreOrders };
            }
            return row;
          }));
          
          setChangedCells(prev => new Set(prev).add(cellKey));
          toast.success("PreOrder updated", { autoClose: 1000 });
        }
      } else {
        // ORDER Mode - Create/Update Order
        response = await updateOrderMatrixItemAPI({
          productId,
          storeId,
          quantity,
          weekOffset
        }, token);

        if (response?.success) {
          setMatrixData(prev => prev.map(row => {
            if (row.productId === productId) {
              const newStoreOrders = { ...row.storeOrders };
              const oldData = newStoreOrders[storeId] || { currentQty: 0, previousQty: 0, preOrderQty: 0, pendingReq: 0, orderId: null };
              
              const oldQty = oldData.currentQty || 0;
              const qtyDiff = quantity - oldQty;
              const preOrderQty = oldData.preOrderQty || 0;
              const newPendingReq = Math.max(0, preOrderQty - quantity);
              const isPreOrderFulfilled = quantity >= preOrderQty && preOrderQty > 0;
              
              newStoreOrders[storeId] = {
                ...oldData,
                currentQty: quantity,
                pendingReq: newPendingReq,
                isPreOrderFulfilled,
                orderId: response.order?._id || oldData.orderId
              };
              
              let newOrderTotal = 0;
              let newPendingReqTotal = 0;
              Object.values(newStoreOrders).forEach((data: any) => {
                newOrderTotal += data.currentQty || 0;
                newPendingReqTotal += data.pendingReq || 0;
              });
              
              const newStock = Math.max(0, (row.totalStock || 0) - qtyDiff);
              
              return { 
                ...row, 
                storeOrders: newStoreOrders,
                orderTotal: newOrderTotal,
                pendingReqTotal: newPendingReqTotal,
                totalStock: newStock
              };
            }
            return row;
          }));
          
          setChangedCells(prev => new Set(prev).add(cellKey));
          toast.success(response.preOrderHandled ? "PreOrder converted!" : "Updated", { autoClose: 1000 });
        }
      }
    } catch (error) {
      console.error("Error updating cell:", error);
      toast.error("Failed to update");
    } finally {
      setSavingCell(null);
    }
  }, [token, weekOffset, matrixMode, canEdit, isCurrentWeek, isPastWeek]);

  // Calculate totals - only from visible store data for this page
  const totals = useMemo(() => {
    let orderTotal = 0, stockTotal = 0, preOrderTotal = 0, pendingReqTotal = 0, purchaseTotal = 0;
    matrixData.forEach(row => {
      // Calculate order total from store orders (visible stores only for accuracy)
      const rowOrderTotal = Object.values(row.storeOrders || {}).reduce((sum: number, data: any) => sum + (data?.currentQty || 0), 0);
      orderTotal += rowOrderTotal;
      stockTotal += row.totalStock || 0;
      
      // PreOrder and Pending should also be calculated from store orders
      const rowPreOrderTotal = Object.values(row.storeOrders || {}).reduce((sum: number, data: any) => sum + (data?.preOrderQty || 0), 0);
      const rowPendingReqTotal = Object.values(row.storeOrders || {}).reduce((sum: number, data: any) => sum + (data?.pendingReq || 0), 0);
      preOrderTotal += rowPreOrderTotal;
      pendingReqTotal += rowPendingReqTotal;
      purchaseTotal += row.totalPurchase || 0;
    });
    return { orderTotal, stockTotal, preOrderTotal, pendingReqTotal, purchaseTotal };
  }, [matrixData]);

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
    const headers = ["PRODUCT", ...filteredStores.map(s => s.storeName || 'Store'), "TOT", "STK", "PRE", "REQ", "PUR", "ST"];
    const csvData = matrixData.map(row => {
      const rowPreOrder = Object.values(row.storeOrders || {}).reduce((sum: number, d: any) => sum + (d?.preOrderQty || 0), 0);
      const rowPending = Object.values(row.storeOrders || {}).reduce((sum: number, d: any) => sum + (d?.pendingReq || 0), 0);
      const rowOrder = Object.values(row.storeOrders || {}).reduce((sum: number, d: any) => sum + (d?.currentQty || 0), 0);
      const status = (row.totalPurchase || 0) >= rowPending ? "OK" : "NEED";
      return [
        row.productName,
        ...filteredStores.map(s => row.storeOrders?.[s._id]?.currentQty || 0),
        rowOrder, row.totalStock || 0, rowPreOrder, rowPending, row.totalPurchase || 0, status
      ];
    });
    const csvContent = [headers.join(","), ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `order_matrix_page${currentPage}.csv`;
    link.click();
    toast.success("Exported!");
  }, [filteredStores, matrixData, currentPage]);

  const storesWithOrdersCount = useMemo(() => {
    const set = new Set<string>();
    matrixData.forEach(row => {
      Object.entries(row.storeOrders || {}).forEach(([storeId, data]: [string, any]) => {
        if (data?.currentQty > 0 || data?.preOrderQty > 0) set.add(storeId);
      });
    });
    return set.size;
  }, [matrixData]);

  // Get mode display info
  const getModeInfo = () => {
    switch (matrixMode) {
      case "ORDER":
        return { color: "bg-blue-500", text: "ORDER", icon: ShoppingCart, desc: "Create/Edit Orders (Current Week)" };
      case "PREORDER":
        return { color: "bg-orange-500", text: "PREORDER", icon: ClipboardList, desc: "Create/Edit PreOrders (Current & Future)" };
      case "VIEW":
        return { color: "bg-gray-500", text: "VIEW", icon: Eye, desc: "Read-only View" };
    }
  };
  const modeInfo = getModeInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Fullscreen wrapper
  const matrixContent = (
    <Card className={`w-full ${isMaximized ? 'h-full rounded-none border-0' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Matrix
            </CardTitle>
            
            {/* Mode Selector */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={matrixMode === "ORDER" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMatrixMode("ORDER")}
                className={`h-7 px-3 text-xs ${matrixMode === "ORDER" ? "bg-blue-500 hover:bg-blue-600" : ""}`}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                ORDER
              </Button>
              <Button
                variant={matrixMode === "PREORDER" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMatrixMode("PREORDER")}
                className={`h-7 px-3 text-xs ${matrixMode === "PREORDER" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
              >
                <ClipboardList className="h-3 w-3 mr-1" />
                PREORDER
              </Button>
              <Button
                variant={matrixMode === "VIEW" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMatrixMode("VIEW")}
                className={`h-7 px-3 text-xs ${matrixMode === "VIEW" ? "bg-gray-500 hover:bg-gray-600" : ""}`}
              >
                <Eye className="h-3 w-3 mr-1" />
                VIEW
              </Button>
            </div>
            
            {/* Mode Status Badge */}
            {!canEdit && (
              <Badge variant="secondary" className="ml-2">
                <Lock className="h-3 w-3 mr-1" />
                {isPastWeek ? "Past Week" : matrixMode === "ORDER" && !isCurrentWeek ? "Future Week" : "Read Only"}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(prev => prev - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Badge variant={isCurrentWeek ? "default" : "secondary"} className="px-3 py-1">
              <Calendar className="h-3 w-3 mr-1" />
              {weekRange ? `${weekRange.start} - ${weekRange.end}` : 'Current Week'}
              {isCurrentWeek && <span className="ml-1 text-xs">(Current)</span>}
              {isFutureWeek && <span className="ml-1 text-xs">(Future)</span>}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(prev => prev + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchMatrixData(currentPage, searchTerm)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
            {/* Maximize/Minimize Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsMaximized(!isMaximized)}
                    className={isMaximized ? "bg-blue-100" : ""}
                  >
                    {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMaximized ? "Exit Fullscreen (ESC)" : "Fullscreen Mode"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Mode Description */}
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
          <modeInfo.icon className="h-3 w-3" />
          <span>{modeInfo.desc}</span>
          {matrixMode === "PREORDER" && isCurrentWeek && (
            <span className="text-orange-600 font-medium">• PreOrders for this week will be linked when Orders are created</span>
          )}
        </div>
      </CardHeader>

      <CardContent className={`p-2 ${isMaximized ? '' : ''}`}>
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-[140px] h-8">
              <MapPin className="h-3 w-3 mr-1" />
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {availableStates.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Active Stores Only Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showOnlyActiveStores ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOnlyActiveStores(!showOnlyActiveStores)}
                  className={`h-8 ${showOnlyActiveStores ? "bg-green-600 hover:bg-green-700" : ""}`}
                >
                  <Store className="h-3 w-3 mr-1" />
                  {showOnlyActiveStores ? "Active Only" : "All Stores"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showOnlyActiveStores ? "Showing only stores with orders/preorders" : "Click to show only active stores"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant={showOnlyWithOrders ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyWithOrders(!showOnlyWithOrders)}
            className="h-8"
          >
            <Filter className="h-3 w-3 mr-1" />
            {showOnlyWithOrders ? "All" : "With Orders"}
          </Button>

          {/* Size Control */}
          <div className="flex items-center gap-1 bg-white border rounded-md p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={sizePreset === "compact" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSizePreset("compact")}
                    className="h-6 w-6 p-0"
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Compact</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={sizePreset === "normal" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSizePreset("normal")}
                    className="h-6 px-2 text-xs"
                  >
                    M
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Normal</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={sizePreset === "large" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSizePreset("large")}
                    className="h-6 w-6 p-0"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Large</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs text-gray-500">
            Page {currentPage} of {totalPages} ({totalProducts} products)
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
              First
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm">{currentPage}</span>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>
              Last
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          <Badge variant="outline" className="gap-1">
            <Store className="h-3 w-3" />
            {filteredStores.length} Stores ({storesWithOrdersCount} active)
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Package className="h-3 w-3" />
            {matrixData.length} Products
          </Badge>
          <Badge variant="outline" className="gap-1 bg-orange-50">
            <ClipboardList className="h-3 w-3" />
            {preOrdersCount} PreOrders
          </Badge>
          <Badge variant="outline" className="gap-1 bg-blue-50">
            <ShoppingCart className="h-3 w-3" />
            {totals.orderTotal} Orders
          </Badge>
        </div>

        {/* Store Navigation */}
        {!showAllStores && filteredStores.length > 20 && (
          <div className="flex items-center justify-between mb-2 px-2">
            <Button variant="ghost" size="sm" onClick={() => handleStoreNavigation('prev')} disabled={visibleStoreRange.start === 0}>
              <ChevronLeft className="h-4 w-4" /> Prev Stores
            </Button>
            <span className="text-xs text-gray-500">
              Showing {visibleStoreRange.start + 1}-{Math.min(visibleStoreRange.end, filteredStores.length)} of {filteredStores.length}
            </span>
            <Button variant="ghost" size="sm" onClick={() => handleStoreNavigation('next')} disabled={visibleStoreRange.end >= filteredStores.length}>
              Next Stores <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAllStores(!showAllStores)}
          className="mb-2 text-xs"
        >
          {showAllStores ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
          {showAllStores ? "Show Less" : `Show All ${filteredStores.length} Stores`}
        </Button>

        {/* Matrix Table */}
        <div ref={containerRef} className={`overflow-auto border rounded-lg ${isMaximized ? 'max-h-[calc(100vh-350px)]' : 'max-h-[600px]'}`}>
          <table className={`w-full ${currentSize.fontSize} border-collapse`}>
            <thead className="sticky top-0 z-10 bg-gray-100">
              <tr>
                <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-left border bg-gray-200 sticky left-0 z-20 ${currentSize.productWidth}`}>PRODUCT</th>
                {visibleStores.map(store => (
                  <TooltipProvider key={store._id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-center border bg-gray-100 ${currentSize.minWidth} ${currentSize.maxWidth} truncate cursor-help`}>
                          {store.storeName?.substring(0, sizePreset === "large" ? 8 : 6) || 'Store'}
                        </th>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{store.storeName}</p>
                        <p className="text-xs text-gray-400">{store.city}, {store.state}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-center border bg-blue-100 ${currentSize.minWidth}`}>TOT</th>
                <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-center border bg-green-100 ${currentSize.minWidth}`}>STK</th>
                <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-center border bg-orange-100 ${currentSize.minWidth}`}>PRE</th>
                <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-center border bg-yellow-100 ${currentSize.minWidth}`}>REQ</th>
                <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-center border bg-purple-100 ${currentSize.minWidth}`}>PUR</th>
                <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-center border bg-gray-200 ${currentSize.minWidth}`}>ST</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.map((row) => {
                // Calculate row totals from store orders
                const rowOrderTotal = Object.values(row.storeOrders || {}).reduce((sum: number, d: any) => sum + (d?.currentQty || 0), 0);
                const rowPreOrderTotal = Object.values(row.storeOrders || {}).reduce((sum: number, d: any) => sum + (d?.preOrderQty || 0), 0);
                const rowPendingReq = Object.values(row.storeOrders || {}).reduce((sum: number, d: any) => sum + (d?.pendingReq || 0), 0);
                const status = (row.totalPurchase || 0) >= rowPendingReq ? "OK" : "NEED";
                
                return (
                  <tr key={row.productId} className="hover:bg-gray-50">
                    <td className={`${currentSize.cellPadding} ${currentSize.fontSize} border bg-white sticky left-0 z-5 font-medium truncate ${currentSize.productWidth}`} title={row.productName}>
                      {row.productName}
                    </td>
                    {visibleStores.map(store => {
                      const storeData = row.storeOrders?.[store._id] || {};
                      const cellKey = `${row.productId}-${store._id}`;
                      return (
                        <EditableCell
                          key={cellKey}
                          value={storeData.currentQty || 0}
                          previousValue={storeData.previousQty || 0}
                          preOrderValue={storeData.preOrderQty || 0}
                          pendingReq={storeData.pendingReq || 0}
                          isPreOrderFulfilled={storeData.isPreOrderFulfilled || false}
                          onChange={handleCellChange}
                          productId={row.productId}
                          storeId={store._id}
                          isHighlighted={changedCells.has(cellKey)}
                          orderId={storeData.orderId || null}
                          saving={savingCell === cellKey}
                          disabled={!canEdit}
                          mode={matrixMode}
                        />
                      );
                    })}
                    <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-blue-50 font-bold`}>{rowOrderTotal}</td>
                    <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-green-50`}>{row.totalStock || 0}</td>
                    <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-orange-50`}>{rowPreOrderTotal}</td>
                    <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-yellow-50`}>{rowPendingReq}</td>
                    <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-purple-50`}>{row.totalPurchase || 0}</td>
                    <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border font-bold ${status === "OK" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-gray-100 font-bold">
              <tr>
                <td className={`${currentSize.cellPadding} ${currentSize.fontSize} border bg-gray-200 sticky left-0`}>TOTAL</td>
                {visibleStores.map(store => {
                  const storeTotal = matrixData.reduce((sum, row) => sum + (row.storeOrders?.[store._id]?.currentQty || 0), 0);
                  return (
                    <td key={store._id} className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-gray-100`}>
                      {storeTotal > 0 ? storeTotal : '-'}
                    </td>
                  );
                })}
                <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-blue-200`}>{totals.orderTotal}</td>
                <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-green-200`}>{totals.stockTotal}</td>
                <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-orange-200`}>{totals.preOrderTotal}</td>
                <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-yellow-200`}>{totals.pendingReqTotal}</td>
                <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-purple-200`}>{totals.purchaseTotal}</td>
                <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-gray-200`}>-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-600 p-2 bg-gray-50 rounded">
          <span className="font-medium text-gray-700">Legend:</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-50 border rounded" /> Order Qty</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-50 border rounded" /> PreOrder Qty</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border rounded" /> PreOrder Fulfilled</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border rounded" /> Changed (Order)</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-200 border rounded" /> Changed (PreOrder)</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 border rounded" /> Read Only</span>
          <span className="flex items-center gap-1"><History className="h-3 w-3" /> Prev Week Order</span>
          <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3 text-orange-500" /> PreOrder</span>
          <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3 text-blue-500" /> Order</span>
        </div>
        
        {/* Mode Help */}
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
          <span className="font-medium">Mode Guide: </span>
          <span className="text-blue-700">ORDER</span> - Create/edit orders (current week only) | 
          <span className="text-orange-700 ml-1">PREORDER</span> - Create/edit preorders (current & future weeks) | 
          <span className="text-gray-700 ml-1">VIEW</span> - Read-only mode
        </div>
      </CardContent>
    </Card>
  );

  // Return with fullscreen wrapper if maximized
  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-hidden">
        {/* Fullscreen Header */}
        <div className="absolute top-2 right-2 z-50 flex items-center gap-2">
          <Badge variant="secondary" className="bg-blue-100">
            Press ESC to exit fullscreen
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsMaximized(false)}
            className="bg-white shadow-md"
          >
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
        </div>
        {matrixContent}
      </div>
    );
  }

  return matrixContent;
};

export default WeeklyOrderMatrix;