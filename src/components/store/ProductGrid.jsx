
import React from 'react';
import { motion } from 'framer-motion';
import ProductCard from '@/components/store/ProductCard';

const ProductGrid = ({ store, isPublishedView = false }) => {
  const { products, theme, id: storeId } = store;
  
  if (!products || products.length === 0) {
    return (
      <section id={`products-${storeId}`} className="py-12 container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Our Products</h2>
        <p className="text-muted-foreground">No products available at the moment. Check back soon!</p>
      </section>
    );
  }
  
  return (
    <section id={`products-${storeId}`} className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Featured Products</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-md md:text-lg">
            Explore our curated selection of high-quality items, handpicked for you.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {products.map((product, index) => (
            <ProductCard 
              key={product.id || `product-${index}`} 
              product={product} 
              theme={theme}
              index={index}
              storeId={storeId}
              isPublishedView={isPublishedView}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
