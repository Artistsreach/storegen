
import React, { useState } from 'react'; // Keep this one as it includes useState
import { motion } from 'framer-motion'; // Keep one motion import
import { Link, useNavigate } from 'react-router-dom'; // Keep one set of router imports
import { ShoppingBag, Sparkles, LogIn, LogOut, UserCircle, CreditCard, Settings } from 'lucide-react'; // Added CreditCard, Settings
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient'; // Direct import for signOut
import SubscribeButton from '@/components/SubscribeButton'; // Added SubscribeButton

const Header = () => {
  const { isAuthenticated, user, session, subscriptionStatus, loadingProfile } = useAuth();
  const navigate = useNavigate();
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(null);

  const isSubscribed = subscriptionStatus === 'active';

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      navigate('/auth'); // Redirect to auth page after logout
    }
  };

  const handleManageBilling = async () => {
    if (!session?.access_token) {
      setPortalError('Authentication token not found. Please log in again.');
      // Or redirect to login, or show a toast
      return;
    }
    setIsPortalLoading(true);
    setPortalError(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session.');
      }
      window.location.href = data.url; // Redirect to Stripe Customer Portal
    } catch (err) {
      console.error('Portal session error:', err);
      setPortalError(err.message);
      // Optionally show a toast with err.message
    } finally {
      setIsPortalLoading(false);
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full py-4 px-6 flex justify-between items-center sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b"
    >
      <Link to="/" className="flex items-center gap-2">
        <div className="bg-primary rounded-full p-1.5">
          <ShoppingBag className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-xl">StoreGen</span>
      </Link>
      
      <div className="flex items-center gap-3">
        {/* "AI-Powered" button removed */}

        {portalError && <p className="text-xs text-red-500">{portalError}</p> /* Display portal error if any */}

        {isAuthenticated && !loadingProfile && (
          isSubscribed ? (
            <Button variant="outline" size="sm" onClick={handleManageBilling} disabled={isPortalLoading} className="rounded-full px-3 py-1.5 text-sm font-medium">
              <Settings className="mr-2 h-4 w-4" /> {isPortalLoading ? 'Loading...' : 'Manage Billing'}
            </Button>
          ) : (
            <SubscribeButton 
              className="px-3 py-1.5 rounded-full text-sm font-medium" 
              showIcon={true} 
            />
          )
        )}

        {isAuthenticated ? (
          <>
            {user?.user_metadata?.avatar_url && (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="User avatar" 
                className="h-6 w-6 rounded-full" 
              />
            )}
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </>
        ) : (
          <Link to="/auth">
            <Button variant="outline" size="sm">
              <LogIn className="mr-2 h-4 w-4" /> Login
            </Button>
          </Link>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
