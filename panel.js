// panel.js — Nocturn customer panel
// Talks to the Cloudflare Worker proxy (same as main site).
// Update PROXY_URL to your deployed worker URL.

const PROXY_URL = 'https://nocturn-solutions.noxxotics.workers.dev';

// ── Helpers ───────────────────────────────────────────────────────────────

function hwid() {
  let id = localStorage.getItem('nc_hwid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('nc_hwid', id);
  }
  return id;
}

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('nc_user')); } catch { return null; }
}

function setSession(data) {
  sessionStorage.setItem('nc_user', JSON.stringify(data));
}

function clearSession() {
  sessionStorage.removeItem('nc_user');
}

async function proxyPost(params) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

function fmtDate(epoch) {
  if (!epoch || epoch === 'None') return '—';
  const d = new Date(Number(epoch) * 1000);
  if (isNaN(d)) return epoch;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysLeft(epoch) {
  if (!epoch || epoch === 'None') return null;
  const ms = Number(epoch) * 1000 - Date.now();
  if (isNaN(ms)) return null;
  const days = Math.ceil(ms / 86400000);
  return days;
}

function initials(name) {
  return (name || '?').charAt(0).toUpperCase();
}

// ── DOM refs ──────────────────────────────────────────────────────────────

const panelGate      = document.getElementById('panelGate');
const panelDashboard = document.getElementById('panelDashboard');
const gateLoginBtn   = document.getElementById('gateLoginBtn');
const panelLogoutBtn = document.getElementById('panelLogoutBtn');
const navLogoutLink  = document.getElementById('navLogoutLink');

const panelAvatar    = document.getElementById('panelAvatar');
const panelUsername  = document.getElementById('panelUsername');

const cardStatus     = document.getElementById('cardStatus');
const cardSub        = document.getElementById('cardSub');
const cardExpiry     = document.getElementById('cardExpiry');
const cardDaysLeft   = document.getElementById('cardDaysLeft');

const infoUsername   = document.getElementById('infoUsername');
const infoEmail      = document.getElementById('infoEmail');
const infoSub        = document.getElementById('infoSub');
const infoExpiry     = document.getElementById('infoExpiry');
const infoLastLogin  = document.getElementById('infoLastLogin');
const infoCreated    = document.getElementById('infoCreated');

const hwidDisplay    = document.getElementById('hwidDisplay');
const hwidResetBtn   = document.getElementById('hwidResetBtn');
const hwidMsg        = document.getElementById('hwidMsg');

const downloadBtn    = document.getElementById('downloadBtn');

// Auth modal
const authOverlay    = document.getElementById('authOverlay');
const authClose      = document.getElementById('authClose');
const loginForm      = document.getElementById('loginForm');
const registerForm   = document.getElementById('registerForm');
const loginMsg       = document.getElementById('loginMsg');
const registerMsg    = document.getElementById('registerMsg');

// ── Panel render ──────────────────────────────────────────────────────────

function showGate() {
  panelGate.hidden      = false;
  panelDashboard.hidden = true;
  navLogoutLink.hidden  = true;
}

function showDashboard(session) {
  panelGate.hidden      = true;
  panelDashboard.hidden = false;
  navLogoutLink.hidden  = false;

  // Header
  panelAvatar.textContent  = initials(session.username);
  panelUsername.textContent = session.username;

  // HWID display
  hwidDisplay.textContent = hwid();

  // Loader download link — update href to your real loader URL
  downloadBtn.href = session.loaderUrl || '#';

  // Fetch live info from KeyAuth
  fetchInfo(session.username, session.pass);
}

async function fetchInfo(username, pass) {
  try {
    const r = await proxyPost({ type: 'info', username, pass, hwid: hwid() });
    if (r.success) {
      populateInfo(r.info || r);
    } else {
      // session may have expired — show what we have cached
      populateInfoFallback();
    }
  } catch {
    populateInfoFallback();
  }
}

function populateInfo(info) {
  // Subscriptions array — pick first active one
  const sub = info.subscriptions?.[0];
  const subName  = sub?.subscription || 'Active';
  const expiryEp = sub?.expiry;
  const expired  = sub?.expired === true || sub?.expired === 'true';
  const days     = daysLeft(expiryEp);

  // Stat cards
  const badgeCls = expired ? 'expired' : 'active';
  const badgeTxt = expired ? 'Expired' : 'Active';
  cardStatus.innerHTML = `<span class="pcard-badge ${badgeCls} dot">${badgeTxt}</span>`;
  cardSub.textContent  = subName;
  cardExpiry.textContent = expiryEp && expiryEp !== 'None' ? fmtDate(expiryEp) : 'Lifetime';
  if (days !== null && !expired) {
    cardDaysLeft.textContent = days <= 0 ? 'Expires today' : `${days} day${days !== 1 ? 's' : ''} left`;
  }

  // Detail rows
  infoUsername.textContent  = info.username   || '—';
  infoEmail.textContent     = info.email      || '—';
  infoSub.textContent       = subName;
  infoExpiry.textContent    = expiryEp && expiryEp !== 'None' ? fmtDate(expiryEp) : 'Lifetime';
  infoLastLogin.textContent = info.lastlogin  ? fmtDate(info.lastlogin)  : '—';
  infoCreated.textContent   = info.createdate ? fmtDate(info.createdate) : '—';
}

function populateInfoFallback() {
  const session = getSession();
  cardStatus.innerHTML = `<span class="pcard-badge active dot">Active</span>`;
  cardSub.textContent  = session?.subscriptions || 'Active';
  cardExpiry.textContent = '—';
  infoUsername.textContent = session?.username || '—';
}

// ── Auth modal ────────────────────────────────────────────────────────────

function openAuth(tab = 'login') {
  loginForm.hidden    = tab !== 'login';
  registerForm.hidden = tab !== 'register';
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.auth === tab);
  });
  authOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeAuth() {
  authOverlay.hidden = true;
  document.body.style.overflow = '';
}

function setMsg(el, text, isError) {
  el.textContent = text;
  el.className   = 'auth-msg ' + (isError ? 'error' : 'success');
  el.hidden = false;
}

gateLoginBtn?.addEventListener('click', () => openAuth('login'));
authClose?.addEventListener('click', closeAuth);
authOverlay?.addEventListener('click', e => { if (e.target === authOverlay) closeAuth(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !authOverlay?.hidden) closeAuth(); });
document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => openAuth(btn.dataset.auth));
});

// Login
loginForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const u   = loginForm.querySelector('[name=username]').value.trim();
  const p   = loginForm.querySelector('[name=password]').value;
  const btn = document.getElementById('loginSubmit');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Logging in…';
  try {
    const r = await proxyPost({ type: 'login', username: u, pass: p, hwid: hwid() });
    if (r.success) {
      const sub = r.info?.subscriptions?.[0]?.subscription || 'Active';
      setSession({ username: u, pass: p, subscriptions: sub });
      closeAuth();
      showDashboard(getSession());
    } else {
      setMsg(loginMsg, r.message || 'Login failed.', true);
    }
  } catch {
    setMsg(loginMsg, 'Connection error — try again.', true);
  }
  btn.disabled = false;
  btn.querySelector('span').textContent = 'Login';
});

// Register
registerForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const u   = registerForm.querySelector('[name=username]').value.trim();
  const p   = registerForm.querySelector('[name=password]').value;
  const em  = registerForm.querySelector('[name=email]').value.trim();
  const btn = document.getElementById('registerSubmit');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Registering…';
  try {
    const r = await proxyPost({ type: 'register', username: u, pass: p, key: '', email: em });
    if (r.success) {
      setSession({ username: u, pass: p, subscriptions: 'Active' });
      closeAuth();
      showDashboard(getSession());
    } else {
      setMsg(registerMsg, r.message || 'Registration failed.', true);
    }
  } catch {
    setMsg(registerMsg, 'Connection error — try again.', true);
  }
  btn.disabled = false;
  btn.querySelector('span').textContent = 'Create Account';
});

// ── Logout ────────────────────────────────────────────────────────────────

function logout() {
  clearSession();
  showGate();
}

panelLogoutBtn?.addEventListener('click', logout);
navLogoutLink?.addEventListener('click', e => { e.preventDefault(); logout(); });

// ── HWID reset ────────────────────────────────────────────────────────────

hwidResetBtn?.addEventListener('click', async () => {
  const session = getSession();
  if (!session) return;

  hwidResetBtn.disabled = true;
  hwidResetBtn.textContent = 'Resetting…';
  hwidMsg.hidden = true;

  try {
    const r = await proxyPost({ type: 'resetuser', username: session.username });
    if (r.success) {
      // Generate new HWID and store it
      const newId = crypto.randomUUID();
      localStorage.setItem('nc_hwid', newId);
      hwidDisplay.textContent = newId;

      hwidMsg.textContent = 'HWID reset — your next login will register this machine.';
      hwidMsg.className   = 'panel-msg success';
      hwidMsg.hidden      = false;
    } else {
      hwidMsg.textContent = r.message || 'Reset failed. Try again or contact support.';
      hwidMsg.className   = 'panel-msg error';
      hwidMsg.hidden      = false;
    }
  } catch {
    hwidMsg.textContent = 'Connection error. Try again.';
    hwidMsg.className   = 'panel-msg error';
    hwidMsg.hidden      = false;
  }

  hwidResetBtn.disabled    = false;
  hwidResetBtn.textContent = 'Reset HWID';
});

// ── Init ──────────────────────────────────────────────────────────────────

(function init() {
  const session = getSession();
  if (session) {
    showDashboard(session);
  } else {
    showGate();
  }
})();
