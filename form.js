// ============================================================
// FORM & AUTOSAVE MODULE
// ============================================================
function bindAutoSave() {
    const inputs = ['f-customer', 'f-main-team', 'f-sub-team', 'f-person', 'f-position', 'f-pos-other', 'f-date', 'f-reason', 'f-result', 'f-next-date'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input',  () => { saveAutoSaveData(); updateSaveBtn(); });
            el.addEventListener('change', () => { saveAutoSaveData(); updateSaveBtn(); });
        }
    });
    document.querySelectorAll('.f-followup').forEach(cb => {
        cb.addEventListener('change', () => { saveAutoSaveData(); updateSaveBtn(); });
    });
    updateSaveBtn();
}

// ============================================================
// SAVE BUTTON STATE
// ============================================================
function updateSaveBtn() {
    const btn = document.getElementById('btn-save');
    if (!btn) return;

    const customer = document.getElementById('f-customer')?.value;
    const person   = document.getElementById('f-person')?.value?.trim();
    const position = document.getElementById('f-position')?.value;
    const date     = document.getElementById('f-date')?.value;
    const reason   = document.getElementById('f-reason')?.value?.trim();
    const result   = document.getElementById('f-result')?.value?.trim();
    const followupChecked = Array.from(document.querySelectorAll('.f-followup')).some(cb => cb.checked);
    const hasPhoto = AppState.photos.length > 0;

    let posOk = position && position !== '';
    if (position === '__other__') {
        posOk = !!document.getElementById('f-pos-other')?.value?.trim();
    }

    const resultOk = !!result || followupChecked;
    const ready = !!(customer && person && posOk && date && reason && resultOk && hasPhoto);

    btn.disabled = !ready;
    btn.style.opacity = ready ? '1' : '0.45';
    btn.style.cursor  = ready ? 'pointer' : 'not-allowed';
    btn.style.transform = '';
}

async function saveAutoSaveData() {
    if (AppState.isClearingForm) return;
    if (document.getElementById('tab-new').style.display === 'none') return;
    const data = {
        customerId: document.getElementById('f-customer').value,
        outletName: document.getElementById('f-outlet-name').value,
        mainTeam: document.getElementById('f-main-team').value,
        subTeam: document.getElementById('f-sub-team').value,
        person: document.getElementById('f-person').value,
        position: document.getElementById('f-position').value,
        posOther: document.getElementById('f-pos-other').value,
        date: document.getElementById('f-date').value,
        reason: document.getElementById('f-reason').value,
        result: document.getElementById('f-result').value,
        followups: Array.from(document.querySelectorAll('.f-followup')).map(cb => cb.checked),
        nextDate: document.getElementById('f-next-date').value,
        photos: AppState.photos
    };
    try { await localforage.setItem(CONFIG.KEYS.AUTOSAVE, data); } catch (e) { console.error("Autosave failed:", e); }
}

async function loadAutoSaveData() {
    try {
        const data = await localforage.getItem(CONFIG.KEYS.AUTOSAVE);
        if (!data) return;
        let hasData = false;

        const populateField = (id, val) => { if (val) { document.getElementById(id).value = val; hasData = true; } };

        if (data.customerId && AppState.tomSelectCustomer) {
            AppState.tomSelectCustomer.setValue(data.customerId, true);
            const opt = AppState.tomSelectCustomer.options[data.customerId];
            if (opt) document.getElementById('f-outlet-name').value = opt.outletName || '';
            hasData = true;
        }
        populateField('f-outlet-name', data.outletName);

        populateField('f-person', data.person);
        populateField('f-pos-other', data.posOther);
        populateField('f-reason', data.reason);
        populateField('f-result', data.result);

        if (data.date && AppState.fpDate) { AppState.fpDate.setDate(data.date); hasData = true; }
        if (data.nextDate && AppState.fpNextDate) { AppState.fpNextDate.setDate(data.nextDate); }

        if (data.position) {
            document.getElementById('f-position').value = data.position;
            document.getElementById('pos-other-wrap').style.display = data.position === '__other__' ? 'block' : 'none';
            hasData = true;
        }

        if (data.followups && data.followups.length > 0) {
            document.querySelectorAll('.f-followup').forEach((cb, i) => {
                cb.checked = data.followups[i];
                if (cb.checked) hasData = true;
                if (cb.id === 'cb-next-visit') document.getElementById('next-visit-wrap').style.display = cb.checked ? 'block' : 'none';
            });
        }

        if (data.photos && data.photos.length > 0) {
            AppState.photos = data.photos;
            renderPreviews(); updateModalCounter(); updateMiniGalleryThumb(); hasData = true;
        }

        if (hasData) { toast('Draft restored automatically.', true); }
        updateSaveBtn();
    } catch (e) { console.error("Failed to load autosave", e); }
}

