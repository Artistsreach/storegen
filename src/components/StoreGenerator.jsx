
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2 } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';

const promptExamples = [
  "Create a luxury jewelry store called 'Elegance' with diamond rings and gold necklaces, featuring a dark, sophisticated theme.",
  "Build a tech gadget store named 'FutureTech' with the latest smartphones and accessories, using a futuristic blue and silver color scheme.",
  "Design an organic food market 'GreenHarvest' with fresh produce and healthy snacks, emphasizing natural textures and earthy tones.",
  "Make a trendy fashion boutique 'Urban Threads' with summer dresses and casual wear, aiming for a bright, minimalist aesthetic."
];

const StoreGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedExample, setSelectedExample] = useState(null);
  const { generateStore, isGenerating } = useStore();

  const handleExampleClick = (index) => {
    setSelectedExample(index);
    setPrompt(promptExamples[index]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await generateStore(prompt);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Generate Store with AI Prompt</CardTitle>
          <CardDescription>
            Describe your dream store in detail. The AI will use your store name, product types, and style preferences to create it.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="e.g., 'A vibrant bookstore named BookNook, specializing in fantasy novels and graphic novels. Use a cozy, warm color palette with lots of wood textures. Feature at least 6 book products.'"
              className="min-h-[120px] text-base resize-none"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Or try one of these examples for inspiration:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {promptExamples.map((example, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={selectedExample === index ? "default" : "outline"}
                    className="h-auto py-2 px-3 justify-start text-left text-sm font-normal"
                    onClick={() => handleExampleClick(index)}
                    disabled={isGenerating}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </form>
        </CardContent>
        
        <CardFooter>
          <Button 
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Store...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate AI Store
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default StoreGenerator;
