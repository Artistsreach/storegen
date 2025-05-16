import React from 'react';
import SubscribeButton from '../components/SubscribeButton';
import { Link } from 'react-router-dom'; // Assuming you use React Router for navigation
import { useAuth } from '../contexts/AuthContext';

const PricingPage = () => {
  const { isAuthenticated, user } = useAuth();

  // Placeholder for checking if user is already subscribed
  // You'll need to implement this based on your user profile/subscription status data
  const isSubscribed = false; // Replace with actual check, e.g., user?.profile?.is_subscribed

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Our Plan</h1>
      <p>Get full access to all store creation and management features.</p>
      
      <div style={{ border: '1px solid #ccc', padding: '20px', margin: '20px auto', maxWidth: '400px', borderRadius: '8px' }}>
        <h2>Store Creator Plan</h2>
        <p style={{ fontSize: '2em', fontWeight: 'bold', margin: '10px 0' }}>$24.99 / month</p>
        <ul>
          <li>Full access to publishing</li>
          <li>Accept payments for your store</li>
          <li>Unlimited products</li>
          <li>And more!</li>
        </ul>
        
        {isAuthenticated ? (
          isSubscribed ? (
            <p>You are already subscribed!</p>
          ) : (
            <SubscribeButton />
          )
        ) : (
          <p>
            Please <Link to="/auth">log in or sign up</Link> to subscribe.
          </p>
        )}
      </div>
    </div>
  );
};

export default PricingPage;
