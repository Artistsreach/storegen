import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext'; // Assuming context will handle BC connection
import { fetchStoreSettings } from '@/lib/bigcommerce'; // For initial validation

const BigCommerceConnectForm = ({ open, onOpenChange, onSuccessfulConnect }) => {
  const [storeDomain, setStoreDomain] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { startBigCommerceImportWizard, bigCommerceImportError, isFetchingBigCommercePreviewData } = useStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Use isFetchingBigCommercePreviewData from context as isLoading
    // Use bigCommerceImportError from context as error
    // No need for local setIsLoading, setError, setSuccessMessage if context handles this globally for BC import

    if (!storeDomain || !apiToken) {
      // This local error check can remain, or be moved to context function
      // For now, let's keep it here for immediate UI feedback.
      // A context-level error will also be set by startBigCommerceImportWizard if it fails.
      alert("Both Store Domain and API Token are required."); // Simple alert for now
      return;
    }

    // startBigCommerceImportWizard will handle loading states and errors in context.
    // It will also call fetchStoreSettings internally.
    // It doesn't return a boolean success; success is determined by wizardStep advancing
    // and no bigCommerceImportError being set in context.
    await startBigCommerceImportWizard(storeDomain, apiToken);

    // onSuccessfulConnect is called by ImportWizard when the step actually changes
    // and no error is present. So, we don't call it directly here based on 'success'.
    // The ImportWizard component will observe the wizardStep from context.
    // If startBigCommerceImportWizard successfully sets the step to 2 and fetches data without error,
    // the wizard will proceed.
    if (onSuccessfulConnect) {
        // This callback might be used by ImportWizard to know the form submission was attempted.
        // The actual "success" (advancing step) is managed by context.
        onSuccessfulConnect({ storeDomain, apiToken }); 
    }
    // Error display will be handled by observing bigCommerceImportError from context.
  };
  
  // useEffect to listen to context error or step changes if needed for local UI updates
  // useEffect(() => {
  //   if (bigCommerceImportError) {
  //     // Display error, perhaps in a toast or dedicated error area
  //   }
  // }, [bigCommerceImportError]);


  if (!open) {
    return null;
  }

  return (
    <div className="w-full">
      {/* CardHeader is now part of ImportWizard.jsx for step 1 of BigCommerce */}
      {/* So we only need CardContent and CardFooter here if it's embedded */}
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6"> {/* Added pt-6 if CardHeader is removed from here */}
          <div className="space-y-2">
            <Label htmlFor="bc-store-domain">Store Domain</Label>
            <Input
              id="bc-store-domain"
              type="text"
              placeholder="e.g., mystore.mybigcommerce.com"
              value={storeDomain}
              onChange={(e) => setStoreDomain(e.target.value.trim())}
              disabled={isFetchingBigCommercePreviewData}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc-api-token">Storefront API Token</Label>
            <Input
              id="bc-api-token"
              type="password"
              placeholder="Enter your Storefront API Token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value.trim())}
              disabled={isFetchingBigCommercePreviewData}
            />
          </div>
          {bigCommerceImportError && (
            <p className="text-sm text-red-600 flex items-center">
              <XCircle className="mr-2 h-4 w-4" /> {bigCommerceImportError}
            </p>
          )}
          {/* Success message can be implicit by wizard advancing, or a temporary local one */}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
           <Button type="submit" className="w-full" disabled={isFetchingBigCommercePreviewData}>
            {isFetchingBigCommercePreviewData ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {isFetchingBigCommercePreviewData ? 'Connecting...' : 'Connect to BigCommerce'}
          </Button>
          {/* Cancel button is usually in the main wizard footer, but can be kept if this form is modal-like */}
          {/* <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)} disabled={isFetchingBigCommercePreviewData}>
            Cancel
          </Button> */}
        </CardFooter>
      </form>
    </div>
  );
};

export default BigCommerceConnectForm;
