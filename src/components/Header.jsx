
import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Sparkles, LogIn, LogOut, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient'; // Direct import for signOut

const Header = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      navigate('/auth'); // Redirect to auth page after logout
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
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI-Powered</span>
        </motion.div>
        {isAuthenticated ? (
          <>
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
