import { serve } from 'std/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { stripe } from '../_shared/stripe.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import type StripeTypes from 'stripe';

interface ProductPayload {
  id?: string; // Product ID from your DB, if updating
  store_id: string;
  name: string;
  description?: string;
  price_in_cents: number;
  currency?: string; // Defaults to 'usd'
  image_url?: string;
  // Existing Stripe IDs if updating, to compare/archive old price
  current_stripe_product_id?: string;
  current_stripe_price_id?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const payload: ProductPayload = await req.json();

    if (!payload.store_id || !payload.name || payload.price_in_cents === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required product fields: store_id, name, price_in_cents' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    const currency = payload.currency || 'usd';
    let stripeProductId = payload.current_stripe_product_id;
    let stripePriceId = payload.current_stripe_price_id;
    let productDataForSupabase: any = {
      store_id: payload.store_id,
      user_id: user.id,
      name: payload.name,
      description: payload.description,
      price_in_cents: payload.price_in_cents,
      currency: currency,
      image_url: payload.image_url,
    };

    // 1. Create or Update Stripe Product
    if (!stripeProductId) {
      const stripeProduct = await stripe.products.create({
        name: payload.name,
        description: payload.description,
        // images: payload.image_url ? [payload.image_url] : undefined, // Stripe Product images
      });
      stripeProductId = stripeProduct.id;
    } else {
      // Optionally update existing Stripe product if details changed
      // await stripe.products.update(stripeProductId, { name: payload.name, description: payload.description });
    }
    productDataForSupabase.stripe_product_id = stripeProductId;

    // 2. Create Stripe Price
    // For simplicity, we always create a new price if price changes or if it's a new product.
    // A more advanced implementation would archive the old price if payload.current_stripe_price_id exists and price changed.
    // For now, if there's no current_stripe_price_id or if price_in_cents/currency changed from what might be stored, create new.
    // This simple version assumes we create a price if one isn't provided, or if we decide to make a new one.
    // A robust check would involve fetching the existing price from Stripe and comparing.
    
    // For this implementation, we'll always create a new price if one isn't passed in,
    // or if the price details change (a more robust check would be needed for updates).
    // The guide suggests creating prices upfront and reusing them.
    // If this function is for "creating/updating" a product in *our* DB,
    // and syncing to Stripe, creating a new Stripe Price if details change is reasonable.

    // Let's assume for now: if no current_stripe_price_id, create one.
    // If there IS a current_stripe_price_id, we'd ideally check if price_in_cents or currency changed.
    // For this iteration, we'll just create a new price if one isn't provided.
    // A real update scenario would be more complex (archive old, create new).
    if (!stripePriceId) { // Simplified: always create if not provided.
        const stripePrice = await stripe.prices.create({
            product: stripeProductId,
            unit_amount: payload.price_in_cents,
            currency: currency,
            // recurring: undefined, // This is for one-time purchase products
        });
        stripePriceId = stripePrice.id;
    }
    // TODO: Add logic here if payload.current_stripe_price_id exists and price details have changed:
    // 1. Fetch current Stripe Price object using payload.current_stripe_price_id
    // 2. Compare unit_amount and currency.
    // 3. If different, create a new Stripe Price as above.
    // 4. Optionally, archive the old price: await stripe.prices.update(payload.current_stripe_price_id, { active: false });
    // 5. Update stripePriceId to the new price ID.


    productDataForSupabase.stripe_price_id = stripePriceId;

    // 3. Upsert product data into Supabase
    let dbResponse;
    if (payload.id) { // Update existing product in DB
      dbResponse = await supabase
        .from('products')
        .update(productDataForSupabase)
        .eq('id', payload.id)
        .eq('user_id', user.id) // Ensure owner is updating
        .select()
        .single();
    } else { // Insert new product in DB
      dbResponse = await supabase
        .from('products')
        .insert(productDataForSupabase)
        .select()
        .single();
    }

    if (dbResponse.error) {
      console.error('Supabase product upsert error:', dbResponse.error);
      // Potentially try to roll back Stripe creations if critical, though complex.
      throw dbResponse.error;
    }

    return new Response(JSON.stringify(dbResponse.data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error managing product:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to manage product' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
