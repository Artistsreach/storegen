
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { 
  generateStoreFromWizardData,
  generateStoreFromPromptData,
  // importShopifyStoreData, // Will be called by a new wizard finalization function
  mapShopifyDataToInternalStore, // Use the mapping function
  fetchShopifyStoreMetadata,
  fetchShopifyProductsList,
  fetchShopifyCollectionsList,
  fetchShopifyLocalizationInfo,
  generateAIProductsData,
  mapBigCommerceDataToInternalStore, 
} from '@/contexts/storeActions';
import { fetchPexelsImages, generateId } from '@/lib/utils';
import { generateLogoWithGemini } from '@/lib/geminiImageGeneration';
// Import BigCommerce API functions
import { fetchStoreSettings as fetchBCStoreSettings, fetchAllProducts as fetchBCAllProducts } from '@/lib/bigcommerce';


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
  const [viewMode, setViewModeState] = useState('published'); // 'published' or 'edit'
  const { toast } = useToast();
  const navigate = useNavigate();

  // Function to set view mode, could be enhanced with localStorage later
  const setViewMode = (mode) => {
    if (mode === 'published' || mode === 'edit') {
      setViewModeState(mode);
    } else {
      console.warn(`Invalid view mode: ${mode}. Defaulting to 'published'.`);
      setViewModeState('published');
    }
  };

  // Shopify Import Wizard State
  const [shopifyWizardStep, setShopifyWizardStep] = useState(0); // 0: idle, 1: connect, 2: preview meta, 3: preview items, 4: confirm
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [shopifyToken, setShopifyToken] = useState('');
  const [shopifyPreviewMetadata, setShopifyPreviewMetadata] = useState(null);
  const [shopifyPreviewProducts, setShopifyPreviewProducts] = useState({ edges: [], pageInfo: { hasNextPage: false, endCursor: null } });
  const [shopifyPreviewCollections, setShopifyPreviewCollections] = useState({ edges: [], pageInfo: { hasNextPage: false, endCursor: null } });
  const [shopifyLocalization, setShopifyLocalization] = useState(null);
  const [isFetchingShopifyPreviewData, setIsFetchingShopifyPreviewData] = useState(false);
  const [shopifyImportError, setShopifyImportError] = useState(null);
  const [generatedLogoImage, setGeneratedLogoImage] = useState(null); // Store base64 image data
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [logoGenerationError, setLogoGenerationError] = useState(null);

  // BigCommerce Import Wizard State
  const [bigCommerceWizardStep, setBigCommerceWizardStep] = useState(0);
  const [bigCommerceStoreDomain, setBigCommerceStoreDomain] = useState('');
  const [bigCommerceApiToken, setBigCommerceApiToken] = useState('');
  const [bigCommercePreviewSettings, setBigCommercePreviewSettings] = useState(null);
  const [bigCommercePreviewProducts, setBigCommercePreviewProducts] = useState({ items: [], pageInfo: { hasNextPage: false, endCursor: null } }); // items for BC
  const [isFetchingBigCommercePreviewData, setIsFetchingBigCommercePreviewData] = useState(false);
  const [bigCommerceImportError, setBigCommerceImportError] = useState(null);
  // Note: BigCommerce logo generation might be handled differently or use existing Shopify logo functions if applicable.

