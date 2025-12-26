import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertTriangle, Camera, Upload, X, Image, FileText, Send, Clock,
  CheckCircle2, XCircle, MessageSquare, DollarSign, Package, Loader2,
  Plus, Eye, RefreshCw, Search, Filter, ChevronRight, Video, Film
} from 'lucide-react';

interface QualityIssue {
  _id: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  issueType: 'damaged' | 'wrong_item' | 'missing_item' | 'quality' | 'expired' | 'other';
  description: string;
  affectedItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    requestedAmount: number;
  }>;
  images: string[];
  requestedAction: 'refund' | 'replacement' | 'credit' | 'adjustment';
  requestedAmount: number;
  status: 'pending' | 'under_review' | 'approved' | 'partially_approved' | 'rejected' | 'resolved';
  adminNotes?: string;
  approvedAmount?: number;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  communications: Array<{
    sender: 'store' | 'admin';
    message: string;
    timestamp: string;
  }>;
}

interface QualityIssueReportProps {
  orders: any[];
  onRefresh?: () => void;
}

const issueTypeLabels: Record<string, string> = {
  damaged: 'Damaged Product',
  wrong_item: 'Wrong Item Received',
  missing_item: 'Missing Item',
  quality: 'Quality Issue',
  expired: 'Expired/Near Expiry',
  other: 'Other Issue'
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  under_review: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  partially_approved: 'bg-orange-100 text-orange-700 border-orange-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  resolved: 'bg-gray-100 text-gray-700 border-gray-200'
};

