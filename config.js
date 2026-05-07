// ============================================================
// APP CONFIGURATION & CONSTANTS
// ============================================================
const CONFIG = {
    KEYS: {
        PROFILE: 'outlet_profile_v1',
        SESSION: 'checklist_user_session',
        REMEMBER: 'checklist_user_remember',
        AUTOSAVE: 'checklist_autosave_v1',
        LOGIN_AT: 'checklist_login_at',
        APPOINTMENTS: 'checklist_calendar_appointments',
        NOTIFICATIONS: 'visitation_notifications',
        THEME: 'checklist_theme',
        LANG: 'visitation_lang'
    },
    SUPABASE: {
        URL: 'https://bvonujjvovziubyhqsjx.supabase.co',
        KEY: 'sb_publishable_GBw0pKHMLihSSfRTpnxuTw_e0OC1hYD'
    },
    SESSION_HOURS: {
        DEFAULT: 8,
        REMEMBER: 720
    },
    PAGE_SIZE: 5,
    MAX_PHOTOS: 10,
    ALLOW_LIBRARY_UPLOAD: true
};

const TEAM_STRUCTURE = {
    'Admin': ['Admin'],
    'Horeca': ['BKK', 'EAST'],
    'On Premise': ['BKK', 'EAST', 'North+Northeast'],
    'Southern': ['Phuket-HRC', 'Phuket-OP', 'Samui-HRC', 'Samui-OP']
};

let AppState = {
    cameraStream: null,
    isCameraLoading: false,
    currentFacingMode: 'environment',
    visits: [],
    photos: [],
    userProfile: { empId: '', name: '', email: '', team: '', area: '', contact: '', avatar: '' },
    currentPage: 0,
    pendingSaveData: null,
    deleteTargetId: null,
    tomSelectCustomer: null,
    loggedInUser: null,
    realtimeChannel: null,
    visitRealtimeChannel: null,
    notifInterval: null,
    totalPages: 1,
    totalCount: 0,
    fpDate: null,
    fpNextDate: null,
    fpFilterDate: null,
    isClearingForm: false,
    calendarObj: null,
    localAppointments: [],
    notifications: []
};
