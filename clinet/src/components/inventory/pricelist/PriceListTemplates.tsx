import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader, Plus, SendHorizontal } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PriceListTemplate from "./PriceListTemplate";
import PriceListTemplateForm from "./PriceListTemplateForm";
import {
  PriceListTemplate as PriceListTemplateType,
  PriceListProduct,
} from "@/components/inventory/forms/formTypes";
import { useToast } from "@/hooks/use-toast";
import CreateOrderModal from "./CreateOrderModal";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  createPriceListAPI,
  getAllPriceListAPI,
  updatePriceList,
} from "@/services2/operations/priceList";
import { deltePriceAPI } from "@/services2/operations/priceList";

// Mock data for price list templates

const PriceListTemplates = () => {
  const [templates, setTemplates] = useState<PriceListTemplateType[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] =
    useState<PriceListTemplateType | null>(null);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PriceListTemplateType | null>(null);
  const { toast } = useToast();
  const token = useSelector((state: RootState) => state.auth?.token ?? null);
  const [loading, setLoading] = useState(false);

  // Pagination state (server-side, fixed page size: 10)
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const handleAddNew = () => {
    setCurrentTemplate(null);
    setIsFormOpen(true);
  };

  const fetchProducts = async (targetPage = 1) => {
    try {
      setLoading(true); // Show loader
      const query = `page=${targetPage}&limit=${PAGE_SIZE}`;
      const response = await getAllPriceListAPI(query);
      if (response) {
        setTemplates(response.data || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
        setPage(response.page || targetPage);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false); // Hide loader
    }
  };

  useEffect(() => {
    fetchProducts(1);
  }, []);

  const handleEdit = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setCurrentTemplate(template);
      setIsFormOpen(true);
    }
  };

  const handleDelete = async (templateId: string) => {
    await deltePriceAPI(templateId);
    // Refetch current page to keep pagination consistent
    await fetchProducts(page);
    toast({
      title: "Template Deleted",
      description: "The price list template has been deleted successfully",
    });
  };

  const handleSaveTemplate = async (template: PriceListTemplateType) => {
    if (currentTemplate) {
      console.log(currentTemplate);

      await updatePriceList(template.id, template, token);
      await fetchProducts(page);
      toast({
        title: "Template Updated",
        description: "Price list template has been updated successfully",
      });
    } else {
      // const newTemplate = {
      //   ...template,
      //   id: `p${templates.length + 1}`,
      //   createdAt: new Date().toISOString(),
      // };
      // setTemplates([...templates, newTemplate]);

      await createPriceListAPI(template, token);
      await fetchProducts(1); // Show newest first on first page

      toast({
        title: "Template Created",
        description: "New price list template has been created successfully",
      });
    }
    setIsFormOpen(false);
  };

  const handleSendClick = (templateId: string) => {
    console.log("Send clicked for template", templateId);
  };

  const handleCreateOrder = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setIsCreateOrderModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Price List Templates</h2>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>
      <div>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-muted rounded-lg p-10 text-center">
            <SendHorizontal className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Price Lists Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Create your first price list template to share with stores. You
              can customize products, prices, and categories.
            </p>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Template
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <PriceListTemplate
                key={template.id}
                template={template}
                onSend={handleSendClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCreateOrder={handleCreateOrder}
                fetchProducts={fetchProducts}
              />
            ))}
            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + templates.length} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchProducts(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchProducts(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <PriceListTemplateForm
            template={currentTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <CreateOrderModal
        isOpen={isCreateOrderModalOpen}
        onClose={() => setIsCreateOrderModalOpen(false)}
        template={selectedTemplate}
      />
    </div>
  );
};

export default PriceListTemplates;
