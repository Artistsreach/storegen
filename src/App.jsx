
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Dashboard from '@/pages/Dashboard';
import StorePreview from '@/pages/StorePreview';
import ProductDetail from '@/pages/ProductDetail';
import CheckoutPage from '@/pages/CheckoutPage';
import { StoreProvider } from '@/contexts/StoreContext';

const App = () => {
  return (
    <StoreProvider>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-slate-900">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/preview/:storeId" element={<StorePreview />} />
          <Route path="/store/:storeId/product/:productId" element={<ProductDetail />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
        <Toaster />
      </main>
    </StoreProvider>
  );
};

export default App;
