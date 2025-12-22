"use client"

import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "@/redux/store";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import {
  Bell, Check, CheckCheck, Trash2, Loader2, RefreshCw,
  Store, ShoppingCart, CreditCard, AlertCircle, ExternalLink
} from "lucide-react";
import { 
  getNotificationsAPI, 
  markAsReadAPI, 
  markAllAsReadAPI,
  deleteNotificationAPI 
} from "@/services2/operations/notifications";
import { formatDistanceToNow, format } from "date-fns";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
  readAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth?.token ?? null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  // Fetch notifications
  const fetchNotifications = useCallback(async (page = 1, type?: string) => {
    if (!token) return;
    
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (type && type !== "all") {
        params.type = type;
      }
      if (type === "unread") {
        params.unreadOnly = true;
        delete params.type;
      }
      
      const response = await getNotificationsAPI(params, token);
      setNotifications(response?.notifications || []);
      setPagination(response?.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications(1, activeFilter);
  }, [fetchNotifications, activeFilter]);

  // Handle mark as read
  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.isRead) return;
    
    await markAsReadAPI(notification._id, token);
    setNotifications(prev => 
      prev.map(n => n._id === notification._id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
    );
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAsReadAPI(token);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
  };

  // Handle delete
  const handleDelete = async (notificationId: string) => {
    await deleteNotificationAPI(notificationId, token);
    setNotifications(prev => prev.filter(n => n._id !== notificationId));
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    await handleMarkAsRead(notification);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // Get notification type icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "REGISTRATION_CONFIRMATION":
      case "STORE_APPROVED":
      case "STORE_REJECTED":
      case "REGISTRATION_ADMIN_ALERT":
        return <Store className="h-5 w-5" />;
      case "ORDER_CONFIRMATION":
      case "ORDER_STATUS_UPDATE":
        return <ShoppingCart className="h-5 w-5" />;
      case "PAYMENT_RECEIVED":
        return <CreditCard className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  // Get notification type color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case "REGISTRATION_CONFIRMATION":
      case "STORE_APPROVED":
        return "bg-green-100 text-green-600";
      case "STORE_REJECTED":
        return "bg-red-100 text-red-600";
      case "ORDER_CONFIRMATION":
      case "ORDER_STATUS_UPDATE":
        return "bg-blue-100 text-blue-600";
      case "REGISTRATION_ADMIN_ALERT":
        return "bg-amber-100 text-amber-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "REGISTRATION_CONFIRMATION": return "Registration";
      case "STORE_APPROVED": return "Approved";
      case "STORE_REJECTED": return "Rejected";
      case "REGISTRATION_ADMIN_ALERT": return "New Registration";
      case "ORDER_CONFIRMATION": return "Order";
      case "ORDER_STATUS_UPDATE": return "Order Update";
      case "PAYMENT_RECEIVED": return "Payment";
      default: return "System";
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <PageHeader
            title="Notifications"
            description="View and manage your notifications"
            icon={<Bell className="h-6 w-6" />}
          />

          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <Tabs value={activeFilter} onValueChange={setActiveFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="REGISTRATION_ADMIN_ALERT">Registration</TabsTrigger>
                <TabsTrigger value="ORDER_CONFIRMATION">Orders</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchNotifications(1, activeFilter)}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  {activeFilter === "unread" 
                    ? "You're all caught up! No unread notifications."
                    : "You don't have any notifications yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card 
                  key={notification._id} 
                  className={`transition-colors ${!notification.isRead ? "bg-blue-50/50 border-blue-200" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-2 rounded-full flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm">{notification.title}</h4>
                              {!notification.isRead && (
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{notification.message}</p>
                        {notification.link && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                            <ExternalLink className="h-3 w-3" />
                            <span>Click to view details</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification);
                            }}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification._id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchNotifications(pagination.page - 1, activeFilter)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchNotifications(pagination.page + 1, activeFilter)}
              >
                Next
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default NotificationCenter;
