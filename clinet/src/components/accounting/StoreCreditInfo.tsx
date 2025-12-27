"use client"

import { useState, useEffect } from "react"
import { DollarSign, History, CreditCard, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/formatters"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import { getStoreCreditInfoAPI, applyStoreCreditAPI } from "@/services2/operations/creditMemo"

const CREDIT_TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  credit_issued: { label: "Credit Issued", color: "green", icon: ArrowUpRight },
  credit_applied: { label: "Credit Applied", color: "blue", icon: ArrowDownLeft },
  adjustment: { label: "Adjustment", color: "orange", icon: CreditCard },
  write_off: { label: "Write Off", color: "red", icon: CreditCard },
}

interface StoreCreditInfoProps {
  storeId: string
  storeName?: string
  onCreditApplied?: () => void
}

export default function StoreCreditInfo({ storeId, storeName, onCreditApplied }: StoreCreditInfoProps) {
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  const [loading, setLoading] = useState(false)
  const [creditInfo, setCreditInfo] = useState<any>(null)

  // Apply credit modal
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyData, setApplyData] = useState({
    orderId: "",
    amount: "",
  })

  useEffect(() => {
    if (storeId) {
      fetchCreditInfo()
    }
  }, [storeId])

  const fetchCreditInfo = async () => {
    setLoading(true)
    try {
      const result = await getStoreCreditInfoAPI(storeId, token)
      if (result) {
        setCreditInfo(result)
      }
    } catch (error) {
      console.error("Error fetching credit info:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyCredit = async () => {
    if (!applyData.orderId || !applyData.amount) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" })
      return
    }

    const amount = parseFloat(applyData.amount)
    if (amount <= 0) {
      toast({ title: "Error", description: "Amount must be greater than 0", variant: "destructive" })
      return
    }

    if (amount > (creditInfo?.creditBalance || 0)) {
      toast({ title: "Error", description: "Amount exceeds available credit balance", variant: "destructive" })
      return
    }

    setApplyLoading(true)
    try {
      const result = await applyStoreCreditAPI(storeId, applyData.orderId, amount, token)
      if (result) {
        setApplyOpen(false)
        setApplyData({ orderId: "", amount: "" })
        fetchCreditInfo()
        onCreditApplied?.()
      }
    } finally {
      setApplyLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading credit info...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Credit Balance Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Store Credit Balance</CardTitle>
              {storeName && <CardDescription>{storeName}</CardDescription>}
            </div>
            <Button variant="ghost" size="sm" onClick={fetchCreditInfo}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(creditInfo?.creditBalance || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Available Credit</p>
              </div>
            </div>
            {/* {(creditInfo?.creditBalance || 0) > 0 && (
              <Button onClick={() => setApplyOpen(true)}>
                Apply to Order
              </Button>
            )} */}
          </div>

          {/* Pending Credits */}
          {creditInfo?.pendingCredits?.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">
                {creditInfo.pendingCredits.length} Pending Credit Memo(s)
              </p>
              <p className="text-xs text-yellow-600">
                Total: {formatCurrency(creditInfo.pendingCredits.reduce((sum: number, c: any) => sum + c.totalAmount, 0))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Credit History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!creditInfo?.creditHistory?.length ? (
            <div className="p-6 text-center text-muted-foreground">
              No credit history found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditInfo.creditHistory.slice().reverse().slice(0, 20).map((entry: any, idx: number) => {
                  const typeInfo = CREDIT_TYPE_LABELS[entry.type] || { label: entry.type, color: "gray", icon: CreditCard }
                  const Icon = typeInfo.icon
                  return (
                    <TableRow key={idx} className={entry.type === "credit_applied" ? "bg-blue-50/50" : ""}>
                      <TableCell className="text-sm">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`bg-${typeInfo.color}-50 text-${typeInfo.color}-700`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className={entry.amount >= 0 ? "text-green-600" : "text-red-600"}>
                        {entry.amount >= 0 ? "+" : ""}{formatCurrency(Math.abs(entry.amount))}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(entry.balanceAfter)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.type === "credit_applied" && entry.orderNumber ? (
                          <div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 font-medium">
                              Order #{entry.orderNumber}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground truncate max-w-[200px] block">{entry.reason}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Apply Credit Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Store Credit</DialogTitle>
            <DialogDescription>
              Apply credit balance to an order. Available: {formatCurrency(creditInfo?.creditBalance || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Order ID *</Label>
              <Input
                placeholder="Enter order ID"
                value={applyData.orderId}
                onChange={(e) => setApplyData({ ...applyData, orderId: e.target.value })}
              />
            </div>
            <div>
              <Label>Amount to Apply *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={creditInfo?.creditBalance || 0}
                placeholder="0.00"
                value={applyData.amount}
                onChange={(e) => setApplyData({ ...applyData, amount: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max: {formatCurrency(creditInfo?.creditBalance || 0)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyCredit} disabled={applyLoading}>
              {applyLoading ? "Applying..." : "Apply Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
