"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import StoreRegistration from "./StoreRegistration";
import { getAllMembersAPI } from "@/services2/operations/auth";
import EnhancedStoreTable from "@/components/admin/EnhancedStoreTable";
import EnhancedStoreSearch, { StoreFilters } from "@/components/admin/EnhancedStoreSearch";
import StoreStatsCards from "@/components/admin/StoreStatsCards";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

const AdminStorets = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allStores, setAllStores] = useState<any[]>([]);
  const [filteredStores, setFilteredStores] = useState<any[]>([]);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [activeFilters, setActiveFilters] = useState<StoreFilters>({
    state: "",
    city: "",
    hasOrders: "",
  });
  const user = useSelector((state: RootState) => state.auth?.user ?? null);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const data = await getAllMembersAPI();
      const filteredData = data.filter((store: any) => store.role === "store");
      const formattedData = filteredData.map(({ _id, ...rest }: any) => ({
        id: _id,
        ...rest,
      }));

      setAllStores(formattedData);
      setFilteredStores(formattedData);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const stateSet = new Set<string>();
    let verifiedCount = 0;
    let pendingCount = 0;

    allStores.forEach((store) => {
      if (store.state) stateSet.add(store.state);
      // Consider stores with permissions as "verified"
      if (store.isOrder || store.isProduct) {
        verifiedCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      totalStores: allStores.length,
      verifiedStores: verifiedCount,
      pendingStores: pendingCount,
      stateCount: stateSet.size,
    };
  }, [allStores]);

  // Apply filters and search
  const applyFiltersAndSearch = useCallback(() => {
    let result = [...allStores];

    // Apply search
    if (searchQuery.trim()) {
      const lowercaseQuery = searchQuery.toLowerCase();
      result = result.filter((store) => {
        if (searchField === "all") {
          return (
            (store.email && store.email.toLowerCase().includes(lowercaseQuery)) ||
            (store.storeName && store.storeName.toLowerCase().includes(lowercaseQuery)) ||
            (store.ownerName && store.ownerName.toLowerCase().includes(lowercaseQuery)) ||
            (store.phone && store.phone.toLowerCase().includes(lowercaseQuery)) ||
            (store.city && store.city.toLowerCase().includes(lowercaseQuery)) ||
            (store.state && store.state.toLowerCase().includes(lowercaseQuery)) ||
            (store.address && store.address.toLowerCase().includes(lowercaseQuery))
          );
        } else {
          return store[searchField] && store[searchField].toLowerCase().includes(lowercaseQuery);
        }
      });
    }

    // Apply state filter
    if (activeFilters.state) {
      result = result.filter((store) => store.state === activeFilters.state);
    }

    // Apply city filter
    if (activeFilters.city) {
      result = result.filter((store) => store.city === activeFilters.city);
    }

    // Apply hasOrders filter
    if (activeFilters.hasOrders === "yes") {
      result = result.filter((store) => store.isOrder);
    } else if (activeFilters.hasOrders === "no") {
      result = result.filter((store) => !store.isOrder);
    }

    setFilteredStores(result);
    setSearchActive(searchQuery.trim() !== "" || Object.values(activeFilters).some(v => v !== ""));
  }, [allStores, searchQuery, searchField, activeFilters]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSearch = (query: string, field: string) => {
    setSearchQuery(query);
    setSearchField(field);
  };

  const resetSearch = () => {
    setSearchQuery("");
    setSearchField("all");
    setActiveFilters({ state: "", city: "", hasOrders: "" });
    setFilteredStores(allStores);
    setSearchActive(false);
  };

  const handleFilterChange = (filters: StoreFilters) => {
    setActiveFilters(filters);
  };

  const exportToCSV = () => {
    const headers = ["Store Name", "Owner Name", "Email", "Phone", "Address", "City", "State", "Zip Code"];
    const rows = filteredStores.map((store) => [
      store.storeName || "",
      store.ownerName || "",
      store.email || "",
      store.phone || "",
      store.address || "",
      store.city || "",
      store.state || "",
      store.zipCode || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stores_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />

          <main className="flex-1 overflow-y-auto bg-muted/30">
            <div className="page-container max-w-full px-4 py-4">
              <PageHeader
                title="Store Management"
                description="Manage stores, verify stores, and give permissions"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={exportToCSV}>
                    <Download size={16} className="mr-2" />
                    Export CSV
                  </Button>
                  <Button onClick={() => setIsGroupOpen(true)}>
                    <Plus size={16} className="mr-2" />
                    Add Store
                  </Button>
                </div>
              </PageHeader>

              {/* Stats Cards */}
              <StoreStatsCards stats={stats} />

              {/* Enhanced Search & Filters */}
              <EnhancedStoreSearch 
                onSearch={handleSearch} 
                onReset={resetSearch}
                onFilterChange={handleFilterChange}
                stores={allStores}
                activeFilters={activeFilters}
              />

              {searchActive && (
                <div className="mb-4 px-1">
                  <p className="text-sm text-gray-600">
                    Found {filteredStores.length}{" "}
                    {filteredStores.length === 1 ? "store" : "stores"}
                  </p>
                </div>
              )}

              {/* Enhanced Table */}
              <EnhancedStoreTable
                loading={loading}
                groups={filteredStores}
                fetchStores={fetchStores}
              />
            </div>
          </main>
        </div>
      </div>
      <Dialog open={isGroupOpen} onOpenChange={setIsGroupOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Add New Store
            </DialogTitle>
          </DialogHeader>
          <StoreRegistration
            setIsGroupOpen={(value: boolean) => setIsGroupOpen(value)}
            isEdit={false}
            groups={null}
            fetchStores={fetchStores}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStorets;
