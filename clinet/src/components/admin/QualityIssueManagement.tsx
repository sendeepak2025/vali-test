import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertTriangle, CheckCircle2, XCircle, DollarSign,
  Search, RefreshCw, Loader2, Eye, Store,
  ThumbsUp, Image
} from 'lucide-react';

interface QualityIssue {
  _id: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  issueType: string;
  description: string;
  affectedItems: Array<{ productId: string; productName: string; quantity: number; requestedAmount: number }>;
  images: string[];
  requestedAction: string;
  requestedAmount: number;
  status: string;
  approvedAmount?: number;
  resolution?: string;
  createdAt: string;
}

const issueTypes: Record<string, string> = {
  damaged: '📦 Damaged',
  wrong_item: '🔄 Wrong Item',
  missing_item: '❌ Missing',
  quality: '⚠️ Quality',
  expired: '📅 Expired',
  other: '📝 Other'
};

const QualityIssueManagement: React.FC = () => {
  const { toast } = useToast();
  const token = useSelector((state: RootState) => state.auth?.token);

  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [allIssues, setAllIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Quick action states
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Fetch
  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      const res = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/quality-issues/admin?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllIssues(data.issues || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Filter issues based on status tab
  useEffect(() => {
    if (statusFilter === 'all') {
      setIssues(allIssues);
    } else {
      setIssues(allIssues.filter(issue => issue.status === statusFilter));
    }
  }, [statusFilter, allIssues]);

  useEffect(() => { fetchIssues(); }, [token]);
  useEffect(() => {
    const t = setTimeout(fetchIssues, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Quick Approve - One Click!
  const handleQuickApprove = async (issue: QualityIssue) => {
    setProcessing(issue._id);
    try {
      const res = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/quality-issues/${issue._id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: 'approved',
          approvedAmount: issue.requestedAmount,
          resolution: 'Approved. Credit memo created.',
          createCreditMemo: true
        })
      });
      if (res.ok) {
        toast({ title: '✓ Approved', description: `$${issue.requestedAmount.toFixed(2)} credit memo created` });
        fetchIssues();
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error' });
    }
    setProcessing(null);
  };

  // Adjust Amount
  const handleAdjust = async () => {
    if (!selectedIssue || !adjustAmount) return;
    setProcessing(selectedIssue._id);
    try {
      const amount = parseFloat(adjustAmount);
      const res = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/quality-issues/${selectedIssue._id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: amount < selectedIssue.requestedAmount ? 'partially_approved' : 'approved',
          approvedAmount: amount,
          resolution: `Adjusted to $${amount.toFixed(2)}. Credit memo created.`,
          createCreditMemo: true
        })
      });
      if (res.ok) {
        toast({ title: '✓ Adjusted', description: `$${amount.toFixed(2)} credit memo created` });
        setShowAdjust(false);
        setSelectedIssue(null);
        fetchIssues();
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error' });
    }
    setProcessing(null);
  };

  // Reject
  const handleReject = async () => {
    if (!selectedIssue) return;
    setProcessing(selectedIssue._id);
    try {
      await fetch(`${import.meta.env.VITE_APP_BASE_URL}/quality-issues/${selectedIssue._id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: 'rejected',
          approvedAmount: 0,
          resolution: rejectReason || 'Request rejected after review.'
        })
      });
      toast({ title: 'Rejected' });
      setShowReject(false);
      setSelectedIssue(null);
      fetchIssues();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error' });
    }
    setProcessing(null);
  };

  const pendingCount = allIssues.filter(i => i.status === 'pending').length;
  const approvedCount = allIssues.filter(i => i.status === 'approved' || i.status === 'partially_approved').length;
  const rejectedCount = allIssues.filter(i => i.status === 'rejected').length;
  const totalRequested = allIssues.filter(i => i.status === 'pending').reduce((s, i) => s + (i.requestedAmount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          <div>
            <h2 className="text-xl font-bold">Quality Issues</h2>
            {pendingCount > 0 && (
              <p className="text-sm text-orange-600">{pendingCount} pending • ${totalRequested.toFixed(0)} requested</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 w-48" />
          </div>
          <Button variant="ghost" size="icon" onClick={fetchIssues}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{allIssues.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            Pending
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{pendingCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Approved
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{approvedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Rejected
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{rejectedCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Issues List */}
      {loading ? (
        <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : issues.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
          No pending issues
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {issues.map(issue => (
            <Card key={issue._id} className={`${issue.status === 'pending' ? 'border-orange-200 bg-orange-50/30' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Proof Image Thumbnail */}
                  {issue.images?.[0] ? (
                    <div 
                      className="w-14 h-14 rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-primary flex-shrink-0"
                      onClick={() => { setSelectedIssue(issue); setShowImages(true); }}
                    >
                      <img src={issue.images[0]} alt="" className="w-full h-full object-cover" />
                      {issue.images.length > 1 && (
                        <div className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-1 rounded-tl">
                          +{issue.images.length - 1}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Image className="h-5 w-5 text-gray-400" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">#{issue.orderNumber}</span>
                      <Badge variant="outline" className="text-xs">{issueTypes[issue.issueType] || issue.issueType}</Badge>
                      {issue.status === 'approved' && <Badge className="bg-green-100 text-green-700">✓ Approved</Badge>}
                      {issue.status === 'partially_approved' && <Badge className="bg-orange-100 text-orange-700">Partial</Badge>}
                      {issue.status === 'rejected' && <Badge className="bg-red-100 text-red-700">Rejected</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      <Store className="h-3 w-3 inline mr-1" />{issue.storeName} • {format(new Date(issue.createdAt), 'MMM d')}
                    </p>
                    <p className="text-sm truncate mt-0.5">{issue.description}</p>
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold">${issue.requestedAmount?.toFixed(2)}</p>
                      {issue.approvedAmount !== undefined && issue.approvedAmount !== issue.requestedAmount && (
                        <p className="text-xs text-green-600">Approved: ${issue.approvedAmount.toFixed(2)}</p>
                      )}
                    </div>

                    {/* Quick Actions for Pending */}
                    {issue.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        {/* View Details */}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-9 px-2"
                          onClick={() => { setSelectedIssue(issue); setShowImages(true); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* One-Click Approve */}
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 h-9 px-3"
                          onClick={() => handleQuickApprove(issue)}
                          disabled={processing === issue._id}
                        >
                          {processing === issue._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <><ThumbsUp className="h-4 w-4 mr-1" /> Approve</>
                          )}
                        </Button>
                        
                        {/* Adjust */}
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-9 px-2"
                          onClick={() => { 
                            setSelectedIssue(issue); 
                            setAdjustAmount(issue.requestedAmount.toString()); 
                            setShowAdjust(true); 
                          }}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        
                        {/* Reject */}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-9 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { setSelectedIssue(issue); setRejectReason(''); setShowReject(true); }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* View for resolved */}
                    {issue.status !== 'pending' && (
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedIssue(issue); setShowImages(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      <Dialog open={showImages} onOpenChange={setShowImages}>
        <DialogContent className="max-w-2xl">
          {selectedIssue && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>#{selectedIssue.orderNumber} - {selectedIssue.storeName}</span>
                  <Badge variant="outline">{issueTypes[selectedIssue.issueType]}</Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Description */}
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm">{selectedIssue.description}</p>
                </div>

                {/* Items */}
                <div className="text-sm">
                  <p className="font-medium mb-2">Affected Items:</p>
                  {selectedIssue.affectedItems?.map((item, i) => (
                    <div key={i} className="flex justify-between py-1 border-b last:border-0">
                      <span>{item.productName} (x{item.quantity})</span>
                      <span className="font-medium">${item.requestedAmount?.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold">
                    <span>Total Requested</span>
                    <span>${selectedIssue.requestedAmount?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Images */}
                {selectedIssue.images?.length > 0 && (
                  <div>
                    <p className="font-medium mb-2 text-sm">Proof Images:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedIssue.images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border hover:opacity-80">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution */}
                {selectedIssue.resolution && (
                  <div className={`p-3 rounded-lg ${selectedIssue.status === 'rejected' ? 'bg-red-50' : 'bg-green-50'}`}>
                    <p className="text-sm font-medium mb-1">Resolution:</p>
                    <p className="text-sm">{selectedIssue.resolution}</p>
                    {selectedIssue.approvedAmount !== undefined && selectedIssue.approvedAmount > 0 && (
                      <p className="text-sm font-bold mt-1 text-green-700">Approved: ${selectedIssue.approvedAmount.toFixed(2)}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions if still pending */}
              {selectedIssue.status === 'pending' && (
                <DialogFooter className="gap-2">
                  <Button variant="destructive" onClick={() => { setShowImages(false); setShowReject(true); }}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button variant="outline" onClick={() => { setShowImages(false); setAdjustAmount(selectedIssue.requestedAmount.toString()); setShowAdjust(true); }}>
                    <DollarSign className="h-4 w-4 mr-1" /> Adjust
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setShowImages(false); handleQuickApprove(selectedIssue); }}>
                    <ThumbsUp className="h-4 w-4 mr-1" /> Approve ${selectedIssue.requestedAmount?.toFixed(2)}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust Amount Modal - Simple! */}
      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Amount</DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">Requested</p>
                <p className="text-2xl font-bold">${selectedIssue.requestedAmount?.toFixed(2)}</p>
              </div>
              <div>
                <Label>Approve Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedIssue.requestedAmount}
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  className="text-center text-lg font-bold mt-1"
                  autoFocus
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjust(false)}>Cancel</Button>
            <Button 
              onClick={handleAdjust} 
              disabled={!adjustAmount || processing === selectedIssue?._id}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing === selectedIssue?._id ? <Loader2 className="h-4 w-4 animate-spin" /> : `Approve $${parseFloat(adjustAmount || '0').toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal - Simple! */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Reject Request</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Why is this being rejected?"
              rows={3}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={processing === selectedIssue?._id}
            >
              {processing === selectedIssue?._id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QualityIssueManagement;
