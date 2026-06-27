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
    url: 'https://your-project-id.supabase.co',

    // TODO: Replace with your Supabase anon/public key
    anonKey: 'your-anon-key-here',
  },
};
