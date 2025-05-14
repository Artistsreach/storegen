
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, Lock, ShoppingBag, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart, getStoreById } = useStore();
  const { toast } = useToast();

  const [cartItems, setCartItems] = useState([]);
  const [storeName, setStoreName] = useState('Your');
  const [storeId, setStoreId] = useState(null);
  const [store, setStore] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    nameOnCard: '',
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'United States' 
  });

  useEffect(() => {
    if (location.state?.cart && location.state?.storeName && location.state?.storeId) {
      setCartItems(location.state.cart);
      setStoreName(location.state.storeName);
      setStoreId(location.state.storeId);
      const currentStore = getStoreById(location.state.storeId);
      setStore(currentStore);
    } else {
      toast({ title: "Cart is empty", description: "Redirecting to dashboard.", variant: "destructive" });
      navigate('/');
    }
  }, [location.state, navigate, toast, getStoreById]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? 5.00 : 0; 
  const taxes = subtotal * 0.08; 
  const total = subtotal + shipping + taxes;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    clearCart(); 
    toast({
      title: "Order Placed Successfully!",
      description: `Thank you for your order from ${storeName}. Your items will be shipped soon.`,
      duration: 5000,
    });
    setIsProcessing(false);
    navigate(`/preview/${storeId || ''}`); 
  };

  if (cartItems.length === 0 && !isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-slate-900">
        <ShoppingBag className="h-24 w-24 text-primary mb-6" />
        <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-8">There's nothing to check out yet.</p>
        <Button asChild>
          <Link to={storeId ? `/preview/${storeId}` : '/'}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-800 dark:to-slate-800 py-8 px-4">
      <motion.div 
        initial={{ opacity: 0, y:20 }}
        animate={{ opacity: 1, y:0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto max-w-4xl"
      >
        <Button variant="ghost" onClick={() => navigate(storeId ? `/preview/${storeId}` : '/')} className="mb-6 text-primary hover:text-primary/80">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to {storeName}
        </Button>

        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">Checkout</h1>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-1 h-fit sticky top-8 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Order Summary</CardTitle>
              <CardDescription>Review your items from {storeName}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <img-replace src={item.image?.src?.tiny || `https://via.placeholder.com/40x40.png?text=${item.name.substring(0,1)}`} alt={item.name} className="w-10 h-10 rounded object-cover" />
                      <div>
                        <p className="font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Shipping:</span><span>${shipping.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Taxes (est.):</span><span>${taxes.toFixed(2)}</span></div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmitOrder} className="md:col-span-2 space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="address">Street Address</Label>
                  <Input id="address" name="address" placeholder="123 Main St" value={formData.address} onChange={handleInputChange} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" placeholder="Anytown" value={formData.city} onChange={handleInputChange} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" name="postalCode" placeholder="12345" value={formData.postalCode} onChange={handleInputChange} required />
                </div>
                 <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" value={formData.country} onChange={handleInputChange} required />
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Payment Details</CardTitle>
                <CardDescription className="flex items-center text-sm text-muted-foreground">
                  <Lock className="h-3 w-3 mr-1.5" /> Secure Payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="nameOnCard">Name on Card</Label>
                  <Input id="nameOnCard" name="nameOnCard" placeholder="John M. Doe" value={formData.nameOnCard} onChange={handleInputChange} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <div className="relative">
                    <Input id="cardNumber" name="cardNumber" placeholder="•••• •••• •••• ••••" value={formData.cardNumber} onChange={handleInputChange} required />
                    <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input id="expiryDate" name="expiryDate" placeholder="MM/YY" value={formData.expiryDate} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input id="cvc" name="cvc" placeholder="123" value={formData.cvc} onChange={handleInputChange} required />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Button type="submit" size="lg" className="w-full text-lg" disabled={isProcessing} style={{backgroundColor: store?.theme?.primaryColor || '#3B82F6'}}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-5 w-5" />
              )}
              {isProcessing ? 'Processing Payment...' : `Pay $${total.toFixed(2)}`}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutPage;
