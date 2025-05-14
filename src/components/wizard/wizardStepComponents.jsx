
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader2, Wand2, Sparkles, PlusCircle, Trash2 } from 'lucide-react';

export const productTypeOptions = [
  { value: "fashion", label: "Fashion & Apparel" },
  { value: "electronics", label: "Electronics & Gadgets" },
  { value: "food", label: "Food & Beverage" },
  { value: "jewelry", label: "Jewelry & Accessories" },
  { value: "homedecor", label: "Home Decor & Furnishings" },
  { value: "beauty", label: "Beauty & Personal Care" },
  { value: "books", label: "Books & Media" },
  { value: "sports", label: "Sports & Outdoors" },
  { value: "toys", label: "Toys & Games" },
  { value: "general", label: "General Merchandise" },
];

export const renderWizardStepContent = (step, props) => {
  const {
    formData, handleInputChange, handleProductTypeChange, handleProductSourceChange,
    handleProductCountChange, handleManualProductChange, addManualProduct, removeManualProduct,
    suggestStoreName, generateLogo, isProcessing, productTypeOptions: pto, // Renamed to avoid conflict
  } = props;

  switch (step) {
    case 1: // Product Type
      return (
        <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4 w-full">
          <Label htmlFor="productType" className="text-lg font-semibold">What kind of products will your store sell?</Label>
          <Select onValueChange={handleProductTypeChange} value={formData.productType}>
            <SelectTrigger id="productType">
              <SelectValue placeholder="Select product category..." />
            </SelectTrigger>
            <SelectContent>
              {pto.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">This helps us tailor product suggestions and store design.</p>
        </motion.div>
      );
    case 2: // Store Name
      return (
        <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4 w-full">
          <Label htmlFor="storeName" className="text-lg font-semibold">What's your store name?</Label>
          <div className="flex gap-2">
            <Input id="storeName" name="storeName" value={formData.storeName} onChange={handleInputChange} placeholder="e.g., 'The Cozy Corner Bookstore'" />
            <Button type="button" variant="outline" onClick={suggestStoreName} disabled={isProcessing || !formData.productType}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Suggest</span>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Choose a catchy name or let us suggest one based on your product type!</p>
        </motion.div>
      );
    case 3: // Logo
      return (
        <motion.div key="step3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4 w-full">
          <Label className="text-lg font-semibold">Design a logo for your store</Label>
          <div className="flex flex-col items-center gap-4 p-4 border rounded-md">
            {formData.logoUrl ? (
              <img-replace src={formData.logoUrl} alt="Generated logo" className="w-32 h-32 object-contain rounded-md border" />
            ) : (
              <div className="w-32 h-32 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                Logo Preview
              </div>
            )}
            <Button type="button" onClick={generateLogo} disabled={isProcessing || !formData.storeName || !formData.productType}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Logo with AI
            </Button>
            <p className="text-xs text-muted-foreground text-center">AI will generate a logo based on your store name and product type. (Uses Gemini API - Placeholder)</p>
          </div>
           <Label htmlFor="logoUrl" className="text-sm">Or paste an image URL:</Label>
           <Input id="logoUrl" name="logoUrl" value={formData.logoUrl} onChange={handleInputChange} placeholder="https://example.com/logo.png" />
        </motion.div>
      );
    case 4: // Products
      return (
        <motion.div key="step4" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6 w-full">
          <Label className="text-lg font-semibold">How do you want to add products?</Label>
          <Select onValueChange={handleProductSourceChange} value={formData.products.source}>
            <SelectTrigger>
              <SelectValue placeholder="Choose product source..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ai">Generate with AI</SelectItem>
              <SelectItem value="manual">Add Manually</SelectItem>
              <SelectItem value="csv" disabled>Upload CSV (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>

          {formData.products.source === 'ai' && (
            <div className="space-y-2">
              <Label htmlFor="productCount">Number of AI Products to Generate</Label>
              <Input id="productCount" type="number" min="1" max="10" value={formData.products.count} onChange={handleProductCountChange} />
            </div>
          )}

          {formData.products.source === 'manual' && (
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {formData.products.items.map((item, index) => (
                <Card key={index} className="p-4 space-y-3 relative">
                   <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeManualProduct(index)} disabled={formData.products.items.length <= 1}>
                      <Trash2 className="h-4 w-4 text-destructive"/>
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <Label htmlFor={`productName-${index}`}>Product Name</Label>
                          <Input id={`productName-${index}`} value={item.name} onChange={(e) => handleManualProductChange(index, 'name', e.target.value)} placeholder="e.g., 'Handmade Coffee Mug'" />
                      </div>
                      <div>
                          <Label htmlFor={`productPrice-${index}`}>Price (USD)</Label>
                          <Input id={`productPrice-${index}`} type="number" value={item.price} onChange={(e) => handleManualProductChange(index, 'price', e.target.value)} placeholder="e.g., '24.99'" />
                      </div>
                  </div>
                  <div>
                      <Label htmlFor={`productDescription-${index}`}>Short Description (Optional)</Label>
                      <Textarea id={`productDescription-${index}`} value={item.description} onChange={(e) => handleManualProductChange(index, 'description', e.target.value)} placeholder="e.g., 'Beautifully crafted ceramic mug, perfect for your morning coffee.'" rows={2}/>
                  </div>
                </Card>
              ))}
              <Button type="button" variant="outline" onClick={addManualProduct} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Product
              </Button>
            </div>
          )}
        </motion.div>
      );
    case 5: // Final Prompt
      return (
        <motion.div key="step5" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-4 w-full">
          <Label htmlFor="prompt" className="text-lg font-semibold">Describe your store's overall style and feel</Label>
          <Textarea
            id="prompt"
            name="prompt"
            value={formData.prompt}
            onChange={handleInputChange}
            placeholder="e.g., 'A minimalist and modern design with a focus on high-quality product imagery. Use a cool color palette.' OR 'A vibrant and playful store with bold colors and fun animations.'"
            className="min-h-[100px]"
          />
          <p className="text-sm text-muted-foreground">This will influence the theme, layout, and imagery. Your store name, logo, and products are already included.</p>
        </motion.div>
      );
    default:
      return null;
  }
};

export const isWizardNextDisabled = (step, formData) => {
  if (step === 1 && !formData.productType) return true;
  if (step === 2 && !formData.storeName) return true;
  // Removed step 3 logoUrl check as it can be optional or AI generated
  if (step === 4 && formData.products.source === 'manual' && formData.products.items.some(p => !p.name || !p.price)) return true;
  return false;
};
