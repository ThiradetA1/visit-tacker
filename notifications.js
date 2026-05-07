// ============================================================
// REALTIME NOTIFICATION & CALENDAR MODULE (Supabase Edition)
// ============================================================

window.setupRealtime = function () {
    if (AppState.realtimeChannel) return;
    try {
        if (typeof window.supabase !== 'undefined') {
            const client = window.supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.KEY);
            AppState.realtimeChannel = client
                .channel('app-realtime')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitation' }, (payload) => {
                    if (payload.new.user_id !== AppState.userProfile.empId) {
                        const badge = document.getElementById('notif-badge');
                        if (badge) badge.style.display = 'block';
                        toast(`New event: ${payload.new.name_of_outlet}`, true);
                    }
                    loadVisitsFromDB().then(() => { if (window.updateCalendarEvents) window.updateCalendarEvents(); });
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visitation' }, (payload) => {
                    if (payload.new.req_status === 'pending' && (!payload.old || payload.old.req_status !== 'pending')) {
                        const badge = document.getElementById('notif-badge');
                        if (badge) badge.style.display = 'block';
                        toast(`Delete Request: ${payload.new.bde || 'User'} @ ${payload.new.name_of_outlet}`, false);
                    }
                    loadVisitsFromDB().then(() => { if (window.updateCalendarEvents) window.updateCalendarEvents(); });
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
                    if (AppState.calendarObj) AppState.calendarObj.refetchEvents();
                })
                .subscribe();
        } else {
            AppState.realtimeChannel = setInterval(() => {
                loadVisitsFromDB().then(() => { if (window.updateCalendarEvents) window.updateCalendarEvents(); });
            }, 30000);
        }
    } catch (e) {
        console.warn('Realtime setup failed, using polling fallback');
        AppState.realtimeChannel = setInterval(() => {
            loadVisitsFromDB().then(() => { if (window.updateCalendarEvents) window.updateCalendarEvents(); });
        }, 30000);
    }
};

// ============================================================
// VISIT RECORDS REALTIME (Approve/Delete notif)
// ============================================================
window.setupVisitRealtime = function () {
    if (AppState.visitRealtimeChannel) return;
    if (typeof window.supabase === 'undefined') return;
    try {
        const empId = AppState.userProfile.empId;
        const client = window.supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.KEY);
        AppState.visitRealtimeChannel = client
            .channel('visit-records-realtime')
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'visit_records'
            }, (payload) => {
                const rec = payload.new;
                if (rec.user_id && rec.user_id !== empId) return;
                const outlet = rec.outlet_name || rec.name_of_outlet || 'Visit';
                let icon = '', msg = '';
                if (rec.req_status === 'approved') {
                    icon = '✅'; msg = `${outlet} - Visit Approved`;
                } else if (rec.req_status === 'rejected') {
                    icon = '❌'; msg = `Visit Rejected`;
                }
                if (msg) {
                    _pushNotification(icon, msg);
                    toast(`${icon} ${msg}`, rec.req_status === 'approved');
                }
            })
            .on('postgres_changes', {
                event: 'DELETE', schema: 'public', table: 'visit_records'
            }, (payload) => {
                const rec = payload.old;
                if (rec.user_id && rec.user_id !== empId) return;
                _pushNotification('🗑️', 'Visit record deleted by admin');
                toast('🗑️ Visit record deleted by admin', false);
            })
            .subscribe();
    } catch (e) {
        console.warn('Visit realtime setup failed:', e);
    }
};

// ============================================================
// SCHEDULE NOTIFICATIONS (remind before)
// ============================================================
window.scheduleNotifications = async function () {
    try {
        const uid = AppState.userProfile.empId;
        if (!uid) return;
        const now = Date.now();
        const twoHours = now + 2 * 3600000;

        const params = [
            `user_id=eq.${encodeURIComponent(uid)}`,
            `start_at=gte.${new Date().toISOString()}`,
            `remind_minutes=gt.0`,
            `status=neq.cancelled`,
            `select=id,title,outlet_name,start_at,remind_minutes`,
            `order=start_at.asc`
        ].join('&');
        const apts = await DB.select('appointments', params) || [];

        let hasSoon = false;
        for (const apt of apts) {
            const startMs = new Date(apt.start_at).getTime();
            if (startMs <= twoHours) hasSoon = true;

            const notifyAt = startMs - apt.remind_minutes * 60000;
            const key = `notified_apt_${apt.id}`;
            if (now >= notifyAt && !localStorage.getItem(key)) {
                localStorage.setItem(key, '1');
                const name = apt.outlet_name || apt.title || 'Appointment';
                const pad = n => String(n).padStart(2, '0');
                const d = new Date(startMs);
                const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                const minsLeft = Math.round((startMs - now) / 60000);
                const label = minsLeft >= 60
                    ? `in ${Math.round(minsLeft / 60)}h`
                    : minsLeft > 0 ? `in ${minsLeft} min` : 'Now!';
                const msg = `${name} - ${timeStr} (${label})`;

                toast(msg, true);
                _sendWebNotification('Visitation Reminder', msg);
                _pushNotification('🔕', msg);
            }
        }

        const badge = document.getElementById('notif-badge');
        if (badge) badge.style.display = hasSoon ? 'block' : 'none';

        if (Notification && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    } catch (e) {
        console.warn('scheduleNotifications error:', e);
    }
};

function _sendWebNotification(title, body) {
    try {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icon.png' });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(p => {
                if (p === 'granted') new Notification(title, { body, icon: '/icon.png' });
            });
        }
    } catch (e) { console.warn('Web notification error:', e); }
}

// ============================================================
// NOTIFICATION STORAGE & PANEL
// ============================================================
function _pushNotification(icon, message) {
    const notif = { icon, message, time: Date.now(), id: Date.now() + Math.random() };
    AppState.notifications.unshift(notif);
    if (AppState.notifications.length > 50) AppState.notifications = AppState.notifications.slice(0, 50);
    _saveNotifications();

    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'block';

    renderNotifPanel();
}

function _saveNotifications() {
    try {
        localStorage.setItem(CONFIG.KEYS.NOTIFICATIONS, JSON.stringify(AppState.notifications));
    } catch (e) { console.warn('Failed to save notifications:', e); }
}

function _relativeTime(ms) {
    const diff = Math.round((Date.now() - ms) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} d ago`;
}

window.renderNotifPanel = function () {
    const list = document.getElementById('notif-list');
    if (!list) return;
    if (!AppState.notifications.length) {
        list.innerHTML = '<div class="notif-empty">No notifications</div>';
        return;
    }
    list.innerHTML = AppState.notifications.map(n => `
        <div class="notif-item">
            
            <div class="notif-content">
                <div class="notif-msg">${n.message}</div>
                <div class="notif-time">${_relativeTime(n.time)}</div>
            </div>
        </div>
    `).join('');
};

window.toggleNotifPanel = function () {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
        const badge = document.getElementById('notif-badge');
        if (badge) badge.style.display = 'none';
        renderNotifPanel();
    }
};

window.clearAllNotifications = function () {
    AppState.notifications = [];
    _saveNotifications();
    renderNotifPanel();
    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'none';
};

window.addEventListener('click', function (e) {
    const panel = document.getElementById('notif-panel');
    const bell = document.getElementById('notif-bell');
    if (panel && bell && !bell.parentElement.contains(e.target)) {
        panel.style.display = 'none';
    }
});
