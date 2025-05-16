import { serve } from 'std/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { stripe } from '../_shared/stripe.ts';
// No Supabase client needed here if we don't need to fetch user or product details server-side
// However, for metadata or other checks, you might add it.

const YOUR_DOMAIN = Deno.env.get('SITE_URL') || 'https://9000-firebase-storegen-1747188548395.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev';

interface CheckoutPayload {
  priceId: string;       // Stripe Price ID for the product
  quantity?: number;     // Optional, defaults to 1
  storeId?: string;      // For cancel_url and metadata
  productId?: string;    // For metadata
  // You might also pass customer_email if known, or let Stripe collect it
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: CheckoutPayload = await req.json();

    if (!payload.priceId) {
      return new Response(JSON.stringify({ error: 'Missing required field: priceId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const quantity = payload.quantity || 1;
    const successUrl = `${YOUR_DOMAIN}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`;
    // Fallback cancel URL if storeId is not provided, or use a generic one
    const cancelUrl = payload.storeId ? `${YOUR_DOMAIN}/store/${payload.storeId}` : `${YOUR_DOMAIN}/`; 

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Add other payment methods as needed e.g. ['card', 'ideal']
      mode: 'payment', // For one-time purchases
      line_items: [
        {
          price: payload.priceId,
          quantity: quantity,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        store_id: payload.storeId || '',
        product_id: payload.productId || '', // The ID from your 'products' table
        // Add any other metadata you need for fulfillment
      },
      // shipping_address_collection: { // Uncomment if you need to collect shipping addresses
      //   allowed_countries: ['US', 'CA'], // Example
      // },
      // automatic_tax: { enabled: true }, // If you have Stripe Tax configured
      // allow_promotion_codes: true, // If you want to allow discount codes
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to create checkout session' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
