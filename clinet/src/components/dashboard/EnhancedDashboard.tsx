"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Store,
  Package,
  AlertTriangle,
  Users,
  CreditCard,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getEnhancedDashboardData, getDashboardData } from "@/services2/operations/order";
import WeeklySalesChart from "./WeeklySalesChart";
import MonthlyRevenueChart from "./MonthlyRevenueChart";
import OrderStatusChart from "./OrderStatusChart";

interface EnhancedDashboardData {
  weeklySales: {
    total: number;
    orderCount: number;
    avgOrderValue: number;
    changePercent: number;
  };
  vendorPayments: {
    outstanding: number;
    unpaidCount: number;
  };
  weeklyExpenses: {
    total: number;
    purchaseCount: number;
  };
  dailySales: Array<{ day: string; sales: number; orders: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number; orders: number }>;
  topStores: Array<{
    storeName: string;
    ownerName: string;
    email: string;
    totalAmount: number;
    orderCount: number;
    avgOrderValue: number;
  }>;
  underperformingStores: Array<{
    storeName: string;
    ownerName: string;
    email: string;
    decline: number;
    currentWeek: { orderCount: number; totalAmount: number };
    lastWeek: { orderCount: number; totalAmount: number };
    noOrdersLastWeek?: boolean;
  }>;
  orderStatusDistribution: Array<{ _id: string; count: number; amount: number }>;
  lowStockProducts: Array<{ name: string; quantity: number; unit: string }>;
  outOfStockProducts: Array<{ name: string; quantity: number; unit: string }>;
}

interface BasicDashboardData {
  totalOrders: number;
  totalStores: number;
  totalAmount: number;
  totalReceived: number;
  totalPending: number;
  topUsers: Array<any>;
}

export default function EnhancedDashboard() {
  const [enhancedData, setEnhancedData] = useState<EnhancedDashboardData | null>(null);
  const [basicData, setBasicData] = useState<BasicDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [enhanced, basic] = await Promise.all([
          getEnhancedDashboardData(),
          getDashboardData(),
        ]);
        
        if (enhanced?.data) {
          setEnhancedData(enhanced.data);
        }
        if (basic?.data) {
          setBasicData(basic.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const receivedPercentage = basicData
    ? Math.round((basicData.totalReceived / basicData.totalAmount) * 100) || 0
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row 1 - Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Weekly Sales */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Weekly Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {formatCurrency(enhancedData?.weeklySales?.total || 0)}
            </div>
            <div className="flex items-center mt-1">
              {(enhancedData?.weeklySales?.changePercent || 0) >= 0 ? (
                <Badge variant="secondary" className="bg-green-200 text-green-800">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {enhancedData?.weeklySales?.changePercent || 0}%
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-200 text-red-800">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  {Math.abs(enhancedData?.weeklySales?.changePercent || 0)}%
                </Badge>
              )}
              <span className="text-xs text-green-700 ml-2">vs last week</span>
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Avg Order Value</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(enhancedData?.weeklySales?.avgOrderValue || 0)}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {enhancedData?.weeklySales?.orderCount || 0} orders this week
            </p>
          </CardContent>
        </Card>

        {/* Vendor Payment Outstanding */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Vendor Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {formatCurrency(enhancedData?.vendorPayments?.outstanding || 0)}
            </div>
            <p className="text-xs text-orange-700 mt-1">
              {enhancedData?.vendorPayments?.unpaidCount || 0} unpaid invoices
            </p>
          </CardContent>
        </Card>

        {/* Weekly Expenses */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Weekly Expenses</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(enhancedData?.weeklyExpenses?.total || 0)}
            </div>
            <p className="text-xs text-purple-700 mt-1">
              {enhancedData?.weeklyExpenses?.purchaseCount || 0} purchases
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards Row 2 - Overall Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{basicData?.totalOrders?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{basicData?.totalStores?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Active stores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(basicData?.totalAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">All time sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Received Amount</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(basicData?.totalReceived || 0)}</div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{receivedPercentage}% collected</span>
                <span className="text-muted-foreground">
                  {formatCurrency(basicData?.totalPending || 0)} pending
                </span>
              </div>
              <Progress value={receivedPercentage} className="h-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Sales Trend</CardTitle>
            <CardDescription>Daily sales performance this week</CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklySalesChart data={enhancedData?.dailySales || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <CardDescription>Distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            <OrderStatusChart data={enhancedData?.orderStatusDistribution || []} />
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Trend</CardTitle>
          <CardDescription>Revenue performance over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyRevenueChart data={enhancedData?.monthlyRevenue || []} />
        </CardContent>
      </Card>

      {/* Store Performance Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Performing Stores */}
        <Card className="h-[540px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top Performing Stores
            </CardTitle>
            <CardDescription>Best performers this month</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enhancedData?.topStores?.map((store, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                              {store.storeName?.substring(0, 2).toUpperCase() || "ST"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{store.storeName}</div>
                            <div className="text-xs text-muted-foreground">{store.ownerName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{store.orderCount}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(store.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!enhancedData?.topStores || enhancedData.topStores.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Underperforming Stores */}
        <Card className="h-[540px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Stores Needing Attention
            </CardTitle>
            <CardDescription>Stores with no orders or declining performance</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-right">This Week</TableHead>
                    <TableHead className="text-right">Decline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enhancedData?.underperformingStores?.map((store, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={`${store.noOrdersLastWeek ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'} text-xs`}>
                              {store.storeName?.substring(0, 2).toUpperCase() || "ST"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{store.storeName}</div>
                            <div className="text-xs text-muted-foreground">{store.ownerName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {store.noOrdersLastWeek ? (
                          <span className="text-orange-600 text-sm">No orders</span>
                        ) : (
                          <span>{store.currentWeek?.orderCount || 0} orders</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {store.noOrdersLastWeek ? (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            Inactive
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            -{Math.round(store.decline || 0)}%
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!enhancedData?.underperformingStores || enhancedData.underperformingStores.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        All stores performing well! 🎉
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Low Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>Products running low (≤10 units)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enhancedData?.lowStockProducts?.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                  <span className="font-medium text-sm">{product.name}</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    {product.quantity} {product.unit || "units"}
                  </Badge>
                </div>
              ))}
              {(!enhancedData?.lowStockProducts || enhancedData.lowStockProducts.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  All products well stocked! ✓
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Out of Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-red-600" />
              Out of Stock
            </CardTitle>
            <CardDescription>Products that need immediate restocking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enhancedData?.outOfStockProducts?.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <span className="font-medium text-sm">{product.name}</span>
                  <Badge variant="destructive">Out of Stock</Badge>
                </div>
              ))}
              {(!enhancedData?.outOfStockProducts || enhancedData.outOfStockProducts.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No products out of stock! ✓
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
