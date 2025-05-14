
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Download, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PreviewControls = ({ store, onEdit }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const handleExport = () => {
    // In a real implementation, this would generate and download the store code
    toast({
      title: 'Export Started',
      description: 'Your store code is being prepared for download.',
    });
    
    // Simulate export process
    setTimeout(() => {
      toast({
        title: 'Export Complete',
        description: 'Your store code has been downloaded successfully.',
      });
    }, 2000);
  };
  
  const handleCopyLink = () => {
    // In a real implementation, this would copy a shareable link
    navigator.clipboard.writeText(`https://storegen.app/preview/${store.id}`);
    
    toast({
      title: 'Link Copied',
      description: 'Store preview link has been copied to clipboard.',
    });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t z-50 py-3"
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCopyLink}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Code
          </Button>
          
          <Button 
            size="sm"
            onClick={onEdit}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Store
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PreviewControls;
