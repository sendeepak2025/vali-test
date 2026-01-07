
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CheckCircle, AlertTriangle, XCircle, ArrowLeft, 
  ImagePlus, FileVideo, DollarSign, TrendingUp, Scale, Package, Thermometer, Trash2
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VendorPurchase, PurchaseItem } from '@/types/vendor';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/shared/PageHeader';
import MediaUploader from '@/components/shared/MediaUploader';
import {getSinglePurchaseOrderAPI , updatePurchaseOrderQualityAPI, deletePurchaseOrderAPI} from "@/services2/operations/purchaseOrder"
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

// Produce-specific rejection reasons
const REJECTION_REASONS = [
  { value: 'spoilage', label: 'Spoilage', description: 'Product has spoiled or is past usable condition' },
  { value: 'bruising', label: 'Bruising', description: 'Visible bruising or physical damage' },
  { value: 'size_variance', label: 'Size Variance', description: 'Product size does not meet specifications' },
  { value: 'temperature_damage', label: 'Temperature Damage', description: 'Product damaged due to improper temperature' },
  { value: 'pest_damage', label: 'Pest Damage', description: 'Evidence of pest or insect damage' },
  { value: 'ripeness_issues', label: 'Ripeness Issues', description: 'Product is over-ripe or under-ripe' },
  { value: 'color_defects', label: 'Color Defects', description: 'Abnormal coloring or discoloration' },
  { value: 'mold', label: 'Mold/Fungus', description: 'Visible mold or fungal growth' },
  { value: 'weight_variance', label: 'Weight Variance', description: 'Actual weight differs significantly from expected' },
  { value: 'packaging_damage', label: 'Packaging Damage', description: 'Damaged packaging affecting product quality' },
  { value: 'contamination', label: 'Contamination', description: 'Foreign material or contamination present' },
  { value: 'other', label: 'Other', description: 'Other quality issue' }
];

// Weight variance tolerance (percentage)
const WEIGHT_VARIANCE_TOLERANCE = 5; // 5% tolerance

interface QualityControlFormProps {
  purchaseId: string;
}

// Update the PurchaseItem interface to include mediaUrls
interface ExtendedPurchaseItem extends PurchaseItem {
  mediaUrls?: string[];
  totalWeight?: number;
  lb?: number;
  batchNumber?: string;
  rejectionReason?: string;
  expectedWeight?: number;
  actualWeight?: number;
  weightVariance?: number;
  weightVariancePercent?: number;
}

// Interface for vendor pricing data
interface VendorPriceData {
  vendorId: string;
  vendorName: string;
  averagePrice: number;
  lastPurchaseDate: string;
}

// Credit memo suggestion interface
interface CreditMemoSuggestion {
  vendorId: string;
  vendorName: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    rejectionReason: string;
  }[];
  totalAmount: number;
}

