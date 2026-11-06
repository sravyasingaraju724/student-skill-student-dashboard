
const express = require('express');
const { getSupabaseClient } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) return res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });

    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: name.trim() } }
    });

    if (error) {
      console.error("SUPABASE SIGNUP ERROR:", error.message);
      return res.status(400).json({
        error: safeAuthMessage(error.message)
      });
    }

    if (!data.session) return res.status(201).json({ message: 'Account created. Check your email to confirm it, then sign in.', needsEmailConfirmation: true });

    res.status(201).json({
      message: 'Account created successfully.',
      accessToken: data.session.access_token,
      user: { id: data.user.id, email: data.user.email, name: name.trim() }
    });

  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error || !data.session) return res.status(401).json({ error: 'Email or password is incorrect. If you just registered, confirm your email first.' });

    res.json({
      message: 'Signed in successfully.',
      accessToken: data.session.access_token,
      user: { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.full_name || '' }
    });

  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: profile, error } = await req.supabase.from('profiles').select('id, full_name, created_at').eq('id', req.user.id).maybeSingle();

    if (error) throw error;

    res.json({
      user: { id: req.user.id, email: req.user.email, name: profile?.full_name || req.user.user_metadata?.full_name || '' }
    });

  } catch (error) {
    next(error);
  }
});

function safeAuthMessage(message) {
  if (/already registered|already exists/i.test(message)) return 'An account with this email may already exist. Try signing in.';
  if (/password/i.test(message)) return 'The password does not meet the authentication requirements.';
  return 'Could not create the account. Check your details and try again.';
}

module.exports = router;
