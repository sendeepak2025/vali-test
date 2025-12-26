"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DollarSign, FileText, CheckCircle2, RefreshCw, AlertCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import { addPaymentRecordAPI } from "@/services2/operations/auth"

interface Order {
  _id: string
  orderNumber?: string
  total?: number
  paymentAmount?: string | number
  paymentStatus?: string
  createdAt?: string
}

interface RecordPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: {
    id: string
    storeName?: string
    name?: string
    totalPaid?: number
    totalSpent?: number
    balanceDue?: number
    orders?: Order[]
  } | null
  onSuccess?: () => void
}

export function RecordPaymentModal({ 
  open, 
  onOpenChange, 
  customer, 
  onSuccess 
}: RecordPaymentModalProps) {
  const { toast } = useToast()
  
  // Selected orders state
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentType, setPaymentType] = useState("cash")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [loading, setLoading] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedOrders([])
      setPaymentAmount("")
      setPaymentType("cash")
      setPaymentReference("")
      setPaymentNotes("")
    }
  }, [open])

  // Get unpaid orders
  const unpaidOrders = customer?.orders?.filter(
    (o) => o.paymentStatus !== 'paid'
  ) || []

  // Calculate total selected amount
  const calculateSelectedTotal = () => {
    return unpaidOrders
      .filter(o => selectedOrders.includes(o._id))
      .reduce((sum, order) => {
        const orderTotal = order.total || 0
        const paidAmount = parseFloat(String(order.paymentAmount || 0))
        return sum + (orderTotal - paidAmount)
      }, 0)
  }

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSelection = prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
      
      // Auto-update amount based on selection
      const newTotal = unpaidOrders
        .filter(o => newSelection.includes(o._id))
        .reduce((sum, order) => {
          const orderTotal = order.total || 0
          const paidAmount = parseFloat(String(order.paymentAmount || 0))
          return sum + (orderTotal - paidAmount)
        }, 0)
      
      setPaymentAmount(newTotal.toFixed(2))
      return newSelection
    })
  }

  // Select all unpaid orders
  const selectAllOrders = () => {
    const allIds = unpaidOrders.map(o => o._id)
    setSelectedOrders(allIds)
    const total = unpaidOrders.reduce((sum, order) => {
      const orderTotal = order.total || 0
      const paidAmount = parseFloat(String(order.paymentAmount || 0))
      return sum + (orderTotal - paidAmount)
    }, 0)
    setPaymentAmount(total.toFixed(2))
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedOrders([])
    setPaymentAmount("")
  }

  // Handle payment submission
  const handleSubmit = async () => {
    if (!customer?.id) {
      toast({ variant: "destructive", title: "Error", description: "Customer not found" })
      return
    }

    if (selectedOrders.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select at least one order" })
      return
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a valid amount" })
      return
    }

    setLoading(true)
    try {
      // Calculate how to distribute payment across selected orders
      let remainingPayment = parseFloat(paymentAmount)
      const paymentDistribution: { orderId: string; amount: number }[] = []

      for (const orderId of selectedOrders) {
        if (remainingPayment <= 0) break
        
        const order = unpaidOrders.find(o => o._id === orderId)
        if (!order) continue

        const orderTotal = order.total || 0
        const paidAmount = parseFloat(String(order.paymentAmount || 0))
        const orderBalance = orderTotal - paidAmount

        const paymentForOrder = Math.min(remainingPayment, orderBalance)
        paymentDistribution.push({ orderId, amount: paymentForOrder })
        remainingPayment -= paymentForOrder
      }

      // Record payment for each order
      let successCount = 0
      for (const { orderId, amount } of paymentDistribution) {
        if (amount > 0) {
          const result = await addPaymentRecordAPI(customer.id, {
            amount,
            type: paymentType,
            reference: paymentReference,
            notes: paymentNotes,
            orderId
          })
          if (result) successCount++
        }
      }

      if (successCount > 0) {
        toast({ 
          title: "Success", 
          description: `Payment recorded for ${successCount} order(s)` 
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to record payment" })
      }
    } catch (error) {
      console.error("Error recording payment:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to record payment" })
    } finally {
      setLoading(false)
    }
  }

  if (!customer) return null

  const selectedTotal = calculateSelectedTotal()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment from {customer.storeName || customer.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Payment Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-600">Total Paid</p>
                <p className="font-bold text-green-600">{formatCurrency(customer.totalPaid || 0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-600">Outstanding</p>
                <p className="font-bold text-red-600">{formatCurrency(customer.balanceDue || 0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-600">Total Invoiced</p>
                <p className="font-bold text-blue-600">{formatCurrency(customer.totalSpent || 0)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Unpaid Invoices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Select Orders to Pay
              </Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllOrders} className="text-xs h-7">
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs h-7">
                  Clear
                </Button>
              </div>
            </div>

            {unpaidOrders.length === 0 ? (
              <div className="text-center py-6 text-gray-500 border rounded-lg">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm">All invoices are paid!</p>
              </div>
            ) : (
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-2">
                  {unpaidOrders.map((order) => {
                    const orderTotal = order.total || 0
                    const paidAmount = parseFloat(String(order.paymentAmount || 0))
                    const remainingBalance = orderTotal - paidAmount
                    const isSelected = selectedOrders.includes(order._id)

                    return (
                      <div
                        key={order._id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-300 shadow-sm' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleOrderSelection(order._id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOrderSelection(order._id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            Invoice #{order.orderNumber || order._id?.slice(-6)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}
                            {paidAmount > 0 && (
                              <span className="text-green-600 ml-2">
                                Paid: {formatCurrency(paidAmount)}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">{formatCurrency(remainingBalance)}</p>
                          <p className="text-xs text-gray-500">of {formatCurrency(orderTotal)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Selected Summary */}
            {selectedOrders.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">{selectedOrders.length}</span> order(s) selected
                  </p>
                  <p className="font-bold text-blue-700">{formatCurrency(selectedTotal)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="pl-7"
              />
            </div>
            {parseFloat(paymentAmount) > selectedTotal && selectedOrders.length > 0 && (
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Amount exceeds selected orders total
              </p>
            )}
          </div>

          {/* Payment Type */}
          <div className="space-y-2">
            <Label htmlFor="paymentType">Payment Type</Label>
            <select
              id="paymentType"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="paymentReference">Reference (Optional)</Label>
            <Input
              id="paymentReference"
              placeholder="Transaction ID, receipt number..."
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="paymentNotes">Notes (Optional)</Label>
            <Textarea
              id="paymentNotes"
              placeholder="Additional notes..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || selectedOrders.length === 0 || !paymentAmount}
          >
            {loading ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Recording...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Record Payment</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RecordPaymentModal
