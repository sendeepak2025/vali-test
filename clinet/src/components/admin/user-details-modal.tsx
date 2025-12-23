"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  User,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  Store,
  User2,
  Calendar,
  Package,
  AlertCircle,
  Ban,
  Building2,
  CreditCard,
  TrendingUp,
  FileText,
  RefreshCw,
  Download,
  DollarSign,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Eye,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  BadgeDollarSign,
  CircleDollarSign,
} from "lucide-react";
import { PaymentStatusPopup } from "../orders/PaymentUpdateModel";
import type { Order } from "@/lib/data";
import { Button } from "../ui/button";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { StatementFilterPopup } from "./StatementPopup";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createVendorCreditMemoAPI } from "@/services2/operations/vendorCreditMemo";

interface UserDetailsProps {
  isOpen: boolean;
  vendor?: boolean;
  onClose: () => void;
  fetchUserDetailsOrder: (id: string) => void;
  userData: {
    _id: string;
    totalOrders: number;
    totalSpent: number;
    balanceDue: number;
    totalPay: number;
    orders: Order[];
    user: {
      _id: string;
      email: string;
      phone: string;
      storeName: string;
      ownerName: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      businessDescription: string;
      role: string;
      createdAt: string;
    };
  } | null;
}

const UserDetailsModal = ({
  isOpen,
  onClose,
  userData,
  fetchUserDetailsOrder,
  vendor = false,
}: UserDetailsProps) => {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [paymentOrder, setpaymentOrder] = useState<Order | null>(null);
  const [orderIdDB, setOrderIdDB] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [isGeneratingPDF] = useState(false);
  const [isStatementFilterOpen, setIsStatementFilterOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Credit Request Modal State
  const [isCreditRequestOpen, setIsCreditRequestOpen] = useState(false);
  const [selectedOrderForCredit, setSelectedOrderForCredit] = useState<any>(null);
  const [creditRequestForm, setCreditRequestForm] = useState({
    reasonCategory: "",
    description: "",
    amount: "",
  });
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  const token = useSelector((state: RootState) => state.auth?.token ?? null);

  if (!userData) return null;

  const { totalOrders, totalSpent, user, orders, totalPay, balanceDue } =
    userData;
  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  // Calculate payment progress
  const paymentProgress = totalSpent > 0 ? (totalPay / totalSpent) * 100 : 0;

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return <Clock className="w-4 h-4 mr-1" />;
      case "processing":
        return <Package className="w-4 h-4 mr-1" />;
      case "shipped":
        return <Truck className="w-4 h-4 mr-1" />;
      case "delivered":
      case "completed":
        return <CheckCircle2 className="w-4 h-4 mr-1" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 mr-1" />;
      default:
        return null;
    }
  };

  const getPaymentIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return <Clock className="w-4 h-4 mr-1" />;
      case "paid":
        return <BadgeDollarSign className="w-4 h-4 mr-1" />;
      case "processing":
        return <CircleDollarSign className="w-4 h-4 mr-1" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "partial":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUserDetailsOrder(userData._id);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Open credit request modal
  const openCreditRequestModal = (order?: any) => {
    setSelectedOrderForCredit(order || null);
    setCreditRequestForm({
      reasonCategory: "",
      description: "",
      amount: order ? "" : "",
    });
    setIsCreditRequestOpen(true);
  };

  // Handle credit request submission
  const handleCreditRequestSubmit = async () => {
    if (!creditRequestForm.reasonCategory || !creditRequestForm.description || !creditRequestForm.amount) {
      return;
    }

    setIsSubmittingCredit(true);
    try {
      const formData = {
        vendorId: userData._id,
        linkedPurchaseOrderId: selectedOrderForCredit?._id || null,
        reasonCategory: creditRequestForm.reasonCategory,
        description: creditRequestForm.description,
        amount: parseFloat(creditRequestForm.amount),
        type: "credit",
      };

      const result = await createVendorCreditMemoAPI(formData, token);
      if (result?.success) {
        setIsCreditRequestOpen(false);
        setCreditRequestForm({ reasonCategory: "", description: "", amount: "" });
        setSelectedOrderForCredit(null);
        // Refresh data
        fetchUserDetailsOrder(userData._id);
      }
    } catch (error) {
      console.error("Error creating credit request:", error);
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  // Reason categories for credit requests
  const reasonCategories = [
    { value: "quality_issue", label: "Quality Issue" },
    { value: "short_shipment", label: "Short Shipment" },
    { value: "price_correction", label: "Price Correction" },
    { value: "return", label: "Return" },
    { value: "spoilage", label: "Spoilage" },
    { value: "bruising", label: "Bruising" },
    { value: "size_variance", label: "Size Variance" },
    { value: "temperature_damage", label: "Temperature Damage" },
    { value: "pest_damage", label: "Pest Damage" },
    { value: "ripeness_issues", label: "Ripeness Issues" },
    { value: "weight_variance", label: "Weight Variance" },
    { value: "other", label: "Other" },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0">
          {/* Header Section with Gradient */}
          <div className={`${vendor ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-blue-600 to-cyan-600'} px-6 py-5 text-white`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-white/30 shadow-lg">
                  <AvatarFallback className={`${vendor ? 'bg-purple-800' : 'bg-blue-800'} text-white text-lg font-semibold`}>
                    {getInitials(user?.storeName || user?.ownerName || "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{user?.storeName || "Unknown"}</h2>
                  {user?.ownerName && user.ownerName !== "N/A" && (
                    <p className="text-white/80 text-sm flex items-center gap-1">
                      <User2 className="h-3 w-3" />
                      {user.ownerName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                      {vendor ? <Building2 className="h-3 w-3 mr-1" /> : <Store className="h-3 w-3 mr-1" />}
                      {vendor ? "Vendor" : (user?.role || "Store")}
                    </Badge>
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      Since {formattedDate}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="text-white hover:bg-white/20"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Refresh</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsStatementFilterOpen(true)}
                        disabled={isGeneratingPDF}
                        className="text-white hover:bg-white/20"
                      >
                        <Download className={`h-4 w-4 ${isGeneratingPDF ? 'animate-pulse' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Download Statement</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Quick Stats in Header */}
            <div className="grid grid-cols-4 gap-4 mt-5">
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                  <Receipt className="h-3 w-3" />
                  Total Orders
                </div>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                  <DollarSign className="h-3 w-3" />
                  Total Amount
                </div>
                <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Paid
                </div>
                <p className="text-2xl font-bold text-green-300">{formatCurrency(totalPay)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                  <AlertCircle className="h-3 w-3" />
                  Balance Due
                </div>
                <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-300' : 'text-green-300'}`}>
                  {formatCurrency(balanceDue)}
                </p>
              </div>
            </div>

            {/* Payment Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Payment Progress</span>
                <span>{paymentProgress.toFixed(1)}%</span>
              </div>
              <Progress value={paymentProgress} className="h-2 bg-white/20" />
            </div>
          </div>

          {/* Content Section */}
          <div className="overflow-y-auto max-h-[calc(95vh-280px)]">
            <Tabs defaultValue="info" className="w-full">
              <div className="sticky top-0 bg-white z-10 border-b px-6 pt-4">
                <TabsList className={`grid w-full ${vendor ? 'grid-cols-3' : 'grid-cols-2'} mb-4`}>
                  <TabsTrigger value="info" className="gap-2">
                    {vendor ? <Building2 className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                    {vendor ? "Vendor" : "Store"} Information
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Orders ({totalOrders})
                  </TabsTrigger>
                  {vendor && (
                    <TabsTrigger value="accounting" className="gap-2">
                      <Wallet className="h-4 w-4" />
                      Accounting
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="info" className="px-6 pb-6 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                  {/* Contact Information */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> Email
                            </span>
                            {user?.email && user.email !== "N/A" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(user.email)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Copy</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <p className={`font-medium text-sm ${!user?.email || user.email === "N/A" ? 'text-muted-foreground italic' : ''}`}>
                            {user?.email && user.email !== "" ? user.email : "Not provided"}
                          </p>
                        </div>
                        <div className="space-y-1 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> Phone
                            </span>
                            {user?.phone && user.phone !== "N/A" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(user.phone)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Copy</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <p className={`font-medium text-sm ${!user?.phone || user.phone === "N/A" ? 'text-muted-foreground italic' : ''}`}>
                            {user?.phone && user.phone !== "" ? user.phone : "Not provided"}
                          </p>
                        </div>
                        <div className="space-y-1 p-3 bg-gray-50 rounded-lg col-span-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Address
                          </span>
                          <p className={`font-medium text-sm ${!user?.address || user.address === "N/A" ? 'text-muted-foreground italic' : ''}`}>
                            {user?.address && user.address !== "" ? (
                              <>
                                {user.address}
                                {(user?.city || user?.state || user?.zipCode) && (
                                  <span className="text-muted-foreground">
                                    {" "}• {[user?.city, user?.state, user?.zipCode].filter(Boolean).join(", ")}
                                  </span>
                                )}
                              </>
                            ) : "Not provided"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => setIsStatementFilterOpen(true)}
                        disabled={isGeneratingPDF}
                      >
                        <FileText className="h-4 w-4" />
                        {isGeneratingPDF ? "Generating..." : "Download Statement"}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh Data
                      </Button>
                      {vendor && (
                        <>
                          <Separator className="my-2" />
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => openCreditRequestModal()}
                          >
                            <CreditCard className="h-4 w-4" />
                            Request Credit
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Financial Summary */}
                  <Card className="lg:col-span-3">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        Financial Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <Receipt className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                          <p className="text-xs text-muted-foreground">Total Orders</p>
                          <p className="text-xl font-bold text-blue-700">{totalOrders}</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                          <DollarSign className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                          <p className="text-xs text-muted-foreground">Total Amount</p>
                          <p className="text-xl font-bold text-purple-700">{formatCurrency(totalSpent)}</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                          <ArrowUpRight className="h-6 w-6 mx-auto text-green-600 mb-2" />
                          <p className="text-xs text-muted-foreground">Total Paid</p>
                          <p className="text-xl font-bold text-green-700">{formatCurrency(totalPay)}</p>
                        </div>
                        <div className={`text-center p-4 rounded-lg border ${balanceDue > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                          <ArrowDownRight className={`h-6 w-6 mx-auto mb-2 ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`} />
                          <p className="text-xs text-muted-foreground">Balance Due</p>
                          <p className={`text-xl font-bold ${balanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>
                            {formatCurrency(balanceDue)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Business Description */}
                  {user?.businessDescription && (
                    <Card className="lg:col-span-3">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Business Description
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{user.businessDescription}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

            <TabsContent value="orders" className="px-6 pb-6 mt-0">
              <div className="mt-4">
                {orders.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                    <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-muted-foreground">No orders found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {orders.length} {vendor ? "purchase orders" : "orders"}
                      </p>
                    </div>
                    
                    <Accordion type="single" collapsible className="space-y-2">
                      {orders.map((order: any) => (
                        <AccordionItem 
                          key={order._id} 
                          value={order._id}
                          className="border rounded-lg px-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                        >
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between text-left gap-2">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${vendor ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                  <Receipt className={`h-4 w-4 ${vendor ? 'text-purple-600' : 'text-blue-600'}`} />
                                </div>
                                <div>
                                  <div className="font-semibold text-sm">
                                    {order.orderNumber || order.purchaseOrderNumber || `Order #${order._id?.slice(-6)}`}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(order.purchaseDate || order.createdAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                    <span className="text-gray-300">•</span>
                                    <Package className="h-3 w-3" />
                                    {order.items?.length || 0} items
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={`text-xs ${getStatusColor(order.status)}`}>
                                  {getStatusIcon(order.status)}
                                  <span className="capitalize">{order.status}</span>
                                </Badge>
                                <Badge variant="outline" className={`text-xs ${getStatusColor(order.paymentStatus || "pending")}`}>
                                  {getPaymentIcon(order.paymentStatus || "pending")}
                                  <span className="capitalize">
                                    {(order.paymentStatus || "pending")?.toLowerCase() === "pending" ? "Unpaid" : order.paymentStatus}
                                  </span>
                                </Badge>
                                <span className={`font-bold text-sm ${order?.isDelete ? 'text-red-500 line-through' : ''}`}>
                                  {formatCurrency(order?.isDelete ? order?.deleted?.amount || 0 : order.total)}
                                </span>
                                {order?.isDelete && <Ban className="w-4 h-4 text-red-500" />}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Separator className="mb-4" />
                            <div className="space-y-4">
                              {/* Order Items Table */}
                              <div className="rounded-lg border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-50">
                                      <TableHead className="text-xs font-semibold">Product</TableHead>
                                      <TableHead className="text-xs font-semibold text-right">Price</TableHead>
                                      <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                                      <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {order.items?.map((item: any, itemIndex: number) => (
                                      <TableRow key={`${order._id}-item-${itemIndex}`} className="text-sm">
                                        <TableCell className="font-medium py-2">
                                          {item.name || item.productName}
                                        </TableCell>
                                        <TableCell className="text-right py-2">
                                          {formatCurrency(item?.unitPrice || item?.price)}
                                        </TableCell>
                                        <TableCell className="text-right py-2">
                                          {order?.isDelete ? (
                                            <span className="line-through text-muted-foreground">
                                              {item.deletedQuantity} {item.pricingType === "unit" ? "LB" : ""}
                                            </span>
                                          ) : (
                                            <>{item.quantity} {item.pricingType === "unit" ? "LB" : ""}</>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right py-2">
                                          {order?.isDelete ? (
                                            <span className="line-through text-muted-foreground">
                                              {formatCurrency(item.deletedTotal || 0)}
                                            </span>
                                          ) : (
                                            formatCurrency((item?.unitPrice || item?.price) * item.quantity)
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>

                              {/* Order Summary */}
                              <div className="flex justify-end">
                                <div className="w-64 space-y-1 text-sm">
                                  <div className="flex justify-between py-1">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{formatCurrency(order.total - (order.shippinCost || 0))}</span>
                                  </div>
                                  {order.shippinCost !== undefined && order.shippinCost > 0 && (
                                    <div className="flex justify-between py-1">
                                      <span className="text-muted-foreground">Shipping</span>
                                      <span>{formatCurrency(order.shippinCost)}</span>
                                    </div>
                                  )}
                                  <Separator />
                                  <div className="flex justify-between py-1 font-bold">
                                    <span>Total</span>
                                    <span className={order?.isDelete ? 'text-red-500 line-through' : ''}>
                                      {formatCurrency(order?.isDelete ? order?.deleted?.amount || 0 : order.total)}
                                    </span>
                                  </div>
                                  {order.paymentAmount > 0 && (
                                    <>
                                      <div className="flex justify-between py-1 text-green-600">
                                        <span>Paid</span>
                                        <span>{formatCurrency(order.paymentAmount)}</span>
                                      </div>
                                      <div className="flex justify-between py-1 text-red-600 font-medium">
                                        <span>Balance</span>
                                        <span>{formatCurrency(order.total - (order.paymentAmount || 0))}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Payment Info & Actions */}
                              <div className="flex items-start justify-between gap-4 pt-2">
                                {order.paymentDetails && (
                                  <div className="flex-1 bg-gray-50 p-3 rounded-lg text-xs space-y-1">
                                    <p className="font-semibold text-gray-700 mb-2">Payment Details</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <span className="text-muted-foreground">Status:</span>
                                        <span className="ml-1 font-medium">
                                          {order.paymentStatus === "partial" ? "Partial" : "Paid"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Amount:</span>
                                        <span className="ml-1 font-medium">{formatCurrency(order.paymentAmount || 0)}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Method:</span>
                                        <span className="ml-1 font-medium capitalize">{order.paymentDetails.method || "N/A"}</span>
                                      </div>
                                      {order.paymentDetails.method === "creditcard" && order.paymentDetails.transactionId && (
                                        <div>
                                          <span className="text-muted-foreground">Txn ID:</span>
                                          <span className="ml-1 font-medium">{order.paymentDetails.transactionId}</span>
                                        </div>
                                      )}
                                    </div>
                                    {order.paymentDetails.notes && (
                                      <div className="mt-2 pt-2 border-t">
                                        <span className="text-muted-foreground">Notes:</span>
                                        <span className="ml-1">{order.paymentDetails.notes}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {!order?.isDelete && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setOrderId(order.orderNumber || order.purchaseOrderNumber);
                                      setOpen(true);
                                      setTotalAmount(order.total);
                                      setOrderIdDB(order?._id || order?.id);
                                      setpaymentOrder(order);
                                    }}
                                    className={order.paymentStatus === "pending" ? "bg-green-600 hover:bg-green-700" : ""}
                                  >
                                    <CreditCard className="h-4 w-4 mr-1" />
                                    {order.paymentStatus === "pending" ? "Record Payment" : "Edit Payment"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Accounting Tab - Vendor Only */}
            {vendor && (
              <TabsContent value="accounting" className="px-6 pb-6 mt-0">
                <div className="mt-4 space-y-6">
                  {/* Aging Summary */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Payment Aging Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-5 gap-3">
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                          <p className="text-xs text-muted-foreground">Current</p>
                          <p className="text-lg font-bold text-green-700">
                            {formatCurrency(
                              orders.filter((o: any) => {
                                const balance = (o.total || o.totalAmount || 0) - (parseFloat(o.paymentAmount) || 0);
                                return balance > 0 && o.paymentStatus !== 'paid';
                              }).reduce((sum: number, o: any) => sum + ((o.total || o.totalAmount || 0) - (parseFloat(o.paymentAmount) || 0)), 0)
                            )}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                          <p className="text-xs text-muted-foreground">1-30 Days</p>
                          <p className="text-lg font-bold text-yellow-700">$0.00</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                          <p className="text-xs text-muted-foreground">31-60 Days</p>
                          <p className="text-lg font-bold text-orange-700">$0.00</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                          <p className="text-xs text-muted-foreground">61-90 Days</p>
                          <p className="text-lg font-bold text-red-700">$0.00</p>
                        </div>
                        <div className="text-center p-3 bg-red-100 rounded-lg border border-red-200">
                          <p className="text-xs text-muted-foreground">90+ Days</p>
                          <p className="text-lg font-bold text-red-800">$0.00</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Outstanding Orders with Due Dates */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        Outstanding Orders
                      </CardTitle>
                      <CardDescription>Orders with pending balance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {orders.filter((o: any) => o.paymentStatus !== 'paid').length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto text-green-300 mb-2" />
                          <p>All orders are paid!</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {orders
                            .filter((o: any) => o.paymentStatus !== 'paid')
                            .map((order: any) => {
                              const orderTotal = order.total || order.totalAmount || 0;
                              const paidAmount = parseFloat(order.paymentAmount) || 0;
                              const balance = orderTotal - paidAmount;
                              const orderDate = new Date(order.purchaseDate || order.createdAt);
                              // Calculate due date (assuming Net 30 if not specified)
                              const dueDate = order.dueDate ? new Date(order.dueDate) : new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                              const isOverdue = new Date() > dueDate && balance > 0;
                              const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

                              return (
                                <div
                                  key={order._id}
                                  className={`p-3 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-100' : 'bg-purple-100'}`}>
                                        <Receipt className={`h-4 w-4 ${isOverdue ? 'text-red-600' : 'text-purple-600'}`} />
                                      </div>
                                      <div>
                                        <p className="font-semibold text-sm">
                                          {order.orderNumber || order.purchaseOrderNumber || `Order #${order._id?.slice(-6)}`}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <span>Order: {orderDate.toLocaleDateString()}</span>
                                          <span>•</span>
                                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                            Due: {dueDate.toLocaleDateString()}
                                            {isOverdue && ` (${daysOverdue} days overdue)`}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-muted-foreground">Balance Due</p>
                                      <p className={`text-lg font-bold ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                                        {formatCurrency(balance)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-xs">
                                      <span>Total: {formatCurrency(orderTotal)}</span>
                                      <span className="text-green-600">Paid: {formatCurrency(paidAmount)}</span>
                                      {(order.totalCreditApplied || 0) > 0 && (
                                        <span className="text-blue-600">Credit: {formatCurrency(order.totalCreditApplied)}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isOverdue && (
                                        <Badge variant="destructive" className="text-xs">
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Overdue
                                        </Badge>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-blue-600 hover:bg-blue-50"
                                        onClick={() => openCreditRequestModal(order)}
                                      >
                                        <CreditCard className="h-3 w-3 mr-1" />
                                        Credit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setOrderId(order.orderNumber || order.purchaseOrderNumber);
                                          setOpen(true);
                                          setTotalAmount(order.total || order.totalAmount);
                                          setOrderIdDB(order?._id || order?.id);
                                          setpaymentOrder(order);
                                        }}
                                      >
                                        <DollarSign className="h-3 w-3 mr-1" />
                                        Pay
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payment History Summary */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        Payment Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">Total Billed</span>
                          <span className="font-semibold">{formatCurrency(totalSpent)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">Total Paid</span>
                          <span className="font-semibold text-green-600">{formatCurrency(totalPay)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">Vendor Credits Applied</span>
                          <span className="font-semibold text-blue-600">
                            {formatCurrency((userData as any)?.totalCreditApplied || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="font-medium">Outstanding Balance</span>
                          <span className={`text-xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(balanceDue)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Vendor Credits Actions */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        Vendor Credits
                      </CardTitle>
                      <CardDescription>Request credits linked to purchase orders</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Request Credit - Main Action */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <CreditCard className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">Request Credit</p>
                              <p className="text-xs text-muted-foreground">Quality issues, returns, price corrections</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-white hover:bg-blue-50"
                            onClick={() => openCreditRequestModal()}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Request Credit
                          </Button>
                        </div>

                        {/* Apply Credit to Order */}
                        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <ArrowDownRight className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">Apply Credit</p>
                              <p className="text-xs text-muted-foreground">Apply available credits to orders</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-white hover:bg-green-50"
                            onClick={() => {
                              window.location.href = `/vendors?tab=payments&vendorId=${userData._id}`;
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Manage Payments
                          </Button>
                        </div>

                        {/* View All Credits */}
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 md:col-span-2">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <FileText className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">Credit History</p>
                              <p className="text-xs text-muted-foreground">View all credit requests and their status</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-white hover:bg-purple-50"
                            onClick={() => {
                              window.location.href = `/vendors?tab=credits&vendorId=${userData._id}`;
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Credit History
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentStatusPopup
        open={open}
        onOpenChange={setOpen}
        orderId={orderId}
        totalAmount={totalAmount}
        id={orderIdDB}
        fetchOrders={() => fetchUserDetailsOrder(userData._id)}
        onPayment={() => console.log("hello")}
        paymentOrder={paymentOrder}
        purchase={vendor}
      />

      <StatementFilterPopup
        isOpen={isStatementFilterOpen}
        onClose={() => setIsStatementFilterOpen(false)}
        userId={userData._id}
        token={token}
        vendor={vendor}
      />

      {/* Credit Request Modal */}
      <Dialog open={isCreditRequestOpen} onOpenChange={setIsCreditRequestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Request Credit
            </DialogTitle>
            <DialogDescription>
              Submit a credit request for quality issues, returns, or price corrections.
              {selectedOrderForCredit && " This will be linked to the selected order."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Linked Order Selection */}
            <div className="space-y-2">
              <Label>Link to Purchase Order</Label>
              <Select
                value={selectedOrderForCredit?._id || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setSelectedOrderForCredit(null);
                  } else {
                    const order = orders.find((o: any) => o._id === value);
                    setSelectedOrderForCredit(order);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an order (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked order</SelectItem>
                  {orders.map((order: any) => (
                    <SelectItem key={order._id} value={order._id}>
                      {order.orderNumber || order.purchaseOrderNumber || `Order #${order._id?.slice(-6)}`} - {formatCurrency(order.total || order.totalAmount || 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOrderForCredit && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {selectedOrderForCredit.orderNumber || selectedOrderForCredit.purchaseOrderNumber}
                    </span>
                    <span className="text-blue-600 font-semibold">
                      {formatCurrency(selectedOrderForCredit.total || selectedOrderForCredit.totalAmount || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(selectedOrderForCredit.purchaseDate || selectedOrderForCredit.createdAt).toLocaleDateString()}
                    {" • "}
                    {selectedOrderForCredit.items?.length || 0} items
                  </p>
                </div>
              )}
            </div>

            {/* Reason Category */}
            <div className="space-y-2">
              <Label>Reason Category <span className="text-red-500">*</span></Label>
              <Select
                value={creditRequestForm.reasonCategory}
                onValueChange={(value) => setCreditRequestForm(prev => ({ ...prev, reasonCategory: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasonCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Credit Amount <span className="text-red-500">*</span></Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-9"
                  value={creditRequestForm.amount}
                  onChange={(e) => setCreditRequestForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              
              {/* Smart Amount Options */}
              {selectedOrderForCredit && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Order total: {formatCurrency(selectedOrderForCredit.total || selectedOrderForCredit.totalAmount || 0)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[10, 25, 50, 100].map((percent) => {
                      const orderTotal = selectedOrderForCredit.total || selectedOrderForCredit.totalAmount || 0;
                      const amount = (orderTotal * percent / 100).toFixed(2);
                      return (
                        <Button
                          key={percent}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => setCreditRequestForm(prev => ({ ...prev, amount }))}
                        >
                          {percent}% ({formatCurrency(parseFloat(amount))})
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Quick Amount Presets (when no order selected) */}
              {!selectedOrderForCredit && (
                <div className="flex flex-wrap gap-2">
                  {[25, 50, 100, 250, 500].map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setCreditRequestForm(prev => ({ ...prev, amount: amt.toString() }))}
                    >
                      {formatCurrency(amt)}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Describe the issue or reason for credit request..."
                rows={3}
                value={creditRequestForm.description}
                onChange={(e) => setCreditRequestForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreditRequestOpen(false);
                setCreditRequestForm({ reasonCategory: "", description: "", amount: "" });
                setSelectedOrderForCredit(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreditRequestSubmit}
              disabled={isSubmittingCredit || !creditRequestForm.reasonCategory || !creditRequestForm.description || !creditRequestForm.amount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmittingCredit ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserDetailsModal;
