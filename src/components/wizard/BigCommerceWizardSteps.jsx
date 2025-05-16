import React from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/StoreContext'; // Import useStore

export const BigCommerceMetadataPreview = () => {
  const { bigCommercePreviewSettings, isFetchingBigCommercePreviewData, bigCommerceImportError } = useStore();

  if (isFetchingBigCommercePreviewData && !bigCommercePreviewSettings) { // Show loader if fetching and no data yet
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Fetching store settings...</span></div>;
  }

  if (bigCommerceImportError && !bigCommercePreviewSettings) {
    return <div className="text-center p-4 text-red-600">Error: {bigCommerceImportError}</div>;
  }
  
  if (!bigCommercePreviewSettings) {
    return <div className="text-center p-4">Connect to BigCommerce to see store settings, or settings are being fetched.</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Store Settings Preview (BigCommerce)</CardTitle>
        <CardDescription>Review your BigCommerce store's basic information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p><strong>Store Name:</strong> {bigCommercePreviewSettings.storeName || 'N/A'}</p>
        {bigCommercePreviewSettings.logo?.image?.url && (
          <div>
            <strong>Logo:</strong>
            <img src={bigCommercePreviewSettings.logo.image.url} alt={bigCommercePreviewSettings.logo.image.altText || 'Store Logo'} className="mt-2 max-w-xs max-h-24 object-contain border rounded"/>
          </div>
        )}
        <p><strong>Store Hash:</strong> {bigCommercePreviewSettings.storeHash || 'N/A'}</p>
        <p><strong>Status:</strong> {bigCommercePreviewSettings.status || 'N/A'}</p>
      </CardContent>
    </Card>
  );
};

export const BigCommerceItemsPreview = () => {
  const { 
    bigCommercePreviewProducts, 
    fetchBigCommerceWizardProducts, 
    isFetchingBigCommercePreviewData,
    bigCommerceImportError 
  } = useStore();

  // bigCommercePreviewProducts is an object { items: [], pageInfo: ... }
  const products = bigCommercePreviewProducts?.items || [];

  if (isFetchingBigCommercePreviewData && products.length === 0) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Fetching products...</span></div>;
  }
  
  if (bigCommerceImportError && products.length === 0) {
     return <div className="text-center p-4 text-red-600">Error fetching products: {bigCommerceImportError}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="mb-4">No products loaded yet for BigCommerce.</p>
        <Button onClick={() => fetchBigCommerceWizardProducts(10)} disabled={isFetchingBigCommercePreviewData}>
          {isFetchingBigCommercePreviewData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Load Products Preview
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Products Preview (BigCommerce)</CardTitle>
        <CardDescription>A sample of products from your BigCommerce store.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {products.slice(0, 10).map((product) => ( // Show up to 10 for preview
            <li key={product.entityId} className="p-2 border rounded text-sm flex justify-between items-center">
              <div>
                {product.name} - {product.prices?.price?.value} {product.prices?.price?.currencyCode}
              </div>
              {product.defaultImage?.url && <img src={product.defaultImage.url} alt={product.defaultImage.altText || product.name} className="w-12 h-12 object-cover rounded ml-2"/>}
            </li>
          ))}
        </ul>
        {products.length > 10 && <p className="text-xs text-muted-foreground mt-2">Showing 10 of {products.length} products fetched for preview.</p>}
        {/* Button to load more could be added here if pagination for preview is implemented */}
      </CardContent>
    </Card>
  );
};

export const BigCommerceConfirmImport = () => {
  return (
    <div className="text-center p-8">
      <CardTitle>Ready to Import from BigCommerce?</CardTitle>
      <CardDescription className="my-4">
        Confirming will start the import process for your BigCommerce store data.
      </CardDescription>
      {/* Button would be in Wizard footer */}
    </div>
  );
};
