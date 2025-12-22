"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Plus, Trash2, Check, ChevronDown, Star } from "lucide-react";
import { toast } from "react-toastify";

interface FilterState {
  search: string;
  category: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  stockLevel: string;
  startDate: string;
  endDate: string;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  isDefault?: boolean;
  createdAt: string;
}

interface FilterPresetsProps {
  currentFilters: FilterState;
  onApplyPreset: (filters: FilterState) => void;
}

const STORAGE_KEY = "inventory_filter_presets";

// Default presets
const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: "low-stock",
    name: "Low Stock Items",
    filters: {
      search: "",
      category: "all",
      sortBy: "quantity",
      sortOrder: "asc",
      stockLevel: "low",
      startDate: "",
      endDate: "",
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "this-week",
    name: "This Week's Activity",
    filters: {
      search: "",
      category: "all",
      sortBy: "lastUpdated",
      sortOrder: "desc",
      stockLevel: "all",
      startDate: getWeekStart(),
      endDate: getWeekEnd(),
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "high-value",
    name: "High Value Products",
    filters: {
      search: "",
      category: "all",
      sortBy: "price",
      sortOrder: "desc",
      stockLevel: "all",
      startDate: "",
      endDate: "",
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

function getWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  return monday.toISOString().split("T")[0];
}

function getWeekEnd(): string {
  const monday = new Date(getWeekStart());
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday.toISOString().split("T")[0];
}

const FilterPresets: React.FC<FilterPresetsProps> = ({
  currentFilters,
  onApplyPreset,
}) => {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Load presets from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPresets([...DEFAULT_PRESETS, ...parsed]);
      } catch {
        setPresets(DEFAULT_PRESETS);
      }
    } else {
      setPresets(DEFAULT_PRESETS);
    }
  }, []);

  // Save custom presets to localStorage
  const saveToStorage = (customPresets: FilterPreset[]) => {
    const toSave = customPresets.filter((p) => !p.isDefault);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      toast.warning("Please enter a preset name");
      return;
    }

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      filters: { ...currentFilters },
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    saveToStorage(updatedPresets);

    setNewPresetName("");
    setIsSaveDialogOpen(false);
    toast.success(`Preset "${newPreset.name}" saved!`);
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    onApplyPreset(preset.filters);
    setActivePresetId(preset.id);
    toast.info(`Applied: ${preset.name}`);
  };

  const handleDeletePreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset?.isDefault) {
      toast.warning("Cannot delete default presets");
      return;
    }

    const updatedPresets = presets.filter((p) => p.id !== presetId);
    setPresets(updatedPresets);
    saveToStorage(updatedPresets);

    if (activePresetId === presetId) {
      setActivePresetId(null);
    }
    toast.success("Preset deleted");
  };

  const customPresets = presets.filter((p) => !p.isDefault);
  const defaultPresets = presets.filter((p) => p.isDefault);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            Filter Presets
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* Default Presets */}
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
            Quick Filters
          </div>
          {defaultPresets.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Star className="h-3 w-3 text-yellow-500" />
                {preset.name}
              </span>
              {activePresetId === preset.id && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </DropdownMenuItem>
          ))}

          {customPresets.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                My Presets
              </div>
              {customPresets.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  className="flex items-center justify-between group"
                >
                  <span
                    className="flex-1 cursor-pointer"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    {preset.name}
                  </span>
                  <div className="flex items-center gap-1">
                    {activePresetId === preset.id && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(preset.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsSaveDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Save Current Filters
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Preset Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Preset Name</label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g., My Weekly View"
                onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
              />
            </div>

            {/* Preview current filters */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-500 mb-2">
                Current Filters:
              </div>
              <div className="flex flex-wrap gap-1">
                {currentFilters.search && (
                  <Badge variant="secondary" className="text-xs">
                    Search: {currentFilters.search}
                  </Badge>
                )}
                {currentFilters.category !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Category: {currentFilters.category}
                  </Badge>
                )}
                {currentFilters.stockLevel !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Stock: {currentFilters.stockLevel}
                  </Badge>
                )}
                {currentFilters.startDate && (
                  <Badge variant="secondary" className="text-xs">
                    From: {currentFilters.startDate}
                  </Badge>
                )}
                {currentFilters.endDate && (
                  <Badge variant="secondary" className="text-xs">
                    To: {currentFilters.endDate}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  Sort: {currentFilters.sortBy} ({currentFilters.sortOrder})
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset}>Save Preset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FilterPresets;
