
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const StoreNewsletter = ({ store, isPublishedView = false }) => {
  const { theme, content, name: storeName } = store;
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const heading = content?.newsletterHeading || `Stay Updated with ${storeName}`;
  const text = content?.newsletterText || `Subscribe to our newsletter for the latest products, offers, and news.`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "Subscribed!", description: `Thanks for subscribing to ${storeName}'s newsletter.` });
    setEmail('');
    setIsSubmitting(false);
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl mx-auto text-center bg-muted/60 dark:bg-slate-800/40 p-8 md:p-12 rounded-xl shadow-lg"
          style={{ borderColor: `${theme.primaryColor}30`, borderWidth: '1px' }}
        >
          <Mail className="w-12 h-12 mx-auto mb-4" style={{ color: theme.primaryColor }} />
          <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight text-foreground">{heading}</h2>
          <p className="text-muted-foreground mb-6">
            {text}
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email address"
              className="flex-grow h-12 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <Button 
              type="submit" 
              className="h-12 text-base"
              style={{ backgroundColor: theme.primaryColor, color: 'white' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Subscribe
            </Button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

// Minimal Loader2 icon for newsletter
const Loader2 = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);


export default StoreNewsletter;
