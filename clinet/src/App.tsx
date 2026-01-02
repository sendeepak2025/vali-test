import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import ShopPage from "./pages/ShopPage";
import NotFound from "./pages/NotFound";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Inventory from "./pages/Inventory";
import InventoryEnhanced from "./pages/InventoryEnhanced";
import Orders from "./pages/Orders";
import PriceListEnhanced from "./pages/PriceListEnhanced";
import NewOrder from "./pages/NewOrder";
import NewOrderEnhanced from "./pages/NewOrderEnhanced";
import EditOrder from "./pages/EditOrder";
import Analytics from "./pages/Analytics";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Insights from "./pages/Insights";
import Payments from "./pages/Payments";
import NewPayment from "./pages/NewPayment";
import CRM from "./pages/CRM";
import UserGuide from "./pages/UserGuide";
import WebsiteGenerator from "./pages/WebsiteGenerator";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import StoreDashboard from "./pages/StoreDashboard";
import StoreDashboardEnhanced from "./pages/StoreDashboardEnhanced";
import StoreUsers from "./pages/StoreUsers";
import StorePortal from "./pages/StorePortal";
import Store from "./pages/Store";
import StoreFront from "./pages/StoreFront";
import Member from "./components/admin/Member";
import MemberManagement from "./pages/MemberManagement";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStorets from "./pages/AdminStorets";
import AdminStoresEnhanced from "./pages/AdminStoresEnhanced";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./redux/store";

import PrivateRoute from "@/components/auth/PrivateRoute";
import OpenRoute from "@/components/auth/OpenRoute";
import CreateOrderModalStore from "./pages/StoreMakeORderTemplate";
import StoreOrderMobile from "./pages/StoreOrderMobile";
import StoreRegistration from "./pages/StoreRegistration";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import AdminApprovalDashboard from "./pages/AdminApprovalDashboard";
import NotificationCenter from "./pages/NotificationCenter";
import GroupPricing from "./pages/GroupPricing";
import SettingsPage from "./components/settings/Settings";
import { fetchMyProfile } from "@/services2/operations/auth";
import Vendors from "./pages/Vendors";
import VendorsEnhanced from "./pages/VendorsEnhanced";
import VendorsSimplified from "./pages/VendorsSimplified";
import NewVendor from "./pages/NewVendor";
import NewPurchase from "./pages/NewPurchase";
import VendorQualityControl from "./pages/VendorQualityControl";
import VendorInvoiceUpload from "./pages/VendorInvoiceUpload";
import VendorPayment from "./pages/VendorPayment";
import EditPurchaseOrder from "./pages/EditPurchaseOrder";
import ViewPurchaseOrder from "./pages/ViewPurchase";
import Map from "./components/admin/Map";
import MapEnhanced from "./pages/MapEnhanced";
import MapGoogle from "./pages/MapGoogle";
import MapOpenRoute from "./pages/MapOpenRoute";
import Accounting from "./pages/Accounting";
import AccountingEnhanced from "./pages/AccountingEnhanced";
import StoreChequePayment from "./pages/StoreChequePayment";
import StoreChequePaymentEnhanced from "./pages/StoreChequePaymentEnhanced";
import PreOrder from "./pages/PreOrder";
import UpdatePreOrder from "./pages/UpdatePreOrder";
import OrderToPOWorkflow from "./pages/OrderToPOWorkflow";
import UpdatePreOrderByStore from "./pages/UpdatePreOrderByStore";
import TermsAndConditions from "./pages/TermsAndConditions";
import StoreLegalDocuments from "./pages/StoreLegalDocuments";
import QualityIssues from "./pages/QualityIssues";
import StoreAccount from "./pages/StoreAccount";
import WorkOrders from "./pages/WorkOrders";

