"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Store,
  Package,
  Search,
  MapPin,
  AlertTriangle,
  ArrowRightLeft,
  Plus,
  Minus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getStoreInventoryAPI,
  getStoresWithInventoryAPI,
  adjustStoreInventoryAPI,
  transferInventoryAPI,
} from "@/services2/operations/storeInventory";
import { getAllStoresAPI } from "@/services2/operations/auth";

interface StoreInventoryFilterProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
}

const StoreInventoryFilter: React.FC<StoreInventoryFilterProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [storeInventory, setStoreInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  
  // Transfer state
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferData, setTransferData] = useState({
    fromStore: "",
    toStore: "",
    productId: "",
    quantity: 1,
  });

  useEffect(() => {
    if (isOpen) {
      fetchStores();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedStore) {
      fetchStoreInventory(selectedStore);
    }
  }, [selectedStore]);

  const fetchStores = async () => {
    try {
      const response = await getAllStoresAPI();
      if (response && Array.isArray(response)) {
        setStores(response);
        if (response.length > 0 && !selectedStore) {
          setSelectedStore(response[0]._id);
        }
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchStoreInventory = async (storeId: string) => {
    setLoading(true);
    try {
      const response = await getStoreInventoryAPI(storeId, {
        search: searchTerm,
        stockStatus: stockFilter,
        limit: 100,
      });
      if (response?.data) {
        setStoreInventory(response.data);
      }
    } catch (error) {
      console.error("Error fetching store inventory:", error);
      // If no store inventory exists, show products with 0 quantity
      setStoreInventory(
        products.map((p) => ({
          product: p._id || p.id,
          productName: p.name,
          productImage: p.image,
          quantity: 0,
          available: 0,
          stockStatus: "out-of-stock",
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustInventory = async (
    productId: string,
    type: "add" | "remove",
    quantity: number = 1
  ) => {
    if (!selectedStore) return;

    try {
      await adjustStoreInventoryAPI({
        storeId: selectedStore,
        productId,
        quantity,
        type,
        unitType: "box",
        reason: `Quick ${type} from inventory filter`,
      });
      toast.success(`Stock ${type === "add" ? "added" : "removed"} successfully`);
      fetchStoreInventory(selectedStore);
    } catch (error) {
      toast.error("Failed to adjust inventory");
    }
  };

  const handleTransfer = async () => {
    if (!transferData.fromStore || !transferData.toStore || !transferData.productId) {
      toast.warning("Please fill all transfer fields");
      return;
    }

    try {
      await transferInventoryAPI({
        fromStoreId: transferData.fromStore,
        toStoreId: transferData.toStore,
        productId: transferData.productId,
        quantity: transferData.quantity,
        unitType: "box",
        reason: "Manual transfer",
      });
      toast.success("Inventory transferred successfully");
      setShowTransfer(false);
      setTransferData({ fromStore: "", toStore: "", productId: "", quantity: 1 });
      if (selectedStore) {
        fetchStoreInventory(selectedStore);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Transfer failed");
    }
  };

  // Filter inventory
  const filteredInventory = storeInventory.filter((item) => {
    const matchesSearch = item.productName
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStock =
      stockFilter === "all" ||
      item.stockStatus === stockFilter ||
      (stockFilter === "low" && item.quantity > 0 && item.quantity <= (item.reorderPoint || 10)) ||
      (stockFilter === "out-of-stock" && item.quantity <= 0);
    return matchesSearch && matchesStock;
  });

  const selectedStoreData = stores.find((s) => s._id === selectedStore);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600" />
            Store-Specific Inventory
          </DialogTitle>
        </DialogHeader>

        {/* Store Selector and Filters */}
        <div className="flex flex-wrap gap-3 pb-4 border-b">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[250px]">
              <Store className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select Store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store._id} value={store._id}>
                  {store.storeName} - {store.city}, {store.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="normal">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTransfer(!showTransfer)}
            className="gap-2"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedStore && fetchStoreInventory(selectedStore)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Store Info Card */}
        {selectedStoreData && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Store className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{selectedStoreData.storeName}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedStoreData.city}, {selectedStoreData.state} • {selectedStoreData.ownerName}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">{filteredInventory.length}</div>
                  <div className="text-muted-foreground">Products</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">
                    {filteredInventory.reduce((sum, i) => sum + (i.quantity || 0), 0)}
                  </div>
                  <div className="text-muted-foreground">Total Units</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-yellow-600">
                    {filteredInventory.filter((i) => i.stockStatus === "low").length}
                  </div>
                  <div className="text-muted-foreground">Low Stock</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Panel */}
        {showTransfer && (
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transfer Inventory Between Stores
              </h4>
              <div className="grid grid-cols-5 gap-3">
                <Select
                  value={transferData.fromStore}
                  onValueChange={(v) => setTransferData({ ...transferData, fromStore: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="From Store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store._id} value={store._id}>
                        {store.storeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={transferData.toStore}
                  onValueChange={(v) => setTransferData({ ...transferData, toStore: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="To Store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores
                      .filter((s) => s._id !== transferData.fromStore)
                      .map((store) => (
                        <SelectItem key={store._id} value={store._id}>
                          {store.storeName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Select
                  value={transferData.productId}
                  onValueChange={(v) => setTransferData({ ...transferData, productId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product._id || product.id} value={product._id || product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  min="1"
                  value={transferData.quantity}
                  onChange={(e) =>
                    setTransferData({ ...transferData, quantity: parseInt(e.target.value) || 1 })
                  }
                  placeholder="Qty"
                />

                <Button onClick={handleTransfer} className="bg-purple-600 hover:bg-purple-700">
                  Transfer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No inventory found for this store
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => (
                    <TableRow key={item.product || item._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            {item.categoryName && (
                              <div className="text-xs text-muted-foreground">
                                {item.categoryName}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.quantity || 0}
                      </TableCell>
                      <TableCell className="text-center">{item.available || 0}</TableCell>
                      <TableCell className="text-center">
                        {item.stockStatus === "out-of-stock" || item.quantity <= 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : item.stockStatus === "low" ||
                          item.quantity <= (item.reorderPoint || 10) ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            In Stock
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                            onClick={() =>
                              handleAdjustInventory(item.product || item._id, "remove")
                            }
                            disabled={item.quantity <= 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                            onClick={() =>
                              handleAdjustInventory(item.product || item._id, "add")
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoreInventoryFilter;