const QualityControlForm: React.FC<QualityControlFormProps> = ({ purchaseId }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [purchase, setPurchase] = useState<VendorPurchase | null>(null);
  const [items, setItems] = useState<ExtendedPurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  // State for vendor price data
  const [vendorPrices, setVendorPrices] = useState<Record<string, VendorPriceData[]>>({});
  const token = useSelector((state: RootState) => state.auth?.token ?? null);
  
  // Credit memo suggestion state
  const [creditMemoSuggestion, setCreditMemoSuggestion] = useState<CreditMemoSuggestion | null>(null);
  const [showCreditMemoModal, setShowCreditMemoModal] = useState(false);

  useEffect(() => {
    const fetchPurchaseData = async () => {
      try {
        const res = await getSinglePurchaseOrderAPI(purchaseId, token);
        const purchaseData = res;
  
        if (purchaseData) {
          // Extract vendorName and flatten it
          const vendorName = purchaseData?.vendorId?.name || "N/A";
  
          // Add empty mediaUrls arrays and restructure each item
          const itemsWithMedia = purchaseData.items.map((item: any) => ({
            ...item,
            productName: item?.productId?.name,
            unit: item?.productId?.unit,
            mediaUrls: item.mediaUrls || []
          }));
  
          // Format purchase data
          const formattedPurchase = {
            ...purchaseData,
            vendorName,              // new field
            vendorId: purchaseData.vendorId._id // keep original ID if needed
          };
  
          setPurchase(formattedPurchase);
          setItems(itemsWithMedia);
  
          // Fetch vendor price data based on product IDs
          const productIds = purchaseData.items.map((item: any) => item.productId);
          fetchVendorPriceData(productIds);
        }
      } catch (error) {
        console.error("Error fetching purchase order:", error);
      }
    };
  
    fetchPurchaseData();
  }, [purchaseId]);
  
  

  // Function to fetch vendor price data
  const fetchVendorPriceData = (productIds: string[]) => {
    // In a real app, this would be an API call
    // For now, we'll simulate with mock data
    
    // Mock vendor price data by product ID
    const mockVendorPrices: Record<string, VendorPriceData[]> = {
      'p1': [
        { 
          vendorId: 'v123', 
          vendorName: 'Green Farm Organics',
          averagePrice: 2.50, 
          lastPurchaseDate: '2025-04-05'
        },
        { 
          vendorId: 'v456', 
          vendorName: 'Fresh Fields',
          averagePrice: 2.35, 
          lastPurchaseDate: '2025-03-28'
        },
        { 
          vendorId: 'v789', 
          vendorName: 'Organic Valley',
          averagePrice: 2.65, 
          lastPurchaseDate: '2025-03-15'
        }
      ],
      'p2': [
        { 
          vendorId: 'v123', 
          vendorName: 'Green Farm Organics',
          averagePrice: 1.85, 
          lastPurchaseDate: '2025-04-05'
        },
        { 
          vendorId: 'v456', 
          vendorName: 'Fresh Fields',
          averagePrice: 1.75, 
          lastPurchaseDate: '2025-03-22'
        }
      ],
      'p3': [
        { 
          vendorId: 'v123', 
          vendorName: 'Green Farm Organics',
          averagePrice: 3.25, 
          lastPurchaseDate: '2025-04-05'
        },
        { 
          vendorId: 'v789', 
          vendorName: 'Organic Valley',
          averagePrice: 3.10, 
          lastPurchaseDate: '2025-03-18'
        }
      ]
    };
    
    // Simulate API delay
    setTimeout(() => {
      setVendorPrices(mockVendorPrices);
      setLoading(false);
    }, 500);
  };

  const handleStatusChange = (index: number, status: 'approved' | 'rejected') => {
    const updatedItems = [...items];
    updatedItems[index].qualityStatus = status;
    setItems(updatedItems);
  };

  const handleNotesChange = (index: number, notes: string) => {
    const updatedItems = [...items];
    updatedItems[index].qualityNotes = notes;
    setItems(updatedItems);
  };

  const handleMediaUpload = (index: number, mediaUrls: string[]) => {
    const updatedItems = [...items];
    updatedItems[index].mediaUrls = mediaUrls;
    setItems(updatedItems);
  };

  // Handle batch/lot number change
  const handleBatchNumberChange = (index: number, batchNumber: string) => {
    const updatedItems = [...items];
    updatedItems[index].batchNumber = batchNumber;
    setItems(updatedItems);
  };

  // Handle rejection reason change
  const handleRejectionReasonChange = (index: number, reason: string) => {
    const updatedItems = [...items];
    updatedItems[index].rejectionReason = reason;
    setItems(updatedItems);
  };

  // Handle approve all items
  const handleApproveAll = () => {
    const updatedItems = items.map(item => ({
      ...item,
      qualityStatus: 'approved' as const
    }));
    setItems(updatedItems);
    toast({
      title: "All Items Approved",
      description: `${items.length} items have been approved`,
      variant: "default"
    });
  };

  // Handle reject all items
  const handleRejectAll = () => {
    const updatedItems = items.map(item => ({
      ...item,
      qualityStatus: 'rejected' as const
    }));
    setItems(updatedItems);
    toast({
      title: "All Items Rejected",
      description: `${items.length} items have been rejected`,
      variant: "destructive"
    });
  };

  // Handle actual weight change and calculate variance
  const handleActualWeightChange = (index: number, actualWeight: number) => {
    const updatedItems = [...items];
    const item = updatedItems[index];
    
    // Expected weight is quantity * lb (weight per unit)
    const expectedWeight = (item.quantity || 0) * (Number(item.lb) || 0);
    const variance = actualWeight - expectedWeight;
    const variancePercent = expectedWeight > 0 ? (variance / expectedWeight) * 100 : 0;
    
    item.actualWeight = actualWeight;
    item.expectedWeight = expectedWeight;
    item.weightVariance = variance;
    item.weightVariancePercent = variancePercent;
    
    setItems(updatedItems);
  };

  // Check if weight variance exceeds tolerance
  const hasWeightVarianceIssue = (item: ExtendedPurchaseItem): boolean => {
    if (!item.actualWeight || !item.expectedWeight) return false;
    return Math.abs(item.weightVariancePercent || 0) > WEIGHT_VARIANCE_TOLERANCE;
  };

  // Get weight variance badge
  const getWeightVarianceBadge = (item: ExtendedPurchaseItem) => {
    if (!item.actualWeight || !item.expectedWeight) return null;
    
    const variance = item.weightVariancePercent || 0;
    const absVariance = Math.abs(variance);
    
    if (absVariance <= WEIGHT_VARIANCE_TOLERANCE) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Within tolerance ({variance.toFixed(1)}%)
        </Badge>
      );
    } else if (variance < 0) {
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Under weight ({variance.toFixed(1)}%)
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-orange-100 text-orange-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Over weight (+{variance.toFixed(1)}%)
        </Badge>
      );
    }
  };

  // Suggest credit memo for weight variance
  const calculateCreditMemoSuggestion = (item: ExtendedPurchaseItem) => {
    if (!hasWeightVarianceIssue(item) || !item.weightVariance || item.weightVariance >= 0) return null;
    
    // Only suggest credit for under-weight items
    const shortWeight = Math.abs(item.weightVariance);
    const pricePerWeight = item.unitPrice / (Number(item.lb) || 1);
    const creditAmount = shortWeight * pricePerWeight;
    
    return {
      shortWeight: shortWeight.toFixed(2),
      creditAmount: creditAmount.toFixed(2)
    };
  };

  // Function to get price comparison indicator
  const getPriceComparisonIndicator = (item: ExtendedPurchaseItem) => {
    const vendorData = vendorPrices[item.productId] || [];
    if (vendorData.length === 0) return null;
    
    // Calculate market average (excluding current vendor)
    const otherVendorPrices = vendorData.filter(v => v.vendorId !== purchase?.vendorId);
    if (otherVendorPrices.length === 0) return null;
    
    const marketAverage = otherVendorPrices.reduce(
      (sum, v) => sum + v.averagePrice, 0
    ) / otherVendorPrices.length;
    
    // Compare current price with market average
    const priceDifference = ((item.unitPrice - marketAverage) / marketAverage) * 100;
    
    // Return indicator based on price difference
    if (Math.abs(priceDifference) < 2) {
      return { 
        text: "Market average",
        color: "text-gray-500"
      };
    } else if (priceDifference < 0) {
      return { 
        text: `${Math.abs(priceDifference).toFixed(1)}% below market`,
        color: "text-green-600"
      };
    } else {
      return { 
        text: `${priceDifference.toFixed(1)}% above market`,
        color: "text-orange-500"
      };
    }
  };

  // Function to add approved items to inventory
  const addApprovedItemsToInventory = async (approvedItems: ExtendedPurchaseItem[]) => {
    try {
      // In a real app, this would make API calls to update inventory
      
      // For each approved item, we would typically:
      // 1. Check if product already exists in inventory
      // 2. If it exists, update quantity
      // 3. If not, create new product entry
      
      for (const item of approvedItems) {
        // Simulate API call to add/update inventory
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Show toast for each item added
        toast({
          title: "Added to Inventory",
          description: `${item.quantity} ${item.unit} of ${item.productName} added to inventory`,
          variant: "default"
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error adding items to inventory:', error);
      toast({
        title: "Inventory Update Failed",
        description: "There was an error adding items to inventory",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleSubmit = async () => {
    // Check if all items have been assessed
    // const unassessedItems = items.filter(item => item.qualityStatus === 'pending');
    
    // if (unassessedItems.length > 0) {
    //   toast({
    //     title: "Incomplete Assessment",
    //     description: `${unassessedItems.length} items still need to be assessed`,
    //     variant: "destructive"
    //   });
    //   return;
    // }

    await updatePurchaseOrderQualityAPI(purchaseId,items,token)
    // Filter approved items
    const approvedItems = items.filter(item => item.qualityStatus === 'approved');
    
    // If there are approved items, add them to inventory
    if (approvedItems.length > 0) {
     
      const success = await addApprovedItemsToInventory(approvedItems);
      
      if (!success) {
        // If inventory update failed, stop the submission process
        return;
      }
    }

    // Check for rejected items and suggest credit memo
    const rejectedItems = items.filter(item => item.qualityStatus === 'rejected');
    if (rejectedItems.length > 0 && purchase) {
      const creditMemoItems = rejectedItems.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        rejectionReason: item.rejectionReason || 'quality_issue'
      }));
      
      const totalCreditAmount = creditMemoItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      setCreditMemoSuggestion({
        vendorId: purchase.vendorId as string,
        vendorName: purchase.vendorName || '',
        purchaseOrderId: purchaseId,
        purchaseOrderNumber: purchase.purchaseOrderNumber || purchaseId,
        items: creditMemoItems,
        totalAmount: totalCreditAmount
      });
      setShowCreditMemoModal(true);
    }

    // Here you would send the updated purchase data to your backend
    toast({
      title: "Quality Control Complete",
      description: `Purchase #${purchaseId} quality assessment has been submitted`,
      variant: "default"
    });

    // Update purchase status based on quality control results
    const newStatus = items.every(item => item.qualityStatus === 'approved') 
      ? 'approved' 
      : items.every(item => item.qualityStatus === 'rejected')
        ? 'rejected'
        : 'partially-approved';
  };

  // Handle delete purchase order
  const handleDeletePurchaseOrder = async () => {
    toast({
      title: "Delete Purchase Order",
      description: "Do you want to delete this purchase order? This action cannot be undone.",
      action: (
        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            try {
              const result = await deletePurchaseOrderAPI(purchaseId, token);
              if (result) {
                toast({
                  title: "Purchase Order Deleted",
                  description: "The purchase order has been successfully deleted",
                  variant: "default"
                });
                navigate('/vendors');
              }
            } catch (error) {
              console.error("Error deleting purchase order:", error);
            }
          }}
        >
          Delete
        </Button>
      ),
    });
  };
  
  // Handle creating credit memo from suggestion
  const handleCreateCreditMemo = () => {
    if (!creditMemoSuggestion) return;
    
    // Navigate to vendor management with credit memo pre-filled data
    // Store the suggestion in sessionStorage for the credit memo form to pick up
    sessionStorage.setItem('creditMemoSuggestion', JSON.stringify(creditMemoSuggestion));
    
    toast({
      title: "Credit Memo Suggested",
      description: `Navigate to Vendor Management > Credits tab to create the credit memo for ${formatCurrency(creditMemoSuggestion.totalAmount)}`,
      variant: "default"
    });
    
    setShowCreditMemoModal(false);
    navigate('/vendors?tab=credits&action=create');
  };
  
  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertTriangle className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading quality control form...</div>;
  }

  if (!purchase) {
    return <div className="text-center p-4">Purchase not found</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Quality Control Assessment"
        description={`Purchase ${purchase.purchaseOrderNumber || purchaseId} from ${purchase.vendorName}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>Purchase Details</span>
            <Badge variant="outline">{purchase.status}</Badge>
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <p>Vendor: {purchase.vendorName}</p>
            <p>Date: {new Date(purchase.createdAt).toLocaleDateString()}</p>
            <p>Total Amount: ${purchase.totalAmount.toFixed(2)}</p>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Items Quality Assessment</h2>
          <div className="flex gap-2">
            <Button
              onClick={handleApproveAll}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve All
            </Button>
            <Button
              onClick={handleRejectAll}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject All
            </Button>
          </div>
        </div>
        
        {items.map((item, index) => (
          <Card key={item.productId} className="mb-4">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                {/* Column 1: Product Info */}
                <div className="md:col-span-2 space-y-2">
                  <h3 className="font-medium text-lg">{item.productName} - Quantity({item.quantity})</h3>
                  <p className="text-sm text-muted-foreground">
                    Unit: {item.unit}
                  </p>
                  {item.lb && item.totalWeight && (
                    <p className="text-sm text-muted-foreground">
                      Lb/Total: {String(item.lb)} / {String(item.totalWeight)}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      ${item.unitPrice.toFixed(2)} per {item.unit}
                    </p>
                    
                    {/* Price comparison indicator */}
                    {getPriceComparisonIndicator(item) && (
                      <div className={`text-xs flex items-center ${getPriceComparisonIndicator(item)?.color}`}>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {getPriceComparisonIndicator(item)?.text}
                      </div>
                    )}
                  </div>
                  
                  {/* Lot/Batch Number Input */}
                  <div className="mt-3 space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Lot/Batch Number
                    </Label>
                    <Input
                      placeholder="Enter lot/batch number"
                      value={item.batchNumber || ''}
                      onChange={(e) => handleBatchNumberChange(index, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  {/* Vendor pricing history tooltip */}
                  {vendorPrices[item.productId] && vendorPrices[item.productId].length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" className="mt-2">
                            <DollarSign className="h-3 w-3 mr-1" />
                            View Vendor Pricing
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="w-60 p-0">
                          <div className="p-2 bg-background">
                            <p className="font-medium text-sm mb-2">Average Prices by Vendor</p>
                            <div className="space-y-1">
                              {vendorPrices[item.productId].map((vendor) => (
                                <div key={vendor.vendorId} className="flex justify-between text-xs py-1">
                                  <span className={vendor.vendorId === purchase.vendorId ? "font-semibold" : ""}>
                                    {vendor.vendorName}
                                    {vendor.vendorId === purchase.vendorId && " (current)"}
                                  </span>
                                  <span>${vendor.averagePrice.toFixed(2)}/{item.unit}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Last updated: {new Date().toLocaleDateString()}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  <div className="mt-2">
                    {getStatusBadge(item.qualityStatus)}
                  </div>
                </div>
                
                {/* Column 2: Weight Verification & Notes */}
                <div className="md:col-span-2 space-y-3">
                  {/* Weight Variance Section */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Scale className="h-3 w-3" />
                      Weight Verification
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Expected Weight</p>
                        <p className="text-sm font-medium">
                          {((item.quantity || 0) * (Number(item.lb) || 0)).toFixed(2)} lbs
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Actual Weight</p>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter actual"
                          value={item.actualWeight || ''}
                          onChange={(e) => handleActualWeightChange(index, parseFloat(e.target.value) || 0)}
                          className="h-7 text-sm"
                        />
                      </div>
                    </div>
                    {item.actualWeight && (
                      <div className="mt-2">
                        {getWeightVarianceBadge(item)}
                        {/* Credit memo suggestion for under-weight */}
                        {calculateCreditMemoSuggestion(item) && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            <p className="font-medium text-yellow-800 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Credit Memo Suggested
                            </p>
                            <p className="text-yellow-700 mt-1">
                              Short: {calculateCreditMemoSuggestion(item)?.shortWeight} lbs
                              <br />
                              Suggested Credit: ${calculateCreditMemoSuggestion(item)?.creditAmount}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Quality Notes:</Label>
                    <Textarea 
                      placeholder="Enter quality assessment notes"
                      value={item.qualityNotes || ''}
                      onChange={(e) => handleNotesChange(index, e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 mb-1">
                      <ImagePlus className="h-4 w-4" />
                      <FileVideo className="h-4 w-4" />
                      Documentation:
                    </Label>
                    <MediaUploader
                      onUpload={(files) => handleMediaUpload(index, files)}
                      initialFiles={item.mediaUrls || []}
                      maxFiles={5}
                    />
                  </div>
                </div>
                
                {/* Column 3: Assessment Actions */}
                <div className="md:col-span-2 flex flex-col space-y-3">
                  <Label className="text-sm font-medium">Assessment:</Label>
                  <div className="flex space-x-2">
                    <Button 
                      variant={item.qualityStatus === 'approved' ? 'default' : 'outline'}
                      className={item.qualityStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => handleStatusChange(index, 'approved')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      variant={item.qualityStatus === 'rejected' ? 'destructive' : 'outline'}
                      onClick={() => handleStatusChange(index, 'rejected')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                  
                  {/* Rejection Reason Dropdown - Only show when rejected */}
                  {item.qualityStatus === 'rejected' && (
                    <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <Label className="text-sm font-medium text-red-800">Rejection Reason *</Label>
                      <Select
                        value={item.rejectionReason || ''}
                        onValueChange={(value) => handleRejectionReasonChange(index, value)}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {REJECTION_REASONS.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              <div className="flex flex-col">
                                <span>{reason.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {item.rejectionReason && (
                        <p className="text-xs text-red-600">
                          {REJECTION_REASONS.find(r => r.value === item.rejectionReason)?.description}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Weight variance warning */}
                  {hasWeightVarianceIssue(item) && item.qualityStatus !== 'rejected' && (
                    <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                      <p className="font-medium text-orange-800 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Weight variance exceeds {WEIGHT_VARIANCE_TOLERANCE}% tolerance
                      </p>
                      <p className="text-orange-700 mt-1">
                        Consider rejecting or creating a credit memo for the variance.
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-auto pt-2">
                    <p className="text-sm text-muted-foreground">
                      {item.mediaUrls?.length || 0} media files attached
                    </p>
                    {item.batchNumber && (
                      <p className="text-xs text-muted-foreground">
                        Lot/Batch: {item.batchNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        <div className="flex justify-between items-center">
          <Button 
            size="lg" 
            variant="destructive"
            onClick={handleDeletePurchaseOrder} 
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Purchase Order
          </Button>
          <Button size="lg" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Processing...' : 'Complete Quality Assessment'}
          </Button>
        </div>
      </div>
      
      {/* Credit Memo Suggestion Modal */}
      <Dialog open={showCreditMemoModal} onOpenChange={setShowCreditMemoModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Credit Memo Suggested
            </DialogTitle>
            <DialogDescription>
              Items were rejected during quality control. Would you like to create a credit memo for the rejected items?
            </DialogDescription>
          </DialogHeader>
          
          {creditMemoSuggestion && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="font-medium">{creditMemoSuggestion.vendorName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Purchase Order:</span>
                  <span className="font-medium">{creditMemoSuggestion.purchaseOrderNumber}</span>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Rejected Items:</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditMemoSuggestion.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {item.rejectionReason.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="font-medium text-orange-800">Total Credit Amount:</span>
                <span className="text-xl font-bold text-orange-800">
                  {formatCurrency(creditMemoSuggestion.totalAmount)}
                </span>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreditMemoModal(false)}>
              Skip for Now
            </Button>
            <Button onClick={handleCreateCreditMemo} className="bg-orange-600 hover:bg-orange-700">
              <DollarSign className="h-4 w-4 mr-2" />
              Create Credit Memo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QualityControlForm;