// Helper function to prepare store data for localStorage (strip/shorten large base64 images)
const prepareStoresForLocalStorage = (storesArray) => {
  if (!storesArray) return [];
  return storesArray.map(store => {
    const storeForLs = { ...store };

    // Simplify logo_url
    if (storeForLs.logo_url && storeForLs.logo_url.startsWith('data:image/') && storeForLs.logo_url.length > 2048) {
      storeForLs.logo_url = `${storeForLs.logo_url.substring(0, 30)}...[truncated]`;
    }

    // Simplify hero_image
    if (storeForLs.hero_image && storeForLs.hero_image.src) {
      const newHeroImageSrc = { ...storeForLs.hero_image.src };
      if (newHeroImageSrc.large && newHeroImageSrc.large.startsWith('data:image/') && newHeroImageSrc.large.length > 2048) {
        newHeroImageSrc.large = `${newHeroImageSrc.large.substring(0, 30)}...[truncated]`;
      }
      if (newHeroImageSrc.medium && newHeroImageSrc.medium.startsWith('data:image/') && newHeroImageSrc.medium.length > 2048) {
        newHeroImageSrc.medium = `${newHeroImageSrc.medium.substring(0, 30)}...[truncated]`;
      }
      storeForLs.hero_image = { ...storeForLs.hero_image, src: newHeroImageSrc };
    }

    // Simplify product images
    if (storeForLs.products && Array.isArray(storeForLs.products)) {
      storeForLs.products = storeForLs.products.map(product => {
        const productForLs = { ...product };
        if (productForLs.image && productForLs.image.src) {
          const newProductImageSrc = { ...productForLs.image.src };
          if (newProductImageSrc.medium && newProductImageSrc.medium.startsWith('data:image/') && newProductImageSrc.medium.length > 2048) {
            newProductImageSrc.medium = `${newProductImageSrc.medium.substring(0, 30)}...[truncated]`;
          }
          if (newProductImageSrc.large && newProductImageSrc.large.startsWith('data:image/') && newProductImageSrc.large.length > 2048) {
            newProductImageSrc.large = `${newProductImageSrc.large.substring(0, 30)}...[truncated]`;
          }
          productForLs.image = { ...productForLs.image, src: newProductImageSrc };
        }
        return productForLs;
      });
    }
    return storeForLs;
  });
};

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
      localStorage.setItem('ecommerce-stores', JSON.stringify(prepareStoresForLocalStorage(data || []))); // Sync LS with cloud
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
        // For no user:
        const savedStores = localStorage.getItem('ecommerce-stores');
        if (savedStores) {
          try {
            const parsedStores = JSON.parse(savedStores);
            setStores(parsedStores);
          } catch (e) {
            console.error('Failed to parse localStorage stores:', e);
            setStores([]); // Ensure stores is an array even on error
          }
        } else {
          setStores([]); // No saved stores
        }
        setIsLoadingStores(false); // Set to false AFTER attempting to load/set from LS
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
    let storeToCreate = { ...storeData };
    let newStore;

    if (user) {
      storeToCreate.user_id = user.id;
      const { id: clientGeneratedId, ...dataToInsert } = storeToCreate;
      const { data, error } = await supabase
        .from('stores')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) {
        console.error('Error creating store in Supabase:', error);
        toast({ title: 'Store Creation Failed', description: error.message, variant: 'destructive' });
        return null;
      }
      newStore = data;
    } else {
      // No user, create store locally only
      newStore = { 
        ...storeToCreate, 
        id: storeToCreate.id || generateId(), 
        createdAt: new Date().toISOString() // Add createdAt for locally created stores
      }; 
      toast({ title: 'Store Created Locally', description: 'Store created locally. Log in to save to the cloud.' });
    }
    
    setStores(prevStores => [newStore, ...prevStores]);
    setCurrentStore(newStore);
    
    setStores(prevStores => {
        const newStoresList = [newStore, ...prevStores.filter(s => s.id !== newStore.id)];
        localStorage.setItem('ecommerce-stores', JSON.stringify(prepareStoresForLocalStorage(newStoresList)));
        return newStoresList;
    });
    
    toast({ title: 'Store Created!', description: `Store "${newStore.name}" has been created.` });
    navigate(`/store/${newStore.id}`); // Corrected navigation path
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

  // const importShopifyStore = async (domain, token) => { // This will be replaced by wizard functions
  //   setIsGenerating(true);
  //   try {
  //     // Old direct import logic - to be removed or adapted for final step of wizard
  //     // const newStoreData = await importShopifyStoreData(domain, token, { fetchPexelsImages, generateId });
  //     // return await commonStoreCreation(newStoreData);
  //   } catch (error) {
  //     console.error('Error importing Shopify store:', error);
  //     toast({ title: 'Import Failed', description: error.message || 'Failed to import Shopify store.', variant: 'destructive' });
  //     return false;
  //   } finally {
  //     setIsGenerating(false);
  //   }
  // };

  const resetShopifyWizardState = () => {
    setShopifyWizardStep(0);
    setShopifyDomain('');
    setShopifyToken('');
    setShopifyPreviewMetadata(null);
    setShopifyPreviewProducts({ edges: [], pageInfo: { hasNextPage: false, endCursor: null } });
    setShopifyPreviewCollections({ edges: [], pageInfo: { hasNextPage: false, endCursor: null } });
    setShopifyLocalization(null);
    setIsFetchingShopifyPreviewData(false);
    setShopifyImportError(null);
    setGeneratedLogoImage(null);
    setIsGeneratingLogo(false);
    setLogoGenerationError(null);
  };

  const startShopifyImportWizard = async (domain, token) => {
    setIsGenerating(true); // Use isGenerating for the whole direct import process
    setShopifyImportError(null);
    // We don't need to set shopifyDomain, shopifyToken in context state if bypassing wizard steps
    
    try {
      toast({ title: "Importing Shopify Store...", description: "Fetching data and creating your store. This may take a moment." });

      // 1. Fetch metadata
      const metadata = await fetchShopifyStoreMetadata(domain, token);
      if (!metadata) throw new Error("Failed to fetch Shopify store metadata.");

      // 2. Fetch products (e.g., first 50)
      const productsData = await fetchShopifyProductsList(domain, token, 50);
      const productNodes = productsData.edges.map(e => e.node);

      // 3. Fetch collections (e.g., first 20)
      const collectionsData = await fetchShopifyCollectionsList(domain, token, 20);
      const collectionNodes = collectionsData.edges.map(e => e.node);

      // 4. (Optional) Fetch localization - can be skipped for faster direct import
      // const localization = await fetchShopifyLocalizationInfo(domain, token);

      // 5. Map data (logo will be Shopify's or placeholder, no AI generation in direct flow)
      const newStoreData = mapShopifyDataToInternalStore(
        metadata,
        productNodes,
        collectionNodes,
        domain, // domain is the original domain string
        { generateId },
        null // No pre-generated AI logo in this direct flow
      );
      
      // 6. Create store and navigate (commonStoreCreation handles navigation)
      const finalStore = await commonStoreCreation(newStoreData);
      
      if (finalStore) {
    resetShopifyWizardState(); 
    setIsGenerating(false);
    return true; 
  } else {
    throw new Error("Store creation failed after fetching Shopify data.");
  }
} catch (error) {
  console.error('Error during direct Shopify import:', error);
  setShopifyImportError(error.message || 'Failed to import Shopify store directly.');
  toast({ title: 'Shopify Import Failed', description: error.message || 'Could not complete the import.', variant: 'destructive' });
  setIsGenerating(false);
  resetShopifyWizardState(); 
  return false; 
}
};

