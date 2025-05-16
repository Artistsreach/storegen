
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Search, Menu, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/StoreContext';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const StoreHeader = ({ store, isPublishedView = false }) => {
  const { name, theme, logo_url: logoUrl, id: storeId } = store;
  const { cart, removeFromCart, updateQuantity } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const navigate = useNavigate();

  const storeCartItems = cart.filter(item => item.storeId === storeId);
  const cartItemCount = storeCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = storeCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Simplified base path, as there's only one main store URL structure now
  const basePath = `/store/${storeId}`; 
  const navLinks = [
    { href: basePath, label: 'Home' },
    { href: `#products-${storeId}`, label: 'Products' },
    { href: `#features-${storeId}`, label: 'Features' },
    { href: `#contact-${storeId}`, label: 'Contact' },
  ];

  const handleNavLinkClick = (e, href) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    if (href.startsWith('/store/')) { // Only one base path now
      navigate(href);
    } else { // For anchor links like #products
      const elementId = href.substring(1);
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Fallback for sections not yet rendered or if ID is incorrect
        navigate(basePath); // Navigate to store home if anchor target not found
      }
    }
  };
  
  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout', { state: { cart: storeCartItems, storeName: name, storeId: storeId } });
  };


  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur-md border-b"
        style={{ borderColor: `${theme.primaryColor}30` }}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={basePath} className="flex items-center gap-2 group">
            {logoUrl && <img src={logoUrl} alt={`${name} logo`} className="h-12 w-12 object-contain group-hover:scale-110 transition-transform duration-200" />}
            <span className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors" style={{color: theme.primaryColor}}>{name}</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-x-6">
            {navLinks.map(link => (
              <a key={link.label} href={link.href} onClick={(e) => handleNavLinkClick(e, link.href)} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors" style={{ '--hover-color': theme.primaryColor }}>
                {link.label}
              </a>
            ))}
          </nav>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hidden md:flex text-muted-foreground hover:text-primary" style={{ '--hover-color': theme.primaryColor }}>
              <Search className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="outline"
              className="relative"
              onClick={() => setIsCartOpen(true)}
              style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs" style={{backgroundColor: theme.secondaryColor || 'red'}}>
                  {cartItemCount}
                </Badge>
              )}
              <span className="ml-2 hidden sm:inline">Cart</span>
            </Button>
            
            <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-primary" onClick={() => setIsMobileMenuOpen(true)} style={{ '--hover-color': theme.primaryColor }}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 bg-background p-6 md:hidden"
          >
            <div className="flex justify-between items-center mb-8">
              <Link to={basePath} className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                {logoUrl && <img src={logoUrl} alt={`${name} logo`} className="h-12 w-12 object-contain" />}
                <span className="font-bold text-xl" style={{color: theme.primaryColor}}>{name}</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <nav className="flex flex-col gap-y-4">
              {navLinks.map(link => (
                <a key={link.label} href={link.href} onClick={(e) => handleNavLinkClick(e, link.href)} className="text-lg font-medium text-foreground hover:text-primary transition-colors" style={{ '--hover-color': theme.primaryColor }}>
                  {link.label}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <DialogPrimitive.Root open={isCartOpen} onOpenChange={setIsCartOpen}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
              <DialogPrimitive.Content 
                className="fixed z-50 inset-y-0 right-0 h-full w-full max-w-md bg-background border-l shadow-xl flex flex-col"
                as={motion.div}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-xl font-semibold">Your Cart</h2>
                  <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {storeCartItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Your cart is empty</p>
                    <p className="text-sm text-muted-foreground">Looks like you haven't added anything yet.</p>
                    <Button onClick={() => setIsCartOpen(false)} className="mt-6" style={{backgroundColor: theme.primaryColor}}>Continue Shopping</Button>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="flex-1 p-6">
                      <div className="space-y-4">
                        {storeCartItems.map(item => (
                          <div key={item.id} className="flex items-start gap-4">
                            <img 
                              src={item.image?.src?.tiny || item.image?.src?.medium || `https://via.placeholder.com/80x80.png?text=${item.name.substring(0,1)}`} 
                              alt={item.name} 
                              className="w-20 h-20 object-cover rounded-md border" 
                            />
                            <div className="flex-1">
                              <h3 className="font-medium text-sm line-clamp-1">{item.name}</h3>
                              <p className="text-xs text-muted-foreground">Price: ${item.price.toFixed(2)}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, storeId, item.quantity - 1)}><span className="text-lg leading-none">-</span></Button>
                                <span className="text-sm w-4 text-center">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, storeId, item.quantity + 1)}><span className="text-lg leading-none">+</span></Button>
                              </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                                <Button variant="ghost" size="icon" className="h-7 w-7 mt-1 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.id, storeId)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <Separator />
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between font-medium">
                            <span>Subtotal</span>
                            <span>${cartTotal.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p>
                        <Button className="w-full" size="lg" style={{backgroundColor: theme.primaryColor}} onClick={handleCheckout}>
                            Proceed to Checkout
                        </Button>
                    </div>
                  </>
                )}
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        )}
      </AnimatePresence>
    </>
  );
};

// Minimal DialogPrimitive components for Cart Drawer
const DialogPrimitive = { 
  Root: ({ children, ...props }) => <div {...props}>{children}</div>,
  Portal: ({ children }) => <>{children}</>, 
  Overlay: React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("fixed inset-0 z-50", className)} {...props} />
  )),
  Content: React.forwardRef(({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("fixed z-50", className)} {...props}>
      {children}
    </div>
  ))
};
DialogPrimitive.Overlay.displayName = "DialogPrimitive.Overlay";
DialogPrimitive.Content.displayName = "DialogPrimitive.Content";


export default StoreHeader;
