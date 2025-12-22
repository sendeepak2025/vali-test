"use client"

import { useState, useMemo } from "react"
import { Search, X, Filter, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface EnhancedStoreSearchProps {
  onSearch: (query: string, field: string) => void
  onReset: () => void
  onFilterChange: (filters: StoreFilters) => void
  stores: any[]
  activeFilters: StoreFilters
}

export interface StoreFilters {
  state: string
  city: string
  hasOrders: string
}

const EnhancedStoreSearch = ({ 
  onSearch, 
  onReset, 
  onFilterChange, 
  stores,
  activeFilters 
}: EnhancedStoreSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchField, setSearchField] = useState("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Extract unique states and cities from stores
  const { states, cities } = useMemo(() => {
    const stateSet = new Set<string>()
    const citySet = new Set<string>()
    
    stores.forEach(store => {
      if (store.state) stateSet.add(store.state)
      if (store.city) citySet.add(store.city)
    })
    
    return {
      states: Array.from(stateSet).sort(),
      cities: Array.from(citySet).sort()
    }
  }, [stores])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchQuery, searchField)
  }

  const handleReset = () => {
    setSearchQuery("")
    setSearchField("all")
    onFilterChange({ state: "", city: "", hasOrders: "" })
    onReset()
  }

  const handleFilterChange = (key: keyof StoreFilters, value: string) => {
    const newFilters = { ...activeFilters, [key]: value }
    onFilterChange(newFilters)
  }

  const activeFilterCount = Object.values(activeFilters).filter(v => v && v !== "").length

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search stores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <Select value={searchField} onValueChange={setSearchField}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Search by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fields</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="storeName">Store Name</SelectItem>
            <SelectItem value="ownerName">Owner Name</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="city">City</SelectItem>
            <SelectItem value="state">State</SelectItem>
            <SelectItem value="address">Address</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Filters */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="relative">
              <Filter size={16} className="mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown size={14} className="ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filter Stores</h4>
              
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">State</label>
                <Select 
                  value={activeFilters.state} 
                  onValueChange={(v) => handleFilterChange("state", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All States</SelectItem>
                    {states.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">City</label>
                <Select 
                  value={activeFilters.city} 
                  onValueChange={(v) => handleFilterChange("city", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Cities</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Order Status</label>
                <Select 
                  value={activeFilters.hasOrders} 
                  onValueChange={(v) => handleFilterChange("hasOrders", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Stores</SelectItem>
                    <SelectItem value="yes">Has Orders</SelectItem>
                    <SelectItem value="no">No Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="w-full"
                onClick={() => onFilterChange({ state: "", city: "", hasOrders: "" })}
              >
                Clear Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <div className="flex gap-2">
          <Button type="submit" className="w-full md:w-auto">
            Search
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleReset}
            className="w-full md:w-auto"
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EnhancedStoreSearch
