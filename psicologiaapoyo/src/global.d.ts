/* eslint-disable no-var */
declare var process: {
  env: {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    [key: string]: string | undefined;
  };
};
