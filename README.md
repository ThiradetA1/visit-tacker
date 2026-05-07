# Visitation Management App

Vanilla JS SPA สำหรับบันทึกการเยี่ยมลูกค้า พร้อมระบบกล้องถ่ายรูป ปฏิทินนัดหมาย และแจ้งเตือนแบบ realtime

## Tech Stack

- **Frontend:** Vanilla JavaScript (no framework/bundler)
- **Backend:** Supabase (PostgreSQL + REST API + Realtime)
- **Calendar:** FullCalendar 6
- **UI Components:** TomSelect, Flatpickr
- **Storage:** Supabase Storage (รูปภาพ, avatar)

## โครงสร้างไฟล์

```
app.js              # Entry point — init, bootstrap, UI wiring (~315 บรรทัด)
config.js           # CONFIG constants, TEAM_STRUCTURE, AppState
utils.js            # Utility functions (esc, toast, date helpers)
db.js               # Supabase REST wrapper (select, insert, update, upload)
i18n.js             # ภาษา EN/TH + auto-load
auth.js             # Login, logout, session check
camera.js           # กล้องถ่ายรูป, watermark, gallery
form.js             # ฟอร์มบันทึก, autosave, validate
visits.js           # รายการเยี่ยม, pagination, detail, delete request
calendar.js         # ปฏิทินนัดหมาย (FullCalendar), CRUD
notifications.js    # Realtime notification, remind, badge
style.css           # Styles ทั้งหมด (~2979 บรรทัด)
index.html          # หน้าหลัก SPA
manifest.json       # PWA manifest
```

## วิธีรัน

เปิด `index.html` ใน browser โดยตรง (หรือใช้ live server ก็ได้)

## ลำดับการโหลด Script

```
config.js → utils.js → db.js → i18n.js → auth.js → camera.js → form.js → notifications.js → calendar.js → visits.js → app.js
```

## Key หมายเหตุ

- `CONFIG.SUPABASE.KEY` เป็น anon key (public) — ต้องมั่นใจว่า RLS policies ใน Supabase secure
- การ hash รหัสผ่านใช้ SHA-256 ฝั่ง client (แนะนำให้ย้ายไปใช้ Supabase Auth ในอนาคต)
- ทุก module สื่อสารผ่าน global scope (`window.*`) — ระวังลำดับการโหลด script
