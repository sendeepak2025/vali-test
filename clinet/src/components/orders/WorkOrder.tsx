import React, { useState, useMemo } from 'react';
import { Order } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { exportWorkOrderToPDF, WorkOrderOptions } from '@/utils/pdf/work-order-export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  X, Download, Wrench, Eye, Package, User, Mail, Loader2, 
  Calendar, AlertCircle, ChevronDown, ChevronUp, Plus, Minus, Printer
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { updateOrderPlateAPI } from "@/services2/operations/order";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

interface WorkOrderFormProps {
  order: Order;
  onClose: () => void;
}

const WorkOrderForm: React.FC<WorkOrderFormProps> = ({ order, onClose }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPalletSection, setShowPalletSection] = useState(!!order.palletData);
  
  const token = useSelector((state: RootState) => state.auth?.token ?? null);
  
  // Auto-capture creation date
  const createdDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  // Simplified state - essential fields only
  const [assignedTo, setAssignedTo] = useState(order.palletData?.worker || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Pallet tracking (simplified)
  const [palletCount, setPalletCount] = useState(order.palletData?.palletCount || 1);
  const [boxesPerProduct, setBoxesPerProduct] = useState<Record<string, number>>(
    order.palletData?.boxesPerPallet || 
    Object.fromEntries(order.items.map(item => [item.productId, item.quantity]))
  );
  
  // Advanced options (collapsed by default)
  const [department, setDepartment] = useState('Processing');
  const [equipmentNeeded, setEquipmentNeeded] = useState('');
  const [includeCompanyLogo, setIncludeCompanyLogo] = useState(true);

  // Calculate totals
  const totalBoxes = useMemo(() => 
    Object.values(boxesPerProduct).reduce((sum, count) => sum + (count || 0), 0), 
    [boxesPerProduct]
  );

  const workOrderNumber = `WO-${order.orderNumber || order.id}`;

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const buildWorkOrderOptions = (): WorkOrderOptions => ({
    workOrderNumber,
    assignedTo,
    department,
    priority,
    startDate: createdDate, // Auto-captured creation date
    dueDate,
    equipmentNeeded: equipmentNeeded.split(',').map(s => s.trim()).filter(Boolean),
    specialInstructions,
    includeCompanyLogo,
    itemInstructions: {},
    palletData: showPalletSection ? {
      worker: assignedTo,
      palletCount,
      boxesPerPallet: boxesPerProduct,
      totalBoxes,
      chargePerPallet: 15,
      totalPalletCharge: palletCount * 15,
      selectedItems: order.items.map(i => i.productId)
    } : null
  });

  const handlePreview = () => {
    if (!assignedTo.trim()) {
      toast({
        title: "Worker Required",
        description: "Please enter the assigned worker name.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const pdfDoc = exportWorkOrderToPDF(order, buildWorkOrderOptions(), true);
      const pdfUrl = pdfDoc.output('bloburl');
      window.open(pdfUrl, '_blank');
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: "Failed to generate preview.",
        variant: "destructive"
      });
    }
  };

  const handleGenerate = async () => {
    if (!assignedTo.trim()) {
      toast({
        title: "Worker Required",
        description: "Please enter the assigned worker name.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Save pallet data if enabled
      if (showPalletSection && token && order._id) {
        const palletData = {
          worker: assignedTo,
          palletCount,
          boxesPerPallet: boxesPerProduct,
          totalBoxes,
          chargePerPallet: 15,
          totalPalletCharge: palletCount * 15,
          selectedItems: order.items.map(i => i.productId)
        };
        await updateOrderPlateAPI(palletData, token, order._id);
      }

      exportWorkOrderToPDF(order, buildWorkOrderOptions());
      
      toast({
        title: "Work Order Generated",
        description: `${workOrderNumber} has been downloaded.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate work order.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmail = async () => {
    if (!assignedTo.trim()) {
      toast({
        title: "Worker Required",
        description: "Please enter the assigned worker name.",
        variant: "destructive"
      });
      return;
    }

    setIsEmailing(true);
    try {
      const pdfDoc = exportWorkOrderToPDF(order, buildWorkOrderOptions(), true);
      const pdfBase64 = pdfDoc.output('datauristring');
      
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/email/send-work-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: order._id || order.id,
          workOrderNumber,
          assignedTo,
          department,
          priority,
          customerEmail: order.customer?.email,
          customerName: order.customer?.name,
          pdfBase64,
        }),
      });

      if (response.ok) {
        toast({
          title: "Email Sent",
          description: `Work order emailed successfully.`,
        });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      toast({
        title: "Email Failed",
        description: "Failed to send email.",
        variant: "destructive"
      });
    } finally {
      setIsEmailing(false);
    }
  };

  const handlePrint = async () => {
    if (!assignedTo.trim()) {
      toast({
        title: "Worker Required",
        description: "Please enter the assigned worker name.",
        variant: "destructive"
      });
      return;
    }

    setIsPrinting(true);
    try {
      // Save pallet data if enabled
      if (showPalletSection && token && order._id) {
        const palletData = {
          worker: assignedTo,
          palletCount,
          boxesPerPallet: boxesPerProduct,
          totalBoxes,
          chargePerPallet: 15,
          totalPalletCharge: palletCount * 15,
          selectedItems: order.items.map(i => i.productId)
        };
        await updateOrderPlateAPI(palletData, token, order._id);
      }

      const pdfDoc = exportWorkOrderToPDF(order, buildWorkOrderOptions(), true);
      
      // Open PDF in new window and trigger print
      const pdfBlob = pdfDoc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 1000);
        };
      }
      
      toast({
        title: "Print Requested",
        description: `${workOrderNumber} sent to printer.`,
      });
    } catch (error) {
      toast({
        title: "Print Failed",
        description: "Failed to print work order.",
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="p-5 max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Create Work Order</h2>
            <p className="text-sm text-muted-foreground">{workOrderNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-medium">{new Date(createdDate).toLocaleDateString()}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Order Summary Card */}
      <div className="bg-muted/50 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Order #{order.orderNumber || order.id}</span>
          <Badge variant="outline">{order.items.length} items</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{order.clientName}</p>
      </div>

      {/* Essential Fields */}
      <div className="space-y-4 mb-5">
        {/* Assigned Worker - Most Important */}
        <div>
          <Label htmlFor="assignedTo" className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            Assigned Worker <span className="text-red-500">*</span>
          </Label>
          <Input
            id="assignedTo"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Enter worker name"
            className="mt-1.5"
          />
        </div>

        {/* Priority & Due Date Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Priority
            </Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> Low
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" /> Medium
                  </span>
                </SelectItem>
                <SelectItem value="high">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" /> High
                  </span>
                </SelectItem>
                <SelectItem value="urgent">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Urgent
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="dueDate" className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        {/* Special Instructions */}
        <div>
          <Label htmlFor="instructions">Special Instructions</Label>
          <Textarea
            id="instructions"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any special handling or processing instructions..."
            className="mt-1.5"
            rows={2}
          />
        </div>
      </div>

      {/* Pallet Tracking Section (Collapsible) */}
      <Collapsible open={showPalletSection} onOpenChange={setShowPalletSection} className="mb-5">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pallet Tracking
              {showPalletSection && totalBoxes > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {palletCount} pallets • {totalBoxes} boxes
                </Badge>
              )}
            </span>
            {showPalletSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="border rounded-lg p-4 space-y-4">
            {/* Pallet Count */}
            {/* <div className="flex items-center justify-between">
              <Label>Number of Pallets</Label>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setPalletCount(Math.max(1, palletCount - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-12 text-center font-medium">{palletCount}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setPalletCount(palletCount + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div> */}

            {/* Box Count per Product */}
            <div>
              <Label className="mb-2 block">Boxes per Product</Label>
              <div className="space-y-2">
                {order.items.map(item => (
                  <div key={item.productId} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm">{item.productName}</span>
                    <Input
                      type="number"
                      min="0"
                      disabled
                      className="w-20 h-8 text-center"
                      value={boxesPerProduct[item.productId] || 0}
                      onChange={(e) => setBoxesPerProduct(prev => ({
                        ...prev,
                        [item.productId]: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t font-medium">
              <span>Total Boxes</span>
              <span className="text-lg">{totalBoxes}</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Advanced Options (Collapsible) */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="mb-6">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
            <span>Advanced Options</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Packaging">Packaging</SelectItem>
                  <SelectItem value="Shipping">Shipping</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Quality Control">Quality Control</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Equipment Needed</Label>
              <Input
                value={equipmentNeeded}
                onChange={(e) => setEquipmentNeeded(e.target.value)}
                placeholder="Forklift, Scale..."
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="logo" 
              checked={includeCompanyLogo}
              onCheckedChange={(c) => setIncludeCompanyLogo(!!c)}
            />
            <Label htmlFor="logo" className="text-sm">Include company logo</Label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="outline" onClick={handlePreview}>
          <Eye className="mr-1.5 h-4 w-4" />
          Preview
        </Button>
        <Button variant="outline" onClick={handlePrint} disabled={isPrinting}>
          {isPrinting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Printer className="mr-1.5 h-4 w-4" />}
          Print
        </Button>
        <Button variant="outline" onClick={handleEmail} disabled={isEmailing}>
          {isEmailing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Mail className="mr-1.5 h-4 w-4" />}
          Email
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1">
          {isGenerating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
          Download
        </Button>
      </div>
    </div>
  );
};

export default WorkOrderForm;
