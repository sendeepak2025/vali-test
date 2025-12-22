import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUnreadCountAPI } from "@/services2/operations/notifications";

interface NotificationBadgeProps {
  onClick?: () => void;
  className?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ onClick, className }) => {
  const token = useSelector((state: RootState) => state.auth?.token ?? null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    
    try {
      const count = await getUnreadCountAPI(token);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, [token]);

  // Initial fetch and polling every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Expose refresh function for external use
  useEffect(() => {
    // Store the refresh function globally so other components can trigger a refresh
    (window as any).__refreshNotificationCount = fetchUnreadCount;
    
    return () => {
      delete (window as any).__refreshNotificationCount;
    };
  }, [fetchUnreadCount]);

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className={`relative ${className || ""}`}
      onClick={onClick}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
          variant="destructive"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
      <span className="sr-only">Notifications ({unreadCount} unread)</span>
    </Button>
  );
};

// Helper function to refresh notification count from anywhere
export const refreshNotificationCount = () => {
  if ((window as any).__refreshNotificationCount) {
    (window as any).__refreshNotificationCount();
  }
};

export default NotificationBadge;