// BigCommerce Wizard Functions
const resetBigCommerceWizardState = () => {
  setBigCommerceWizardStep(0);
  setBigCommerceStoreDomain('');
  setBigCommerceApiToken('');
  setBigCommercePreviewSettings(null);
  setBigCommercePreviewProducts({ items: [], pageInfo: { hasNextPage: false, endCursor: null } });
  setIsFetchingBigCommercePreviewData(false);
  setBigCommerceImportError(null);
  // Reset any BigCommerce specific logo state if added
};

const startBigCommerceImportWizard = async (domain, token) => {
  // This function is called after BigCommerceConnectForm succeeds.
  // It should set credentials and move to the next step (metadata preview).
  setBigCommerceStoreDomain(domain);
  setBigCommerceApiToken(token);
  setBigCommerceWizardStep(2); // Move to metadata preview step
  // Optionally, immediately fetch settings for preview
  await fetchBigCommerceWizardSettings(domain, token);
};

const fetchBigCommerceWizardSettings = async (domain, token) => {
  const currentDomain = domain || bigCommerceStoreDomain;
  const currentToken = token || bigCommerceApiToken;
  if (!currentDomain || !currentToken) {
    setBigCommerceImportError('Domain or token missing for fetching BigCommerce settings.');
    return;
  }
  setIsFetchingBigCommercePreviewData(true);
  setBigCommerceImportError(null);
  try {
    const settings = await fetchBCStoreSettings(currentDomain, currentToken);
    setBigCommercePreviewSettings(settings);
  } catch (error) {
    console.error('Error fetching BigCommerce settings for wizard:', error);
    setBigCommerceImportError(error.message || 'Failed to fetch store settings.');
    toast({ title: 'BigCommerce Settings Fetch Failed', description: error.message, variant: 'destructive' });
  } finally {
    setIsFetchingBigCommercePreviewData(false);
  }
};

