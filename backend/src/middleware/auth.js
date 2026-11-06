const { getSupabaseClient } = require('../supabase');

async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: 'Please sign in to continue.' });

    const token = match[1];
    const supabase = getSupabaseClient(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });

    req.user = data.user;
    req.accessToken = token;
    req.supabase = supabase;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth };
