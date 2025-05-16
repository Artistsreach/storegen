
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Download, Copy, Eye, EyeOff } from 'lucide-react'; // Changed ExternalLink to Eye/EyeOff
import { useToast } from '@/components/ui/use-toast';
import { useStore } from '@/contexts/StoreContext'; // Import useStore

const PreviewControls = ({ store, onEdit }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { viewMode, setViewMode } = useStore(); // Get viewMode and setViewMode
  
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
    navigator.clipboard.writeText(`${window.location.origin}/store/${store.id}`); 
    toast({
      title: 'Link Copied',
      description: 'Store link has been copied to clipboard.',
    });
  };

  const handleToggleViewMode = () => {
    const newMode = viewMode === 'edit' ? 'published' : 'edit';
    setViewMode(newMode);
    toast({
      title: `Switched to ${newMode === 'published' ? 'Consumer View' : 'Admin View'}`,
      description: `Store is now in ${newMode === 'published' ? 'consumer' : 'admin editing'} mode.`,
    });
  };

  const handleEditStoreClick = () => {
    if (viewMode !== 'edit') {
      setViewMode('edit');
    }
    onEdit(); // This opens the EditStoreForm modal
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
          {viewMode === 'edit' && (
            <>
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
                onClick={handleEditStoreClick} // Updated handler
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Store
              </Button>
            </>
          )}

          <Button 
            size="sm"
            onClick={handleToggleViewMode}
            variant="outline"
            className={viewMode === 'edit' ? "text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" : "text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700"}
          >
            {viewMode === 'edit' ? (
              <>
                <Eye className="mr-2 h-4 w-4" /> View as Consumer
              </>
            ) : (
              <>
                <EyeOff className="mr-2 h-4 w-4" /> View as Admin
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PreviewControls;