const fetchBigCommerceWizardProducts = async (count = 10) => { // BC API uses 'first' not cursor for initial, pagination is different
  if (!bigCommerceStoreDomain || !bigCommerceApiToken) {
    setBigCommerceImportError('Domain or token missing for fetching BigCommerce products.');
    return;
  }
  setIsFetchingBigCommercePreviewData(true);
  setBigCommerceImportError(null);
  try {
    // fetchBCAllProducts handles pagination internally. For preview, we might just want the first few.
    // For simplicity in preview, let's fetch all and then slice, or modify fetchBCAllProducts to take a limit for preview.
    // For now, let's assume we fetch a limited set or all and slice in component.
    // The guide's fetchAllProducts fetches ALL. We might need a separate preview function or adapt.
    // Let's simulate fetching a small batch for preview for now.
    // This is a simplified version for preview. The real fetchAllProducts gets everything.
    const query = `
      query ProductsPreview($first: Int!) {
        site {
          products(first: $first) {
            edges {
              node {
                entityId name sku defaultImage { url(width: 200) altText }
                prices { price { value currencyCode } }
              }
            }
          }
        }
      }
    `;
    const variables = { first: count };
    const res = await fetch(`https://${bigCommerceStoreDomain}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${bigCommerceApiToken}` },
      body: JSON.stringify({ query, variables }),
    });
    const result = await res.json();
    if (result.errors) throw new Error(result.errors.map(e => e.message).join(', '));
    
    setBigCommercePreviewProducts({
      items: result.data.site.products.edges.map(e => e.node),
      // pageInfo might not be relevant if we only fetch a small batch for preview
      pageInfo: { hasNextPage: false, endCursor: null } 
    });

  } catch (error) {
    console.error('Error fetching BigCommerce products for wizard:', error);
    setBigCommerceImportError(error.message || 'Failed to fetch products.');
    toast({ title: 'BigCommerce Product Fetch Failed', description: error.message, variant: 'destructive' });
  } finally {
    setIsFetchingBigCommercePreviewData(false);
  }
};

