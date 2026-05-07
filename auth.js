// ============================================================
// AUTHENTICATION MODULE
// ============================================================

async function sha256(text) {
    const buf = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(text)
    );
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function checkSession() {
    try {
        const rawProfile = localStorage.getItem(CONFIG.KEYS.PROFILE);
        const isRemember = !!localStorage.getItem(CONFIG.KEYS.REMEMBER);
        const hasSession = isRemember || !!sessionStorage.getItem(CONFIG.KEYS.SESSION);

        if (!rawProfile || !hasSession) return false;
        const loginAt = parseInt(localStorage.getItem(CONFIG.KEYS.LOGIN_AT) || '0', 10);
        if (loginAt) {
            const maxHours = isRemember
                ? CONFIG.SESSION_HOURS.REMEMBER
                : CONFIG.SESSION_HOURS.DEFAULT;
            const elapsedHours = (Date.now() - loginAt) / 3600000;
            if (elapsedHours > maxHours) {
                _clearSessionStorage();
                showSessionExpiredBanner();
                return false;
            }
        }

        const localProfile = JSON.parse(rawProfile);
        if (!localProfile.empId && !localProfile.name) return false;

        AppState.userProfile = {
            empId: localProfile.empId || '',
            name: localProfile.name || '',
            email: localProfile.email || '',
            team: localProfile.team || '',
            subTeam: localProfile.subTeam || '',
            area: localProfile.area || '',
            contact: localProfile.contact || '-',
            avatar: localProfile.avatar || ''
        };

        const savedApts = localStorage.getItem(CONFIG.KEYS.APPOINTMENTS);
        if (savedApts) AppState.localAppointments = JSON.parse(savedApts);

        try {
            const savedNotifs = localStorage.getItem(CONFIG.KEYS.NOTIFICATIONS);
            if (savedNotifs) AppState.notifications = JSON.parse(savedNotifs);
        } catch (e) { AppState.notifications = []; }

        showMainApp();
        return true;
    } catch (e) {
        console.error("Session check error:", e);
        return false;
    }
}

function _clearSessionStorage() {
    sessionStorage.removeItem(CONFIG.KEYS.SESSION);
    localStorage.removeItem(CONFIG.KEYS.REMEMBER);
    localStorage.removeItem(CONFIG.KEYS.PROFILE);
    localStorage.removeItem(CONFIG.KEYS.LOGIN_AT);
}

function showSessionExpiredBanner() {
    const errEl = document.getElementById('login-error');
    if (errEl) {
        errEl.textContent = 'Your session has expired. Please sign in again.';
        errEl.style.display = 'block';
    }
}

window.doUserLogin = async function () {
    const usernameInput = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-pass').value;
    const remember = document.getElementById('login-remember').checked;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('btn-login');
    errEl.style.display = 'none';

    if (!usernameInput || !pass) {
        errEl.textContent = 'Please enter username and password.';
        errEl.style.display = 'block';
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }

    try {
        const data = await DB.select(
            'user_information',
            `select=*,users(id,password_hash,is_active)&username=eq.${encodeURIComponent(usernameInput)}&limit=1`
        );

        const info = data && data[0];

        if (!info) {
            errEl.textContent = 'Invalid username or password.';
            errEl.style.display = 'block';
            return;
        }
        if (info.users && info.users.is_active === false) {
            errEl.textContent = 'This account has been disabled. Please contact admin.';
            errEl.style.display = 'block';
            return;
        }
        const storedHash = info.users?.password_hash || '';
        const inputHash = await sha256(pass);
        const isValid = storedHash === inputHash;
        if (!isValid) {
            errEl.textContent = 'Invalid username or password.';
            errEl.style.display = 'block';
            return;
        }

        AppState.userProfile = {
            empId: info.user_id,
            name: info.name,
            email: info.email,
            team: info.team,
            subTeam: info.sub_team,
            area: info.level,
            contact: info.contact || '-',
            avatar: info.avatar || ''
        };

        const profilePayload = JSON.stringify(AppState.userProfile);
        localStorage.setItem(CONFIG.KEYS.PROFILE, profilePayload);
        if (remember) {
            localStorage.setItem(CONFIG.KEYS.LOGIN_AT, Date.now().toString());
            localStorage.setItem(CONFIG.KEYS.REMEMBER, 'true');
            localStorage.removeItem(CONFIG.KEYS.SESSION);
        } else {
            localStorage.removeItem(CONFIG.KEYS.LOGIN_AT);
            localStorage.removeItem(CONFIG.KEYS.REMEMBER);
            sessionStorage.setItem(CONFIG.KEYS.SESSION, 'true');
        }
        playWelcomeAnimation(AppState.userProfile.name, showMainApp);
    } catch (e) {
        errEl.textContent = 'Login failed: ' + e.message;
        errEl.style.display = 'block';
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    }
}

window.doUserLogout = function () {
    _clearSessionStorage();
    if (AppState.realtimeChannel) {
        try { AppState.realtimeChannel.unsubscribe(); } catch (e) { console.warn('unsubscribe error:', e); }
        AppState.realtimeChannel = null;
    }
    if (AppState.visitRealtimeChannel) {
        try { AppState.visitRealtimeChannel.unsubscribe(); } catch (e) { console.warn('unsubscribe error:', e); }
        AppState.visitRealtimeChannel = null;
    }
    if (AppState.notifInterval) {
        clearInterval(AppState.notifInterval);
        AppState.notifInterval = null;
    }

    AppState.loggedInUser = null;
    AppState.userProfile = { empId: '', name: '', email: '', team: '', area: '', contact: '', avatar: '' };
    AppState.visits = [];
    AppState.photos = [];

    stopCamera();
    document.getElementById('profile-menu-wrap').style.display = 'none';
    document.getElementById('profile-dropdown').classList.remove('show');
    loadAvatarUI();

    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-username').value = '';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-remember').checked = false;
    document.getElementById('login-error').style.display = 'none';

    document.getElementById('login-pass').type = 'password';
    document.getElementById('eye-icon').innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
}

window.togglePasswordVisibility = function () {
    const passInput = document.getElementById('login-pass');
    const eyeIcon = document.getElementById('eye-icon');

    if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
    } else {
        passInput.type = 'password';
        eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
    }
}
