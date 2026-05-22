import { createBrowserRouter } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import AdminLayout from "@/layouts/AdminLayout";
import Home from "@/features/home/Home";
import ProductPage from "@/features/product/ProductPage";
import PromotionsPage from "@/features/product/PromotionsPage";
import ProductDetailPage from "@/features/product/ProductDetailPage";
import CartPage from "@/layouts/components/CartPage";
import AccountPage from "@/layouts/Account";
import Login from "@/features/login/Login";
import DashboardPage from "@/layouts/Dashboard";
import UserManagementPage from "@/features/admin/UserManagement";
import ProductManagementPage from "@/features/admin/ProductManagement";
import RegisterPage from "@/features/login/RegisterPage";
import CustomerManagementPage from "@/features/admin/CustomerManagement";
import EmployeeManagementPage from "@/features/admin/EmployeeManagement";
import InventoryManagementPage from "@/features/admin/InventoryManagement";
import OrderManagementPage from "@/features/admin/OrderManagement";
import BrandManagementPage from "@/features/admin/BrandManagement";
import CategoryManagementPage from "@/features/admin/CategoryManagement";
import ColorManagementPage from "@/features/admin/ColorManagement";
import SizeManagementPage from "@/features/admin/SizeManagement";
import MaterialManagementPage from "@/features/admin/MaterialManagement";
import OriginManagementPage from "@/features/admin/OriginManagement";
import SupplierManagementPage from "@/features/admin/SupplierManagement";
import PromotionManagementPage from "@/features/admin/PromotionManagement";
import CouponManagementPage from "@/features/admin/CouponManagement";
import PosManagementPage from "@/features/admin/PosManagement";
import PosVnpayReturn from "@/features/admin/PosVnpayReturn";
import OnlineVnpayReturn from "@/layouts/components/OnlineVnpayReturn";
import ReviewManagement from "@/features/admin/ReviewManagement";

import ProfilePage from "@/layouts/components/ProfilePage";
import CheckoutPage from "@/layouts/components/CheckoutPage";
export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "products", element: <ProductPage /> },
      { path: "promotions", element: <PromotionsPage /> },
      { path: "san-pham-khuyen-mai", element: <PromotionsPage /> },
      { path: "products/:id", element: <ProductDetailPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "checkout/vnpay-return", element: <OnlineVnpayReturn /> },
    ],
  },
  { path: "/admin/login", element: <Login mode="admin" /> },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "users", element: <UserManagementPage /> },
      { path: "products", element: <ProductManagementPage /> },
      { path: "brands", element: <BrandManagementPage /> },
      { path: "categories", element: <CategoryManagementPage /> },
      {
        path: "discounts",
        children: [
          { path: "promotions", element: <PromotionManagementPage /> },
          { path: "coupons", element: <CouponManagementPage /> },
        ],
      },

      {
        path: "attributes",
        children: [
          { path: "colors", element: <ColorManagementPage /> },
          { path: "sizes", element: <SizeManagementPage /> },
          { path: "materials", element: <MaterialManagementPage /> },
        ],
      },

      { path: "origins", element: <OriginManagementPage /> },
      { path: "suppliers", element: <SupplierManagementPage /> },
      { path: "employees", element: <EmployeeManagementPage /> },
      { path: "customers", element: <CustomerManagementPage /> },
      { path: "inventory", element: <InventoryManagementPage /> },
      { path: "pos", element: <PosManagementPage /> },
      { path: "pos/vnpay-return", element: <PosVnpayReturn /> },
      { path: "orders", element: <OrderManagementPage /> },
      { path: "reviews", element: <ReviewManagement /> },

      { path: "revenue", element: <DashboardPage /> },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <RegisterPage /> },
]);
