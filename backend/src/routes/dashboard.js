const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
const LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];
const numbers = Object.fromEntries(LEVELS.map((level, index) => [level, index + 1]));
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data: skills, error } = await req.supabase.from('skills').select('id, name, category, current_level, target_level, updated_at').order('updated_at', { ascending: false });
    if (error) throw error;
    const all = skills || [];
    const onTrack = all.filter(s => numbers[s.current_level] >= numbers[s.target_level]).length;
    const categoryCounts = {};
    all.forEach(s => { categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1; });
    res.json({ summary: { total: all.length, onTrack, inProgress: all.length - onTrack, categories: Object.keys(categoryCounts).length }, recentSkills: all.slice(0, 5).map(s => ({ ...s, status: numbers[s.current_level] >= numbers[s.target_level] ? 'on-track' : 'in-progress' })), categoryCounts });
  } catch (error) { next(error); }
});
module.exports = router;