export default function App() {
  const [loading, setLoading] = useState(true);
  const authData = useSelector((state: RootState) => state.auth);
  const isAuthenticated = authData?.token ? true : false;
  const dispatch = useDispatch();

  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(loadingTimeout);
  }, []);

  useEffect(() => {
    if (authData?.token) {
      dispatch(fetchMyProfile(authData?.token));
    }
  }, []);
  const isAdmin = isAuthenticated && authData?.user?.role === "admin";
  const isMember = isAuthenticated && authData?.user?.role === "member";
  const isStore = isAuthenticated && authData?.user?.role === "store";

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Open Routes */}
        <Route
          path="/"
          element={
            <OpenRoute>
              <LandingPage />
            </OpenRoute>
          }
        />
        <Route
          path="/auth"
          element={
            <OpenRoute>
              <Auth />
            </OpenRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
              <ResetPassword />
          }
        />
        <Route
          path="/about"
          element={
            <OpenRoute>
              <AboutPage />
            </OpenRoute>
          }
        />
        <Route
          path="/contact"
          element={
            <OpenRoute>
              <ContactPage />
            </OpenRoute>
          }
        />
        <Route
          path="/shop"
          element={
            <OpenRoute>
              <ShopPage />
            </OpenRoute>
          }
        />
        <Route
          path="/store-registration"
          element={
            <OpenRoute>
              <StoreRegistration />
            </OpenRoute>
          }
        />
        {/* Terms and Conditions - Public Route */}
        <Route
          path="/terms-and-conditions"
          element={<TermsAndConditions />}
        />
        {/* Pending Approval Page for stores awaiting approval */}
        <Route
          path="/pending-approval"
          element={
            <PrivateRoute>
              <PendingApprovalPage />
            </PrivateRoute>
          }
        />
        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute isAdmin={isAdmin}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/store"
          element={
            <PrivateRoute isAdmin={isAdmin}>
              <AdminStoresEnhanced />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/store-old"
          element={
            <PrivateRoute isAdmin={isAdmin}>
              <AdminStorets />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/store-approval"
          element={
            <PrivateRoute isAdmin={isAdmin}>
              <AdminApprovalDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/store/:storeId/legal"
          element={
            <PrivateRoute isAdmin={isAdmin}>
              <StoreLegalDocuments />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/quality-issues"
          element={
            <PrivateRoute isAdmin={isAdmin}>
              <QualityIssues />
            </PrivateRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <NotificationCenter />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/members"
          element={
            <PrivateRoute isAdmin={isAdmin}>
              <MemberManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/members-old"
          element={
            <PrivateRoute isAdmin={isAdmin}>
              <Member />
            </PrivateRoute>
          }
        />
        {/* Store Routes */}
        <Route
          path="/store/dashboard"
          element={
            <PrivateRoute isStore={isStore}>
              <StoreDashboardEnhanced />
            </PrivateRoute>
          }
        />
        <Route
          path="/store/dashboard-old"
          element={
            <PrivateRoute isStore={isStore}>
              <StoreDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/store/orders"
          element={
            <PrivateRoute>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route
          path="/store/template"
          element={
            // <PrivateRoute isStore={isStore}>
            <CreateOrderModalStore />
            // </PrivateRoute>
          }
        />
        <Route
          path="/store/nextweek"
          element={
            // <PrivateRoute isStore={isStore}>
            <CreateOrderModalStore />
            // </PrivateRoute>
          }
        />
        <Route
          path="/store/mobile"
          element={
            <StoreOrderMobile />
          }
        />
        <Route
          path="/store/mobile/nextweek"
          element={
            <StoreOrderMobile />
          }
        />
        <Route
          path="/store/users"
          element={
            <PrivateRoute isStore={isStore}>
              <StoreUsers />
            </PrivateRoute>
          }
        />
         <Route
          path="/store/pre-order/:id"
          element={
            <PrivateRoute>
              <UpdatePreOrderByStore />
            </PrivateRoute>
          }
        />
        <Route
          path="/storeportal"
          element={
            <PrivateRoute>
              <StorePortal />
            </PrivateRoute>
          }
        />
        <Route
          path="/store/products"
          element={
            <PrivateRoute isMember={isStore}>
              <StoreFront />
            </PrivateRoute>
          }
        />
        <Route
          path="/store/settings"
          element={
            <PrivateRoute isMember={isStore}>
              <SettingsPage />
            </PrivateRoute>
          }
        />

        <Route path="/store" element={<Store />} />
        {/* Member Routes */}
        <Route
          path="/member/dashboard"
          element={
            <PrivateRoute isMember={isMember}>
              <Index />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Index />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <PrivateRoute>
              <Clients />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <PrivateRoute>
              <ClientProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <PrivateRoute>
              <InventoryEnhanced />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <PrivateRoute>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/pre-orders"
          element={
            <PrivateRoute>
              <PreOrder />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/pre-order/:id"
          element={
            <PrivateRoute>
              <UpdatePreOrder />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/work-orders"
          element={
            <PrivateRoute>
              <WorkOrders />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/pricing"
          element={
            <PrivateRoute>
              <GroupPricing />
            </PrivateRoute>
          }
        />
        <Route
          path="/price-list"
          element={
            <PrivateRoute>
              <PriceListEnhanced />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders/new"
          element={
            <PrivateRoute>
              <NewOrderEnhanced />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders/new/:id"
          element={
            <PrivateRoute>
              <NewOrderEnhanced />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders/new-old"
          element={
            <PrivateRoute>
              <NewOrder />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders/edit/:orderId"
          element={
            <PrivateRoute>
              <EditOrder />
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <Analytics />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/team"
          element={
            <PrivateRoute>
              <Team />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <PrivateRoute>
              <Insights />
            </PrivateRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <PrivateRoute>
              <Payments />
            </PrivateRoute>
          }
        />
        <Route
          path="/payments/new"
          element={
            <PrivateRoute>
              <NewPayment />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/crm"
          element={
            <PrivateRoute>
              <CRM />
            </PrivateRoute>
          }
        />
        <Route
          path="/guide"
          element={
            <PrivateRoute>
              <UserGuide />
            </PrivateRoute>
          }
        />
        <Route
          path="/website"
          element={
            <PrivateRoute>
              <WebsiteGenerator />
            </PrivateRoute>
          }
        />
        <Route
          path="/accounting"
          element={
            <PrivateRoute>
              <AccountingEnhanced />
            </PrivateRoute>
          }
        />
        <Route
          path="/accounting-old"
          element={
            <PrivateRoute>
              <Accounting />
            </PrivateRoute>
          }
        />

        {/* Vendors */}
        <Route
          path="/vendors"
          element={
            <PrivateRoute>
              <VendorsSimplified />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors-enhanced"
          element={
            <PrivateRoute>
              <VendorsEnhanced />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors-old"
          element={
            <PrivateRoute>
              <Vendors />
            </PrivateRoute>
          }
        />
        <Route
          path="/map"
          element={
            <PrivateRoute>
              <MapEnhanced />
            </PrivateRoute>
          }
        />
        <Route
          path="/map-old"
          element={
            <PrivateRoute>
              <Map />
            </PrivateRoute>
          }
        />
        <Route
          path="/map-google"
          element={
            <PrivateRoute>
              <MapGoogle />
            </PrivateRoute>
          }
        />
        <Route
          path="/map-openroute"
          element={
            <PrivateRoute>
              <MapOpenRoute />
            </PrivateRoute>
          }
        />
        <Route
          path="/store-cheque-payment"
          element={
            <PrivateRoute>
              <StoreChequePaymentEnhanced />
            </PrivateRoute>
          }
        />
        <Route
          path="/store-cheque-payment-old"
          element={
            <PrivateRoute>
              <StoreChequePayment />
            </PrivateRoute>
          }
        />
        <Route
          path="/store-account"
          element={
            <PrivateRoute>
              <StoreAccount />
            </PrivateRoute>
          }
        />

        <Route
          path="/vendors/new-vendor"
          element={
            <PrivateRoute>
              <NewVendor />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors/edit/:id"
          element={
            <PrivateRoute>
              <NewVendor />
            </PrivateRoute>
          }
        />

        <Route
          path="/vendors/new-purchase"
          element={
            <PrivateRoute>
              <NewPurchase />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/order-to-po"
          element={
            <PrivateRoute>
              <OrderToPOWorkflow />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors/edit-purchase/:id"
          element={
            <PrivateRoute>
              <EditPurchaseOrder />
            </PrivateRoute>
          }
        />
        <Route
          path="/vendors/purchase/:id"
          element={
            <PrivateRoute>
              <ViewPurchaseOrder />
            </PrivateRoute>
          }
        />

        <Route
          path="/vendors/quality-control/:id"
          element={
            <PrivateRoute>
              <VendorQualityControl />
            </PrivateRoute>
          }
        />

        <Route
          path="/vendors/invoice/:id"
          element={
            <PrivateRoute>
              <VendorInvoiceUpload />
            </PrivateRoute>
          }
        />

        <Route
          path="/vendors/payment/:id"
          element={
            <PrivateRoute>
              <VendorPayment />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
