
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // useSearchParams no longer needed for 'edit'
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

const StorePreview = () => { // This component now serves as the main StorePage
  const { storeId } = useParams();
  const { getStoreById, setCurrentStore, viewMode, isLoadingStores } = useStore(); // Get viewMode
  const { toast } = useToast();
  
  const [store, setStore] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false); // For the EditStoreForm modal
  // isLoading is now primarily driven by isLoadingStores from context
  
  useEffect(() => {
    if (isLoadingStores) return; // Wait for stores to be loaded

    const storeData = getStoreById(storeId);
    if (storeData) {
      setStore(storeData);
      setCurrentStore(storeData);
      // EditStoreForm modal can be opened by PreviewControls based on viewMode
    } else {
      toast({
        title: 'Store Not Found',
        description: `Could not find store with ID: ${storeId}`,
        variant: 'destructive',
      });
      // Potentially navigate away, e.g., to dashboard or an error page
      // navigate('/');
    }
  }, [storeId, getStoreById, setCurrentStore, toast, isLoadingStores]);
  
  if (isLoadingStores || !store) { // Updated loading condition
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading store...</p>
        </div>
      </div>
    );
  }
  
  // No separate "Store Not Found" return here, as it's covered by the loading state
  // or the toast + potential navigation in useEffect.
  
  const isPublished = viewMode === 'published';

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader store={store} isPublishedView={isPublished} />
      <StoreHero store={store} isPublishedView={isPublished} />
      <ProductGrid store={store} isPublishedView={isPublished} />
      <StoreFeatures store={store} isPublishedView={isPublished} />
      <StoreNewsletter store={store} isPublishedView={isPublished} />
      <StoreFooter store={store} isPublishedView={isPublished} />
      
      {/* PreviewControls is now always rendered, it will handle its own button visibility */}
      <PreviewControls 
        store={store} 
        onEdit={() => setIsEditOpen(true)} 
      />
      
      {/* EditStoreForm is still conditional based on isEditOpen, which is controlled by PreviewControls/viewMode */}
      {!isPublished && ( 
        <EditStoreForm 
          store={store} 
          open={isEditOpen} 
          onOpenChange={setIsEditOpen} 
        />
      )}
    </div>
  );
};

export default StorePreview; // Consider renaming file to StorePage.jsx later
