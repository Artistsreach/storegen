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
  const [userRole, setUserRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
      setLoadingRole(true);
      supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (data) {
            setUserRole(data.role);
          } else if (error) {
            console.error('Error fetching user role:', error);
            // Potentially handle case where profile doesn't exist yet
            // For now, assume 'store_owner' or null if no profile
            setUserRole('store_owner'); 
          }
          setLoadingRole(false);
        })
        .catch(error => {
            console.error('Error in promise fetching user role:', error);
            setUserRole('store_owner'); // Default role on error
            setLoadingRole(false);
        });
    } else {
      setUser(null);
      setUserRole(null);
      setLoadingRole(false);
    }
  }, [session, supabaseClient]);

  // This effect handles the auth state change to set the user object
  // and listen for Supabase auth events (SIGNED_IN, SIGNED_OUT)
  // This is more robust than just relying on useSession for the user object directly
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        // If a user signs in and there's no role yet, the other useEffect will fetch it.
        // If a user signs out, role should be cleared.
        if (event === 'SIGNED_OUT') {
          setUserRole(null);
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
    <AuthContext.Provider value={{ session, user, userRole, loadingRole, isAuthenticated: !!session?.user }}>
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
