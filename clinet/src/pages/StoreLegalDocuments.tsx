"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { RootState } from "@/redux/store"
import Navbar from "@/components/layout/Navbar"
import Sidebar from "@/components/layout/Sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import PageHeader from "@/components/shared/PageHeader"
import {
  FileText, Upload, CheckCircle, XCircle, Clock, AlertTriangle,
  Download, Eye, Trash2, Shield, CreditCard, Building2, User,
  Loader2, ArrowLeft, Plus, FileCheck, Scale, DollarSign
} from "lucide-react"
import { apiConnector } from "@/services2/apiConnector"
import { legalDocuments } from "@/services2/apis"
import { imageUpload } from "@/services2/operations/image"
import { format } from "date-fns"

interface LegalDocument {
  _id: string
  documentType: string
  documentName: string
  description?: string
  fileUrl?: string
  fileName?: string
  documentVersion?: string
  acceptedAt?: string
  acceptedByName?: string
  acceptedByEmail?: string
  ipAddress?: string
  status: string
  expiryDate?: string
  verifiedAt?: string
  verifiedByName?: string
  adminNotes?: string
  createdAt: string
}

interface BusinessInfo {
  legalBusinessName?: string
  dba?: string
  businessType?: string
  taxId?: string
  stateTaxId?: string
  businessLicenseNumber?: string
  yearEstablished?: number
  principalName?: string
  principalTitle?: string
  principalPhone?: string
  principalEmail?: string
  bankName?: string
}

interface CreditTerms {
  creditLimit: number
  paymentTermsDays: number
  interestRate: number
  status: string
}

const DOCUMENT_TYPES = [
  { value: "business_license", label: "Business License" },
  { value: "tax_certificate", label: "Tax Certificate / Resale Permit" },
  { value: "w9_form", label: "W-9 Form" },
  { value: "id_document", label: "Owner ID (Driver's License)" },
  { value: "signed_agreement", label: "Signed Credit Agreement" },
  { value: "personal_guarantee", label: "Personal Guarantee" },
  { value: "insurance_certificate", label: "Insurance Certificate" },
  { value: "bank_reference", label: "Bank Reference" },
  { value: "trade_reference", label: "Trade Reference" },
  { value: "credit_application", label: "Credit Application" },
  { value: "other", label: "Other Document" },
]

