
import React from 'react';
import { motion } from 'framer-motion';
import StoreCard from '@/components/StoreCard';
import { useStore } from '@/contexts/StoreContext';

const StoreList = () => {
  const { stores } = useStore();

  if (stores.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-6xl mx-auto mt-8"
    >
      <h2 className="text-2xl font-bold mb-4">Your Stores</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    </motion.div>
  );
};

export default StoreList;
