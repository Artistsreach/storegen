
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import StoreGenerator from '@/components/StoreGenerator';
import StoreList from '@/components/StoreList';
import ShopifyConnectForm from '@/components/ShopifyConnectForm';
import StoreWizard from '@/components/StoreWizard';
import { Button } from '@/components/ui/button';
import { ImageMinus as ImportIcon, ListChecks as WizardIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  const [isShopifyDialogOpen, setIsShopifyDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ai-prompt");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 container mx-auto px-4 py-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Build Your Dream E-commerce Store
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Choose your path: use our AI-powered prompt generator, follow a step-by-step wizard, or import an existing store from Shopify.
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-3xl mx-auto mb-12">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 mb-6">
            <TabsTrigger value="ai-prompt">AI Prompt</TabsTrigger>
            <TabsTrigger value="wizard">Step-by-Step Wizard</TabsTrigger>
            <TabsTrigger value="shopify-import" className="hidden md:inline-flex" onClick={() => setIsShopifyDialogOpen(true)}>
              Import Shopify
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ai-prompt">
            <StoreGenerator />
          </TabsContent>
          <TabsContent value="wizard">
            <StoreWizard />
          </TabsContent>
          <TabsContent value="shopify-import">
             <div className="text-center p-8 border rounded-lg bg-card">
                <p className="text-muted-foreground mb-4">Click the button below to open the Shopify import dialog.</p>
                 <Button onClick={() => setIsShopifyDialogOpen(true)} variant="default" size="lg">
                    <ImportIcon className="mr-2 h-5 w-5" />
                    Import from Shopify
                </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mb-8 flex justify-center md:hidden"> {/* Shopify button for mobile */}
          <Button onClick={() => setIsShopifyDialogOpen(true)} variant="outline" size="lg" className="w-full max-w-xs">
            <ImportIcon className="mr-2 h-5 w-5" />
            Import from Shopify
          </Button>
        </div>
        
        <StoreList />
      </motion.div>
      
      <footer className="mt-auto py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} StoreGen AI. All rights reserved.</p>
      </footer>

      <ShopifyConnectForm open={isShopifyDialogOpen} onOpenChange={setIsShopifyDialogOpen} />
    </div>
  );
};

export default Dashboard;
