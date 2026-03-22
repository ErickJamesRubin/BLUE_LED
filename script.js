// ============================================================
// script.js — ESP32 LED Dashboard Logic
// Mobile Legends Theme  |  PHP + MySQL Backend
// ============================================================

// ── Configuration ─────────────────────────────────────────
const API_UPDATE = 'update.php';
const API_STATUS = 'get_status.php';
const POLL_MS    = 2000;   // how often to refresh status

// ── State ──────────────────────────────────────────────────
let currentStatus  = -1;    // -1 = unknown on load
let pollTimer      = null;
let toastTimer     = null;
let soundEnabled   = false;  // start muted (browser autoplay policy)
let logData        = [];     // cached log rows

// ── DOM references ─────────────────────────────────────────
const ledBulb      = document.getElementById('led-bulb');
const statusBadge  = document.getElementById('status-badge');
const statusDot    = document.getElementById('status-dot');
const statusText   = document.getElementById('status-text');
const statusTime   = document.getElementById('status-time');
const statusCode   = document.getElementById('status-code');
const btnOn        = document.getElementById('btn-on');
const btnOff       = document.getElementById('btn-off');
const btnBlink     = document.getElementById('btn-blink');
const logBody      = document.getElementById('log-body');
const toast        = document.getElementById('toast');
const soundToggle  = document.getElementById('sound-toggle');
const bgMusic      = document.getElementById('bg-music');

// ── Sound control ──────────────────────────────────────────
soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    bgMusic.play().catch(() => {});
    soundToggle.textContent = '🔊';
    soundToggle.title = 'Mute music';
  } else {
    bgMusic.pause();
    soundToggle.textContent = '🔇';
    soundToggle.title = 'Play music';
  }
});

// Attempt autoplay on first user interaction with the page
document.addEventListener('click', function startMusic() {
  if (!soundEnabled && bgMusic.paused) {
    bgMusic.play()
      .then(() => {
        soundEnabled = true;
        soundToggle.textContent = '🔊';
      })
      .catch(() => {}); // autoplay blocked — that's fine
  }
  document.removeEventListener('click', startMusic);
}, { once: true });

// ── Utility: show toast ────────────────────────────────────
/**
 * @param {string} msg     Message text
 * @param {'info'|'success'|'error'} type
 */
function showToast(msg, type = 'info') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `show ${type}`;
  toastTimer = setTimeout(() => { toast.className = ''; }, 3000);
}

// ── Utility: format timestamp ──────────────────────────────
function formatTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr.replace(' ', 'T'));
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr.replace(' ', 'T'));
  return d.toLocaleString([], {
    month  : 'short',
    day    : '2-digit',
    hour   : '2-digit',
    minute : '2-digit',
    second : '2-digit'
  });
}

// ── Update UI based on status int ─────────────────────────
/**
 * @param {number} status  0|1|2
 * @param {string} updatedAt  ISO timestamp string
 */
function applyStatus(status, updatedAt) {
  // Avoid redundant DOM thrashing
  if (status === currentStatus) {
    statusTime.textContent = 'Last: ' + formatTime(updatedAt);
    return;
  }
  currentStatus = status;

  // ── LED bulb classes ──
  ledBulb.className = 'led-bulb';
  if      (status === 0) ledBulb.classList.add('state-off');
  else if (status === 1) ledBulb.classList.add('state-on');
  else if (status === 2) ledBulb.classList.add('state-blink');

  // ── Status badge ──
  const labels  = ['⬛ OFF', '💡 ON',  '⚡ BLINK'];
  const classes = ['s-off',  's-on',   's-blink'];
  statusText.textContent   = labels[status]  ?? 'UNKNOWN';
  statusBadge.className    = `status-badge ${classes[status] ?? ''}`;
  statusCode.textContent   = `VALUE = ${status}`;
  statusTime.textContent   = 'Last: ' + formatTime(updatedAt);

  // ── Active button highlight ──
  btnOff.classList.toggle  ('active', status === 0);
  btnOn.classList.toggle   ('active', status === 1);
  btnBlink.classList.toggle('active', status === 2);
}

// ── Poll server for current status ────────────────────────
async function pollStatus() {
  try {
    const resp = await fetch(`${API_STATUS}?_=${Date.now()}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    applyStatus(data.status ?? 0, data.updated_at ?? '');
  } catch (err) {
    console.warn('Poll failed:', err.message);
    // Don't show toast for every poll failure — too noisy
  }
}

// ── Send LED command ───────────────────────────────────────
/**
 * @param {number} status  0|1|2
 * @param {HTMLButtonElement} btn  The button that was clicked
 */
async function sendCommand(status, btn) {
  // Disable buttons while request is in flight
  [btnOn, btnOff, btnBlink].forEach(b => b.disabled = true);

  try {
    const resp = await fetch(API_UPDATE, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({ status })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    if (data.success) {
      applyStatus(status, new Date().toISOString().replace('T', ' '));
      showToast(`✔ ${data.message}`, 'success');
      // Refresh log table
      fetchLogs();
    } else {
      showToast(`✖ ${data.message ?? 'Error'}`, 'error');
    }
  } catch (err) {
    showToast('✖ Connection error', 'error');
    console.error('Command error:', err);
  } finally {
    [btnOn, btnOff, btnBlink].forEach(b => b.disabled = false);
  }
}

// ── Button click handlers ──────────────────────────────────
btnOff.addEventListener  ('click', () => sendCommand(0, btnOff));
btnOn.addEventListener   ('click', () => sendCommand(1, btnOn));
btnBlink.addEventListener('click', () => sendCommand(2, btnBlink));

// ── Fetch & render action logs ─────────────────────────────
async function fetchLogs() {
  try {
    // Piggy-back on a small endpoint — we re-use get_status
    // but logs come from logs.php (created below). For now we
    // use a query param to ask for logs.
    const resp = await fetch(`get_logs.php?_=${Date.now()}`);
    if (!resp.ok) return;
    const rows = await resp.json();
    renderLogs(rows);
  } catch (_) {
    // Silent — logs are non-critical
  }
}

/**
 * @param {Array<{id,action,value,timestamp}>} rows
 */
function renderLogs(rows) {
  if (!rows || rows.length === 0) {
    logBody.innerHTML = '<tr><td colspan="4" class="log-empty">No activity yet…</td></tr>';
    return;
  }

  const labels = { 0: 'TURN OFF', 1: 'TURN ON', 2: 'BLINK' };
  const html = rows.map((r, i) => {
    const isNew = i === 0 && logData.length > 0 && r.id !== logData[0]?.id;
    return `
      <tr class="${isNew ? 'log-new' : ''}">
        <td style="color:var(--text-dim);font-family:var(--font-hud);font-size:0.65rem">#${r.id}</td>
        <td>${r.action}</td>
        <td><span class="val-pill val-${r.value}">${r.value} — ${labels[r.value] ?? '?'}</span></td>
        <td style="color:var(--text-dim);font-size:0.75rem">${formatDateTime(r.timestamp)}</td>
      </tr>`;
  }).join('');

  logBody.innerHTML = html;
  logData = rows;
}

// ── Start ──────────────────────────────────────────────────
(function init() {
  pollStatus();
  fetchLogs();

  // Start polling loop
  pollTimer = setInterval(() => {
    pollStatus();
    fetchLogs();
  }, POLL_MS);
})();