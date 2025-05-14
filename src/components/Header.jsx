
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingBag, Sparkles } from 'lucide-react';

const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full py-4 px-6 flex justify-between items-center"
    >
      <Link to="/" className="flex items-center gap-2">
        <div className="bg-primary rounded-full p-1.5">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-xl">StoreGen</span>
      </Link>
      
      <div className="flex items-center gap-2">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI-Powered</span>
        </motion.div>
      </div>
    </motion.header>
  );
};

export default Header;
