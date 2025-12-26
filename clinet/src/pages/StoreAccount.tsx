"use client"

import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { RootState } from "@/redux/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import {
  Receipt, CreditCard, DollarSign, FileText, RefreshCw, Download,
  ArrowLeft, Wallet, Clock, CheckCircle, AlertTriangle, History,
  TrendingUp, TrendingDown, Calendar, Filter
} from "lucide-react"
import Sidebar from "@/components/layout/Sidebar"
import { AccountStatement, StoreCreditInfo } from "@/components/accounting"
import { userWithOrderDetails } from "@/services2/operations/auth"
import { getStoreCreditInfoAPI } from "@/services2/operations/creditMemo"

const StoreAccount = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 overflow-auto">
        <StoreAccountContent />
      </div>
    </div>
  )
}

const StoreAccountContent = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth?.user ?? null)
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("statement")
  const [accountData, setAccountData] = useState<any>(null)
  const [creditInfo, setCreditInfo] = useState<any>(null)

  useEffect(() => {
    if (user?._id) {
      fetchAccountData()
    }
  }, [user])

  const fetchAccountData = async () => {
    setLoading(true)
    try {
      const [orderDetails, creditData] = await Promise.all([
        userWithOrderDetails(user._id),
        getStoreCreditInfoAPI(user._id, token)
      ])
      setAccountData(orderDetails)
      setCreditInfo(creditData)
    } catch (error) {
      console.error("Error fetching account data:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to load account data" })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const totalInvoiced = accountData?.totalSpent || 0
  const totalPaid = accountData?.totalPay || 0
  const balanceDue = accountData?.balanceDue || 0
  const creditBalance = creditInfo?.creditBalance || 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">My Account</h1>
            <p className="text-muted-foreground">View your account statement, credits, and payment history</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchAccountData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Invoiced</p>
                <p className="text-xl font-bold">{formatCurrency(totalInvoiced)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={balanceDue > 0 ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${balanceDue > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                <Wallet className={`h-5 w-5 ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance Due</p>
                <p className={`text-xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(balanceDue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available Credit</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(creditBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Alert */}
      {balanceDue > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="font-medium text-orange-800">Outstanding Balance</p>
                <p className="text-sm text-orange-600">
                  You have an outstanding balance of {formatCurrency(balanceDue)}. 
                  {creditBalance > 0 && ` You have ${formatCurrency(creditBalance)} in store credit available.`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/store-cheque-payment')}>
                Make Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit Available Alert */}
      {creditBalance > 0 && balanceDue > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-800">Store Credit Available</p>
                <p className="text-sm text-green-600">
                  You have {formatCurrency(creditBalance)} in store credit that can be applied to your orders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="statement" className="gap-2">
            <FileText className="h-4 w-4" />
            Account Statement
          </TabsTrigger>
          <TabsTrigger value="credits" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Store Credits
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Payment History
          </TabsTrigger>
        </TabsList>

        {/* Account Statement Tab */}
        <TabsContent value="statement">
          <AccountStatement 
            storeId={user?._id} 
            storeName={user?.storeName || user?.name}
            isStoreView={true}
          />
        </TabsContent>

        {/* Store Credits Tab */}
        <TabsContent value="credits">
          <StoreCreditInfo 
            storeId={user?._id} 
            storeName={user?.storeName || user?.name}
          />
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>Your recent payments and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {accountData?.orders?.filter((o: any) => parseFloat(o.paymentAmount) > 0).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No payment history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accountData?.orders
                    ?.filter((o: any) => parseFloat(o.paymentAmount) > 0)
                    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .slice(0, 20)
                    .map((order: any) => (
                      <div key={order._id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-100">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              Payment for Order {order.orderNumber || '#' + order._id?.slice(-6)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.paymentDetails?.paymentDate 
                                ? new Date(order.paymentDetails.paymentDate).toLocaleDateString()
                                : new Date(order.updatedAt).toLocaleDateString()
                              }
                              {order.paymentDetails?.method && ` • ${order.paymentDetails.method}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(parseFloat(order.paymentAmount))}</p>
                          <Badge variant="outline" className={
                            order.paymentStatus === 'paid' 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-yellow-50 text-yellow-700'
                          }>
                            {order.paymentStatus === 'paid' ? 'Paid' : 'Partial'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StoreAccount
