import { serve } from 'std/http/server.ts';
import { stripe } from '../_shared/stripe.ts'; // Uses the shared Stripe client instance
import type Stripe from 'stripe'; // Import Stripe namespace for types, uses import_map
// Supabase client for database updates (use admin client for RLS bypass if needed)
import { createClient } from '@supabase/supabase-js'; // Uses import_map

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// Initialize Supabase client (consider using admin client for direct DB updates)
// For simplicity, using anon key here, but service_role key is better for webhooks
// if you need to bypass RLS to update user profiles/subscriptions.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Use service role for admin actions
);

serve(async (req: Request) => {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set.');
    return new Response('Webhook secret not configured.', { status: 500 });
  }

  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text(); // Raw body needed for signature verification

  if (!signature) {
    return new Response('No Stripe-Signature header present.', { status: 400 });
  }

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined, // cryptoProvider, Deno's SubtleCrypto is used by default by the Stripe SDK now
      // Stripe.createSubtleCryptoProvider() // Older Stripe SDK versions might need this
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === 'subscription_create' || invoice.billing_reason === 'subscription_cycle') {
          const subscriptionId = invoice.subscription;
          const customerId = invoice.customer;
          // TODO: Update user's subscription status in your DB
          // e.g., find user by customerId, update their profile/subscription record
          // Mark as active, store subscriptionId, set active_until based on period_end
          console.log(`Subscription payment succeeded for ${customerId}, subscription ${subscriptionId}`);
          
          const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({ 
              subscription_status: 'active', 
              stripe_subscription_id: subscription.id,
              // current_period_end: new Date(subscription.current_period_end * 1000) // Store if needed
            })
            .eq('stripe_customer_id', customerId);
          if (error) console.error('Error updating profile on payment_succeeded:', error);

        }
        break;
      }
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription created: ${subscription.id} for customer ${subscription.customer}`);
        // Optional: Initial setup if not handled by invoice.payment_succeeded
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ 
                subscription_status: subscription.status, // e.g., 'active', 'trialing'
                stripe_subscription_id: subscription.id,
                // current_period_end: new Date(subscription.current_period_end * 1000)
            })
            .eq('stripe_customer_id', subscription.customer);
        if (error) console.error('Error updating profile on subscription_created:', error);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle changes in subscription status (e.g., trial ending, plan change, cancellation scheduled)
        console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);
         const { error } = await supabaseAdmin
            .from('profiles')
            .update({ 
                subscription_status: subscription.status,
                // current_period_end: new Date(subscription.current_period_end * 1000) 
            })
            .eq('stripe_customer_id', subscription.customer);
        if (error) console.error('Error updating profile on subscription_updated:', error);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription cancellation (e.g., mark as inactive, revoke access at period end)
        console.log(`Subscription deleted: ${subscription.id}`);
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: 'canceled' }) // Or 'inactive'
            .eq('stripe_customer_id', subscription.customer);
        if (error) console.error('Error updating profile on subscription_deleted:', error);
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Retrieve line items to get product details if not all in metadata
        // const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

        // Basic fulfillment logic:
        console.log(`Checkout session completed: ${session.id}`);

        // Ensure metadata exists and has what we need
        const storeId = session.metadata?.store_id;
        const productId = session.metadata?.product_id; // This is your DB product ID

        if (!storeId || !productId) {
          console.error('Missing store_id or product_id in checkout session metadata:', session.id);
          // Potentially flag this for manual review, but don't fail the webhook for Stripe
          break; 
        }
        
        // Idempotency check: See if an order for this session already exists
        const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('stripe_checkout_session_id', session.id)
          .maybeSingle();

        if (existingOrderError) {
            console.error('Error checking for existing order:', existingOrderError.message);
            // Decide if this is a retryable error or should break
        }

        if (existingOrder) {
          console.log(`Order for session ${session.id} already processed. Skipping.`);
          break;
        }

        const orderData = {
          store_id: storeId,
          product_id: productId, // Assuming one product per order for now from metadata
          quantity: session.line_items?.data[0]?.quantity || 1, // More robust: iterate line_items if multiple
          price_paid_in_cents: session.amount_total, // Total amount for the session
          currency: session.currency,
          status: 'paid', // Or map from session.payment_status
          stripe_checkout_session_id: session.id,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          customer_email: session.customer_details?.email,
          // customer_id: null, // If you have a way to link to your internal users, set it here
        };

        const { error: insertError } = await supabaseAdmin
          .from('orders')
          .insert(orderData);

        if (insertError) {
          console.error('Error inserting order:', insertError);
          // This is a critical error, Stripe will retry.
          // Consider sending an alert for investigation.
          return new Response(`Webhook Error: Failed to insert order: ${insertError.message}`, { status: 500 });
        }
        console.log(`Order created for checkout session: ${session.id}`);
        break;
      }
      // ... handle other event types like checkout.session.async_payment_succeeded if needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (dbError) {
    console.error('Error processing webhook event or updating database:', dbError);
    return new Response('Webhook handler failed to process event.', { status: 500 });
  }

  // Return a 200 response to acknowledge receipt of the event
  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
