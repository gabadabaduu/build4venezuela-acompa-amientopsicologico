/**
 * Supabase configuration.
 *
 * Replace these placeholder values with your actual Supabase project credentials.
 * You can find them in your Supabase dashboard: Project Settings > API
 */
export const environment = {
  production: false,
  supabase: {
    // TODO: Replace with your Supabase project URL (e.g., https://xxxxxxxxxxxx.supabase.co)
    url: 'https://qrsfnihnoiyzwvhoaisz.supabase.co',

    // TODO: Replace with your Supabase anon/public key
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyc2ZuaWhub2l5end2aG9haXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1Mzc3MDAsImV4cCI6MjA5ODExMzcwMH0.Tl1IO0NHO7lX-3ypnddqMOLRHYYJG2tft9cxua7h4nA',

    // Must match PUBLIC_API_KEY secret in Supabase Edge Functions
    publicApiKey: 'f9cada5bd7158cce896317575bd5cfd93036b12eb2adb1ac167d2a81fc3d927b',
  },
};
