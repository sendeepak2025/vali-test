import React, { useEffect, useState } from "react";
import {
  PriceListTemplate as PriceListTemplateType,
  EmailSendOptions,
} from "@/components/inventory/forms/formTypes";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Edit,
  Trash2,
  Send,
  Mail,
  Download,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import EmailForm from "@/components/shared/EmailForm";
import { useToast } from "@/hooks/use-toast";
import { sendPriceListTemplateEmail } from "@/utils/email/inventoryEmailUtils";
import { exportPriceListToPDF } from "@/utils/pdf";
import { Input } from "@/components/ui/input";
import { CardTitle } from "@/components/ui/card";
import SelecteStores from "./SelecteStores";
import { priceListEmailMulti } from "@/services2/operations/email";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { createPriceListAPI } from "@/services2/operations/priceList";
import SendOrderToStore from "./SendOrderToStore";

interface PriceListTemplateProps {
  template: PriceListTemplateType;
  onSend: (templateId: string) => void;
  onEdit: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onCreateOrder: (templateId: string) => void;
}

const PriceListTemplate: React.FC<PriceListTemplateProps> = ({
  template,
  onSend,
  onEdit,
  onDelete,
  onCreateOrder,
  fetchProducts,
}) => {
  const formattedDate = format(new Date(template.createdAt), "MMMM dd, yyyy");
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [sendOrder, setSendOrder] = useState(false);
  const [isMultiEmail, setMultiEmail] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [isSendByPriceCategory, setIsSendByPriceCategory] = useState(false);
  const { toast } = useToast();
  const token = useSelector((state: RootState) => state.auth?.token ?? null);

  const [selectedPricing, setSelectedPricing] = useState<string>("pricePerBox");
  const [selectedStore, setSelectedStore] = useState<
    { label: string; value: string }[]
  >([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prices, setPrices] = useState({
    price: "",
    aPrice: "",
    bPrice: "",
    cPrice: "",
    restaurantPrice: "",
  });

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrices((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddNew = async (template) => {
    await createPriceListAPI(template, token);
    fetchProducts();
  };

  const sendMulti = async () => {
    // const url = `http://valiproduce.shop/store/template?templateId=${template.id}`;
    const url = `http://valiproduce.shop/store/mobile`;
    console.log(url);
    await priceListEmailMulti({ url, selectedStore }, token);
  };

  const sendByPriceCategory = async () => {
    setIsSendingEmail(true);
    try {
      // Call backend API to send to all stores by price category
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL || 'http://localhost:5000/api'}/email/send-by-price-category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateId: template.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: `Price list sent to ${data.totalSent} stores based on their price categories`,
        });
        setIsSendByPriceCategory(false);
      } else {
        throw new Error(data.message || "Failed to send emails");
      }
    } catch (error) {
      console.error("Error sending by price category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send price list to stores",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendEmail = async (emailData) => {
    setIsSendingEmail(true);
    try {
      // Generate PDF before sending email
      const pdfDoc = exportPriceListToPDF(template);

      const emailOptions: EmailSendOptions = {
        webhookUrl: "/api/email", // Replace with your actual webhook URL
        fromName: "Vali Produce",
        showNotifications: true,
        attachments: [
          {
            filename: `price-list-${template.name
              .toLowerCase()
              .replace(/\s+/g, "-")}.pdf`,
            data: pdfDoc.output("datauristring"),
          },
        ],
      };

      const result = await sendPriceListTemplateEmail(
        template,
        emailData.clientIds || [], // You would need to populate this with selected clients
        emailOptions
      );

      if (result.success) {
        toast({
          title: "Price List Sent",
          description: `Successfully sent to ${result.sent} stores`,
          variant: "default",
        });
        setIsConfirmationVisible(true);
        setTimeout(() => setIsConfirmationVisible(false), 3000);
      } else {
        toast({
          title: "Error Sending Price List",
          description: `Failed to send to ${result.failed} stores`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending price list:", error);
      toast({
        title: "Error Generating PDF",
        description: "Failed to generate and send the price list PDF",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
      setIsEmailDialogOpen(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      console.log("template", template);
      console.log("prices", selectedPricing);
      exportPriceListToPDF(template, selectedPricing);

      toast({
        title: "PDF Downloaded",
        description: "Price list PDF has been generated and downloaded",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-black">{template.name}</h3>
          <p className="text-black text-sm mt-1">Created on {formattedDate}</p>
          {template.description && (
            <p className="text-black mt-2">{template.description}</p>
          )}

          <div className="mt-2">
            {template.status === "active" && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                Active
              </Badge>
            )}
            {template.status === "draft" && (
              <Badge variant="secondary">Draft</Badge>
            )}
            {template.status === "archived" && (
              <Badge variant="destructive">Archived</Badge>
            )}
          </div>

          {/* 🚀 Copy URL Buttons - Direct Copy */}
          <div className="flex gap-2">
            <button 
              onClick={() => {
                // const url = `http://valiproduce.shop/store/template?templateId=${template.id}`;
                const url = `http://valiproduce.shop/store/mobile`;
                navigator.clipboard.writeText(url);
                toast({
                  title: "URL Copied!",
                  description: "Template URL has been copied to clipboard",
                });
              }}
              className="mt-4 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              <Copy className="h-4 w-4 inline mr-1" />
              Copy URL
            </button>
            
            {/* <button 
              onClick={() => {
                const url = `http://valiproduce.shop/store/nextweek?templateId=${template.id}`;
                navigator.clipboard.writeText(url);
                toast({
                  title: "URL Copied!",
                  description: "Next week order URL has been copied to clipboard",
                });
              }}
              className="mt-4 px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
            >
              <Copy className="h-4 w-4 inline mr-1" />
              Copy Next Week URL
            </button> */}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setIsEmailDialogOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send to Stores
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateOrder(template.id)}>
              <FileText className="h-4 w-4 mr-2" />
              Create Order
            </DropdownMenuItem>
            {/* <DropdownMenuItem onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </DropdownMenuItem> */}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(template.id)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(template.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddNew(template)}>
              <Download className="h-4 w-4 mr-2" />
              Duplicate Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Download className="h-4 w-4 mr-1" />
              Download PDF
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter Prices for Download</DialogTitle>
            </DialogHeader>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="pricing"
                value="pricePerBox"
                checked={selectedPricing === "pricePerBox"}
                onChange={() => setSelectedPricing("pricePerBox")}
              />
              <label>Price</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="pricing"
                value="aPrice"
                checked={selectedPricing === "aPrice"}
                onChange={() => setSelectedPricing("aPrice")}
              />
              <label>A Price</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="pricing"
                value="bPrice"
                checked={selectedPricing === "bPrice"}
                onChange={() => setSelectedPricing("bPrice")}
              />
              <label>B Price</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="pricing"
                value="cPrice"
                checked={selectedPricing === "cPrice"}
                onChange={() => setSelectedPricing("cPrice")}
              />
              <label>C Price</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="pricing"
                value="restaurantPrice"
                checked={selectedPricing === "restaurantPrice"}
                onChange={() => setSelectedPricing("restaurantPrice")}
              />
              <label>Restaurant Price</label>
            </div>

            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={handleDownloadPDF}>Download PDF</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEmailDialogOpen(true)}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          <Send className="h-4 w-4 mr-1" />
          Send to Stores
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSendOrder(true)}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          <Send className="h-4 w-4 mr-1" />
          Send Order Form To Store
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMultiEmail(true)}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          <Send className="h-4 w-4 mr-1" />
          Send to Bulk Stores 
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsSendByPriceCategory(true)}
          className="text-orange-600 border-orange-200 hover:bg-orange-50"
        >
          <Mail className="h-4 w-4 mr-1" />
          Send to All by Price
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onCreateOrder(template.id)}
          className="text-purple-600 border-purple-200 hover:bg-purple-50"
        >
          <FileText className="h-4 w-4 mr-1" />
          Create Order
        </Button>
      </div>

      {isConfirmationVisible && (
        <div className="mt-3 p-2 bg-green-50 text-green-700 rounded-md flex items-center">
          <Check className="h-4 w-4 mr-2" />
          Price list successfully sent to stores
        </div>
      )}

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Price List</DialogTitle>
            <DialogDescription>
              The price list will be sent as a PDF attachment to the selected
              stores.
            </DialogDescription>
          </DialogHeader>
          <EmailForm
            onClose={() => setIsEmailDialogOpen(false)}
            onSubmit={handleSendEmail}
            defaultSubject={`Price List: ${template.name}`}
            defaultMessage={`${template.id}&cat=${
              selectedPricing === "pricePerBox" ? "price" : selectedPricing
            }`}
            templates={true}
            attachmentsEnabled={true}
            webhookUrl="/api/email" // Replace with your actual webhook URL
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
              disabled={isSendingEmail}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="email-form"
              disabled={isSendingEmail}
              isLoading={isSendingEmail}
            >
              Send Price List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    <SendOrderToStore
  open={sendOrder}
  onClose={setSendOrder}
  template={template}
/>

      <Dialog open={isMultiEmail} onOpenChange={setMultiEmail}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Price List</DialogTitle>
            <DialogDescription>
              The price list will be sent as a PDF attachment to the selected
              stores.
            </DialogDescription>
          </DialogHeader>

          <SelecteStores
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMultiEmail(false)}
              disabled={isSendingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={sendMulti}
              form="email-form"
              disabled={isSendingEmail || selectedStore.length === 0}
              isLoading={isSendingEmail}
            >
              Send Price List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSendByPriceCategory} onOpenChange={setIsSendByPriceCategory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send to All by Price Category</DialogTitle>
            <DialogDescription>
              Automatically send price list to all stores based on their price category.
              Each store will receive the URL with their assigned pricing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Stores with <strong>pricePerBox</strong> → Get Price URL</li>
                <li>Stores with <strong>aPrice</strong> → Get A Price URL</li>
                <li>Stores with <strong>bPrice</strong> → Get B Price URL</li>
                <li>Stores with <strong>cPrice</strong> → Get C Price URL</li>
                <li>Stores with <strong>restaurantPrice</strong> → Get Restaurant Price URL</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This will send emails to all stores in the system based on their price category settings.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSendByPriceCategory(false)}
              disabled={isSendingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={sendByPriceCategory}
              disabled={isSendingEmail}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send to All Stores
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriceListTemplate;
