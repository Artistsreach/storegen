
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStore } from '@/contexts/StoreContext';
import { Loader2 } from 'lucide-react';
import { SHOPIFY_STORE_DOMAIN_PLACEHOLDER, SHOPIFY_STOREFRONT_ACCESS_TOKEN_PLACEHOLDER } from '@/lib/utils';

const ShopifyConnectForm = ({ open, onOpenChange, onSuccessfulConnect }) => { // Added onSuccessfulConnect
  const [domainInput, setDomainInput] = useState(''); // Renamed to avoid conflict with context's domain
  const [tokenInput, setTokenInput] = useState(''); // Renamed
  const { 
    startShopifyImportWizard, 
    isFetchingShopifyPreviewData: isLoading, // Use new loading state
    shopifyImportError, // Use error state from context
    setShopifyWizardStep // To control dialog visibility via wizard step
  } = useStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domainInput || !tokenInput) {
      // Consider using toast for errors or displaying shopifyImportError
      alert('Please enter both Shopify domain and access token.');
      return;
    }
    const success = await startShopifyImportWizard(domainInput, tokenInput);
    if (success) {
      // onOpenChange(false); // Dialog closing will be handled by StoreWizard or parent
      // setDomainInput(''); // Clear inputs if needed, or keep for editing
      // setTokenInput('');
      if (onSuccessfulConnect) onSuccessfulConnect(); // Callback for parent
    }
    // Error handling is now within startShopifyImportWizard, displayed via shopifyImportError
  };
  
  // This component might not be a Dialog itself anymore if it's part of a larger wizard.
  // For now, keeping Dialog structure but onOpenChange might be controlled by parent setting shopifyWizardStep.
  // If open is false (because shopifyWizardStep is not 1), this dialog won't show.
  // This assumes `open` prop is now tied to `shopifyWizardStep === 1`.

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // If user closes dialog manually, reset wizard or go to step 0
        // This depends on desired UX. For now, let parent handle via onOpenChange.
        onOpenChange(isOpen); 
      } else {
        onOpenChange(isOpen);
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect to Shopify</DialogTitle>
          <DialogDescription>
            Enter your Shopify store domain and Storefront Access Token to begin importing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {shopifyImportError && (
            <div className="col-span-4 p-2 text-sm text-red-600 bg-red-100 border border-red-300 rounded">
              {shopifyImportError}
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="domain" className="text-right">
              Domain
            </Label>
            <Input
              id="domain"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder={SHOPIFY_STORE_DOMAIN_PLACEHOLDER}
              className="col-span-3"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="token" className="text-right">
              Token
            </Label>
            <Input
              id="token"
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Storefront Access Token"
              className="col-span-3"
              disabled={isLoading}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isLoading} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !domainInput || !tokenInput}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect & Fetch Info'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShopifyConnectForm;
