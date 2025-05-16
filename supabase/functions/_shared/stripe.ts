import Stripe from 'stripe'; // Ensure version compatibility

export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2024-04-10', // Use a fixed API version
  // For Deno, you might need to provide a subtle crypto provider if not using the default
  // cryptoProvider: Stripe.createSubtleCryptoProvider(), // Example, if needed
});