const QualityIssueReport: React.FC<QualityIssueReportProps> = ({ orders, onRefresh }) => {
  const { toast } = useToast();
  const token = useSelector((state: RootState) => state.auth?.token);
  const user = useSelector((state: RootState) => state.auth?.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [activeTab, setActiveTab] = useState('list');
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // New Issue Form State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [issueType, setIssueType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [requestedAction, setRequestedAction] = useState<string>('refund');
  const [selectedItems, setSelectedItems] = useState<Array<{
    productId: string;
    productName: string;
    quantity: number;
    maxQuantity: number;
    unitPrice: number;
    requestedAmount: number;
  }>>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Detail View State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Fetch issues
  const fetchIssues = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/quality-issues/store`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues || []);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchIssues();
  }, [token]);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('thumbnail', file));

      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/image/multi`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        // The endpoint returns { images: [{ secure_url: '...' }, ...] }
        const urls = data.images?.map((img: any) => img.secure_url || img.url || img) || [];
        setUploadedImages(prev => [...prev, ...urls]);
        toast({ title: 'Images uploaded', description: `${files.length} image(s) uploaded successfully` });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({ variant: 'destructive', title: 'Upload failed', description: 'Failed to upload images. Please try again.' });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle item selection
  const toggleItemSelection = (item: any) => {
    const exists = selectedItems.find(i => i.productId === item.productId);
    if (exists) {
      setSelectedItems(prev => prev.filter(i => i.productId !== item.productId));
    } else {
      setSelectedItems(prev => [...prev, {
        productId: item.productId,
        productName: item.productName || item.name,
        quantity: item.quantity,
        maxQuantity: item.quantity,
        unitPrice: item.price || item.unitPrice || 0,
        requestedAmount: (item.price || item.unitPrice || 0) * item.quantity
      }]);
    }
  };

  // Update item quantity
  const updateItemQuantity = (productId: string, quantity: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const qty = Math.min(Math.max(1, quantity), item.maxQuantity);
        return { ...item, quantity: qty, requestedAmount: item.unitPrice * qty };
      }
      return item;
    }));
  };

  // Calculate total requested amount
  const totalRequestedAmount = selectedItems.reduce((sum, item) => sum + item.requestedAmount, 0);

  // Submit new issue
  const handleSubmitIssue = async () => {
    if (!selectedOrder || !issueType || !description || selectedItems.length === 0) {
      toast({ variant: 'destructive', title: 'Missing information', description: 'Please fill all required fields' });
      return;
    }

    if (uploadedImages.length === 0) {
      toast({ variant: 'destructive', title: 'Proof required', description: 'Please upload at least one image as proof' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/quality-issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: selectedOrder._id || selectedOrder.id,
          orderNumber: selectedOrder.orderNumber || selectedOrder.id,
          issueType,
          description,
          affectedItems: selectedItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            requestedAmount: item.requestedAmount
          })),
          images: uploadedImages,
          requestedAction,
          requestedAmount: totalRequestedAmount
        })
      });

      if (response.ok) {
        toast({ title: 'Issue reported', description: 'Your quality issue has been submitted for review' });
        resetForm();
        setCreateModalOpen(false);
        fetchIssues();
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Submission failed', description: 'Failed to submit quality issue' });
    } finally {
      setSubmitting(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedIssue) return;

    setSendingMessage(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/quality-issues/${selectedIssue._id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage })
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedIssue(data.issue);
        setNewMessage('');
        fetchIssues();
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed', description: 'Failed to send message' });
    } finally {
      setSendingMessage(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedOrder(null);
    setIssueType('');
    setDescription('');
    setRequestedAction('refund');
    setSelectedItems([]);
    setUploadedImages([]);
  };

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get recent orders for selection (last 30 days, delivered/completed)
  const eligibleOrders = orders.filter(order => {
    const orderDate = new Date(order.date || order.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return orderDate >= thirtyDaysAgo && ['delivered', 'completed', 'shipped'].includes(order.status);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Quality Issues & Refund Requests
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Report product issues and request refunds or adjustments
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Report Issue
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-2xl font-bold">{issues.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {issues.filter(i => i.status === 'pending' || i.status === 'under_review').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {issues.filter(i => i.status === 'approved' || i.status === 'resolved').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Refunded</p>
                <p className="text-2xl font-bold text-primary">
                  ${issues.filter(i => i.status === 'approved' || i.status === 'resolved')
                    .reduce((sum, i) => sum + (i.approvedAmount || 0), 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchIssues}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredIssues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No quality issues reported yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setCreateModalOpen(true)}>
              Report Your First Issue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map(issue => (
            <Card key={issue._id} className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setSelectedIssue(issue); setDetailModalOpen(true); }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">Order #{issue.orderNumber}</span>
                      <Badge className={statusColors[issue.status]}>
                        {issue.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">{issueTypeLabels[issue.issueType]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{issue.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        {issue.affectedItems?.length || 0} items
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        Requested: ${issue.requestedAmount?.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(issue.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Issue Modal */}
      <Dialog open={createModalOpen} onOpenChange={(open) => { if (!open) resetForm(); setCreateModalOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Report Quality Issue
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step 1: Select Order */}
            <div>
              <Label className="text-sm font-medium">1. Select Order</Label>
              <Select value={selectedOrder?._id || ''} onValueChange={(id) => {
                const order = eligibleOrders.find(o => (o._id || o.id) === id);
                setSelectedOrder(order);
                setSelectedItems([]);
              }}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select an order to report issue" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleOrders.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No eligible orders found (must be delivered within last 30 days)
                    </div>
                  ) : (
                    eligibleOrders.map(order => (
                      <SelectItem key={order._id || order.id} value={order._id || order.id}>
                        Order #{order.orderNumber || order.id} - {format(new Date(order.date || order.createdAt), 'MMM d')} - ${order.total?.toFixed(2)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select Affected Items */}
            {selectedOrder && (
              <div>
                <Label className="text-sm font-medium">2. Select Affected Items</Label>
                <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.productId} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.some(i => i.productId === item.productId)}
                          onChange={() => toggleItemSelection(item)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <div>
                          <p className="font-medium text-sm">{item.productName || item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity} × ${(item.price || item.unitPrice || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {selectedItems.some(i => i.productId === item.productId) && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Affected Qty:</Label>
                          <Input
                            type="number"
                            min="1"
                            max={item.quantity}
                            className="w-16 h-8"
                            value={selectedItems.find(i => i.productId === item.productId)?.quantity || 1}
                            onChange={(e) => updateItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Issue Details */}
            {selectedItems.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">3. Issue Type</Label>
                    <Select value={issueType} onValueChange={setIssueType}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select issue type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="damaged">Damaged Product</SelectItem>
                        <SelectItem value="wrong_item">Wrong Item Received</SelectItem>
                        <SelectItem value="missing_item">Missing Item</SelectItem>
                        <SelectItem value="quality">Quality Issue</SelectItem>
                        <SelectItem value="expired">Expired/Near Expiry</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">4. Requested Action</Label>
                    <Select value={requestedAction} onValueChange={setRequestedAction}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="refund">Full Refund</SelectItem>
                        <SelectItem value="credit">Store Credit</SelectItem>
                        <SelectItem value="adjustment">Price Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">5. Description</Label>
                  <Textarea
                    className="mt-2"
                    rows={3}
                    placeholder="Describe the issue in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <Label className="text-sm font-medium">6. Upload Proof (Required)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Upload photos or videos showing the issue (damaged items, wrong products, etc.)
                  </p>
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <div className="flex flex-wrap gap-3">
                      {uploadedImages.map((url, index) => {
                        const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('.avi') || url.includes('video');
                        return (
                          <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                            {isVideo ? (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <Video className="h-8 w-8 text-blue-500" />
                              </div>
                            ) : (
                              <img src={url} alt={`Proof ${index + 1}`} className="w-full h-full object-cover" />
                            )}
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        {uploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <div className="flex gap-1">
                              <Camera className="h-4 w-4" />
                              <Video className="h-4 w-4" />
                            </div>
                            <span className="text-xs mt-1">Add</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Tap to add photos or videos • Max 10 files
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Requested Amount:</span>
                    <span className="text-xl font-bold text-primary">${totalRequestedAmount.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setCreateModalOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmitIssue} disabled={submitting || !issueType || !description || selectedItems.length === 0 || uploadedImages.length === 0}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIssue && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Issue #{selectedIssue._id?.slice(-6).toUpperCase()}</span>
                  <Badge className={statusColors[selectedIssue.status]}>
                    {selectedIssue.status.replace('_', ' ')}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Issue Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Order</p>
                    <p className="font-medium">#{selectedIssue.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Issue Type</p>
                    <p className="font-medium">{issueTypeLabels[selectedIssue.issueType]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Requested Action</p>
                    <p className="font-medium capitalize">{selectedIssue.requestedAction}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium">{format(new Date(selectedIssue.createdAt), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedIssue.description}</p>
                </div>

                {/* Affected Items */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Affected Items</p>
                  <div className="border rounded-lg divide-y">
                    {selectedIssue.affectedItems?.map((item, index) => (
                      <div key={index} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-medium">${item.requestedAmount?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Images */}
                {selectedIssue.images?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Proof Images</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedIssue.images.map((url, index) => (
                        <a key={index} href={url} target="_blank" rel="noopener noreferrer"
                          className="w-24 h-24 rounded-lg overflow-hidden border hover:opacity-80">
                          <img src={url} alt={`Proof ${index + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amount Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Requested Amount:</span>
                    <span className="font-medium">${selectedIssue.requestedAmount?.toFixed(2)}</span>
                  </div>
                  {selectedIssue.approvedAmount !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span>Approved Amount:</span>
                      <span className="font-medium text-green-600">${selectedIssue.approvedAmount?.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                {selectedIssue.adminNotes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-700 mb-1">Admin Response</p>
                    <p className="text-sm text-blue-600">{selectedIssue.adminNotes}</p>
                  </div>
                )}

                {/* Resolution */}
                {selectedIssue.resolution && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-700 mb-1">Resolution</p>
                    <p className="text-sm text-green-600">{selectedIssue.resolution}</p>
                  </div>
                )}

                {/* Communications */}
                <div>
                  <p className="text-sm font-medium mb-2">Communications</p>
                  <ScrollArea className="h-48 border rounded-lg p-3">
                    {selectedIssue.communications?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedIssue.communications?.map((comm, index) => (
                          <div key={index} className={`p-3 rounded-lg ${comm.sender === 'store' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium">
                                {comm.sender === 'store' ? 'You' : 'Admin'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comm.timestamp), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <p className="text-sm">{comm.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Send Message */}
                  {selectedIssue.status !== 'resolved' && selectedIssue.status !== 'rejected' && (
                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                        {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QualityIssueReport;
