// ============================================================
// APP INITIALIZATION & MAIN BOOTSTRAP
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
    initDarkMode();
    await checkSession();
});

function initApp() {
    AppState.fpDate = flatpickr("#f-date", {
        altInput: true, altFormat: "d M Y", dateFormat: "Y-m-d", defaultDate: "today", maxDate: "today"
    });

    AppState.fpNextDate = flatpickr("#f-next-date", {
        altInput: true,
        altFormat: "d M Y",
        dateFormat: "Y-m-d",
        minDate: "today",
        onReady: function (_, __, fp) {
            const cal = fp.calendarContainer;
            const timeRow = document.createElement('div');
            timeRow.className = 'fp-custom-time-row';
            timeRow.innerHTML = _fpTimeRowHtml('fp-next-hour', 'fp-next-min');
            cal.appendChild(timeRow);
            document.getElementById('fp-next-hour').value = '09';
        },
        onClose: _fpTimeOnClose('fp-next-hour', 'fp-next-min')
    });

    AppState.fpFilterDate = flatpickr("#fl-date-wrap", {
        wrap: true, altInput: true, altFormat: "d M Y", dateFormat: "Y-m-d",
        onChange: function () { resetAndFetch(); }
    });

    bindPositionToggle();
    prefillAndLockTeamFields();

    document.getElementById('profile-menu-wrap').style.display = 'block';

    const localProfile = JSON.parse(localStorage.getItem(CONFIG.KEYS.PROFILE)) || AppState.userProfile;
    AppState.userProfile.avatar = localProfile.avatar || '';

    const initial = (AppState.userProfile.name || 'U').charAt(0).toUpperCase();
    document.getElementById('avatar-small-text').textContent = initial;
    document.getElementById('avatar-text').textContent = initial;

    document.getElementById('pd-name').textContent = AppState.userProfile.name;
    document.getElementById('pd-emp-id').textContent = AppState.userProfile.empId || 'NO ID';
    document.getElementById('pd-email').textContent = AppState.userProfile.email;
    document.getElementById('pd-team').textContent = AppState.userProfile.team || 'No Team';
    const subTeamEl = document.getElementById('pd-sub-team');
    if (subTeamEl) subTeamEl.textContent = AppState.userProfile.subTeam || '-';
    document.getElementById('pd-contact').textContent = AppState.userProfile.contact || '-';

    loadAvatarUI();

    const cbNext = document.getElementById('cb-next-visit');
    if (cbNext && !cbNext._bound) {
        cbNext._bound = true;
        cbNext.addEventListener('change', function () {
            document.getElementById('next-visit-wrap').style.display = this.checked ? 'block' : 'none';
            if (this.checked && AppState.fpNextDate) AppState.fpNextDate.setDate(today());
        });
    }

    loadCustomerDropdown();
    bindAutoSave();
    loadAutoSaveData();
    switchTab('new');

    loadVisitsFromDB();
    setupRealtime();
}

function prefillAndLockTeamFields() {
    const mainTeam = AppState.userProfile.team || '';
    const localProfile = JSON.parse(localStorage.getItem(CONFIG.KEYS.PROFILE)) || {};
    const subTeam = AppState.userProfile.subTeam || localProfile.subTeam || '';

    const mainSelect = document.getElementById('f-main-team');
    const subSelect = document.getElementById('f-sub-team');
    if (!mainSelect || !subSelect) return;

    if (mainTeam) {
        if (!mainSelect.querySelector(`option[value="${mainTeam}"]`)) {
            const opt = document.createElement('option');
            opt.value = mainTeam; opt.textContent = mainTeam;
            mainSelect.appendChild(opt);
        }
        mainSelect.value = mainTeam;
        mainSelect.disabled = true;

        subSelect.innerHTML = '';
        const subs = TEAM_STRUCTURE[mainTeam] || (subTeam ? [subTeam] : []);
        subs.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub; opt.textContent = sub;
            subSelect.appendChild(opt);
        });
    }

    if (subTeam) {
        subSelect.value = subTeam;
        subSelect.disabled = true;
    }
}

