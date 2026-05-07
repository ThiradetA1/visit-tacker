// ============================================================
// CALENDAR DB — CRUD สำหรับ appointments table
// ============================================================
const CalendarDB = {
    async fetchRange(start, end) {
        const uid = AppState.userProfile.empId;
        if (!uid) return [];
        try {
            const params = [
                `user_id=eq.${encodeURIComponent(uid)}`,
                `start_at=gte.${start.toISOString()}`,
                `start_at=lt.${end.toISOString()}`,
                `status=neq.cancelled`,
                `select=*`,
                `order=start_at.asc`
            ].join('&');
            return await DB.select('appointments', params) || [];
        } catch (e) {
            console.error('CalendarDB.fetchRange:', e);
            return [];
        }
    },

    async create(payload) {
        const uid = AppState.userProfile.empId;
        const record = {
            title: payload.title,
            description: payload.description || null,
            start_at: payload.start,
            end_at: payload.end,
            all_day: payload.allDay || false,
            location: payload.location || null,
            color: payload.color || '#1E88E5',
            type: payload.type || 'personal',
            remind_minutes: parseInt(payload.remindMinutes) || 30,
            user_id: uid,
            created_by: uid,
            outlet_name: payload.outletName || null,
            visit_id: payload.visitId || null
        };
        const result = await DB.insert('appointments', record);
        return result && result[0];
    },

    async update(id, payload) {
        const record = {};
        if (payload.start !== undefined) record.start_at = payload.start;
        if (payload.end !== undefined) record.end_at = payload.end;
        if (payload.title !== undefined) record.title = payload.title;
        if (payload.color !== undefined) record.color = payload.color;
        if (payload.status !== undefined) record.status = payload.status;
        if (payload.description !== undefined) record.description = payload.description;
        if (payload.location !== undefined) record.location = payload.location;
        if (payload.type !== undefined) record.type = payload.type;
        if (payload.remindMinutes !== undefined) record.remind_minutes = parseInt(payload.remindMinutes);
        await DB.update('appointments', `id=eq.${id}`, record);
    },

    async delete(id) {
        await DB.query(`appointments?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
    }
};

// ============================================================
// FULLCALENDAR INIT
// ============================================================
window.initCalendar = function () {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    AppState.calendarObj = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        themeSystem: 'standard',
        locale: 'en',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
        },
        buttonText: { today: 'Today', month: 'Month', week: 'Week', day: 'Day', list: 'List' },
        dayHeaderFormat: { weekday: 'short', day: 'numeric' },
        height: 'calc(100vh - 160px)',
        nowIndicator: true,
        selectable: true,
        selectMirror: true,
        editable: true,
        slotMinTime: '06:00:00',
        slotMaxTime: '23:00:00',
        slotDuration: '00:30:00',
        displayEventTime: true,
        eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },

        select: function (info) {
            window.openAppointmentModal(info.start, info.end, info.allDay);
            AppState.calendarObj.unselect();
        },

        eventDrop: async function (info) {
            const ep = info.event.extendedProps;
            if (ep.isVisit) {
                info.revert();
                toast('Cannot move auto-generated appointments.', false);
                return;
            }
            try {
                await CalendarDB.update(ep.dbId, {
                    start: info.event.start.toISOString(),
                    end: info.event.end ? info.event.end.toISOString() : new Date(info.event.start.getTime() + 3600000).toISOString()
                });
                toast('Appointment moved.', true);
            } catch (err) {
                console.error(err);
                info.revert();
                toast('Could not change time: ' + err.message, false);
            }
        },

        eventResize: async function (info) {
            const ep = info.event.extendedProps;
            if (ep.isVisit) {
                info.revert();
                return;
            }
            try {
                await CalendarDB.update(ep.dbId, {
                    start: info.event.start.toISOString(),
                    end: info.event.end ? info.event.end.toISOString() : new Date(info.event.start.getTime() + 3600000).toISOString()
                });
                toast('Appointment duration updated.', true);
            } catch (err) {
                console.error(err);
                info.revert();
                toast('Could not update time: ' + err.message, false);
            }
        },

        events: async function (info, successCallback, failureCallback) {
            try {
                const apts = await CalendarDB.fetchRange(info.start, info.end);
                const aptEvents = apts.map(a => {
                    const startMs = new Date(a.start_at).setHours(0, 0, 0, 0);
                    const endMs = a.end_at ? new Date(a.end_at).setHours(0, 0, 0, 0) : startMs;
                    const isSingleDay = (endMs - startMs) <= 86400000;
                    return {
                        id: a.id,
                        title: a.outlet_name || a.title,
                        start: isSingleDay ? new Date(a.start_at).toISOString().slice(0, 10) : a.start_at,
                        end: isSingleDay ? new Date(new Date(a.start_at).setDate(new Date(a.start_at).getDate() + 1)).toISOString().slice(0, 10) : a.end_at,
                        allDay: isSingleDay,
                        display: 'block',
                        backgroundColor: '#4CAF50',
                        borderColor: 'transparent',
                        textColor: '#FFF',
                        extendedProps: {
                            isVisit: false,
                            isSingleDay: isSingleDay,
                            originalStart: a.start_at,
                            originalEnd: a.end_at,
                            dbId: a.id,
                            description: a.description,
                            outletName: a.outlet_name || a.title,
                            location: a.location,
                            remindMinutes: a.remind_minutes
                        }
                    };
                });

                const visitEvents = (AppState.visits || [])
                    .filter(v => v.next_visit_date)
                    .map(v => {
                        const startDate = new Date(v.next_visit_date).toISOString().slice(0, 10);
                        const endDate = new Date(new Date(v.next_visit_date).setDate(new Date(v.next_visit_date).getDate() + 1)).toISOString().slice(0, 10);
                        return {
                            id: 'visit_' + v.id,
                            title: v.outlet,
                            start: startDate,
                            end: endDate,
                            allDay: true,
                            display: 'block',
                            backgroundColor: '#E53935',
                            borderColor: 'transparent',
                            textColor: '#FFF',
                            editable: false,
                            extendedProps: { isVisit: true, visitId: v.id, outletName: v.outlet }
                        };
                    });

                successCallback([...aptEvents, ...visitEvents]);
            } catch (err) {
                console.error('Calendar fetch error:', err);
                failureCallback(err);
            }
        },

        eventClick: function (info) {
            const ep = info.event.extendedProps;
            if (ep.isVisit) {
                window.openDetail(ep.visitId || info.event.id.replace('visit_', ''));
            } else {
                window.showAppointmentReadOnly(info.event.id);
            }
        },
    });
    AppState.calendarObj.render();
};

// ============================================================
// APPOINTMENT READ-ONLY VIEW
// ============================================================
window.showAppointmentReadOnly = function (eventId) {
    if (!AppState.calendarObj) return;
    const event = AppState.calendarObj.getEventById(eventId);
    if (!event) return;

    const ep = event.extendedProps;
    const startD = ep.originalStart ? new Date(ep.originalStart) : event.start;
    const endD = ep.originalEnd ? new Date(ep.originalEnd) : event.end;
    const pad = n => String(n).padStart(2, '0');

    const startDateStr = fmtDate(startD.toISOString());
    const startTimeStr = `${pad(startD.getHours())}:${pad(startD.getMinutes())}`;

    let dateDisplay = '';

    if (endD) {
        const endDateStr = fmtDate(endD.toISOString());
        const endTimeStr = `${pad(endD.getHours())}:${pad(endD.getMinutes())}`;

        if (startDateStr === endDateStr) {
            dateDisplay = `${startDateStr} <br> <span style="color:var(--primary); margin-top: 4px; display: inline-block;">${startTimeStr} - ${endTimeStr}</span>`;
        } else {
            dateDisplay = `${startDateStr} (${startTimeStr}) <br> <span style="color:var(--primary); margin-top: 4px; display: inline-block;">to ${endDateStr} (${endTimeStr})</span>`;
        }
    } else {
        dateDisplay = `${startDateStr} <br> <span style="color:var(--primary); margin-top: 4px; display: inline-block;">Start: ${startTimeStr}</span>`;
    }

    let remindText = 'No reminder';
    if (ep.remindMinutes > 0) {
        if (ep.remindMinutes >= 1440) remindText = `1 day`;
        else if (ep.remindMinutes >= 60) remindText = `${ep.remindMinutes / 60} hr`;
        else remindText = `${ep.remindMinutes} min`;
    }

    const html = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div>
                <div class="detail-label" style="margin-bottom: 4px;">SCHEDULED VISIT</div>
                <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main); margin: 0; line-height: 1.3;">${esc(event.title)}</h2>
            </div>
        </div>
        
        <div class="detail-field">
            <span class="detail-label">Date & Time</span>
            <span class="detail-value" style="background: var(--card-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light); margin-top: 6px; display: block; font-weight: 500;">
                ${dateDisplay}
            </span>
        </div>

        <div class="detail-field">
            <span class="detail-label">Remind Before</span>
            <span class="detail-value" style="background: var(--card-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light); margin-top: 6px; display: block;">
                ${remindText}
            </span>
        </div>

        ${ep.description ? `
        <div class="detail-field">
            <span class="detail-label">Note</span>
            <span class="detail-value" style="background: var(--card-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light); margin-top: 6px; display: block; white-space: pre-wrap;">${esc(ep.description)}</span>
        </div>
        ` : ''}

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-light); display: flex; gap: 10px;">
            <button class="btn-secondary" onclick="window.closeDetail()" style="flex: 1;">Close</button>
            <button class="btn-primary" onclick="window.triggerEditAppointment('${event.id}')" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit
            </button>
        </div>
    `;
    document.getElementById('detail-content').innerHTML = html;
    document.getElementById('detail-overlay').classList.add('open');
}

window.triggerEditAppointment = function (eventId) {
    window.closeDetail();
    if (!AppState.calendarObj) return;
    const event = AppState.calendarObj.getEventById(eventId);
    if (event) {
        setTimeout(() => {
            window.openAppointmentDetail(event);
        }, 150);
    }
}

window.updateCalendarEvents = function () {
    if (AppState.calendarObj) AppState.calendarObj.refetchEvents();
};

// ============================================================
// APPOINTMENT MODAL — เปิดสร้างใหม่
// ============================================================
window.openAppointmentModal = function (start, end, allDay) {
    AppState.editingAptId = null;

    document.getElementById('apt-modal-title').textContent = 'Schedule Visit';
    document.getElementById('btn-apt-delete').style.display = 'none';
    document.getElementById('apt-note').value = '';

    const d = start ? new Date(start) : new Date();
    let endD = null;

    if (allDay) {
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 1) {
            endD = new Date(end.getTime() - 24 * 60 * 60 * 1000);
            d.setHours(9, 0, 0);
            endD.setHours(17, 0, 0);
        } else {
            d.setHours(9, 0, 0);
        }
    } else {
        const diffMins = (end.getTime() - start.getTime()) / (1000 * 60);
        if (diffMins > 30) {
            endD = new Date(end);
        }
    }

    const startInput = document.getElementById('apt-start-date');
    const endInput = document.getElementById('apt-end-date');

    if (!startInput || !endInput) {
        alert('Missing HTML IDs: apt-start-date or apt-end-date.');
        if (AppState.calendarObj) AppState.calendarObj.unselect();
        return;
    }

    if (!window._aptStartDatePicker) {
        window._aptStartDatePicker = flatpickr(startInput, { altInput: true, altFormat: 'd M Y', dateFormat: 'Y-m-d' });
        window._aptEndDatePicker = flatpickr(endInput, { altInput: true, altFormat: 'd M Y', dateFormat: 'Y-m-d' });
    }

    window._aptStartDatePicker.setDate(d, true);

    if (endD) {
        window._aptEndDatePicker.setDate(endD, true);
    } else {
        window._aptEndDatePicker.clear();
    }

    const pad = n => String(n).padStart(2, '0');

    const startH = pad(d.getHours());
    const startM = ['00', '15', '30', '45'].reduce((prev, curr) =>
        Math.abs(parseInt(curr) - d.getMinutes()) < Math.abs(parseInt(prev) - d.getMinutes()) ? curr : prev);
    document.getElementById('apt-hour').value = startH;
    document.getElementById('apt-minute').value = startM;

    const fallbackEnd = endD || new Date(d.getTime() + 3600000);
    const endH = pad(Math.min(23, fallbackEnd.getHours()));
    const endM = ['00', '15', '30', '45'].reduce((prev, curr) =>
        Math.abs(parseInt(curr) - fallbackEnd.getMinutes()) < Math.abs(parseInt(prev) - fallbackEnd.getMinutes()) ? curr : prev);
    document.getElementById('apt-end-hour').value = endH;
    document.getElementById('apt-end-minute').value = endM;

    document.getElementById('apt-remind-select').value = '30';
    const outletSel = document.getElementById('apt-outlet-select');
    if (outletSel?._tomSelect) outletSel._tomSelect.clear();

    loadAptOutlets();
    document.getElementById('appointment-modal').classList.add('open');
};

// ============================================================
// APPOINTMENT MODAL — เปิดแก้ไข
// ============================================================
window.openAppointmentDetail = function (event) {
    const ep = event.extendedProps;
    AppState.editingAptId = ep.dbId;

    document.getElementById('apt-modal-title').textContent = 'Edit Visit';
    document.getElementById('btn-apt-delete').style.display = 'inline-flex';
    document.getElementById('apt-note').value = ep.description || '';

    const d = ep.originalStart ? new Date(ep.originalStart) : (event.start || new Date());
    let endD = ep.originalEnd ? new Date(ep.originalEnd) : (event.end ? new Date(event.end) : new Date(d.getTime() + 3600000));

    if (event.allDay && event.end) {
        endD = new Date(event.end.getTime() - 24 * 60 * 60 * 1000);
    }

    if (!window._aptStartDatePicker) {
        window._aptStartDatePicker = flatpickr('#apt-start-date', {
            altInput: true, altFormat: 'd M Y', dateFormat: 'Y-m-d'
        });
        window._aptEndDatePicker = flatpickr('#apt-end-date', {
            altInput: true, altFormat: 'd M Y', dateFormat: 'Y-m-d'
        });
    }
    window._aptStartDatePicker.setDate(d, true);
    window._aptEndDatePicker.setDate(endD, true);

    const pad = n => String(n).padStart(2, '0');

    document.getElementById('apt-hour').value = pad(d.getHours());
    document.getElementById('apt-minute').value = ['00', '15', '30', '45'].reduce((prev, curr) =>
        Math.abs(parseInt(curr) - d.getMinutes()) < Math.abs(parseInt(prev) - d.getMinutes()) ? curr : prev);

    document.getElementById('apt-end-hour').value = pad(Math.min(23, endD.getHours()));
    document.getElementById('apt-end-minute').value = ['00', '15', '30', '45'].reduce((prev, curr) =>
        Math.abs(parseInt(curr) - endD.getMinutes()) < Math.abs(parseInt(prev) - endD.getMinutes()) ? curr : prev);

    const remindVal = ep.remindMinutes !== undefined ? ep.remindMinutes : 30;
    const remindSel = document.getElementById('apt-remind-select');
    if (remindSel) remindSel.value = String(remindVal);

    loadAptOutlets(ep.outletName || ep.location || '');
    document.getElementById('appointment-modal').classList.add('open');
};

// ============================================================
// SAVE / UPDATE
// ============================================================
window.saveAppointment = async function () {
    const outletSel = document.getElementById('apt-outlet-select');
    const ts = outletSel?._tomSelect;
    const outletId = ts ? ts.getValue() : (outletSel?.value || '');
    const outletName = ts?.options[outletId]?.text || outletId || '';
    if (!outletId) { toast('Please select an outlet.', false); return; }

    const startDateVal = window._aptStartDatePicker?.input?.value || document.getElementById('apt-start-date').value;
    const endDateVal = window._aptEndDatePicker?.input?.value || document.getElementById('apt-end-date').value;

    if (!startDateVal) { toast('Please select a start date.', false); return; }

    const h = document.getElementById('apt-hour').value;
    const m = document.getElementById('apt-minute').value;
    const startDt = new Date(`${startDateVal}T${h}:${m}:00`);

    const targetEndDate = endDateVal ? endDateVal : startDateVal;

    const eh = document.getElementById('apt-end-hour').value;
    const em = document.getElementById('apt-end-minute').value;
    const endDt = new Date(`${targetEndDate}T${eh}:${em}:00`);

    if (endDt <= startDt) {
        toast('End date/time must be after the start.', false);
        return;
    }

    const payload = {
        title: outletName,
        description: document.getElementById('apt-note').value.trim() || null,
        location: outletId,
        outlet_name: outletName,
        color: '#4CAF50',
        type: 'visit',
        remindMinutes: parseInt(document.getElementById('apt-remind-select')?.value || '30'),
        start: startDt.toISOString(),
        end: endDt.toISOString(),
        allDay: false
    };

    const btn = document.getElementById('btn-apt-save');
    btn.disabled = true; btn.textContent = 'Saving...';

    try {
        if (AppState.editingAptId) {
            await CalendarDB.update(AppState.editingAptId, payload);
            toast('Updated.', true);
        } else {
            await CalendarDB.create(payload);
            toast('Visit scheduled.', true);
        }
        document.getElementById('appointment-modal').classList.remove('open');
        if (AppState.calendarObj) AppState.calendarObj.refetchEvents();
    } catch (e) {
        toast('Error: ' + e.message, false);
    } finally {
        btn.disabled = false; btn.textContent = 'Save';
    }
};

// ============================================================
// DELETE
// ============================================================
window.deleteAppointment = async function () {
    if (!AppState.editingAptId) return;
    if (!confirm('Delete this appointment?')) return;
    try {
        await CalendarDB.delete(AppState.editingAptId);
        document.getElementById('appointment-modal').classList.remove('open');
        if (AppState.calendarObj) AppState.calendarObj.refetchEvents();
        toast('Appointment deleted.', true);
    } catch (e) {
        toast('Failed to delete: ' + e.message, false);
    }
};

// ============================================================
// HELPER
// ============================================================
function _fmtDTDisplay(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const pad = n => String(n).padStart(2, '0');
        return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return isoStr; }
}

