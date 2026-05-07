// ============================================================
// I18N — FULL-SITE LANGUAGE SWITCHER (EN / TH)
// ============================================================
AppState.currentLang = 'en';

const I18N = {
    en: {
        nav_new_visit: 'New Visit',
        nav_all_visits: 'All Visits',
        nav_calendar: 'Calendar',
        dark_mode: 'Dark Mode',
        light_mode: 'Light Mode',
        sign_in: 'Sign In',
        username: 'Username',
        password: 'Password',
        remember_me: 'Remember me',
        submit: 'SUBMIT',
        records: 'records',
        notifications: 'Notifications',
        clear_all: 'Clear all',
        team: 'Team',
        area: 'Area',
        email: 'Email',
        contact: 'Contact',
        logout: 'Logout',
        visit_info: 'Visit Information',
        customer_outlet: 'Customer / Outlet',
        person_met: 'Person You Met',
        their_position: 'Their Position',
        specify_pos: 'Specify Position',
        visit_date: 'Visit Date',
        reason_visit: 'Reason for Visit',
        result_visit: 'Result of Visit',
        followup: 'Follow-up Actions',
        followup_quotation: 'Send Quotation/Docs',
        followup_callback: ' Call Back Later',
        followup_schedule: 'Schedule Next Visit',
        select_next_date: 'Select Date for Next Visit:',
        live_evidence: 'Live Evidence',
        capture_hint: 'Capture or select up to 10 photos',
        captured_photos: 'Captured Photos (Click to view)',
        clear: 'Clear',
        save_visit: 'Save Visit',
        all_areas: 'All areas',
        all_positions: 'All positions',
        filter_by_date: 'Filter by date',
        search_outlet: 'Search outlet...',
        type_search_pos: 'Type to search position...',
        legend_scheduled: 'Scheduled',
        legend_visit_rec: 'From visit record',
        schedule_visit: 'Schedule Visit',
        review_visit: 'Review Visit Details',
        edit: 'Edit',
        confirm_save: 'Confirm & Save',
        delete_request: 'Delete Request',
        delete_reason: 'Reason for delete request:',
        cancel: 'Cancel',
        confirm_delete: 'Confirm Delete',
        save: 'Save',
        delete: 'Delete',
        remind_before: 'Remind before',
        no_reminder: 'No reminder',
        start_date: 'Start date',
        end_date: 'End date (optional)',
        note_optional: 'Note (optional)',
        _fc_today: 'Today',
        _fc_month: 'Month',
        _fc_week: 'Week',
        _fc_day: 'Day',
        _fc_list: 'List',
    },
    th: {
        nav_new_visit: 'บันทึกการเยี่ยม',
        nav_all_visits: 'ประวัติทั้งหมด',
        nav_calendar: 'ปฏิทิน',
        dark_mode: 'โหมดมืด',
        light_mode: 'โหมดสว่าง',
        sign_in: 'เข้าสู่ระบบ',
        username: 'ชื่อผู้ใช้',
        password: 'รหัสผ่าน',
        remember_me: 'จดจำฉัน',
        submit: 'เข้าสู่ระบบ',
        records: 'รายการ',
        notifications: 'การแจ้งเตือน',
        clear_all: 'ล้างทั้งหมด',
        team: 'ทีม',
        area: 'พื้นที่',
        email: 'อีเมล',
        contact: 'ติดต่อ',
        logout: 'ออกจากระบบ',
        visit_info: 'ข้อมูลการเยี่ยม',
        customer_outlet: 'ลูกค้า / สาขา',
        person_met: 'ผู้ที่พบ',
        their_position: 'ตำแหน่ง',
        specify_pos: 'ระบุตำแหน่ง',
        visit_date: 'วันที่เยี่ยม',
        reason_visit: 'วัตถุประสงค์',
        result_visit: 'ผลการเยี่ยม',
        followup: 'การติดตาม',
        followup_quotation: 'ส่งใบเสนอราคา/เอกสาร',
        followup_callback: ' โทรกลับภายหลัง',
        followup_schedule: 'นัดหมายเยี่ยมครั้งต่อไป',
        select_next_date: 'เลือกวันนัดหมายครั้งถัดไป:',
        live_evidence: 'หลักฐานสด',
        capture_hint: 'ถ่ายหรือเลือกสูงสุด 10 รูป',
        captured_photos: 'รูปถ่าย (กดเพื่อดู)',
        clear: 'ล้างข้อมูล',
        save_visit: 'บันทึก',
        all_areas: 'ทุกพื้นที่',
        all_positions: 'ทุกตำแหน่ง',
        filter_by_date: 'กรองตามวันที่',
        search_outlet: 'ค้นหาสาขาหรือหมายเหตุ...',
        type_search_pos: 'พิมพ์เพื่อค้นหาตำแหน่ง...',
        legend_scheduled: 'นัดหมาย',
        legend_visit_rec: 'จากการเยี่ยม',
        schedule_visit: 'นัดหมายเยี่ยม',
        review_visit: 'ตรวจสอบข้อมูล',
        edit: 'แก้ไข',
        confirm_save: 'ยืนยันและบันทึก',
        delete_request: 'ขอลบรายการ',
        delete_reason: 'เหตุผลในการลบ:',
        cancel: 'ยกเลิก',
        confirm_delete: 'ยืนยันการลบ',
        save: 'บันทึก',
        delete: 'ลบ',
        remind_before: 'แจ้งเตือนก่อน',
        no_reminder: 'ไม่แจ้งเตือน',
        start_date: 'วันเริ่มต้น',
        end_date: 'วันสิ้นสุด (ไม่บังคับ)',
        note_optional: 'หมายเหตุ (ไม่บังคับ)',
        _fc_today: 'วันนี้',
        _fc_month: 'เดือน',
        _fc_week: 'สัปดาห์',
        _fc_day: 'วัน',
        _fc_list: 'รายการ',
    }
};

