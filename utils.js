// ============================================================
// UTILITIES & HELPERS
// ============================================================
function esc(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function today() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d) {
    if (!d) return '';
    const dateObj = new Date(d);
    if (isNaN(dateObj)) return d;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

function fmtDateTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function updateCount() {
    const el = document.getElementById('rec-count');
    if (!el) return;
    const count = AppState.totalCount || AppState.visits.length;
    el.textContent = count + (count === 1 ? ' record' : ' records');
}

function toast(msg, ok = true) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.style.background = ok ? 'var(--primary)' : 'var(--danger)';
    t.setAttribute('data-type', ok ? 'success' : 'error');
    t.textContent = msg;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function getPosition() { const s = document.getElementById('f-position').value; return s === '__other__' ? document.getElementById('f-pos-other').value.trim() : s; }
function bindPositionToggle() { document.getElementById('f-position').addEventListener('change', function () { document.getElementById('pos-other-wrap').style.display = this.value === '__other__' ? '' : 'none'; }); }

// Helper: สร้าง HTML time picker สำหรับ flatpickr
function _fpTimeRowHtml(hourId, minId) {
    const hours = Array.from({ length: 24 }, (_, i) => `<option value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</option>`).join('');
    const mins = ['00', '15', '30', '45'].map(m => `<option value="${m}">${m}</option>`).join('');
    return `
        <span class="fp-time-label">Time</span>
        <select id="${hourId}" class="fp-time-select">${hours}</select>
        <span class="fp-time-sep">:</span>
        <select id="${minId}" class="fp-time-select">${mins}</select>`;
}
// Helper: สร้าง onClose handler สำหรับ datetime picker
function _fpTimeOnClose(hourId, minId) {
    return function (selectedDates, dateStr, fp) {
        if (!selectedDates[0]) return;
        const h = document.getElementById(hourId)?.value || '09';
        const m = document.getElementById(minId)?.value || '00';
        const d = selectedDates[0];
        const pad = n => String(n).padStart(2, '0');
        fp.input.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${h}:${m}`;
        fp.altInput.value = `${pad(d.getDate())} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()} ${h}:${m}`;
    };
}

// Helper: กรอง query ตามสิทธิ์ผู้ใช้ (ลดโค้ดซ้ำ)
function _appendUserFilter(params, isAdmin, empId, bdeName, fallbackFilter = '') {
    if (isAdmin) return params;
    if (empId && bdeName) {
        return params + `&or=(user_id.eq.${encodeURIComponent(empId)},bde.eq.${encodeURIComponent(bdeName)})`;
    }
    if (empId) return params + `&user_id=eq.${encodeURIComponent(empId)}`;
    if (bdeName) return params + `&bde=eq.${encodeURIComponent(bdeName)}`;
    return params + fallbackFilter;
}
