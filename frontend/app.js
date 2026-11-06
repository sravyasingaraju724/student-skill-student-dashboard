const API = '/api';
const LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];
const CATEGORIES = ['Programming', 'Web Development', 'Data & AI', 'Tools', 'Communication', 'Teamwork', 'Leadership', 'Problem Solving', 'Other'];
const LEVEL_NUMBER = Object.fromEntries(LEVELS.map((level, index) => [level, index + 1]));
const $ = (selector) => document.querySelector(selector);
let accessToken = sessionStorage.getItem('skilltrack_token') || '';
let currentUser = null;
let allSkills = [];
let editingSkillId = null;
let deletingSkillId = null;
let authMode = 'login';
let searchTimer = null;

function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function showToast(message, type = 'success') {
  const toast = document.createElement('div'); toast.className = `toast ${type === 'error' ? 'error' : ''}`; toast.textContent = message;
  $('#toast-region').appendChild(toast); window.setTimeout(() => toast.remove(), 3600);
}
async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(options.headers || {}) };
  let response;
  try { response = await fetch(`${API}${path}`, { ...options, headers }); }
  catch { throw new Error('Cannot reach the server. Check that the backend is running.'); }
  let data = {};
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) {
    if (response.status === 401 && accessToken && !path.startsWith('/auth/')) signOut(false);
    throw new Error(data.error || 'Request failed. Please try again.');
  }
  return data;
}
function setAuthMode(mode) {
  authMode = mode; const register = mode === 'register';
  $('#name-field').hidden = !register; $('#auth-name').required = register;
  $('#auth-title').textContent = register ? 'Create your account' : 'Sign in to SkillTrack';
  $('#auth-eyebrow').textContent = register ? 'START YOUR JOURNEY' : 'WELCOME BACK';
  $('#auth-subtitle').textContent = register ? 'Your next chapter starts with one small step.' : 'Pick up where your learning left off.';
  $('#auth-submit').innerHTML = register ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
  $('#auth-switch-copy').textContent = register ? 'Already have an account?' : 'New to SkillTrack?';
  $('#auth-switch').textContent = register ? 'Sign in' : 'Create an account';
  $('#auth-password').autocomplete = register ? 'new-password' : 'current-password'; $('#auth-error').textContent = '';
}
$('#auth-switch').addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));
$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault(); $('#auth-error').textContent = '';
  const button = $('#auth-submit'); button.disabled = true; button.textContent = authMode === 'register' ? 'Creating account…' : 'Signing in…';
  const payload = { email: $('#auth-email').value.trim(), password: $('#auth-password').value };
  if (authMode === 'register') payload.name = $('#auth-name').value.trim();
  try {
    const data = await api(`/auth/${authMode}`, { method: 'POST', body: JSON.stringify(payload) });
    if (data.needsEmailConfirmation) { $('#auth-error').textContent = data.message; return; }
    accessToken = data.accessToken; sessionStorage.setItem('skilltrack_token', accessToken); currentUser = data.user;
    await loadApp(); showToast(authMode === 'register' ? 'Welcome to SkillTrack!' : 'Welcome back!');
  } catch (error) { $('#auth-error').textContent = error.message; }
  finally { button.disabled = false; button.innerHTML = authMode === 'register' ? 'Create account <span>→</span>' : 'Sign in <span>→</span>'; }
});

