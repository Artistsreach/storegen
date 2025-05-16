import React from 'react';
import Header from '@/components/Header'; // Assuming a common Header
import { useAuth } from '@/contexts/AuthContext'; // To get user info if needed

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <p className="mb-4">Welcome, {user?.email || 'Admin'}!</p>
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Admin-Specific Content</h2>
          <p>This area is restricted to administrators. Here you can manage users, view all stores, access Stripe data, etc.</p>
          {/* Placeholder for admin functionalities */}
          <div className="mt-4 p-4 border border-dashed rounded">
            Admin tools and data will be displayed here.
          </div>
        </div>
      </main>
      <footer className="mt-auto py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} StoreGen AI - Admin Panel</p>
      </footer>
    </div>
  );
};

export default AdminDashboard;
