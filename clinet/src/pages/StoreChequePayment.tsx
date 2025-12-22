import React, { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { getAllMembersAPI, userWithOrderDetails } from "@/services2/operations/auth";
import ChequeModal from "./ChequeModal";
import DisplayChequeModal from "./DisplayChequeModal"; // New modal
import StoreSearch from "@/components/admin/StoreSerach";

const StoreChequePayment = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allStores, setAllStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [searchActive, setSearchActive] = useState(false);

  // Cheque modal states
  const [isChequeModalOpen, setIsChequeModalOpen] = useState(false);
  const [isDisplayChequeModalOpen, setIsDisplayChequeModalOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Fetch stores with order details
  const fetchStores = async () => {
    setLoading(true);
    try {
      const data = await getAllMembersAPI();
      const stores = await Promise.all(
        data
          .filter((member) => member.role === "store")
          .map(async ({ _id, cheques = [], ...rest }) => {
            let userDetails = null;
            try {
              userDetails = await userWithOrderDetails(_id);
            } catch (err) {
              console.error("User details fetch failed for store:", _id, err);
            }
            return { id: _id, cheques, ...rest, userDetails };
          })
      );
      setAllStores(stores);
      setFilteredStores(stores);
    } catch (err) {
      console.error("Error fetching stores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // Search/filter logic
  const handleSearch = (query, field) => {
    if (!query.trim()) {
      setFilteredStores(allStores);
      setSearchActive(false);
      return;
    }

    setSearchActive(true);
    const lowerQuery = query.toLowerCase();

    const filtered = allStores.filter((store) => {
      if (field === "all") {
        return (
          (store.storeName && store.storeName.toLowerCase().includes(lowerQuery)) ||
          (store.ownerName && store.ownerName.toLowerCase().includes(lowerQuery)) ||
          (store.email && store.email.toLowerCase().includes(lowerQuery)) ||
          (store.phone && store.phone.toLowerCase().includes(lowerQuery)) ||
          (store.city && store.city.toLowerCase().includes(lowerQuery)) ||
          (store.address && store.address.toLowerCase().includes(lowerQuery))
        );
      } else {
        return store[field] && store[field].toLowerCase().includes(lowerQuery);
      }
    });

    setFilteredStores(filtered);
  };

  const resetSearch = () => {
    setFilteredStores(allStores);
    setSearchActive(false);
  };

  // Open Add Cheque Modal
  const openAddChequeModal = (storeId) => {
    setSelectedStoreId(storeId);
    setIsChequeModalOpen(true);
  };

  // Open Display Cheques Modal
  const openDisplayChequeModal = (storeId) => {
    setSelectedStoreId(storeId);
    setIsDisplayChequeModalOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="page-container max-w-full px-4 py-4">
            {/* Search / Filter */}
            <StoreSearch onSearch={handleSearch} onReset={resetSearch} />

            {searchActive && (
              <div className="mb-4 px-1">
                <p className="text-sm text-gray-600">
                  Found {filteredStores.length}{" "}
                  {filteredStores.length === 1 ? "store" : "stores"}
                </p>
              </div>
            )}

            {/* Store Table */}
            <div className="w-full overflow-x-auto rounded-lg shadow-md bg-white p-4">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-primary/10 text-gray-900 uppercase text-xs font-medium tracking-wider">
                      <th className="px-6 py-4">Store Name</th>
                      <th className="px-6 py-4">Owner Name</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStores.length > 0 ? (
                      filteredStores.map((store) => (
                        <tr
                          key={store.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium">
                            {store.storeName ?? "N/A"}
                          </td>
                          <td className="px-6 py-4">{store.ownerName ?? "N/A"}</td>
                          <td className="px-6 py-4 text-center flex justify-center gap-2">
                            <button
                              onClick={() => openAddChequeModal(store.id)}
                              className="px-3 py-1 bg-primary text-white rounded-md"
                            >
                              Add Payment
                            </button>
                            <button
                              onClick={() => openDisplayChequeModal(store.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded-md"
                            >
                              See Cheques
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          No stores found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Cheque Modal */}
      <ChequeModal
        isOpen={isChequeModalOpen}
        onClose={() => setIsChequeModalOpen(false)}
        storeId={selectedStoreId}
        onSuccess={fetchStores} // refresh table after add
      />

      {/* Display Cheques Modal */}
      <DisplayChequeModal
        isOpen={isDisplayChequeModalOpen}
        onClose={() => setIsDisplayChequeModalOpen(false)}
        storeId={selectedStoreId}
      />
    </div>
  );
};

export default StoreChequePayment;
