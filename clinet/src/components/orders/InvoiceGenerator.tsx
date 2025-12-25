"use client";

import type React from "react";
import { useState, useRef } from "react";
import { type Order, formatCurrency, formatDate } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Printer,
  Download,
  Mail,
  RefreshCw,
  CalendarClock,
  BadgeCheck,
  Settings2,
  ChevronDown,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { exportInvoiceToPDF } from "@/utils/pdf";
import {
  updateOrderShippingAPI,
  senInvoiceAPI,
} from "@/services2/operations/order";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

interface InvoiceGeneratorProps {
  orderSingle: Order;
  open: boolean;
  onClose: () => void;
  fetchOrders: () => void;
  onViewClientProfile?: () => void;
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  orderSingle,
  open,
  onClose,
  fetchOrders,
  onViewClientProfile,
}) => {
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const [invoiceOptions, setInvoiceOptions] = useState({
    includeHeader: true,
    includeCompanyDetails: true,
    includePaymentTerms: true,
    includeLogo: true,
    includeSignature: false,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    invoiceTemplate: "standard",
  });
  const [showOptions, setShowOptions] = useState(false);
  const [order, setOrder] = useState(orderSingle);
  const [showShipping, setShowShipping] = useState(true);
  const [shippingCost, setShippingCost] = useState(order.shippinCost || 0);
  const [plateCount, setPlateCount] = useState((order as any).plateCount || "");
  const token = useSelector((state: RootState) => state.auth?.token ?? null);

 const handlePrint = () => { 
  if (!invoiceRef.current) return;

  const printWindow = window.open("", "", "height=800,width=900");
  if (!printWindow) return;

  const invoiceHTML = invoiceRef.current.innerHTML;

  const printCSS = `
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      html, body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.4;
        color: #333;
        background: #fff;
        padding: 0;
        margin: 0;
        width: 100%;
        min-height: 100%;
      }

      @page {
        size: Letter;
        margin: 0.4in 0.3in 0.6in 0.3in;
      }

      .invoice-container {
        width: 100%;
        max-width: 100%;
        background: white;
        overflow: visible;
        font-size: 0.9em;
        margin-bottom: 60px;
      }

      /* Grid and Flex */
      .grid { display: grid; }
      .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
      .gap-4 { gap: 0.8rem; }
      .gap-8 { gap: 1.5rem; }
      .flex { display: flex; }
      .flex-1 { flex: 1; }
      .justify-between { justify-content: space-between; }
      .justify-end { justify-content: flex-end; }
      .items-start { align-items: flex-start; }
      .items-center { align-items: center; }

      /* Spacing - reduced for print */
      .p-4 { padding: 0.8rem; }
      .p-5 { padding: 1rem; }
      .p-6 { padding: 1.2rem; }
      .p-8 { padding: 1.5rem; }
      .px-4 { padding-left: 0.8rem; padding-right: 0.8rem; }
      .px-6 { padding-left: 1.2rem; padding-right: 1.2rem; }
      .py-2 { padding-top: 0.4rem; padding-bottom: 0.4rem; }
      .py-3 { padding-top: 0.6rem; padding-bottom: 0.6rem; }
      .py-4 { padding-top: 0.8rem; padding-bottom: 0.8rem; }
      .py-5 { padding-top: 1rem; padding-bottom: 1rem; }
      .py-6 { padding-top: 1.2rem; padding-bottom: 1.2rem; }
      .pb-2 { padding-bottom: 0.4rem; }
      .pb-6 { padding-bottom: 1.2rem; }
      .pb-10 { padding-bottom: 2rem; }
      .pt-4 { padding-top: 0.8rem; }
      .pt-6 { padding-top: 1.2rem; }
      .mt-1 { margin-top: 0.2rem; }
      .mt-2 { margin-top: 0.4rem; }
      .mt-3 { margin-top: 0.6rem; }
      .mt-4 { margin-top: 0.8rem; }
      .mb-2 { margin-bottom: 0.4rem; }
      .mb-3 { margin-bottom: 0.6rem; }
      .mr-2 { margin-right: 0.4rem; }
      .space-y-1 > * + * { margin-top: 0.2rem; }
      .space-y-0\\.5 > * + * { margin-top: 0.1rem; }

      /* Typography */
      .text-xs { font-size: 0.7rem; }
      .text-sm { font-size: 0.8rem; }
      .text-base { font-size: 0.9rem; }
      .text-lg { font-size: 1rem; }
      .text-xl { font-size: 1.1rem; }
      .text-2xl { font-size: 1.3rem; }
      .text-3xl { font-size: 1.6rem; }
      .text-4xl { font-size: 2rem; }
      .font-medium { font-weight: 500; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }
      .uppercase { text-transform: uppercase; }
      .tracking-tight { letter-spacing: -0.025em; }
      .tracking-wide { letter-spacing: 0.025em; }
      .tracking-wider { letter-spacing: 0.05em; }
      .tracking-widest { letter-spacing: 0.1em; }
      .italic { font-style: italic; }
      .text-left { text-align: left; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }

      /* Colors - Text */
      .text-white { color: white !important; }
      .text-gray-400 { color: #9ca3af; }
      .text-gray-500 { color: #6b7280; }
      .text-gray-600 { color: #4b5563; }
      .text-gray-700 { color: #374151; }
      .text-gray-800 { color: #1f2937; }
      .text-gray-900 { color: #111827; }
      .text-emerald-100 { color: #d1fae5; }
      .text-emerald-400 { color: #34d399; }
      .text-emerald-600 { color: #059669; }
      .text-emerald-700 { color: #047857; }
      .text-emerald-800 { color: #065f46; }
      .text-emerald-900 { color: #064e3b; }
      .text-slate-300 { color: #cbd5e1; }
      .text-slate-400 { color: #94a3b8; }
      .text-slate-600 { color: #475569; }
      .text-slate-700 { color: #334155; }
      .text-slate-800 { color: #1e293b; }
      .text-slate-900 { color: #0f172a; }
      .text-green-600 { color: #16a34a; }

      /* Colors - Background */
      .bg-white { background-color: white !important; }
      .bg-gray-50 { background-color: #f9fafb !important; }
      .bg-gray-100 { background-color: #f3f4f6 !important; }
      .bg-emerald-50 { background-color: #ecfdf5 !important; }
      .bg-emerald-600 { background-color: #059669 !important; }
      .bg-emerald-50\\/50 { background-color: rgba(236, 253, 245, 0.5) !important; }
      .bg-slate-50 { background-color: #f8fafc !important; }
      .bg-slate-800 { background-color: #1e293b !important; }
      .bg-green-500 { background-color: #22c55e !important; }
      .bg-amber-500 { background-color: #f59e0b !important; }

      /* Gradients */
      .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
      .from-emerald-600 { --tw-gradient-from: #059669; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, transparent); }
      .to-emerald-700 { --tw-gradient-to: #047857; }
      .from-slate-800 { --tw-gradient-from: #1e293b; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, transparent); }
      .to-slate-900 { --tw-gradient-to: #0f172a; }
      
      /* Direct gradient application */
      .bg-gradient-to-r.from-emerald-600.to-emerald-700 {
        background: linear-gradient(to right, #059669, #047857) !important;
      }
      .bg-gradient-to-r.from-slate-800.to-slate-900 {
        background: linear-gradient(to right, #1e293b, #0f172a) !important;
      }

      /* Borders */
      .border { border: 1px solid #e5e7eb; }
      .border-t { border-top: 1px solid #e5e7eb; }
      .border-b { border-bottom: 1px solid #e5e7eb; }
      .border-t-2 { border-top-width: 2px; }
      .border-b-2 { border-bottom-width: 2px; }
      .border-dashed { border-style: dashed; }
      .border-gray-100 { border-color: #f3f4f6; }
      .border-gray-200 { border-color: #e5e7eb; }
      .border-gray-300 { border-color: #d1d5db; }
      .border-emerald-200 { border-color: #a7f3d0; }
      .border-emerald-300 { border-color: #6ee7b7; }
      .border-emerald-500 { border-color: #10b981; }
      .border-slate-100 { border-color: #f1f5f9; }
      .border-slate-200 { border-color: #e2e8f0; }
      .border-slate-300 { border-color: #cbd5e1; }
      .rounded { border-radius: 0.25rem; }
      .rounded-md { border-radius: 0.375rem; }
      .rounded-lg { border-radius: 0.5rem; }
      .rounded-xl { border-radius: 0.75rem; }
      .rounded-full { border-radius: 9999px; }
      .overflow-hidden { overflow: hidden; }

      /* Shadows */
      .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
      .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }

      /* Width */
      .w-72 { width: 16rem; }
      .w-80 { width: 18rem; }
      .w-full { width: 100%; }

      /* Tables */
      table {
        width: 100%;
        border-collapse: collapse;
      }

      thead tr {
        background-color: inherit;
      }

      th {
        font-weight: 600;
        padding: 0.6rem 0.8rem;
      }

      td {
        padding: 0.6rem 0.8rem;
      }

      .text-left { text-align: left; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }

      /* Images */
      img {
        max-height: 50px;
        object-fit: contain;
      }

      .h-12 { height: 2.5rem; }
      .h-16 { height: 3.5rem; }
      .h-20 { height: 4rem; }
      .object-contain { object-fit: contain; }
      .opacity-70 { opacity: 0.7; }

      /* Hover states - remove for print */
      .hover\\:bg-opacity-80:hover { background-opacity: 1; }
      .transition-colors { transition: none; }

      /* SVG icons */
      svg {
        display: inline-block;
        vertical-align: middle;
        width: 1rem;
        height: 1rem;
      }

      /* Print specific */
      @media print {
        html, body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .invoice-container {
          overflow: visible !important;
          margin: 0;
          margin-bottom: 80px !important;
        }

        table {
          page-break-inside: auto;
        }

        tr {
          page-break-inside: avoid;
        }
      }
    </style>
  `;

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice #${order.id}</title>
  ${printCSS}
</head>
<body>
  <div class="invoice-container">
    ${invoiceHTML}
  </div>
  <div style="height: 80px;"></div>
</body>
</html>`);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 600);
};


  const updateShipping = async (cost: number, plates: number) => {
    // Agar shipping cost aur pallet pehle se set hai to API call skip karo
    if (orderSingle.shippinCost && (orderSingle as any).plateCount) {
      console.log("Shipping and pallet already set, skipping update");
      setShowShipping(false);
      return;
    }

    console.log("Shipping cost:", cost);
    console.log("Plate count:", plates);

    const form = {
      orderId: order._id,
      newShippingCost: orderSingle.shippinCost || cost, // Use existing value if present
      plateCount: (orderSingle as any).plateCount || plates, // Use existing value if present
    };

    const response = await updateOrderShippingAPI(form, token);

    if (response) {
      console.log("Shipping updated successfully:", response);

      const updatedOrder = response;

      if (updatedOrder?.orderNumber) {
        setOrder((prevOrder) => ({
          ...updatedOrder,
          id: updatedOrder.orderNumber,
          date: updatedOrder.createdAt,
        }));
        setShowShipping(false);
      }
    } else {
      console.log("Failed to update shipping");
    }
  };

  const handleDownload = () => {
    setDownloadLoading(true);
    try {
      console.log(order);
      exportInvoiceToPDF(
        {
          id: order.orderNumber as any,
          clientId: (order.store as any)._id,
          clientName: (order.store as any).storeName,
          shippinCost: order.shippinCost || 0,
          date: order.date,
          shippingAddress: order?.shippingAddress,
          billingAddress: order?.billingAddress,
          status: order.status,
          items: order.items,
          total: order.total,
          paymentStatus: order.paymentStatus || "pending",
          subtotal: order.total,
          store: order.store,
          paymentDetails: order.paymentDetails || {},
        },
        {
          includeHeader: invoiceOptions.includeHeader,
          includeCompanyDetails: invoiceOptions.includeCompanyDetails,
          includePaymentTerms: invoiceOptions.includePaymentTerms,
          includeLogo: invoiceOptions.includeLogo,
          includeSignature: invoiceOptions.includeSignature,
          dueDate: invoiceOptions.dueDate,
          invoiceTemplate: invoiceOptions.invoiceTemplate,
        }
      );

      toast({
        title: "Download initiated",
        description: "The invoice is being downloaded as a PDF.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleEmail = async () => {
    setEmailLoading(true);
    try {
      await senInvoiceAPI(order._id, token);
      toast({
        title: "Email sent",
        description: "Invoice has been sent to the customer.",
      });
    } catch (error) {
      toast({
        title: "Email failed",
        description: "Failed to send invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const toggleOptions = () => {
    setShowOptions(!showOptions);
  };

  const handleOptionChange = (key: keyof typeof invoiceOptions, value: any) => {
    setInvoiceOptions({
      ...invoiceOptions,
      [key]: value,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentIcon = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "paid":
        return <CreditCard size={16} className="text-green-500" />;
      case "pending":
        return <DollarSign size={16} className="text-yellow-500" />;
      default:
        return <CreditCard size={16} className="text-gray-500" />;
    }
  };

  const getTotalWithTax = () => {
    const taxRate = 0;
    const taxAmount = invoiceOptions.includePaymentTerms
      ? order.total * taxRate
      : 0;
    return order.total + taxAmount;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Invoice #{order.id}
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleOptions}
            className="flex items-center gap-1 bg-transparent"
          >
            <Settings2 className="h-4 w-4" />
            Options
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {showOptions && (
          <div className="mb-6 p-4 border rounded-md bg-muted/20">
            <h3 className="font-medium mb-4">Invoice Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between h-9">
                  <Label htmlFor="includeHeader" className="text-sm">Include Header</Label>
                  <Switch
                    id="includeHeader"
                    checked={invoiceOptions.includeHeader}
                    onCheckedChange={(checked) =>
                      handleOptionChange("includeHeader", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between h-9">
                  <Label htmlFor="includeCompanyDetails" className="text-sm">Company Details</Label>
                  <Switch
                    id="includeCompanyDetails"
                    checked={invoiceOptions.includeCompanyDetails}
                    onCheckedChange={(checked) =>
                      handleOptionChange("includeCompanyDetails", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between h-9">
                  <Label htmlFor="includePaymentTerms" className="text-sm">Include Tax & Terms</Label>
                  <Switch
                    id="includePaymentTerms"
                    checked={invoiceOptions.includePaymentTerms}
                    onCheckedChange={(checked) =>
                      handleOptionChange("includePaymentTerms", checked)
                    }
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between h-9">
                  <Label htmlFor="includeLogo" className="text-sm">Include Logo</Label>
                  <Switch
                    id="includeLogo"
                    checked={invoiceOptions.includeLogo}
                    onCheckedChange={(checked) =>
                      handleOptionChange("includeLogo", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between h-9">
                  <Label htmlFor="includeSignature" className="text-sm">Include Signature</Label>
                  <Switch
                    id="includeSignature"
                    checked={invoiceOptions.includeSignature}
                    onCheckedChange={(checked) =>
                      handleOptionChange("includeSignature", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between h-9">
                  <Label htmlFor="dueDate" className="text-sm">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={invoiceOptions.dueDate}
                    onChange={(e) =>
                      handleOptionChange("dueDate", e.target.value)
                    }
                    className="w-40 h-9"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="invoiceTemplate" className="mb-2 block text-sm">
                Template Style
              </Label>
              <Select
                value={invoiceOptions.invoiceTemplate}
                onValueChange={(value) =>
                  handleOptionChange("invoiceTemplate", value)
                }
              >
                <SelectTrigger id="invoiceTemplate" className="w-full">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {showShipping && (
          <div className="p-4 border rounded-md bg-muted/20 space-y-4">
            <h3 className="font-medium mb-2">Shipping Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shippingCost" className="block text-sm mb-2">
                  Shipping Cost
                </Label>
                <Input
                  id="shippingCost"
                  type="number"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="Enter shipping cost"
                  disabled={!!orderSingle.shippinCost}
                  className={orderSingle.shippinCost ? "bg-muted cursor-not-allowed opacity-60" : ""}
                />
              </div>
              <div>
                <Label htmlFor="plateCount" className="block text-sm mb-2">
                  Pallet Count
                </Label>
                <Input
                  id="plateCount"
                  type="number"
                  value={plateCount}
                  onChange={(e) => setPlateCount(e.target.value)}
                  placeholder="Enter pallet count"
                  disabled={!!(orderSingle as any).plateCount}
                  className={(orderSingle as any).plateCount ? "bg-muted cursor-not-allowed opacity-60" : ""}
                />
              </div>
            </div>
            <Button
              onClick={() => updateShipping(shippingCost, plateCount)}
              className="w-full"
            >
              Submit
            </Button>
          </div>
        )}

        {!showShipping && (
          <div
            ref={invoiceRef}
            className={`invoice-container border bg-white overflow-hidden ${
              invoiceOptions.invoiceTemplate === "standard"
                ? "rounded-lg"
                : invoiceOptions.invoiceTemplate === "professional"
                ? "rounded-xl shadow-lg border-0"
                : invoiceOptions.invoiceTemplate === "minimal"
                ? "rounded-md border-gray-200"
                : invoiceOptions.invoiceTemplate === "detailed"
                ? "rounded-lg shadow-md"
                : "rounded-lg"
            }`}
          >
            {/* HEADER SECTION */}
            {invoiceOptions.includeHeader && (
              <div className={`${
                invoiceOptions.invoiceTemplate === "professional"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-8"
                  : invoiceOptions.invoiceTemplate === "detailed"
                  ? "bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6"
                  : invoiceOptions.invoiceTemplate === "minimal"
                  ? "p-6 border-b border-gray-100"
                  : "p-6 border-b border-gray-200 bg-gray-50"
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className={`font-bold tracking-tight ${
                      invoiceOptions.invoiceTemplate === "professional"
                        ? "text-4xl text-white"
                        : invoiceOptions.invoiceTemplate === "detailed"
                        ? "text-3xl text-white"
                        : invoiceOptions.invoiceTemplate === "minimal"
                        ? "text-lg text-gray-600 font-medium tracking-widest uppercase"
                        : "text-2xl text-gray-800"
                    }`}>
                      INVOICE
                    </h2>
                    <div className={`mt-2 space-y-1 ${
                      invoiceOptions.invoiceTemplate === "professional" || invoiceOptions.invoiceTemplate === "detailed"
                        ? "text-white/80"
                        : "text-gray-500"
                    }`}>
                      <p className={`font-semibold ${
                        invoiceOptions.invoiceTemplate === "professional" ? "text-white text-lg" : 
                        invoiceOptions.invoiceTemplate === "detailed" ? "text-white" : "text-gray-700"
                      }`}>
                        #{order.id}
                      </p>
                      <p className="text-sm">{formatDate(order.date)}</p>
                      {invoiceOptions.dueDate && (
                        <p className={`text-sm ${
                          invoiceOptions.invoiceTemplate === "professional" 
                            ? "bg-white/20 inline-block px-3 py-1 rounded-full mt-2" 
                            : invoiceOptions.invoiceTemplate === "detailed"
                            ? "bg-amber-500 text-white inline-block px-3 py-1 rounded mt-2 font-medium"
                            : ""
                        }`}>
                          Due: {invoiceOptions.dueDate}
                        </p>
                      )}
                    </div>
                  </div>

                  {invoiceOptions.includeLogo && (
                    <div className={`${
                      invoiceOptions.invoiceTemplate === "professional"
                        ? "bg-white p-3 rounded-xl shadow-lg"
                        : invoiceOptions.invoiceTemplate === "detailed"
                        ? "bg-white/10 p-2 rounded-lg"
                        : ""
                    }`}>
                      <img
                        src="/logg.png"
                        alt="Company Logo"
                        className={`object-contain ${
                          invoiceOptions.invoiceTemplate === "professional" ? "h-20" :
                          invoiceOptions.invoiceTemplate === "detailed" ? "h-16" :
                          invoiceOptions.invoiceTemplate === "minimal" ? "h-12 opacity-70" : "h-16"
                        }`}
                      />
                    </div>
                  )}

                  {invoiceOptions.includeCompanyDetails && (
                    <div className={`text-right ${
                      invoiceOptions.invoiceTemplate === "professional" || invoiceOptions.invoiceTemplate === "detailed"
                        ? "text-white/90"
                        : ""
                    }`}>
                      <h3 className={`font-bold mb-2 ${
                        invoiceOptions.invoiceTemplate === "professional"
                          ? "text-2xl text-white"
                          : invoiceOptions.invoiceTemplate === "detailed"
                          ? "text-xl text-white"
                          : invoiceOptions.invoiceTemplate === "minimal"
                          ? "text-base text-gray-700"
                          : "text-xl text-emerald-700"
                      }`}>
                        Vali Produce
                      </h3>
                      <div className={`text-sm space-y-0.5 ${
                        invoiceOptions.invoiceTemplate === "minimal" ? "text-gray-500" : ""
                      }`}>
                        <p>4300 Pleasantdale Rd</p>
                        <p>Atlanta, GA 30340, USA</p>
                        <p>order@valiproduce.shop</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BILLING & SHIPPING SECTION */}
            <div className={`${
              invoiceOptions.invoiceTemplate === "professional"
                ? "p-6 bg-emerald-50"
                : invoiceOptions.invoiceTemplate === "detailed"
                ? "p-6 bg-slate-50"
                : invoiceOptions.invoiceTemplate === "minimal"
                ? "p-6"
                : "p-6"
            }`}>
              <div className={`grid grid-cols-2 gap-8 ${
                invoiceOptions.invoiceTemplate === "professional"
                  ? "bg-white p-5 rounded-xl shadow-sm"
                  : invoiceOptions.invoiceTemplate === "detailed"
                  ? "bg-white p-4 rounded-lg border border-slate-200"
                  : ""
              }`}>
                <div>
                  <h4 className={`font-semibold mb-3 pb-2 border-b ${
                    invoiceOptions.invoiceTemplate === "professional"
                      ? "text-emerald-700 border-emerald-200 text-sm uppercase tracking-wide"
                      : invoiceOptions.invoiceTemplate === "detailed"
                      ? "text-slate-700 border-slate-200"
                      : invoiceOptions.invoiceTemplate === "minimal"
                      ? "text-gray-400 text-xs uppercase tracking-widest border-gray-100 font-medium"
                      : "text-gray-600 border-gray-200"
                  }`}>Sold To</h4>
                  <div className="space-y-1">
                    <p className={`font-semibold ${
                      invoiceOptions.invoiceTemplate === "professional" ? "text-emerald-800" :
                      invoiceOptions.invoiceTemplate === "detailed" ? "text-slate-800" : "text-gray-800"
                    }`}>
                      {order?.billingAddress?.name || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">{order?.billingAddress?.address || "N/A"}</p>
                    <p className="text-sm text-gray-600">
                      {order?.billingAddress?.city || ""}, {order?.billingAddress?.state || ""} {order?.billingAddress?.postalCode || ""}
                    </p>
                    <p className="text-sm text-gray-500">Phone: {order?.billingAddress?.phone || "N/A"}</p>
                  </div>
                </div>

                <div className="text-right">
                  <h4 className={`font-semibold mb-3 pb-2 border-b ${
                    invoiceOptions.invoiceTemplate === "professional"
                      ? "text-emerald-700 border-emerald-200 text-sm uppercase tracking-wide"
                      : invoiceOptions.invoiceTemplate === "detailed"
                      ? "text-slate-700 border-slate-200"
                      : invoiceOptions.invoiceTemplate === "minimal"
                      ? "text-gray-400 text-xs uppercase tracking-widest border-gray-100 font-medium"
                      : "text-gray-600 border-gray-200"
                  }`}>Ship To</h4>
                  <div className="space-y-1">
                    <p className={`font-semibold ${
                      invoiceOptions.invoiceTemplate === "professional" ? "text-emerald-800" :
                      invoiceOptions.invoiceTemplate === "detailed" ? "text-slate-800" : "text-gray-800"
                    }`}>
                      {order?.shippingAddress?.name || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">{order?.shippingAddress?.address || "N/A"}</p>
                    <p className="text-sm text-gray-600">
                      {order?.shippingAddress?.city || ""}, {order?.shippingAddress?.state || ""} {order?.shippingAddress?.postalCode || ""}
                    </p>
                    <p className="text-sm text-gray-500">Phone: {order?.shippingAddress?.phone || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <div className={`${
              invoiceOptions.invoiceTemplate === "professional" ? "px-6 pb-6 bg-emerald-50" :
              invoiceOptions.invoiceTemplate === "detailed" ? "px-6 pb-6 bg-slate-50" :
              "px-6 pb-6"
            }`}>
              <table className={`w-full ${
                invoiceOptions.invoiceTemplate === "professional"
                  ? "bg-white rounded-xl overflow-hidden shadow-sm"
                  : invoiceOptions.invoiceTemplate === "detailed"
                  ? "bg-white rounded-lg overflow-hidden border border-slate-200"
                  : ""
              }`}>
                <thead>
                  <tr className={`${
                    invoiceOptions.invoiceTemplate === "professional"
                      ? "bg-emerald-600 text-white"
                      : invoiceOptions.invoiceTemplate === "detailed"
                      ? "bg-slate-800 text-white"
                      : invoiceOptions.invoiceTemplate === "minimal"
                      ? "border-b-2 border-gray-200"
                      : "bg-gray-100 border-b border-gray-200"
                  }`}>
                    <th className={`text-left py-4 px-4 font-semibold ${
                      invoiceOptions.invoiceTemplate === "minimal" ? "text-gray-500 text-xs uppercase tracking-wider font-medium" : ""
                    }`}>Product</th>
                    <th className={`text-center py-4 px-4 font-semibold ${
                      invoiceOptions.invoiceTemplate === "minimal" ? "text-gray-500 text-xs uppercase tracking-wider font-medium" : ""
                    }`}>Qty</th>
                    <th className={`text-right py-4 px-4 font-semibold ${
                      invoiceOptions.invoiceTemplate === "minimal" ? "text-gray-500 text-xs uppercase tracking-wider font-medium" : ""
                    }`}>Unit Price</th>
                    <th className={`text-right py-4 px-4 font-semibold ${
                      invoiceOptions.invoiceTemplate === "minimal" ? "text-gray-500 text-xs uppercase tracking-wider font-medium" : ""
                    }`}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr
                      key={index}
                      className={`${
                        invoiceOptions.invoiceTemplate === "professional"
                          ? index % 2 === 0 ? "bg-emerald-50/50" : "bg-white"
                          : invoiceOptions.invoiceTemplate === "detailed"
                          ? index % 2 === 0 ? "bg-slate-50" : "bg-white"
                          : invoiceOptions.invoiceTemplate === "minimal"
                          ? "border-b border-gray-100"
                          : index % 2 === 0 ? "bg-gray-50" : "bg-white"
                      } ${
                        invoiceOptions.invoiceTemplate === "professional" || invoiceOptions.invoiceTemplate === "detailed"
                          ? "hover:bg-opacity-80 transition-colors"
                          : ""
                      }`}
                    >
                      <td className={`py-4 px-4 ${
                        invoiceOptions.invoiceTemplate === "professional" ? "text-emerald-900 font-medium" :
                        invoiceOptions.invoiceTemplate === "detailed" ? "text-slate-800 font-medium" :
                        "text-gray-800"
                      }`}>
                        {item.productName || item.name}
                      </td>
                      <td className={`text-center py-4 px-4 ${
                        invoiceOptions.invoiceTemplate === "professional"
                          ? "text-emerald-700"
                          : invoiceOptions.invoiceTemplate === "detailed"
                          ? "text-slate-600"
                          : "text-gray-600"
                      }`}>
                        {item.quantity}
                        {item.pricingType && item.pricingType !== "box"
                          ? " " + (item.pricingType === "unit" ? "LB" : item.pricingType)
                          : ""}
                      </td>
                      <td className={`text-right py-4 px-4 ${
                        invoiceOptions.invoiceTemplate === "minimal" ? "text-gray-500" : "text-gray-600"
                      }`}>
                        {formatCurrency(item.unitPrice || item.price)}
                      </td>
                      <td className={`text-right py-4 px-4 font-semibold ${
                        invoiceOptions.invoiceTemplate === "professional" ? "text-emerald-700" :
                        invoiceOptions.invoiceTemplate === "detailed" ? "text-slate-700" :
                        "text-gray-800"
                      }`}>
                        {formatCurrency(item.quantity * (item.unitPrice || item.price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALS SECTION */}
            <div className={`${
              invoiceOptions.invoiceTemplate === "professional" ? "px-6 pb-6 bg-emerald-50" :
              invoiceOptions.invoiceTemplate === "detailed" ? "px-6 pb-6 bg-slate-50" :
              "px-6 pb-6"
            }`}>
              <div className="flex justify-end">
                <div className={`w-80 ${
                  invoiceOptions.invoiceTemplate === "professional"
                    ? "bg-white rounded-xl p-5 shadow-sm"
                    : invoiceOptions.invoiceTemplate === "detailed"
                    ? "bg-white rounded-lg p-4 border border-slate-200"
                    : invoiceOptions.invoiceTemplate === "minimal"
                    ? ""
                    : "bg-gray-50 rounded-lg p-4"
                }`}>
                  <div className={`flex justify-between py-2 ${
                    invoiceOptions.invoiceTemplate === "minimal" ? "text-gray-500 text-sm" : "text-gray-600"
                  }`}>
                    <span>Subtotal</span>
                    <span className="font-medium">{formatCurrency(order.total - (order.shippinCost || 0))}</span>
                  </div>
                  <div className={`flex justify-between py-2 ${
                    invoiceOptions.invoiceTemplate === "minimal" ? "text-gray-500 text-sm" : "text-gray-600"
                  }`}>
                    <span>Shipping & Handling</span>
                    <span className="font-medium">{formatCurrency(order.shippinCost || 0)}</span>
                  </div>
                  <div className={`flex justify-between py-3 mt-2 border-t-2 ${
                    invoiceOptions.invoiceTemplate === "professional"
                      ? "border-emerald-200"
                      : invoiceOptions.invoiceTemplate === "detailed"
                      ? "border-slate-200"
                      : invoiceOptions.invoiceTemplate === "minimal"
                      ? "border-gray-200"
                      : "border-gray-200"
                  }`}>
                    <span className={`font-bold text-lg ${
                      invoiceOptions.invoiceTemplate === "professional" ? "text-emerald-700" :
                      invoiceOptions.invoiceTemplate === "detailed" ? "text-slate-800" :
                      "text-gray-800"
                    }`}>Total</span>
                    <span className={`font-bold text-xl ${
                      invoiceOptions.invoiceTemplate === "professional" ? "text-emerald-600" :
                      invoiceOptions.invoiceTemplate === "detailed" ? "text-slate-900" :
                      "text-gray-900"
                    }`}>
                      {formatCurrency(getTotalWithTax())}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER / TERMS SECTION */}
            {invoiceOptions.includePaymentTerms && (
              <div className={`text-center ${
                invoiceOptions.invoiceTemplate === "professional"
                  ? "bg-emerald-600 text-white py-6 px-6"
                  : invoiceOptions.invoiceTemplate === "detailed"
                  ? "bg-slate-800 text-white py-5 px-6"
                  : invoiceOptions.invoiceTemplate === "minimal"
                  ? "py-6 px-6 border-t border-gray-100"
                  : "py-6 px-6 bg-gray-50 border-t border-gray-200"
              }`}>
                <p className={`font-medium ${
                  invoiceOptions.invoiceTemplate === "professional" || invoiceOptions.invoiceTemplate === "detailed"
                    ? "text-lg"
                    : invoiceOptions.invoiceTemplate === "minimal"
                    ? "text-gray-600 text-sm"
                    : "text-gray-700"
                }`}>
                  Thank you for your business!
                </p>
                <p className={`text-sm mt-1 ${
                  invoiceOptions.invoiceTemplate === "professional" ? "text-emerald-100" :
                  invoiceOptions.invoiceTemplate === "detailed" ? "text-slate-300" :
                  invoiceOptions.invoiceTemplate === "minimal" ? "text-gray-400" :
                  "text-gray-500"
                }`}>
                  Payment due by {invoiceOptions.dueDate} • Fresh Produce Wholesale
                </p>

                {invoiceOptions.invoiceTemplate === "detailed" && (
                  <div className="flex items-center justify-center mt-4 bg-green-500 text-white py-2 px-4 rounded-full">
                    <BadgeCheck className="h-5 w-5 mr-2" />
                    <span className="font-semibold">Verified & Ready for Payment</span>
                  </div>
                )}

                {invoiceOptions.invoiceTemplate === "professional" && (
                  <div className="mt-4 pt-4 border-t border-emerald-500 text-emerald-100 text-xs">
                    <p>Quality Fresh Produce • Reliable Delivery • Wholesale Pricing</p>
                  </div>
                )}
              </div>
            )}

            {/* SIGNATURE SECTION */}
            {invoiceOptions.includeSignature && (
              <div className={`px-6 py-6 ${
                invoiceOptions.invoiceTemplate === "professional" ? "bg-emerald-50" :
                invoiceOptions.invoiceTemplate === "detailed" ? "bg-slate-50" :
                ""
              }`}>
                <div className="flex justify-end">
                  <div className={`w-72 text-center ${
                    invoiceOptions.invoiceTemplate === "professional"
                      ? "bg-white p-4 rounded-xl shadow-sm"
                      : invoiceOptions.invoiceTemplate === "detailed"
                      ? "bg-white p-4 rounded-lg border border-slate-200"
                      : ""
                  }`}>
                    <div className={`border-b-2 border-dashed pb-10 mb-3 ${
                      invoiceOptions.invoiceTemplate === "professional" ? "border-emerald-300" :
                      invoiceOptions.invoiceTemplate === "detailed" ? "border-slate-300" :
                      "border-gray-300"
                    }`}>
                      <p className={`italic text-sm ${
                        invoiceOptions.invoiceTemplate === "professional" ? "text-emerald-400" :
                        invoiceOptions.invoiceTemplate === "detailed" ? "text-slate-400" :
                        "text-gray-400"
                      }`}>Authorized Signature</p>
                    </div>
                    <p className={`text-sm font-medium ${
                      invoiceOptions.invoiceTemplate === "professional" ? "text-emerald-700" :
                      invoiceOptions.invoiceTemplate === "detailed" ? "text-slate-700" :
                      "text-gray-600"
                    }`}>
                      Vali Produce Representative
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!showShipping && (
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="flex gap-2 flex-1">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex-1 bg-transparent"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>

              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={downloadLoading}
                className="flex-1 bg-transparent"
              >
                {downloadLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {downloadLoading ? "Downloading..." : "Download"}
              </Button>

              <Button 
                onClick={handleEmail} 
                disabled={emailLoading}
                className="flex-1"
              >
                {emailLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {emailLoading ? "Sending..." : "Email"}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceGenerator;