async function loadCustomerDropdown() {
    try {
        const team = (AppState.userProfile.team || '').trim().toLowerCase();
        const isAdmin = (team === 'admin');
        const empId = AppState.userProfile.empId;
        const bdeName = AppState.userProfile.name;

        let params = `select=customer_id,name_of_outlet&status=neq.INACTIVE&order=customer_id.asc`;
        params = _appendUserFilter(params, isAdmin, empId, bdeName);

        const data = await DB.select('customer_information', params);

        const selectEl = document.getElementById('f-customer');
        if (!selectEl) return;

        if (AppState.tomSelectCustomer) {
            AppState.tomSelectCustomer.destroy();
            AppState.tomSelectCustomer = null;
        }

        const options = (data || []).map(c => ({
            value: c.customer_id,
            text: `${c.name_of_outlet}`,
            searchText: `${c.customer_id} ${c.name_of_outlet}`,
            outletName: c.name_of_outlet
        }));

        AppState.tomSelectCustomer = new TomSelect(selectEl, {
            options: options,
            items: [],
            valueField: 'value',
            labelField: 'text',
            searchField: ['text', 'searchText'],
            sortField: { field: 'value', direction: 'asc' },
            placeholder: options.length > 0 ? '-- Select outlet --' : 'No outlets found',
            allowEmptyOption: true,
            maxOptions: 500,
            maxItems: 1,
            plugins: ['clear_button'],
            render: {
                option: function (item, escape) {
                    return `<div><span style="color:var(--text-muted);font-size:11px;margin-right:6px;">${escape(item.value)}</span>${escape(item.text)}</div>`;
                },
                item: function (item, escape) {
                    return `<div>${escape(item.text)}</div>`;
                }
            },
            onChange: function (value) {
                const opt = options.find(o => o.value === value);
                document.getElementById('f-outlet-name').value = opt ? opt.outletName : '';
                saveAutoSaveData();
            }
        });

    } catch (e) {
        console.error("Load customers error:", e);
    }
}

window.handleFilterPosChange = function () {
    const pos = document.getElementById('fl-pos').value;
    const otherInput = document.getElementById('fl-pos-other');
    if (pos === '__other__') {
        otherInput.style.display = 'block';
        otherInput.focus();
    } else {
        otherInput.style.display = 'none';
        otherInput.value = '';
        resetAndFetch();
    }
}

function showMainApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    initApp();
    setTimeout(() => {
        scheduleNotifications();
        if (AppState.notifInterval) clearInterval(AppState.notifInterval);
        AppState.notifInterval = setInterval(scheduleNotifications, 60000);
        setupVisitRealtime();
        renderNotifPanel();
    }, 1500);
}

window.switchTab = function (tab) {
    if (tab !== 'new') window.stopCamera();

    const tabs = ['new', 'list', 'calendar'];
    document.querySelectorAll('.sidebar-nav .tab').forEach((t, i) => {
        t.classList.toggle('active', tabs[i] === tab);
    });

    tabs.forEach(t => {
        const el = document.getElementById('tab-' + t);
        if (!el) return;
        el.classList.remove('tab-enter');
        if (t === tab) {
            el.style.display = '';
            void el.offsetWidth;
            el.classList.add('tab-enter');
        } else {
            el.style.display = 'none';
        }
    });

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        const lang = AppState.currentLang || 'en';
        const titles = {
            new: { en: 'New Visit', th: 'บันทึกการเยี่ยม' },
            list: { en: 'All Visits', th: 'ประวัติทั้งหมด' },
            calendar: { en: 'Calendar Schedule', th: 'ปฏิทินนัดหมาย' }
        };
        if (titles[tab]) pageTitle.textContent = titles[tab][lang] || titles[tab].en;
    }

    const recCount = document.getElementById('rec-count');
    if (recCount) recCount.style.display = tab === 'list' ? 'inline-block' : 'none';

    if (tab === 'list') { AppState.currentPage = 0; fetchVisitsWithSkeleton(); }

    if (tab === 'calendar') {
        setTimeout(() => {
            if (!AppState.calendarObj) window.initCalendar();
            else { AppState.calendarObj.render(); window.updateCalendarEvents(); }
        }, 100);
    }

    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
    }
};

window.toggleSidebar = function () {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
};

