
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import StoreHeader from '@/components/store/StoreHeader';
import StoreHero from '@/components/store/StoreHero';
import ProductGrid from '@/components/store/ProductGrid';
import StoreFeatures from '@/components/store/StoreFeatures';
import StoreNewsletter from '@/components/store/StoreNewsletter';
import StoreFooter from '@/components/store/StoreFooter';
import PreviewControls from '@/components/PreviewControls';
import EditStoreForm from '@/components/EditStoreForm';
import { useToast } from '@/components/ui/use-toast';

const StorePreview = () => {
  const { storeId } = useParams();
  const [searchParams] = useSearchParams();
  const { getStoreById, setCurrentStore } = useStore();
  const { toast } = useToast();
  
  const [store, setStore] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadStore = () => {
      setIsLoading(true);
      const storeData = getStoreById(storeId);
      
      if (storeData) {
        setStore(storeData);
        setCurrentStore(storeData);
        
        // Check if edit mode is requested via URL
        if (searchParams.get('edit') === 'true') {
          setIsEditOpen(true);
        }
      } else {
        toast({
          title: 'Store Not Found',
          description: 'The requested store could not be found.',
          variant: 'destructive',
        });
      }
      
      setIsLoading(false);
    };
    
    loadStore();
  }, [storeId, getStoreById, setCurrentStore, searchParams, toast]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading store preview...</p>
        </div>
      </div>
    );
  }
  
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-background rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Store Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The store you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <StoreHeader store={store} />
      <StoreHero store={store} />
      <ProductGrid store={store} />
      <StoreFeatures store={store} />
      <StoreNewsletter store={store} />
      <StoreFooter store={store} />
      
      <PreviewControls 
        store={store} 
        onEdit={() => setIsEditOpen(true)} 
      />
      
      <EditStoreForm 
        store={store} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />
    </div>
  );
};

export default StorePreview;
