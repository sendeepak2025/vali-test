"use client"

import { useState, useEffect } from "react"
import {
  DollarSign, CreditCard, Receipt, ArrowUpRight, ArrowDownLeft, 
  RefreshCw, Download, FileText, Calendar, Filter, ChevronDown,
  CheckCircle, Clock, XCircle, AlertTriangle, Eye, Printer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import { getStoreCreditInfoAPI } from "@/services2/operations/creditMemo"
import { getStoreAdjustmentsAPI } from "@/services2/operations/adjustment"
import { userWithOrderDetails } from "@/services2/operations/auth"

interface Transaction {
  id: string
  date: string
  type: 'order' | 'payment' | 'credit_memo' | 'adjustment' | 'refund'
  description: string
  reference: string
  debit: number
  credit: number
  balance: number
  status: string
  details?: any
}

interface AccountStatementProps {
  storeId: string
  storeName?: string
  isStoreView?: boolean // true if viewing from store side
  onClose?: () => void
}

export default function AccountStatement({ storeId, storeName, isStoreView = false, onClose }: AccountStatementProps) {
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    totalCredits: 0,
    totalAdjustments: 0,
    currentBalance: 0,
    creditBalance: 0,
  })
  const [filterType, setFilterType] = useState("all")
  const [filterPeriod, setFilterPeriod] = useState("all")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Store data
  const [storeData, setStoreData] = useState<any>(null)
  const [creditInfo, setCreditInfo] = useState<any>(null)
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    if (storeId) {
      fetchAllData()
    }
  }, [storeId])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      // Fetch all data in parallel
      const [orderDetails, creditData, adjustmentData] = await Promise.all([
        userWithOrderDetails(storeId),
        getStoreCreditInfoAPI(storeId, token),
        getStoreAdjustmentsAPI(storeId, {}, token)
      ])

      setStoreData(orderDetails)
      setCreditInfo(creditData)
      setAdjustments(adjustmentData?.adjustments || [])
      setOrders(orderDetails?.orders || [])

      // Build transactions list
      buildTransactionsList(orderDetails, creditData, adjustmentData?.adjustments || [])

      // Calculate summary
      const totalInvoiced = orderDetails?.totalSpent || 0
      const totalPaid = orderDetails?.totalPay || 0
      const creditBalance = creditData?.creditBalance || 0
      
      // Calculate total adjustments (credits added)
      const totalAdjCredits = (adjustmentData?.adjustments || [])
        .filter((a: any) => a.status === 'applied' && (a.type === 'credit' || a.type === 'refund'))
        .reduce((sum: number, a: any) => sum + a.amount, 0)
      
      // Calculate total adjustments (debits/write-offs)
      const totalAdjDebits = (adjustmentData?.adjustments || [])
        .filter((a: any) => a.status === 'applied' && (a.type === 'debit' || a.type === 'write_off'))
        .reduce((sum: number, a: any) => sum + a.amount, 0)

      setSummary({
        totalInvoiced,
        totalPaid,
        totalCredits: creditBalance,
        totalAdjustments: totalAdjCredits - totalAdjDebits,
        currentBalance: orderDetails?.balanceDue || 0,
        creditBalance,
      })

    } catch (error) {
      console.error("Error fetching account data:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to load account data" })
    } finally {
      setLoading(false)
    }
  }

  const buildTransactionsList = (orderData: any, creditData: any, adjustmentsList: any[]) => {
    const allTransactions: Transaction[] = []
    let runningBalance = 0

    // Add orders as invoices (debits)
    const ordersList = orderData?.orders || []
    ordersList.forEach((order: any) => {
      const orderTotal = order.total || order.totalAmount || 0
      runningBalance += orderTotal
      
      allTransactions.push({
        id: order._id,
        date: order.createdAt,
        type: 'order',
        description: `Order ${order.orderNumber || '#' + order._id?.slice(-6)}`,
        reference: order.orderNumber || order._id,
        debit: orderTotal,
        credit: 0,
        balance: runningBalance,
        status: order.status,
        details: order
      })

      // Add payment if exists
      const paidAmount = parseFloat(order.paymentAmount) || 0
      if (paidAmount > 0) {
        runningBalance -= paidAmount
        allTransactions.push({
          id: `payment-${order._id}`,
          date: order.paymentDetails?.paymentDate || order.updatedAt,
          type: 'payment',
          description: `Payment for Order ${order.orderNumber || '#' + order._id?.slice(-6)}`,
          reference: order.paymentDetails?.transactionId || order.orderNumber,
          debit: 0,
          credit: paidAmount,
          balance: runningBalance,
          status: order.paymentStatus === 'paid' ? 'completed' : 'partial',
          details: { order, payment: order.paymentDetails }
        })
      }

      // Add credit applied if exists
      const creditApplied = order.creditApplied || 0
      if (creditApplied > 0) {
        runningBalance -= creditApplied
        allTransactions.push({
          id: `credit-applied-${order._id}`,
          date: order.updatedAt,
          type: 'credit_memo',
          description: `Credit Applied to Order ${order.orderNumber}`,
          reference: order.orderNumber,
          debit: 0,
          credit: creditApplied,
          balance: runningBalance,
          status: 'applied',
          details: { order, creditApplied }
        })
      }
    })

    // Add adjustments
    adjustmentsList.forEach((adj: any) => {
      if (adj.status === 'applied' || adj.status === 'approved') {
        const isCredit = adj.type === 'credit' || adj.type === 'refund' || adj.type === 'correction'
        
        if (isCredit) {
          runningBalance -= adj.amount
        } else {
          runningBalance += adj.amount
        }

        allTransactions.push({
          id: adj._id,
          date: adj.appliedAt || adj.createdAt,
          type: 'adjustment',
          description: `${adj.type.charAt(0).toUpperCase() + adj.type.slice(1)}: ${adj.reason?.substring(0, 50)}...`,
          reference: adj.adjustmentNumber,
          debit: isCredit ? 0 : adj.amount,
          credit: isCredit ? adj.amount : 0,
          balance: runningBalance,
          status: adj.status,
          details: adj
        })
      }
    })

    // Add credit history entries that aren't from adjustments
    const creditHistory = creditData?.creditHistory || []
    creditHistory.forEach((entry: any) => {
      if (entry.type === 'credit_issued' && entry.referenceModel === 'CreditMemo') {
        allTransactions.push({
          id: entry.reference,
          date: entry.createdAt,
          type: 'credit_memo',
          description: `Credit Memo Issued: ${entry.reason?.substring(0, 50)}`,
          reference: entry.reference,
          debit: 0,
          credit: Math.abs(entry.amount),
          balance: entry.balanceAfter,
          status: 'processed',
          details: entry
        })
      }
    })

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    setTransactions(allTransactions)
  }

  const getFilteredTransactions = () => {
    let filtered = [...transactions]

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType)
    }

    // Filter by period
    if (filterPeriod !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (filterPeriod) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(0)
      }

      filtered = filtered.filter(t => new Date(t.date) >= startDate)
    }

    return filtered
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return <Receipt className="h-4 w-4 text-blue-600" />
      case 'payment': return <DollarSign className="h-4 w-4 text-green-600" />
      case 'credit_memo': return <CreditCard className="h-4 w-4 text-purple-600" />
      case 'adjustment': return <FileText className="h-4 w-4 text-orange-600" />
      case 'refund': return <ArrowDownLeft className="h-4 w-4 text-red-600" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      order: { label: 'Invoice', className: 'bg-blue-50 text-blue-700' },
      payment: { label: 'Payment', className: 'bg-green-50 text-green-700' },
      credit_memo: { label: 'Credit', className: 'bg-purple-50 text-purple-700' },
      adjustment: { label: 'Adjustment', className: 'bg-orange-50 text-orange-700' },
      refund: { label: 'Refund', className: 'bg-red-50 text-red-700' },
    }
    const c = config[type] || { label: type, className: 'bg-gray-50 text-gray-700' }
    return <Badge variant="outline" className={c.className}>{c.label}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      completed: { label: 'Completed', className: 'bg-green-50 text-green-700', icon: CheckCircle },
      paid: { label: 'Paid', className: 'bg-green-50 text-green-700', icon: CheckCircle },
      partial: { label: 'Partial', className: 'bg-yellow-50 text-yellow-700', icon: Clock },
      pending: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700', icon: Clock },
      applied: { label: 'Applied', className: 'bg-green-50 text-green-700', icon: CheckCircle },
      processed: { label: 'Processed', className: 'bg-green-50 text-green-700', icon: CheckCircle },
      Processing: { label: 'Processing', className: 'bg-blue-50 text-blue-700', icon: Clock },
      Delivered: { label: 'Delivered', className: 'bg-green-50 text-green-700', icon: CheckCircle },
    }
    const c = config[status] || { label: status, className: 'bg-gray-50 text-gray-700', icon: Clock }
    const Icon = c.icon
    return (
      <Badge variant="outline" className={c.className}>
        <Icon className="h-3 w-3 mr-1" />
        {c.label}
      </Badge>
    )
  }

  const exportStatement = () => {
    const csvData = getFilteredTransactions().map(t => ({
      Date: new Date(t.date).toLocaleDateString(),
      Type: t.type,
      Description: t.description,
      Reference: t.reference,
      Debit: t.debit || '',
      Credit: t.credit || '',
      Balance: t.balance,
      Status: t.status
    }))

    const headers = ['Date', 'Type', 'Description', 'Reference', 'Debit', 'Credit', 'Balance', 'Status']
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `account_statement_${storeName || storeId}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({ title: "Success", description: "Statement exported successfully" })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filteredTransactions = getFilteredTransactions()

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-lg font-bold">Account Statement</h2>
          {storeName && <p className="text-sm text-muted-foreground">{storeName}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAllData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportStatement}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Invoiced</p>
            <p className="text-lg font-bold">{formatCurrency(summary.totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Credits Issued</p>
            <p className="text-lg font-bold text-purple-600">{formatCurrency(summary.creditBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Adjustments</p>
            <p className={`text-lg font-bold ${summary.totalAdjustments >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.totalAdjustments >= 0 ? '+' : ''}{formatCurrency(summary.totalAdjustments)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="p-3">
            <p className="text-xs text-blue-700">Outstanding Balance</p>
            <p className={`text-lg font-bold ${summary.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(summary.currentBalance)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardContent className="p-3">
            <p className="text-xs text-green-700">Available Credit</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(summary.creditBalance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="order">Invoices</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
            <SelectItem value="credit_memo">Credits</SelectItem>
            <SelectItem value="adjustment">Adjustments</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaction History</CardTitle>
          <CardDescription>{filteredTransactions.length} transactions</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm">
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(transaction.type)}
                        {getTypeBadge(transaction.type)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm">{transaction.description}</p>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{transaction.reference}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedTransaction(transaction)
                          setDetailsOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Credit History Section */}
      {creditInfo?.creditHistory?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Credit Balance History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditInfo.creditHistory.slice().reverse().slice(0, 10).map((entry: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        entry.type === 'credit_issued' ? 'bg-green-50 text-green-700' :
                        entry.type === 'credit_applied' ? 'bg-blue-50 text-blue-700' :
                        'bg-orange-50 text-orange-700'
                      }>
                        {entry.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{entry.reason}</TableCell>
                    <TableCell className={`text-right font-medium ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(entry.balanceAfter)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(selectedTransaction.date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  {getTypeBadge(selectedTransaction.type)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reference</p>
                  <p className="font-mono">{selectedTransaction.reference}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{selectedTransaction.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Debit (Charge)</p>
                  <p className="text-xl font-bold text-red-600">
                    {selectedTransaction.debit > 0 ? formatCurrency(selectedTransaction.debit) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Credit (Payment)</p>
                  <p className="text-xl font-bold text-green-600">
                    {selectedTransaction.credit > 0 ? formatCurrency(selectedTransaction.credit) : '-'}
                  </p>
                </div>
              </div>

              {/* Show order items if it's an order */}
              {selectedTransaction.type === 'order' && selectedTransaction.details?.items && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Order Items</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {selectedTransaction.details.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                        <span>{item.name || item.productName} x {item.quantity}</span>
                        <span>{formatCurrency(item.total || (item.quantity * item.unitPrice))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show adjustment details */}
              {selectedTransaction.type === 'adjustment' && selectedTransaction.details && (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Adjustment Type</p>
                    <p className="capitalize">{selectedTransaction.details.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason Category</p>
                    <p className="capitalize">{selectedTransaction.details.reasonCategory?.replace(/_/g, ' ')}</p>
                  </div>
                  {selectedTransaction.details.approvedByName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Approved By</p>
                      <p>{selectedTransaction.details.approvedByName}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
