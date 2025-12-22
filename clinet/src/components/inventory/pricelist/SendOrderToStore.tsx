import React, { useEffect, useState } from "react";
import Select from "react-select";
import { getAllStoresAPI } from "@/services2/operations/auth";
import { sendOrderToStoreAPI } from "@/services2/operations/priceList";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RootState } from "@/redux/store";
import { useSelector } from "react-redux";

function SendOrderToStore({ open, onClose, template }) {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = useSelector((state: RootState) => state.auth?.token ?? null);

  useEffect(() => {
    if (!open) return;

    const fetchStores = async () => {
      try {
        const storesData = await getAllStoresAPI();
        const formattedStores = storesData.map(({ email, storeName }) => ({
          value: email,
          label: storeName,
        }));
        setStores(formattedStores);
      } catch (error) {
        toast.error("Failed to fetch stores");
      }
    };

    fetchStores();
  }, [open]);

  const sendTemplateToStore = async () => {
    if (selectedStore.length === 0) {
      toast.warning("Please select at least one store!");
      return;
    }

    const emails = selectedStore.map((s) => s.value);

    const formData = {
      email :emails, // <-- multiple emails
      templateId: template.id,
    };

    try {
      setLoading(true);
      await sendOrderToStoreAPI(formData, token);
      onClose();
    } catch (error) {
      toast.error("Failed to send template.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[400px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Stores</DialogTitle>
          <DialogDescription>
            Select one or more stores to send the template.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex-grow">
          <Select
            options={stores}
            value={selectedStore}
            onChange={setSelectedStore}
            placeholder="Search and select stores..."
            isSearchable
            isMulti={true}
            styles={{
              container: (base) => ({ ...base, width: "100%" }),
            }}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={sendTemplateToStore}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SendOrderToStore;
