import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import StoreHeader from '@/components/store/StoreHeader';
import StoreFooter from '@/components/store/StoreFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { fetchPexelsImages, generateImageWithGemini, generateId } from '@/lib/utils';
import { editImageWithGemini } from '@/lib/geminiImageGeneration';
import { ShoppingCart, Star, ImageDown as ImageUp, Wand, Loader2, ArrowLeft, Replace, Edit3, VideoIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import GenerateProductVideoModal from '@/components/product/GenerateProductVideoModal';
import ProductVisualizer from '@/components/product/ProductVisualizer';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const ProductDetail = () => {
  const params = useParams();
  const storeId = params.storeId;
  
  // Helper to check if a string is likely Base64
  // A simple check: Base64 encoded GIDs will be longer and won't contain '://'
  const isBase64 = (str) => {
    if (typeof str !== 'string' || str.includes('://')) return false;
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
      return false;
    }
  };

  let productIdFromUrl = params.productId;
  let decodedProductId = productIdFromUrl;
  if (isBase64(productIdFromUrl)) {
    try {
      decodedProductId = atob(productIdFromUrl);
    } catch (e) {
      console.error("Failed to decode Base64 productId:", productIdFromUrl, e);
      // Keep original if decoding fails, though this shouldn't happen if isBase64 passed
    }
  }
  const productId = decodedProductId; // Use the decoded ID for fetching

  // const location = useLocation(); // No longer needed for isPublishedView
  const { getStoreById, getProductById, addToCart, updateProductImage, updateStore, isLoadingStores, viewMode } = useStore();
  const isPublishedView = viewMode === 'published';
  const { toast } = useToast();
  const navigate = useNavigate();

  const [store, setStore] = useState(null);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [searchedImages, setSearchedImages] = useState([]);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [imageEditPrompt, setImageEditPrompt] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);

  const [isProductVideoModalOpen, setIsProductVideoModalOpen] = useState(false);
  const [currentProductVideoUrl, setCurrentProductVideoUrl] = useState('');

  const convertImageSrcToBasics = useCallback((imageSrc) => {
    return new Promise((resolve, reject) => {
      if (!imageSrc) {
        return reject(new Error("Image source is undefined or null."));
      }
      if (imageSrc.startsWith('data:')) {
        try {
          const parts = imageSrc.split(',');
          if (parts.length < 2) throw new Error("Invalid data URL structure.");
          const metaPart = parts[0];
          const base64Data = parts[1];
          const mimeTypeMatch = metaPart.match(/:(.*?);/);
          if (!mimeTypeMatch || !mimeTypeMatch[1]) throw new Error("Could not parse MIME type from data URL.");
          const mimeType = mimeTypeMatch[1];
          resolve({ base64ImageData: base64Data, mimeType });
        } catch (error) {
          console.error("Error parsing data URL:", imageSrc, error);
          reject(new Error(`Invalid data URL format: ${error.message}`));
        }
      } else { 
        const img = new Image();
        img.crossOrigin = 'Anonymous'; 
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          try {
            const dataUrl = canvas.toDataURL('image/png'); 
            const parts = dataUrl.split(',');
            const base64Data = parts[1];
            resolve({ base64ImageData: base64Data, mimeType: 'image/png' });
          } catch (e) {
            console.error("Canvas toDataURL failed:", e);
            reject(new Error("Canvas toDataURL failed, possibly due to CORS or tainted canvas. " + e.message));
          }
        };
        img.onerror = (e) => {
          console.error("Failed to load image from URL for conversion:", imageSrc, e);
          reject(new Error("Failed to load image from URL for conversion."));
        };
        img.src = imageSrc;
      }
    });
  }, []);

  const handleImageEditSave = useCallback(async () => {
    if (!imageEditPrompt.trim() || !product || !product.image?.src?.medium) {
      toast({ title: "Missing data", description: "Original image or edit prompt is missing.", variant: "destructive" });
      return;
    }
    setIsEditingImage(true);
    try {
      const currentImageSrc = product.image.src.medium; 
      const { base64ImageData, mimeType } = await convertImageSrcToBasics(currentImageSrc);
      
      const result = await editImageWithGemini(base64ImageData, mimeType, imageEditPrompt);
      
      if (result && result.editedImageData) {
        const newImageDataUrl = `data:${result.newMimeType};base64,${result.editedImageData}`;
        const newImageObject = {
          id: generateId(), 
          src: { medium: newImageDataUrl, large: newImageDataUrl }, 
          alt: `${product.name} (edited: ${imageEditPrompt.substring(0,20)}...)`, 
          photographer: "Edited with Gemini AI" 
        };
        updateProductImage(storeId, productId, newImageObject);
        toast({ title: "Image Edited", description: "Product image updated with AI edit." });
        setIsEditModalOpen(false);
        setImageEditPrompt('');
      } else {
        throw new Error("AI did not return an edited image.");
      }
    } catch (error) {
      console.error("Error editing image:", error);
      toast({ title: "Image Edit Failed", description: error.message, variant: "destructive" });
    }
    setIsEditingImage(false);
  }, [product, imageEditPrompt, storeId, productId, updateProductImage, toast, convertImageSrcToBasics, setIsEditModalOpen, setImageEditPrompt, setIsEditingImage]);

  useEffect(() => {
    if (isLoadingStores) {
      // Wait for stores to be loaded from context
      return;
    }
    console.log(`[ProductDetail] Attempting to load product. Store ID: ${storeId}, Product ID from URL: ${productId}`);
    const currentStore = getStoreById(storeId);
    if (currentStore) {
      setStore(currentStore);
      console.log("[ProductDetail] Store found:", currentStore.name);
      const currentProduct = getProductById(storeId, productId);
      console.log("[ProductDetail] Product from getProductById:", currentProduct ? currentProduct.name : 'NOT FOUND', currentProduct);
      if (currentProduct) {
        setProduct(currentProduct);
        setImageSearchQuery(currentProduct.name); 
        setCurrentProductVideoUrl(currentProduct.video_url || ''); 
      } else {
        toast({ title: "Product not found in store", description: `Product ID ${productId} not found in store ${currentStore.name}.`, variant: "destructive" });
        navigate(`/store/${storeId}`); 
      }
    } else {
      toast({ title: "Store not found", description: `Could not find store with ID: ${storeId}`, variant: "destructive" });
      navigate('/'); 
    }
  }, [storeId, productId, getStoreById, getProductById, navigate, toast, isLoadingStores]); // isPublishedView removed from deps as it's from context now

  const handleQuantityChange = (e) => {
    const val = parseInt(e.target.value);
    if (val > 0) setQuantity(val);
  };

  const handleAddToCart = () => {
    addToCart({ ...product, quantity }, storeId);
  };

  const handlePexelsSearch = async () => {
    if (!imageSearchQuery.trim()) return;
    setIsImageLoading(true);
    try {
      const images = await fetchPexelsImages(imageSearchQuery, 5, 'square');
      setSearchedImages(images);
    } catch (error) {
      toast({ title: "Image search failed", description: error.message, variant: "destructive" });
    }
    setIsImageLoading(false);
  };
  
  const handleGeminiGenerate = async () => {
    if (!imageSearchQuery.trim()) return;
    setIsImageLoading(true);
    try {
      const geminiPrompt = `Product image for: ${imageSearchQuery}, ${product?.type || store?.type || 'item'}`;
      const newImage = await generateImageWithGemini(geminiPrompt);
      setSearchedImages(prev => [{ id: Date.now().toString(), src: { medium: newImage.url, large: newImage.url }, alt: newImage.alt, photographer: "Gemini AI" }, ...prev.slice(0,4)]);
      toast({title: "Image Generated", description: "Gemini AI generated an image."});
    } catch (error) {
      toast({ title: "Gemini image generation failed", description: error.message, variant: "destructive" });
    }
    setIsImageLoading(false);
  };

  const handleProductVideoGenerated = async (newVideoUrl) => {
    if (!store || !product) return;
    const updatedProducts = store.products.map(p =>
      p.id === productId ? { ...p, video_url: newVideoUrl } : p
    );
    try {
      await updateStore(storeId, { products: updatedProducts });
      setCurrentProductVideoUrl(newVideoUrl); 
      toast({ title: "Product Video Generated", description: "The video has been added to the product." });
    } catch (error) {
      console.error("Failed to update store with product video:", error);
      toast({ title: "Update Failed", description: "Could not save the product video.", variant: "destructive" });
    }
  };

  const selectImage = (selectedImg) => {
    updateProductImage(storeId, productId, selectedImg);
    setIsImageModalOpen(false);
    setSearchedImages([]);
  };

  if (isLoadingStores || !store || !product) { // Added isLoadingStores to condition
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  const imageUrl = product.image?.src?.large || product.image?.src?.medium || `https://via.placeholder.com/600x600.png?text=${encodeURIComponent(product.name)}`;
  const imageAlt = product.image?.alt || product.name;

  // Define productStock and themePrimaryColor
  const firstVariant = product.variants?.edges?.[0]?.node; // For Shopify products
  const productStock = firstVariant?.quantityAvailable ?? product.stock ?? (product.availableForSale ? 1 : 0);
  const themePrimaryColor = store?.theme?.primaryColor || '#000000';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StoreHeader store={store} isPublishedView={isPublishedView} />
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 md:py-12 flex-grow"
      >
        {/* "Back to Store" button now always navigates to the single store route */}
        <Button variant="outline" onClick={() => navigate(`/store/${storeId}`)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Store
        </Button>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative group"
          >
            <img
              src={imageUrl}
              alt={imageAlt}
              className="w-full h-auto aspect-square object-cover rounded-xl shadow-lg border"
            />
            {!isPublishedView && (
              <>
                <Button 
                  variant="secondary" 
                  onClick={() => setIsImageModalOpen(true)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md"
                >
                  <Replace className="mr-2 h-4 w-4" /> Change Image
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  className="absolute top-16 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md"
                >
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Image
                </Button>
                 <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsProductVideoModalOpen(true)}
                  className="absolute top-28 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md"
                >
                  <VideoIcon className="mr-2 h-4 w-4" /> Gen Video
                </Button>
              </>
            )}
          </motion.div>
          
          {currentProductVideoUrl && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="md:col-span-2 lg:col-span-1 aspect-video rounded-xl overflow-hidden shadow-lg border relative mt-4 md:mt-0"
            >
              <video
                key={currentProductVideoUrl} 
                src={currentProductVideoUrl}
                controls
                autoPlay={false} 
                loop
                playsInline
                className="w-full h-full object-cover"
                poster={imageUrl} 
              >
                Your browser does not support the video tag.
              </video>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">{product.name}</h1>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-5 w-5 ${i < Math.floor(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({product.rating} reviews)</span>
              <Separator orientation="vertical" className="h-5"/>
              <Badge variant="outline" style={{borderColor: store.theme.primaryColor, color: store.theme.primaryColor}}>{product.stock > 0 ? `${product.stock} in stock` : "Out of Stock"}</Badge>
            </div>

            <p className="text-2xl lg:text-3xl font-semibold" style={{ color: store.theme.primaryColor }}>
              {product.currencyCode || 'USD'} {product.price.toFixed(2)}
            </p>
            
            <div className="prose prose-sm sm:prose dark:prose-invert max-w-none text-muted-foreground">
              <p>{product.description}</p>
            </div>

            {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {product.tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                </div>
            )}
            
            <Separator />

            {/* Moved Add to Cart section above ProductVisualizer */}
            <div className="flex items-end gap-4 pt-4"> {/* Added pt-4 for spacing */}
              <div className="space-y-1">
                <Label htmlFor="quantity" className="text-sm">Quantity</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  value={quantity} 
                  onChange={handleQuantityChange} 
                  min="1" 
                  max={productStock}
                  className="w-20 h-10 text-center" 
                  disabled={productStock === 0}
                />
              </div>
              <Button 
                size="lg" 
                onClick={handleAddToCart} 
                className="flex-1 h-10"
                style={{ backgroundColor: themePrimaryColor, color: 'white' }}
                disabled={productStock === 0}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {productStock === 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
            </div>

            {product && storeId && (
              <ProductVisualizer product={product} storeId={storeId} isPublishedView={isPublishedView} />
            )}
            {/* End Product Visualizer Component */}

          </motion.div>
        </div>
      </motion.main>
      <StoreFooter store={store} isPublishedView={isPublishedView} />

      {!isPublishedView && (
        <>
          <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Change Product Image</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search Pexels or describe for AI..." 
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                  />
                  <Button onClick={handlePexelsSearch} disabled={isImageLoading || !imageSearchQuery.trim()}>
                    {isImageLoading && searchedImages.length === 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />} <span className="ml-2 hidden sm:inline">Pexels</span>
                  </Button>
                  <Button onClick={handleGeminiGenerate} variant="outline" disabled={isImageLoading || !imageSearchQuery.trim()}>
                     {isImageLoading && searchedImages.length > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand className="h-4 w-4" />} <span className="ml-2 hidden sm:inline">Gemini</span>
                  </Button>
                </div>
                {isImageLoading && searchedImages.length === 0 && <p className="text-center text-sm text-muted-foreground">Searching for images...</p>}
                {searchedImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                    {searchedImages.map(img => (
                      <motion.div 
                        key={img.id} 
                        className="relative aspect-square rounded-md overflow-hidden cursor-pointer group border-2 border-transparent hover:border-primary transition-all"
                        onClick={() => selectImage(img)}
                        whileHover={{scale: 1.05}}
                        initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}}
                      >
                        <img src={img.src.medium} alt={img.alt || 'Search result'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-white"/>
                        </div>
                        <p className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                          {img.photographer || img.alt}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Product Image</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {product && product.image && (
                  <div className="flex items-center space-x-2 mb-4">
                    <img src={imageUrl} alt="Current product to edit" className="h-20 w-20 object-cover rounded border"/>
                    <p className="text-sm text-muted-foreground">Editing: {product.name}</p>
                  </div>
                )}
                <Label htmlFor="editPrompt" className="text-left">Edit Instruction:</Label>
                <Textarea
                  id="editPrompt"
                  placeholder="e.g., 'make the background blue', 'add sunglasses to the person'"
                  value={imageEditPrompt}
                  onChange={(e) => setImageEditPrompt(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isEditingImage}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleImageEditSave} disabled={isEditingImage || !imageEditPrompt.trim()}>
                  {isEditingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand className="mr-2 h-4 w-4" />}
                  Apply Edit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {product && (
            <GenerateProductVideoModal
              open={isProductVideoModalOpen}
              onOpenChange={setIsProductVideoModalOpen}
              product={product}
              onVideoGenerated={handleProductVideoGenerated}
            />
          )}
        </>
      )}
    </div>
  );
};

const CheckCircle = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

export default ProductDetail;