window.toggleCalendarLang = function () {
    const newLang = AppState.currentLang === 'en' ? 'th' : 'en';
    AppState.currentLang = newLang;
    _applyLang(newLang);
};

function _applyLang(lang) {
    const dict = I18N[lang];
    if (!dict) return;

    const label = document.getElementById('lang-toggle-label');
    if (label) label.textContent = lang === 'en' ? 'TH' : 'EN';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key] !== undefined) el.textContent = dict[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key] !== undefined) el.placeholder = dict[key];
    });

    const phMap = {
        'f-person': lang === 'en' ? 'Full name' : 'ชื่อ-นามสกุล',
        'f-pos-other': lang === 'en' ? 'Enter position' : 'ระบุตำแหน่ง',
        'f-date': lang === 'en' ? 'Select Date' : 'เลือกวันที่',
        'f-reason': lang === 'en' ? 'Purpose of this visit...' : 'วัตถุประสงค์การเยี่ยม...',
        'f-result': lang === 'en' ? 'Outcomes, agreements, follow-ups...' : 'ผลลัพธ์, ข้อตกลง, การติดตาม...',
        'f-next-date': lang === 'en' ? 'Select Date' : 'เลือกวันที่',
        'fl-date': lang === 'en' ? 'Filter by date' : 'กรองตามวันที่',
        'fl-pos-other': lang === 'en' ? 'Type to search position...' : 'พิมพ์เพื่อค้นหาตำแหน่ง...',
        'fl-search': lang === 'en' ? 'Search outlet...' : 'ค้นหาสาขาหรือหมายเหตุ...',
        'delete-reason-input': lang === 'en' ? 'e.g., Duplicated entry...' : 'เช่น รายการซ้ำ...',
    };
    for (const [id, ph] of Object.entries(phMap)) {
        const el = document.getElementById(id);
        if (el) el.placeholder = ph;
    }

    const flArea = document.getElementById('fl-area');
    if (flArea && flArea.options[0]) flArea.options[0].text = dict.all_areas;
    const flPos = document.getElementById('fl-pos');
    if (flPos && flPos.options[0]) flPos.options[0].text = dict.all_positions;

    const remindSel = document.getElementById('apt-remind-select');
    if (remindSel) {
        const opts = lang === 'en'
            ? ['No reminder', '15 min', '30 min', '1 hour', '1 day']
            : ['ไม่แจ้งเตือน', '15 นาที', '30 นาที', '1 ชั่วโมง', '1 วัน'];
        Array.from(remindSel.options).forEach((o, i) => { if (opts[i]) o.text = opts[i]; });
    }

    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) {
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            const span = activeTab.querySelector('[data-i18n]');
            if (span) {
                const titleMap = {
                    nav_new_visit: { en: 'New Visit', th: 'บันทึกการเยี่ยม' },
                    nav_all_visits: { en: 'All Visits', th: 'ประวัติทั้งหมด' },
                    nav_calendar: { en: 'Calendar Schedule', th: 'ปฏิทินนัดหมาย' }
                };
                const key = span.getAttribute('data-i18n');
                if (titleMap[key]) pageTitleEl.textContent = titleMap[key][lang] || titleMap[key].en;
            }
        }
    }

    if (AppState.calendarObj) {
        AppState.calendarObj.setOption('locale', lang);
        AppState.calendarObj.setOption('buttonText', {
            today: dict._fc_today,
            month: dict._fc_month,
            week: dict._fc_week,
            day: dict._fc_day,
            list: dict._fc_list,
        });
    }

    try { localStorage.setItem(CONFIG.KEYS.LANG, lang); } catch (e) { console.warn('Failed to save language:', e); }
}

// Auto-load saved language on startup
(function initLang() {
    try {
        const saved = localStorage.getItem(CONFIG.KEYS.LANG) || 'en';
        AppState.currentLang = saved;
        if (saved !== 'en') {
            const apply = () => _applyLang(saved);
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', apply);
            } else {
                setTimeout(apply, 400);
            }
        }
    } catch (e) { console.warn('Failed to load saved language:', e); }
})();
