
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wand2, UploadCloud, PlusCircle, Trash2, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
// import { generateImageWithGemini } from '@/lib/utils'; // Old import, to be replaced
import { generateLogoWithGemini } from '@/lib/geminiImageGeneration'; // New import for logo generation
import { generateStoreNameSuggestions } from '@/lib/gemini'; // Import the new function
import { generateProductWithGemini } from '@/lib/geminiProductGeneration'; // New import for product generation
import { productTypeOptions, renderWizardStepContent, isWizardNextDisabled } from '@/components/wizard/wizardStepComponents';

const StoreWizard = () => {
  const [step, setStep] = useState(1);
  const [storeNameSuggestions, setStoreNameSuggestions] = useState([]);
  const [formData, setFormData] = useState({
    productType: '',
    storeName: '',
    logoUrl: '',
    products: { source: 'ai', count: 3, items: [] }, // Default to 3 AI products, items start empty
    prompt: '',
  });
  const [isProcessing, setIsProcessing] = useState(false); // For AI suggestions/logo gen within wizard
  const [suggestionError, setSuggestionError] = useState(null);
  const { generateStoreFromWizard, isGenerating } = useStore(); // isGenerating is for final store creation

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductTypeChange = (value) => {
    setFormData(prev => ({ ...prev, productType: value }));
  };

  const handleProductSourceChange = (value) => {
    setFormData(prev => ({ ...prev, products: { ...prev.products, source: value } }));
  };

  const handleProductCountChange = (e) => {
    setFormData(prev => ({ ...prev, products: { ...prev.products, count: parseInt(e.target.value) || 1 } }));
  };

  const handleManualProductChange = (index, field, value) => {
    const newItems = [...formData.products.items];
    newItems[index][field] = value;
    setFormData(prev => ({ ...prev, products: { ...prev.products, items: newItems } }));
  };

  const addManualProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: {
        ...prev.products,
        // Add imageUrl to manual product structure for consistency, though it might not be used for manual
        items: [...prev.products.items, { name: '', price: '', description: '', imageUrl: '' }],
      },
    }));
  };

  const removeManualProduct = (index) => {
    const newItems = formData.products.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, products: { ...prev.products, items: newItems } }));
  };

  const suggestStoreNameHandler = async () => {
    if (!formData.productType) {
      setSuggestionError("Please select a product type first.");
      return;
    }
    setIsProcessing(true);
    setStoreNameSuggestions([]);
    setSuggestionError(null);
    try {
      const productDescription = productTypeOptions.find(p => p.value === formData.productType)?.label || formData.productType;
      // Use the new function that returns multiple suggestions
      const result = await generateStoreNameSuggestions(productDescription);
      if (result.error) {
        console.error("Failed to suggest store names:", result.error);
        setSuggestionError(result.error);
        setStoreNameSuggestions([]);
      } else if (result.suggestions && result.suggestions.length > 0) {
        setStoreNameSuggestions(result.suggestions);
        // Optionally, set the first suggestion as the current store name
        // setFormData(prev => ({ ...prev, storeName: result.suggestions[0] }));
      } else {
        setSuggestionError("No suggestions received, or response was empty.");
        setStoreNameSuggestions([]);
      }
    } catch (error) {
      console.error("Error in suggestStoreNameHandler:", error);
      setSuggestionError(`An unexpected error occurred: ${error.message}`);
      setStoreNameSuggestions([]);
    }
    setIsProcessing(false);
  };

  const handleSuggestionClick = (name) => {
    setFormData(prev => ({ ...prev, storeName: name }));
    setStoreNameSuggestions([]); // Clear suggestions after one is picked
  };

  const generateLogoHandler = async () => {
    if (!formData.storeName) {
      // ProductType might not be strictly necessary if the new function only uses storeName
      // but it's good for context if the underlying prompt generation uses it.
      // The new `generateLogoWithGemini` only takes `storeName`.
      console.warn("Store name is required to generate a logo.");
      setSuggestionError("Please ensure a store name is set before generating a logo.");
      return;
    }
    setIsProcessing(true);
    setSuggestionError(null); // Clear previous errors
    try {
      // The new generateLogoWithGemini function takes storeName directly
      // and handles its own prompt generation.
      const result = await generateLogoWithGemini(formData.storeName);
      if (result && result.imageData) {
        // Assuming the imageData is base64 encoded PNG.
        // Create a data URL to display the image.
        const imageUrl = `data:image/png;base64,${result.imageData}`;
        setFormData(prev => ({ ...prev, logoUrl: imageUrl }));
        console.log("Logo generated and URL set:", imageUrl.substring(0, 50) + "...");
        if (result.textResponse) {
          console.log("Gemini text response for logo:", result.textResponse);
        }
      } else {
        console.error("Failed to generate logo: No image data received.");
        setSuggestionError("Failed to generate logo. The AI did not return an image.");
      }
    } catch (error) {
      console.error("Failed to generate logo:", error);
      setSuggestionError(`Logo generation failed: ${error.message}`);
    }
    setIsProcessing(false);
  };

  const generateAiProductsHandler = async () => {
    if (!formData.productType || !formData.storeName) {
      setSuggestionError("Please provide a product type and store name before generating AI products.");
      return;
    }
    setIsProcessing(true);
    setSuggestionError(null);
    const generatedItems = [];
    try {
      let logoImageBase64 = null;
      let logoMimeType = 'image/png'; // Default, will be updated if logoUrl is parsed

      if (formData.logoUrl && formData.logoUrl.startsWith('data:')) {
        const parts = formData.logoUrl.split(',');
        if (parts.length === 2) {
          const metaPart = parts[0];
          logoImageBase64 = parts[1];
          const mimeTypeMatch = metaPart.match(/:(.*?);/);
          if (mimeTypeMatch && mimeTypeMatch[1]) {
            logoMimeType = mimeTypeMatch[1];
          }
          console.log(`[StoreWizard] Using logo for product generation. MimeType: ${logoMimeType}`);
        } else {
          console.warn("[StoreWizard] formData.logoUrl is not a valid data URL format.");
        }
      }

      for (let i = 0; i < formData.products.count; i++) {
        console.log(`Generating AI product ${i + 1} of ${formData.products.count}...`);
        // Update processing message for user if possible, or just log
        // Pass logo data to generateProductWithGemini
        const productData = await generateProductWithGemini(
          formData.productType, 
          formData.storeName,
          logoImageBase64, // This will be null if no logoUrl or invalid format
          logoMimeType      // This will be 'image/png' or parsed type
        );
        if (productData && productData.imageData) {
          generatedItems.push({
            name: productData.title,
            description: productData.description,
            price: productData.price,
            // Assuming productData.imageData is base64. Mime type could be dynamic if API provides it.
            imageUrl: `data:image/png;base64,${productData.imageData}`, 
          });
        } else {
          // Handle partial success or failure for one product
          console.warn(`Failed to generate full data for product ${i + 1}. Skipping.`);
        }
      }
      setFormData(prev => ({
        ...prev,
        products: { ...prev.products, items: generatedItems },
      }));
      if (generatedItems.length === 0 && formData.products.count > 0) {
        setSuggestionError("AI failed to generate any products. Please try again or adjust settings.");
      }
    } catch (error) {
      console.error("Error generating AI products:", error);
      setSuggestionError(`Failed to generate AI products: ${error.message}`);
    }
    setIsProcessing(false);
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    await generateStoreFromWizard(formData);
  };

  const stepProps = {
    formData,
    handleInputChange,
    handleProductTypeChange,
    handleProductSourceChange,
    handleProductCountChange,
    handleManualProductChange,
    addManualProduct,
    removeManualProduct,
    suggestStoreName: suggestStoreNameHandler,
    generateLogo: generateLogoHandler,
    generateAiProducts: generateAiProductsHandler, // Add new handler to props
    isProcessing,
    productTypeOptions,
    storeNameSuggestions,
    handleSuggestionClick,
    suggestionError,
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Store Creation Wizard</CardTitle>
        <CardDescription>Step {step} of 5: Let's build your online store together!</CardDescription>
        <div className="w-full bg-muted rounded-full h-2.5 mt-2">
            <motion.div 
                className="bg-primary h-2.5 rounded-full"
                initial={{ width: "0%"}}
                animate={{ width: `${(step / 5) * 100}%`}}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            />
        </div>
      </CardHeader>
      <CardContent className="min-h-[250px] flex items-center">
        <AnimatePresence mode="wait">
          {renderWizardStepContent(step, stepProps)}
        </AnimatePresence>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={step === 1 || isGenerating}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        {step < 5 ? (
          <Button onClick={nextStep} disabled={isWizardNextDisabled(step, formData) || isGenerating}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isGenerating || !formData.prompt}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Generate Store
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default StoreWizard;
