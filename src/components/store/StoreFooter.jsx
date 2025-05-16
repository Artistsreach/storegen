
import React from 'react';
import { motion } from 'framer-motion';
import { Facebook, Instagram, Twitter, Youtube, Linkedin } from 'lucide-react';

const StoreFooter = ({ store, isPublishedView = false }) => {
  const { name, theme, id: storeId } = store;
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  const basePath = `/store/${storeId}`; // Simplified base path
  const footerNavLinks = [
    { href: basePath, label: "Home" },
    { href: `#products-${storeId}`, label: "Products" },
    { href: "#", label: "About Us" },
    { href: "#", label: "Contact" },
    { href: "#", label: "FAQ" },
    { href: "#", label: "Privacy Policy" },
    { href: "#", label: "Terms of Service" },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-muted dark:bg-slate-900 text-muted-foreground pt-12 pb-8"
      id={`contact-${storeId}`}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-8">
          {/* Store Info */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-foreground" style={{color: theme.primaryColor}}>{name}</h3>
            <p className="text-sm">
              Your favorite destination for {store.type || 'quality products'}. We are committed to bringing you the best.
            </p>
            <div className="flex space-x-3 pt-2">
              {socialLinks.map(link => (
                <a 
                  key={link.label} 
                  href={link.href} 
                  aria-label={link.label}
                  className="p-2 rounded-full bg-background/50 hover:bg-primary/10 transition-colors"
                  style={{"--hover-bg-color": `${theme.primaryColor}1A`, "--hover-text-color": theme.primaryColor}}
                >
                  <link.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Quick Links</h4>
            <ul className="space-y-2">
              {footerNavLinks.slice(0,4).map(link => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm hover:text-primary transition-colors" style={{"--hover-color": theme.primaryColor}}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Customer Service</h4>
            <ul className="space-y-2">
               {footerNavLinks.slice(4).map(link => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm hover:text-primary transition-colors" style={{"--hover-color": theme.primaryColor}}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Contact Info */}
          <div className="space-y-2 text-sm">
            <h4 className="font-semibold text-foreground mb-3">Contact Us</h4>
            <p>123 Store Street, Cityville, ST 12345</p>
            <p>Email: <a href={`mailto:info@${name.toLowerCase().replace(/\s+/g, '')}.com`} className="hover:text-primary" style={{"--hover-color": theme.primaryColor}}>info@{name.toLowerCase().replace(/\s+/g, '')}.com</a></p>
            <p>Phone: <a href="tel:+1234567890" className="hover:text-primary" style={{"--hover-color": theme.primaryColor}}>(123) 456-7890</a></p>
          </div>
        </div>
        
        <div className="border-t pt-6 text-center text-xs">
          <p>&copy; {currentYear} {name}. All Rights Reserved. Powered by StoreGen AI.</p>
        </div>
      </div>
    </motion.footer>
  );
};

export default StoreFooter;
