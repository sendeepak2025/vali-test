"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import React, { useState, useEffect } from "react";
import { getAllMembersAPI } from "@/services2/operations/auth";
import { assignProductToStoreAPI } from "@/services2/operations/order"; 
import { ChevronDown } from "lucide-react";

const AssingeProductToStore = ({ isOpen, onClose, productId, token }) => {
  const [allStores, setAllStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const data = await getAllMembersAPI();
        const stores = data.filter((s) => s.role === "store");
        const formatted = stores.map(({ _id, storeName }) => ({
          id: _id,
          name: storeName,
        }));

        setAllStores(formatted);
        setFilteredStores(formatted);
      } catch (error) {
        console.error("Error fetching stores:", error);
      }
    };

    if (isOpen) fetchStores();
  }, [isOpen]);

  // ✅ Filter list
  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q.trim()) return setFilteredStores(allStores);

    const lower = q.toLowerCase();
    setFilteredStores(
      allStores.filter((s) => s.name.toLowerCase().includes(lower))
    );
  };

  // ✅ Assign Product to Store
  const handleAssign = async () => {
    if (!selectedStore) return;

    try {
      setLoading(true);
      const formData = {
        productId,
        storeId: selectedStore.id,
      };

      const res = await assignProductToStoreAPI(formData, token);
      if (res) {
        onClose(); // ✅ close modal after success
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] overflow-visible py-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Assign Product To Store
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-600 mb-4">
          Product ID:{" "}
          <span className="font-semibold text-gray-900">{productId}</span>
        </p>

        {/* ✅ Dropdown */}
        <div className="relative mb-6 overflow-visible">
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded bg-gray-50 cursor-pointer"
          >
            <span className="text-sm text-gray-700">
              {selectedStore?.name || "Select Store"}
            </span>
            <ChevronDown size={17} />
          </div>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded mt-1 shadow-md z-[9999] max-h-56 overflow-y-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border-b outline-none"
                placeholder="Search store..."
              />

              {filteredStores.length > 0 ? (
                filteredStores.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedStore(s);
                      setDropdownOpen(false);
                    }}
                    className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                  >
                    {s.name}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No stores found
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✅ Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>

          <button
            onClick={handleAssign}
            disabled={!selectedStore || loading}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssingeProductToStore;