const StoreLegalDocuments = () => {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const token = useSelector((state: RootState) => state.auth?.token ?? null)
  const user = useSelector((state: RootState) => state.auth?.user ?? null)

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [storeInfo, setStoreInfo] = useState<any>(null)
  const [documents, setDocuments] = useState<LegalDocument[]>([])
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({})
  const [creditTerms, setCreditTerms] = useState<CreditTerms | null>(null)
  const [termsAcceptance, setTermsAcceptance] = useState<any>(null)
  const [checklist, setChecklist] = useState<any>({})

  // Dialog states
  const [addDocDialogOpen, setAddDocDialogOpen] = useState(false)
  const [viewDocDialogOpen, setViewDocDialogOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // New document form
  const [newDoc, setNewDoc] = useState({
    documentType: "",
    documentName: "",
    description: "",
    fileUrl: "",
    fileName: "",
    expiryDate: "",
    adminNotes: "",
  })
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [docsRes, checklistRes] = await Promise.all([
        apiConnector("GET", `${legalDocuments.GET_STORE_DOCUMENTS}/${storeId}`, null, {
          Authorization: `Bearer ${token}`,
        }),
        apiConnector("GET", `${legalDocuments.GET_DOCUMENT_CHECKLIST}/${storeId}/checklist`, null, {
          Authorization: `Bearer ${token}`,
        }),
      ])

      if (docsRes?.data?.success) {
        setStoreInfo(docsRes.data.store)
        setDocuments(docsRes.data.legalDocuments || [])
        setBusinessInfo(docsRes.data.businessInfo || {})
        setCreditTerms(docsRes.data.currentCreditTerms)
        setTermsAcceptance(docsRes.data.termsAcceptance)
      }

      if (checklistRes?.data?.success) {
        setChecklist(checklistRes.data.checklist || {})
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to load data" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token && storeId) {
      fetchData()
    }
  }, [token, storeId])

  const handleAddDocument = async () => {
    if (!newDoc.documentType || !newDoc.documentName) {
      toast({ variant: "destructive", title: "Error", description: "Document type and name are required" })
      return
    }

    // If a file is selected but not yet uploaded, upload it first
    if (selectedFile && !newDoc.fileUrl) {
      toast({ variant: "destructive", title: "Error", description: "Please upload the file first before adding the document" })
      return
    }

    setActionLoading(true)
    try {
      const response = await apiConnector(
        "POST",
        `${legalDocuments.ADD_DOCUMENT}/${storeId}/document`,
        newDoc,
        { Authorization: `Bearer ${token}` }
      )

      if (response?.data?.success) {
        toast({ title: "Success", description: "Document added successfully" })
        setAddDocDialogOpen(false)
        setNewDoc({ documentType: "", documentName: "", description: "", fileUrl: "", fileName: "", expiryDate: "", adminNotes: "" })
        setSelectedFile(null)
        fetchData()
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to add document" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-fill document name if empty
      if (!newDoc.documentName) {
        setNewDoc(prev => ({ ...prev, documentName: file.name }))
      }
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({ variant: "destructive", title: "Error", description: "Please select a file first" })
      return
    }

    setUploadingFile(true)
    try {
      const uploadedUrls = await imageUpload([selectedFile])
      if (uploadedUrls && uploadedUrls.length > 0) {
        setNewDoc(prev => ({ 
          ...prev, 
          fileUrl: uploadedUrls[0],
          fileName: selectedFile.name
        }))
        toast({ title: "Success", description: "File uploaded successfully" })
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to upload file" })
      }
    } catch (error) {
      console.error("File upload error:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to upload file" })
    } finally {
      setUploadingFile(false)
    }
  }

  const handleUpdateStatus = async (docId: string, status: string) => {
    setActionLoading(true)
    try {
      const response = await apiConnector(
        "PUT",
        `${legalDocuments.UPDATE_DOCUMENT_STATUS}/${storeId}/document/${docId}/status`,
        { status },
        { Authorization: `Bearer ${token}` }
      )

      if (response?.data?.success) {
        toast({ title: "Success", description: "Document status updated" })
        fetchData()
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateLegalSummary = async () => {
    setActionLoading(true)
    try {
      const response = await apiConnector(
        "GET",
        `${legalDocuments.GET_LEGAL_SUMMARY}/${storeId}/legal-summary`,
        null,
        { Authorization: `Bearer ${token}` }
      )

      if (response?.data?.success) {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(response.data.legalSummary, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `legal-summary-${storeInfo?.registrationRef || storeId}-${format(new Date(), "yyyy-MM-dd")}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: "Success", description: "Legal summary downloaded" })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate summary" })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
      case "received":
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      case "expired":
        return <Badge className="bg-gray-100 text-gray-800"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getChecklistIcon = (status: string) => {
    switch (status) {
      case "complete":
      case "verified":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "pending":
        return <Clock className="h-5 w-5 text-amber-500" />
      default:
        return <XCircle className="h-5 w-5 text-red-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col">
          <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex-1">
              <PageHeader
                title={`Legal Documents - ${storeInfo?.storeName || "Store"}`}
                description={`Registration: ${storeInfo?.registrationRef || "N/A"}`}
                icon={<Scale className="h-6 w-6" />}
              />
            </div>
            <Button onClick={handleGenerateLegalSummary} disabled={actionLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export Legal Summary
            </Button>
          </div>

          {/* Store Info Card */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Store Name</p>
                  <p className="font-medium">{storeInfo?.storeName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Owner</p>
                  <p className="font-medium">{storeInfo?.ownerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{storeInfo?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Registration Ref</p>
                  <p className="font-mono font-medium">{storeInfo?.registrationRef}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="documents" className="space-y-4">
            <TabsList>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="terms">Terms Acceptance</TabsTrigger>
              <TabsTrigger value="credit">Credit Terms</TabsTrigger>
            </TabsList>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Legal Documents</CardTitle>
                    <CardDescription>All documents on file for this store</CardDescription>
                  </div>
                  <Button onClick={() => setAddDocDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Document
                  </Button>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No documents on file</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-4">
                            <FileText className="h-8 w-8 text-blue-500" />
                            <div>
                              <p className="font-medium">{doc.documentName}</p>
                              <p className="text-sm text-gray-500">
                                {DOCUMENT_TYPES.find(t => t.value === doc.documentType)?.label || doc.documentType}
                                {doc.acceptedAt && ` • Accepted: ${format(new Date(doc.acceptedAt), "MMM dd, yyyy")}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(doc.status)}
                            {doc.status === "received" && user?.role === "admin" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(doc._id, "verified")}>
                                  <CheckCircle className="h-4 w-4 mr-1" /> Verify
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleUpdateStatus(doc._id, "rejected")}>
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedDoc(doc); setViewDocDialogOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Checklist Tab */}
            <TabsContent value="checklist">
              <Card>
                <CardHeader>
                  <CardTitle>Document Checklist</CardTitle>
                  <CardDescription>Required and recommended documents for legal compliance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(checklist).map(([key, item]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getChecklistIcon(item.status)}
                          <div>
                            <p className="font-medium">{item.label}</p>
                            {item.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === "missing" ? (
                            <span className="text-sm text-red-500">Missing</span>
                          ) : item.status === "pending" ? (
                            <span className="text-sm text-amber-500">Pending Review</span>
                          ) : (
                            <span className="text-sm text-green-500">Complete</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Terms Acceptance Tab */}
            <TabsContent value="terms">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Terms & Conditions Acceptance
                  </CardTitle>
                  <CardDescription>Legal record of terms acceptance</CardDescription>
                </CardHeader>
                <CardContent>
                  {termsAcceptance?.acceptedAt ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-800">Terms Accepted</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Accepted At</p>
                            <p className="font-medium">{format(new Date(termsAcceptance.acceptedAt), "PPpp")}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Version</p>
                            <p className="font-medium">{termsAcceptance.acceptedVersion}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">IP Address</p>
                            <p className="font-mono text-xs">{termsAcceptance.ipAddress}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">User Agent</p>
                            <p className="text-xs truncate">{termsAcceptance.userAgent}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Key Terms Agreed To:</h4>
                        <ul className="text-sm space-y-1 text-gray-700">
                          <li>• Payment due within 7 days of invoice</li>
                          <li>• 1.5% monthly interest (18% annually) on late payments</li>
                          <li>• $50 returned check fee</li>
                          <li>• Legal jurisdiction: Atlanta, Georgia</li>
                          <li>• Personal guarantee for business debts</li>
                          <li>• Waiver of jury trial</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
                      <p>No terms acceptance record found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Credit Terms Tab */}
            <TabsContent value="credit">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Credit Terms
                  </CardTitle>
                  <CardDescription>Current credit arrangement for this store</CardDescription>
                </CardHeader>
                <CardContent>
                  {creditTerms ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold">${creditTerms.creditLimit?.toLocaleString() || 0}</p>
                        <p className="text-sm text-gray-500">Credit Limit</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold">Net {creditTerms.paymentTermsDays || 7}</p>
                        <p className="text-sm text-gray-500">Payment Terms</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                        <p className="text-2xl font-bold">{creditTerms.interestRate || 1.5}%</p>
                        <p className="text-sm text-gray-500">Monthly Interest</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        {creditTerms.status === "active" ? (
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        ) : (
                          <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                        )}
                        <p className="text-2xl font-bold capitalize">{creditTerms.status || "None"}</p>
                        <p className="text-sm text-gray-500">Status</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No credit terms set</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Add Document Dialog */}
      <Dialog open={addDocDialogOpen} onOpenChange={setAddDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Legal Document</DialogTitle>
            <DialogDescription>Upload or record a new document for this store</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Type *</Label>
              <Select value={newDoc.documentType} onValueChange={(v) => setNewDoc({ ...newDoc, documentType: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document Name *</Label>
              <Input 
                value={newDoc.documentName} 
                onChange={(e) => setNewDoc({ ...newDoc, documentName: e.target.value })}
                placeholder="e.g., Business License 2024"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                value={newDoc.description} 
                onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                placeholder="Additional details..."
              />
            </div>
            <div>
              <Label>Upload Document</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input 
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleFileUpload}
                    disabled={!selectedFile || uploadingFile || !!newDoc.fileUrl}
                  >
                    {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
                {selectedFile && !newDoc.fileUrl && (
                  <p className="text-sm text-amber-600">
                    File selected: {selectedFile.name} - Click upload button to upload
                  </p>
                )}
                {newDoc.fileUrl && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>File uploaded: {newDoc.fileName || "Document"}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setNewDoc(prev => ({ ...prev, fileUrl: "", fileName: "" }))
                        setSelectedFile(null)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Or paste File URL (if already uploaded)</Label>
              <Input 
                value={newDoc.fileUrl} 
                onChange={(e) => setNewDoc({ ...newDoc, fileUrl: e.target.value })}
                placeholder="https://..."
                disabled={!!selectedFile && !newDoc.fileUrl}
              />
            </div>
            <div>
              <Label>Expiry Date (if applicable)</Label>
              <Input 
                type="date"
                value={newDoc.expiryDate} 
                onChange={(e) => setNewDoc({ ...newDoc, expiryDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Admin Notes</Label>
              <Textarea 
                value={newDoc.adminNotes} 
                onChange={(e) => setNewDoc({ ...newDoc, adminNotes: e.target.value })}
                placeholder="Internal notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddDocDialogOpen(false)
              setSelectedFile(null)
              setNewDoc({ documentType: "", documentName: "", description: "", fileUrl: "", fileName: "", expiryDate: "", adminNotes: "" })
            }}>Cancel</Button>
            <Button onClick={handleAddDocument} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog - Enhanced Legal Version */}
      <Dialog open={viewDocDialogOpen} onOpenChange={setViewDocDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              {selectedDoc?.documentType === "terms_acceptance" ? "Terms & Conditions Agreement" : selectedDoc?.documentName}
            </DialogTitle>
            <DialogDescription>
              Legal document record - {selectedDoc?.documentVersion || "v1.0.0"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDoc && (
            <div className="space-y-6">
              {/* Legal Header */}
              {selectedDoc.documentType === "terms_acceptance" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Legally Binding Agreement</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    This document serves as legal proof that the below party has read, understood, and agreed to 
                    the Terms and Conditions of Vali Produce as of the date and time indicated.
                  </p>
                </div>
              )}

              {/* Document Details Card */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-800">Agreement Details</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Document Type</p>
                      <p className="font-medium">{DOCUMENT_TYPES.find(t => t.value === selectedDoc.documentType)?.label || "Terms & Conditions"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedDoc.status)}</div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Version</p>
                      <p className="font-medium font-mono">{selectedDoc.documentVersion || "1.0.0"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Document ID</p>
                      <p className="font-medium font-mono text-xs">{selectedDoc._id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatory Information */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-800">Signatory Information</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Full Name</p>
                      <p className="font-medium">{selectedDoc.acceptedByName || storeInfo?.ownerName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Email Address</p>
                      <p className="font-medium">{selectedDoc.acceptedByEmail || storeInfo?.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Store Name</p>
                      <p className="font-medium">{storeInfo?.storeName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Registration Reference</p>
                      <p className="font-medium font-mono">{storeInfo?.registrationRef || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamp & Verification */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-800">Timestamp & Verification</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Date & Time of Acceptance</p>
                      <p className="font-medium">
                        {selectedDoc.acceptedAt 
                          ? format(new Date(selectedDoc.acceptedAt), "MMMM dd, yyyy 'at' h:mm:ss a zzz")
                          : format(new Date(selectedDoc.createdAt), "MMMM dd, yyyy 'at' h:mm:ss a zzz")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">IP Address</p>
                      <p className="font-medium font-mono">{selectedDoc.ipAddress || "Not recorded"}</p>
                    </div>
                  </div>
                  {selectedDoc.verifiedAt && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Verified By Admin</p>
                      <p className="font-medium">{selectedDoc.verifiedByName} on {format(new Date(selectedDoc.verifiedAt), "PPP")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Terms Summary (for terms acceptance) */}
              {selectedDoc.documentType === "terms_acceptance" && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                    <h3 className="font-semibold text-red-800">Key Terms Agreed To</h3>
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Payment Terms</p>
                        <p className="text-gray-600">All invoices due within 7 days of invoice date</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Late Payment Interest</p>
                        <p className="text-gray-600">1.5% per month (18% per annum) on overdue balances</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Returned Check Fee</p>
                        <p className="text-gray-600">$50.00 fee for any returned check</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Collection Costs</p>
                        <p className="text-gray-600">Responsible for all collection costs including attorney fees (up to 35%)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Legal Jurisdiction</p>
                        <p className="text-gray-600">State of Georgia, Fulton County, Atlanta courts</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Personal Guarantee</p>
                        <p className="text-gray-600">Principals personally liable for business debts</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Jury Trial Waiver</p>
                        <p className="text-gray-600">Waived right to jury trial for disputes</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Legal Notice */}
              <div className="bg-gray-100 rounded-lg p-4 text-xs text-gray-600">
                <p className="font-semibold mb-1">Legal Notice:</p>
                <p>
                  This electronic record constitutes a legally binding agreement under the Electronic Signatures in 
                  Global and National Commerce Act (E-SIGN Act) and the Uniform Electronic Transactions Act (UETA). 
                  The timestamp, IP address, and user information recorded above serve as proof of acceptance.
                </p>
              </div>

              {selectedDoc.adminNotes && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  <p className="text-amber-800 text-sm font-medium">Internal Admin Notes</p>
                  <p className="text-sm text-amber-700">{selectedDoc.adminNotes}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (!selectedDoc) return;
                // Generate and download PDF-like document
                const docContent = `
VALI PRODUCE - LEGAL DOCUMENT RECORD
=====================================

DOCUMENT INFORMATION
--------------------
Document Type: ${DOCUMENT_TYPES.find(t => t.value === selectedDoc.documentType)?.label || "Terms & Conditions"}
Document Version: ${selectedDoc.documentVersion || "1.0.0"}
Document ID: ${selectedDoc._id}
Status: ${selectedDoc.status.toUpperCase()}

SIGNATORY INFORMATION
---------------------
Full Name: ${selectedDoc.acceptedByName || storeInfo?.ownerName || "N/A"}
Email: ${selectedDoc.acceptedByEmail || storeInfo?.email || "N/A"}
Store Name: ${storeInfo?.storeName || "N/A"}
Registration Reference: ${storeInfo?.registrationRef || "N/A"}

TIMESTAMP & VERIFICATION
------------------------
Date & Time: ${selectedDoc.acceptedAt ? format(new Date(selectedDoc.acceptedAt), "MMMM dd, yyyy 'at' h:mm:ss a") : format(new Date(selectedDoc.createdAt), "MMMM dd, yyyy 'at' h:mm:ss a")}
IP Address: ${selectedDoc.ipAddress || "Not recorded"}
${selectedDoc.verifiedAt ? `Verified By: ${selectedDoc.verifiedByName} on ${format(new Date(selectedDoc.verifiedAt), "PPP")}` : ""}

KEY TERMS AGREED TO
-------------------
✓ Payment due within 7 days of invoice
✓ Late payment interest: 1.5% per month (18% annually)
✓ Returned check fee: $50.00
✓ Collection costs: Up to 35% for attorney fees
✓ Legal jurisdiction: Fulton County, Atlanta, Georgia
✓ Personal guarantee for business debts
✓ Jury trial waiver

LEGAL NOTICE
------------
This electronic record constitutes a legally binding agreement under the 
Electronic Signatures in Global and National Commerce Act (E-SIGN Act) 
and the Uniform Electronic Transactions Act (UETA).

Generated: ${format(new Date(), "MMMM dd, yyyy 'at' h:mm:ss a")}
=====================================
                `.trim();
                
                const blob = new Blob([docContent], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `legal-agreement-${storeInfo?.registrationRef || storeId}-${format(new Date(), "yyyy-MM-dd")}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                toast({ title: "Downloaded", description: "Legal document downloaded" });
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Record
            </Button>
            <Button variant="outline" onClick={() => setViewDocDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StoreLegalDocuments
