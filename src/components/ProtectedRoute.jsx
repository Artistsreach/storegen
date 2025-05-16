import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, userRole, loadingRole } = useAuth();

  if (loadingRole) {
    // You might want to show a global loading spinner here
    // or handle it in App.jsx so this component isn't even rendered yet.
    // For simplicity, returning null or a minimal loader.
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // If allowedRoles is provided and the user's role is not in the list
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect to a general access page or a "not authorized" page
    // For now, redirecting to home, which will then decide based on role.
    // Or, you could have a specific /unauthorized route.
    return <Navigate to="/" replace />; 
  }

  return <Outlet />; // Render child routes/component if authenticated and authorized
};

export default ProtectedRoute;
