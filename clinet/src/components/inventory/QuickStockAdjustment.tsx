"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Package, Zap, Search } from "lucide-react";
import { toast } from "react-toastify";
import { addQuantityProductAPI, trashProductQuanityAPI } from "@/services2/operations/product";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

interface Product {
  id: string;
  _id?: string;
  name: string;
  image?: string;
  summary?: {
    totalRemaining?: number;
    unitRemaining?: number;
  };
}

interface QuickStockAdjustmentProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSuccess: () => void;
}

const QuickStockAdjustment: React.FC<QuickStockAdjustmentProps> = ({
  isOpen,
  onClose,
  products,
  onSuccess,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [unitType, setUnitType] = useState<"box" | "unit">("box");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const token = useSelector((state: RootState) => state.auth?.token ?? null);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedProduct || !quantity || Number(quantity) <= 0) {
      toast.warning("Please select a product and enter a valid quantity");
      return;
    }

    if (adjustmentType === "remove" && !reason) {
      toast.warning("Please provide a reason for removing stock");
      return;
    }

    setLoading(true);
    try {
      const productId = selectedProduct._id || selectedProduct.id;

      if (adjustmentType === "add") {
        await addQuantityProductAPI(
          {
            productId,
            quantity: Number(quantity),
            type: unitType,
            reason: reason || "Manual adjustment",
          },
          token
        );
        toast.success(`Added ${quantity} ${unitType}(s) to ${selectedProduct.name}`);
      } else {
        await trashProductQuanityAPI(
          {
            productId,
            quantity: Number(quantity),
            type: unitType,
            reason,
          },
          token
        );
        toast.success(`Removed ${quantity} ${unitType}(s) from ${selectedProduct.name}`);
      }

      // Reset form
      setSelectedProduct(null);
      setQuantity("");
      setReason("");
      onSuccess();
    } catch (error) {
      console.error("Stock adjustment error:", error);
      toast.error("Failed to adjust stock");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdjust = async (product: Product, type: "add" | "remove", amount: number) => {
    setLoading(true);
    try {
      const productId = product._id || product.id;

      if (type === "add") {
        await addQuantityProductAPI(
          {
            productId,
            quantity: amount,
            type: "box",
            reason: "Quick adjustment",
          },
          token
        );
        toast.success(`+${amount} box to ${product.name}`);
      } else {
        await trashProductQuanityAPI(
          {
            productId,
            quantity: amount,
            type: "box",
            reason: "Quick adjustment",
          },
          token
        );
        toast.success(`-${amount} box from ${product.name}`);
      }
      onSuccess();
    } catch (error) {
      toast.error("Quick adjustment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Stock Adjustment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Products */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Adjust List */}
          <div className="border rounded-lg max-h-[200px] overflow-y-auto">
            {filteredProducts.slice(0, 10).map((product) => (
              <div
                key={product.id}
                className={`flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50 ${
                  selectedProduct?.id === product.id ? "bg-blue-50" : ""
                }`}
              >
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-sm">{product.name}</div>
                    <div className="text-xs text-gray-500">
                      Stock: {product.summary?.totalRemaining || 0} boxes
                    </div>
                  </div>
                </div>

                {/* Quick +/- Buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                    onClick={() => handleQuickAdjust(product, "remove", 1)}
                    disabled={loading}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                    onClick={() => handleQuickAdjust(product, "add", 1)}
                    disabled={loading}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="p-4 text-center text-gray-500">No products found</div>
            )}
          </div>

          {/* Detailed Adjustment Form */}
          {selectedProduct && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedProduct.name}</Badge>
                <span className="text-sm text-gray-500">
                  Current: {selectedProduct.summary?.totalRemaining || 0} boxes
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Adjustment Type */}
                <div>
                  <label className="text-sm font-medium">Action</label>
                  <Select
                    value={adjustmentType}
                    onValueChange={(v) => setAdjustmentType(v as "add" | "remove")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">
                        <span className="flex items-center gap-2">
                          <Plus className="h-3 w-3 text-green-600" /> Add Stock
                        </span>
                      </SelectItem>
                      <SelectItem value="remove">
                        <span className="flex items-center gap-2">
                          <Minus className="h-3 w-3 text-red-600" /> Remove Stock
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Unit Type */}
                <div>
                  <label className="text-sm font-medium">Unit</label>
                  <Select
                    value={unitType}
                    onValueChange={(v) => setUnitType(v as "box" | "unit")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="unit">Unit (lb)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>

              {/* Reason (required for remove) */}
              {adjustmentType === "remove" && (
                <div>
                  <label className="text-sm font-medium">Reason *</label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Expired, Damaged, Returned"
                  />
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full ${
                  adjustmentType === "add"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading ? "Processing..." : `${adjustmentType === "add" ? "Add" : "Remove"} Stock`}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickStockAdjustment;
