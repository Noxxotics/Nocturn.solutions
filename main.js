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
const scaler = document.getElementById('scaler');

function applyScale() {
  const avail = Math.min(window.innerWidth - 32, 700);
  if (avail < 700) {
    const s = avail / 700;
    scaler.style.transform = 'scale(' + s + ')';
    scaler.style.height = (450 * s) + 'px';
    scaler.style.width  = (700 * s) + 'px';
  } else {
    scaler.style.transform = '';
    scaler.style.height = '450px';
    scaler.style.width  = '700px';
  }
}

window.addEventListener('resize', applyScale);
applyScale();

// Init
renderTabBar();
showPanel();
