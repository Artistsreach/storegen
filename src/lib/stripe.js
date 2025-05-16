import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51NAoUjDktew9heHOJD5Px4jn9IaolhvVvqoE6NukJV7MxZa8PhIVSwcOVWXdQx6MFNgIGmEYeg64lFUGlYfAyVqu004n16tAdG';

if (!STRIPE_PUBLISHABLE_KEY) {
  throw new Error('VITE_STRIPE_PUBLISHABLE_KEY is not set. Please add it to your .env file.');
}

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
