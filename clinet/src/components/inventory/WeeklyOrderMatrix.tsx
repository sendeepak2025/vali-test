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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CheckCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { getOrderMatrixDataAPI, exportOrderMatrixDataAPI, updateOrderMatrixItemAPI, updatePreOrderMatrixItemAPI, getPendingPreOrdersAPI, confirmPreOrdersAPI } from "@/services2/operations/order";
import { addIncomingStockAPI, bulkLinkIncomingStockAPI } from "@/services2/operations/incomingStock";
import { getAllVendorsAPI } from "@/services2/operations/vendor";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { orderEvents } from "@/utils/orderEvents";

// Matrix operation modes
type MatrixMode = "ORDER" | "PREORDER" | "INCOMING" | "VIEW";

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
  
  // Product column resizable width
  const [productColWidth, setProductColWidth] = useState(180);
  const [isResizing, setIsResizing] = useState(false);
  
  // Store filter - show only stores with orders/preorders
  const [showOnlyActiveStores, setShowOnlyActiveStores] = useState(true); // Default to true
  
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekRange, setWeekRange] = useState<any>(null);
  const [preOrdersCount, setPreOrdersCount] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  
  // Smart filtering
  const [showOnlyWithOrders, setShowOnlyWithOrders] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("all");
  
  // Store visibility for pagination
  const [visibleStoreRange, setVisibleStoreRange] = useState({ start: 0, end: 20 });
  const [showAllStores, setShowAllStores] = useState(false);
  
  // Track changes
  const [changedCells, setChangedCells] = useState<Set<string>>(new Set());
  
  // PreOrder Confirm Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPreOrders, setPendingPreOrders] = useState<any[]>([]); // Grouped PreOrders
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedPreOrders, setSelectedPreOrders] = useState<Set<string>>(new Set());
  
  // Incoming Stock & Link to Vendor Modal State
  const [showLinkVendorModal, setShowLinkVendorModal] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [vendorSearch, setVendorSearch] = useState<string>("");
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [unlinkedIncoming, setUnlinkedIncoming] = useState<any[]>([]);
  const [linkingPrices, setLinkingPrices] = useState<Record<string, number>>({});
  const [linkLoading, setLinkLoading] = useState(false);
  
  // Export loading state
  const [exportLoading, setExportLoading] = useState(false);
  
  // Confirm validation state from API
  const [canConfirmPreOrders, setCanConfirmPreOrders] = useState(true);
  const [confirmBlockReason, setConfirmBlockReason] = useState<string | null>(null);
  const [hasUnlinkedIncoming, setHasUnlinkedIncoming] = useState(false);
  const [shortageInfo, setShortageInfo] = useState<any>(null);
  
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
    if (matrixMode === "INCOMING") return isCurrentWeek || isFutureWeek; // INCOMING for current and future weeks
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
        
        // Capture confirm validation state
        setCanConfirmPreOrders(response.data.canConfirm ?? true);
        setConfirmBlockReason(response.data.confirmBlockReason || null);
        setHasUnlinkedIncoming(response.data.hasUnlinkedIncoming || false);
        setShortageInfo(response.data.shortageInfo || null);
        
        // Capture unlinked incoming items for link modal
        if (response.data.unlinkedIncomingItems) {
          setUnlinkedIncoming(response.data.unlinkedIncomingItems);
        }
        
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

  // Trigger fetch when pageSize changes
  useEffect(() => {
    setCurrentPage(1);
    fetchMatrixData(1, searchTerm);
  }, [pageSize]);

  // Listen for order/preorder changes from other components
  useEffect(() => {
    const unsubscribe = orderEvents.onAnyOrderChange((data) => {
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

  // Handle product column resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = productColWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(60, Math.min(400, startWidth + (e.clientX - startX)));
      setProductColWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [productColWidth]);

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
              
              // Recalculate PRE total from all stores
              let newPreOrderTotal = 0;
              Object.values(newStoreOrders).forEach((data: any) => {
                newPreOrderTotal += data.preOrderQty || 0;
              });
              
              // FIN = STK + INC - PRE
              const currentStock = row.totalStock || 0;
              const incomingStock = row.incomingStock || 0;
              const newFinalStock = currentStock + incomingStock - newPreOrderTotal;
              
              return { 
                ...row, 
                storeOrders: newStoreOrders,
                preOrderTotal: newPreOrderTotal,
                finalStock: newFinalStock,
                isShort: newFinalStock < 0,
                shortageQty: newFinalStock < 0 ? Math.abs(newFinalStock) : 0
              };
            }
            return row;
          }));
          
          setChangedCells(prev => new Set(prev).add(cellKey));
          toast.success("PreOrder updated", { autoClose: 1000 });
          
          // Auto-refresh after update
          setTimeout(() => fetchMatrixData(currentPage, searchTerm), 500);
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
              
              // Recalculate TOT (total orders) from all stores
              let newOrderTotal = 0;
              let newPendingReqTotal = 0;
              let newPreOrderTotal = 0;
              Object.values(newStoreOrders).forEach((data: any) => {
                newOrderTotal += data.currentQty || 0;
                newPendingReqTotal += data.pendingReq || 0;
                newPreOrderTotal += data.preOrderQty || 0;
              });
              
              // STK doesn't change when creating orders - it only changes via purchase/sales
              // FIN = STK + INC - PRE (PreOrder total)
              const currentStock = row.totalStock || 0;
              const incomingStock = row.incomingStock || 0;
              const newFinalStock = currentStock + incomingStock - newPreOrderTotal;
              
              return { 
                ...row, 
                storeOrders: newStoreOrders,
                orderTotal: newOrderTotal,
                pendingReqTotal: newPendingReqTotal,
                preOrderTotal: newPreOrderTotal,
                finalStock: newFinalStock,
                isShort: newFinalStock < 0,
                shortageQty: newFinalStock < 0 ? Math.abs(newFinalStock) : 0
              };
            }
            return row;
          }));
          
          setChangedCells(prev => new Set(prev).add(cellKey));
          toast.success(response.preOrderHandled ? "PreOrder converted!" : "Updated", { autoClose: 1000 });
          
          // Auto-refresh after update
          setTimeout(() => fetchMatrixData(currentPage, searchTerm), 500);
        }
      }
    } catch (error) {
      console.error("Error updating cell:", error);
      toast.error("Failed to update");
    } finally {
      setSavingCell(null);
    }
  }, [token, weekOffset, matrixMode, canEdit, isCurrentWeek, isPastWeek, changedCells.size, currentPage, searchTerm, fetchMatrixData]);

  // Handle incoming stock change from matrix
  const handleIncomingChange = useCallback(async (productId: string, quantity: number) => {
    if (matrixMode !== "INCOMING" || !canEdit) return;
    
    const cellKey = `incoming-${productId}`;
    setSavingCell(cellKey);
    
    try {
      const response = await addIncomingStockAPI({
        productId,
        quantity,
        weekOffset
      }, token);

      if (response?.success) {
        // Update local state with the new incoming item
        setMatrixData(prev => prev.map(row => {
          if (row.productId === productId) {
            const newIncoming = quantity;
            const newFinal = (row.totalStock || 0) + newIncoming - (row.preOrderTotal || 0);
            
            // Update incomingItems array with the new/updated item
            let newIncomingItems = [...(row.incomingItems || [])];
            if (response.data) {
              // Remove any existing draft item for this product
              newIncomingItems = newIncomingItems.filter((i: any) => i.status !== "draft");
              // Add the new item if quantity > 0
              if (quantity > 0) {
                newIncomingItems.push({
                  _id: response.data._id,
                  quantity: response.data.quantity,
                  status: response.data.status || "draft",
                  unitPrice: response.data.unitPrice || 0
                });
              }
            }
            
            return {
              ...row,
              incomingStock: newIncoming,
              incomingItems: newIncomingItems,
              finalStock: newFinal,
              isShort: newFinal < 0,
              shortageQty: newFinal < 0 ? Math.abs(newFinal) : 0,
              incomingAllLinked: quantity === 0 ? true : false // New incoming is draft (unlinked)
            };
          }
          return row;
        }));
        
        setChangedCells(prev => new Set(prev).add(cellKey));
        
        // Update unlinked status
        if (quantity > 0) {
          setHasUnlinkedIncoming(true);
          setCanConfirmPreOrders(false);
        }
        
        toast.success("Incoming stock updated", { autoClose: 1000 });
        
        // Auto-refresh after update
        setTimeout(() => fetchMatrixData(currentPage, searchTerm), 500);
      }
    } catch (error) {
      console.error("Error updating incoming stock:", error);
      toast.error("Failed to update incoming stock");
    } finally {
      setSavingCell(null);
    }
  }, [token, weekOffset, matrixMode, canEdit]);

  // Fetch vendors for link modal
  const fetchVendors = useCallback(async () => {
    try {
      // Fetch all vendors without status filter
      const response = await getAllVendorsAPI({});
      console.log("Vendors API response:", response);
      if (response?.data && Array.isArray(response.data)) {
        setVendors(response.data);
      } else if (response?.vendors && Array.isArray(response.vendors)) {
        setVendors(response.vendors);
      } else if (Array.isArray(response)) {
        setVendors(response);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  }, []);

  // Open link vendor modal
  const openLinkVendorModal = useCallback(() => {
    fetchVendors();
    // Get unlinked items from matrix data - merge with incomingItems
    const unlinked = matrixData
      .filter(row => row.incomingStock > 0 && !row.incomingAllLinked)
      .map(row => {
        // Get draft items from incomingItems array
        const draftItems = (row.incomingItems || []).filter((i: any) => i.status === "draft");
        
        return {
          productId: row.productId,
          productName: row.productName,
          quantity: row.incomingStock,
          incomingItems: draftItems,
          // Also include _id if there's only one draft item (for simpler linking)
          _id: draftItems.length === 1 ? draftItems[0]._id : undefined
        };
      });
    setUnlinkedIncoming(unlinked);
    
    // Initialize prices
    const prices: Record<string, number> = {};
    unlinked.forEach(item => {
      prices[item.productId] = 0;
    });
    setLinkingPrices(prices);
    
    setShowLinkVendorModal(true);
  }, [fetchVendors, matrixData]);

  // Handle bulk link to vendor
  const handleBulkLinkToVendor = useCallback(async () => {
    if (!selectedVendor) {
      toast.error("Please select a vendor");
      return;
    }

    // Build items to link - handle both data structures
    const itemsToLink: { incomingStockId: string; unitPrice: number }[] = [];
    
    unlinkedIncoming.forEach(item => {
      // If item has incomingItems array (from matrixData)
      if (item.incomingItems?.length > 0) {
        item.incomingItems
          .filter((i: any) => i.status === "draft")
          .forEach((i: any) => {
            itemsToLink.push({
              incomingStockId: i._id,
              unitPrice: linkingPrices[item.productId] || 0
            });
          });
      } 
      // If item has _id directly (from API unlinkedIncomingItems)
      else if (item._id) {
        itemsToLink.push({
          incomingStockId: item._id,
          unitPrice: linkingPrices[item.productId] || 0
        });
      }
    });

    if (itemsToLink.length === 0) {
      toast.error("No items to link");
      return;
    }

    setLinkLoading(true);
    try {
      const response = await bulkLinkIncomingStockAPI({
        vendorId: selectedVendor,
        items: itemsToLink,
        createPurchaseOrder: true
      }, token);

      if (response?.success) {
        setShowLinkVendorModal(false);
        setSelectedVendor("");
        setVendorSearch("");
        setVendorDropdownOpen(false);
        setLinkingPrices({});
        // Refresh matrix data
        fetchMatrixData(currentPage, searchTerm);
      }
    } catch (error) {
      console.error("Error linking to vendor:", error);
      toast.error("Failed to link to vendor");
    } finally {
      setLinkLoading(false);
    }
  }, [selectedVendor, unlinkedIncoming, linkingPrices, token, currentPage, searchTerm, fetchMatrixData]);

  // Calculate totals - only from visible store data for this page
  const totals = useMemo(() => {
    let orderTotal = 0, stockTotal = 0, preOrderTotal = 0, pendingReqTotal = 0, purchaseTotal = 0, incomingTotal = 0, finalTotal = 0;
    matrixData.forEach(row => {
      // Calculate order total from store orders (visible stores only for accuracy)
      const rowOrderTotal = Object.values(row.storeOrders || {}).reduce((sum: number, data: any) => sum + (data?.currentQty || 0), 0) as number;
      orderTotal += rowOrderTotal;
      stockTotal += row.totalStock || 0;
      incomingTotal += row.incomingStock || 0;
      
      // PreOrder and Pending should also be calculated from store orders
      const rowPreOrderTotal = Object.values(row.storeOrders || {}).reduce((sum: number, data: any) => sum + (data?.preOrderQty || 0), 0) as number;
      const rowPendingReqTotal = Object.values(row.storeOrders || {}).reduce((sum: number, data: any) => sum + (data?.pendingReq || 0), 0) as number;
      preOrderTotal += rowPreOrderTotal;
      pendingReqTotal += rowPendingReqTotal;
      purchaseTotal += row.totalPurchase || 0;
      finalTotal += row.finalStock || 0;
    });
    return { orderTotal, stockTotal, preOrderTotal, pendingReqTotal, purchaseTotal, incomingTotal, finalTotal };
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

  const handleExport = useCallback(async () => {
    setExportLoading(true);
    
    try {
      const response = await exportOrderMatrixDataAPI(token, weekOffset);
      
      if (!response?.success || !response?.data) {
        toast.error("Failed to fetch export data");
        return;
      }

      const allMatrix = response.data.matrix || [];
      const allStores = response.data.stores || [];
      
      // Build CSV with all products and all stores
      const headers = ["PRODUCT", ...allStores.map((s: any) => s.storeName || 'Store'), "TOT", "STK", "INC", "PRE", "FIN", "ST"];
      const csvData = allMatrix.map((row: any) => {
        const rowPreOrder = row.preOrderTotal || 0;
        const rowOrder = row.orderTotal || 0;
        const rowIncoming = row.incomingStock || 0;
        const rowFinal = row.finalStock ?? ((row.totalStock || 0) + rowIncoming - rowPreOrder);
        const status = rowFinal < 0 ? "SHORT" : "OK";
        return [
          row.productName,
          ...allStores.map((s: any) => row.storeOrders?.[s._id]?.currentQty || 0),
          rowOrder, row.totalStock || 0, rowIncoming, rowPreOrder, rowFinal, status
        ];
      });
      
      const csvContent = [headers.join(","), ...csvData.map((row: any) => row.map((cell: any) => `"${cell}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `order_matrix_full_${response.data.weekRange?.label?.replace(/\s/g, '_') || 'export'}.csv`;
      link.click();
      toast.success(`Exported ${allMatrix.length} products!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExportLoading(false);
    }
  }, [token, weekOffset]);

  const storesWithOrdersCount = useMemo(() => {
    const set = new Set<string>();
    matrixData.forEach(row => {
      Object.entries(row.storeOrders || {}).forEach(([storeId, data]: [string, any]) => {
        if (data?.currentQty > 0 || data?.preOrderQty > 0) set.add(storeId);
      });
    });
    return set.size;
  }, [matrixData]);

  // Fetch Pending PreOrders for Review
  const fetchPendingPreOrders = useCallback(async () => {
    setConfirmLoading(true);
    try {
      const response = await getPendingPreOrdersAPI(token, weekOffset);
      if (response?.success) {
        // Use groupedPreOrders for PreOrder-wise display
        const grouped = response.groupedPreOrders || response.preOrders || [];
        setPendingPreOrders(grouped);
        // Don't select any by default - user must manually select
        setSelectedPreOrders(new Set());
        setShowConfirmModal(true);
      }
    } catch (error) {
      console.error("Error fetching pending preorders:", error);
      toast.error("Failed to fetch pending preorders");
    } finally {
      setConfirmLoading(false);
    }
  }, [token, weekOffset]);

  // Handle Confirm PreOrders
  const handleConfirmPreOrders = useCallback(async () => {
    if (selectedPreOrders.size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Selection',
        text: 'Please select at least one PreOrder to confirm',
      });
      return;
    }
    
    setConfirmLoading(true);
    try {
      const response = await confirmPreOrdersAPI({
        preOrderIds: Array.from(selectedPreOrders),
        weekOffset
      }, token);
      
      if (response?.success) {
        // Check if there are errors (insufficient stock)
        if (response.errors && response.errors.length > 0) {
          // Close confirm modal first so Swal appears on top
          setShowConfirmModal(false);
          
          // Build table rows for insufficient stock
          let tableRows = '';
          response.errors.forEach((err: any) => {
            if (err.insufficientStock && err.insufficientStock.length > 0) {
              err.insufficientStock.forEach((item: any) => {
                tableRows += `
                  <tr style="background-color: #fef2f2;">
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.name}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${item.requested}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${item.available}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${item.type || 'box'}</td>
                  </tr>
                `;
              });
            }
          });

          // Build cannot fulfill list
          let cannotFulfillList = '';
          response.errors.forEach((err: any) => {
            if (err.insufficientStock && err.insufficientStock.length > 0) {
              err.insufficientStock.forEach((item: any) => {
                cannotFulfillList += `<li>${item.name} (requested: ${item.requested}, available: ${item.available})</li>`;
              });
            }
          });

          await Swal.fire({
            icon: 'error',
            title: 'Insufficient Stock',
            html: `
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Product</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">Requested</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">Available</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">Type</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
              <div style="text-align: left; margin-top: 10px;">
                <strong>Cannot fulfill these items:</strong>
                <ul style="margin-top: 5px; padding-left: 20px;">
                  ${cannotFulfillList}
                </ul>
              </div>
            `,
            confirmButtonText: 'OK',
            confirmButtonColor: '#6366f1',
            width: '550px'
          });

          // Clear selection
          setPendingPreOrders([]);
          setSelectedPreOrders(new Set());
          
          // Refresh matrix data
          fetchMatrixData(currentPage, searchTerm);
          return;
        }
        
        // If all confirmed successfully
        if (response.confirmedCount > 0) {
          setShowConfirmModal(false);
          setPendingPreOrders([]);
          setSelectedPreOrders(new Set());
          
          // Show success with work order info
          if (response.workOrder) {
            const wo = response.workOrder;
            if (wo.hasShortage) {
              await Swal.fire({
                icon: 'warning',
                title: 'PreOrders Confirmed with Shortages',
                html: `
                  <p><strong>${response.confirmedCount}</strong> PreOrder(s) confirmed</p>
                  <p style="color: #f59e0b; margin-top: 10px;">
                    ⚠️ ${wo.shortProductCount} product(s) short<br/>
                    Total shortage: ${wo.totalShortageQuantity} units
                  </p>
                  <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">View in Work Orders page for details</p>
                `,
                confirmButtonText: 'OK',
                confirmButtonColor: '#6366f1'
              });
            } else {
              await Swal.fire({
                icon: 'success',
                title: 'PreOrders Confirmed!',
                html: `
                  <p><strong>${response.confirmedCount}</strong> PreOrder(s) confirmed</p>
                  <p style="color: #10b981; margin-top: 10px;">✓ All products fully stocked!</p>
                `,
                confirmButtonText: 'OK',
                confirmButtonColor: '#6366f1'
              });
            }
          } else {
            await Swal.fire({
              icon: 'success',
              title: 'PreOrders Confirmed!',
              text: `${response.confirmedCount} PreOrder(s) confirmed successfully!`,
              confirmButtonText: 'OK',
              confirmButtonColor: '#6366f1'
            });
          }
          
          // Refresh matrix data
          fetchMatrixData(currentPage, searchTerm);
        } else {
          await Swal.fire({
            icon: 'info',
            title: 'No PreOrders',
            text: 'No PreOrders to confirm',
            confirmButtonText: 'OK',
            confirmButtonColor: '#6366f1'
          });
        }
      }
    } catch (error) {
      console.error("Error confirming preorders:", error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to confirm preorders',
        confirmButtonText: 'OK',
        confirmButtonColor: '#6366f1'
      });
    } finally {
      setConfirmLoading(false);
    }
  }, [selectedPreOrders, weekOffset, token, currentPage, searchTerm, fetchMatrixData]);

  // Toggle PreOrder selection
  const togglePreOrderSelection = (preOrderId: string) => {
    setSelectedPreOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(preOrderId)) {
        newSet.delete(preOrderId);
      } else {
        newSet.add(preOrderId);
      }
      return newSet;
    });
  };

  // Select/Deselect all PreOrders
  const toggleSelectAll = () => {
    if (selectedPreOrders.size === pendingPreOrders.length) {
      setSelectedPreOrders(new Set());
    } else {
      setSelectedPreOrders(new Set(pendingPreOrders.map(p => p._id)));
    }
  };

  // Get mode display info
  const getModeInfo = () => {
    switch (matrixMode) {
      case "ORDER":
        return { color: "bg-blue-500", text: "ORDER", icon: ShoppingCart, desc: "Create/Edit Orders (Current Week)" };
      case "PREORDER":
        return { color: "bg-orange-500", text: "PREORDER", icon: ClipboardList, desc: "Create/Edit PreOrders (Current & Future)" };
      case "INCOMING":
        return { color: "bg-purple-500", text: "INCOMING", icon: Truck, desc: "Add Incoming Stock (Current & Future)" };
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
      <CardHeader className="pb-2 px-2 sm:px-4">
        {/* Row 1: Title + Action Buttons */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-1 sm:gap-2 whitespace-nowrap">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden xs:inline">Order Matrix</span>
            <span className="xs:hidden">Matrix</span>
          </CardTitle>
          
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchMatrixData(currentPage, searchTerm)}
                    disabled={loading}
                    className="border-green-500 text-green-600 hover:bg-green-50 h-8 w-8 sm:w-auto sm:px-3 p-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="ml-1 hidden sm:inline">Refresh</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh Matrix Data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={exportLoading} className="h-8 w-8 p-0">
                    {exportLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{exportLoading ? "Downloading..." : "Download CSV"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsMaximized(!isMaximized)}
                    className={`h-8 w-8 p-0 ${isMaximized ? "bg-blue-100" : ""}`}
                  >
                    {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMaximized ? "Exit Fullscreen" : "Fullscreen"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Row 2: Mode Selector */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 overflow-x-auto">
            <Button
              variant={matrixMode === "ORDER" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMatrixMode("ORDER")}
              className={`h-7 px-2 sm:px-3 text-xs ${matrixMode === "ORDER" ? "bg-blue-500 hover:bg-blue-600" : ""}`}
            >
              <ShoppingCart className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">ORDER</span>
            </Button>
            <Button
              variant={matrixMode === "PREORDER" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMatrixMode("PREORDER")}
              className={`h-7 px-2 sm:px-3 text-xs ${matrixMode === "PREORDER" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
            >
              <ClipboardList className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">PREORDER</span>
            </Button>
            <Button
              variant={matrixMode === "INCOMING" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMatrixMode("INCOMING")}
              className={`h-7 px-2 sm:px-3 text-xs ${matrixMode === "INCOMING" ? "bg-purple-500 hover:bg-purple-600" : ""}`}
            >
              <Truck className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">INCOMING</span>
            </Button>
            <Button
              variant={matrixMode === "VIEW" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMatrixMode("VIEW")}
              className={`h-7 px-2 sm:px-3 text-xs ${matrixMode === "VIEW" ? "bg-gray-500 hover:bg-gray-600" : ""}`}
            >
              <Eye className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">VIEW</span>
            </Button>
          </div>
          
          {!canEdit && (
            <Badge variant="secondary" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              {isPastWeek ? "Past" : "Read Only"}
            </Badge>
          )}
        </div>

        {/* Row 3: Week Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(prev => prev - 1)} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Badge variant={isCurrentWeek ? "default" : "secondary"} className="px-2 py-1 text-xs flex-1 justify-center max-w-[250px] truncate">
            <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">
              {weekRange?.label || 'Current Week'}
            </span>
            {isCurrentWeek && <span className="ml-1 hidden sm:inline">(Current)</span>}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(prev => prev + 1)} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Confirm PreOrders Button */}
          {matrixMode === "PREORDER" && (isCurrentWeek || isFutureWeek) && (
            <Button
              variant="default"
              size="sm"
              onClick={fetchPendingPreOrders}
              disabled={confirmLoading || !canConfirmPreOrders}
              className={`h-8 text-xs ${canConfirmPreOrders ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'}`}
            >
              {confirmLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
              <span className="ml-1 hidden sm:inline">Confirm</span>
            </Button>
          )}
          
          {/* Link to Vendor Button */}
          {hasUnlinkedIncoming && (
            <Button
              variant="outline"
              size="sm"
              onClick={openLinkVendorModal}
              className="h-8 text-xs border-purple-500 text-purple-600"
            >
              <Truck className="h-3 w-3" />
              <span className="ml-1 hidden sm:inline">Link</span>
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">!</Badge>
            </Button>
          )}
        </div>
        
        {/* Mode Description - Hidden on mobile */}
        <div className="hidden sm:flex text-xs text-gray-500 items-center gap-2">
          <modeInfo.icon className="h-3 w-3" />
          <span>{modeInfo.desc}</span>
        </div>
      </CardHeader>

      <CardContent className={`p-2 ${isMaximized ? '' : ''}`}>
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="relative flex-1 min-w-[120px] sm:min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-[100px] sm:w-[140px] h-8 text-xs sm:text-sm">
              <MapPin className="h-3 w-3 mr-1 hidden sm:inline" />
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
                  className={`h-8 text-xs ${showOnlyActiveStores ? "bg-green-600 hover:bg-green-700" : ""}`}
                >
                  <Store className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">{showOnlyActiveStores ? "Active Only" : "All Stores"}</span>
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
            className="h-8 text-xs"
          >
            <Filter className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">{showOnlyWithOrders ? "All" : "With Orders"}</span>
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

          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
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
            <thead className="sticky top-0 z-30 bg-gray-100">
              <tr>
                <th 
                  className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-left border bg-gray-200 sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] relative`}
                  style={{ width: productColWidth, minWidth: productColWidth, maxWidth: productColWidth }}
                >
                  PRODUCT
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
                    onMouseDown={handleResizeStart}
                    style={{ userSelect: 'none' }}
                  />
                </th>
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
                <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-center border bg-purple-100 ${currentSize.minWidth}`}>INC</th>
                <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-center border bg-orange-100 ${currentSize.minWidth}`}>PRE</th>
                <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-center border bg-cyan-100 ${currentSize.minWidth} font-bold`}>FIN</th>
                <th className={`${currentSize.cellPadding} ${currentSize.headerFontSize} text-center border bg-gray-200 ${currentSize.minWidth}`}>ST</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.map((row) => {
                // Calculate row totals from store orders
                const rowOrderTotal = Object.values(row.storeOrders || {}).reduce((sum: number, d: any) => sum + (d?.currentQty || 0), 0) as number;
                const rowPreOrderTotal = Object.values(row.storeOrders || {}).reduce((sum: number, d: any) => sum + (d?.preOrderQty || 0), 0) as number;
                const rowPendingReq = Object.values(row.storeOrders || {}).reduce((sum: number, d: any) => sum + (d?.pendingReq || 0), 0) as number;
                const rowIncoming = row.incomingStock || 0;
                const rowFinal = row.finalStock ?? ((row.totalStock || 0) + rowIncoming - rowPreOrderTotal);
                const isShort = rowFinal < 0;
                const status = isShort ? "SHORT" : (row.incomingAllLinked === false ? "LINK" : "OK");
                
                return (
                  <tr key={row.productId} className={`hover:bg-gray-50 ${isShort ? 'bg-red-50' : ''}`}>
                    <td 
                      className={`${currentSize.cellPadding} ${currentSize.fontSize} border sticky left-0 z-20 font-medium truncate ${isShort ? 'bg-red-50' : 'bg-white'} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`} 
                      style={{ width: productColWidth, minWidth: productColWidth, maxWidth: productColWidth }}
                      title={row.productName}
                    >
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
                    {/* Incoming Stock Cell - Editable in INCOMING mode */}
                    <td 
                      className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border ${
                        matrixMode === "INCOMING" ? 'bg-purple-100 cursor-pointer hover:bg-purple-200' : 'bg-purple-50'
                      } ${row.incomingAllLinked === false ? 'ring-2 ring-yellow-400' : ''}`}
                      onClick={() => {
                        if (matrixMode === "INCOMING" && canEdit) {
                          const newQty = prompt(`Enter incoming quantity for ${row.productName}:`, String(rowIncoming));
                          if (newQty !== null) {
                            handleIncomingChange(row.productId, parseInt(newQty) || 0);
                          }
                        }
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <span className={rowIncoming > 0 ? 'font-bold text-purple-700' : 'text-gray-400'}>
                          {rowIncoming}
                        </span>
                        {row.incomingAllLinked === false && rowIncoming > 0 && (
                          <span className="text-[8px] text-yellow-600">unlinked</span>
                        )}
                      </div>
                    </td>
                    <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-orange-50`}>{rowPreOrderTotal}</td>
                    {/* Final Stock Cell - Highlighted if short */}
                    <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border font-bold ${
                      isShort ? 'bg-red-200 text-red-700' : 'bg-cyan-50 text-cyan-700'
                    }`}>
                      {rowFinal}
                    </td>
                    <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border font-bold ${
                      status === "OK" ? "bg-green-100 text-green-700" : 
                      status === "LINK" ? "bg-yellow-100 text-yellow-700" : 
                      "bg-red-100 text-red-700"
                    }`}>
                      {status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-30 bg-gray-100 font-bold">
              <tr>
                <td 
                  className={`${currentSize.cellPadding} ${currentSize.fontSize} border bg-gray-200 sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}
                  style={{ width: productColWidth, minWidth: productColWidth, maxWidth: productColWidth }}
                >
                  TOTAL
                </td>
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
                <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-purple-200`}>{totals.incomingTotal}</td>
                <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-orange-200`}>{totals.preOrderTotal}</td>
                <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border ${totals.finalTotal < 0 ? 'bg-red-200 text-red-700' : 'bg-cyan-200'}`}>{totals.finalTotal}</td>
                <td className={`${currentSize.cellPadding} ${currentSize.fontSize} text-center border bg-gray-200`}>-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Shortage Warning */}
        {shortageInfo?.hasShortage && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-red-700">
              <strong>{shortageInfo.shortProductCount}</strong> product(s) are short by total <strong>{shortageInfo.totalShortQuantity}</strong> units
            </span>
          </div>
        )}

        {/* Unlinked Incoming Warning */}
        {hasUnlinkedIncoming && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-700">
                Some incoming stock is not linked to a vendor. Link before confirming PreOrders.
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={openLinkVendorModal} className="border-yellow-500 text-yellow-700 hover:bg-yellow-100">
              Link Now
            </Button>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-600 p-2 bg-gray-50 rounded">
          <span className="font-medium text-gray-700">Legend:</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-50 border rounded" /> Order Qty</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-50 border rounded" /> PreOrder Qty</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border rounded" /> PreOrder Fulfilled</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border rounded" /> Changed (Order)</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-200 border rounded" /> Changed (PreOrder)</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-100 border rounded" /> Incoming Stock</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-cyan-100 border rounded" /> Final (STK+INC-PRE)</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-200 border rounded" /> Short</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 border rounded" /> Read Only</span>
          <span className="flex items-center gap-1"><History className="h-3 w-3" /> Prev Week Order</span>
          <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3 text-orange-500" /> PreOrder</span>
          <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3 text-blue-500" /> Order</span>
          <span className="flex items-center gap-1"><Truck className="h-3 w-3 text-purple-500" /> Incoming</span>
        </div>
        
        {/* Mode Help */}
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
          <span className="font-medium">Mode Guide: </span>
          <span className="text-blue-700">ORDER</span> - Create/edit orders (current week only) | 
          <span className="text-orange-700 ml-1">PREORDER</span> - Create/edit preorders (current & future weeks) | 
          <span className="text-purple-700 ml-1">INCOMING</span> - Add incoming stock (click INC column) |
          <span className="text-gray-700 ml-1">VIEW</span> - Read-only mode
        </div>
        
        {/* Column Guide */}
        <div className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <span className="font-medium">Columns: </span>
          TOT=Total Orders | STK=Current Stock | INC=Incoming Stock | PRE=PreOrders | FIN=Final (STK+INC-PRE) | ST=Status
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
        
        {/* Link to Vendor Modal */}
        <Dialog open={showLinkVendorModal} onOpenChange={setShowLinkVendorModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-600" />
                Link Incoming Stock to Vendor
              </DialogTitle>
              <DialogDescription>
                Select a vendor and set prices for incoming stock items
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto space-y-4">
              {/* Vendor Selection with Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Vendor *</label>
                <div className="relative">
                  {/* Click to Open Trigger */}
                  <div 
                    className="border rounded-lg p-3 cursor-pointer flex items-center justify-between hover:bg-gray-50"
                    onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                  >
                    <span className={selectedVendor ? "text-gray-900" : "text-gray-500"}>
                      {selectedVendor 
                        ? vendors.find(v => v._id === selectedVendor)?.name || "Select vendor..."
                        : "Choose a vendor..."}
                    </span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${vendorDropdownOpen ? 'rotate-90' : ''}`} />
                  </div>
                  
                  {/* Dropdown Content */}
                  {vendorDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 border rounded-lg shadow-lg bg-white overflow-hidden">
                      {/* Search Input */}
                      <div className="p-2 border-b bg-white">
                        <Input
                          placeholder="Search vendors..."
                          value={vendorSearch}
                          onChange={(e) => setVendorSearch(e.target.value)}
                          className="border-2 border-blue-400 focus:border-blue-500"
                          autoFocus
                        />
                      </div>
                      
                      {/* Vendor List */}
                      <div className="max-h-[250px] overflow-auto bg-white">
                        {/* All Vendors Option */}
                        <div
                          className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${!selectedVendor ? 'bg-gray-100' : ''}`}
                          onClick={() => { setSelectedVendor(""); setVendorDropdownOpen(false); }}
                        >
                          {!selectedVendor && <Check className="h-4 w-4 text-green-600" />}
                          <span className="font-medium">All Vendors</span>
                        </div>
                        
                        {/* Filtered Vendors */}
                        {vendors
                          .filter(vendor => 
                            !vendorSearch || 
                            vendor.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                            vendor.type?.toLowerCase().includes(vendorSearch.toLowerCase())
                          )
                          .map(vendor => (
                            <div
                              key={vendor._id}
                              className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedVendor === vendor._id ? 'bg-gray-100' : ''}`}
                              onClick={() => { setSelectedVendor(vendor._id); setVendorDropdownOpen(false); }}
                            >
                              <div className="flex items-start gap-2">
                                {selectedVendor === vendor._id && <Check className="h-4 w-4 text-green-600 mt-1" />}
                                <div className={selectedVendor === vendor._id ? '' : 'ml-6'}>
                                  <p className="font-medium">{vendor.name}</p>
                                  {vendor.type && <p className="text-sm text-gray-500">{vendor.type}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        
                        {vendors.filter(v => 
                          !vendorSearch || 
                          v.name?.toLowerCase().includes(vendorSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="p-3 text-sm text-gray-500 text-center">No vendors found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Items to Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Items to Link ({unlinkedIncoming.length})</label>
                <div className="border rounded-lg divide-y max-h-[300px] overflow-auto">
                  {unlinkedIncoming.map(item => (
                    <div key={item.productId} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Price/unit:</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={linkingPrices[item.productId] || ''}
                          onChange={(e) => setLinkingPrices(prev => ({
                            ...prev,
                            [item.productId]: parseFloat(e.target.value) || 0
                          }))}
                          className="w-24 h-8"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowLinkVendorModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleBulkLinkToVendor}
                disabled={linkLoading || !selectedVendor}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {linkLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4 mr-2" />
                )}
                Link & Create PRI Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* PreOrder Confirm Modal */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCheck className="h-5 w-5 text-green-600" />
                Confirm PreOrders
              </DialogTitle>
              <DialogDescription>
                Review and confirm pending PreOrders for {weekRange ? `${weekRange.start} - ${weekRange.end}` : 'this week'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              {pendingPreOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No pending PreOrders found for this week</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Select All */}
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPreOrders.size === pendingPreOrders.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded"
                      />
                      <span className="font-medium">Select All ({pendingPreOrders.length} PreOrders)</span>
                    </label>
                    <Badge variant="outline">
                      {selectedPreOrders.size} selected
                    </Badge>
                  </div>
                  
                  {/* PreOrders List - Grouped by PreOrder */}
                  <div className="space-y-3">
                    {pendingPreOrders.map((preOrder) => (
                      <div 
                        key={preOrder._id} 
                        className={`border rounded-lg overflow-hidden ${selectedPreOrders.has(preOrder._id) ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                      >
                        {/* PreOrder Header */}
                        <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={selectedPreOrders.has(preOrder._id)}
                              onChange={() => togglePreOrderSelection(preOrder._id)}
                              className="w-4 h-4 rounded"
                            />
                            <div>
                              <div className="font-medium text-sm flex items-center gap-2">
                                <Store className="h-4 w-4 text-blue-600" />
                                {preOrder.store?.name || 'Unknown Store'}
                                <Badge variant="outline" className="text-xs">
                                  #{preOrder.preOrderNumber || 'N/A'}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-500">
                                {preOrder.store?.city}, {preOrder.store?.state} • {preOrder.itemCount || preOrder.items?.length || 0} items
                              </div>
                            </div>
                          </label>
                          <div className="text-right">
                            <div className="font-bold text-green-600">${(preOrder.total || 0).toFixed(2)}</div>
                          </div>
                        </div>
                        
                        {/* PreOrder Items */}
                        <div className="p-2">
                          <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500">
                              <tr>
                                <th className="p-1 text-left">Product</th>
                                <th className="p-1 text-center">Qty</th>
                                <th className="p-1 text-right">Price</th>
                                <th className="p-1 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(preOrder.items || []).map((item: any, idx: number) => (
                                <tr key={idx} className="border-t border-gray-100">
                                  <td className="p-1 font-medium">{item.productName || 'Unknown'}</td>
                                  <td className="p-1 text-center text-orange-600 font-bold">{item.quantity}</td>
                                  <td className="p-1 text-right">${(item.unitPrice || 0).toFixed(2)}</td>
                                  <td className="p-1 text-right font-medium">${(item.total || (item.quantity * item.unitPrice) || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary */}
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Selected ({selectedPreOrders.size} PreOrders):</span>
                      <span className="font-bold text-lg text-green-600">
                        ${pendingPreOrders
                          .filter(p => selectedPreOrders.has(p._id))
                          .reduce((sum, p) => sum + (p.total || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmPreOrders}
                disabled={confirmLoading || selectedPreOrders.size === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {confirmLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                Confirm {selectedPreOrders.size} PreOrders
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <>
      {matrixContent}
      
      {/* PreOrder Confirm Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCheck className="h-5 w-5 text-green-600" />
              Confirm PreOrders
            </DialogTitle>
            <DialogDescription>
              Review and confirm pending PreOrders for {weekRange ? `${weekRange.start} - ${weekRange.end}` : 'this week'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {pendingPreOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending PreOrders found for this week</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Select All */}
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPreOrders.size === pendingPreOrders.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded"
                    />
                    <span className="font-medium">Select All ({pendingPreOrders.length} PreOrders)</span>
                  </label>
                  <Badge variant="outline">
                    {selectedPreOrders.size} selected
                  </Badge>
                </div>
                
                {/* PreOrders List - Grouped by PreOrder */}
                <div className="space-y-3">
                  {pendingPreOrders.map((preOrder) => (
                    <div 
                      key={preOrder._id} 
                      className={`border rounded-lg overflow-hidden ${selectedPreOrders.has(preOrder._id) ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                    >
                      {/* PreOrder Header */}
                      <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={selectedPreOrders.has(preOrder._id)}
                            onChange={() => togglePreOrderSelection(preOrder._id)}
                            className="w-4 h-4 rounded"
                          />
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              <Store className="h-4 w-4 text-blue-600" />
                              {preOrder.store?.name || 'Unknown Store'}
                              <Badge variant="outline" className="text-xs">
                                #{preOrder.preOrderNumber || 'N/A'}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500">
                              {preOrder.store?.city}, {preOrder.store?.state} • {preOrder.itemCount || preOrder.items?.length || 0} items
                            </div>
                          </div>
                        </label>
                        <div className="text-right">
                          <div className="font-bold text-green-600">${(preOrder.total || 0).toFixed(2)}</div>
                        </div>
                      </div>
                      
                      {/* PreOrder Items */}
                      <div className="p-2">
                        <table className="w-full text-sm">
                          <thead className="text-xs text-gray-500">
                            <tr>
                              <th className="p-1 text-left">Product</th>
                              <th className="p-1 text-center">Qty</th>
                              <th className="p-1 text-right">Price</th>
                              <th className="p-1 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(preOrder.items || []).map((item: any, idx: number) => (
                              <tr key={idx} className="border-t border-gray-100">
                                <td className="p-1 font-medium">{item.productName || 'Unknown'}</td>
                                <td className="p-1 text-center text-orange-600 font-bold">{item.quantity}</td>
                                <td className="p-1 text-right">${(item.unitPrice || 0).toFixed(2)}</td>
                                <td className="p-1 text-right font-medium">${(item.total || (item.quantity * item.unitPrice) || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Summary */}
                <div className="p-3 bg-gray-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Selected ({selectedPreOrders.size} PreOrders):</span>
                    <span className="font-bold text-lg text-green-600">
                      ${pendingPreOrders
                        .filter(p => selectedPreOrders.has(p._id))
                        .reduce((sum, p) => sum + (p.total || 0), 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmPreOrders}
              disabled={confirmLoading || selectedPreOrders.size === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Confirm {selectedPreOrders.size} PreOrders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Link to Vendor Modal */}
      <Dialog open={showLinkVendorModal} onOpenChange={setShowLinkVendorModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              Link Incoming Stock to Vendor
            </DialogTitle>
            <DialogDescription>
              Select a vendor and set prices for incoming stock items
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4">
            {/* Vendor Selection with Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Vendor *</label>
              <div className="relative">
                {/* Click to Open Trigger */}
                <div 
                  className="border rounded-lg p-3 cursor-pointer flex items-center justify-between hover:bg-gray-50"
                  onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                >
                  <span className={selectedVendor ? "text-gray-900" : "text-gray-500"}>
                    {selectedVendor 
                      ? vendors.find(v => v._id === selectedVendor)?.name || "Select vendor..."
                      : "Choose a vendor..."}
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${vendorDropdownOpen ? 'rotate-90' : ''}`} />
                </div>
                
                {/* Dropdown Content */}
                {vendorDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 border rounded-lg shadow-lg bg-white overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b bg-white">
                      <Input
                        placeholder="Search vendors..."
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                        className="border-2 border-blue-400 focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                    
                    {/* Vendor List */}
                    <div className="max-h-[250px] overflow-auto bg-white">
                      {/* All Vendors Option */}
                      <div
                        className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${!selectedVendor ? 'bg-gray-100' : ''}`}
                        onClick={() => { setSelectedVendor(""); setVendorDropdownOpen(false); }}
                      >
                        {!selectedVendor && <Check className="h-4 w-4 text-green-600" />}
                        <span className="font-medium">All Vendors</span>
                      </div>
                      
                      {/* Filtered Vendors */}
                      {vendors
                        .filter(vendor => 
                          !vendorSearch || 
                          vendor.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                          vendor.type?.toLowerCase().includes(vendorSearch.toLowerCase())
                        )
                        .map(vendor => (
                          <div
                            key={vendor._id}
                            className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedVendor === vendor._id ? 'bg-gray-100' : ''}`}
                            onClick={() => { setSelectedVendor(vendor._id); setVendorDropdownOpen(false); }}
                          >
                            <div className="flex items-start gap-2">
                              {selectedVendor === vendor._id && <Check className="h-4 w-4 text-green-600 mt-1" />}
                              <div className={selectedVendor === vendor._id ? '' : 'ml-6'}>
                                <p className="font-medium">{vendor.name}</p>
                                {vendor.type && <p className="text-sm text-gray-500">{vendor.type}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      
                      {vendors.filter(v => 
                        !vendorSearch || 
                        v.name?.toLowerCase().includes(vendorSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="p-3 text-sm text-gray-500 text-center">No vendors found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Items to Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Items to Link ({unlinkedIncoming.length})</label>
              <div className="border rounded-lg divide-y max-h-[300px] overflow-auto">
                {unlinkedIncoming.map(item => (
                  <div key={item.productId} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Price/unit:</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linkingPrices[item.productId] || ''}
                        onChange={(e) => setLinkingPrices(prev => ({
                          ...prev,
                          [item.productId]: parseFloat(e.target.value) || 0
                        }))}
                        className="w-24 h-8"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowLinkVendorModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkLinkToVendor}
              disabled={linkLoading || !selectedVendor}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {linkLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Truck className="h-4 w-4 mr-2" />
              )}
              Link & Create PRI Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WeeklyOrderMatrix;