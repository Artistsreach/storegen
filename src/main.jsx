
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/index.css';
import { AuthProvider } from '@/contexts/AuthContext';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

try {
  // Attempt to import and initialize potentially problematic modules here
  // to catch errors early. This is more of a conceptual check, as imports
  // are static. The real check is if these modules throw errors upon execution.
  // For example, supabaseClient.js and stripe.js throw if env vars are missing.
  // If those files are imported by App or AuthProvider, the error will be caught.

  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
} catch (error) {
  console.error("Application initialization failed:", error);
  let message = "Application failed to load. Please check the console for details.";
  if (error.message.includes("VITE_") && error.message.includes("is not set")) {
    message = `Configuration Error: ${error.message}. Please ensure all required environment variables (like VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_STRIPE_PUBLISHABLE_KEY) are correctly set in your .env file and the application is rebuilt if necessary.`;
  }
  root.render(
    <React.StrictMode>
      <div style={{ padding: '20px', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>
        <h1>Application Load Error</h1>
        <p>{message}</p>
        <p>Please check your <code>.env</code> file and ensure all necessary environment variables are configured.</p>
      </div>
    </React.StrictMode>
  );
}
