"use client"

import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { RootState } from "@/redux/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  FileText, Receipt, Mail, DollarSign, 
  CheckCircle2, AlertCircle, Clock, Loader2,
  TrendingUp, TrendingDown, CreditCard
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { formatCurrency } from "@/utils/formatters"
import { getAllOrderAPI, getStatement } from "@/services2/operations/order"
import { StatementFilterPopup } from "../admin/StatementPopup"

interface Transaction {
  date: string
  type: string
  description: string
  debit: number
  credit: number
  orderId?: string
}

interface StatementData {
  store: {
    name: string
    ownerName: string
    address: string
    city: string
    state: string
    zipCode: string
    email: string
    phone: string
  }
  summary: {
    totalInvoiced: number
    totalPaid: number
    balanceDue: number
    statementDate: string
  }
  transactions: Transaction[]
}

const StoreInvoiceStatement = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("invoices")
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  const [statement, setStatement] = useState<StatementData | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showOrderDetail, setShowOrderDetail] = useState(false)
  const [sendingStatement, setSendingStatement] = useState(false)
const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isStatementFilterOpen, setIsStatementFilterOpen] = useState(false);
  const user = useSelector((state: RootState) => state.auth?.user ?? null)
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  useEffect(() => {
    fetchData()
  }, [user, token])

  const fetchData = async () => {
    if (!user?._id || !token) return
    setLoading(true)
    try {
      // Fetch orders
      const ordersRes = await getAllOrderAPI(token)
      setOrders(ordersRes?.orders || [])

      // Fetch statement
      try {
        const statementRes = await getStatement(user._id, token)
        setStatement(statementRes?.statement || null)
      } catch (e) {
        // Statement not available
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to load data" })
    } finally {
      setLoading(false)
    }
  }

  const handleSendStatementEmail = async () => {
    if (!user?._id) return
    setSendingStatement(true)
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/store/${user._id}/send-statement`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      )
      if (response.ok) {
        toast({ title: "Statement Sent", description: "Statement has been sent to your email." })
      } else {
        throw new Error("Failed to send statement")
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to send statement email" })
    } finally {
      setSendingStatement(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      processing: "bg-blue-100 text-blue-700",
      shipped: "bg-purple-100 text-purple-700",
      delivered: "bg-green-100 text-green-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700"
    }
    return <Badge className={styles[status] || "bg-gray-100 text-gray-700"}>{status}</Badge>
  }

  const getPaymentBadge = (status: string) => {
    if (status === "paid") return <Badge className="bg-green-100 text-green-700">Paid</Badge>
    if (status === "partial") return <Badge className="bg-yellow-100 text-yellow-700">Partial</Badge>
    return <Badge className="bg-red-100 text-red-700">Unpaid</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const totalInvoiced = statement?.summary?.totalInvoiced || orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const totalPaid = statement?.summary?.totalPaid || orders.filter(o => o.paymentStatus === "paid").reduce((sum, o) => sum + (o.total || 0), 0)
  const balanceDue = statement?.summary?.balanceDue || (totalInvoiced - totalPaid)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Total Invoiced</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(totalInvoiced)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600">Total Paid</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={balanceDue > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${balanceDue > 0 ? "bg-red-100" : "bg-green-100"}`}>
                <AlertCircle className={`h-5 w-5 ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
              <div>
                <p className={`text-sm ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>Balance Due</p>
                <p className={`text-xl font-bold ${balanceDue > 0 ? "text-red-700" : "text-green-700"}`}>
                  {formatCurrency(balanceDue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-white border">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="statement" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Statement
          </TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Your Invoices
                </span>
                <Badge variant="outline">{orders.length} Total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No invoices found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {orders.map((order) => (
                    <div 
                      key={order._id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => { setSelectedOrder(order); setShowOrderDetail(true) }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Invoice #{order.orderNumber || order._id?.slice(-6)}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(order.createdAt || Date.now()), "MMM dd, yyyy")} • {order.items?.length || 0} items
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(order.total || 0)}</p>
                        <div className="flex items-center gap-2 justify-end mt-1">
                          {getStatusBadge(order.status)}
                          {getPaymentBadge(order.paymentStatus)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statement Tab */}
        <TabsContent value="statement">
          <Card>
            <CardHeader>

<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  {/* Title */}
  <div className="flex items-center gap-2">
    <Receipt className="h-5 w-5 text-slate-700" />
    <span className="text-lg font-semibold text-slate-800">
      Account Statement
    </span>
  </div>

  {/* Button */}
  <Button
    onClick={() => setIsStatementFilterOpen(true)}
    disabled={isGeneratingPDF}
    className="
      w-full sm:w-full md:w-auto
      bg-blue-600 hover:bg-blue-700
      text-white font-medium
      px-4 py-2
      rounded-lg
      flex items-center justify-center
      disabled:opacity-60
    "
  >
    {isGeneratingPDF ? "Generating PDF..." : "Download Statement"}
  </Button>
</div>


            </CardHeader>
            <CardContent>
              {/* Statement Header */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <p className="text-sm text-gray-500">Store Name</p>
    <p className="font-medium">{user?.storeName || "N/A"}</p>
  </div>

  <div>
    <p className="text-sm text-gray-500">Statement Date</p>
    <p className="font-medium">
      {format(new Date(), "MMMM dd, yyyy")}
    </p>
  </div>

  <div>
    <p className="text-sm text-gray-500">Email</p>
    <p className="font-medium break-all">
      {user?.email || "N/A"}
    </p>
  </div>

  <div>
    <p className="text-sm text-gray-500">Phone</p>
    <p className="font-medium">
      {user?.phone || "N/A"}
    </p>
  </div>
</div>

              </div>

              {/* Complete Transaction History */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Complete Transaction History
                </h4>
                
                {orders.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left p-3 font-semibold">Date</th>
                            <th className="text-left p-3 font-semibold">Order ID</th>
                            <th className="text-left p-3 font-semibold">Items</th>
                            <th className="text-right p-3 font-semibold">Amount</th>
                            <th className="text-center p-3 font-semibold">Payment Status</th>
                            <th className="text-left p-3 font-semibold">Payment Details</th>
                            <th className="text-right p-3 font-semibold">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let runningBalance = 0;
                            return [...orders]
                              .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
                              .map((order, idx) => {
                                const orderTotal = order.total || 0;
                                const paidAmount = order.paymentStatus === "paid" ? orderTotal : 
                                                   order.paymentStatus === "partial" ? (parseFloat(order.paymentAmount) || 0) : 0;
                                const dueAmount = orderTotal - paidAmount;
                                runningBalance += dueAmount;
                                
                                return (
                                  <tr key={order._id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="p-3">
                                      <div>
                                        <p className="font-medium">{format(new Date(order.createdAt || Date.now()), "MMM dd, yyyy")}</p>
                                        <p className="text-xs text-gray-500">{format(new Date(order.createdAt || Date.now()), "hh:mm a")}</p>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        <span className="font-mono text-blue-600">#{order.orderNumber || order._id?.slice(-6)}</span>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <p className="text-gray-700">{order.items?.length || 0} items</p>
                                      <p className="text-xs text-gray-500 truncate max-w-32">
                                        {order.items?.slice(0, 2).map((i: any) => i.productName || i.name).join(", ")}
                                        {order.items?.length > 2 ? "..." : ""}
                                      </p>
                                    </td>
                                    <td className="p-3 text-right">
                                      <p className="font-bold text-gray-900">{formatCurrency(orderTotal)}</p>
                                    </td>
                                    <td className="p-3 text-center">
                                      {order.paymentStatus === "paid" ? (
                                        <Badge className="bg-green-100 text-green-700">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Paid
                                        </Badge>
                                      ) : order.paymentStatus === "partial" ? (
                                        <Badge className="bg-yellow-100 text-yellow-700">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Partial
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-red-100 text-red-700">
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Unpaid
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      {order.paymentStatus === "paid" ? (
                                        <div className="text-green-700">
                                          <p className="font-medium flex items-center gap-1">
                                            <CreditCard className="h-3 w-3" />
                                            {order.paymentMethod || "Paid"}
                                          </p>
                                          {order.paidAt && (
                                            <p className="text-xs text-gray-500">
                                              {format(new Date(order.paidAt), "MMM dd, yyyy")}
                                            </p>
                                          )}
                                        </div>
                                      ) : order.paymentStatus === "partial" ? (
                                        <div className="text-yellow-700">
                                          <p className="font-medium">Paid: {formatCurrency(paidAmount)}</p>
                                          <p className="text-xs text-red-600">Due: {formatCurrency(dueAmount)}</p>
                                        </div>
                                      ) : (
                                        <div className="text-red-600">
                                          <p className="font-medium">Due: {formatCurrency(orderTotal)}</p>
                                          <p className="text-xs text-gray-500">Awaiting payment</p>
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-3 text-right">
                                      <p className={`font-bold ${runningBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(runningBalance)}
                                      </p>
                                    </td>
                                  </tr>
                                );
                              });
                          })()}
                        </tbody>
                        <tfoot className="bg-gray-100 font-semibold">
                          <tr className="border-t-2 border-gray-300">
                            <td colSpan={3} className="p-3 text-right">Totals:</td>
                            <td className="p-3 text-right text-blue-700">{formatCurrency(totalInvoiced)}</td>
                            <td className="p-3 text-center">
                              <span className="text-green-700">{orders.filter(o => o.paymentStatus === "paid").length} Paid</span>
                              {" / "}
                              <span className="text-red-700">{orders.filter(o => o.paymentStatus !== "paid").length} Unpaid</span>
                            </td>
                            <td className="p-3 text-green-700">Paid: {formatCurrency(totalPaid)}</td>
                            <td className={`p-3 text-right ${balanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>
                              {formatCurrency(balanceDue)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border rounded-lg">
                    <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No transactions found</p>
                  </div>
                )}
              </div>

              {/* Payment History from Statement */}
              {statement?.transactions && statement.transactions.filter(t => t.type === "payment").length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-green-700">
                    <TrendingDown className="h-4 w-4" />
                    Payment History
                  </h4>
                  <div className="border border-green-200 rounded-lg overflow-hidden bg-green-50">
                    <table className="w-full text-sm">
                      <thead className="bg-green-100">
                        <tr>
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Payment Method</th>
                          <th className="text-left p-3">Reference</th>
                          <th className="text-right p-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.transactions
                          .filter(t => t.type === "payment")
                          .map((payment, idx) => (
                            <tr key={idx} className="border-t border-green-200">
                              <td className="p-3">{format(new Date(payment.date), "MMM dd, yyyy")}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-green-600" />
                                  {payment.description}
                                </div>
                              </td>
                              <td className="p-3 text-gray-600">-</td>
                              <td className="p-3 text-right font-bold text-green-700">
                                +{formatCurrency(payment.credit)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h4 className="font-semibold mb-4 flex items-center gap-2 text-blue-800">
                  <CreditCard className="h-5 w-5" />
                  Account Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-blue-700">{orders.length}</p>
                    <p className="text-sm text-gray-600">Total Orders</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalInvoiced)}</p>
                    <p className="text-sm text-gray-600">Total Invoiced</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
                    <p className="text-sm text-gray-600">Total Paid</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className={`text-2xl font-bold ${balanceDue > 0 ? "text-red-700" : "text-green-700"}`}>
                      {formatCurrency(balanceDue)}
                    </p>
                    <p className={`text-sm ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
                      {balanceDue > 0 ? "Balance Due" : "All Paid ✓"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StatementFilterPopup
              isOpen={isStatementFilterOpen}
              onClose={() => setIsStatementFilterOpen(false)}
              userId={user._id}
              token={token}
              vendor={true}
            />

      {/* Order Detail Modal */}
      <Dialog open={showOrderDetail} onOpenChange={setShowOrderDetail}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice #{selectedOrder?.orderNumber || selectedOrder?._id?.slice(-6)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Status</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedOrder.status)}
                  {getPaymentBadge(selectedOrder.paymentStatus)}
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Invoice Date</span>
                <span className="font-medium">
                  {format(new Date(selectedOrder.createdAt || Date.now()), "MMMM dd, yyyy")}
                </span>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-medium mb-2">Items</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{item.productName || item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} × {formatCurrency(item.unitPrice || item.price)}
                        </p>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(item.total || (item.quantity * (item.unitPrice || item.price)))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">{formatCurrency(selectedOrder.total || 0)}</span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={() => setShowOrderDetail(false)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StoreInvoiceStatement