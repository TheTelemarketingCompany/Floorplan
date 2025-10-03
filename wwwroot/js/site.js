// Floorplan demo: button-based floor switcher + search + colour + click details

const seatColor = (state) => {
  const s = String(state || '').toLowerCase();
  if (s === 'compliant') return '#2ecc71';
  if (s === 'noncompliant') return '#e67e22';
  return '#5b6778';
};

async function loadSvgInto(hostId, url){
  const host = document.getElementById(hostId);
  if (!host) return null;
  const res = await fetch(url);
  if (!res.ok) { host.textContent = `Failed to load SVG (${res.status})`; return null; }
  host.innerHTML = await res.text();
  return host.querySelector('svg');
}

async function fetchDevices(){
  try {
    const r = await fetch('/api/devices', { credentials: 'include' });
    if (r.ok) return (await r.json()).value || [];
  } catch {}
  const r2 = await fetch('/seats.sample.json');
  return (await r2.json()).value || [];
}

function mapComplianceBySeat(devices){
  const map = new Map();
  for (const d of devices){
    const m = String(d.deviceName || '').match(/\b(TMC(?!IT)[A-Z]*\d{2,5})/i);
    if (m) map.set(m[1].toUpperCase(), String(d.complianceState || 'unknown'));
  }
  return map;
}

function bindSeatInteractions(svg, complianceMap){
  // Bind to ALL .seat groups; colour known seats, leave unknown grey.
  const seats = svg.querySelectorAll('.seat');
  seats.forEach((g) => {
    const id = (g.id || '').toUpperCase();
    const rect = g.querySelector('rect') || g;
    const state = complianceMap.get(id) || 'unknown';
    if (complianceMap.has(id)) rect.style.fill = seatColor(state);

    g.style.cursor = 'pointer';
    g.addEventListener('click', () => showDetails(id, state));
  });

  // reset details
  const box = document.getElementById('details');
  if (box) box.textContent = 'Click a seat…';
}

function showDetails(seatId, state){
  const box = document.getElementById('details');
  if (box) box.innerHTML = `<div><strong>${seatId}</strong></div><div>Compliance: ${state || 'unknown'}</div>`;
}

function showCounts(complianceMap){
  const counts = { compliant:0, noncompliant:0, unknown:0 };
  for (const state of complianceMap.values()){
    const s = String(state||'unknown').toLowerCase();
    counts[s] = (counts[s]||0) + 1;
  }
  const box = document.getElementById('counts');
  if (box) {
    box.textContent =
      `Seats coloured — Compliant: ${counts.compliant||0} · Non-compliant: ${counts.noncompliant||0} · Unknown: ${counts.unknown||0}`;
  }
}

async function loadAndPaint(floorFile){
  const svg = await loadSvgInto('svgHost', `/${floorFile}`);
  if (!svg) return;
  const devices = await fetchDevices();
  const map = mapComplianceBySeat(devices);
  bindSeatInteractions(svg, map);
  showCounts(map);

  // search fade
  const search = document.getElementById('seatSearch');
  if (search){
    const apply = () => {
      const q = search.value.trim().toUpperCase();
      svg.querySelectorAll('.seat').forEach(g => {
        const id = (g.id || '').toUpperCase();
        const rect = g.querySelector('rect') || g;
        rect.style.opacity = (q && !id.includes(q)) ? 0.2 : 1;
      });
    };
    search.oninput = apply;
    apply(); // apply current value when floor changes
  }
}

function bindFloorButtons(){
  const bar = document.getElementById('floorBar');
  if (!bar) return;
  const btns = Array.from(bar.querySelectorAll('button.btn'));

  // default active (first with .active or first button)
  let active = btns.find(b => b.classList.contains('active')) || btns[0];
  if (!active) return;

  const setActive = (btn) => {
    btns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };

  const loadFromBtn = async (btn) => {
    const file = btn.getAttribute('data-file');
    setActive(btn);
    await loadAndPaint(file);
  };

  // Bind clicks
  btns.forEach(b => b.addEventListener('click', () => loadFromBtn(b)));

  // Initial load
  loadFromBtn(active);
}

// Boot
(async function init(){
  bindFloorButtons();
})();
