"use client"

import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { RootState } from "@/redux/store"
import Sidebar from "@/components/layout/Sidebar"
import Navbar from "@/components/layout/Navbar"
import PageHeader from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import {
  Users, Plus, Search, Filter, Eye, Edit, Trash2, Shield, Clock,
  Mail, Phone, Calendar, Building2, UserCheck, UserX, Activity,
  MoreVertical, Download, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  History, Settings, Key, Loader2
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { getAllMembersAPI, updateMemberAPI, createMemberAPI } from "@/services2/operations/auth"
import AddMemberForm from "@/components/admin/AddMemberForm"
import MemberActivityLog from "@/components/admin/MemberActivityLog"


interface Member {
  id: string
  _id: string
  name: string
  email: string
  phone: string
  department?: string
  designation?: string
  employeeId?: string
  joiningDate?: string
  status: "active" | "inactive" | "suspended"
  isOrder: boolean
  isProduct: boolean
  lastLogin?: string
  createdAt: string
  createdBy?: { name: string; email: string }
  activityLogs?: ActivityLog[]
}

interface ActivityLog {
  action: string
  description: string
  performedBy?: string
  performedByName?: string
  createdAt: string
  metadata?: any
}

const MemberManagement = () => {
  const { toast } = useToast()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Modals
  const [showAddMember, setShowAddMember] = useState(false)
  const [showEditMember, setShowEditMember] = useState(false)
  const [showViewMember, setShowViewMember] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  
  const currentUser = useSelector((state: RootState) => state.auth?.user ?? null)
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    filterMembers()
  }, [members, searchTerm, statusFilter, activeTab])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const data = await getAllMembersAPI()
      const membersList = data?.filter((m: any) => m.role === "member") || []
      const formatted = membersList.map((m: any) => ({
        ...m,
        id: m._id,
      }))
      setMembers(formatted)
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch members" })
    } finally {
      setLoading(false)
    }
  }


  const filterMembers = () => {
    let filtered = [...members]
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone?.includes(searchTerm) ||
        m.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(m => m.status === statusFilter)
    }
    
    // Tab filter
    if (activeTab === "active") {
      filtered = filtered.filter(m => m.status === "active")
    } else if (activeTab === "inactive") {
      filtered = filtered.filter(m => m.status !== "active")
    }
    
    setFilteredMembers(filtered)
  }

  const handlePermissionUpdate = async (memberId: string, field: "isOrder" | "isProduct", value: boolean) => {
    try {
      await updateMemberAPI(memberId, { 
        [field]: value,
        activityLog: {
          action: "permission_updated",
          description: `${field} permission ${value ? "enabled" : "disabled"}`,
          performedBy: currentUser?._id,
          performedByName: currentUser?.name || currentUser?.email,
        }
      })
      toast({ title: "Success", description: "Permission updated successfully" })
      fetchMembers()
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update permission" })
    }
  }

  const handleStatusUpdate = async (memberId: string, status: string) => {
    try {
      await updateMemberAPI(memberId, { 
        status,
        activityLog: {
          action: "status_updated",
          description: `Status changed to ${status}`,
          performedBy: currentUser?._id,
          performedByName: currentUser?.name || currentUser?.email,
        }
      })
      toast({ title: "Success", description: "Status updated successfully" })
      fetchMembers()
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status" })
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      inactive: "bg-gray-100 text-gray-700",
      suspended: "bg-red-100 text-red-700",
    }
    return <Badge className={styles[status] || "bg-gray-100"}>{status}</Badge>
  }

  const stats = {
    total: members.length,
    active: members.filter(m => m.status === "active").length,
    inactive: members.filter(m => m.status !== "active").length,
    withOrderAccess: members.filter(m => m.isOrder).length,
    withProductAccess: members.filter(m => m.isProduct).length,
  }


  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <PageHeader
              title="Member Management"
              description="Manage team members, permissions, and track activities"
              icon={<Users className="h-6 w-6 text-primary" />}
            >
              <Button onClick={() => setShowAddMember(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </PageHeader>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="text-xl font-bold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Active</p>
                      <p className="text-xl font-bold text-green-600">{stats.active}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <UserX className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Inactive</p>
                      <p className="text-xl font-bold text-gray-600">{stats.inactive}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Order Access</p>
                      <p className="text-xl font-bold text-purple-600">{stats.withOrderAccess}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <Settings className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Product Access</p>
                      <p className="text-xl font-bold text-orange-600">{stats.withProductAccess}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>


            {/* Filters & Search */}
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by name, email, phone, ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchMembers}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList>
                <TabsTrigger value="all">All Members ({members.length})</TabsTrigger>
                <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
                <TabsTrigger value="inactive">Inactive ({stats.inactive})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No members found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left p-4 font-medium">Member</th>
                              <th className="text-left p-4 font-medium">Contact</th>
                              <th className="text-left p-4 font-medium">Department</th>
                              <th className="text-center p-4 font-medium">Status</th>
                              <th className="text-center p-4 font-medium">Order Access</th>
                              <th className="text-center p-4 font-medium">Product Access</th>
                              <th className="text-left p-4 font-medium">Last Login</th>
                              <th className="text-center p-4 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {filteredMembers.map((member) => (
                              <tr key={member.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-blue-600 font-semibold">
                                        {member.name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-medium">{member.name || "N/A"}</p>
                                      <p className="text-xs text-gray-500">{member.employeeId || "No ID"}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="text-sm">
                                    <p className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" /> {member.email}
                                    </p>
                                    <p className="flex items-center gap-1 text-gray-500">
                                      <Phone className="h-3 w-3" /> {member.phone || "N/A"}
                                    </p>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="text-sm">
                                    <p>{member.department || "N/A"}</p>
                                    <p className="text-gray-500">{member.designation || ""}</p>
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  {getStatusBadge(member.status || "active")}
                                </td>
                                <td className="p-4 text-center">
                                  <Button
                                    size="sm"
                                    variant={member.isOrder ? "default" : "outline"}
                                    className={member.isOrder ? "bg-green-500 hover:bg-green-600" : ""}
                                    onClick={() => handlePermissionUpdate(member.id, "isOrder", !member.isOrder)}
                                  >
                                    {member.isOrder ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                  </Button>
                                </td>
                                <td className="p-4 text-center">
                                  <Button
                                    size="sm"
                                    variant={member.isProduct ? "default" : "outline"}
                                    className={member.isProduct ? "bg-green-500 hover:bg-green-600" : ""}
                                    onClick={() => handlePermissionUpdate(member.id, "isProduct", !member.isProduct)}
                                  >
                                    {member.isProduct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                  </Button>
                                </td>
                                <td className="p-4">
                                  <div className="text-sm text-gray-500">
                                    {member.lastLogin ? format(new Date(member.lastLogin), "MMM dd, yyyy HH:mm") : "Never"}
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => { setSelectedMember(member); setShowViewMember(true) }}>
                                        <Eye className="h-4 w-4 mr-2" /> View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { setSelectedMember(member); setShowEditMember(true) }}>
                                        <Edit className="h-4 w-4 mr-2" /> Edit Member
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { setSelectedMember(member); setShowActivityLog(true) }}>
                                        <History className="h-4 w-4 mr-2" /> Activity Log
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleStatusUpdate(member.id, member.status === "active" ? "inactive" : "active")}
                                      >
                                        {member.status === "active" ? (
                                          <><UserX className="h-4 w-4 mr-2" /> Deactivate</>
                                        ) : (
                                          <><UserCheck className="h-4 w-4 mr-2" /> Activate</>
                                        )}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>


      {/* Add Member Modal */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>
          <AddMemberForm 
            onSuccess={() => { setShowAddMember(false); fetchMembers() }}
            onCancel={() => setShowAddMember(false)}
            currentUser={currentUser}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={showEditMember} onOpenChange={setShowEditMember}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <AddMemberForm 
              member={selectedMember}
              isEdit={true}
              onSuccess={() => { setShowEditMember(false); fetchMembers() }}
              onCancel={() => setShowEditMember(false)}
              currentUser={currentUser}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Member Modal */}
      <Dialog open={showViewMember} onOpenChange={setShowViewMember}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {selectedMember.name?.charAt(0)?.toUpperCase() || "M"}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedMember.name || "N/A"}</h3>
                  <p className="text-gray-500">{selectedMember.designation || "Team Member"}</p>
                  {getStatusBadge(selectedMember.status || "active")}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedMember.email}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedMember.phone || "N/A"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Employee ID</p>
                  <p className="font-medium">{selectedMember.employeeId || "N/A"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{selectedMember.department || "N/A"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Joining Date</p>
                  <p className="font-medium">
                    {selectedMember.joiningDate ? format(new Date(selectedMember.joiningDate), "MMM dd, yyyy") : "N/A"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="font-medium">
                    {selectedMember.lastLogin ? format(new Date(selectedMember.lastLogin), "MMM dd, yyyy HH:mm") : "Never"}
                  </p>
                </div>
              </div>

              {/* Permissions */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Permissions</h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${selectedMember.isOrder ? "bg-green-500" : "bg-red-500"}`} />
                    <span>Order Access: {selectedMember.isOrder ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${selectedMember.isProduct ? "bg-green-500" : "bg-red-500"}`} />
                    <span>Product Access: {selectedMember.isProduct ? "Enabled" : "Disabled"}</span>
                  </div>
                </div>
              </div>

              {/* Created Info */}
              <div className="text-sm text-gray-500">
                <p>Created: {selectedMember.createdAt ? format(new Date(selectedMember.createdAt), "MMM dd, yyyy HH:mm") : "N/A"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Activity Log Modal */}
      <Dialog open={showActivityLog} onOpenChange={setShowActivityLog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Log - {selectedMember?.name || selectedMember?.email}</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <MemberActivityLog member={selectedMember} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MemberManagement