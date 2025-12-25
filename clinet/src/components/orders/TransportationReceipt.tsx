import React, { useState, useRef } from 'react';
import { Order, formatDate } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Truck, Printer, ArrowDown, CheckCircle, User, 
  Download, MapPin, Receipt, ReceiptText,
  Building, QrCode, AlertCircle, X,
  ClipboardList, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import BillOfLadingForm from './BillOfLadingForm';
import jsPDF from 'jspdf';

interface TransportationReceiptProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  onViewClientProfile?: () => void;
}

const transportationSchema = z.object({
  driverName: z.string().min(1, "Driver name is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  estimatedArrival: z.string().min(1, "Estimated arrival is required"),
  notes: z.string().optional(),
  signature: z.string().min(1, "Signature is required"),
  transportCompany: z.string().optional(),
  deliveryLocation: z.string().optional(),
  routeNumber: z.string().optional(),
  packagingType: z.string().optional().default("Standard"),
  temperatureRequirements: z.string().optional(),
});

type TransportationFormValues = z.infer<typeof transportationSchema>;

const TransportationReceipt: React.FC<TransportationReceiptProps> = ({ 
  order, 
  open, 
  onClose,
  onViewClientProfile
}) => {
  const { toast } = useToast();
  const [receiptGenerated, setReceiptGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [receiptType, setReceiptType] = useState("standard");
  const [documentType, setDocumentType] = useState<"receipt" | "bol">("receipt");
  const [showBolDialog, setShowBolDialog] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  console.log(order, "order")
  
  // Helper to format shipping address
  const getDeliveryAddress = () => {
    if (order.shippingAddress) {
      const addr = order.shippingAddress;
      return `${addr.street || addr.address || ''}, ${addr.city}, ${addr.state} ${addr.postalCode}`.trim();
    }
    return "";
  };

  const form = useForm<TransportationFormValues>({
    resolver: zodResolver(transportationSchema),
    defaultValues: {
      driverName: "",
      vehicleId: "",
      departureDate: new Date().toISOString().split('T')[0],
      estimatedArrival: "",
      notes: "",
      signature: "",
      transportCompany: "",
      deliveryLocation: getDeliveryAddress(),
      routeNumber: `R-${Math.floor(1000 + Math.random() * 9000)}`,
      packagingType: "Standard",
      temperatureRequirements: "33-40°F (Refrigerated)"
    }
  });
  
  const handlePrint = () => {
    if (!receiptRef.current) {
      window.print();
      return;
    }

    const printWindow = window.open("", "", "height=800,width=900");
    if (!printWindow) return;

    const receiptHTML = receiptRef.current.innerHTML;

    const printCSS = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          line-height: 1.5;
          color: #333;
          background: #fff;
          padding: 20px;
        }
        @page { size: A4; margin: 10mm; }
        
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }
        .gap-1 { gap: 0.25rem; }
        .gap-2 { gap: 0.5rem; }
        .gap-4 { gap: 1rem; }
        .grid { display: grid; }
        .sm\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
        
        .p-2 { padding: 0.5rem; }
        .p-4 { padding: 1rem; }
        .p-6 { padding: 1.5rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
        .pt-4 { padding-top: 1rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-4 { margin-top: 1rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mr-1 { margin-right: 0.25rem; }
        .mr-2 { margin-right: 0.5rem; }
        
        .text-xs { font-size: 0.75rem; }
        .text-sm { font-size: 0.875rem; }
        .text-lg { font-size: 1.125rem; }
        .text-xl { font-size: 1.25rem; }
        .font-medium { font-weight: 500; }
        .font-bold { font-weight: 700; }
        .italic { font-style: italic; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .capitalize { text-transform: capitalize; }
        
        .text-gray-500 { color: #6b7280; }
        .text-gray-600 { color: #4b5563; }
        .text-gray-800 { color: #1f2937; }
        .text-green-600 { color: #16a34a; }
        .text-primary { color: #059669; }
        .text-amber-500 { color: #f59e0b; }
        .text-muted-foreground { color: #6b7280; }
        
        .bg-white { background-color: white; }
        .bg-gray-50 { background-color: #f9fafb; }
        .bg-gray-100 { background-color: #f3f4f6; }
        
        .border { border: 1px solid #e5e7eb; }
        .border-t { border-top: 1px solid #e5e7eb; }
        .border-b { border-bottom: 1px solid #e5e7eb; }
        .border-gray-100 { border-color: #f3f4f6; }
        .rounded { border-radius: 0.25rem; }
        .rounded-md { border-radius: 0.375rem; }
        
        .space-y-1 > * + * { margin-top: 0.25rem; }
        .space-y-6 > * + * { margin-top: 1.5rem; }
        
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 0.5rem; text-align: left; }
        th { font-weight: 600; border-bottom: 1px solid #e5e7eb; }
        
        svg { display: inline-block; width: 1rem; height: 1rem; vertical-align: middle; }
        
        .h-3 { height: 0.75rem; }
        .h-4 { height: 1rem; }
        .h-5 { height: 1.25rem; }
        .w-3 { width: 0.75rem; }
        .w-4 { width: 1rem; }
        .w-5 { width: 1.25rem; }
        .w-24 { width: 6rem; }
        .h-24 { height: 6rem; }
        .inline-block { display: inline-block; }
        
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      </style>
    `;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Transportation Receipt - Order #${order.id}</title>
  ${printCSS}
</head>
<body>
  ${receiptHTML}
</body>
</html>`);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);

    toast({
      title: "Print requested",
      description: "The transportation receipt has been sent to your printer."
    });
  };
  
  const handleSubmit = (data: TransportationFormValues) => {
    // In a real app, this would save the transportation receipt data
    console.log("Transportation receipt data:", data);
    
    setReceiptGenerated(true);
    toast({
      title: "Receipt Generated",
      description: "Transportation receipt has been created successfully."
    });
  };

  const handleDownloadOrPrint = (printMode: boolean = false) => {
    setDownloadLoading(true);
    try {
      const doc = new jsPDF();
      const formValues = form.getValues();
      const PAGE_WIDTH = doc.internal.pageSize.width;
      const MARGIN = 14;
      
      // Company info constants
      const COMPANY_NAME = "Vali Produce";
      const COMPANY_ADDRESS_1 = "4300 Pleasantdale Rd";
      const COMPANY_ADDRESS_2 = "Atlanta, GA 30340, USA";
      
      // Header background
      doc.setFillColor(5, 150, 105); // emerald-600
      doc.rect(0, 0, PAGE_WIDTH, 35, "F");
      
      // Logo (left side)
      try {
        const logoUrl = "/logg.png";

         const centerX = PAGE_WIDTH / 2;
  const logoHeight = 19;
  const logoWidth = 0;
doc.addImage(
  logoUrl,
  "PNG",
  5,          // x = start/left
  13,          // y = top
  logoWidth,
  logoHeight
);        // doc.addImage(logoUrl, "PNG", MARGIN, 12, 22, 16, undefined, 'FAST');
      } catch (e) {
        console.log("Logo not loaded");
      }
      
      // Header text (after logo)
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("TRANSPORTATION RECEIPT", MARGIN + 28, 18);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 220, 220);
      doc.text(`Order #${order.id} • Route #${formValues.routeNumber}`, MARGIN + 28, 26);
      doc.text(`Date: ${formatDate(order.date)}`, MARGIN + 28, 32);
      
      // Company info (right side in header)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(formValues.transportCompany || COMPANY_NAME, PAGE_WIDTH - MARGIN, 18, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.text(COMPANY_ADDRESS_1, PAGE_WIDTH - MARGIN, 25, { align: "right" });
      doc.text(COMPANY_ADDRESS_2, PAGE_WIDTH - MARGIN, 31, { align: "right" });
      
      // Transport & Client Details Section
      let yPos = 45;
      const boxHeight = 50;
      
      doc.setFillColor(243, 244, 246); // gray-100
      doc.roundedRect(MARGIN, yPos, PAGE_WIDTH - 2 * MARGIN, boxHeight, 3, 3, "F");
      
      // Transport Details (left)
      const leftX = MARGIN + 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(5, 150, 105);
      doc.text("TRANSPORT DETAILS", leftX, yPos + 10);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`Driver: ${formValues.driverName}`, leftX, yPos + 20);
      doc.text(`Vehicle ID: ${formValues.vehicleId}`, leftX, yPos + 27);
      doc.text(`Departure: ${formValues.departureDate}`, leftX, yPos + 34);
      doc.text(`Est. Arrival: ${formValues.estimatedArrival}`, leftX, yPos + 41);
      
      // Client Details (right)
      const rightX = PAGE_WIDTH / 2 + 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(5, 150, 105);
      doc.text("CLIENT DETAILS", rightX, yPos + 10);
      
      // Get delivery address from order or form
      const deliveryAddr = formValues.deliveryLocation || getDeliveryAddress() || "Client Address";
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`Name: ${order.clientName}`, rightX, yPos + 20);
      doc.text(`Order Date: ${formatDate(order.date)}`, rightX, yPos + 27);
      doc.text(`Status: ${order.status}`, rightX, yPos + 34);
      doc.text(`Delivery: ${deliveryAddr}`, rightX, yPos + 41, { maxWidth: PAGE_WIDTH / 2 - MARGIN - 10 });
      
      yPos += boxHeight + 10;
      
      // Temperature & Packaging (for detailed receipt)
      if (receiptType === "detailed") {
        doc.setFillColor(254, 243, 199); // amber-100
        doc.roundedRect(MARGIN, yPos, PAGE_WIDTH - 2 * MARGIN, 16, 3, 3, "F");
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(180, 83, 9); // amber-700
        doc.text("SPECIAL REQUIREMENTS", leftX, yPos + 6);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(`Temperature: ${formValues.temperatureRequirements}`, leftX, yPos + 12);
        doc.text(`Packaging: ${formValues.packagingType}`, rightX, yPos + 12);
        
        yPos += 22;
      }
      
      // Cargo Details Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(5, 150, 105);
      doc.text("CARGO DETAILS", MARGIN, yPos + 6);
      
      yPos += 10;
      
      // Table header
      doc.setFillColor(5, 150, 105);
      doc.rect(MARGIN, yPos, PAGE_WIDTH - 2 * MARGIN, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("Item", MARGIN + 4, yPos + 6);
      doc.text("Quantity", PAGE_WIDTH / 2, yPos + 6, { align: "center" });
      if (receiptType === "detailed") {
        doc.text("Weight", PAGE_WIDTH - MARGIN - 40, yPos + 6, { align: "right" });
        doc.text("Package", PAGE_WIDTH - MARGIN - 4, yPos + 6, { align: "right" });
      }
      
      yPos += 10;
      
      // Table rows
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      order.items.forEach((item, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(MARGIN, yPos - 2, PAGE_WIDTH - 2 * MARGIN, 8, "F");
        }
        doc.text(item.productName || item.name || "Item", MARGIN + 4, yPos + 4);
        doc.text(String(item.quantity), PAGE_WIDTH / 2, yPos + 4, { align: "center" });
        if (receiptType === "detailed") {
          doc.text(`~${item.quantity * 2} lbs`, PAGE_WIDTH - MARGIN - 40, yPos + 4, { align: "right" });
          doc.text(formValues.packagingType || "Standard", PAGE_WIDTH - MARGIN - 4, yPos + 4, { align: "right" });
        }
        yPos += 8;
      });
      
      yPos += 8;
      
      // Special Instructions
      if (formValues.notes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(5, 150, 105);
        doc.text("SPECIAL INSTRUCTIONS", MARGIN, yPos);
        
        yPos += 6;
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(MARGIN, yPos, PAGE_WIDTH - 2 * MARGIN, 14, 2, 2, "F");
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(formValues.notes, MARGIN + 4, yPos + 8, { maxWidth: PAGE_WIDTH - 2 * MARGIN - 8 });
        
        yPos += 20;
      }
      
      // Signature Section
      yPos += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(MARGIN, yPos, PAGE_WIDTH - MARGIN, yPos);
      
      yPos += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text("Confirmed By:", MARGIN, yPos);
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(12);
      doc.text(formValues.signature, MARGIN, yPos + 10);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("Digital signature", MARGIN, yPos + 16);
      
      // Footer
      const footerY = doc.internal.pageSize.height - 15;
      doc.setFillColor(5, 150, 105);
      doc.rect(0, footerY - 5, PAGE_WIDTH, 20, "F");
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      const footerCompany = formValues.transportCompany || COMPANY_NAME;
      doc.text(`${footerCompany} • Reliable Delivery`, PAGE_WIDTH / 2, footerY + 3, { align: "center" });
      doc.setFontSize(7);
      doc.setTextColor(200, 200, 200);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, PAGE_WIDTH / 2, footerY + 9, { align: "center" });
      
      // Save or Print
      if (printMode) {
        // Create hidden iframe for direct print dialog
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.src = pdfUrl;
        
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            
            // Cleanup after print dialog closes
            setTimeout(() => {
              document.body.removeChild(iframe);
              URL.revokeObjectURL(pdfUrl);
            }, 1000);
          }, 500);
        };
        
        toast({
          title: "Print requested",
          description: "Transportation receipt has been sent to printer.",
        });
      } else {
        doc.save(`transport-receipt-${order.id}.pdf`);
        
        toast({
          title: "Download complete",
          description: "Transportation receipt has been downloaded.",
        });
      }
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Download failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleCopyReceipt = () => {
    // Copy receipt details to clipboard
    const formValues = form.getValues();
    const receiptText = `
TRANSPORTATION RECEIPT
Order #${order.id} | Route #${formValues.routeNumber}
Date: ${formatDate(order.date)}

TRANSPORT DETAILS:
Driver: ${formValues.driverName}
Vehicle ID: ${formValues.vehicleId}
Departure: ${formValues.departureDate}
Est. Arrival: ${formValues.estimatedArrival}

CLIENT: ${order.clientName}
ITEMS: ${order.items.map(i => `${i.productName || i.name} x${i.quantity}`).join(", ")}

${formValues.notes ? `NOTES: ${formValues.notes}` : ""}
Confirmed by: ${formValues.signature}
    `.trim();
    
    navigator.clipboard.writeText(receiptText).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Receipt details have been copied.",
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    });
  };
  
  const handleNewReceipt = () => {
    setReceiptGenerated(false);
    form.reset();
  };
  
  const handleOpenBOL = () => {
    setShowBolDialog(true);
  };
  
  const handleBolClose = () => {
    setShowBolDialog(false);
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Truck className="mr-2 h-5 w-5" />
              Transportation Documentation for Order #{order.id}
            </DialogTitle>
          </DialogHeader>
          
          {!receiptGenerated ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-4">
                <Button 
                  variant={documentType === "receipt" ? "default" : "outline"} 
                  onClick={() => setDocumentType("receipt")}
                  className="w-full"
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Transportation Receipt
                </Button>
                <Button 
                  variant={documentType === "bol" ? "default" : "outline"} 
                  onClick={handleOpenBOL}
                  className="w-full"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Bill of Lading (BOL)
                </Button>
              </div>
              
              {documentType === "receipt" && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="details">Basic Details</TabsTrigger>
                    <TabsTrigger value="delivery">Delivery Info</TabsTrigger>
                    <TabsTrigger value="special">Special Requirements</TabsTrigger>
                  </TabsList>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <TabsContent value="details" className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="driverName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Driver Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter driver's name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="vehicleId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vehicle ID/License</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter vehicle ID" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="departureDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Departure Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="estimatedArrival"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Estimated Arrival</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="transportCompany"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transport Company</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter transport company name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="routeNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Route Number</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter route number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      
                      <TabsContent value="delivery" className="space-y-4">
                        <FormField
                          control={form.control}
                          name="deliveryLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Delivery Location</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter delivery address" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">Order Summary</h4>
                          <p className="text-sm">Client: {order.clientName}</p>
                          <p className="text-sm">Order Date: {formatDate(order.date)}</p>
                          <p className="text-sm">Items: {order.items.length}</p>
                          <p className="text-sm text-muted-foreground">
                            Total Weight: ~{order.items.reduce((acc, item) => acc + item.quantity, 0) * 2} lbs
                          </p>
                          {onViewClientProfile && (
                            <Button 
                              variant="link" 
                              className="p-0 h-auto text-sm text-primary" 
                              onClick={onViewClientProfile}
                            >
                              <User className="mr-1 h-3 w-3" />
                              View Client Profile
                            </Button>
                          )}
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Special Instructions</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Enter any special handling instructions or notes" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      
                      <TabsContent value="special" className="space-y-4">
                        <FormField
                          control={form.control}
                          name="packagingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Packaging Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select packaging type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Standard">Standard</SelectItem>
                                  <SelectItem value="Eco-Friendly">Eco-Friendly</SelectItem>
                                  <SelectItem value="Insulated">Insulated</SelectItem>
                                  <SelectItem value="Cold Chain">Cold Chain</SelectItem>
                                  <SelectItem value="Premium">Premium</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="temperatureRequirements"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Temperature Requirements</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select temperature requirements" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="33-40°F (Refrigerated)">33-40°F (Refrigerated)</SelectItem>
                                  <SelectItem value="0°F (Frozen)">0°F (Frozen)</SelectItem>
                                  <SelectItem value="60-75°F (Room Temperature)">60-75°F (Room Temperature)</SelectItem>
                                  <SelectItem value="50-60°F (Cool)">50-60°F (Cool)</SelectItem>
                                  <SelectItem value="Custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="signature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Digital Signature</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Type your full name to sign" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="pt-2">
                          <p className="text-sm text-muted-foreground">Receipt Type</p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              type="button"
                              variant={receiptType === "standard" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setReceiptType("standard")}
                              className="flex items-center"
                            >
                              <Receipt className="mr-1 h-4 w-4" />
                              Standard
                            </Button>
                            <Button
                              type="button"
                              variant={receiptType === "detailed" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setReceiptType("detailed")}
                              className="flex items-center"
                            >
                              <ReceiptText className="mr-1 h-4 w-4" />
                              Detailed
                            </Button>
                            <Button
                              type="button"
                              variant={receiptType === "qr" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setReceiptType("qr")}
                              className="flex items-center"
                            >
                              <QrCode className="mr-1 h-4 w-4" />
                              QR Code
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          type="button" 
                          onClick={handleOpenBOL}
                          className="mr-auto"
                        >
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Switch to BOL
                        </Button>
                        <Button type="submit">
                          <ArrowDown className="mr-2 h-4 w-4" />
                          Generate Receipt
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </Tabs>
              )}
            </div>
          ) : (
            <div ref={receiptRef} className="p-6 border rounded-md bg-white space-y-6">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">TRANSPORTATION RECEIPT</h2>
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-gray-600">Order #{order.id}</p>
                    <p className="text-sm text-gray-600">•</p>
                    <p className="text-sm text-gray-600">Route #{form.getValues().routeNumber}</p>
                  </div>
                  <p className="text-sm text-gray-600">Date: {formatDate(order.date)}</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-primary">{form.getValues().transportCompany || "Vali Produce"}</h3>
                  <p className="text-sm text-gray-600">4300 Pleasantdale Rd</p>
                  <p className="text-sm text-gray-600">Atlanta, GA 30340, USA</p>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2 border-t border-b py-4">
                <div>
                  <h4 className="font-medium mb-2">Transport Details</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <p>Driver: {form.getValues().driverName}</p>
                    </div>
                    <div className="flex gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      <p>Vehicle ID: {form.getValues().vehicleId}</p>
                    </div>
                    <div className="flex gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <p>Departure: {form.getValues().departureDate}</p>
                    </div>
                    <div className="flex gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <p>Est. Arrival: {form.getValues().estimatedArrival}</p>
                    </div>
                  </div>
                  
                  {receiptType === "detailed" && (
                    <div className="mt-4 space-y-1 text-sm">
                      <div className="flex gap-2">
                        <Building className="h-4 w-4 text-primary" />
                        <p>Transport Company: {form.getValues().transportCompany}</p>
                      </div>
                      <div className="flex gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <p>Temperature Requirements: {form.getValues().temperatureRequirements}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-2">Client Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {order.clientName}</p>
                   <p>
  <span className="text-muted-foreground">ID:</span>{" "}
  {order.clientId?.slice(-4).toUpperCase()}
</p>

                    <p><span className="text-muted-foreground">Order Date:</span> {formatDate(order.date)}</p>
                    <p><span className="text-muted-foreground">Status:</span> <span className="capitalize">{order.status}</span></p>
                    <p><span className="text-muted-foreground">Delivery Location:</span> {form.getValues().deliveryLocation || getDeliveryAddress() || "Client Address"}</p>
                  </div>
                  
                  {onViewClientProfile && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-sm text-primary mt-2" 
                      onClick={onViewClientProfile}
                    >
                      <User className="mr-1 h-3 w-3" />
                      View Client Profile
                    </Button>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Cargo Details</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Item</th>
                      <th className="text-right py-2">Quantity</th>
                      {receiptType === "detailed" && (
                        <>
                          <th className="text-right py-2">Weight</th>
                          <th className="text-right py-2">Package Type</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2">{item.productName}</td>
                        <td className="text-right py-2">{item.quantity}</td>
                        {receiptType === "detailed" && (
                          <>
                            <td className="text-right py-2">~{item.quantity * 2} lbs</td>
                            <td className="text-right py-2">{form.getValues().packagingType}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {form.getValues().notes && (
                <div>
                  <h4 className="font-medium">Special Instructions</h4>
                  <p className="text-sm border p-2 rounded bg-gray-50">{form.getValues().notes}</p>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Confirmed By:</h4>
                    <p className="text-sm italic">{form.getValues().signature}</p>
                    <p className="text-xs text-gray-500">Digital signature</p>
                  </div>
                  <div className="text-green-600 flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    <span className="font-medium">RECEIPT CONFIRMED</span>
                  </div>
                </div>
              </div>
              
              {receiptType === "qr" && (
                <div className="flex justify-center mt-4">
                  <div className="text-center">
                    <div className="bg-gray-100 p-4 inline-block">
                      <div className="w-24 h-24 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMSAyMSI+PHBhdGggZD0iTTEgMWgzdjNoLTN6bTQgMGgxdjFoLTF6bTIgMGgxdjFoLTF6bTIgMGgydjJoLTJ6bTMgMGgzdjNoLTN6TTEgNWgxdjFoLTF6bTcgMGgxdjJoLTF6bTIgMGgxdjFoLTF6bTMgMGgxdjFoLTF6TTEgN2gxdjFoLTF6bTIgMGgzdjFoLTN6bTIgMWgxdjFoLTF6bTEgMGgxdjFoLTF6bTEgMGgxdjJoLTF6bTEgMGgxdjFoLTF6bTEgMGgxdjFoLTF6TTEgOWgxdjFoLTF6bTIgMGgxdjJoLTF6bTEgMGgxdjFoLTF6bTEgMGgxdjFoLTF6bTIgMGgxdjFoLTF6bTUgMGgxdjJoLTF6TTcgMTBoMXYxaC0xek05IDEwaDJ2MWgtMnpNMiAxMWgydjJoLTJ6bTUgMGgxdjFoLTF6TTkgMTFoMXYxaC0xem0yIDBoMnYxaC0yek0xIDEzaDV2MWgtNXptNiAwaDJ2MWgtMnptNCAwaDN2MWgtM3ptNCAwaDN2M2gtM3pNMyAxNWgxdjFoLTF6bTIgMGgxdjFoLTF6bTIgMGgzdjFoLTN6TTEgMTdoM3YzaC0zem00IDBoMnYxaC0yek04IDE3aDJ2MmgtMnptNCAwaDF2MWgtMXptMiAwaDJ2MWgtMnpNNSAxOGgxdjFoLTF6bTggMGgxdjFoLTF6bTIgMGgxdjFoLTF6bTIgMGgxdjFoLTF6TTEzIDE5aDF2MWgtMXoiLz48L3N2Zz4=')]"></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Scan for digital verification</p>
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                <div className="flex gap-2 flex-1">
                  <Button variant="outline" onClick={() => handleDownloadOrPrint(true)} className="flex-1">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleDownloadOrPrint(false)} 
                    disabled={downloadLoading}
                    className="flex-1"
                  >
                    {downloadLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {downloadLoading ? "Downloading..." : "Download"}
                  </Button>
                  <Button variant="outline" onClick={handleCopyReceipt} className="flex-1">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="destructive" size="icon" onClick={handleNewReceipt}>
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>New receipt</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {showBolDialog && (
        <BillOfLadingForm 
          order={order}
          onClose={handleBolClose}
          open={showBolDialog}
          // Removed the open prop since it's not required
        />
      )}
    </>
  );
};

export default TransportationReceipt;