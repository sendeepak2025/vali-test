"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Store,
  Package,
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getRegionalOrderTrendsAPI } from "@/services2/operations/order";
import { useSelector } from "react-redux";

interface StoreInfo {
  storeId: string;
  storeName: string;
  ownerName: string;
  city: string;
}

interface WeeklyData {
  year: number;
  week: number;
  totalOrders: number;
  totalAmount: number;
  totalPallets: number;
  activeStores: number;
  storesList?: StoreInfo[];
  avgOrderValue: number;
}

interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalAmount: number;
  orderCount: number;
}

interface RegionData {
  state: string;
  totalStores: number;
  allStores: StoreInfo[];
  activeStores: StoreInfo[];
  summary: {
    totalOrders: number;
    totalAmount: number;
    totalPallets: number;
    avgWeeklyPallets: number;
    avgOrderValue: number;
  };
  currentWeek: {
    orders: number;
    amount: number;
    pallets: number;
    activeStores: number;
    storesList: StoreInfo[];
  };
  lastWeek: {
    orders: number;
    amount: number;
    pallets: number;
  };
  growth: {
    orders: number;
    amount: number;
  };
  weeklyTrend: WeeklyData[];
  topProducts: TopProduct[];
}

interface Summary {
  totalRegions: number;
  totalOrders: number;
  totalAmount: number;
  totalPallets: number;
  avgWeeklyPallets: number;
  weeksAnalyzed: number;
}

export default function RegionalDashboard() {
  const [regionData, setRegionData] = useState<RegionData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeksToAnalyze, setWeeksToAnalyze] = useState("4");
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const { token } = useSelector((state: any) => state.auth);

  useEffect(() => {
    fetchData();
  }, [weeksToAnalyze]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getRegionalOrderTrendsAPI(token, parseInt(weeksToAnalyze));

      if (response?.success && response?.data) {
        setRegionData(response.data.regions || []);
        setSummary(response.data.summary || null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Week Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Regional Order Trends</h2>
          <p className="text-sm text-muted-foreground">
            Analyze order patterns by region for warehouse planning
          </p>
        </div>
        <Select value={weeksToAnalyze} onValueChange={setWeeksToAnalyze}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">Last 2 Weeks</SelectItem>
            <SelectItem value="4">Last 4 Weeks</SelectItem>
            <SelectItem value="8">Last 8 Weeks</SelectItem>
            <SelectItem value="12">Last 12 Weeks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Active Regions</CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{summary?.totalRegions || 0}</div>
            <p className="text-xs text-blue-700 mt-1">States with orders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {summary?.totalOrders?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-green-700 mt-1">In last {weeksToAnalyze} weeks</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(summary?.totalAmount || 0)}
            </div>
            <p className="text-xs text-purple-700 mt-1">Across all regions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Avg Weekly Pallets</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{summary?.avgWeeklyPallets || 0}</div>
            <p className="text-xs text-orange-700 mt-1">Warehouse planning estimate</p>
          </CardContent>
        </Card>
      </div>

      {/* Regional Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Regional Order Analysis
          </CardTitle>
          <CardDescription>Weekly order trends by state - Click to expand for details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead className="text-center">Stores</TableHead>
                <TableHead className="text-center">This Week</TableHead>
                <TableHead className="text-center">Last Week</TableHead>
                <TableHead className="text-center">Growth</TableHead>
                <TableHead className="text-right">Avg Weekly Pallets</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regionData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No order data available for the selected period.
                  </TableCell>
                </TableRow>
              ) : (
                regionData.map((region) => (
                  <>
                    <TableRow
                      key={region.state}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        setExpandedRegion(expandedRegion === region.state ? null : region.state)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{region.state || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{region.totalStores}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-medium">{region.currentWeek.orders} orders</span>
                          <span className="text-xs text-muted-foreground">
                            {region.currentWeek.activeStores} active stores
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span>{region.lastWeek.orders} orders</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {region.growth.orders > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : region.growth.orders < 0 ? (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          ) : null}
                          <Badge
                            variant={region.growth.orders >= 0 ? "default" : "destructive"}
                            className={`text-xs ${region.growth.orders >= 0 ? "bg-green-100 text-green-700" : ""}`}
                          >
                            {region.growth.orders > 0 ? "+" : ""}
                            {region.growth.orders}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {region.summary.avgWeeklyPallets}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(region.summary.totalAmount)}
                      </TableCell>
                      <TableCell>
                        {expandedRegion === region.state ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedRegion === region.state && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Top Products */}
                            <div className="bg-white rounded-lg border p-4">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4 text-blue-500" />
                                Top Products in {region.state}
                              </h4>
                              {region.topProducts.length > 0 ? (
                                <div className="space-y-2">
                                  {region.topProducts.map((product, idx) => (
                                    <div
                                      key={product.productId || idx}
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground w-4">{idx + 1}.</span>
                                        <span className="truncate max-w-[150px]">
                                          {product.productName || "Unknown Product"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {product.totalQuantity} units
                                        </Badge>
                                        <span className="text-muted-foreground text-xs">
                                          {formatCurrency(product.totalAmount)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No product data</p>
                              )}
                            </div>

                            {/* Active Stores This Week */}
                            <div className="bg-white rounded-lg border p-4">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Store className="h-4 w-4 text-green-500" />
                                All Stores ({region.allStores?.length || region.totalStores || 0})
                              </h4>
                              {region.allStores && region.allStores.length > 0 ? (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                  {region.allStores.map((store, idx) => (
                                    <div
                                      key={store.storeId || idx}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                                          {store.storeName?.substring(0, 2).toUpperCase() || "ST"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate text-xs">
                                          {store.storeName || "Unknown Store"}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          {store.ownerName} • {store.city}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No stores in this region</p>
                              )}
                            </div>

                            {/* Weekly Trend */}
                            <div className="bg-white rounded-lg border p-4">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-purple-500" />
                                Weekly Trend
                              </h4>
                              <div className="space-y-2">
                                {region.weeklyTrend.slice(0, 4).map((week, idx) => (
                                  <div
                                    key={`${week.year}-${week.week}`}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="text-muted-foreground text-xs">
                                      Week {week.week}, {week.year}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs">{week.totalOrders} orders</span>
                                      <Badge variant="outline" className="text-xs">
                                        {week.totalPallets} pallets
                                      </Badge>
                                      <span className="font-medium text-xs">
                                        {formatCurrency(week.totalAmount)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Summary Stats */}
                          <div className="mt-4 grid grid-cols-4 gap-4">
                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-blue-900">
                                {region.summary.totalOrders}
                              </div>
                              <div className="text-xs text-blue-700">Total Orders</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-green-900">
                                {formatCurrency(region.summary.avgOrderValue)}
                              </div>
                              <div className="text-xs text-green-700">Avg Order Value</div>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-purple-900">
                                {region.summary.totalPallets}
                              </div>
                              <div className="text-xs text-purple-700">Total Pallets</div>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-orange-900">
                                {region.activeStores?.length || 0}/{region.totalStores}
                              </div>
                              <div className="text-xs text-orange-700">Active Stores</div>
                            </div>
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
    </div>
  );
}
