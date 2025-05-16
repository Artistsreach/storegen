import { serve } from 'std/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { stripe } from '../_shared/stripe.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts'; // For user-context client
import { createClient } from '@supabase/supabase-js'; // For admin client

const YOUR_DOMAIN = Deno.env.get('SITE_URL') || 'https://9000-firebase-storegen-1747188548395.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev';
const SUBSCRIPTION_PRICE_ID = Deno.env.get('STRIPE_SUBSCRIPTION_PRICE_ID') || 'price_1RPDinDktew9heHOLkkL3ZDv'; // Updated Price ID

console.log('[Function Init] Create Subscription Session Function Initializing...');
console.log('[Function Init] SITE_URL from env:', Deno.env.get('SITE_URL'));
console.log('[Function Init] STRIPE_SUBSCRIPTION_PRICE_ID from env:', Deno.env.get('STRIPE_SUBSCRIPTION_PRICE_ID'));

if (!Deno.env.get('STRIPE_SECRET_KEY')) {
    console.error('[Function Init] CRITICAL: STRIPE_SECRET_KEY is not set in Edge Function environment. Stripe client may fail.');
}
if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_ANON_KEY') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    console.error('[Function Init] CRITICAL: SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY not available. Supabase clients may fail.');
}

// Initialize Admin Supabase client (bypasses RLS)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req: Request) => {
  console.log(`[Request Start] Method: ${req.method}, URL: ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log('[Request Handle] Handling OPTIONS request.');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Try Block] Attempting to create Supabase client...');
    const supabase = createSupabaseClient(req);
    console.log('[Try Block] Supabase client potentially created.');

    console.log('[Try Block] Attempting to get user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[Error] Failed to get user or no user object:', userError?.message || 'No user object');
      return new Response(JSON.stringify({ error: 'User not authenticated', details: userError?.message || 'No user object' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log('[User Auth] User retrieved. ID:', user.id);

    console.log(`[Profile Fetch] Attempting for user: ${user.id}`);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116: 'No rows found'
      console.error('[Error] Failed to fetch profile (not PGRST116):', profileError.message, 'Details:', JSON.stringify(profileError));
      return new Response(JSON.stringify({ error: 'Failed to fetch user profile', details: profileError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log(`[Profile Fetch] Profile data for user ${user.id}:`, profile);

    let stripeCustomerId = profile?.stripe_customer_id;
    console.log(`[Stripe Customer] Initial stripe_customer_id from profile for user ${user.id}: ${stripeCustomerId}`);

    if (!stripeCustomerId) {
      console.log(`[Stripe Customer] No ID in profile. Creating new Stripe Customer for user: ${user.email}`);
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;
      console.log(`[Stripe Customer] New Stripe Customer created. ID: ${stripeCustomerId}`);

      console.log(`[Profile Upsert] Attempting for user ${user.id} with Stripe ID ${stripeCustomerId} using ADMIN client.`);
      const { error: upsertError } = await supabaseAdmin // Use admin client here
        .from('profiles')
        .upsert({
          id: user.id, 
          stripe_customer_id: stripeCustomerId
          // role: 'store_owner', // Default value should apply
        }, {
          onConflict: 'id', 
        })
        .select(); 

      if (upsertError) {
        console.error('[Error] Failed to upsert profile with Stripe Customer ID:', upsertError.message, 'Details:', JSON.stringify(upsertError));
        return new Response(JSON.stringify({ error: 'Failed to save Stripe customer information to profile.', details: upsertError.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
      }
      console.log(`[Profile Upsert] Profile upserted successfully for user ${user.id}.`);
    }

    if (!stripeCustomerId) {
        console.error(`[CRITICAL Error] Stripe Customer ID could not be resolved for user: ${user.id}. This should not happen.`);
        return new Response(JSON.stringify({ error: 'Stripe Customer ID could not be resolved.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
    }
    console.log(`[Stripe Checkout] Using Stripe Customer ID: ${stripeCustomerId} for user ${user.id}. Price ID: ${SUBSCRIPTION_PRICE_ID}`);

    console.log('[Stripe Checkout] Attempting to create Stripe Checkout Session...');
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${YOUR_DOMAIN}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/pricing`, 
    });
    console.log(`[Stripe Checkout] Session created. ID: ${session.id}`);

    return new Response(JSON.stringify({ sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[Unhandled Error] Error in create-subscription-session function:', error.message, 'Stack:', error.stack, 'Full Error:', JSON.stringify(error));
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred in create-subscription-session.';
    return new Response(JSON.stringify({ error: 'Failed to create subscription session due to an internal server error.', details: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
