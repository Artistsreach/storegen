
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
import { generateImageWithGemini, generateStoreNameSuggestion } from '@/lib/utils';
import { productTypeOptions, renderWizardStepContent, isWizardNextDisabled } from '@/components/wizard/wizardStepComponents';

const StoreWizard = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    productType: '',
    storeName: '',
    logoUrl: '',
    products: { source: 'ai', count: 5, items: [{ name: '', price: '', description: '' }] },
    prompt: '',
  });
  const [isProcessing, setIsProcessing] = useState(false); // For AI suggestions/logo gen within wizard
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
        items: [...prev.products.items, { name: '', price: '', description: '' }],
      },
    }));
  };

  const removeManualProduct = (index) => {
    const newItems = formData.products.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, products: { ...prev.products, items: newItems } }));
  };

  const suggestStoreNameHandler = async () => {
    if (!formData.productType) return;
    setIsProcessing(true);
    try {
      const productDescription = productTypeOptions.find(p => p.value === formData.productType)?.label || formData.productType;
      const name = await generateStoreNameSuggestion(productDescription);
      setFormData(prev => ({ ...prev, storeName: name }));
    } catch (error) {
      console.error("Failed to suggest store name:", error);
    }
    setIsProcessing(false);
  };

  const generateLogoHandler = async () => {
    if (!formData.storeName || !formData.productType) return;
    setIsProcessing(true);
    try {
      const logoPrompt = `A modern, clean logo for a ${formData.productType} store called "${formData.storeName}"`;
      const imageResult = await generateImageWithGemini(logoPrompt);
      setFormData(prev => ({ ...prev, logoUrl: imageResult.url }));
    } catch (error) {
      console.error("Failed to generate logo:", error);
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
    isProcessing,
    productTypeOptions,
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
