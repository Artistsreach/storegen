
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShoppingBag } from 'lucide-react';

const StoreHero = ({ store }) => {
  const { name, theme, heroImage, content, id: storeId } = store;
  
  const heroTitle = content?.heroTitle || `Welcome to ${name}`;
  const heroDescription = content?.heroDescription || `Explore ${name}, your destination for amazing products.`;
  
  const imageUrl = heroImage?.src?.large || heroImage?.url || 'https://via.placeholder.com/1200x800.png?text=Store+Image';
  const imageAlt = heroImage?.alt || heroImage?.altText || `${name} hero image`;

  const scrollToProducts = () => {
    const productsSection = document.getElementById(`products-${storeId}`);
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background to-muted/30 dark:from-slate-900 dark:to-slate-800/50">
      <div className="absolute inset-0 hero-pattern opacity-10 dark:opacity-5"></div>
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background to-transparent"
      ></div>
      
      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="space-y-6 text-center md:text-left"
          >
            <h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
              style={{ color: theme.primaryColor }}
            >
              {heroTitle}
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-lg mx-auto md:mx-0">
              {heroDescription}
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 pt-4">
              <Button 
                size="lg"
                className="rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300"
                style={{ backgroundColor: theme.primaryColor, color: 'white' }}
                onClick={scrollToProducts}
              >
                Shop Collection
                <ShoppingBag className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="rounded-full shadow-sm hover:shadow-md transition-shadow duration-300"
                style={{ 
                  borderColor: theme.primaryColor,
                  color: theme.primaryColor,
                }}
                onClick={scrollToProducts} 
              >
                Explore More
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4, type: "spring", stiffness: 100 }}
            className="relative group"
          >
            <div 
              className="absolute -inset-2 rounded-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300" 
              style={{ background: `linear-gradient(45deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor})`}}
            ></div>
            <div className="aspect-video md:aspect-[5/4] rounded-xl overflow-hidden shadow-2xl relative z-10 transform group-hover:scale-105 transition-transform duration-300">
              <img-replace
                alt={imageAlt}
                className="w-full h-full object-cover"
                src={imageUrl} />
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="absolute -bottom-8 -left-8 bg-background/80 backdrop-blur-sm rounded-lg p-4 shadow-xl hidden md:block"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {name.substring(0,1).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-foreground">{name}</p>
                  <p className="text-sm text-muted-foreground">New Arrivals Daily</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StoreHero;