async function loadApp() {
  const data = await api('/auth/me'); currentUser = data.user;
  $('#auth-view').hidden = true; $('#app-view').hidden = false;
  const name = currentUser.name || currentUser.email?.split('@')[0] || 'Student';
  $('#user-name').textContent = name; $('#user-avatar').textContent = (name.trim()[0] || 'S').toUpperCase();
  $('#welcome-heading').textContent = `Good to see you, ${name.split(/\s+/)[0]}.`;
  $('#today-label').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  populateSelects(); await showView('dashboard');
}
function signOut(showMessage = true) {
  accessToken = ''; currentUser = null; allSkills = []; sessionStorage.removeItem('skilltrack_token');
  $('#app-view').hidden = true; $('#auth-view').hidden = false; $('#auth-password').value = ''; setAuthMode('login');
  if (showMessage) showToast('You have signed out.');
}
$('#logout-button').addEventListener('click', () => signOut(true));
function populateSelects() {
  $('#skill-category').innerHTML = CATEGORIES.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  $('#category-filter').innerHTML = '<option value="">All categories</option>' + CATEGORIES.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  const options = LEVELS.map(level => `<option value="${level}">${level}</option>`).join(''); $('#skill-current').innerHTML = options; $('#skill-target').innerHTML = options;
}
async function showView(view) {
  if (view !== 'dashboard' && view !== 'skills') return;
  $('#dashboard-page').hidden = view !== 'dashboard'; $('#skills-page').hidden = view !== 'skills';
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  $('#breadcrumb-current').textContent = view === 'dashboard' ? 'Overview' : 'My skills';
  $('#sidebar').classList.remove('open'); $('#mobile-menu').setAttribute('aria-expanded', 'false');
  try { await refreshData(); } catch (error) { showToast(error.message, 'error'); }
}
document.querySelectorAll('.nav-item[data-view]').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
document.querySelectorAll('[data-go="skills"]').forEach(btn => btn.addEventListener('click', () => showView('skills')));
$('#mobile-menu').addEventListener('click', () => { const open = $('#sidebar').classList.toggle('open'); $('#mobile-menu').setAttribute('aria-expanded', String(open)); });
async function refreshData() {
  const [dashboard, skillData] = await Promise.all([api('/dashboard'), api('/skills')]);
  allSkills = skillData.skills || []; renderDashboard(dashboard); renderSkills(); $('#nav-skill-count').textContent = String(allSkills.length);
}
function renderDashboard(data) {
  const s = data.summary || {}; $('#stat-total').textContent = s.total ?? 0; $('#stat-track').textContent = s.onTrack ?? 0; $('#stat-progress').textContent = s.inProgress ?? 0; $('#stat-categories').textContent = s.categories ?? 0;
  const recent = data.recentSkills || [];
  $('#recent-skills').innerHTML = recent.length ? recent.map(skill => `<div class="recent-item"><div class="skill-symbol">${categorySymbol(skill.category)}</div><div class="recent-info"><strong>${escapeHTML(skill.name)}</strong><span>${escapeHTML(skill.category)} · ${escapeHTML(skill.current_level)} / ${escapeHTML(skill.target_level)}</span></div><span class="status-pill ${skill.status}">${skill.status === 'on-track' ? 'Target reached' : 'In progress'}</span></div>`).join('') : emptyState('✳', 'Your journey starts here', 'Add your first skill and set a target you want to work toward.', 'Add a skill', 'add');
  const categories = Object.entries(data.categoryCounts || {}).sort((a,b) => b[1]-a[1]); const max = Math.max(1, ...categories.map(c => c[1]));
  $('#category-breakdown').innerHTML = categories.length ? categories.slice(0, 5).map(([category, count]) => `<div class="category-line"><label>${escapeHTML(category)}</label><span>${count} ${count === 1 ? 'skill' : 'skills'}</span><div class="progress-track"><div class="progress-fill" style="width:${Math.round(count/max*100)}%"></div></div></div>`).join('') : '<div class="empty-state"><p>Your skill areas will appear here.</p></div>';
  $('#recent-skills').querySelector('[data-action="add"]')?.addEventListener('click', openAddDialog);
}
function categorySymbol(category) { const map = { 'Programming':'⌘','Web Development':'⌗','Data & AI':'◉','Tools':'⚙','Communication':'↗','Teamwork':'◎','Leadership':'✦','Problem Solving':'◇','Other':'✳' }; return map[category] || '✳'; }
function emptyState(icon, title, copy, buttonText, action) { return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${copy}</p>${buttonText ? `<button class="button button-primary" data-action="${action}">${buttonText} →</button>` : ''}</div>`; }
function renderSkills() {
  const search = $('#skill-search').value.trim().toLowerCase(), category = $('#category-filter').value, status = $('#status-filter').value;
  const filtered = allSkills.filter(s => (!search || s.name.toLowerCase().includes(search) || s.category.toLowerCase().includes(search)) && (!category || s.category === category) && (!status || s.status === status));
  $('#results-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'skill' : 'skills'}${filtered.length !== allSkills.length ? ` shown · ${allSkills.length} total` : ''}`;
  $('#skills-list').innerHTML = filtered.length ? filtered.map(skill => {
    const current = LEVEL_NUMBER[skill.current_level] || 1, target = LEVEL_NUMBER[skill.target_level] || 1;
    return `<article class="skill-row"><div class="skill-main"><div class="skill-symbol">${categorySymbol(skill.category)}</div><div><h3>${escapeHTML(skill.name)}</h3><p>${escapeHTML(skill.category)}</p></div></div><div class="level-cell"><span>Current level</span><strong>${escapeHTML(skill.current_level)}</strong><div class="level-track"><div style="width:${current/5*100}%"></div></div></div><div class="level-cell"><span>Target: ${escapeHTML(skill.target_level)}</span><span class="status-pill ${skill.status}">${skill.status === 'on-track' ? 'Target reached' : `${Math.max(0,target-current)} level${target-current===1?'':'s'} to go`}</span></div><div class="skill-actions"><button class="icon-button" data-edit="${skill.id}" aria-label="Edit ${escapeHTML(skill.name)}" title="Edit skill">✎</button><button class="icon-button delete" data-delete="${skill.id}" aria-label="Delete ${escapeHTML(skill.name)}" title="Delete skill">×</button></div></article>`;
  }).join('') : emptyState('⌕', allSkills.length ? 'No matching skills' : 'Nothing tracked yet', allSkills.length ? 'Try changing your search or filters.' : 'Add a skill to start building your personal learning record.', allSkills.length ? '' : 'Add a skill', 'add');
  $('#skills-list').querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openEditDialog(btn.dataset.edit)));
  $('#skills-list').querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => openDeleteDialog(btn.dataset.delete)));
  $('#skills-list').querySelector('[data-action="add"]')?.addEventListener('click', openAddDialog);
}
$('#skill-search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderSkills, 120); });
$('#category-filter').addEventListener('change', renderSkills); $('#status-filter').addEventListener('change', renderSkills);
$('#add-skill-top').addEventListener('click', openAddDialog); $('#add-skill-list').addEventListener('click', openAddDialog);
function openAddDialog() {
  editingSkillId = null; $('#skill-form').reset(); $('#skill-id').value = ''; $('#dialog-title').textContent = 'Add a skill'; $('#dialog-eyebrow').textContent = 'MAKE IT COUNT'; $('#skill-save').innerHTML = 'Save skill <span>→</span>'; $('#skill-form-error').textContent = ''; $('#notes-count').textContent = '0'; $('#skill-current').value = 'Beginner'; $('#skill-target').value = 'Intermediate'; $('#skill-dialog').showModal(); $('#skill-name').focus();
}
function openEditDialog(id) {
  const skill = allSkills.find(s => s.id === id); if (!skill) return;
  editingSkillId = id; $('#skill-id').value = id; $('#skill-name').value = skill.name; $('#skill-category').value = skill.category; $('#skill-current').value = skill.current_level; $('#skill-target').value = skill.target_level; $('#skill-notes').value = skill.notes || ''; $('#notes-count').textContent = String((skill.notes || '').length); $('#dialog-title').textContent = 'Update your skill'; $('#dialog-eyebrow').textContent = 'PROGRESS CHECK-IN'; $('#skill-save').innerHTML = 'Save changes <span>→</span>'; $('#skill-form-error').textContent = ''; $('#skill-dialog').showModal(); $('#skill-name').focus();
}
$('#skill-notes').addEventListener('input', () => $('#notes-count').textContent = String($('#skill-notes').value.length));
$('#skill-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#skill-form-error').textContent = '';
  const name = $('#skill-name').value.trim(); if (name.length < 2) { $('#skill-form-error').textContent = 'Enter a skill name with at least 2 characters.'; return; }
  const body = { name, category: $('#skill-category').value, current_level: $('#skill-current').value, target_level: $('#skill-target').value, notes: $('#skill-notes').value.trim() };
  const button = $('#skill-save'); button.disabled = true; button.textContent = 'Saving…';
  try { const data = await api(editingSkillId ? `/skills/${encodeURIComponent(editingSkillId)}` : '/skills', { method: editingSkillId ? 'PUT' : 'POST', body: JSON.stringify(body) }); $('#skill-dialog').close(); await refreshData(); showToast(data.message || 'Skill saved.'); }
  catch (error) { $('#skill-form-error').textContent = error.message; }
  finally { button.disabled = false; button.innerHTML = editingSkillId ? 'Save changes <span>→</span>' : 'Save skill <span>→</span>'; }
});
function openDeleteDialog(id) { deletingSkillId = id; $('#confirm-dialog').showModal(); }
$('#dialog-close').addEventListener('click', () => $('#skill-dialog').close()); $('#dialog-cancel').addEventListener('click', () => $('#skill-dialog').close());
$('#delete-cancel').addEventListener('click', () => $('#confirm-dialog').close());
$('#delete-confirm').addEventListener('click', async () => {
  if (!deletingSkillId) return; const button = $('#delete-confirm'); button.disabled = true; button.textContent = 'Deleting…';
  try { const data = await api(`/skills/${encodeURIComponent(deletingSkillId)}`, { method: 'DELETE' }); $('#confirm-dialog').close(); deletingSkillId = null; await refreshData(); showToast(data.message || 'Skill deleted.'); }
  catch (error) { showToast(error.message, 'error'); }
  finally { button.disabled = false; button.textContent = 'Delete skill'; }
});
$('#skill-dialog').addEventListener('click', event => { if (event.target === $('#skill-dialog')) $('#skill-dialog').close(); });
$('#confirm-dialog').addEventListener('click', event => { if (event.target === $('#confirm-dialog')) $('#confirm-dialog').close(); });

(async function init() {
  if (!accessToken) return;
  try { await loadApp(); } catch { signOut(false); }
})();
