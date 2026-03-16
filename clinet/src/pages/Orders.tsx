import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import OrdersTableNew from '@/components/orders/OrdersTableNew';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, FileText, Receipt } from 'lucide-react';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import ManageDriversEnhanced from './ManageDriversEnhanced';
import ManageTripsEnhanced from './ManageTripsEnhanced';

const Orders = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth?.user ?? null);

  // Get orderId from navigation state
  const { orderId, orderNumber } = location.state || {};

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNewOrder = () => {
    navigate('/orders/new');
  };

  // Placeholder functions for OrdersTableNew props
  const handleDelete = (id: string) => {
    // Order deleted
  };

  const handlePayment = (id: string, paymentMethod: any) => {
    // Payment updated
  };

  return (
    <div className="flex  overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="page-container max-w-full px-4 py-4">
            <PageHeader
              title="Order Management"
              description="Manage orders, generate invoices, and track shipments"
            >
              {user.role === "admin" && <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleNewOrder}>
                  <Plus size={16} className="mr-2" />
                  New Order
                </Button>

              </div>}
            </PageHeader>

            <Tabs defaultValue="orders" className="mt-6">
              {user.role === "admin" && <TabsList className="w-full max-w-md grid grid-cols-2 mb-6">
                <TabsTrigger value="orders" className="flex items-center">
                  <FileText size={16} className="mr-2" />
                  Orders List
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center">
                  <Receipt size={16} className="mr-2" />
                  Advanced Management
                </TabsTrigger>
              </TabsList>}

              <TabsContent value="orders">
                <OrdersTableNew 
                  orders={[]} 
                  fetchOrders={() => {}} 
                  onDelete={handleDelete} 
                  onPayment={handlePayment}
                  initialOrderId={orderId}
                  initialOrderNumber={orderNumber}
                />
              </TabsContent>

              <TabsContent value="advanced">
  <Tabs defaultValue="routes" className="mt-4">
    <TabsList className="w-full grid grid-cols-2 mb-4">
      <TabsTrigger value="routes">Manage Trips</TabsTrigger>
      <TabsTrigger value="drivers">Manage Drivers</TabsTrigger>
    </TabsList>

    <TabsContent value="routes">
      <ManageTripsEnhanced />
    </TabsContent>

    <TabsContent value="drivers">
      <ManageDriversEnhanced />
    </TabsContent>
  </Tabs>
</TabsContent>

            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Orders;
