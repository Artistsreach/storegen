import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { SessionContextProvider, useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // We'll use SessionContextProvider from auth-helpers-react to manage session
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <AuthUserProvider>
        {children}
      </AuthUserProvider>
    </SessionContextProvider>
  );
};

// This new provider will sit inside SessionContextProvider and handle role fetching
const AuthUserProvider = ({ children }) => {
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const [profile, setProfile] = useState(null); // Changed to store full profile
  const [loadingProfile, setLoadingProfile] = useState(true); // Renamed loading state
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
      setLoadingProfile(true);
      supabaseClient
        .from('profiles')
        .select('role, stripe_customer_id, subscription_status, stripe_subscription_id') // Fetch all needed fields
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (data) {
            setProfile(data);
          } else if (error && error.code !== 'PGRST116') { // PGRST116: No rows found, profile might not exist yet
            console.error('Error fetching user profile:', error);
            setProfile({ role: 'store_owner' }); // Default role on error if profile fetch fails
          } else {
            // Profile doesn't exist, could be a new user before handle_new_user trigger runs
            // or if trigger is not set up. For now, provide a default.
            setProfile({ role: 'store_owner', subscription_status: null });
          }
          setLoadingProfile(false);
        })
        .catch(error => {
            console.error('Error in promise fetching user profile:', error);
            setProfile({ role: 'store_owner' }); // Default role on critical error
            setLoadingProfile(false);
        });
    } else {
      setUser(null);
      setProfile(null);
      setLoadingProfile(false);
    }
  }, [session, supabaseClient]);

  // This effect handles the auth state change to set the user object
  // and listen for Supabase auth events (SIGNED_IN, SIGNED_OUT)
  // This is more robust than just relying on useSession for the user object directly
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        // If a user signs in and there's no profile yet, the other useEffect will fetch it.
        // If a user signs out, profile should be cleared.
        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );
    const authListener = data?.subscription;

    // Initial check for user
    supabase.auth.getUser().then(({ data: userData }) => {
        setUser(userData?.user ?? null);
    });

    return () => {
      authListener?.unsubscribe();
    };
  }, []);


  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile, // Provide full profile
      userRole: profile?.role, // Convenience accessor for role
      subscriptionStatus: profile?.subscription_status, // Convenience accessor
      loadingProfile, // Renamed loading state
      isAuthenticated: !!session?.user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
