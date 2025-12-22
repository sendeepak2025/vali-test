import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { addChequesAPI, editChequeAPI } from "@/services2/operations/auth";
import { imageUpload } from "@/services2/operations/image";

const ChequeModal = ({ isOpen, onClose, storeId, cheque ,fetchCheques}) => {
  const isEdit = !!cheque;

  const [images, setImages] = useState([]); // Array of URLs
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [loading, setLoading] = useState(false);

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
  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/*": [] },
    onDrop: async (acceptedFiles) => {
      setLoading(true);
      try {
        const uploadedUrls = await imageUpload(acceptedFiles); // returns array of URLs
        setImages((prev) => [...prev, ...uploadedUrls]);
      } catch (err) {
        console.error("Image upload failed:", err);
      } finally {
        setLoading(false);
      }
    },
  });

  const removeImage = (urlToRemove) => {
    setImages(images.filter((url) => url !== urlToRemove));
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  
  const formData = {
    images: JSON.stringify(images), // array of URLs
    amount,
    notes,
    chequeNumber,
  };

  try {
    setLoading(true);
    if (isEdit) {
      const response = await editChequeAPI(storeId, cheque._id, formData);
      if (response?.success) { // success check
        fetchCheques();
        onClose(); // close only on success
      }
    } else {
      const response = await addChequesAPI(storeId, formData);
      if (response?.success) { // success check
        onClose(); // close only on success
      }
    }
  } catch (err) {
    console.error("Failed to save cheque:", err);
    // optional: show toast or error message
  } finally {
    setLoading(false);
  }
};


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md relative">
        <h2 className="text-lg font-bold mb-4">{isEdit ? "Edit Cheque" : "Add Cheque"}</h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className="border-2 border-dashed p-4 rounded cursor-pointer text-center"
          >
            <input {...getInputProps()} />
            <p>{loading ? "Uploading..." : "Drag & drop or click to upload images"}</p>
          </div>

          {/* Preview Images */}
          <div className="flex flex-wrap gap-2">
            {images.map((url) => (
              <div key={url} className="relative w-20 h-20">
                <img
                  src={url}
                  alt="cheque"
                  className="w-full h-full object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border p-2 rounded"
          />

          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border p-2 rounded"
          />

          <input
            type="text"
            placeholder="Cheque Number"
            value={chequeNumber}
            onChange={(e) => setChequeNumber(e.target.value)}
            className="w-full border p-2 rounded"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-400 text-white rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded"
            >
              {isEdit ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChequeModal;
