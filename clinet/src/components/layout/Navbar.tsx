import React from "react";
import { useNavigate } from "react-router-dom";
import { Menu, User, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { logout } from "@/services2/operations/auth";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useCart } from "../store/CartContext";
import NotificationDropdown from "../notifications/NotificationDropdown";
interface NavbarProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  isStoreFront?: boolean;
  showCart?: boolean;
  setIsCartOpen? : (con:boolean) => void,
}

const Navbar: React.FC<NavbarProps> = ({
  toggleSidebar,
  isSidebarOpen,
  isStoreFront = false,
  showCart = false,
  setIsCartOpen
  
}) => {
  const navigate = useNavigate();
  const disptach = useDispatch();
  const isMobile = useIsMobile();
  const user = useSelector((state: RootState) => state.auth?.user ?? null);
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-30 bg-background border-b">
      <div className="flex h-16 items-center px-4 md:px-6">
        {!isStoreFront && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 md:hidden"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        )}

        <div className="flex items-center gap-2">
          {isStoreFront ? (
            <Link to="/" className="flex items-center">
              <ShoppingCart className="h-6 w-6 text-primary mr-2" />
              <span className="font-bold text-xl hidden xs:inline-block">
                FreshMart
              </span>
            </Link>
          ) : (
            <Link to="/" className="font-semibold text-lg flex items-center">
              {showCart ? user.storeName || user.name : isMobile ? "FM" : ""}
            </Link>
          )}
        </div>

        <div className="relative ml-auto flex items-center gap-4">
          {showCart ? (

<div className="relative flex items-center">
<Button 
  onClick={() => setIsCartOpen(true)}
  variant="outline"
  className="relative"
>
  <div className="relative">
    <ShoppingCart className="h-6 w-6" />
    {totalItems > 0 && (
      <span className="absolute -top-4 -right-5 bg-red-600 text-white text-[10px] font-bold w-3 h-3 flex items-center justify-center rounded-full">
        {totalItems}
      </span>
    )}
  </div>
</Button>
</div>

          ) : !isStoreFront ? (
            // <Link to="/store">
            //   <Button variant="outline" size="sm" className="hidden md:flex">
            //     <ShoppingCart className="h-4 w-4 mr-2" />
            //     View Store
            //   </Button>
            // </Link>
            <div></div>
          ) : (
            <Link to="/inventory">
              <Button variant="outline" size="sm" className="hidden md:flex">
                Admin Dashboard
              </Button>
            </Link>
          )}

          {!showCart && <NotificationDropdown />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full"
              >
                <Avatar className="h-8 w-8 bg-black ">
                  <AvatarFallback>
                    {user?.email 
                      ? user.email.split('@')[0].slice(0, 2).toUpperCase()
                      : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>

            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user?.email && (
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user.email.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => disptach(logout(navigate))}>
                <div className="cursor-pointer">
                  Logout
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
