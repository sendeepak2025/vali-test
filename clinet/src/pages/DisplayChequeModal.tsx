import React, { useEffect, useState } from "react";
import { getChequesByStoreAPI } from "@/services2/operations/auth";
import ChequeModal from "./ChequeModal";

const DisplayChequeModal = ({ isOpen, onClose, storeId }) => {
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isChequeModalOpen, setIsChequeModalOpen] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState(null);

  const fetchCheques = async () => {
    setLoading(true);
    try {
      const data = await getChequesByStoreAPI(storeId);
      setCheques(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!storeId || !isOpen) return;
    fetchCheques();
  }, [storeId, isOpen]);

  const handleEditClick = (cheque) => {
    setSelectedCheque(cheque);
    setIsChequeModalOpen(true);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, "0"); // months are 0-indexed
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl flex flex-col h-[80vh] overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-2xl font-bold">Existing Cheques</h2>
            <button
              onClick={onClose}
              className="px-3 py-1 border rounded-md hover:bg-gray-100"
            >
              Close
            </button>
          </div>

          {loading ? (
            <p className="text-center py-10">Loading...</p>
          ) : cheques.length === 0 ? (
            <p className="text-center py-10 text-gray-500">No cheques found.</p>
          ) : (
            <ul className="flex-1 overflow-y-auto p-4 space-y-4">
              {cheques.map((c) => (
                <li
                  key={c._id}
                  className="flex flex-col md:flex-row md:justify-between border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-lg">Cheque Number: {c.chequeNumber}</p>
                    <p className="font-medium text-lg">Amount: ${c.amount}</p>
                    {c.notes && <p className="text-sm text-gray-600">Notes: {c.notes}</p>}
                    <p className="text-xs text-gray-400">
                      Date: {formatDate(c.date)}
                    </p>

                    {c.images && c.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Cheque ${c.chequeNumber}`}
                            className="w-24 h-24 object-cover rounded-md border"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 md:mt-0 md:flex md:items-center">
                    <button
                      onClick={() => handleEditClick(c)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isChequeModalOpen && (
        <ChequeModal
          isOpen={isChequeModalOpen}
          onClose={() => setIsChequeModalOpen(false)}
          storeId={storeId}
          cheque={selectedCheque}
          fetchCheques={fetchCheques}
        />
      )}
    </>
  );
};

export default DisplayChequeModal;
