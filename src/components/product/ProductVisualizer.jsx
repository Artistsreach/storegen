import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UploadCloud, X, Wand2, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { useToast } from '@/components/ui/use-toast';
import { generateProductVisualization } from '@/lib/productVisualizer'; // Corrected import path
import { Separator } from '@/components/ui/separator';

const ProductVisualizer = ({ product: mainProductProp, storeId, isPublishedView = false }) => {
  const { toast } = useToast();
  const { getStoreById } = useStore();
  const [store, setStore] = useState(null);
  
  const [referenceSceneSource, setReferenceSceneSource] = useState(null); // File object for reference image
  const [referenceImageUrlPreview, setReferenceImageUrlPreview] = useState(''); 
  
  const [availableAdditionalProducts, setAvailableAdditionalProducts] = useState([]);
  const [selectedAdditionalProducts, setSelectedAdditionalProducts] = useState([]); // Array of full product objects

  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedProductColor, setSelectedProductColor] = useState('#FFFFFF'); // Default to white
  const [promptUsedByAI, setPromptUsedByAI] = useState('');
  const [aiCommentary, setAiCommentary] = useState('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); 

  useEffect(() => {
    if (storeId) {
      const currentStoreData = getStoreById(storeId);
      setStore(currentStoreData);
      if (currentStoreData && mainProductProp) {
        setAvailableAdditionalProducts(
          currentStoreData.products.filter(p => p.id !== mainProductProp.id && p.image?.src?.medium)
        );
      }
    }
  }, [storeId, mainProductProp, getStoreById]);

  const handleReferenceImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Basic client-side size check, though the API has its own limits
      if (file.size > 5 * 1024 * 1024) { // 5MB limit for easier UX
        toast({ title: "File too large", description: "Reference image should ideally be under 5MB.", variant: "destructive" });
        // return; // Allow user to try, API will ultimately decide
      }
      setReferenceSceneSource(file); 
      const reader = new FileReader();
      reader.onloadend = () => setReferenceImageUrlPreview(reader.result);
      reader.readAsDataURL(file);
      setGeneratedImageUrl(null);
      setPromptUsedByAI('');
      setAiCommentary('');
    }
  };

  const removeReferenceImage = () => {
    setReferenceSceneSource(null);
    setReferenceImageUrlPreview('');
    setGeneratedImageUrl(null);
    setPromptUsedByAI('');
    setAiCommentary('');
  };

  const toggleAdditionalProduct = (productObject) => {
    setSelectedAdditionalProducts(prev =>
      prev.find(p => p.id === productObject.id)
        ? prev.filter(p => p.id !== productObject.id)
        : [...prev, productObject]
    );
    setGeneratedImageUrl(null);
    setPromptUsedByAI('');
    setAiCommentary('');
  };

  const handleGenerateVisualization = async () => {
    if (!mainProductProp || !referenceSceneSource) {
      toast({ title: "Missing inputs", description: "Main product and a reference image are required.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setGeneratedImageUrl(null);
    setPromptUsedByAI('');
    setAiCommentary('Generating visualization, please wait...');

    // Combine custom instructions with selected color
    let finalCustomInstructions = customInstructions;
    if (selectedProductColor && selectedProductColor !== '#FFFFFF') { // Add color if not default white
      finalCustomInstructions = `${customInstructions}. The main product should be ${selectedProductColor} color`.trim();
    }

    try {
      const mainProductForApi = {
        name: mainProductProp.name,
        description: mainProductProp.description,
        imageSource: mainProductProp.image?.src?.large || mainProductProp.image?.src?.medium,
      };

      const additionalProductsForApi = selectedAdditionalProducts.map(p => ({
        name: p.name,
        description: p.description,
        imageSource: p.image?.src?.large || p.image?.src?.medium,
      }));

      const result = await generateProductVisualization({
        mainProduct: mainProductForApi,
        referenceSceneSource: referenceSceneSource, // This is the File object
        additionalProducts: additionalProductsForApi,
        customInstructions: finalCustomInstructions, // Use combined instructions
      });

      setPromptUsedByAI(result.promptUsed || 'Prompt details not available.');
      setAiCommentary(result.commentary || 'Processing complete.');

      if (result && result.imageUrl) {
        setGeneratedImageUrl(result.imageUrl);
        toast({ title: "Visualization Generated!", description: result.commentary || "Image created." });
      } else {
        toast({ title: "Visualization Issue", description: result.commentary || "No image generated by AI.", variant: "default", duration: 7000 });
      }
    } catch (error) {
      console.error("Error in ProductVisualizer calling generateProductVisualization:", error);
      const errorMessage = error.message || "An unknown error occurred during visualization.";
      setAiCommentary(`Error: ${errorMessage}`);
      toast({ title: "Visualization Failed", description: errorMessage, variant: "destructive", duration: 10000 });
    } finally {
      setIsLoading(false);
    }
  };

  if (!mainProductProp || !store) {
    return <div className="py-8 text-center text-muted-foreground">Initializing Product Visualizer...</div>;
  }

  return (
    <div className="my-8 border rounded-lg shadow-sm bg-card">
      <div 
        className="p-4 md:p-6 cursor-pointer flex justify-between items-center"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded} aria-controls="product-visualizer-content-area"
      >
        <div>
          <h3 className="text-xl md:text-2xl font-semibold">Product Visualizer</h3>
          <p className="text-sm text-muted-foreground">
            See how <span className="font-medium text-primary">{mainProductProp.name}</span> looks in different settings.
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label={isExpanded ? "Collapse visualizer" : "Expand visualizer"}>
          {isExpanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
        </Button>
      </div>

      {isExpanded && (
        <div id="product-visualizer-content-area" className="p-4 md:p-6 border-t">
          {/* Layout is now always lg:grid-cols-2 as the left panel is always shown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Left Panel with generation controls - no longer conditional on !isPublishedView */}
            <div className="space-y-4 md:space-y-6"> 
              <div>
                <Label htmlFor="visualizer-reference-image-upload" className="text-md font-medium block mb-1">1. Upload Reference Scene</Label>
                <p className="text-xs text-muted-foreground mb-2">E.g., a room, a model. (Max ~5MB recommended)</p>
                {referenceImageUrlPreview ? (
                  <div className="relative group aspect-video rounded-md border overflow-hidden bg-muted/20">
                    <img src={referenceImageUrlPreview} alt="Reference scene preview" className="w-full h-full object-contain" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity" onClick={removeReferenceImage} aria-label="Remove reference image">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="visualizer-reference-image-input" className="mt-1 flex flex-col justify-center items-center w-full h-40 md:h-48 px-6 py-5 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors">
                    <UploadCloud className="mx-auto h-8 md:h-10 w-8 md:w-10 text-muted-foreground mb-2" />
                    <span className="font-semibold text-primary text-sm">Click to upload image</span>
                    <span className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, WEBP</span>
                    <Input id="visualizer-reference-image-input" type="file" className="sr-only" accept="image/*" onChange={handleReferenceImageUpload} />
                  </label>
                )}
              </div>

              {availableAdditionalProducts.length > 0 && (
                <div>
                  <Label className="text-md font-medium block mb-1">2. Add Other Products (Optional)</Label>
                  <ScrollArea className="h-32 md:h-40 border rounded-md p-2">
                    <div className="space-y-1.5">
                      {availableAdditionalProducts.map(p => (
                        <div key={p.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all text-sm ${selectedAdditionalProducts.some(sp => sp.id === p.id) ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'}`} onClick={() => toggleAdditionalProduct(p)} role="checkbox" aria-checked={selectedAdditionalProducts.some(sp => sp.id === p.id)} tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleAdditionalProduct(p)}>
                          <div className="flex items-center gap-2 overflow-hidden">
                            <img src={p.image.src.medium} alt={p.name} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                            <span className="truncate" title={p.name}>{p.name}</span>
                          </div>
                          {selectedAdditionalProducts.some(sp => sp.id === p.id) && <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
              
              <div>
                <Label htmlFor="visualizer-product-color" className="text-md font-medium block mb-1">3. Main Product Color (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="color" 
                    id="visualizer-product-color" 
                    value={selectedProductColor} 
                    onChange={(e) => setSelectedProductColor(e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input 
                    type="text" 
                    value={selectedProductColor} 
                    onChange={(e) => setSelectedProductColor(e.target.value)} 
                    placeholder="#FFFFFF"
                    className="flex-grow h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="visualizer-custom-prompt" className="text-md font-medium block mb-1">4. Custom Instructions (Optional)</Label>
                <Textarea id="visualizer-custom-prompt" placeholder="e.g., 'place the sofa by the window', 'make it a sunny day'" value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} rows={2} className="resize-none text-sm" />
              </div>

              <Button onClick={handleGenerateVisualization} disabled={isLoading || !referenceSceneSource} className="w-full py-2.5 text-sm md:text-base" size="lg">
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                Generate Visualization
              </Button>
            </div>

            {/* Right Panel - no longer needs to conditionally span full width */}
            <div className="flex flex-col items-center justify-center border rounded-md p-2 md:p-4 bg-muted/30 min-h-[250px] md:min-h-[300px] lg:min-h-full relative">
              {isLoading ? ( // isLoading check is fine, not tied to isPublishedView for the loader itself
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-3" />
                  <p className="text-muted-foreground font-medium">{aiCommentary || "Generating your scene..."}</p>
                </div>
              ) : generatedImageUrl ? (
                <>
                  <img src={generatedImageUrl} alt="Generated Product Visualization" className="max-w-full max-h-[calc(100%-40px)] object-contain rounded-md" />
                  {aiCommentary && !aiCommentary.toLowerCase().includes("error") && <p className="text-xs text-muted-foreground mt-2 text-center max-w-xs mx-auto">{aiCommentary}</p>}
                  <Button variant="ghost" size="sm" onClick={() => setShowDebugInfo(!showDebugInfo)} className="absolute bottom-1 right-1 text-muted-foreground hover:text-primary h-auto p-1" aria-label="Toggle prompt information">
                    <Info className="h-4 w-4 mr-1"/> <span className="text-xs">Info</span>
                  </Button>
                </>
              ) : (
                <div className="text-center text-muted-foreground p-4">
                   {aiCommentary && <p className={`text-sm mb-2 ${aiCommentary.toLowerCase().includes("error") || aiCommentary.toLowerCase().includes("failed") ? 'text-destructive' : ''}`}>{aiCommentary}</p>}
                  <Wand2 className="h-12 w-12 mx-auto mb-3" />
                  <p className="font-medium">Your product visualization will appear here.</p>
                  {/* Message adjusted as controls are always available */}
                  {!generatedImageUrl && <p className="text-xs mt-1">Upload a reference scene and click "Generate".</p>}
                </div>
              )}
            </div>
          </div>
          {/* Debug info can remain conditional if it's truly for admin/debug purposes */}
          {showDebugInfo && promptUsedByAI && !isPublishedView && (
            <div className="mt-4 p-3 border rounded-md bg-muted/50">
                <Label className="text-xs font-semibold text-muted-foreground">Technical Prompt Sent to AI:</Label>
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{promptUsedByAI}</p>
            </div>
          )}
          <Separator className="mt-6 md:mt-8 mb-0"/>
        </div>
      )}
    </div>
  );
};

export default ProductVisualizer;
