
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

const ShopifyConnectForm = ({ open, onOpenChange }) => {
  const [domain, setDomain] = useState('');
  const [token, setToken] = useState('');
  const { importShopifyStore, isGenerating: isLoading } = useStore(); // Re-use isGenerating as isLoading

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain || !token) {
      alert('Please enter both Shopify domain and access token.');
      return;
    }
    const success = await importShopifyStore(domain, token);
    if (success) {
      onOpenChange(false); // Close dialog on success
      setDomain('');
      setToken('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import from Shopify</DialogTitle>
          <DialogDescription>
            Enter your Shopify store domain and Storefront Access Token to import your store details and products.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="domain" className="text-right">
              Domain
            </Label>
            <Input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
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
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Storefront Access Token"
              className="col-span-3"
              disabled={isLoading}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading || !domain || !token}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Store'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShopifyConnectForm;
