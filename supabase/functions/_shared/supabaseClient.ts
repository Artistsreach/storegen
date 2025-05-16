import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Note: supabaseAdmin is only required for admin tasks like RLS bypass
// import { createClient as createAdminClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function createSupabaseClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization');
  
  // Create a new Supabase client with the user's JWT if present
  // and always include the anon key as apikey header for subsequent requests.
  const headers: { [key: string]: string } = {
    'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
  };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!, // This key is also used by createClient for its internal setup
    { global: { headers } }
  );
}

/*
// Example of creating an admin client if you need to bypass RLS
// Be very careful with this and only use it when absolutely necessary
export function createSupabaseAdminClient(): SupabaseClient {
  return createAdminClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}
*/
