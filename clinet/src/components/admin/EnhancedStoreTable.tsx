"use client"

import { memo, useState, useMemo } from "react"
import { 
  Pencil, 
  Trash2, 
  ExternalLink, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Mail,
  Phone
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userWithOrderDetails, deleteStoreAPI } from "@/services2/operations/auth"
import UserDetailsModal from "./user-details-modal"
import StoreEditModal from "./EditStoreModal"
import { useSelector } from "react-redux"
import { RootState } from "@/redux/store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SortField = "storeName" | "ownerName" | "city" | "state" | "createdAt"
type SortDirection = "asc" | "desc"

interface EnhancedStoreTableProps {
  loading: boolean
  groups: any[]
  fetchStores: () => void
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

const EnhancedStoreTable = memo(({ loading, groups, fetchStores }: EnhancedStoreTableProps) => {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [selectedUserData, setSelectedUserData] = useState(null)
  const [userDetailsOpen, setUserDetailsOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>("storeName")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  // Sort and paginate data
  const { sortedData, totalPages, paginatedData } = useMemo(() => {
    const sorted = [...groups].sort((a, b) => {
      let aVal = a[sortField] || ""
      let bVal = b[sortField] || ""
      
      if (sortField === "createdAt") {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else {
        aVal = aVal.toString().toLowerCase()
        bVal = bVal.toString().toLowerCase()
      }
      
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

    const total = Math.ceil(sorted.length / itemsPerPage)
    const start = (currentPage - 1) * itemsPerPage
    const paginated = sorted.slice(start, start + itemsPerPage)

    return { sortedData: sorted, totalPages: total, paginatedData: paginated }
  }, [groups, sortField, sortDirection, currentPage, itemsPerPage])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="ml-1 opacity-50" />
    return sortDirection === "asc" 
      ? <ArrowUp size={14} className="ml-1" /> 
      : <ArrowDown size={14} className="ml-1" />
  }

  const handleEdit = async (group: any) => {
    setSelectedStoreId(group?.id || group?._id)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this store?")) return
    const res = await deleteStoreAPI(id, token)
    if (res) {
      fetchStores()
    }
  }

  const fetchUserDetailsOrder = async (id: string) => {
    try {
      const res = await userWithOrderDetails(id)
      setSelectedUserData(res)
      setUserDetailsOpen(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch user details",
        variant: "destructive",
      })
    }
  }

  const formatDate = (date: string) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Store List</h2>
        <div className="text-sm text-muted-foreground">
          {groups.length} total stores
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="px-4 py-3 font-medium">
                    <button 
                      onClick={() => handleSort("storeName")}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Store Name
                      <SortIcon field="storeName" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button 
                      onClick={() => handleSort("ownerName")}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Owner
                      <SortIcon field="ownerName" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">
                    <button 
                      onClick={() => handleSort("city")}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      City
                      <SortIcon field="city" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button 
                      onClick={() => handleSort("state")}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      State
                      <SortIcon field="state" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Permissions</th>
                  <th className="px-4 py-3 font-medium">
                    <button 
                      onClick={() => handleSort("createdAt")}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Joined
                      <SortIcon field="createdAt" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.length > 0 ? (
                  paginatedData.map((group) => (
                    <tr key={group?.id || group?._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => fetchUserDetailsOrder(group?.id || group?._id)}
                          className="font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {group?.storeName || "N/A"}
                          <ExternalLink size={12} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {group?.ownerName || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail size={12} />
                            {group?.email || "N/A"}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone size={12} />
                            {group?.phone || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{group?.city || "N/A"}</td>
                      <td className="px-4 py-3">
                        {group?.state ? (
                          <Badge variant="outline" className="font-normal">
                            {group.state}
                          </Badge>
                        ) : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {group?.isOrder && (
                            <Badge variant="secondary" className="text-xs">Orders</Badge>
                          )}
                          {group?.isProduct && (
                            <Badge variant="secondary" className="text-xs">Products</Badge>
                          )}
                          {!group?.isOrder && !group?.isProduct && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(group?.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => fetchUserDetailsOrder(group?.id || group?._id)}>
                                <ExternalLink size={14} className="mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(group)}>
                                <Pencil size={14} className="mr-2" />
                                Edit Store
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(group.id || group._id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 size={14} className="mr-2" />
                                Delete Store
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No stores found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {groups.length > 0 && (
            <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(v) => {
                    setItemsPerPage(Number(v))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>per page</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Store Edit Modal */}
      <StoreEditModal
        storeId={selectedStoreId}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchStores}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={userDetailsOpen}
        onClose={() => setUserDetailsOpen(false)}
        userData={selectedUserData}
        fetchUserDetailsOrder={fetchUserDetailsOrder}
      />
    </div>
  )
})

EnhancedStoreTable.displayName = "EnhancedStoreTable"

export default EnhancedStoreTable
