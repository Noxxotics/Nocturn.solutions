document.addEventListener('DOMContentLoaded', function () {

const TABS = [
  { subs: ['General', 'Misc'], panels: ['p-esp-gen', 'p-esp-misc'] },
  { subs: ['Triggerbot'],      panels: ['p-aim'] },
  { subs: ['General'],         panels: ['p-misc'] },
  { subs: ['Profiles'],        panels: ['p-config'] },
  { subs: ['Settings'],        panels: ['p-settings'] },
];

let activeTab = 0;
let activeSub = 0;

const tabbar    = document.getElementById('tabbar');
const stabs     = document.querySelectorAll('.stab');
const allPanels = ['p-esp-gen', 'p-esp-misc', 'p-aim', 'p-misc', 'p-config', 'p-settings']
  .map(id => document.getElementById(id));

function showPanel() {
  allPanels.forEach(p => { p.hidden = true; });
  const t = TABS[activeTab];
  const idx = Math.min(activeSub, t.panels.length - 1);
  document.getElementById(t.panels[idx]).hidden = false;
}

function renderTabBar() {
  tabbar.innerHTML = '';
  TABS[activeTab].subs.forEach((sub, i) => {
    const btn = document.createElement('button');
    btn.className = 'tbtn' + (i === activeSub ? ' active' : '');
    btn.textContent = sub;
    btn.addEventListener('click', () => {
      activeSub = i;
      renderTabBar();
      showPanel();
    });
    tabbar.appendChild(btn);
  });
}

// Sidebar tab switching
stabs.forEach((s, i) => {
  s.addEventListener('click', () => {
    stabs.forEach(x => x.classList.remove('active'));
    s.classList.add('active');
    activeTab = i;
    activeSub = 0;
    renderTabBar();
    showPanel();
  });

  s.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      s.click();
    }
  });
});

// Toggles
document.addEventListener('click', e => {
  const tog = e.target.closest('.tog');
  if (tog && tog.closest('.menu-window')) {
    const on = tog.classList.toggle('on');
    tog.setAttribute('aria-checked', String(on));
  }
});

// Checkboxes
document.addEventListener('click', e => {
  const chk = e.target.closest('.chk');
  if (chk && chk.closest('.menu-window')) {
    const on = chk.classList.toggle('on');
    chk.setAttribute('aria-checked', String(on));
  }
});

// Sliders
document.querySelectorAll('.sld').forEach(sld => {
  function update() {
    const pct = (sld.value - sld.min) / (sld.max - sld.min) * 100;
    sld.style.setProperty('--pct', pct + '%');
    const val = sld.nextElementSibling;
    if (val && val.classList.contains('sld-val')) {
      val.textContent = sld.value;
    }
  }
  sld.addEventListener('input', update);
  update();
});

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navMobile = document.getElementById('navMobile');

if (navToggle && navMobile) {
  navToggle.addEventListener('click', () => {
    navMobile.classList.toggle('open');
  });

  navMobile.querySelectorAll('.nav-mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      navMobile.classList.remove('open');
    });
  });
}

// Responsive scale for menu
const scaler  = document.getElementById('scaler');
const espWin  = document.getElementById('esp-win');

function applyScale() {
  const wide   = window.innerWidth > 900;
  const BASE_W = wide ? 1120 : 700;
  const avail  = Math.min(window.innerWidth - 32, BASE_W);
  if (espWin) espWin.hidden = !wide;
  scaler.style.width = BASE_W + 'px'; // keep natural width — overflow:hidden on parent clips it
  if (avail < BASE_W) {
    const s = avail / BASE_W;
    scaler.style.transform = 'scale(' + s + ')';
    scaler.style.height    = (450 * s) + 'px';
  } else {
    scaler.style.transform = '';
    scaler.style.height    = '450px';
  }
}

window.addEventListener('resize', applyScale);
applyScale();

