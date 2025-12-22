"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Store,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInventoryByRegionAPI, getStoresWithInventoryAPI } from "@/services2/operations/storeInventory";

interface RegionData {
  _id: string;
  state: string;
  storeCount: number;
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
}

interface StoreData {
  _id: string;
  storeName: string;
  ownerName: string;
  email: string;
  state: string;
  city: string;
  inventory: {
    totalProducts: number;
    totalQuantity: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

export default function RegionalDashboard() {
  const [regionData, setRegionData] = useState<RegionData[]>([]);
  const [storeData, setStoreData] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>("all");
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [regionRes, storeRes] = await Promise.all([
        getInventoryByRegionAPI(),
        getStoresWithInventoryAPI(),
      ]);

      if (regionRes?.data) {
        setRegionData(regionRes.data);
      }
      if (storeRes?.data) {
        setStoreData(storeRes.data);
      }
    } catch (error) {
      console.error("Error fetching regional data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  // Calculate totals
  const totals = regionData.reduce(
    (acc, region) => ({
      stores: acc.stores + (region.storeCount || 0),
      products: acc.products + (region.totalProducts || 0),
      quantity: acc.quantity + (region.totalQuantity || 0),
      value: acc.value + (region.totalValue || 0),
      lowStock: acc.lowStock + (region.lowStockItems || 0),
      outOfStock: acc.outOfStock + (region.outOfStockItems || 0),
    }),
    { stores: 0, products: 0, quantity: 0, value: 0, lowStock: 0, outOfStock: 0 }
  );

  // Filter stores by selected state
  const filteredStores =
    selectedState === "all"
      ? storeData
      : storeData.filter((s) => s.state?.toLowerCase() === selectedState.toLowerCase());

  // Get unique states
  const states = [...new Set(regionData.map((r) => r.state).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Regions</CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{regionData.length}</div>
            <p className="text-xs text-blue-700 mt-1">{totals.stores} stores across all regions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(totals.value)}</div>
            <p className="text-xs text-green-700 mt-1">{totals.quantity.toLocaleString()} total units</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{totals.lowStock}</div>
            <p className="text-xs text-yellow-700 mt-1">Across all regions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Out of Stock</CardTitle>
            <Package className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{totals.outOfStock}</div>
            <p className="text-xs text-red-700 mt-1">Need immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Regional Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Regional Inventory Overview
          </CardTitle>
          <CardDescription>Inventory distribution by state/region</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead className="text-center">Stores</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead className="text-center">Total Qty</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-center">Stock Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regionData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No regional data available. Initialize store inventories to see data.
                  </TableCell>
                </TableRow>
              ) : (
                regionData.map((region) => (
                  <>
                    <TableRow
                      key={region._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        setExpandedRegion(expandedRegion === region._id ? null : region._id)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{region.state || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{region.storeCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{region.totalProducts}</TableCell>
                      <TableCell className="text-center">
                        {region.totalQuantity?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(region.totalValue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {region.lowStockItems > 0 && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              {region.lowStockItems} low
                            </Badge>
                          )}
                          {region.outOfStockItems > 0 && (
                            <Badge variant="destructive">{region.outOfStockItems} out</Badge>
                          )}
                          {region.lowStockItems === 0 && region.outOfStockItems === 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              Good
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {expandedRegion === region._id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedRegion === region._id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {storeData
                              .filter(
                                (s) => s.state?.toLowerCase() === region.state?.toLowerCase()
                              )
                              .map((store) => (
                                <div
                                  key={store._id}
                                  className="p-3 bg-white rounded-lg border shadow-sm"
                                >
                                  <div className="font-medium text-sm truncate">
                                    {store.storeName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {store.city}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2 text-xs">
                                    <span>{store.inventory?.totalQuantity || 0} units</span>
                                    {(store.inventory?.lowStockCount || 0) > 0 && (
                                      <Badge variant="outline" className="text-xs bg-yellow-50">
                                        {store.inventory.lowStockCount} low
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Store Filter and List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-green-600" />
                Store Inventory Status
              </CardTitle>
              <CardDescription>Individual store inventory levels</CardDescription>
            </div>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state} value={state.toLowerCase()}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStores.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No stores found for the selected filter.
              </div>
            ) : (
              filteredStores.map((store) => {
                const hasIssues =
                  (store.inventory?.lowStockCount || 0) > 0 ||
                  (store.inventory?.outOfStockCount || 0) > 0;
                return (
                  <Card
                    key={store._id}
                    className={`${
                      hasIssues ? "border-yellow-300 bg-yellow-50/30" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{store.storeName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {store.city}, {store.state}
                          </p>
                        </div>
                        {hasIssues ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <Package className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Products:</span>
                          <span className="ml-1 font-medium">
                            {store.inventory?.totalProducts || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Qty:</span>
                          <span className="ml-1 font-medium">
                            {store.inventory?.totalQuantity || 0}
                          </span>
                        </div>
                      </div>
                      {hasIssues && (
                        <div className="mt-3 flex gap-2">
                          {(store.inventory?.lowStockCount || 0) > 0 && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              {store.inventory.lowStockCount} low stock
                            </Badge>
                          )}
                          {(store.inventory?.outOfStockCount || 0) > 0 && (
                            <Badge variant="destructive">
                              {store.inventory.outOfStockCount} out
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