window.autoSetEndTime = function () {
    const startVal = document.getElementById('apt-start-date')?.value;
    const endVal = document.getElementById('apt-end-date')?.value;

    if (startVal && endVal && startVal !== endVal) return;

    const sh = parseInt(document.getElementById('apt-hour').value || '9');
    const sm = parseInt(document.getElementById('apt-minute').value || '0');
    const endH = document.getElementById('apt-end-hour');
    const endM = document.getElementById('apt-end-minute');
    if (!endH || !endM) return;

    const curEH = parseInt(endH.value || '10');
    const curEM = parseInt(endM.value || '0');

    if (curEH * 60 + curEM <= sh * 60 + sm) {
        const newH = Math.min(23, sh + 1);
        endH.value = String(newH).padStart(2, '0');
        endM.value = String(sm).padStart(2, '0');
    }
};

window.selectAptType = function (el, type) {
    document.querySelectorAll('.apt-type-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('apt-type').value = type;
    _toggleAptLocationUI(type);
};

function _toggleAptLocationUI(type) {
    const locationWrap = document.getElementById('apt-location-wrap');
    const outletWrap = document.getElementById('apt-outlet-wrap');
    if (!locationWrap || !outletWrap) return;
    if (type === 'visit') {
        locationWrap.style.display = 'none';
        outletWrap.style.display = 'flex';
        loadAptOutlets();
    } else {
        locationWrap.style.display = '';
        outletWrap.style.display = 'none';
    }
}

async function loadAptOutlets(selectValue) {
    const selectEl = document.getElementById('apt-outlet-select');
    if (!selectEl) return;

    if (selectEl._tomSelect && !selectValue) { return; }
    if (selectEl._tomSelect && selectValue) {
        selectEl._tomSelect.setValue(selectValue, true);
        return;
    }

    try {
        const team = (AppState.userProfile.team || '').trim().toLowerCase();
        const isAdmin = team === 'admin';
        const empId = AppState.userProfile.empId;
        const bdeName = AppState.userProfile.name;

        let params = `select=customer_id,name_of_outlet&status=neq.INACTIVE&order=name_of_outlet.asc`;
        params = _appendUserFilter(params, isAdmin, empId, bdeName);

        const data = await DB.select('customer_information', params);
        const options = (data || []).map(c => ({
            value: c.customer_id,
            text: c.name_of_outlet,
            searchText: `${c.customer_id} ${c.name_of_outlet}`,
            outletName: c.name_of_outlet
        }));

        if (selectEl._tomSelect) selectEl._tomSelect.destroy();

        const ts = new TomSelect(selectEl, {
            options: options,
            items: selectValue ? [selectValue] : [],
            valueField: 'value',
            labelField: 'text',
            searchField: ['text', 'searchText'],
            sortField: { field: 'text', direction: 'asc' },
            placeholder: 'Search outlet...',
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
            }
        });
        selectEl._tomSelect = ts;
    } catch (e) {
        console.error('loadAptOutlets error:', e);
    }
}

window.selectAptColor = function (el, color) {
    document.querySelectorAll('.apt-swatch').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('apt-color').value = color;
};