// ── ESP Canvas ──────────────────────────────────────────────────────
const espCanvas = document.getElementById('esp-canvas');
if (espCanvas) {
  const ctx = espCanvas.getContext('2d');

  function getESPState() {
    const panel = document.getElementById('p-esp-gen');
    const map = {};
    if (panel) panel.querySelectorAll('.row').forEach(row => {
      const lbl = row.querySelector('.rlabel')?.textContent?.trim();
      const w   = row.querySelector('.tog, .chk');
      if (lbl && w) map[lbl] = w.classList.contains('on');
    });
    return {
      enabled:   map['Enable ESP'] !== false,
      box:       map['Boxes']      === true,
      names:     map['Names']      === true,
      weapon:    map['Weapon']     === true,
      healthBar: map['Health bar'] === true,
      skeleton:  map['Skeleton']   === true,
      tracers:   map['Tracers']    === true,
    };
  }

  function txt(text, x, y, color, size) {
    ctx.save();
    ctx.font = size + 'px "Courier New",monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawBg(W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.66);
    g.addColorStop(0, '#08080e');
    g.addColorStop(1, '#0b0b14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.66);
    ctx.fillStyle = '#09090f';
    ctx.fillRect(0, H * 0.66, W, H * 0.34);
    ctx.strokeStyle = '#141420';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H * 0.66); ctx.lineTo(W, H * 0.66); ctx.stroke();
    // faint tiles
    ctx.strokeStyle = 'rgba(16,16,28,0.6)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 5; i++) {
      const y = H * 0.66 + (H * 0.34 * i / 5);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // structural edges
    ctx.strokeStyle = 'rgba(22,22,36,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(70, H * 0.66); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 90, 0); ctx.lineTo(W - 90, H * 0.66); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 90, H * 0.14); ctx.lineTo(W, H * 0.14); ctx.stroke();
  }

  function drawSilhouette(cx, cy, bw, bh) {
    const hR = bw * 0.29;
    const hY = cy - bh / 2 + hR;
    const nY = hY + hR;
    const sW = bw * 0.44;
    const hipW = bw * 0.28;
    const hipY = cy + bh * 0.12;
    const fY = cy + bh / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(80,30,180,0.2)';
    ctx.beginPath(); ctx.arc(cx, hY, hR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - sW, nY); ctx.lineTo(cx + sW, nY);
    ctx.lineTo(cx + hipW, hipY); ctx.lineTo(cx - hipW, hipY);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - hipW, hipY); ctx.lineTo(cx - hipW + 2, fY);
    ctx.lineTo(cx - 2, fY); ctx.lineTo(cx - hipW * 0.25, hipY); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + hipW, hipY); ctx.lineTo(cx + hipW - 2, fY);
    ctx.lineTo(cx + 2, fY); ctx.lineTo(cx + hipW * 0.25, hipY); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawBox(bx, by, bw, bh) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.restore();
  }

  function drawHealthBar(bx, by, bh) {
    ctx.save();
    ctx.fillStyle = 'rgba(192,57,43,0.75)';
    ctx.fillRect(bx - 5, by, 2, bh);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(bx - 5, by, 2, bh);
    ctx.restore();
  }

  function drawSkeleton(cx, cy, bh) {
    const hY  = cy - bh / 2 + 10;
    const nY  = hY + 10;
    const cY  = cy - bh * 0.08;
    const hipY = cy + bh * 0.12;
    const fY  = cy + bh / 2;
    const kY  = hipY + (fY - hipY) * 0.5;
    ctx.save();
    ctx.strokeStyle = 'rgba(196,181,253,0.75)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    const ln = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); };
    ln(cx, nY, cx, hipY);
    ln(cx, nY + 2, cx - 17, cY + 8); ln(cx, nY + 2, cx + 17, cY + 8);
    ln(cx - 8, hipY, cx - 9, kY); ln(cx - 9, kY, cx - 8, fY);
    ln(cx + 8, hipY, cx + 9, kY); ln(cx + 9, kY, cx + 8, fY);
    ctx.fillStyle = 'rgba(196,181,253,0.85)';
    [[cx, hY, 4.5],[cx, nY, 2],[cx, hipY, 2],
     [cx-17, cY+8, 2],[cx+17, cY+8, 2],[cx-9, kY, 2],[cx+9, kY, 2]].forEach(([x,y,r]) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  function draw(ts) {
    const t = ts * 0.001;
    const W = espCanvas.width;
    const H = espCanvas.height;
    ctx.clearRect(0, 0, W, H);
    drawBg(W, H);

    const s = getESPState();
    if (!s.enabled) {
      txt('ESP Disabled', W / 2, H / 2, 'rgba(115,115,135,0.6)', 12);
      requestAnimationFrame(draw);
      return;
    }

    const cx = W * 0.5;
    const cy = H * 0.42;
    const bw = 56;
    const bh = 116;
    const bx = cx - bw / 2;
    const by = cy - bh / 2;

    drawSilhouette(cx, cy, bw, bh);
    if (s.skeleton)   drawSkeleton(cx, cy, bh);
    if (s.tracers) {
      ctx.save();
      ctx.strokeStyle = 'rgba(138,92,246,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W / 2, H); ctx.lineTo(cx, by + bh); ctx.stroke();
      ctx.restore();
    }
    if (s.box)       drawBox(bx, by, bw, bh);
    if (s.healthBar) drawHealthBar(bx, by, bh);
    if (s.names)     txt('NoxXotics', cx, by - 9, '#ffffff', 9);
    const dist = Math.round((Math.sin(t * 0.85) + 1) * 50);
    txt('[' + dist + 'm]', cx, by + bh + 11, '#c4b5fd', 9);
    if (s.weapon)    txt('AK-47', cx, by + bh + 24, 'rgba(196,181,253,0.65)', 8);

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

// Init
renderTabBar();
showPanel();

}); // DOMContentLoaded
