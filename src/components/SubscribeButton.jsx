import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { stripePromise } from '../lib/stripe';
import { Button } from './ui/button'; // Assuming you have a Button component
import { Star } from 'lucide-react'; // Added Star icon

const SubscribeButton = ({ onSubscribed, className = '', showIcon = false }) => { // Added className and showIcon props
  const { session, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubscribe = async () => {
    if (!isAuthenticated || !session?.access_token) {
      setError('You must be logged in to subscribe.');
      // Optionally, redirect to login or show login modal
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            // Supabase Edge Functions might require an API key even for authenticated users
            // if not configured to use JWT for function invocation auth.
            // 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY 
          },
          // body: JSON.stringify({}), // No body needed for this specific function
        }
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON, use the status text or a generic error
          throw new Error(response.statusText || `Request failed with status ${response.status}. Edge function might be misconfigured or down.`);
        }
        throw new Error(errorData.error || errorData.details || 'Failed to create subscription session.');
      }

      const data = await response.json(); // Should be safe now if response.ok
      const { sessionId } = data;
      const stripe = await stripePromise;
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
        console.error('Stripe redirect error:', stripeError);
        setError(stripeError.message);
      } else {
        // If redirectToCheckout is successful, the user is redirected.
        // If onSubscribed is provided, it might be called on the success_url page.
        if (onSubscribed) {
            // This typically won't be reached if redirect happens,
            // but good for testing or if redirect fails client-side.
            onSubscribed();
        }
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button 
        onClick={handleSubscribe} 
        disabled={loading}
        className={`bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white ${className}`} // Merged className
      >
        {showIcon && <Star className="mr-2 h-4 w-4" />} {/* Conditionally render icon */}
        {loading ? 'Processing...' : 'Subscribe to Pro'}
      </Button>
      {error && <p style={{ color: 'red', marginTop: '10px', fontSize: '0.8rem' }}>Error: {error}</p>} {/* Smaller error text */}
    </div>
  );
};

export default SubscribeButton;
