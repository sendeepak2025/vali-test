"use client";

import type React from "react";
import { useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Package,
  Users,
  ShoppingCart,
  X,
  Zap,
  ChevronRight,
  ChevronLeft,
  Store,
  Settings,
  User2Icon,
  LucideLayoutDashboard,
  LocateIcon,
  CreditCard,
  UserCheck,
  AlertTriangle,
  LogOut,
  ClipboardList,
} from "lucide-react";
import type { RootState } from "@/redux/store";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "@/redux/authSlice";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [collapsed, setCollapsed] = useState(false);
  const user = useSelector((state: RootState) => state.auth?.user ?? null);

  const userRole = user?.role || "member";

  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate("/auth");
  }, [dispatch, navigate]);

  const adminNavigation = [
    {
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: <LucideLayoutDashboard size={20} />,
    },
    {
      name: "Inventory",
      path: "/admin/inventory",
      icon: <Package size={20} />,
    },
    {
      name: "Members",
      path: "/admin/members",
      icon: <Users size={20} />,
    },
    {
      name: "Store",
      path: "/admin/store",
      icon: <Store size={20} />,
    },
    {
      name: "Store Approval",
      path: "/admin/store-approval",
      icon: <UserCheck size={20} />,
    },
    {
      name: "Orders",
      path: "/admin/orders",
      icon: <ShoppingCart size={20} />,
    },
    {
      name: "Pre Orders",
      path: "/admin/pre-orders",
      icon: <ShoppingCart size={20} />,
    },
    {
      name: "Work Orders",
      path: "/admin/work-orders",
      icon: <ClipboardList size={20} />,
    },
    {
      name: "Vendors",
      path: "/vendors",
      icon: <User2Icon size={20} />,
    },
    {
      name: "Accounting",
      path: "/accounting",
      icon: <CreditCard size={20} />,
    },
    {
      name: "Store Cheque Payment",
      path: "/store-cheque-payment",
      icon: <CreditCard size={20} />,
    },
    {
      name: "Map",
      path: "/map",
      icon: <LocateIcon size={20} />,
    },
    {
      name: "Quality Issues",
      path: "/admin/quality-issues",
      icon: <AlertTriangle size={20} />,
    },
  ];

 const memberNavigation = [
  ...(user?.role === "member" && user?.isOrder
    ? [
        {
          name: "Orders",
          path: "/admin/orders",
          icon: <ShoppingCart size={20} />,
        },
      ]
    : []),

  ...(user?.role === "member" && user?.isProduct
    ? [
        {
          name: "Products",
          path: "/admin/inventory",
          icon: <Package size={20} />,
        },
      ]
    : []),
];


  const storeNavigation = [
    {
      name: "Products",
      path: "/store/products",
      icon: <Package size={20} />,
    },
    {
      name: "My Orders",
      path: "/store/orders",
      icon: <ShoppingCart size={20} />,
    },
    {
      name: "Settings",
      path: "/store/settings",
      icon: <Settings size={20} />,
    },
  ];

  const getNavigationForRole = () => {
    switch (userRole) {
      case "admin":
        return adminNavigation;
      case "member":
        return memberNavigation;
      case "store":
        return storeNavigation;
      default:
        return memberNavigation;
    }
  };

  const navigationPaths = getNavigationForRole();

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 border-r border-slate-700/50 transition-all duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-[72px]" : "w-[280px]"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex h-16 items-center border-b border-slate-700/50 transition-all duration-300",
          !collapsed ? "px-5 justify-between" : "px-0 justify-center"
        )}>
          <Link
            to="/"
            className="flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <span className="font-bold text-white text-lg">V</span>
            </div>
            <span
              className={cn(
                "font-bold text-xl tracking-tight text-white transition-all duration-300",
                collapsed && "hidden"
              )}
            >
              Vali
            </span>
          </Link>
          
          {/* Toggle button - Desktop */}
          <button
            onClick={toggleCollapsed}
            className={cn(
              "hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all duration-200 border border-slate-700/50",
              collapsed && "absolute -right-3 top-6 shadow-lg"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>

          {/* Close button - Mobile */}
          <button
            onClick={onClose}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 custom-scrollbar">
          <nav className="flex flex-col gap-1">
            {navigationPaths.map((route) => {
              const isActive = location.pathname === route.path;
              return (
                <Link
                  key={route.path}
                  to={route.path}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                    isActive
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
                    collapsed && "justify-center px-0"
                  )}
                  onClick={onClose}
                  title={collapsed ? route.name : undefined}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
                  )}
                  
                  <span className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                  )}>
                    {route.icon}
                  </span>
                  
                  <span
                    className={cn(
                      "truncate font-medium text-sm transition-all duration-300",
                      collapsed && "hidden"
                    )}
                  >
                    {route.name}
                  </span>

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg border border-slate-700">
                      {route.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Pro Version section - only for non-admin */}
        {/* {userRole !== "admin" && !collapsed && (
          <div className="p-4 border-t border-slate-700/50">
            <Link to="/store" className="block">
              <div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-200 group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Zap size={16} className="text-white" />
                  </div>
                  <span className="font-semibold text-white">Pro Version</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Upgrade to access advanced AI features and analytics.
                </p>
                <div className="text-xs font-medium text-blue-400 flex items-center group-hover:text-blue-300 transition-colors">
                  Learn More 
                  <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        )} */}

        {/* Collapsed Pro indicator */}
        {userRole !== "admin" && collapsed && (
          <div className="p-3 border-t border-slate-700/50">
            <Link 
              to="/store" 
              className="flex justify-center group"
              title="Pro Version"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-shadow">
                <Zap size={18} className="text-white" />
              </div>
            </Link>
          </div>
        )}

        {/* Logout Button */}
        <div className={cn(
          "border-t border-slate-700/50 p-3",
          collapsed ? "px-3" : "px-4"
        )}>
          <button
            onClick={handleLogout}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 w-full transition-all duration-200 text-slate-400 hover:bg-red-500/10 hover:text-red-400",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <span className="flex-shrink-0 text-slate-500 group-hover:text-red-400 transition-colors">
              <LogOut size={20} />
            </span>
            <span
              className={cn(
                "truncate font-medium text-sm transition-all duration-300",
                collapsed && "hidden"
              )}
            >
              Logout
            </span>

            {/* Tooltip for collapsed state */}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg border border-slate-700">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Spacer for main content */}
      <div
        className={cn(
          "hidden md:block flex-shrink-0 transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[280px]"
        )}
      />

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(51 65 85 / 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgb(71 85 105 / 0.7);
        }
      `}</style>
    </>
  );
};

export default Sidebar;
