"use client";

import { useEffect, useState } from "react";
import { Check, DollarSign, CreditCard, FileText, X, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import type { RootState } from "@/redux/store";
import { useSelector } from "react-redux";
import { updateOrderPaymentAPI } from "@/services2/operations/order";
import { updatePurchaseOrderPaymentAPI } from "@/services2/operations/purchaseOrder";
import { getStoreCreditInfoAPI, applyStoreCreditAPI } from "@/services2/operations/creditMemo";
import type { Order } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PaymentHistory {
  amount: number;
  method: "cash" | "creditcard" | "cheque";
  transactionId?: string;
  notes?: string;
  paymentDate?: string;
}

interface PaymentStatusPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fetchOrders: () => void;
  onPayment: (id: string, paymentMethod: any) => void;
  paymentOrder: Order & { 
    store?: string | { _id: string }; 
    creditApplied?: number;
    paymentHistory?: PaymentHistory[];
  };
  orderId: string;
  id: string;
  purchase?: boolean;
  totalAmount: number;
}

interface PaymentData {
  orderId: string;
  id: string;
  method: "cash" | "creditcard" | "cheque";
  transactionId?: string;
  notes?: string;
  paymentType: "full" | "partial" | "paid";
  amountPaid: number;
}

type PaymentMethodType = "cash" | "creditcard" | "cheque" | "storecredit";

