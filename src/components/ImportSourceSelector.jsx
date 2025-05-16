import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

const ImportSourceSelector = ({ onSelectSource }) => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Import Store Data</CardTitle>
        <CardDescription>
          Select your e-commerce platform to begin importing your store and product data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="shopify" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shopify">Shopify</TabsTrigger>
            <TabsTrigger value="bigcommerce">BigCommerce</TabsTrigger>
          </TabsList>
          <TabsContent value="shopify" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Connect to your Shopify store to import your shop details, products, and collections.
            </p>
            <Button className="w-full" onClick={() => onSelectSource('shopify')}>
              Connect Shopify
            </Button>
          </TabsContent>
          <TabsContent value="bigcommerce" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Connect to your BigCommerce store to import your store settings and product catalog.
            </p>
            <Button className="w-full" onClick={() => onSelectSource('bigcommerce')}>
              Connect BigCommerce
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          You will be guided through a few steps to connect and confirm the data to be imported.
        </p>
      </CardFooter>
    </Card>
  );
};

export default ImportSourceSelector;
