
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Store, 
  Edit, 
  Trash2, 
  ShoppingBag, 
  Calendar 
} from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useStore } from '@/contexts/StoreContext';

const StoreCard = ({ store }) => {
  const navigate = useNavigate();
  const { deleteStore } = useStore();
  
  const formatDate = (dateString) => {
    if (!dateString) {
      return 'N/A';
    }
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return 'Error Date';
    }
  };
  
  const getStoreTypeIcon = (type) => {
    switch (type) {
      case 'fashion':
        return <ShoppingBag className="h-5 w-5 text-pink-500" />;
      case 'electronics':
        return <Store className="h-5 w-5 text-blue-500" />;
      case 'food':
        return <Store className="h-5 w-5 text-green-500" />;
      case 'jewelry':
        return <Store className="h-5 w-5 text-amber-500" />;
      default:
        return <Store className="h-5 w-5 text-gray-500" />;
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="store-preview"
    >
      <Card className="h-full overflow-hidden border-2 hover:border-primary/50 transition-all duration-300">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {getStoreTypeIcon(store.type)}
              <CardTitle className="text-xl">{store.name}</CardTitle>
            </div>
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              {store.type.charAt(0).toUpperCase() + store.type.slice(1)}
            </span>
          </div>
          <CardDescription className="line-clamp-2 mt-1">
            {store.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-center text-sm text-muted-foreground gap-1 mb-3">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Created on {formatDate(store.createdAt)}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {store.products.slice(0, 4).map((product, index) => (
              <div 
                key={product.id} 
                className="bg-muted/50 p-2 rounded-md text-xs flex flex-col"
              >
                <span className="font-medium truncate">{product.name}</span>
                <span className="text-primary">${product.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/store/${store.id}`)}
          >
            Preview
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => navigate(`/store/${store.id}?edit=true`)}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the "{store.name}" store and all its data.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteStore(store.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default StoreCard;
