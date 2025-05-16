import { Auth } from '@supabase/auth-ui-react';
import { supabase } from '../lib/supabaseClient';

// Custom theme for Supabase Auth UI using Tailwind CSS classes
const customTheme = {
  default: {
    colors: {
      brand: 'hsl(var(--primary))',
      brandAccent: 'hsl(var(--primary-foreground))',
      brandButtonText: 'hsl(var(--primary-foreground))',
      defaultButtonBackground: 'hsl(var(--background))',
      defaultButtonBackgroundHover: 'hsl(var(--accent))',
      defaultButtonBorder: 'hsl(var(--input))',
      defaultButtonText: 'hsl(var(--foreground))',
      dividerBackground: 'hsl(var(--border))',
      inputBackground: 'hsl(var(--background))',
      inputBorder: 'hsl(var(--input))',
      inputBorderHover: 'hsl(var(--ring))',
      inputBorderFocus: 'hsl(var(--ring))',
      inputText: 'hsl(var(--foreground))',
      inputLabelText: 'hsl(var(--foreground))',
      inputPlaceholder: 'hsl(var(--muted-foreground))',
      messageText: 'hsl(var(--foreground))',
      messageTextDanger: 'hsl(var(--destructive-foreground))',
      anchorTextColor: 'hsl(var(--primary))',
      anchorTextColorHover: 'hsl(var(--primary))',
    },
    space: {
      spaceSmall: '4px',
      spaceMedium: '8px',
      spaceLarge: '16px',
      labelBottomMargin: '8px',
      anchorBottomMargin: '4px',
      emailInputSpacing: '4px',
      socialAuthSpacing: '4px',
      buttonPadding: '10px 15px',
      inputPadding: '10px 15px',
    },
    fontSizes: {
      baseBodySize: '13px',
      baseInputSize: '14px',
      baseLabelSize: '14px',
      baseButtonSize: '14px',
    },
    fonts: {
      bodyFontFamily: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
      buttonFontFamily: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
      inputFontFamily: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
      labelFontFamily: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
    },
    borderWidths: {
      buttonBorderWidth: '1px',
      inputBorderWidth: '1px',
    },
    radii: {
      borderRadiusButton: 'var(--radius)',
      buttonBorderRadius: 'var(--radius)',
      inputBorderRadius: 'var(--radius)',
    },
  },
};


function AuthPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card shadow-lg rounded-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Sign in to your account
          </h2>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: customTheme }}
          providers={['google', 'facebook']} // Added 'facebook' provider
          socialLayout="vertical" // Changed to vertical to move social buttons below
          theme="dark" // You can toggle this based on your app's theme preference
        />
      </div>
    </div>
  );
}

export default AuthPage;