window.clearForm = function () {
    AppState.isClearingForm = true;
    if (AppState.tomSelectCustomer) AppState.tomSelectCustomer.clear(true);
    document.getElementById('f-outlet-name').value = '';
    ['f-main-team', 'f-sub-team', 'f-person', 'f-pos-other', 'f-reason', 'f-result'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('f-position').value = '';
    document.getElementById('pos-other-wrap').style.display = 'none';
    if (AppState.fpDate) AppState.fpDate.setDate(today());
    if (AppState.fpNextDate) AppState.fpNextDate.clear();
    document.querySelectorAll('.f-followup').forEach(cb => cb.checked = false);
    document.getElementById('next-visit-wrap').style.display = 'none';

    AppState.photos = [];
    renderPreviews(); window.stopCamera();
    localforage.removeItem(CONFIG.KEYS.AUTOSAVE).finally(() => {
        AppState.isClearingForm = false;
        updateSaveBtn();
    });
}

// ============================================================
// SAVE & VALIDATION MODULE
// ============================================================
window.triggerSaveConfirm = function () {
    const customerSelect = document.getElementById('f-customer');
    if (!customerSelect.value) {
        toast('Please select a Customer / Outlet.', false);

        if (AppState.tomSelectCustomer && AppState.tomSelectCustomer.control) {
            const tsControl = AppState.tomSelectCustomer.control;
            tsControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            AppState.tomSelectCustomer.focus();
            tsControl.classList.add('error-highlight');
            setTimeout(() => tsControl.classList.remove('error-highlight'), 2500);
        } else {
            customerSelect.focus();
        }
        return;
    }

    const requiredFields = [
        { id: 'f-main-team', name: 'Team' },
        { id: 'f-sub-team', name: 'Sub-Team/Area' },
        { id: 'f-person', name: 'Person You Met' },
        { id: 'f-position', name: 'Their Position' },
        { id: 'f-date', name: 'Visit Date' },
        { id: 'f-reason', name: 'Reason for Visit' }
    ];

    const posEl = document.getElementById('f-position');
    if (posEl && posEl.value === '__other__') requiredFields.push({ id: 'f-pos-other', name: 'Specify Position' });

    for (const field of requiredFields) {
        const el = document.getElementById(field.id);
        let val = el ? el.value.trim() : '';
        if (!val && field.id === 'f-main-team') val = AppState.userProfile.team || '';
        if (!val && field.id === 'f-sub-team') val = AppState.userProfile.subTeam || AppState.userProfile.area || '';
        if (!val) {
            toast(`Please fill in: ${field.name}`, false);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus();
                el.classList.add('error-highlight'); setTimeout(() => el.classList.remove('error-highlight'), 2500);
            }
            return;
        }
    }

    let followUps = []; let fQuotation = false, fCall = false;
    document.querySelectorAll('.f-followup').forEach(cb => {
        if (cb.value === 'Send Quotation / Documents') fQuotation = cb.checked;
        if (cb.value === 'Call Back Later') fCall = cb.checked;
        if (cb.id === 'cb-next-visit') {
            if (cb.checked) {
                const nd = document.getElementById('f-next-date').value;
                followUps.push(nd ? `Schedule Next Visit: ${fmtDate(nd)}` : 'Schedule Next Visit');
            }
        } else if (cb.checked) followUps.push(cb.value);
    });

    const fNext = document.getElementById('cb-next-visit').checked;
    const fNextDate = document.getElementById('f-next-date').value;
    const resultEl = document.getElementById('f-result');
    const result = resultEl.value.trim();

    if (!result && followUps.length === 0) {
        toast('Please provide a Result or select a Follow-up.', false);
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); resultEl.focus();
        resultEl.classList.add('error-highlight'); setTimeout(() => resultEl.classList.remove('error-highlight'), 2500);
        return;
    }

    if (AppState.photos.length === 0) {
        toast('Please capture at least 1 photo.', false);
        const camSection = document.querySelector('.easy-camera-container');
        if (camSection) {
            camSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            camSection.classList.add('error-highlight'); setTimeout(() => camSection.classList.remove('error-highlight'), 2500);
        }
        return;
    }

    const finalResultText = result + (followUps.length > 0 && result ? '\n\n' : '') +
        (followUps.length > 0 ? '[ Follow-up Actions ]\n- ' + followUps.join('\n- ') : '');

    AppState.pendingSaveData = {
        customerId: customerSelect.value,
        outlet: document.getElementById('f-outlet-name').value,
        mainTeam: document.getElementById('f-main-team').value,
        subTeam: document.getElementById('f-sub-team').value,
        person: document.getElementById('f-person').value.trim(),
        position: getPosition(),
        date: document.getElementById('f-date').value,
        reason: document.getElementById('f-reason').value.trim(),
        result: finalResultText,
        rawResult: result,
        rawFollowUps: { fQuotation, fCall, fNext, fNextDate }
    };

    renderConfirmModal();
    document.getElementById('save-confirm-overlay').classList.add('open');
}

