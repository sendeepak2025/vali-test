"use client"

import { useState, useEffect } from "react"
import {
  Receipt, X, CheckCircle, AlertTriangle, FileText, Calendar,
  DollarSign, Package, ChevronRight, Info, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { VendorSelect } from "@/components/ui/vendor-select"
import { formatCurrency } from "@/utils/formatters"
import { cn } from "@/lib/utils"

interface CreateInvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendors: any[]
  purchaseOrders: any[]
  linkedPOIds: Set<string>
  onCreateInvoice: (data: any) => Promise<void>
  loading?: boolean
}

type Step = "vendor" | "details" | "link" | "review"

const steps: { id: Step; label: string; icon: any }[] = [
  { id: "vendor", label: "Select Vendor", icon: Package },
  { id: "details", label: "Invoice Details", icon: FileText },
  { id: "link", label: "Link POs", icon: Receipt },
  { id: "review", label: "Review", icon: CheckCircle },
]

export function CreateInvoiceModal({
  open,
  onOpenChange,
  vendors,
  purchaseOrders,
  linkedPOIds,
  onCreateInvoice,
  loading = false
}: CreateInvoiceModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("vendor")
  const [form, setForm] = useState({
    vendorId: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    linkedPurchaseOrders: [] as string[],
    notes: "",
    amountMatchType: "same" as "same" | "different",
    invoiceSettledAmount: 0,
    amountDifferenceReason: ""
  })

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep("vendor")
      setForm({
        vendorId: "",
        invoiceNumber: "",
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: "",
        linkedPurchaseOrders: [],
        notes: "",
        amountMatchType: "same",
        invoiceSettledAmount: 0,
        amountDifferenceReason: ""
      })
    }
  }, [open])

  const selectedVendor = vendors.find(v => v._id === form.vendorId)
  
  const availablePOs = purchaseOrders.filter(po => 
    (form.vendorId ? (po.vendor?._id === form.vendorId || po.vendorId === form.vendorId || po.vendorId?._id === form.vendorId) : true) &&
    !form.linkedPurchaseOrders.includes(po._id) &&
    !linkedPOIds.has(po._id)
  )

  const linkedPOs = purchaseOrders.filter(po => form.linkedPurchaseOrders.includes(po._id))
  const poTotal = linkedPOs.reduce((sum, po) => sum + (po.totalAmount || 0), 0)

  const canProceed = () => {
    switch (currentStep) {
      case "vendor":
        return !!form.vendorId
      case "details":
        return !!form.invoiceDate
      case "link":
        return true // Optional step
      case "review":
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep)
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id)
    }
  }

  const handleBack = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep)
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id)
    }
  }

  const handleSubmit = async () => {
    await onCreateInvoice({
      ...form,
      invoiceSettledAmount: form.amountMatchType === "same" ? poTotal : form.invoiceSettledAmount
    })
  }

  const addPO = (poId: string) => {
    if (!form.linkedPurchaseOrders.includes(poId)) {
      const newLinkedPOs = [...form.linkedPurchaseOrders, poId]
      const newTotal = purchaseOrders
        .filter(po => newLinkedPOs.includes(po._id))
        .reduce((sum, po) => sum + (po.totalAmount || 0), 0)
      setForm(prev => ({
        ...prev,
        linkedPurchaseOrders: newLinkedPOs,
        invoiceSettledAmount: newTotal
      }))
    }
  }

  const removePO = (poId: string) => {
    const newLinkedPOs = form.linkedPurchaseOrders.filter(id => id !== poId)
    const newTotal = purchaseOrders
      .filter(po => newLinkedPOs.includes(po._id))
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0)
    setForm(prev => ({
      ...prev,
      linkedPurchaseOrders: newLinkedPOs,
      invoiceSettledAmount: newTotal
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        {/* Header with Steps */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <DialogHeader className="text-white">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <Receipt className="h-6 w-6" />
              Create Invoice
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              Create a new vendor invoice in a few simple steps
            </DialogDescription>
          </DialogHeader>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-between mt-6">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = step.id === currentStep
              const isPast = steps.findIndex(s => s.id === currentStep) > index
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isActive ? "bg-white text-blue-600 shadow-lg" :
                      isPast ? "bg-blue-400 text-white" : "bg-blue-500/50 text-blue-200"
                    )}>
                      {isPast ? <CheckCircle className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                      "text-xs mt-2 font-medium",
                      isActive ? "text-white" : "text-blue-200"
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className={cn(
                      "h-5 w-5 mx-2",
                      isPast ? "text-blue-300" : "text-blue-400/50"
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[400px] overflow-y-auto">

          {/* Step 1: Select Vendor */}
          {currentStep === "vendor" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Select a Vendor</p>
                  <p className="text-sm text-blue-700">Choose the vendor this invoice is from. This will filter available purchase orders.</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base font-semibold">Vendor *</Label>
                <VendorSelect
                  value={form.vendorId}
                  onValueChange={(value) => setForm(prev => ({ 
                    ...prev, 
                    vendorId: value,
                    linkedPurchaseOrders: [] // Reset linked POs when vendor changes
                  }))}
                  placeholder="Search and select vendor..."
                  className="w-full"
                />
              </div>

              {selectedVendor && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedVendor.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedVendor.email || selectedVendor.phone || "No contact info"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Invoice Details */}
          {currentStep === "details" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">Invoice Number</Label>
                  <Input
                    placeholder="INV-001 (optional)"
                    value={form.invoiceNumber}
                    onChange={(e) => setForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to auto-generate</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Invoice Date *</Label>
                  <Input
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) => setForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Leave empty to calculate from vendor payment terms
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Notes</Label>
                <Textarea
                  placeholder="Additional notes or reference information..."
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Link Purchase Orders */}
          {currentStep === "link" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
                <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Link Purchase Orders (Optional)</p>
                  <p className="text-sm text-amber-700">Connect this invoice to existing purchase orders for better tracking and reconciliation.</p>
                </div>
              </div>

              {/* Linked POs */}
              {form.linkedPurchaseOrders.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-medium">Linked Purchase Orders</Label>
                  <div className="space-y-2">
                    {linkedPOs.map((po) => (
                      <div key={po._id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-sm">{po.purchaseOrderNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {po.purchaseDate ? new Date(po.purchaseDate).toLocaleDateString() : "No date"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-green-700">{formatCurrency(po.totalAmount)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePO(po._id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 mt-3">
                    <span className="font-medium text-blue-900">Total PO Amount</span>
                    <span className="text-xl font-bold text-blue-700">{formatCurrency(poTotal)}</span>
                  </div>
                </div>
              )}

              {/* Available POs */}
              <div className="space-y-2">
                <Label className="font-medium">Available Purchase Orders</Label>
                {availablePOs.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No available purchase orders for this vendor</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {availablePOs.slice(0, 10).map((po) => (
                      <div 
                        key={po._id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => addPO(po._id)}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{po.purchaseOrderNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {po.vendorName || po.vendor?.name || "Unknown vendor"} • {po.purchaseDate ? new Date(po.purchaseDate).toLocaleDateString() : "No date"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(po.totalAmount)}</span>
                          <Badge variant="outline" className="text-xs">
                            {po.paymentStatus || "unpaid"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount Match Section */}
              {form.linkedPurchaseOrders.length > 0 && (
                <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Invoice Amount Match</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={form.amountMatchType === "same" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setForm(prev => ({ 
                          ...prev, 
                          amountMatchType: "same",
                          invoiceSettledAmount: poTotal,
                          amountDifferenceReason: ""
                        }))}
                        className="h-8"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Same as PO
                      </Button>
                      <Button
                        type="button"
                        variant={form.amountMatchType === "different" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setForm(prev => ({ ...prev, amountMatchType: "different" }))}
                        className="h-8"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Different
                      </Button>
                    </div>
                  </div>

                  {form.amountMatchType === "different" && (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label className="text-sm">Invoice Settled Amount</Label>
                        <Input
                          type="number"
                          value={form.invoiceSettledAmount}
                          onChange={(e) => setForm(prev => ({ ...prev, invoiceSettledAmount: parseFloat(e.target.value) || 0 }))}
                          className="h-10"
                          placeholder="Enter actual invoice amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Reason for Difference</Label>
                        <Textarea
                          value={form.amountDifferenceReason}
                          onChange={(e) => setForm(prev => ({ ...prev, amountDifferenceReason: e.target.value }))}
                          placeholder="Explain why the amounts differ..."
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === "review" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">Ready to Create</p>
                  <p className="text-sm text-green-700">Review the invoice details below before creating.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className="font-medium">{selectedVendor?.name || "Not selected"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Invoice Number</span>
                  <span className="font-medium">{form.invoiceNumber || "Auto-generated"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Invoice Date</span>
                  <span className="font-medium">{form.invoiceDate ? new Date(form.invoiceDate).toLocaleDateString() : "-"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Due Date</span>
                  <span className="font-medium">{form.dueDate ? new Date(form.dueDate).toLocaleDateString() : "From payment terms"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Linked POs</span>
                  <span className="font-medium">{form.linkedPurchaseOrders.length} purchase order(s)</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Invoice Amount</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(form.amountMatchType === "same" ? poTotal : form.invoiceSettledAmount)}
                  </span>
                </div>
              </div>

              {form.notes && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{form.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              onClick={currentStep === "vendor" ? () => onOpenChange(false) : handleBack}
              disabled={loading}
            >
              {currentStep === "vendor" ? "Cancel" : "Back"}
            </Button>
            
            {currentStep === "review" ? (
              <Button onClick={handleSubmit} disabled={loading} className="min-w-[140px]">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Invoice
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateInvoiceModal
