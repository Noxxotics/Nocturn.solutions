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
  try {
    return JSON.parse(localStorage.getItem('nc_user')) ||
           JSON.parse(sessionStorage.getItem('nc_user'));
  } catch { return null; }
}

function setSession(data, remember) {
  // Never store password — only username, subscriptions, and cached info
  const safe = { username: data.username, subscriptions: data.subscriptions, info: data.info || null };
  const str = JSON.stringify(safe);
  if (remember) {
    localStorage.setItem('nc_user', str);
    sessionStorage.removeItem('nc_user');
  } else {
    sessionStorage.setItem('nc_user', str);
    localStorage.removeItem('nc_user');
  }
}

function clearSession() {
  sessionStorage.removeItem('nc_user');
  localStorage.removeItem('nc_user');
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
const refreshBtn     = document.getElementById('refreshInfoBtn');

// Auth modal
const authOverlay    = document.getElementById('authOverlay');
const authClose      = document.getElementById('authClose');
const loginForm      = document.getElementById('loginForm');
const registerForm   = document.getElementById('registerForm');
const loginMsg       = document.getElementById('loginMsg');
const registerMsg    = document.getElementById('registerMsg');

// Re-auth modal
const reauthOverlay  = document.getElementById('reauthOverlay');
const reauthForm     = document.getElementById('reauthForm');
const reauthMsg      = document.getElementById('reauthMsg');
const reauthClose    = document.getElementById('reauthClose');

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

  panelAvatar.textContent   = initials(session.username);
  panelUsername.textContent = session.username;
  hwidDisplay.textContent   = hwid();
  downloadBtn.href          = session.loaderUrl || '#';

  if (session.info) populateInfo(session.info);
  else populateInfoFallback();
}

// ── Info fetch (requires password via re-auth) ────────────────────────────

async function fetchInfoWithPass(username, pass) {
  const r = await proxyPost({ type: 'info', username, pass, hwid: hwid() });
  if (r.success) {
    const info = r.info || r;
    populateInfo(info);
    const session = getSession();
    const persisted = !!localStorage.getItem('nc_user');
    if (session) setSession({ ...session, info }, persisted);
    return { success: true };
  }
  return { success: false, message: r.message || 'Failed to load info.' };
}

function populateInfo(info) {
  const sub = info.subscriptions?.[0];
  const subName  = sub?.subscription || 'Active';
  const expiryEp = sub?.expiry;
  const expired  = sub?.expired === true || sub?.expired === 'true';
  const days     = daysLeft(expiryEp);

  const badgeCls = expired ? 'expired' : 'active';
  const badgeTxt = expired ? 'Expired' : 'Active';
  cardStatus.innerHTML = `<span class="pcard-badge ${badgeCls} dot">${badgeTxt}</span>`;
  cardSub.textContent  = subName;
  cardExpiry.textContent = expiryEp && expiryEp !== 'None' ? fmtDate(expiryEp) : 'Lifetime';
  if (days !== null && !expired) {
    cardDaysLeft.textContent = days <= 0 ? 'Expires today' : `${days} day${days !== 1 ? 's' : ''} left`;
  }

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

// ── Re-auth modal ─────────────────────────────────────────────────────────
// Used for Refresh info and HWID reset — prompts password since we don't store it

let reauthCallback = null; // function(pass) to call after re-auth

function openReauth(onSuccess) {
  reauthCallback = onSuccess;
  reauthMsg.hidden = true;
  reauthForm.reset();
  reauthOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  reauthForm.querySelector('[name=reauth_pass]')?.focus();
}

function closeReauth() {
  reauthOverlay.hidden = true;
  document.body.style.overflow = '';
  reauthCallback = null;
}

reauthClose?.addEventListener('click', closeReauth);
reauthOverlay?.addEventListener('click', e => { if (e.target === reauthOverlay) closeReauth(); });

reauthForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const pass = reauthForm.querySelector('[name=reauth_pass]').value;
  const btn  = reauthForm.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Verifying…';
  reauthMsg.hidden = true;

  const session = getSession();
  if (!session) { closeReauth(); return; }

  // Verify password by attempting a login
  try {
    const r = await proxyPost({ type: 'login', username: session.username, pass, hwid: hwid() });
    if (r.success) {
      closeReauth();
      if (reauthCallback) await reauthCallback(pass);
    } else {
      reauthMsg.textContent = 'Invalid password.';
      reauthMsg.className   = 'auth-msg error';
      reauthMsg.hidden      = false;
    }
  } catch {
    reauthMsg.textContent = 'Connection error — try again.';
    reauthMsg.className   = 'auth-msg error';
    reauthMsg.hidden      = false;
  }

  btn.disabled = false;
  btn.textContent = 'Confirm';
});

// ── Refresh info button ───────────────────────────────────────────────────

refreshBtn?.addEventListener('click', () => {
  const session = getSession();
  if (!session) return;
  openReauth(async (pass) => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing…';
    const result = await fetchInfoWithPass(session.username, pass);
    if (!result.success) {
      // silently fall back to cached
    }
    refreshBtn.disabled  = false;
    refreshBtn.textContent = 'Refresh';
  });
});

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
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!authOverlay?.hidden) closeAuth();
    if (!reauthOverlay?.hidden) closeReauth();
  }
});
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
  const remember = document.getElementById('loginRemember')?.checked || false;
  try {
    const r = await proxyPost({ type: 'login', username: u, pass: p, hwid: hwid() });
    if (r.success) {
      const sub = r.info?.subscriptions?.[0]?.subscription || 'Active';
      // Password never stored — only username, sub tier, and cached info
      setSession({ username: u, subscriptions: sub, info: r.info || null }, remember);
      closeAuth();
      showDashboard(getSession());
    } else {
      setMsg(loginMsg, r.message || 'Invalid credentials.', true);
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
  const key = registerForm.querySelector('[name=key]').value.trim();
  const btn = document.getElementById('registerSubmit');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Registering…';
  try {
    const r = await proxyPost({ type: 'register', username: u, pass: p, key, email: em });
    if (r.success) {
      setSession({ username: u, subscriptions: 'Active' });
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

// ── HWID reset (requires re-auth) ────────────────────────────────────────

hwidResetBtn?.addEventListener('click', () => {
  const session = getSession();
  if (!session) return;

  openReauth(async (pass) => {
    hwidResetBtn.disabled    = true;
    hwidResetBtn.textContent = 'Resetting…';
    hwidMsg.hidden = true;

    try {
      const r = await proxyPost({ type: 'resetuser', username: session.username, pass });
      if (r.success) {
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
});

// ── Init ──────────────────────────────────────────────────────────────────

(function init() {
  const session = getSession();
  if (session) showDashboard(session);
  else showGate();
})();