const finalizeBigCommerceImportFromWizard = async () => {
  if (!bigCommercePreviewSettings || !bigCommerceStoreDomain || !bigCommerceApiToken) {
    toast({ title: 'Import Error', description: 'Missing BigCommerce data to finalize import.', variant: 'destructive' });
    return false;
  }
  setIsGenerating(true);
  setBigCommerceImportError(null);
  try {
    // Fetch all products for the final import
    const allProducts = await fetchBCAllProducts(bigCommerceStoreDomain, bigCommerceApiToken);

    const newStoreData = mapBigCommerceDataToInternalStore(
      bigCommercePreviewSettings,
      allProducts, // Use all fetched products
      bigCommerceStoreDomain,
      { generateId },
      null // No AI-generated logo for BigCommerce import for now, uses store's own.
    );
    
    const finalStore = await commonStoreCreation(newStoreData);
    if (finalStore) {
      resetBigCommerceWizardState();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error finalizing BigCommerce import from wizard:', error);
    setBigCommerceImportError(error.message || 'Failed to finalize BigCommerce import.');
    toast({ title: 'BigCommerce Import Failed', description: error.message, variant: 'destructive' });
    return false;
  } finally {
    setIsGenerating(false);
  }
};

  const fetchShopifyWizardProducts = async (first = 10, cursor = null) => {
    if (!shopifyDomain || !shopifyToken) {
      setShopifyImportError('Domain or token missing for fetching products.');
      return;
    }
    setIsFetchingShopifyPreviewData(true);
    setShopifyImportError(null);
    try {
      const productsData = await fetchShopifyProductsList(shopifyDomain, shopifyToken, first, cursor);
      setShopifyPreviewProducts(prev => ({
        edges: cursor ? [...prev.edges, ...productsData.edges] : productsData.edges,
        pageInfo: productsData.pageInfo,
      }));
    } catch (error) {
      console.error('Error fetching Shopify products for wizard:', error);
      setShopifyImportError(error.message || 'Failed to fetch products.');
      toast({ title: 'Product Fetch Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsFetchingShopifyPreviewData(false);
    }
  };
  
  const fetchShopifyWizardCollections = async (first = 10, cursor = null) => {
    if (!shopifyDomain || !shopifyToken) {
      setShopifyImportError('Domain or token missing for fetching collections.');
      return;
    }
    setIsFetchingShopifyPreviewData(true);
    setShopifyImportError(null);
    try {
      const collectionsData = await fetchShopifyCollectionsList(shopifyDomain, shopifyToken, first, cursor);
      setShopifyPreviewCollections(prev => ({
        edges: cursor ? [...prev.edges, ...collectionsData.edges] : collectionsData.edges,
        pageInfo: collectionsData.pageInfo,
      }));
    } catch (error) {
      console.error('Error fetching Shopify collections for wizard:', error);
      setShopifyImportError(error.message || 'Failed to fetch collections.');
      toast({ title: 'Collection Fetch Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsFetchingShopifyPreviewData(false);
    }
  };

  const fetchShopifyWizardLocalization = async (countryCode = "US", languageCode = "EN") => {
    if (!shopifyDomain || !shopifyToken) {
      setShopifyImportError('Domain or token missing for fetching localization.');
      return;
    }
    setIsFetchingShopifyPreviewData(true);
    setShopifyImportError(null);
    try {
      const localizationData = await fetchShopifyLocalizationInfo(shopifyDomain, shopifyToken, countryCode, languageCode);
      setShopifyLocalization(localizationData);
    } catch (error)
    {
      console.error('Error fetching Shopify localization for wizard:', error);
      setShopifyImportError(error.message || 'Failed to fetch localization info.');
      // Non-critical, so maybe a softer error or just log
      toast({ title: 'Localization Info Fetch Failed', description: error.message, variant: 'default' });
    } finally {
      setIsFetchingShopifyPreviewData(false);
    }
  };

  const generateShopifyStoreLogo = async () => {
    console.log("[StoreContext] Attempting to generate Shopify store logo...");
    if (!shopifyPreviewMetadata || !shopifyPreviewMetadata.name) {
      console.warn("[StoreContext] Cannot generate logo: Shopify preview metadata or store name is missing.", shopifyPreviewMetadata);
      setLogoGenerationError("Store name is not available to generate a logo.");
      toast({ title: 'Logo Generation Error', description: 'Store name missing. Ensure Shopify store details were fetched correctly.', variant: 'destructive' });
      return;
    }

    const storeNameForLogo = shopifyPreviewMetadata.name;
    console.log(`[StoreContext] Generating logo for store name: "${storeNameForLogo}"`);

    setIsGeneratingLogo(true);
    setLogoGenerationError(null);
    setGeneratedLogoImage(null);

    try {
      console.log("[StoreContext] Calling generateLogoWithGemini...");
      const { imageData, textResponse } = await generateLogoWithGemini(storeNameForLogo);
      console.log("[StoreContext] generateLogoWithGemini response:", { imageData: imageData ? 'imageData received (see next log)' : 'no imageData', textResponse });
      if (imageData) {
        console.log("[StoreContext] imageData (first 50 chars):", imageData.substring(0, 50));
        setGeneratedLogoImage(`data:image/png;base64,${imageData}`);
        toast({ title: 'Logo Generated!', description: 'A new logo has been generated successfully.' });
        console.log("[StoreContext] Logo generated and state updated.");
      } else {
        console.error("[StoreContext] generateLogoWithGemini returned no imageData. Text response:", textResponse);
        throw new Error(textResponse || "Gemini did not return image data.");
      }
    } catch (error) {
      console.error('[StoreContext] Error during Shopify store logo generation:', error.message, error.stack);
      setLogoGenerationError(error.message || 'Failed to generate logo.');
      toast({ title: 'Logo Generation Failed', description: `Error: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsGeneratingLogo(false);
      console.log("[StoreContext] Finished logo generation attempt.");
    }
  };

  const finalizeShopifyImportFromWizard = async () => {
    if (!shopifyPreviewMetadata || !shopifyDomain || !shopifyToken) {
      toast({ title: 'Import Error', description: 'Missing essential Shopify data to finalize import.', variant: 'destructive' });
      return false;
    }
    setIsGenerating(true); 
    setShopifyImportError(null);
    try {
      // Ensure products and collections are arrays of nodes
      const productNodes = shopifyPreviewProducts.edges.map(e => e.node);
      const collectionNodes = shopifyPreviewCollections.edges.map(e => e.node);

      const newStoreData = mapShopifyDataToInternalStore(
        shopifyPreviewMetadata,
        productNodes,
        collectionNodes,
        shopifyDomain,
        { generateId },
        generatedLogoImage // Pass the generated logo
      );
      
      const finalStore = await commonStoreCreation(newStoreData);
      if (finalStore) {
        resetShopifyWizardState(); // Clear wizard state on success
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error finalizing Shopify import from wizard:', error);
      setShopifyImportError(error.message || 'Failed to finalize Shopify import.');
      toast({ title: 'Import Failed', description: error.message || 'Could not complete Shopify store import.', variant: 'destructive' });
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
      // Handle local-only updates if no user is logged in
      setStores(prevStores => {
        const newStores = prevStores.map(store => {
          if (store.id === storeId) {
            return { ...store, ...updates }; // Merge updates into the existing store
          }
          return store;
        });
        localStorage.setItem('ecommerce-stores', JSON.stringify(prepareStoresForLocalStorage(newStores)));
        
        // Update currentStore if it's the one being modified
        if (currentStore && currentStore.id === storeId) {
           setCurrentStore(prevCurrent => prevCurrent ? { ...prevCurrent, ...updates } : null);
        }
        return newStores;
      });
      toast({ title: 'Store Updated (Locally)', description: 'Changes saved locally.' });
      return; // Exit if no user, as Supabase update won't happen
    }

    // If user exists, proceed with Supabase update
    setIsLoadingStores(true); // Indicate loading state during Supabase operation
    try {
      const { data: updatedStoreFromSupabase, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', storeId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating store in Supabase:', error);
        toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
        setIsLoadingStores(false);
        return;
      }

      // If Supabase update is successful, update local state with the fresh data from Supabase
      setStores(prevStores => {
        const newStores = prevStores.map(store =>
          store.id === storeId ? updatedStoreFromSupabase : store
        );
        localStorage.setItem('ecommerce-stores', JSON.stringify(prepareStoresForLocalStorage(newStores))); // Use newStores
        return newStores;
      });

      if (currentStore && currentStore.id === storeId) {
        setCurrentStore(updatedStoreFromSupabase);
      }
      toast({ title: 'Store Updated', description: 'Your store has been updated in the cloud.' });
    } catch (e) {
        console.error('Unexpected error in updateStore:', e);
        toast({ title: 'Update Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
        setIsLoadingStores(false);
    }
  };
  
  const updateProductImage = async (storeId, productId, newImage) => {
    const storeToUpdate = stores.find(s => s.id === storeId);
    if (!storeToUpdate) {
        console.warn(`[StoreContext] updateProductImage: Store with ID ${storeId} not found.`);
        return;
    }

    const updatedProducts = storeToUpdate.products.map(p =>
      p.id === productId ? { ...p, image: newImage } : p
    );
    // The updateStore function will handle saving to localStorage via setStores callback
    await updateStore(storeId, { products: updatedProducts }); 
    // Toast is now inside updateStore, so it's not needed here explicitly unless for specific message
    // toast({ title: 'Product Image Updated', description: 'The product image has been changed.' });
  };

  const deleteStore = async (storeId) => {
     if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to delete a store.', variant: 'destructive'});
      return;
    }
    // Optimistically update UI first, then call Supabase
    const storesBeforeDelete = [...stores];
    setStores(prevStores => {
        const newStores = prevStores.filter(store => store.id !== storeId);
        localStorage.setItem('ecommerce-stores', JSON.stringify(prepareStoresForLocalStorage(newStores)));
        return newStores;
    });
    if (currentStore && currentStore.id === storeId) setCurrentStore(null);

    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting store from Supabase:', error);
      toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
      // Revert optimistic update if Supabase fails
      setStores(storesBeforeDelete);
      localStorage.setItem('ecommerce-stores', JSON.stringify(prepareStoresForLocalStorage(storesBeforeDelete)));
      // Potentially reset currentStore if it was the one being deleted
      if (storesBeforeDelete.find(s => s.id === storeId)) {
          setCurrentStore(storesBeforeDelete.find(s => s.id === storeId) || null);
      }
      return;
    }
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
    generateStore, /* importShopifyStore, // Replaced by wizard functions */ 
    getStoreById, updateStore, deleteStore, setCurrentStore,
    getProductById, updateProductImage, generateStoreFromWizard,
    addToCart, removeFromCart, updateQuantity, clearCart,
    generateAIProducts: generateAIProductsData,
    viewMode, setViewMode, // Expose viewMode and setter

    // Shopify Wizard related state and functions
    shopifyWizardStep, setShopifyWizardStep,
    shopifyDomain, shopifyToken, // These might become generic if we have one set of credential fields
    shopifyPreviewMetadata, shopifyPreviewProducts, shopifyPreviewCollections, shopifyLocalization,
    isFetchingShopifyPreviewData, shopifyImportError,
    generatedLogoImage, isGeneratingLogo, logoGenerationError,
    startShopifyImportWizard,
    fetchShopifyWizardProducts,
    fetchShopifyWizardCollections,
    fetchShopifyWizardLocalization,
    generateShopifyStoreLogo,
    finalizeShopifyImportFromWizard,
    resetShopifyWizardState,

    // BigCommerce Wizard related state and functions
    bigCommerceWizardStep, setBigCommerceWizardStep,
    bigCommerceStoreDomain, bigCommerceApiToken, // BC specific credentials
    bigCommercePreviewSettings, bigCommercePreviewProducts,
    isFetchingBigCommercePreviewData, bigCommerceImportError,
    startBigCommerceImportWizard,
    fetchBigCommerceWizardSettings,
    fetchBigCommerceWizardProducts,
    finalizeBigCommerceImportFromWizard,
    resetBigCommerceWizardState,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};
