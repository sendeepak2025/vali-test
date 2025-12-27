import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { addChequesAPI, editChequeAPI } from "@/services2/operations/auth";
import { imageUpload } from "@/services2/operations/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";

interface ChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  cheque?: {
    _id: string;
    images?: string[];
    amount?: string;
    notes?: string;
    chequeNumber?: string;
  };
  fetchCheques?: () => void;
}

const ChequeModal = ({ isOpen, onClose, storeId, cheque, fetchCheques }: ChequeModalProps) => {
  const isEdit = !!cheque;

  const [images, setImages] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Initialize form values on open/edit
  useEffect(() => {
    if (isEdit && cheque) {
      setImages(cheque.images || []);
      setAmount(cheque.amount || "");
      setNotes(cheque.notes || "");
      setChequeNumber(cheque.chequeNumber || "");
    } else {
      setImages([]);
      setAmount("");
      setNotes("");
      setChequeNumber("");
    }
  }, [cheque, isEdit]);

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    onDrop: async (acceptedFiles) => {
      setUploading(true);
      try {
        const uploadedUrls = await imageUpload(acceptedFiles);
        setImages((prev) => [...prev, ...uploadedUrls]);
      } catch (err) {
        console.error("Image upload failed:", err);
      } finally {
        setUploading(false);
      }
    },
  });

  const removeImage = (urlToRemove: string) => {
    setImages(images.filter((url) => url !== urlToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = {
      images: JSON.stringify(images),
      amount,
      notes,
      chequeNumber,
    };

    try {
      setLoading(true);
      if (isEdit && cheque) {
        const response = await editChequeAPI(storeId, cheque._id, formData);
        if (response?.success) {
          fetchCheques?.();
          onClose();
        }
      } else {
        const response = await addChequesAPI(storeId, formData);
        if (response?.success) {
          onClose();
        }
      }
    } catch (err) {
      console.error("Failed to save cheque:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Cheque" : "Add New Cheque"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dropzone */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Cheque Images</Label>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all duration-200
                flex flex-col items-center justify-center gap-2 text-center
                ${isDragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                }
              `}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? "Drop images here" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
                </>
              )}
            </div>
          </div>

          {/* Preview Images */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((url) => (
                <div key={url} className="relative group aspect-square">
                  <img
                    src={url}
                    alt="cheque"
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-medium"
            />
          </div>

          {/* Cheque Number */}
          <div className="space-y-2">
            <Label htmlFor="chequeNumber">Cheque Number</Label>
            <Input
              id="chequeNumber"
              type="text"
              placeholder="Enter cheque number"
              value={chequeNumber}
              onChange={(e) => setChequeNumber(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEdit ? "Updating..." : "Adding..."}
                </>
              ) : (
                isEdit ? "Update Cheque" : "Add Cheque"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChequeModal;
