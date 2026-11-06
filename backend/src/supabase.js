
const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient(accessToken) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const error = new Error(
      'Supabase is not configured. Update backend/.env with your project URL and anon/publishable key.'
    );
    error.status = 503;
    throw error;
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined
  });
}

module.exports = { getSupabaseClient };
