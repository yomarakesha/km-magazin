import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./styles.css";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./Layout";
import { Spinner, ToastProvider } from "./ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Products from "./pages/Products";
import ProductEdit from "./pages/ProductEdit";
import Categories from "./pages/Categories";
import CategoryEdit from "./pages/CategoryEdit";
import Brands from "./pages/Brands";
import Reviews from "./pages/Reviews";
import Promos from "./pages/Promos";
import Leads from "./pages/Leads";
import SettingsPage from "./pages/Settings";
import Pos from "./pages/Pos";
import Sales from "./pages/Sales";
import Receipt from "./pages/Receipt";
import Stock from "./pages/Stock";
import Movements from "./pages/Movements";
import Purchases from "./pages/Purchases";
import Suppliers from "./pages/Suppliers";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Services from "./pages/Services";
import Banners from "./pages/Banners";
import SitePages, { SitePageEdit } from "./pages/SitePages";

function Gate() {
  const { me, ready } = useAuth();
  if (!ready) return <Spinner />;
  if (!me) return <Login />;
  return (
    <Routes>
      <Route path="/pos/receipt/:id" element={<Receipt />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="pos" element={<Pos />} />
        <Route path="sales" element={<Sales />} />
        <Route path="leads" element={<Leads />} />
        <Route path="promos" element={<Promos />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductEdit />} />
        <Route path="products/:id" element={<ProductEdit />} />
        <Route path="categories" element={<Categories />} />
        <Route path="categories/new" element={<CategoryEdit />} />
        <Route path="categories/:id" element={<CategoryEdit />} />
        <Route path="brands" element={<Brands />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="stock" element={<Stock />} />
        <Route path="movements" element={<Movements />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="reports" element={<Reports />} />
        <Route path="services" element={<Services />} />
        <Route path="banners" element={<Banners />} />
        <Route path="pages" element={<SitePages />} />
        <Route path="pages/new" element={<SitePageEdit />} />
        <Route path="pages/:id" element={<SitePageEdit />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="users" element={<Users />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
