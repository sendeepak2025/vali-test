"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteProductAPI } from "@/services2/operations/product";
import {
  ChevronDown,
  ChevronUp,
  Trash,
  FileEdit,
  MoreHorizontal,
  Package,
  ShoppingCart,
  TrendingUp,
  Archive,
  BarChart3,
  Box,
  ImageIcon,
  Trash2,
  Scale,
  Layers,
  Info,
  Truck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { isAfter, isBefore, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateBuyerQuantityAPI } from "@/services2/operations/order";

import AddProductForm from "./AddProductForm";
import {
  getSingleProductOrderAPI,
  trashProductQuanityAPI,
  refreshSingleProductAPI,
  addQuantityProductAPI,
} from "@/services2/operations/product";
import axios from "axios";
import { product } from "@/services2/apis";
import Swal from "sweetalert2";
import { RootState } from "@/redux/store";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import AssingeProductToStore from "./AssingeProductToStore";
import { SalesModeBadge } from "./forms/SalesModeSelector";
import { SalesMode } from "./forms/formTypes";

interface Product {
  id: string;
  _id?: string;
  name: string;
  category: string;
  quantity: number;
  totalSell?: number;
  totalPurchase?: number;
  unit: string;
  price: number;
  threshold?: number;
  lastUpdated: string;
  description?: string;
  image?: string;
  summary?: {
    totalRemaining?: number;
    totalPurchase?: number;
    totalSell?: number;
    unitPurchase?: number;
    unitRemaining?: number;
    unitSell?: number;
    incomingStock?: number;
  };
  weightVariation?: number;
  expiryDate?: string;
  batchInfo?: string;
  origin?: string;
  organic?: boolean;
  storageInstructions?: string;
  boxSize?: number;
  shippinCost?: number;
  pricePerBox?: number;
  featuredOffer?: boolean;
  popularityRank?: number;
  estimatedProfit?: number;
  recommendedOrder?: number;
  enablePromotions?: boolean;
  palette?: string;
  salesMode?: SalesMode;
  palletCapacity?: {
    casesPerLayer?: number;
    layersPerPallet?: number;
    totalCasesPerPallet?: number;
    isManual?: boolean;
  };
  palletInputMode?: 'auto' | 'manual';
  manualCasesPerPallet?: number;
}

interface InventoryTableProps {
  products: Product[];
  onProductsSelect: (ids: string[]) => void;
  selectedProducts: string[];
  onReorderProduct: (product: Product) => void;
  fetchProducts: () => void;
  endDate?: string;
  startDate?: string;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  onProductsSelect,
  selectedProducts,
  onReorderProduct,
  fetchProducts,
  startDate,
  endDate,
}) => {
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [editProduct, setEditProduct] = useState(null);
  const [isEditProduct, setIsEditProduct] = useState(false);
  const [orderDetails, setOrderDetails] = useState(false);
  const [productOrderData, setProductOrderData] = useState(null);
const [assingProductToStore, setAssingProductToStore] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [viewDetailsProduct, setViewDetailsProduct] = useState<Product | null>(null);

  const openModal = () => setAssingProductToStore(true);
  const closeModal = () => setAssingProductToStore(false);
  // New state for summary popup
  const [summaryPopup, setSummaryPopup] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    type: "purchased" | "sell" | "remaining";
    product: Product;
  } | null>(null);

  // Purchase history state
  const [purchaseHistory, setPurchaseHistory] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [trashForm, setTrashForm] = useState({
    quantity: "",
    type: "box",
    reason: "",
  });
  const [addQuaForm, setAddQuaForm] = useState({
    quantity: "",
    type: "box",
    reason: "",
  });
  const token = useSelector((state: RootState) => state.auth?.token ?? null);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    let aValue = a[sortField as keyof Product];
    let bValue = b[sortField as keyof Product];

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue === bValue) return 0;

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      onProductsSelect([]);
    } else {
      onProductsSelect(products.map((p) => p.id));
    }
  };

  const handleSelectProduct = (id: string) => {
    const isSelected = selectedProducts.includes(id);
    if (isSelected) {
      onProductsSelect(selectedProducts.filter((p) => p !== id));
    } else {
      onProductsSelect([...selectedProducts, id]);
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  // Check if a product is nearing expiry (within 7 days)
  const isNearingExpiry = (product: Product) => {
    if (!product.expiryDate) return false;
    const today = new Date();
    const expiryDate = new Date(product.expiryDate);
    const warningDate = addDays(today, 7); // 7 days from now
    return isBefore(expiryDate, warningDate) && isAfter(expiryDate, today);
  };

  const handleDelete = async (id) => {
    await deleteProductAPI(id);
    fetchProducts();
  };

  // Check if a product is expired
  const isExpired = (product: Product) => {
    if (!product.expiryDate) return false;
    const today = new Date();
    const expiryDate = new Date(product.expiryDate);
    return isBefore(expiryDate, today);
  };

  const fetchProductOrder = async (id: string) => {
    const response = await getSingleProductOrderAPI(id, startDate, endDate);
    if (!response) return;

    setProductOrderData(response);
    setOrderDetails(true);
  };

  // Handle summary popup
  const handleSummaryClick = async (
    type: "purchased" | "sell" | "remaining",
    product: Product
  ) => {
    setSummaryData({ type, product });
    setSummaryPopup(true);
    
    // If it's purchased details, fetch purchase history
    if (type === "purchased") {
      await fetchPurchaseHistory(product._id || product.id);
    }
  };

  // Fetch purchase history
  const fetchPurchaseHistory = async (productId: string) => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${product.GET_PRODUCT_PURCHASE_HISTORY}/${productId}`);
      if (response.data.success) {
        setPurchaseHistory(response.data);
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
      toast.error('Failed to fetch purchase history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Get summary popup content
  const getSummaryContent = () => {
    if (!summaryData) return null;

    const { type, product } = summaryData;
    const summary = product.summary || {};

    switch (type) {
      case "purchased":
        return {
          title: "Purchased Details",
          icon: <ShoppingCart className="h-6 w-6 text-blue-600" />,
          total: summary.totalPurchase || 0,
          unit: summary.unitPurchase || 0,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        };
      case "sell":
        return {
          title: "Sell Details",
          icon: <TrendingUp className="h-6 w-6 text-green-600" />,
          total: summary.totalSell || 0,
          unit: summary.unitSell || 0,
          color: "text-green-600",
          bgColor: "bg-green-50",
        };
      case "remaining":
        return {
          title: "Remaining Details",
          icon: <Archive className="h-6 w-6 text-orange-600" />,
          total: summary.totalRemaining || 0,
          unit: summary.unitRemaining || 0,
          product: product,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
        };
      default:
        return null;
    }
  };

  const handleTrashSubmit = async () => {
    const { quantity, type, reason } = trashForm;

    // 💬 Validate inputs with toast
    if (!quantity || !type || !reason) {
      toast.warning("Please fill out all fields before submitting.");
      return;
    }

    try {
      // 🛠️ Submit to API
      await trashProductQuanityAPI(
        {
          productId: summaryData.product._id,
          quantity: Number(quantity),
          type,
          reason,
        },
        token
      );

      // 🔄 Reset UI
      setSummaryPopup(false);
      await fetchProducts();
      setTrashForm({ quantity: "", type: "box", reason: "" });
    } catch (err) {
      console.error("❌ Trash Submit Error:", err);
      toast.error("Something went wrong while submitting."); // ❌ error toast
    }
  };

  const handleAddQuantitySubmit = async () => {
    const { quantity, type, reason } = addQuaForm;

    // 💬 Validate inputs with toast
    if (!quantity || !type) {
      toast.warning("Please fill out all fields before submitting.");
      return;
    }

    try {
      // 🛠️ Submit to API
      await addQuantityProductAPI(
        {
          productId: summaryData.product._id,
          quantity: Number(quantity),
          type,
          reason,
        },
        token
      );

      // 🔄 Reset UI
      setSummaryPopup(false);
      await fetchProducts();
      setAddQuaForm({ quantity: "", type: "box", reason: "" });
    } catch (err) {
      console.error("❌ Trash Submit Error:", err);
      toast.error("Something went wrong while submitting."); // ❌ error toast
    }
  };

  const [editIndex, setEditIndex] = useState(null);
  const [quantities, setQuantities] = useState({});

  // जब डायलॉग खुले तो buyers की quantity को state में डाल दो
  useEffect(() => {
    if (productOrderData?.buyers) {
      const initial = {};
      productOrderData.buyers.forEach((b, i) => {
        initial[i] = b.quantity;
      });
      setQuantities(initial);
    }
  }, [productOrderData]);

  const handleQuantityChange = (index, value) => {
    if (value < 0) return; // negative ना होने दे
    setQuantities((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const saveQuantity = async (index) => {
    const newQty = quantities[index];
    const orderId = productOrderData.buyers[index].orderId;
    const productId = productOrderData?.productId;
    if (newQty < 1) {
      toast.error("❌ Quantity must be at least 1");
      return;
    }
    const updatedItem = await updateBuyerQuantityAPI(
      { orderId, productId, quantity: newQty },
      token
    );
    fetchProducts();
  };
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px]">
              <Checkbox
                checked={
                  selectedProducts.length === products.length &&
                  products.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="w-[60px]">Image</TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("name")}
            >
              <div className="flex items-center">
                Product {renderSortIcon("name")}
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center">Sales Mode</div>
            </TableHead>
            <TableHead className="text-right cursor-pointer">
              <div className="flex items-center justify-end">Purchased</div>
            </TableHead>
            <TableHead className="text-right cursor-pointer">
              <div className="flex items-center justify-end">Sell</div>
            </TableHead>
            <TableHead className="text-right cursor-pointer">
              <div className="flex items-center justify-end">Remaining</div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Truck className="h-4 w-4 text-purple-600" />
                Incoming
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Layers className="h-4 w-4" />
                Pallets
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end">Price</div>
            </TableHead>
            <TableHead
              className="text-right cursor-pointer"
              onClick={() => handleSort("lastUpdated")}
            >
              <div className="flex items-center justify-end">
                Updated {renderSortIcon("lastUpdated")}
              </div>
            </TableHead>
            <TableHead className="text-right">Order Actions</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProducts.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={13}
                className="text-center text-muted-foreground py-8"
              >
                No products found
              </TableCell>
            </TableRow>
          ) : (
            sortedProducts.map((product, productIndex) => {
              // Calculate pallet estimate for current stock
              const currentStock = product?.summary?.totalRemaining || 0;
              const totalCasesPerPallet = product?.palletCapacity?.totalCasesPerPallet || product?.manualCasesPerPallet || 0;
              const hasPalletData = totalCasesPerPallet && totalCasesPerPallet > 0;
              const estimatedPallets = hasPalletData && currentStock > 0
                ? Math.ceil(currentStock / totalCasesPerPallet)
                : 0;
              const fullPallets = hasPalletData && currentStock > 0
                ? Math.floor(currentStock / totalCasesPerPallet)
                : 0;
              const partialCases = hasPalletData && currentStock > 0
                ? currentStock % totalCasesPerPallet
                : 0;
              // Generate shortCode: use existing or create from index
              const shortCode = (product as any).shortCode || String(productIndex + 1).padStart(2, '0');

              return (
              <TableRow
                key={product.id}
                className={`
                  ${selectedProducts.includes(product.id) ? "bg-muted/40" : ""}
                  ${isExpired(product) ? "bg-red-50 dark:bg-red-950/20" : ""}
                  ${
                    isNearingExpiry(product) && !isExpired(product)
                      ? "bg-amber-50 dark:bg-amber-950/20"
                      : ""
                  }
                `}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={() => handleSelectProduct(product.id)}
                  />
                </TableCell>
                <TableCell>
                  {product.image ? (
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded-md"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground/70" />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium truncate max-w-[200px]">
                    <span className="text-primary font-mono mr-2">{shortCode}</span>
                    {product.name}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.palette && (
                      <div
                        className="w-3 h-3 rounded-full inline-block mr-1"
                        style={{ backgroundColor: product.palette }}
                      />
                    )}
                    {product.organic && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-300 text-xs"
                      >
                        Organic
                      </Badge>
                    )}
                    {product.origin && (
                      <Badge variant="outline" className="text-xs">
                        {product.origin}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {/* Sales Mode Column */}
                <TableCell className="text-center">
                  <SalesModeBadge salesMode={(product.salesMode as SalesMode) || "both"} size="sm" />
                </TableCell>
                <TableCell
                  className="text-right cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => handleSummaryClick("purchased", product)}
                >
                  <div className="font-medium text-blue-600 hover:text-blue-800">
                    {product?.summary?.totalPurchase || 0}
                  </div>
                </TableCell>
                <TableCell
                  className="text-right cursor-pointer hover:bg-green-50 transition-colors"
                  onClick={() => handleSummaryClick("sell", product)}
                >
                  <div className="font-medium text-green-600 hover:text-green-800">
                    {product?.summary?.totalSell || 0}
                  </div>
                </TableCell>
                <TableCell
                  className="text-right cursor-pointer hover:bg-orange-50 transition-colors"
                  onClick={() => handleSummaryClick("remaining", product)}
                >
                  <div className="font-medium text-orange-600 hover:text-orange-800">
                    {product?.summary?.totalRemaining || 0}
                  </div>
                </TableCell>
                {/* Incoming Stock Column - Current Week */}
                <TableCell className="text-center">
                  {(product?.summary?.incomingStock || 0) > 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1 cursor-help">
                            <span className="font-medium text-purple-600">
                              {product?.summary?.incomingStock || 0}
                            </span>
                            <Truck className="h-3 w-3 text-purple-500" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {product?.summary?.incomingStock} units expected this week
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                {/* Pallet Estimate Column */}
                <TableCell className="text-center">
                  {hasPalletData ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1 cursor-help">
                            {currentStock > 0 ? (
                              <span className="font-medium">~{estimatedPallets}</span>
                            ) : (
                              <span className="font-medium text-muted-foreground">{totalCasesPerPallet}/plt</span>
                            )}
                            {product.palletCapacity?.isManual && (
                              <span className="text-[10px] text-muted-foreground">(M)</span>
                            )}
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2 text-xs">
                            <p className="font-medium">
                              Pallet Breakdown 
                              {product.palletCapacity?.isManual && (
                                <span className="text-muted-foreground ml-1">(Manual Entry)</span>
                              )}
                            </p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <span className="text-muted-foreground">Cases/Layer:</span>
                              <span>{product.palletCapacity?.casesPerLayer || '~' + Math.ceil(totalCasesPerPallet / 5)}</span>
                              <span className="text-muted-foreground">Layers/Pallet:</span>
                              <span>{product.palletCapacity?.layersPerPallet || '~5'}</span>
                              <span className="text-muted-foreground">Total/Pallet:</span>
                              <span className="font-medium">{totalCasesPerPallet}</span>
                            </div>
                            {currentStock > 0 ? (
                              <>
                                <hr className="border-border" />
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  <span className="text-muted-foreground">Current Stock:</span>
                                  <span>{currentStock} cases</span>
                                  <span className="text-muted-foreground">Full Pallets:</span>
                                  <span>{fullPallets}</span>
                                  {partialCases > 0 && (
                                    <>
                                      <span className="text-muted-foreground">Partial:</span>
                                      <span>{partialCases} cases</span>
                                    </>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <hr className="border-border" />
                                <p className="text-muted-foreground">No stock - add inventory to see pallet count</p>
                              </>
                            )}
                            <p className="text-amber-600 text-[10px] mt-2 border-t pt-1">
                              ⚠️ {product.palletCapacity?.isManual ? "Manual entry" : "Estimates only"} - verify for actual shipping
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {product.pricePerBox && product.boxSize ? (
                    <div className="flex items-center justify-end gap-1">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        ${product.pricePerBox.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(product.lastUpdated).toLocaleDateString()}
                </TableCell>
                <TableCell
                  onClick={() => fetchProductOrder(product?._id)}
                  className="text-right text-muted-foreground cursor-pointer underline text-blue-800"
                >
                  Total
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditProduct(product.id);
                            setIsEditProduct(true);
                          }}
                        >
                          <FileEdit className="h-4 w-4 mr-2" />
                           Edit
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem
                          onClick={() => onReorderProduct(product)}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Reorder
                        </DropdownMenuItem> */}
                        {/* <DropdownMenuItem
                          onClick={() => {
                            setViewDetailsProduct(product);
                            setIsViewDetailsOpen(true);
                          }}
                        >
                          <Info className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem> */}
                        <DropdownMenuItem
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600"
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProduct} onOpenChange={setIsEditProduct}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Edit Product
            </DialogTitle>
          </DialogHeader>
          <AddProductForm
            onSuccess={() => {
              fetchProducts();
              setIsEditProduct(false);
            }}
            editProduct={editProduct}
            isEditProduct={isEditProduct}
          />
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={orderDetails} onOpenChange={setOrderDetails}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Order Details {startDate} - {endDate}
            </DialogTitle>
          </DialogHeader>

          {productOrderData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left Side: Image and Title */}
                <div className="flex items-center gap-4">
                  <img
                    src={productOrderData.productImage || "/placeholder.svg"}
                    alt={productOrderData.productTitle}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  <h3 className="text-lg font-medium">
                    {productOrderData.productTitle}
                  </h3>
                </div>

                {/* Right Side: Refresh Button */}
                <button
                  onClick={async () => {
                    await refreshSingleProductAPI(productOrderData?.productId);
                    fetchProducts();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Refresh History
                </button>
              </div>
              <br />
               <div>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Assign Product To Store
      </button>

      
    </div>

              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-2">Buyers</h4>
                {productOrderData.buyers &&
                productOrderData.buyers.length > 0 ? (
                  <div className="space-y-3">
                    {productOrderData.buyers.map((buyer, index) => (
                      <div
                        key={index}
                        className="border-b pb-2 last:border-b-0 last:pb-0"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{buyer.name}</span>

                          {editIndex === index ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={quantities[index]}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    index,
                                    parseInt(e.target.value)
                                  )
                                }
                                className="w-20 border rounded px-2 py-1"
                              />
                              <button
                                onClick={() => saveQuantity(index)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                {quantities[index] ?? buyer.quantity}
                              </span>

                              {/* Original Manage button */}
                              <button
                                onClick={() => setEditIndex(index)}
                                className="px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-xs"
                              >
                                Manage
                              </button>

                              {/* New Full Order Manage button */}
                              <Link
                                to={`/orders/edit/${buyer.orderId}`}
                                className="px-2 py-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 text-xs"
                              >
                                Full Order
                              </Link>
                            </div>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {new Date(buyer.orderDate).toLocaleDateString()} at{" "}
                          {new Date(buyer.orderDate).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No orders in the last 7 days
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
  <div>Total Orders - {productOrderData?.totalOrdersThisWeek}</div>

  {(() => {
    const currentProduct = products.find(
      p => p._id === productOrderData?.productId
    );
    const remaining = currentProduct?.summary?.totalRemaining || 0;

    return (
      <span>
        Remaining Products: <span className="text-orange-600">{remaining}</span>
      </span>
    );
  })()}
</div>

            </div>
          )}
        </DialogContent>
      </Dialog>
      <AssingeProductToStore
        isOpen={assingProductToStore}
        onClose={closeModal}
        productId={productOrderData?.productId}
      />

      {/* Summary Popup Dialog */}
      <Dialog open={summaryPopup} onOpenChange={(open) => {
        setSummaryPopup(open);
        if (!open) {
          setPurchaseHistory(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              {getSummaryContent()?.icon}
              {getSummaryContent()?.title}
            </DialogTitle>
          </DialogHeader>
          {summaryData && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <img
                  src={summaryData.product.image || "/placeholder.svg"}
                  alt={summaryData.product.name}
                  className="w-12 h-12 object-cover rounded-md"
                />
                <div>
                  <h3 className="font-medium text-sm">
                    {summaryData.product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {typeof summaryData.product.category === 'object' ? summaryData.product.category?.categoryName : summaryData.product.category}
                  </p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-lg border-2 ${
                    getSummaryContent()?.bgColor
                  } border-opacity-20`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3
                      className={`h-5 w-5 ${getSummaryContent()?.color}`}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Total
                    </span>
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      getSummaryContent()?.color
                    }`}
                  >
                    {getSummaryContent()?.total}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border-2 ${
                    getSummaryContent()?.bgColor
                  } border-opacity-20`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Box className={`h-5 w-5 ${getSummaryContent()?.color}`} />
                    <span className="text-sm font-medium text-gray-700">
                      Unit
                    </span>
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      getSummaryContent()?.color
                    }`}
                  >
                    {getSummaryContent()?.unit}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {summaryData.product.unit}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">
                    {new Date(
                      summaryData.product.lastUpdated
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Purchase History - Only for Purchased Details */}
              {getSummaryContent()?.title === "Purchased Details" && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Purchase History
                  </h4>
                  
                  {loadingHistory ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading purchase history...</p>
                    </div>
                  ) : purchaseHistory ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50 rounded-lg">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total Orders</p>
                          <p className="font-semibold text-blue-600">{purchaseHistory.detailedHistory?.length || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Consistency</p>
                          <p className={`font-semibold ${purchaseHistory.summary?.isConsistent ? 'text-green-600' : 'text-red-600'}`}>
                            {purchaseHistory.summary?.isConsistent ? '✅ Good' : '⚠️ Issue'}
                          </p>
                        </div>
                      </div>

                      {/* Date-wise Summary */}
                      {purchaseHistory.dateWiseSummary?.map((dateEntry: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-medium text-sm">
                              {new Date(dateEntry.date).toLocaleDateString()}
                            </h5>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Qty: {dateEntry.totalQuantity}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            {dateEntry.purchaseOrders?.map((po: any, poIndex: number) => (
                              <div key={poIndex} className="flex justify-between text-xs text-muted-foreground">
                                <span>PO: {po.purchaseOrderNumber}</span>
                                <span>{po.vendorName}</span>
                                <span>Qty: {po.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* No history message */}
                      {(!purchaseHistory.dateWiseSummary || purchaseHistory.dateWiseSummary.length === 0) && (
                        <div className="text-center py-4 text-muted-foreground">
                          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No purchase history found</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">Click to load purchase history</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Trash Quantity Update Form - Only for Remaining */}
          {getSummaryContent()?.title === "Remaining Details" && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-600">
                <Trash2 className="w-4 h-4" />
                Move Quantity to Trash
              </h4>

              <div className="space-y-3">
                {/* Quantity Input */}
                <div>
                  <label className="block text-sm font-medium">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={trashForm.quantity}
                    onChange={(e) =>
                      setTrashForm({ ...trashForm, quantity: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                {/* Type Select */}
                <div>
                  <label className="block text-sm font-medium">Type</label>
                  <select
                    value={trashForm.type}
                    onChange={(e) =>
                      setTrashForm({ ...trashForm, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="box">Box</option>
                    {/* <option value="unit">Unit</option> */}
                  </select>
                </div>

                {/* Reason Input */}
                <div>
                  <label className="block text-sm font-medium">Reason</label>
                  <input
                    type="text"
                    value={trashForm.reason}
                    onChange={(e) =>
                      setTrashForm({ ...trashForm, reason: e.target.value })
                    }
                    placeholder="e.g. Expired or Broken"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleTrashSubmit}
                  className="w-full mt-2 bg-red-600 text-white py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Update Trash
                </button>
              </div>
            </div>
          )}

          {getSummaryContent()?.title === "Remaining Details TEST" && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-green-600">
                <Trash2 className="w-4 h-4" />
                Add Quantity to Manually
              </h4>

              <div className="space-y-3">
                {/* Quantity Input */}
                <div>
                  <label className="block text-sm font-medium">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={addQuaForm.quantity}
                    onChange={(e) =>
                      setAddQuaForm({ ...addQuaForm, quantity: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                {/* Type Select */}
                <div>
                  <label className="block text-sm font-medium">Type</label>
                  <select
                    value={addQuaForm.type}
                    onChange={(e) =>
                      setAddQuaForm({ ...addQuaForm, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="box">Box</option>
                    {/* <option value="unit">Unit</option> */}
                  </select>
                </div>

                <div className=" flex flex-col">
                  <p>
                    {" "}
                    Previous Update Box :{" "}
                    {getSummaryContent()?.product?.manuallyAddBox?.quantity ||
                      0}
                  </p>
                  <p>
                    Previous Update Unit :{" "}
                    {getSummaryContent()?.product?.manuallyAddUnit?.quantity ||
                      0}
                  </p>
                </div>
                {/* Submit Button */}
                <button
                  onClick={handleAddQuantitySubmit}
                  className="w-full mt-2 bg-green-600 text-white py-2 rounded-md text-sm font-medium hover:bg-green-700"
                >
                  Update Quantity
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Info className="h-5 w-5" />
              Product Details
            </DialogTitle>
          </DialogHeader>
          {viewDetailsProduct && (
            <div className="space-y-6">
              {/* Product Header */}
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {viewDetailsProduct.image ? (
                    <img src={viewDetailsProduct.image} alt={viewDetailsProduct.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{viewDetailsProduct.name}</h3>
                  <p className="text-sm text-muted-foreground">{typeof viewDetailsProduct.category === 'object' ? viewDetailsProduct.category?.categoryName : viewDetailsProduct.category || "Uncategorized"}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {viewDetailsProduct.organic && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                        Organic
                      </Badge>
                    )}
                    {viewDetailsProduct.origin && (
                      <Badge variant="outline" className="text-xs">
                        {viewDetailsProduct.origin}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Stock Information */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{viewDetailsProduct.summary?.totalPurchase || 0}</p>
                  <p className="text-xs text-blue-600/80">Purchased</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{viewDetailsProduct.summary?.totalSell || 0}</p>
                  <p className="text-xs text-green-600/80">Sold</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{viewDetailsProduct.summary?.totalRemaining || 0}</p>
                  <p className="text-xs text-orange-600/80">Remaining</p>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="space-y-3">
                <h4 className="font-medium">Pricing</h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-semibold">${viewDetailsProduct.price?.toFixed(2) || "0.00"}</p>
                  </div>
                  {viewDetailsProduct.pricePerBox && (
                    <div>
                      <p className="text-xs text-muted-foreground">Price Per Box</p>
                      <p className="font-semibold">${viewDetailsProduct.pricePerBox.toFixed(2)}</p>
                    </div>
                  )}
                  {viewDetailsProduct.boxSize && (
                    <div>
                      <p className="text-xs text-muted-foreground">Box Size</p>
                      <p className="font-semibold">{viewDetailsProduct.boxSize}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Inventory Value</p>
                    <p className="font-semibold">${((viewDetailsProduct.price || 0) * (viewDetailsProduct.summary?.totalRemaining || 0)).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-3">
                <h4 className="font-medium">Additional Details</h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
                  {viewDetailsProduct.unit && (
                    <div>
                      <p className="text-xs text-muted-foreground">Unit</p>
                      <p>{viewDetailsProduct.unit}</p>
                    </div>
                  )}
                  {viewDetailsProduct.storageInstructions && (
                    <div>
                      <p className="text-xs text-muted-foreground">Storage Instructions</p>
                      <p>{viewDetailsProduct.storageInstructions}</p>
                    </div>
                  )}
                  {viewDetailsProduct.expiryDate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Expiry Date</p>
                      <p>{new Date(viewDetailsProduct.expiryDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {viewDetailsProduct.batchInfo && (
                    <div>
                      <p className="text-xs text-muted-foreground">Batch Info</p>
                      <p>{viewDetailsProduct.batchInfo}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p>{viewDetailsProduct.lastUpdated ? new Date(viewDetailsProduct.lastUpdated).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewDetailsProduct.description && (
                <div className="space-y-2">
                  <h4 className="font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">{viewDetailsProduct.description}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>Close</Button>
            <Button onClick={() => {
              setIsViewDetailsOpen(false);
              setEditProduct(viewDetailsProduct?.id);
              setIsEditProduct(true);
            }}>
              <FileEdit className="h-4 w-4 mr-2" /> Edit Product
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryTable;
