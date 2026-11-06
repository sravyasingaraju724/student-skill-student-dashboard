const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
const CATEGORIES = ['Programming', 'Web Development', 'Data & AI', 'Tools', 'Communication', 'Teamwork', 'Leadership', 'Problem Solving', 'Other'];
const LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];
const LEVEL_NUMBER = { Beginner: 1, Elementary: 2, Intermediate: 3, Advanced: 4, Expert: 5 };

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    let query = req.supabase.from('skills').select('id, name, category, current_level, target_level, notes, created_at, updated_at').order('updated_at', { ascending: false });
    if (search) query = query.ilike('name', `%${search.replace(/[%_,]/g, '')}%`);
    if (category && CATEGORIES.includes(category)) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    let skills = (data || []).map(skill => ({ ...skill, current_level_number: LEVEL_NUMBER[skill.current_level], target_level_number: LEVEL_NUMBER[skill.target_level], status: LEVEL_NUMBER[skill.current_level] >= LEVEL_NUMBER[skill.target_level] ? 'on-track' : 'in-progress' }));
    if (status === 'on-track' || status === 'in-progress') skills = skills.filter(skill => skill.status === status);
    res.json({ skills, categories: CATEGORIES, levels: LEVELS });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('skills').select('id, name, category, current_level, target_level, notes, created_at, updated_at, skill_progress(id, level, note, recorded_at)').eq('id', req.params.id).order('recorded_at', { foreignTable: 'skill_progress', ascending: false }).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Skill not found.' });
    res.json({ skill: data, levels: LEVELS, categories: CATEGORIES });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const validation = validateSkill(req.body);
    if (validation) return res.status(400).json({ error: validation });
    const payload = cleanSkill(req.body, req.user.id);
    const { data, error } = await req.supabase.from('skills').insert(payload).select('id, name, category, current_level, target_level, notes, created_at, updated_at').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'You already have a skill with this name.' });
      throw error;
    }
    res.status(201).json({ message: 'Skill added.', skill: data });
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validation = validateSkill(req.body);
    if (validation) return res.status(400).json({ error: validation });
    const { data, error } = await req.supabase.from('skills').update(cleanSkill(req.body)).eq('id', req.params.id).select('id, name, category, current_level, target_level, notes, created_at, updated_at').maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'You already have a skill with this name.' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Skill not found.' });
    res.json({ message: 'Skill updated.', skill: data });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('skills').delete().eq('id', req.params.id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Skill not found.' });
    res.json({ message: 'Skill deleted.' });
  } catch (error) { next(error); }
});

function validateSkill(body) {
  if (!body || typeof body !== 'object') return 'Provide the skill details.';
  if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 80) return 'Skill name must be between 2 and 80 characters.';
  if (!CATEGORIES.includes(body.category)) return 'Choose a valid skill category.';
  if (!LEVELS.includes(body.current_level)) return 'Choose a valid current proficiency level.';
  if (!LEVELS.includes(body.target_level)) return 'Choose a valid target proficiency level.';
  if (body.notes != null && (typeof body.notes !== 'string' || body.notes.length > 500)) return 'Notes must be 500 characters or fewer.';
  return null;
}
function cleanSkill(body, userId) {
  return {
    user_id: userId,
    name: body.name.trim(),
    category: body.category,
    current_level: body.current_level,
    target_level: body.target_level,
    notes: typeof body.notes === 'string' ? body.notes.trim() : ''
  };
}
module.exports = router;