export function PaymentStatusPopup({
  open,
  onOpenChange,
  orderId,
  purchase = false,
  totalAmount,
  id,
  fetchOrders,
  onPayment,
  paymentOrder,
}: PaymentStatusPopupProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cash");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const token = useSelector((state: RootState) => state.auth?.token ?? null);

  // Store credit states
  const [creditBalance, setCreditBalance] = useState(0);
  const [loadingCredit, setLoadingCredit] = useState(false);

  // Get store ID from paymentOrder
  const storeId = typeof paymentOrder?.store === 'object' 
    ? paymentOrder?.store?._id 
    : paymentOrder?.store;

  // Calculate previously paid amount and credit applied
  const previouslyPaid = parseFloat(String(paymentOrder?.paymentAmount || 0));
  const previousCreditApplied = parseFloat(String(paymentOrder?.creditApplied || 0));
  const totalPreviouslyPaid = previouslyPaid + previousCreditApplied;
  
  // Calculate payment breakdown by method from paymentHistory
  const paymentHistory = paymentOrder?.paymentHistory || [];
  
  // Sum individual payment amounts by method
  const cashPaid = paymentHistory
    .filter(p => p.method === "cash")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const cardPaid = paymentHistory
    .filter(p => p.method === "creditcard")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const chequePaid = paymentHistory
    .filter(p => p.method === "cheque")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Total from history
  const totalFromHistory = cashPaid + cardPaid + chequePaid;
  
  // If history total doesn't match paymentAmount, show fallback (for old data)
  const showBreakdown = paymentHistory.length > 0 && Math.abs(totalFromHistory - previouslyPaid) < 0.01;
  
  // Calculate due amount
  const dueAmount = Math.max(0, totalAmount - totalPreviouslyPaid);

  // Max credit that can be used
  const maxCreditUsable = Math.min(creditBalance, dueAmount);

  // Fetch credit balance when modal opens
  useEffect(() => {
    const fetchCreditBalance = async () => {
      if (open && storeId && token && !purchase) {
        setLoadingCredit(true);
        try {
          const creditInfo = await getStoreCreditInfoAPI(storeId, token);
          setCreditBalance(creditInfo?.creditBalance || 0);
        } catch (error) {
          console.error("Error fetching credit balance:", error);
          setCreditBalance(0);
        } finally {
          setLoadingCredit(false);
        }
      }
    };
    fetchCreditBalance();
  }, [open, storeId, token, purchase]);

  useEffect(() => {
    // Reset form when dialog opens
    setPaymentMethod("cash");
    setTransactionId("");
    setNotes("");
    setPaymentAmount(dueAmount);
  }, [open, dueAmount]);

  // Update payment amount when method changes
  useEffect(() => {
    if (paymentMethod === "storecredit") {
      setPaymentAmount(maxCreditUsable);
    } else {
      setPaymentAmount(dueAmount);
    }
  }, [paymentMethod, dueAmount, maxCreditUsable]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (dueAmount <= 0) {
        toast({ title: "No payment due", description: "This order is already fully paid", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      if (paymentAmount <= 0) {
        toast({ title: "Invalid amount", description: "Please enter a valid payment amount", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      if (paymentAmount > dueAmount) {
        toast({ title: "Invalid amount", description: "Payment amount cannot exceed due amount", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      // Validate based on payment method
      if (paymentMethod === "storecredit") {
        if (paymentAmount > maxCreditUsable) {
          toast({ title: "Insufficient credit", description: `Maximum credit available is $${maxCreditUsable.toFixed(2)}`, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        // Apply store credit
        const creditResult = await applyStoreCreditAPI(storeId, id, paymentAmount, token);
        if (!creditResult) {
          setIsSubmitting(false);
          return;
        }
      } else {
        // Cash/Card/Cheque payment
        if (paymentMethod === "cash" && !notes.trim()) {
          toast({ title: "Notes required", description: "Please provide notes for cash payment", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        if (paymentMethod === "creditcard" && !transactionId.trim()) {
          toast({ title: "Transaction ID required", description: "Please provide transaction ID", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }

        const newTotalPaid = previouslyPaid + paymentAmount;
        const isFullyPaid = (newTotalPaid + previousCreditApplied) >= totalAmount;
        
        const paymentData: PaymentData = {
          orderId,
          id,
          method: paymentMethod as "cash" | "creditcard" | "cheque",
          paymentType: isFullyPaid ? "full" : "partial",
          amountPaid: newTotalPaid,
          ...(paymentMethod === "creditcard" && { transactionId }),
          ...(paymentMethod === "cash" && { notes }),
          ...(paymentMethod === "cheque" && { notes }),
        };

        if (purchase) {
          await updatePurchaseOrderPaymentAPI(paymentData, token, id);
        } else {
          await updateOrderPaymentAPI(paymentData, token, id);
        }
      }

      const methodLabel = paymentMethod === "storecredit" ? "Store Credit" : 
                          paymentMethod === "creditcard" ? "Card" : 
                          paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
      
      // toast({
      //   title: "Payment recorded",
      //   description: `$${paymentAmount.toFixed(2)} paid via ${methodLabel}`,
      // });

      onPayment(id, { method: paymentMethod, amount: paymentAmount });
      fetchOrders();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Update failed", description: "Failed to update payment. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMaxAmount = () => {
    if (paymentMethod === "storecredit") return maxCreditUsable;
    return dueAmount;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Record Payment
          </DialogTitle>
          <DialogDescription>Record payment for order #{orderId}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Order Summary */}
          <Card className="bg-muted/40">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Order Summary</h3>
                <Badge variant={dueAmount <= 0 ? "default" : totalPreviouslyPaid > 0 ? "secondary" : "outline"} className={dueAmount <= 0 ? "bg-green-600" : ""}>
                  {dueAmount <= 0 ? "Paid" : totalPreviouslyPaid > 0 ? "Partial" : "Unpaid"}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-medium">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">${totalAmount.toFixed(2)}</span>
                </div>
                {previouslyPaid > 0 && (
                  <>
                    {showBreakdown ? (
                      <>
                        {cashPaid > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Cash Paid:</span>
                            <span>-${cashPaid.toFixed(2)}</span>
                          </div>
                        )}
                        {cardPaid > 0 && (
                          <div className="flex justify-between text-blue-600">
                            <span>Card Paid:</span>
                            <span>-${cardPaid.toFixed(2)}</span>
                          </div>
                        )}
                        {chequePaid > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>Cheque Paid:</span>
                            <span>-${chequePaid.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex justify-between text-green-600">
                        <span>Previously Paid:</span>
                        <span>-${previouslyPaid.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                {previousCreditApplied > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Credit Applied:</span>
                    <span>-${previousCreditApplied.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Due Amount:</span>
                  <span className={dueAmount > 0 ? "text-red-600" : "text-green-600"}>${dueAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Already Paid Message */}
          {dueAmount <= 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <Check className="h-5 w-5" />
                  <p className="font-medium">This order is fully paid!</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Section */}
          {dueAmount > 0 && (
            <>
              {/* Payment Method Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <div className="grid grid-cols-4 gap-2">
                  {/* Cash */}
                  <div
                    className={cn(
                      "flex flex-col items-center p-3 border rounded-md cursor-pointer transition-colors",
                      paymentMethod === "cash" ? "border-green-500 bg-green-50 text-green-700" : "hover:bg-muted/50"
                    )}
                    onClick={() => setPaymentMethod("cash")}
                  >
                    <DollarSign className={cn("h-5 w-5 mb-1", paymentMethod === "cash" ? "text-green-600" : "")} />
                    <span className="text-xs">Cash</span>
                  </div>
                  
                  {/* Card */}
                  <div
                    className={cn(
                      "flex flex-col items-center p-3 border rounded-md cursor-pointer transition-colors",
                      paymentMethod === "creditcard" ? "border-blue-500 bg-blue-50 text-blue-700" : "hover:bg-muted/50"
                    )}
                    onClick={() => setPaymentMethod("creditcard")}
                  >
                    <CreditCard className={cn("h-5 w-5 mb-1", paymentMethod === "creditcard" ? "text-blue-600" : "")} />
                    <span className="text-xs">Card</span>
                  </div>
                  
                  {/* Cheque */}
                  <div
                    className={cn(
                      "flex flex-col items-center p-3 border rounded-md cursor-pointer transition-colors",
                      paymentMethod === "cheque" ? "border-orange-500 bg-orange-50 text-orange-700" : "hover:bg-muted/50"
                    )}
                    onClick={() => setPaymentMethod("cheque")}
                  >
                    <FileText className={cn("h-5 w-5 mb-1", paymentMethod === "cheque" ? "text-orange-600" : "")} />
                    <span className="text-xs">Cheque</span>
                  </div>
                  
                  {/* Store Credit - Only show if available */}
                  {!purchase && creditBalance > 0 && (
                    <div
                      className={cn(
                        "flex flex-col items-center p-3 border rounded-md cursor-pointer transition-colors",
                        paymentMethod === "storecredit" ? "border-purple-500 bg-purple-50 text-purple-700" : "hover:bg-muted/50"
                      )}
                      onClick={() => setPaymentMethod("storecredit")}
                    >
                      <Wallet className={cn("h-5 w-5 mb-1", paymentMethod === "storecredit" ? "text-purple-600" : "")} />
                      <span className="text-xs">Credit</span>
                    </div>
                  )}
                </div>
                
                {/* Show credit balance info */}
                {!purchase && creditBalance > 0 && paymentMethod !== "storecredit" && (
                  <p className="text-xs text-purple-600">Store credit available: ${creditBalance.toFixed(2)}</p>
                )}
                {loadingCredit && <p className="text-xs text-muted-foreground">Loading credit...</p>}
              </div>

              {/* Payment Details Card */}
              <Card className={cn(
                "border",
                paymentMethod === "cash" ? "border-green-200 bg-green-50/50" :
                paymentMethod === "creditcard" ? "border-blue-200 bg-blue-50/50" :
                paymentMethod === "cheque" ? "border-orange-200 bg-orange-50/50" :
                "border-purple-200 bg-purple-50/50"
              )}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    {paymentMethod === "cash" && <DollarSign className="h-5 w-5 text-green-600" />}
                    {paymentMethod === "creditcard" && <CreditCard className="h-5 w-5 text-blue-600" />}
                    {paymentMethod === "cheque" && <FileText className="h-5 w-5 text-orange-600" />}
                    {paymentMethod === "storecredit" && <Wallet className="h-5 w-5 text-purple-600" />}
                    <div>
                      <p className="font-medium">
                        {paymentMethod === "cash" && "Cash Payment"}
                        {paymentMethod === "creditcard" && "Card Payment"}
                        {paymentMethod === "cheque" && "Cheque Payment"}
                        {paymentMethod === "storecredit" && "Store Credit Payment"}
                      </p>
                      {paymentMethod === "storecredit" && (
                        <p className="text-xs text-purple-600">Available: ${creditBalance.toFixed(2)}</p>
                      )}
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount" className="text-sm">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="payment-amount"
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => {
                          const val = Math.min(Math.max(0, parseFloat(e.target.value) || 0), getMaxAmount());
                          setPaymentAmount(val);
                        }}
                        className="pl-8"
                        max={getMaxAmount()}
                        min={0}
                        step="0.01"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {paymentMethod === "storecredit" 
                        ? `Max: $${maxCreditUsable.toFixed(2)} (credit balance)`
                        : `Due: $${dueAmount.toFixed(2)}`
                      }
                    </p>
                  </div>

                  {/* Transaction ID for Card */}
                  {paymentMethod === "creditcard" && (
                    <div className="space-y-2">
                      <Label htmlFor="transaction-id" className="text-sm">Transaction ID</Label>
                      <Input
                        id="transaction-id"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Enter transaction ID"
                      />
                    </div>
                  )}

                  {/* Notes for Cash or Cheque */}
                  {(paymentMethod === "cash" || paymentMethod === "cheque") && (
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm">Notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={`Enter ${paymentMethod} payment details`}
                        rows={2}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Payment Summary</h4>
                  <div className="space-y-1 text-sm">
                    {/* Total Amount */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Amount:</span>
                      <span className="font-medium">${totalAmount.toFixed(2)}</span>
                    </div>
                    
                    {/* Already Paid */}
                    <div className="flex justify-between text-green-600">
                      <span>Paid:</span>
                      <span>-${totalPreviouslyPaid.toFixed(2)}</span>
                    </div>
                    
                    {/* Remaining */}
                    <div className="flex justify-between pt-1 border-t">
                      <span className="font-medium">Remaining:</span>
                      <span className={dueAmount > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                        ${dueAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          {dueAmount > 0 && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || paymentAmount <= 0}
              className={cn(
                "gap-2",
                paymentMethod === "cash" ? "bg-green-600 hover:bg-green-700" :
                paymentMethod === "creditcard" ? "bg-blue-600 hover:bg-blue-700" :
                paymentMethod === "cheque" ? "bg-orange-600 hover:bg-orange-700" :
                "bg-purple-600 hover:bg-purple-700"
              )}
            >
              <Check className="h-4 w-4" />
              {isSubmitting ? "Processing..." : `Pay $${paymentAmount.toFixed(2)}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
