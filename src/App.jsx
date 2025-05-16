
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import StoreOwnerDashboard from '@/pages/StoreOwnerDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import StorePreview from '@/pages/StorePreview';
import ProductDetail from '@/pages/ProductDetail';
import CheckoutPage from '@/pages/CheckoutPage';
import AuthPage from '@/pages/AuthPage';
import PricingPage from '@/pages/PricingPage'; // Added PricingPage import
import OrderConfirmationPage from '@/pages/OrderConfirmationPage'; // Added OrderConfirmationPage import
import { StoreProvider } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';

const App = () => {
  const { isAuthenticated, userRole, loadingProfile } = useAuth(); // Changed loadingRole to loadingProfile

  if (loadingProfile) { // Changed loadingRole to loadingProfile
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-slate-900">
        <p className="text-xl">Loading...</p> {/* Replace with a proper spinner/loader component later */}
      </div>
    );
  }

  return (
    <StoreProvider> {/* StoreProvider might also need session/user context if stores are user-specific */}
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-slate-900">
        <Routes>
          <Route 
            path="/" 
            element={
              !isAuthenticated ? (
                <Navigate to="/auth" replace />
              ) : userRole === 'admin' ? (
                <AdminDashboard />
              ) : (
                <StoreOwnerDashboard />
              )
            } 
          />
          <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/" replace />} />
          <Route path="/pricing" element={<PricingPage />} /> {/* Added PricingPage route */}
          {/* 
            TODO: Protect these routes or adjust based on auth/role.
            For now, they remain accessible, but RLS should protect data.
          */}
          <Route path="/store/:storeId" element={<StorePreview />} /> 
          <Route path="/store/:storeId/product/:productId" element={<ProductDetail />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} /> {/* Added OrderConfirmationPage route */}
          
          {/* Fallback route for any undefined paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </main>
    </StoreProvider>
  );
};

export default App;
