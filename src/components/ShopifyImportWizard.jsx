import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import ShopifyConnectForm from '@/components/ShopifyConnectForm'; // Step 1
import { 
    ShopifyMetadataPreview, 
    ShopifyItemsPreview, 
    ShopifyConfirmImport 
} from './wizard/ShopifyWizardSteps'; // Step 2, 3, 4

const ShopifyImportWizard = ({ isOpen, onClose }) => {
  const {
    shopifyWizardStep,
    setShopifyWizardStep,
    resetShopifyWizardState,
    shopifyPreviewMetadata,
    shopifyPreviewProducts, // Needed for checking if already loaded
    shopifyPreviewCollections, // Needed for checking if already loaded
    isFetchingShopifyPreviewData,
    isGenerating, // For final import processing
    shopifyImportError,
    fetchShopifyWizardProducts, // Function to fetch products
    fetchShopifyWizardCollections, // Function to fetch collections
    finalizeShopifyImportFromWizard,
  } = useStore();

  useEffect(() => {
    // If the wizard is opened externally, set to step 1 if it's idle (step 0)
    if (isOpen && shopifyWizardStep === 0) {
      setShopifyWizardStep(1);
    }
    // If wizard is closed externally, reset its state
    if (!isOpen && shopifyWizardStep !== 0) {
      resetShopifyWizardState();
    }
  }, [isOpen, shopifyWizardStep, setShopifyWizardStep, resetShopifyWizardState]);

  if (!isOpen || shopifyWizardStep === 0) {
    return null; // Wizard is not active
  }

  const totalSteps = 4; // 1: Connect, 2: Meta Preview, 3: Items Preview, 4: Confirm

  const handleNext = async () => { // Make async if handleFinish is called directly
    if (shopifyWizardStep < totalSteps) {
      if (shopifyWizardStep === 2) {
        // Moving from Metadata Preview (2) to Items Preview (3)
        let productsFetched = false;
        let collectionsFetched = false;

        if (!shopifyPreviewProducts || shopifyPreviewProducts.edges.length === 0) {
            fetchShopifyWizardProducts(10); 
            productsFetched = true;
        }
        if (!shopifyPreviewCollections || shopifyPreviewCollections.edges.length === 0) {
            fetchShopifyWizardCollections(10);
            collectionsFetched = true;
        }
        setShopifyWizardStep(3);

      } else if (shopifyWizardStep === 3) {
        // Moving from Items Preview (3) directly to Finish, skipping Confirm (4)
        await handleFinish(); // Call handleFinish directly
      }
      // Step 1 (ConnectForm) advances to step 2 automatically.
    }
  };

  const handleBack = () => {
    if (shopifyWizardStep > 1) { // Allow going back from any step > 1
      setShopifyWizardStep(shopifyWizardStep - 1);
    }
  };

  const handleCancel = () => {
    resetShopifyWizardState();
    if (onClose) onClose();
  };

  const handleFinish = async () => {
    const success = await finalizeShopifyImportFromWizard();
    if (success) {
      if (onClose) onClose(); // Close wizard on successful import
    }
    // Errors are handled by toast within finalizeShopifyImportFromWizard
  };
  
  const renderStepContent = () => {
    switch (shopifyWizardStep) {
      case 1:
        // ShopifyConnectForm is a dialog, so it manages its own visibility.
        // The `open` prop for ShopifyConnectForm should be true when shopifyWizardStep is 1.
        // `onOpenChange` for ShopifyConnectForm should call `handleCancel` if closed.
        // `onSuccessfulConnect` should set shopifyWizardStep to 2 (done by startShopifyImportWizard in context).
        return (
          <ShopifyConnectForm
            open={shopifyWizardStep === 1}
            onOpenChange={(isOpen) => {
              if (!isOpen) handleCancel();
            }}
            onSuccessfulConnect={() => { 
              // startShopifyImportWizard in context already sets step to 2.
              // No explicit action needed here if ShopifyConnectForm's onSuccessfulConnect is just a notification.
            }}
          />
        );
      case 2:
        return <ShopifyMetadataPreview />;
      case 3:
        return <ShopifyItemsPreview />;
      // Step 4 (ShopifyConfirmImport) is now skipped. 
      // If we wanted to keep it conceptually for progress, but not show its content:
      // case 4: return <div className="text-center p-4">Finalizing...</div>; 
      // For now, effectively step 3 is the last content step.
      default:
        // If step becomes 4 due to some logic, it means handleFinish was called.
        // We can show a generic finalizing message or rely on isGenerating state.
        if (shopifyWizardStep === 4 && isGenerating) {
          return <div className="flex flex-col items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin mb-4" /> <p>Finalizing import, please wait...</p></div>;
        }
        return <div>Invalid Wizard Step or Finalizing...</div>;
    }
  };

  // If step 1, ShopifyConnectForm (dialog) is rendered. The wizard card below is for steps 2+
  if (shopifyWizardStep === 1) {
    return renderStepContent();
  }

  return (
    // This outer div acts as a modal overlay for steps 2+
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Import from Shopify</CardTitle>
          <CardDescription>Step {shopifyWizardStep} of {totalSteps}</CardDescription>
          <div className="w-full bg-muted rounded-full h-2.5 mt-2">
            <motion.div
              className="bg-primary h-2.5 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(shopifyWizardStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </CardHeader>
        <CardContent className="min-h-[250px] flex items-center justify-center">
          {/* AnimatePresence might be useful here if step components are direct children */}
          {renderStepContent()}
        </CardContent>
        <CardFooter className="flex justify-between">
          {shopifyWizardStep > 1 && ( // Show Cancel for all steps, Back for steps > 1 (or > 2 if step 1 is dialog)
            <Button variant="outline" onClick={handleCancel} disabled={isGenerating || isFetchingShopifyPreviewData}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
          )}
          <div>
            {shopifyWizardStep > 1 && shopifyWizardStep < totalSteps && ( // Back button for steps 2 and 3
                 <Button variant="outline" onClick={handleBack} disabled={isGenerating || isFetchingShopifyPreviewData} className="mr-2">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                 </Button>
            )}
            {/* Next button for step 2, becomes "Finalize" for step 3 */}
            {shopifyWizardStep === 2 && ( 
              <Button onClick={handleNext} disabled={isGenerating || isFetchingShopifyPreviewData}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {shopifyWizardStep === 3 && ( // "Finalize Import" button for step 3
              <Button onClick={handleFinish} disabled={isGenerating || isFetchingShopifyPreviewData}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Finalize Import
              </Button>
            )}
            {/* Original Finish button for step 4 is no longer explicitly shown if step 3 calls handleFinish */}
            {/* However, if handleNext from step 3 were to set step to 4 before calling handleFinish, 
                 this might be needed, but the current change calls handleFinish directly from step 3's "Next" action.
                 For safety, let's keep a conditional render for step 4 if it's reached while generating.
            */}
            {shopifyWizardStep === totalSteps && isGenerating && ( 
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

export default ShopifyImportWizard;
