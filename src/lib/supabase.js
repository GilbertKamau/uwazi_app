// Backend Supabase client, used only to verify user access tokens.
// If Supabase env vars are absent (e.g. local dev without auth configured),
// `supabase` is null and the auth middleware treats every request as anonymous.

const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

let supabase = null;

if (config.supabaseUrl && config.supabaseAnonKey) {
  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
} else {
  // eslint-disable-next-line no-console
  console.warn('[supabase] URL/anon key not configured - authenticated routes will reject all requests.');
}

module.exports = supabase;
