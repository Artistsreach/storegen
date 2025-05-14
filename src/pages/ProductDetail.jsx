
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import StoreHeader from '@/components/store/StoreHeader';
import StoreFooter from '@/components/store/StoreFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { fetchPexelsImages, generateImageWithGemini } from '@/lib/utils';
import { ShoppingCart, Star, ImageDown as ImageUp, Wand, Loader2, ArrowLeft, Replace } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const ProductDetail = () => {
  const { storeId, productId } = useParams();
  const { getStoreById, getProductById, addToCart, updateProductImage } = useStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [store, setStore] = useState(null);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [searchedImages, setSearchedImages] = useState([]);
  const [isImageLoading, setIsImageLoading] = useState(false);

  useEffect(() => {
    const currentStore = getStoreById(storeId);
    if (currentStore) {
      setStore(currentStore);
      const currentProduct = getProductById(storeId, productId);
      if (currentProduct) {
        setProduct(currentProduct);
        setImageSearchQuery(currentProduct.name); // Pre-fill search with product name
      } else {
        toast({ title: "Product not found", variant: "destructive" });
        navigate(`/preview/${storeId}`);
      }
    } else {
      toast({ title: "Store not found", variant: "destructive" });
      navigate('/');
    }
  }, [storeId, productId, getStoreById, getProductById, navigate, toast]);

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
      // For Gemini, we might want to add it to searchedImages or directly offer to set it
      setSearchedImages(prev => [{ id: Date.now().toString(), src: { medium: newImage.url, large: newImage.url }, alt: newImage.alt, photographer: "Gemini AI" }, ...prev.slice(0,4)]);
      toast({title: "Image Generated", description: "Gemini AI generated an image."});
    } catch (error) {
      toast({ title: "Gemini image generation failed", description: error.message, variant: "destructive" });
    }
    setIsImageLoading(false);
  };

  const selectImage = (selectedImg) => {
    updateProductImage(storeId, productId, selectedImg);
    setIsImageModalOpen(false);
    setSearchedImages([]);
  };

  if (!store || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const imageUrl = product.image?.src?.large || product.image?.src?.medium || `https://via.placeholder.com/600x600.png?text=${encodeURIComponent(product.name)}`;
  const imageAlt = product.image?.alt || product.name;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StoreHeader store={store} />
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 md:py-12 flex-grow"
      >
        <Button variant="outline" onClick={() => navigate(`/preview/${storeId}`)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Store
        </Button>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative group"
          >
            <img-replace
              src={imageUrl}
              alt={imageAlt}
              className="w-full h-auto aspect-square object-cover rounded-xl shadow-lg border"
            />
            <Button 
              variant="secondary" 
              onClick={() => setIsImageModalOpen(true)}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md"
            >
              <Replace className="mr-2 h-4 w-4" /> Change Image
            </Button>
          </motion.div>

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

            <div className="flex items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="quantity" className="text-sm">Quantity</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  value={quantity} 
                  onChange={handleQuantityChange} 
                  min="1" 
                  max={product.stock}
                  className="w-20 h-10 text-center" 
                  disabled={product.stock === 0}
                />
              </div>
              <Button 
                size="lg" 
                onClick={handleAddToCart} 
                className="flex-1 h-10"
                style={{ backgroundColor: store.theme.primaryColor, color: 'white' }}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.main>
      <StoreFooter store={store} />

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
                    <img-replace src={img.src.medium} alt={img.alt || 'Search result'} className="w-full h-full object-cover" />
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
    </div>
  );
};

// Minimal CheckCircle icon for dialog
const CheckCircle = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);


export default ProductDetail;
