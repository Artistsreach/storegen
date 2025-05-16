import { serve } from 'std/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { stripe } from '../_shared/stripe.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';

const YOUR_DOMAIN = Deno.env.get('SITE_URL') || 'https://9000-firebase-storegen-1747188548395.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated for portal session:', userError);
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Fetch user's profile to get stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      console.error('Error fetching profile or missing Stripe Customer ID:', profileError);
      return new Response(JSON.stringify({ error: 'Stripe customer ID not found for this user. Cannot create portal session.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Bad Request, as customer ID is essential
      });
    }

    const stripeCustomerId = profile.stripe_customer_id;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${YOUR_DOMAIN}/dashboard`, // Or a more specific settings/billing page
    });

    // Option 1: Return the URL for client-side redirect
    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

    // Option 2: Server-side redirect (less common for SPA frontends calling an API)
    // return Response.redirect(portalSession.url, 303);

  } catch (error) {
    console.error('Error creating portal session:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to create portal session' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
