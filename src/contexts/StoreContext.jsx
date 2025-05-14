
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { 
  generateStoreFromWizardData,
  generateStoreFromPromptData,
  importShopifyStoreData,
  generateAIProductsData,
} from '@/contexts/storeActions';
import { fetchPexelsImages, generateId } from '@/lib/utils';


const StoreContext = createContext(null);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

const CART_STORAGE_KEY = 'ecommerce-cart';

export const StoreProvider = ({ children }) => {
  const [stores, setStores] = useState([]);
  const [currentStore, setCurrentStore] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadStores = useCallback(async (userId) => {
    if (!userId) {
      setIsLoadingStores(false);
      setStores([]); // Clear stores if no user
      return;
    }
    setIsLoadingStores(true);
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading stores:', error);
      toast({ title: 'Error', description: 'Failed to load your stores from the cloud.', variant: 'destructive' });
      // Load from localStorage as a fallback if cloud fails after initial load attempt
      const savedStores = localStorage.getItem('ecommerce-stores');
      if (savedStores) {
        try {
          setStores(JSON.parse(savedStores));
        } catch (e) { console.error('Failed to parse localStorage stores:', e); }
      }
    } else {
      setStores(data || []);
      localStorage.setItem('ecommerce-stores', JSON.stringify(data || [])); // Sync LS with cloud
    }
    setIsLoadingStores(false);
  }, [toast]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        loadStores(session.user.id);
      } else {
        setIsLoadingStores(false); // No user, no stores to load from cloud
        // Optionally load from local storage if you want to support offline mode for anonymous users
         const savedStores = localStorage.getItem('ecommerce-stores');
         if (savedStores) {
            try { setStores(JSON.parse(savedStores)); } catch (e) { console.error(e); }
         }
      }
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadStores(currentUser.id);
      } else {
        setStores([]); // Clear stores on logout
        localStorage.removeItem('ecommerce-stores');
        setIsLoadingStores(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [loadStores]);


  useEffect(() => {
    // Persist cart to localStorage
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    // Load cart from localStorage on initial mount
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to parse stored cart:', error);
      }
    }
  }, []);

  const commonStoreCreation = async (storeData) => {
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to create a store.', variant: 'destructive'});
      return null;
    }
    const storeWithUserId = { ...storeData, user_id: user.id };
    
    const { data: newStore, error } = await supabase
      .from('stores')
      .insert(storeWithUserId)
      .select()
      .single();

    if (error) {
      console.error('Error creating store in Supabase:', error);
      toast({ title: 'Store Creation Failed', description: error.message, variant: 'destructive' });
      return null;
    }
    
    setStores(prevStores => [newStore, ...prevStores]);
    setCurrentStore(newStore);
    localStorage.setItem('ecommerce-stores', JSON.stringify([newStore, ...stores])); // Update LS
    toast({ title: 'Store Created!', description: `Store "${newStore.name}" has been created.` });
    navigate(`/preview/${newStore.id}`);
    return newStore;
  };
  
  const generateStoreFromWizard = async (wizardData) => {
    setIsGenerating(true);
    try {
      const newStoreData = await generateStoreFromWizardData(wizardData, { fetchPexelsImages, generateId });
      return await commonStoreCreation(newStoreData);
    } catch (error) {
      console.error('Error generating store from wizard:', error);
      toast({ title: 'Wizard Generation Failed', description: error.message || 'Failed to generate store.', variant: 'destructive' });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateStore = async (prompt, storeNameOverride = null, productTypeOverride = null) => {
    setIsGenerating(true);
    try {
      const newStoreData = await generateStoreFromPromptData(prompt, { storeNameOverride, productTypeOverride, fetchPexelsImages, generateId });
      return await commonStoreCreation(newStoreData);
    } catch (error) {
      console.error('Error generating store from prompt:', error);
      toast({ title: 'Generation Failed', description: error.message || 'Failed to generate store.', variant: 'destructive' });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const importShopifyStore = async (domain, token) => {
    setIsGenerating(true);
    try {
      const newStoreData = await importShopifyStoreData(domain, token, { fetchPexelsImages, generateId });
       return await commonStoreCreation(newStoreData);
    } catch (error) {
      console.error('Error importing Shopify store:', error);
      toast({ title: 'Import Failed', description: error.message || 'Failed to import Shopify store.', variant: 'destructive' });
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const getStoreById = (id) => stores.find(store => store.id === id) || null;
  
  const getProductById = (storeId, productId) => {
    const store = getStoreById(storeId);
    return store?.products.find(p => p.id === productId) || null;
  };

  const updateStore = async (storeId, updates) => {
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to update a store.', variant: 'destructive'});
      return;
    }
    const { data: updatedStore, error } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', storeId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating store in Supabase:', error);
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
      return;
    }

    setStores(prevStores => 
      prevStores.map(store => 
        store.id === storeId ? updatedStore : store
      )
    );
    if (currentStore && currentStore.id === storeId) {
      setCurrentStore(updatedStore);
    }
    localStorage.setItem('ecommerce-stores', JSON.stringify(stores.map(s => s.id === storeId ? updatedStore : s)));
    toast({ title: 'Store Updated', description: 'Your store has been updated.' });
  };
  
  const updateProductImage = async (storeId, productId, newImage) => {
    const storeToUpdate = stores.find(s => s.id === storeId);
    if (!storeToUpdate) return;

    const updatedProducts = storeToUpdate.products.map(p =>
      p.id === productId ? { ...p, image: newImage } : p
    );
    await updateStore(storeId, { products: updatedProducts });
    toast({ title: 'Product Image Updated', description: 'The product image has been changed.' });
  };

  const deleteStore = async (storeId) => {
     if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to delete a store.', variant: 'destructive'});
      return;
    }
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting store from Supabase:', error);
      toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
      return;
    }

    setStores(prevStores => prevStores.filter(store => store.id !== storeId));
    if (currentStore && currentStore.id === storeId) setCurrentStore(null);
    localStorage.setItem('ecommerce-stores', JSON.stringify(stores.filter(s => s.id !== storeId)));
    toast({ title: 'Store Deleted', description: 'Your store has been deleted.' });
  };

  const addToCart = (product, storeId) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id && item.storeId === storeId);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id && item.storeId === storeId 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }
      return [...prevCart, { ...product, quantity: 1, storeId }];
    });
    toast({ title: 'Added to Cart', description: `${product.name} has been added to your cart.` });
  };

  const removeFromCart = (productId, storeId) => {
    setCart(prevCart => prevCart.filter(item => !(item.id === productId && item.storeId === storeId)));
    toast({ title: 'Removed from Cart', description: `Item removed from your cart.`, variant: 'destructive' });
  };

  const updateQuantity = (productId, storeId, quantity) => {
    if (quantity < 1) {
      removeFromCart(productId, storeId);
      return;
    }
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === productId && item.storeId === storeId 
        ? { ...item, quantity } 
        : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    toast({ title: 'Cart Cleared', description: 'Your shopping cart is now empty.' });
  };

  const value = { 
    stores, currentStore, isGenerating, isLoadingStores, cart, user,
    generateStore, importShopifyStore, getStoreById, updateStore, deleteStore, setCurrentStore,
    getProductById, updateProductImage, generateStoreFromWizard,
    addToCart, removeFromCart, updateQuantity, clearCart,
    generateAIProducts: generateAIProductsData, // Expose the refactored function
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};
