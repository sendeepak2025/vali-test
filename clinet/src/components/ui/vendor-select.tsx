"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getAllVendorsAPI } from "@/services2/operations/vendor"

interface Vendor {
  _id: string
  name: string
  type?: string
  email?: string
}

interface VendorSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  includeAll?: boolean
  allLabel?: string
  disabled?: boolean
  className?: string
}

export function VendorSelect({
  value,
  onValueChange,
  placeholder = "Select vendor...",
  includeAll = false,
  allLabel = "All Vendors",
  disabled = false,
  className,
}: VendorSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [vendors, setVendors] = React.useState<Vendor[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [hasMore, setHasMore] = React.useState(true)
  const [page, setPage] = React.useState(1)

  // Fetch vendors with search
  const fetchVendors = React.useCallback(async (searchTerm: string, pageNum: number, append: boolean = false) => {
    setLoading(true)
    try {
      const response = await getAllVendorsAPI({
        search: searchTerm,
        page: pageNum,
        limit: 20,
      })
      
      const newVendors = response?.data || []
      const pagination = response?.pagination
      
      if (append) {
        setVendors(prev => [...prev, ...newVendors])
      } else {
        setVendors(newVendors)
      }
      
      setHasMore(pagination?.hasNextPage || false)
    } catch (error) {
      console.error("Error fetching vendors:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch when popover opens
  React.useEffect(() => {
    if (open) {
      setPage(1)
      fetchVendors("", 1, false)
    }
  }, [open, fetchVendors])

  // Debounced search
  React.useEffect(() => {
    if (!open) return
    
    const timer = setTimeout(() => {
      setPage(1)
      fetchVendors(search, 1, false)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [search, open, fetchVendors])

  // Load more on scroll
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchVendors(search, nextPage, true)
    }
  }

  // Get selected vendor name
  const selectedVendor = vendors.find(v => v._id === value)
  const displayValue = value === "all" ? allLabel : selectedVendor?.name || placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between", className)}
        >
          <span className="truncate">{value ? displayValue : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search vendors..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Loading...</span>
                </div>
              ) : (
                "No vendor found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {includeAll && (
                <CommandItem
                  value="all"
                  onSelect={() => {
                    onValueChange("all")
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "all" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {allLabel}
                </CommandItem>
              )}
              {vendors.map((vendor) => (
                <CommandItem
                  key={vendor._id}
                  value={vendor._id}
                  onSelect={() => {
                    onValueChange(vendor._id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === vendor._id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{vendor.name}</span>
                    {vendor.type && (
                      <span className="text-xs text-muted-foreground capitalize">{vendor.type}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
              {hasMore && (
                <CommandItem
                  onSelect={handleLoadMore}
                  className="justify-center text-muted-foreground"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Load more..."
                  )}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
