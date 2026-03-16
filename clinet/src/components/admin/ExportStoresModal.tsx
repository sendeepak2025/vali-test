import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, FileText, AlertTriangle, CheckCircle, Users, UserX, Activity } from 'lucide-react';
import { exportStoresDataAPI } from '@/services2/operations/auth';
import { toast } from 'react-toastify';

interface ExportStoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary?: {
    totalStores: number;
    overdueStores: number;
    warningStores: number;
    goodStandingStores: number;
    activeStores: number;
    inactiveStores: number;
  };
}

const ExportStoresModal: React.FC<ExportStoresModalProps> = ({
  isOpen,
  onClose,
  summary = {
    totalStores: 0,
    overdueStores: 0,
    warningStores: 0,
    goodStandingStores: 0,
    activeStores: 0,
    inactiveStores: 0
  }
}) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const exportOptions = [
    {
      type: 'all',
      title: 'All Stores',
      description: 'Export complete store database with all information',
      icon: Users,
      count: summary.totalStores,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      iconColor: 'text-blue-600'
    },
    {
      type: 'overdue',
      title: 'Overdue Stores',
      description: 'Stores with payments overdue (30+ days)',
      icon: AlertTriangle,
      count: summary.overdueStores,
      color: 'bg-red-50 text-red-700 border-red-200',
      iconColor: 'text-red-600'
    },
    {
      type: 'warning',
      title: 'Warning Stores',
      description: 'Stores with payments due (14-30 days)',
      icon: AlertTriangle,
      count: summary.warningStores,
      color: 'bg-orange-50 text-orange-700 border-orange-200',
      iconColor: 'text-orange-600'
    },
    {
      type: 'good_standing',
      title: 'Good Standing',
      description: 'Stores with no outstanding payments',
      icon: CheckCircle,
      count: summary.goodStandingStores,
      color: 'bg-green-50 text-green-700 border-green-200',
      iconColor: 'text-green-600'
    },
    {
      type: 'active',
      title: 'Active Stores',
      description: 'Stores with orders in last 30 days',
      icon: Activity,
      count: summary.activeStores,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      iconColor: 'text-purple-600'
    },
    {
      type: 'inactive',
      title: 'Inactive Stores',
      description: 'Stores with no orders in 30+ days',
      icon: UserX,
      count: summary.inactiveStores,
      color: 'bg-gray-50 text-gray-700 border-gray-200',
      iconColor: 'text-gray-600'
    }
  ];

  const handleExport = async (exportType: string, title: string) => {
    if (exporting) return;
    
    setExporting(exportType);
    
    try {
      const response = await exportStoresDataAPI(exportType);
      
      if (response?.success && response?.data?.stores) {
        const stores = response.data.stores;
        
        if (stores.length === 0) {
          toast.warning(`No stores found for ${title}`);
          return;
        }

        // Create CSV content with same headers as original
        const headers = ["Store Name", "Owner", "Email", "Phone", "City", "State", "Total Orders", "Total Spent", "Balance Due", "Payment Status"];

        const csvRows = [
          headers.join(','),
          ...stores.map((store: any) => [
            `"${store.storeName}"`,
            `"${store.ownerName}"`,
            store.email,
            store.phone,
            store.city,
            store.state,
            store.totalOrders,
            store.totalSpent.toFixed(2),
            store.balanceDue.toFixed(2),
            store.paymentStatus
          ].join(','))
        ];

        const csvContent = csvRows.join('\n');
        
        // Create and download file
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `${exportType}_stores_${timestamp}.csv`;
        
        link.click();
        URL.revokeObjectURL(link.href);
        
        toast.success(`${title} exported successfully! (${stores.length} stores)`);
        onClose();
      } else {
        toast.error('Failed to export stores data');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export stores data');
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Stores Data
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Choose the type of stores data you want to export as CSV file:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              const isExporting = exporting === option.type;
              
              return (
                <div
                  key={option.type}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${option.color}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${option.iconColor}`} />
                      <h3 className="font-medium">{option.title}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {option.count}
                    </Badge>
                  </div>
                  
                  <p className="text-sm opacity-80 mb-3">
                    {option.description}
                  </p>
                  
                  <Button
                    onClick={() => handleExport(option.type, option.title)}
                    disabled={isExporting || option.count === 0}
                    size="sm"
                    className="w-full"
                    variant={option.count === 0 ? "secondary" : "default"}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export {option.count > 0 ? `(${option.count})` : '(0)'}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportStoresModal;