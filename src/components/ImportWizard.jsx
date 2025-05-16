import React, { useState, useEffect } from 'react'; // Added useState
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import ShopifyConnectForm from '@/components/ShopifyConnectForm'; // Step 1 for Shopify
import BigCommerceConnectForm from '@/components/BigCommerceConnectForm'; // Added
import { 
    ShopifyMetadataPreview, 
    ShopifyItemsPreview, 
} from './wizard/ShopifyWizardSteps'; // Step 2, 3 for Shopify
import {
    BigCommerceMetadataPreview,
    BigCommerceItemsPreview,
    // BigCommerceConfirmImport // This step might be skipped
} from './wizard/BigCommerceWizardSteps'; // Added

const ImportWizard = ({ isOpen, onClose, initialImportSource = 'shopify' }) => {
  const [currentImportSource, setCurrentImportSource] = useState(initialImportSource);
  const store = useStore();

  // Configuration object to map currentImportSource to context values
  const sourceConfig = {
    shopify: {
      wizardStep: store.shopifyWizardStep,
      setWizardStep: store.setShopifyWizardStep,
      resetWizardState: store.resetShopifyWizardState,
      previewMetadata: store.shopifyPreviewMetadata,
      previewProducts: store.shopifyPreviewProducts, // This is { edges: [], pageInfo: ... }
      previewCollections: store.shopifyPreviewCollections,
      isFetchingPreviewData: store.isFetchingShopifyPreviewData,
      importError: store.shopifyImportError,
      fetchWizardProducts: store.fetchShopifyWizardProducts,
      fetchWizardCollections: store.fetchShopifyWizardCollections, // Added
      finalizeImportFromWizard: store.finalizeShopifyImportFromWizard,
      ConnectFormComponent: ShopifyConnectForm,
      MetadataPreviewComponent: ShopifyMetadataPreview,
      ItemsPreviewComponent: ShopifyItemsPreview,
      totalSteps: 4, // Connect, Meta, Items, (Implicit)Finalize
    },
    bigcommerce: {
      wizardStep: store.bigCommerceWizardStep,
      setWizardStep: store.setBigCommerceWizardStep,
      resetWizardState: store.resetBigCommerceWizardState,
      previewMetadata: store.bigCommercePreviewSettings, // Settings for BC
      previewProducts: store.bigCommercePreviewProducts, // This is { items: [], pageInfo: ... }
      isFetchingPreviewData: store.isFetchingBigCommercePreviewData,
      importError: store.bigCommerceImportError,
      fetchWizardProducts: store.fetchBigCommerceWizardProducts, // Fetches settings then products
      finalizeImportFromWizard: store.finalizeBigCommerceImportFromWizard,
      ConnectFormComponent: BigCommerceConnectForm,
      MetadataPreviewComponent: BigCommerceMetadataPreview,
      ItemsPreviewComponent: BigCommerceItemsPreview,
      totalSteps: 4, // Connect, Settings Preview, Products Preview, (Implicit)Finalize
    },
  };

  const activeConfig = sourceConfig[currentImportSource];
  const { 
    wizardStep, setWizardStep, resetWizardState, 
    previewMetadata, previewProducts, previewCollections,
    isFetchingPreviewData, importError,
    fetchWizardProducts, fetchWizardCollections, finalizeImportFromWizard,
    ConnectFormComponent, MetadataPreviewComponent, ItemsPreviewComponent,
    totalSteps
  } = activeConfig;
  
  // isGenerating is global for now, can be made source-specific if needed
  const { isGenerating } = store; 


  useEffect(() => {
    setCurrentImportSource(initialImportSource);
    // Reset the other source's wizard when switching
    if (initialImportSource === 'shopify') sourceConfig.bigcommerce.resetWizardState();
    if (initialImportSource === 'bigcommerce') sourceConfig.shopify.resetWizardState();
  }, [initialImportSource]);

  useEffect(() => {
    if (isOpen && wizardStep === 0) {
      setWizardStep(1);
    }
    if (!isOpen && wizardStep !== 0) {
      resetWizardState();
    }
  }, [isOpen, wizardStep, setWizardStep, resetWizardState]);

  if (!isOpen || wizardStep === 0) {
    return null;
  }

  const handleNext = async () => {
    if (wizardStep < totalSteps) {
      if (currentImportSource === 'shopify') {
        if (wizardStep === 2) { // From Meta Preview to Items Preview
          if (!previewProducts || previewProducts.edges.length === 0) {
            await fetchWizardProducts(10); // Shopify products
          }
          if (!previewCollections || previewCollections.edges.length === 0) {
            await fetchWizardCollections(10); // Shopify collections
          }
          setWizardStep(3);
        } else if (wizardStep === 3) { // From Items Preview to Finalize
          await handleFinish(); 
        }
      } else if (currentImportSource === 'bigcommerce') {
        if (wizardStep === 1) { // From Connect to Settings Preview (BC connect calls context that fetches settings)
           // BigCommerceConnectForm's onSuccessfulConnect calls startBigCommerceImportWizard, which sets step to 2
           // and fetches settings. So, no explicit setWizardStep(2) or fetch needed here if form handles it.
           // If connect form doesn't auto-advance, then: setWizardStep(2); await fetchBigCommerceWizardSettings();
        } else if (wizardStep === 2) { // From Settings Preview to Products Preview
          if (!previewProducts || previewProducts.items.length === 0) {
            await fetchWizardProducts(10); // BigCommerce products
          }
          setWizardStep(3);
        } else if (wizardStep === 3) { // From Products Preview to Finalize
          await handleFinish();
        }
      }
    }
  };

  const handleBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const handleCancel = () => {
    resetWizardState();
    if (onClose) onClose();
  };

  const handleFinish = async () => {
    const success = await finalizeImportFromWizard(); // No need to pass currentImportSource, context function knows
    if (success) {
      if (onClose) onClose();
    }
  };
  
  const renderStepContent = () => {
    switch (wizardStep) {
      case 1: // Connect Step
        return (
          <ConnectFormComponent
            open={wizardStep === 1} // Prop for the form component itself
            onOpenChange={(isOpenState) => { // For dialog-like forms to signal close
              if (!isOpenState) handleCancel();
            }}
            onSuccessfulConnect={(credentials) => {
              // ShopifyConnectForm calls startShopifyImportWizard which sets step to 2.
              // BigCommerceConnectForm calls startBigCommerceImportWizard which sets step to 2.
              // So, no explicit setWizardStep(2) needed here if forms/context handle it.
              // If direct advancement is needed: setWizardStep(2);
              if (currentImportSource === 'shopify') store.startShopifyImportWizard(credentials.domain, credentials.token); // Assuming connect form passes these
              // For BigCommerce, startBigCommerceImportWizard is called from within BigCommerceConnectForm
            }}
          />
        );
      case 2: // Metadata Preview Step
        return <MetadataPreviewComponent />;
      case 3: // Items Preview Step
        return <ItemsPreviewComponent />;
      default: // Finalizing or Invalid Step
        if (wizardStep === totalSteps && isGenerating) {
          return <div className="flex flex-col items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin mb-4" /> <p>Finalizing import, please wait...</p></div>;
        }
        return <div>Invalid Wizard Step or Finalizing... ({wizardStep})</div>;
    }
  };

  // ShopifyConnectForm is a Dialog and manages its own overlay.
  // BigCommerceConnectForm is embedded in the wizard card.
  if (wizardStep === 1 && currentImportSource === 'shopify') {
    return renderStepContent(); 
  }

  const cardTitleText = currentImportSource === 'shopify' ? 'Import from Shopify' : 
                       currentImportSource === 'bigcommerce' ? 'Import from BigCommerce' : 
                       'Import Store Data';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {wizardStep === 1 && currentImportSource === 'bigcommerce' 
              ? 'Connect to BigCommerce' 
              : cardTitleText}
          </CardTitle>
          <CardDescription>
            {wizardStep === 1 && currentImportSource === 'bigcommerce'
              ? 'Enter your store domain and API token.'
              : `Step ${wizardStep} of ${totalSteps}`}
          </CardDescription>
          <div className="w-full bg-muted rounded-full h-2.5 mt-2">
            <motion.div
              className="bg-primary h-2.5 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(wizardStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </CardHeader>
        <CardContent className="min-h-[250px] flex items-center justify-center">
          {renderStepContent()}
        </CardContent>
        <CardFooter className="flex justify-between">
          {wizardStep > 1 && ( 
            <Button variant="outline" onClick={handleCancel} disabled={isGenerating || isFetchingPreviewData}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
          )}
          <div>
            {wizardStep > 1 && wizardStep < totalSteps && ( 
                 <Button variant="outline" onClick={handleBack} disabled={isGenerating || isFetchingPreviewData} className="mr-2">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                 </Button>
            )}
            {/* Next/Finalize button logic */}
            {wizardStep === 1 && currentImportSource === 'bigcommerce' && ( /* Next for BC connect if it doesn't auto-advance */
                <Button onClick={handleNext} disabled={isGenerating || isFetchingPreviewData}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )}
            {wizardStep === 2 && ( /* Next for step 2 (Metadata/Settings preview) */
              <Button onClick={handleNext} disabled={isGenerating || isFetchingPreviewData}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {wizardStep === 3 && ( /* Finalize for step 3 (Items preview) */
              <Button onClick={handleFinish} disabled={isGenerating || isFetchingPreviewData}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Finalize Import
              </Button>
            )}
            
            {wizardStep === totalSteps && isGenerating && ( 
              <Button disabled={true}>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ImportWizard;
