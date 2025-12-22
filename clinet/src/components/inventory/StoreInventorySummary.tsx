"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Store,
  Package,
  Search,
  MapPin,
  TrendingUp,
  ShoppingCart,
  Filter,
  Download,
} from "lucide-react";
import { getAllStoresAPI } from "@/services2/operations/auth";
import { toast } from "react-toastify";

interface StoreData {
  _id: string;
  storeName: string;
  ownerName: string;
  email: string;
  state: string;
  city: string;
  address: string;
}

interface StoreInventorySummaryProps {
  isOpen: boolean;
  onClose: () => void;
}

// US States for filtering
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
];

const StoreInventorySummary: React.FC<StoreInventorySummaryProps> = ({
  isOpen,
  onClose,
}) => {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "state">("list");

  useEffect(() => {
    if (isOpen) {
      fetchStores();
    }
  }, [isOpen]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const response = await getAllStoresAPI();
      if (response && Array.isArray(response)) {
        setStores(response);
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error("Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  // Filter stores
  const filteredStores = stores.filter((store) => {
    const matchesSearch =
      store.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState =
      selectedState === "all" ||
      store.state?.toLowerCase() === selectedState.toLowerCase();
    return matchesSearch && matchesState;
  });

  // Group stores by state
  const storesByState = filteredStores.reduce((acc, store) => {
    const state = store.state || "Unknown";
    if (!acc[state]) {
      acc[state] = [];
    }
    acc[state].push(store);
    return acc;
  }, {} as Record<string, StoreData[]>);

  // Get unique states from stores
  const availableStates = [...new Set(stores.map((s) => s.state).filter(Boolean))].sort();

  // Export to CSV
  const handleExport = () => {
    const headers = ["Store Name", "Owner", "Email", "City", "State", "Address"];
    const csvData = filteredStores.map((store) => [
      store.storeName || "",
      store.ownerName || "",
      store.email || "",
      store.city || "",
      store.state || "",
      store.address || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stores_by_state_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Store list exported!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600" />
            Store Inventory Summary
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 pb-4 border-b">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search stores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-[180px]">
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {availableStates.map((state) => (
                <SelectItem key={state} value={state.toLowerCase()}>
                  {state} ({storesByState[state]?.length || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              List
            </Button>
            <Button
              variant={viewMode === "state" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("state")}
            >
              By State
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{filteredStores.length}</div>
                <div className="text-xs text-gray-500">Total Stores</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {Object.keys(storesByState).length}
                </div>
                <div className="text-xs text-gray-500">States Covered</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {Math.round(filteredStores.length / Math.max(Object.keys(storesByState).length, 1))}
                </div>
                <div className="text-xs text-gray-500">Avg per State</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : viewMode === "list" ? (
            /* List View */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No stores found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStores.map((store) => (
                    <TableRow key={store._id}>
                      <TableCell>
                        <div className="font-medium">{store.storeName}</div>
                        <div className="text-xs text-gray-500">{store.email}</div>
                      </TableCell>
                      <TableCell>{store.ownerName}</TableCell>
                      <TableCell>
                        <div className="text-sm">{store.city}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          {store.address}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{store.state || "N/A"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            /* State View */
            <div className="space-y-4">
              {Object.entries(storesByState)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([state, stateStores]) => (
                  <Card key={state}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          {state}
                        </span>
                        <Badge>{stateStores.length} stores</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {stateStores.map((store) => (
                          <div
                            key={store._id}
                            className="p-2 bg-gray-50 rounded-lg text-sm"
                          >
                            <div className="font-medium truncate">
                              {store.storeName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {store.city} • {store.ownerName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoreInventorySummary;