window.openLightbox = function (src) {
    document.getElementById('lb-img').src = src;
    document.getElementById('lightbox').classList.add('open');
}

window.closeLightbox = function () {
    document.getElementById('lightbox').classList.remove('open');
}

function loadAvatarUI() {
    const avatarData = AppState.userProfile.avatar;
    const imgLarge = document.getElementById('avatar-img');
    const textLarge = document.getElementById('avatar-text');
    const imgSmall = document.getElementById('avatar-small-img');
    const textSmall = document.getElementById('avatar-small-text');

    if (avatarData) {
        if (imgLarge) { imgLarge.src = avatarData; imgLarge.style.display = 'block'; }
        if (textLarge) { textLarge.style.display = 'none'; }
        if (imgSmall) { imgSmall.src = avatarData; imgSmall.style.display = 'block'; }
        if (textSmall) { textSmall.style.display = 'none'; }
    } else {
        if (imgLarge) { imgLarge.style.display = 'none'; }
        if (textLarge) { textLarge.style.display = 'block'; }
        if (imgSmall) { imgSmall.src = ''; imgSmall.style.display = 'none'; }
        if (textSmall) { textSmall.style.display = 'block'; }
    }
}

window.handleProfileUpload = async function (input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) return;

    toast('Updating profile picture...', true);

    try {
        const fileName = `avatar_${AppState.userProfile.empId}_${Date.now()}.jpg`;
        const publicUrl = await DB.uploadFile('avatars', fileName, file, file.type);

        await DB.update('user_information', `user_id=eq.${encodeURIComponent(AppState.userProfile.empId)}`, {
            avatar: publicUrl
        });

        AppState.userProfile.avatar = publicUrl;
        localStorage.setItem(CONFIG.KEYS.PROFILE, JSON.stringify(AppState.userProfile));

        loadAvatarUI();
        toast('Profile picture updated!');
    } catch (e) {
        console.error("Avatar Upload Error:", e);
        toast('Failed to update picture.', false);
    }
    input.value = '';
}

window.toggleProfileMenu = function () {
    document.getElementById('profile-dropdown').classList.toggle('show');
}

window.addEventListener('click', function (e) {
    const wrap = document.getElementById('profile-menu-wrap');
    const dropdown = document.getElementById('profile-dropdown');
    if (wrap && dropdown && !wrap.contains(e.target)) dropdown.classList.remove('show');
});

function initDarkMode() {
    const savedTheme = localStorage.getItem(CONFIG.KEYS.THEME);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        document.querySelectorAll('.moon-icon').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.sun-icon').forEach(el => el.style.display = 'block');
    }
}

window.toggleDarkMode = function () {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem(CONFIG.KEYS.THEME, isDark ? 'dark' : 'light');
    document.querySelectorAll('.moon-icon').forEach(el => el.style.display = isDark ? 'none' : 'block');
    document.querySelectorAll('.sun-icon').forEach(el => el.style.display = isDark ? 'block' : 'none');
}

window.playWelcomeAnimation = function (name, callback) {
    const screen = document.getElementById('welcome-screen');
    const text = document.getElementById('welcome-text');
    const avatarText = document.getElementById('welcome-avatar-text');
    const avatarImg = document.getElementById('welcome-avatar-img');

    document.getElementById('login-screen').style.display = 'none';
    const firstName = name ? name.split(' ')[0] : 'User';
    text.textContent = `Hello, ${firstName}!`;

    if (AppState.userProfile.avatar) {
        if (avatarImg) {
            avatarImg.src = AppState.userProfile.avatar;
            avatarImg.style.display = 'block';
        }
        if (avatarText) avatarText.style.display = 'none';
    } else {
        if (avatarImg) avatarImg.style.display = 'none';
        if (avatarText) {
            avatarText.textContent = firstName.charAt(0).toUpperCase();
            avatarText.style.display = 'block';
        }
    }

    screen.classList.remove('welcome-fade-out', 'animate-welcome');
    screen.style.display = 'flex';
    setTimeout(() => screen.classList.add('animate-welcome'), 50);
    setTimeout(() => {
        screen.classList.add('welcome-fade-out');
        setTimeout(() => {
            screen.style.display = 'none';
            if (callback) callback();
        }, 500);
    }, 2000);
};