window.executeSave = async function () {
    if (!AppState.pendingSaveData) return;

    if (document.getElementById('save-confirm-overlay').getAttribute('data-mode') === 'edit') {
        const mResult = document.getElementById('m-result').value.trim();
        let mFollowUps = [];
        if (document.getElementById('m-cb-quotation').checked) mFollowUps.push('Send Quotation / Documents');
        if (document.getElementById('m-cb-call').checked) mFollowUps.push('Call Back Later');
        if (document.getElementById('m-cb-next').checked) {
            const nd = document.getElementById('m-next-date').value;
            mFollowUps.push(nd ? `Schedule Next Visit: ${fmtDate(nd)}` : 'Schedule Next Visit');
        }

        const mFinalResultText = mResult + (mFollowUps.length > 0 && mResult ? '\n\n' : '') +
            (mFollowUps.length > 0 ? '[ Follow-up Actions ]\n- ' + mFollowUps.join('\n- ') : '');

        const posSel = document.getElementById('m-position-sel').value;

        AppState.pendingSaveData.mainTeam = document.getElementById('m-main-team').value;
        AppState.pendingSaveData.subTeam = document.getElementById('m-sub-team').value;
        AppState.pendingSaveData.date = document.getElementById('m-date').value;
        AppState.pendingSaveData.person = document.getElementById('m-person').value.trim();
        AppState.pendingSaveData.position = posSel === '__other__' ? document.getElementById('m-pos-other').value.trim() : posSel;
        AppState.pendingSaveData.reason = document.getElementById('m-reason').value.trim();
        AppState.pendingSaveData.result = mFinalResultText;

        if (!AppState.pendingSaveData.reason || !AppState.pendingSaveData.person || !AppState.pendingSaveData.position) {
            toast('Please fill in required fields.', false); return;
        }
        if (!mResult && mFollowUps.length === 0) { toast('Please provide a Result or select a Follow-up.', false); return; }
        if (AppState.photos.length === 0) { toast('Please add at least 1 photo before saving.', false); return; }
    }

    const saveBtn = document.querySelector('#save-confirm-actions .btn-primary');
    const originalBtnText = saveBtn ? saveBtn.textContent : 'Confirm & Save';

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
    toast('Uploading data...', true);

    try {
        const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString();

        const newUploadedUrls = await uploadPhotosToStorage(id);

        if (newUploadedUrls.length === 0 && AppState.photos.length > 0) {
            throw new Error("Failed to upload photos. Please check your connection.");
        }

        const payload = {
            id: id,
            customer_id: AppState.pendingSaveData.customerId,
            name_of_outlet: AppState.pendingSaveData.outlet,
            date_visit: AppState.pendingSaveData.date,
            visit_report: `[Person Met: ${AppState.pendingSaveData.person} - ${AppState.pendingSaveData.position}]\n\n${AppState.pendingSaveData.reason}`,
            visit_result: AppState.pendingSaveData.result,
            visit_capture: JSON.stringify(newUploadedUrls),
            user_id: AppState.userProfile.empId || '',
            team: AppState.pendingSaveData.mainTeam,
            bde: AppState.userProfile.name,
            status: 'COMPLETED'
        };

        await DB.insert('visitation', payload);

        toast('Visitation record saved successfully!');
        document.getElementById('save-confirm-overlay').classList.remove('open');
        window.clearForm();

        AppState.currentPage = 0;
        await loadVisitsFromDB();
        window.switchTab('list');

    } catch (err) {
        console.error("Save Execution Error:", err);
        toast('Failed to save: ' + err.message, false);
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalBtnText; }
    }
}
