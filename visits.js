// ============================================================
// VISIT LIST, DETAIL, PAGINATION & DELETE
// ============================================================

window.resetAndFetch = function () {
    AppState.currentPage = 0;
    fetchVisitsWithSkeleton();
}

let searchTimeout;
window.debounceSearch = function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { window.resetAndFetch(); }, 500);
}

async function loadVisitsFromDB() {
    try {
        const rangeStart = AppState.currentPage * CONFIG.PAGE_SIZE;
        const rangeEnd = (AppState.currentPage + 1) * CONFIG.PAGE_SIZE - 1;

        const empId = AppState.userProfile.empId;
        const bdeName = AppState.userProfile.name;
        const team = (AppState.userProfile.team || '').trim().toLowerCase();
        const isAdmin = (team === 'admin');

        const filterArea = document.getElementById('fl-area')?.value || '';
        const filterDate = document.getElementById('fl-date')?.value || '';
        const filterSearch = document.getElementById('fl-search')?.value.toLowerCase().trim() || '';
        const filterPosRaw = document.getElementById('fl-pos')?.value || '';
        const filterPos = filterPosRaw === '__other__'
            ? (document.getElementById('fl-pos-other')?.value.trim() || '')
            : filterPosRaw;
        let filters = `or=(req_status.is.null,req_status.neq.approved)`;

        filters = _appendUserFilter(filters, isAdmin, empId, bdeName, `&id=eq.00000000-0000-0000-0000-000000000000`);

        if (filterArea) filters += `&team=eq.${encodeURIComponent(filterArea)}`;
        if (filterDate) filters += `&date_visit=eq.${encodeURIComponent(filterDate)}`;
        if (filterSearch) filters += `&or=(name_of_outlet.ilike.*${encodeURIComponent(filterSearch)}*,visit_report.ilike.*${encodeURIComponent(filterSearch)}*)`;
        if (filterPos) filters += `&visit_report=ilike.*- ${encodeURIComponent(filterPos)}]*`;
        const countRes = await fetch(
            `${CONFIG.SUPABASE.URL}/rest/v1/visitation?${filters}&select=id`,
            {
                cache: 'no-store',
                headers: {
                    'apikey': CONFIG.SUPABASE.KEY,
                    'Authorization': 'Bearer ' + CONFIG.SUPABASE.KEY,
                    'Prefer': 'count=exact'
                }
            }
        );
        AppState.totalCount = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);
        AppState.totalPages = Math.max(1, Math.ceil(AppState.totalCount / CONFIG.PAGE_SIZE));

        const visitsData = await DB.query(
            `visitation?${filters}&select=*&order=date_visit.desc&limit=${CONFIG.PAGE_SIZE}&offset=${rangeStart}`,
            { headers: { 'Range': `${rangeStart}-${rangeEnd}`, 'Range-Unit': 'items' } }
        );
        const userIds = [...new Set((visitsData || []).map(v => v.user_id).filter(Boolean))];
        let usersMap = {};
        if (userIds.length > 0) {
            const usersData = await DB.select(
                'user_information',
                `select=user_id,sub_team&user_id=in.(${userIds.map(encodeURIComponent).join(',')})`
            );
            if (usersData) usersData.forEach(u => usersMap[u.user_id] = u.sub_team);
        }

        const formatted = (visitsData || []).map(v => {
            let parsedPhotos = [];
            try { parsedPhotos = v.visit_capture ? JSON.parse(v.visit_capture) : []; } catch (e) { console.warn('parse visit_capture error:', e); }

            let extractedPerson = '', extractedPosition = '', extractedReason = v.visit_report || '';
            const reportMatch = extractedReason.match(/^\[Person Met:\s*(.*?)\s*-\s*(.*?)\]\n\n([\s\S]*)$/);
            if (reportMatch) {
                extractedPerson = reportMatch[1];
                extractedPosition = reportMatch[2];
                extractedReason = reportMatch[3];
            } else {
                extractedPerson = v.bde || '';
            }

            let nextDateStr = null;
            const matchNext = (v.visit_result || '').match(/Schedule Next Visit:\s*([0-9]{1,2}\s[A-Za-z]{3}\s[0-9]{4}(?:\s[0-9]{2}:[0-9]{2})?)/);
            if (matchNext) {
                const d = new Date(matchNext[1]);
                if (!isNaN(d)) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const hours = String(d.getHours()).padStart(2, '0');
                    const minutes = String(d.getMinutes()).padStart(2, '0');

                    if (matchNext[1].includes(':')) {
                        nextDateStr = `${year}-${month}-${day}T${hours}:${minutes}:00`;
                    } else {
                        nextDateStr = `${year}-${month}-${day}`;
                    }
                }
            }

            return {
                id: v.id,
                outlet: v.name_of_outlet || v.customer_id || '',
                area: v.team || '',
                person: extractedPerson,
                position: extractedPosition,
                date: v.date_visit || '',
                reason: extractedReason,
                result: v.visit_result || '',
                photos: parsedPhotos,
                creatorName: v.bde || 'Unknown BDE',
                creatorEmail: '',
                creatorPosition: '',
                is_deleted: v.is_deleted === true,
                delete_reason: v.delete_reason || '',
                req_status: v.req_status || null,
                userArea: usersMap[v.user_id] || '',
                next_visit_date: nextDateStr
            };
        });

        AppState.visits = formatted;
        updateCount();
    } catch (e) { console.error(e); }
}

async function fetchVisitsWithSkeleton() {
    document.getElementById('visit-list').innerHTML = '';
    document.getElementById('pagination-container').innerHTML = '';
    document.getElementById('visit-list-loading').style.display = 'block';
    await loadVisitsFromDB();
    document.getElementById('visit-list-loading').style.display = 'none';
    renderList(); renderPagination();
}

window.goToPage = function (page) {
    if (page < 0 || page >= AppState.totalPages) return;
    AppState.currentPage = page;
    fetchVisitsWithSkeleton();
    document.getElementById('visit-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPagination() {
    const container = document.getElementById('pagination-container');
    if (!container) return;
    const total = AppState.totalPages;
    const current = AppState.currentPage;

    if (total <= 1) { container.innerHTML = ''; return; }

    let pages = [];
    if (total <= 7) {
        for (let i = 0; i < total; i++) pages.push(i);
    } else {
        pages.push(0);
        if (current > 3) pages.push('...');
        for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i);
        if (current < total - 4) pages.push('...');
        pages.push(total - 1);
    }

    const btnClass = (p) => p === current ? 'pagination-btn pagination-btn-active' : 'pagination-btn';
    const pageButtons = pages.map(p => p === '...' ? `<span class="pagination-ellipsis">…</span>` : `<button class="${btnClass(p)}" onclick="goToPage(${p})">${p + 1}</button>`).join('');

    container.innerHTML = `
        <div class="pagination-wrap">
            <button class="pagination-btn pagination-btn-nav" onclick="goToPage(${current - 1})" ${current === 0 ? 'disabled' : ''}>‹</button>
            ${pageButtons}
            <button class="pagination-btn pagination-btn-nav" onclick="goToPage(${current + 1})" ${current === total - 1 ? 'disabled' : ''}>›</button>
        </div>
        <div class="pagination-info">Page ${current + 1} of ${total}</div>
    `;
}

async function uploadPhotosToStorage(recordId) {
    let uploadedUrls = [];

    for (let i = 0; i < AppState.photos.length; i++) {
        try {
            const photo = AppState.photos[i];
            if (!photo.startsWith('data:')) {
                uploadedUrls.push(photo);
                continue;
            }
            const res = await fetch(photo);
            const blob = await res.blob();
            const fileName = `${recordId}/photo_${Date.now()}_${i}.jpg`;
            const publicUrl = await DB.uploadFile('visit_photos', fileName, blob);
            uploadedUrls.push(publicUrl);
        } catch (e) {
            console.error("Upload failed for photo", i, ":", e);
            toast(`Upload error: ${e.message}`, false);
        }
    }
    return uploadedUrls;
}

window.renderList = function () {
    const area = document.getElementById('fl-area').value;
    let pos = document.getElementById('fl-pos').value;
    const q = document.getElementById('fl-search').value.toLowerCase();
    const filterDate = document.getElementById('fl-date') ? document.getElementById('fl-date').value : '';

    if (pos === '__other__') pos = document.getElementById('fl-pos-other') ? document.getElementById('fl-pos-other').value.toLowerCase().trim() : '';
    else pos = pos.toLowerCase();

    const filtered = AppState.visits.filter(v => {
        if (v.req_status === 'approved' || (v.is_deleted === true && v.req_status !== 'pending')) return false;
        if (area && v.area !== area) return false;
        if (pos && !v.position.toLowerCase().includes(pos)) return false;
        if (filterDate && v.date !== filterDate) return false;
        if (q && !v.outlet.toLowerCase().includes(q) && !v.person.toLowerCase().includes(q)) return false;
        return true;
    });

    const el = document.getElementById('visit-list');

    if (!filtered.length) {
        const hasFilters = area || pos || filterDate || q;
        const lang = AppState.currentLang || 'en';

        if (hasFilters) {
            el.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            <line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                    </div>
                    <div class="empty-state-title">${lang === 'th' ? 'ไม่พบข้อมูลที่ตรงกัน' : 'No matching records'}</div>
                    <div class="empty-state-sub">${lang === 'th' ? 'ลองเปลี่ยน filter หรือล้างการค้นหา' : 'Try adjusting your filters or clearing the search'}</div>
                    <button class="empty-state-btn" onclick="clearAllFilters()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        ${lang === 'th' ? 'ล้าง Filter' : 'Clear Filters'}
                    </button>
                </div>`;
        } else {
            el.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="12" y1="18" x2="12" y2="12"/>
                            <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                    </div>
                    <div class="empty-state-title">${lang === 'th' ? 'ยังไม่มีการบันทึก' : 'No visits recorded yet'}</div>
                    <div class="empty-state-sub">${lang === 'th' ? 'เริ่มบันทึกการเยืยมลูกค้าครั่งแรกได้เลย' : 'Start by logging your first customer visit'}</div>
                    <button class="empty-state-btn" onclick="switchTab('new')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        ${lang === 'th' ? 'บันทึกการเยียม' : 'New Visit'}
                    </button>
                </div>`;
        }
        return;
    }

    el.innerHTML = '';
    const template = document.getElementById('visit-card-template');

    filtered.forEach(v => {
        const isPending = v.req_status === 'pending';
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.visit-card');

        if (isPending) card.classList.add('visit-card-pending');
        card.onclick = () => window.openDetail(v.id);

        clone.querySelector('.tpl-outlet').textContent = v.outlet;
        clone.querySelector('.tpl-area').textContent = v.area;

        const statusBadge = clone.querySelector('.tpl-status-badge');
        if (isPending) statusBadge.innerHTML = `<span class="badge badge-pending">Pending Delete</span>`;

        clone.querySelector('.tpl-date').textContent = fmtDate(v.date);
        clone.querySelector('.tpl-person').textContent = v.person;
        clone.querySelector('.tpl-pos').textContent = v.position;

        const reasonEl = clone.querySelector('.tpl-reason');
        reasonEl.textContent = v.reason.length > 120 ? v.reason.substring(0, 120) + '...' : v.reason;
        if (isPending) reasonEl.style.textDecoration = 'line-through';

        clone.querySelector('.tpl-thumbs').innerHTML = renderThumbStrip(v.photos);
        el.appendChild(clone);
    });
}

window.openDetail = function (id) {
    try {
        const v = AppState.visits.find(x => String(x.id) === String(id));
        if (!v) { alert("Error: Data not found."); return; }

        const isPending = v.req_status === 'pending';
        const visitInfo = [['Met With', `${v.person} (${v.position})`], ['Reason for Visit', v.reason], ['Result & Actions', v.result]];

        const renderFields = rows => rows.map(([l, val]) => `
            <div class="detail-field" style="margin-bottom: 20px;">
                <span class="detail-label">${l}</span>
                <span class="detail-value" style="background: var(--card-bg); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-light); margin-top: 6px; display: block; color: var(--text-main);">${esc(val).replace(/\n/g, '<br>')}</span>
            </div>`).join('');

        const photosHtml = v.photos && v.photos.length ? `
            <div style="border-top:1px dashed var(--border-light); margin:24px 0 16px 0;"></div>
            <div class="detail-label" style="margin-bottom:12px;">ATTACHED PHOTOS (${v.photos.length})</div>
            <div class="detail-photos">${v.photos.map(p => `<div class="detail-photo" onclick="window.openLightbox('${p}')"><img src="${p}" style="cursor:zoom-in;"></div>`).join('')}</div>` : '';

        const userTeam = v.area || 'Unknown Team';
        const userArea = v.userArea ? ` • ${v.userArea}` : '';

        const creatorHtml = `
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--border-light);">
                <div class="detail-label" style="margin-bottom:12px;">RECORDED BY</div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 16px;">
                        ${(v.creatorName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">${esc(v.creatorName || 'Unknown')}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px; font-weight: 500;">
                            ${esc(userTeam)}${esc(userArea)}
                        </div>
                    </div>
                </div>
            </div>`;

        const deleteBtnHtml = !isPending ? `
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-light); text-align: center;">
                <button class="btn-secondary btn-danger" onclick="window.openDeleteRequest('${v.id}')" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Request Delete
                </button>
            </div>` : '';

        document.getElementById('detail-content').innerHTML = `
            ${isPending ? `<div class="pending-warning" style="margin-bottom: 24px;"><strong>Pending deletion review.</strong><div>Reason: ${esc(v.delete_reason)}</div></div>` : ''}
            
            <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border-light);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="detail-label" style="margin: 0;">DATE:</span>
                        <span style="font-size: 14px; font-weight: 600; color: var(--primary);">${fmtDate(v.date)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="detail-label" style="margin: 0;">TEAM:</span>
                        <span class="badge badge-area" style="font-size: 11px; padding: 4px 12px; background: rgba(124, 144, 130, 0.1);">${esc(v.area)}</span>
                    </div>
                </div>

                <div>
                    <div class="detail-label" style="margin-bottom: 4px;">OUTLET / LOCATION</div>
                    <h2 style="font-size: 22px; font-weight: 700; color: var(--text-main); margin: 0; line-height: 1.2;">${esc(v.outlet)}</h2>
                </div>
            </div>

            <div style="${isPending ? 'opacity:0.6;' : ''}">${renderFields(visitInfo)}</div>
            ${photosHtml}${creatorHtml}${deleteBtnHtml}`;

        document.getElementById('detail-overlay').classList.add('open');
    } catch (e) { console.error(e); }
}

window.renderConfirmModal = function () {
    const photosHtml = `<div class="confirm-photo-grid">${AppState.photos.map(p => `<img src="${p}" onclick="window.openLightbox('${p}')" style="cursor:zoom-in;">`).join('')}</div>`;

    document.getElementById('save-confirm-text').innerHTML = `
        <div style="background: var(--bg-color); border: 1px solid var(--border-light); border-radius: 12px; padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed var(--border-light);">
                <div>
                    <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Outlet & Location</div>
                    <div style="font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        ${esc(AppState.pendingSaveData.outlet)}
                        <span class="badge badge-area" style="font-size: 11px;">${AppState.pendingSaveData.mainTeam} - ${AppState.pendingSaveData.subTeam}</span>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Date</div>
                    <div style="font-size: 13px; font-weight: 500; color: var(--primary);">${fmtDate(AppState.pendingSaveData.date)}</div>
                </div>
            </div>
            <div style="margin-bottom: 16px;">
                <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Met With</div>
                <div style="font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--text-muted);">${esc(AppState.pendingSaveData.person)}</span> <span class="badge badge-pos">${esc(AppState.pendingSaveData.position)}</span>
                </div>
            </div>
            <div style="margin-bottom: 16px;">
                <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Reason for Visit</div>
                <div style="font-size: 14px; line-height: 1.5; background: var(--card-bg); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-light);">${esc(AppState.pendingSaveData.reason).replace(/\n/g, '<br>')}</div>
            </div>
            <div style="margin-bottom: 16px;">
                <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Result & Actions</div>
                <div style="font-size: 14px; line-height: 1.5; background: var(--card-bg); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-light);">${esc(AppState.pendingSaveData.result).replace(/\n/g, '<br>')}</div>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-light);">
                <div style="font-size: 12px; font-weight: 500;">Attached Photos: <span style="color: var(--primary); font-weight: 600;">${AppState.photos.length}</span></div>
                ${photosHtml}
            </div>
        </div>`;

    document.getElementById('save-confirm-actions').innerHTML = `
        <button class="btn-secondary" onclick="window.enableModalEdit()">Edit</button>
        <button class="btn-primary" onclick="window.executeSave()">Confirm & Save</button>
    `;
    document.getElementById('save-confirm-overlay').setAttribute('data-mode', 'static');
}

window.enableModalEdit = function () {
    const positions = ['CEO', 'CFO', 'OWNER', 'BARTENDER', 'F&B MANAGER', 'MANAGER'];
    const isOtherPos = AppState.pendingSaveData.position && !positions.includes(AppState.pendingSaveData.position);
    const posOptions = positions.map(p => `<option value="${p}" ${p === AppState.pendingSaveData.position ? 'selected' : ''}>${p}</option>`).join('');

    const f = AppState.pendingSaveData.rawFollowUps || {};

    document.getElementById('save-confirm-text').innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; max-height: 65vh; overflow-y: auto; padding-right: 5px; text-align: left;">
            <div style="background: rgba(124, 144, 130, 0.1); color: var(--primary); padding: 10px; border-radius: 8px; font-size: 13px; font-weight: 500; margin-bottom: 4px; border: 1px solid var(--primary); display: flex; align-items: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit mode active
            </div>
            <div>
                <label style="font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; display: block;">Customer / Outlet</label>
                <input type="text" id="m-outlet" value="${esc(AppState.pendingSaveData.outlet)}" readonly style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-light); border-radius: 8px; font-family: inherit; font-size: 14px; outline: none; background: rgba(0,0,0,0.05); color: var(--text-main); cursor: not-allowed;">
            </div>
            
            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; display: block;">Team</label>
                    <input type="text" id="m-main-team" value="${esc(AppState.pendingSaveData.mainTeam)}" readonly style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-light); border-radius: 8px; font-family: inherit; font-size: 14px; outline: none; background: rgba(0,0,0,0.05); color: var(--text-main); cursor: not-allowed;">
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; display: block;">Area / Sub-Team</label>
                    <input type="text" id="m-sub-team" value="${esc(AppState.pendingSaveData.subTeam)}" readonly style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-light); border-radius: 8px; font-family: inherit; font-size: 14px; outline: none; background: rgba(0,0,0,0.05); color: var(--text-main); cursor: not-allowed;">
                </div>
            </div>

            <div>
                <label style="font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; display: block;">Date</label>
                <input type="text" id="m-date" value="${AppState.pendingSaveData.date}" style="width: 100%; padding: 10px 14px; border: 1px solid var(--primary); border-radius: 8px; font-family: inherit; font-size: 14px; outline: none; background: transparent; color: var(--text-main);">
            </div>
            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; display: block;">Met With</label>
                    <input type="text" id="m-person" value="${esc(AppState.pendingSaveData.person)}" style="width: 100%; padding: 10px 14px; border: 1px solid var(--primary); border-radius: 8px; font-family: inherit; font-size: 14px; outline: none; background: transparent; color: var(--text-main);">
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; display: block;">Position</label>
                    <select id="m-position-sel" onchange="document.getElementById('m-pos-other-wrap').style.display = this.value === '__other__' ? 'block' : 'none'" style="width: 100%; padding: 10px 14px; border: 1px solid var(--primary); border-radius: 8px; font-family: inherit; font-size: 14px; outline: none; background: transparent; color: var(--text-main);">
                        <option value="">Select position</option>
                        ${posOptions}
                        <option value="__other__" ${isOtherPos ? 'selected' : ''}>ETC — Please Type</option>
                    </select>
                </div>
            </div>
            <div id="m-pos-other-wrap" style="display: ${isOtherPos ? 'block' : 'none'};">
                <input type="text" id="m-pos-other" value="${isOtherPos ? esc(AppState.pendingSaveData.position) : ''}" placeholder="Specify Position" style="width: 100%; padding: 10px 14px; border: 1px solid var(--primary); border-radius: 8px; font-family: inherit; font-size: 14px; outline: none; background: transparent; color: var(--text-main);">
            </div>
            <div>
                <label style="font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; display: block;">Reason for Visit</label>
                <textarea id="m-reason" rows="2" style="width: 100%; padding: 10px 14px; border: 1px solid var(--primary); border-radius: 8px; font-family: inherit; font-size: 14px; outline: none; resize: vertical; background: transparent; color: var(--text-main);">${esc(AppState.pendingSaveData.reason)}</textarea>
            </div>
            <div>
                <label style="font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; display: block;">Result of Visit</label>
                <textarea id="m-result" rows="2" style="width: 100%; padding: 10px 14px; border: 1px solid var(--primary); border-radius: 8px; font-family: inherit; font-size: 14px; outline: none; resize: vertical; background: transparent; color: var(--text-main);">${esc(AppState.pendingSaveData.rawResult || '')}</textarea>
            </div>
            <div style="margin-top: 4px; padding-bottom: 10px;">
                <label style="font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 8px; display: block;">Follow-up Actions</label>
                <div style="display: flex; flex-direction: column; gap: 10px; background: var(--bg-color); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                    <label style="font-size: 13px; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="m-cb-quotation" ${f.fQuotation ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);"> Send Quotation/Docs
                    </label>
                    <label style="font-size: 13px; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="m-cb-call" ${f.fCall ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);"> Call Back Later
                    </label>
                    <label style="font-size: 13px; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="m-cb-next" ${f.fNext ? 'checked' : ''} onchange="document.getElementById('m-next-date-wrap').style.display = this.checked ? 'block' : 'none'" style="width: 18px; height: 18px; accent-color: var(--primary);"> Schedule Next Visit
                    </label>
                </div>
                <div id="m-next-date-wrap" style="display: ${f.fNext ? 'block' : 'none'}; margin-top: 10px; background: var(--bg-color); padding: 12px; border-radius: 8px; border: 1px solid var(--primary);">
                    <label style="font-size: 11px; color: var(--primary); display: block; margin-bottom: 6px;">Select Date for Next Visit:</label>
                    <input type="text" id="m-next-date" value="${f.fNextDate || today()}" style="width: 100%; padding: 10px 14px; border: 1px solid var(--primary); border-radius: 6px; font-family: inherit; font-size: 14px; outline: none; background: transparent; color: var(--text-main);">
                </div>
            </div>
            
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-light);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 500;">Attached Photos (<span id="m-photo-count">${AppState.photos.length}</span>/${CONFIG.MAX_PHOTOS})</label>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" class="btn-secondary" onclick="window.startCamera()" style="padding: 4px 12px; font-size: 11px; border-radius: 6px; border: 1px solid var(--primary); color: var(--primary);">Camera</button>
                        <button type="button" class="btn-secondary" onclick="window.selectFromLibrary()" style="padding: 4px 12px; font-size: 11px; border-radius: 6px; border: 1px solid var(--primary); color: var(--primary);">+ Library</button>
                    </div>
                </div>
                <div id="m-photo-grid" class="photo-previews"></div>
            </div>
        </div>
    `;

    document.getElementById('save-confirm-actions').innerHTML = `
        <button class="btn-secondary" onclick="window.renderConfirmModal()" style="color: var(--text-main);">Cancel Edit</button>
        <button class="btn-primary" onclick="window.executeSave()">Confirm & Save</button>
    `;
    document.getElementById('save-confirm-overlay').setAttribute('data-mode', 'edit');
    renderModalPhotos();

    flatpickr("#m-date", { altInput: true, altFormat: "d M Y", dateFormat: "Y-m-d", minDate: "today", maxDate: "today" });
    flatpickr("#m-next-date", {
        altInput: true,
        altFormat: "d M Y",
        dateFormat: "Y-m-d",
        minDate: "today",
        onReady: function (_, __, fp) {
            const cal = fp.calendarContainer;
            const timeRow = document.createElement('div');
            timeRow.className = 'fp-custom-time-row';
            timeRow.innerHTML = _fpTimeRowHtml('fp-mnext-hour', 'fp-mnext-min');
            cal.appendChild(timeRow);
            document.getElementById('fp-mnext-hour').value = '09';
        },
        onClose: _fpTimeOnClose('fp-mnext-hour', 'fp-mnext-min')
    });
}

window.updateModalSubTeam = function (mainTeam) {
    const subSelect = document.getElementById('m-sub-team');
    subSelect.innerHTML = '';
    if (TEAM_STRUCTURE[mainTeam]) {
        TEAM_STRUCTURE[mainTeam].forEach(sub => {
            const opt = document.createElement('option'); opt.value = sub; opt.textContent = sub;
            subSelect.appendChild(opt);
        });
    }
}

function renderModalPhotos() {
    const grid = document.getElementById('m-photo-grid');
    const countEl = document.getElementById('m-photo-count');
    if (!grid) return;
    if (countEl) countEl.textContent = AppState.photos.length;
    if (AppState.photos.length > 0) {
        grid.innerHTML = AppState.photos.map((p, i) => `<div class="photo-thumb"><img src="${p}" onclick="window.openLightbox('${p}')"><button type="button" onclick="window.removeModalPhoto(${i})">✕</button></div>`).join('');
    } else {
        grid.innerHTML = `<div style="font-size: 12px; color: var(--danger); padding: 8px 0;">No photos attached.</div>`;
    }
}

window.removeModalPhoto = function (i) {
    AppState.photos.splice(i, 1);
    renderModalPhotos(); renderPreviews(); updateModalCounter(); updateMiniGalleryThumb(); saveAutoSaveData();
}

window.openDeleteRequest = function (id) { AppState.deleteTargetId = id; document.getElementById('delete-reason-input').value = ''; document.getElementById('delete-confirm-overlay').classList.add('open'); }
window.closeDeleteRequest = function () { AppState.deleteTargetId = null; document.getElementById('delete-confirm-overlay').classList.remove('open'); }

window.executeDeleteRequest = async function () {
    const id = AppState.deleteTargetId;
    const reasonInput = document.getElementById('delete-reason-input');
    const reason = reasonInput.value.trim();

    if (!reason) {
        toast('Please provide a reason for the delete request.', false);
        reasonInput.focus();
        return;
    }

    const btn = document.querySelector('#delete-confirm-overlay .btn-danger');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        await DB.insert('delete_requests', {
            visit_id: id,
            requested_by_email: AppState.userProfile.email || '-',
            requested_by_name: AppState.userProfile.name || 'Unknown',
            reason: reason,
            status: 'pending'
        });

        await DB.update('visitation', `id=eq.${encodeURIComponent(id)}`, {
            req_status: 'pending',
            delete_reason: reason,
            is_deleted: true
        });

        toast('Delete request submitted successfully.');
        window.closeDeleteRequest();
        window.closeDetail();
        window.resetAndFetch();
    } catch (err) {
        console.error(err);
        toast('An error occurred: ' + err.message, false);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

window.clearAllFilters = function () {
    const area = document.getElementById('fl-area');
    const pos  = document.getElementById('fl-pos');
    const search = document.getElementById('fl-search');
    const posOther = document.getElementById('fl-pos-other');
    if (area)   area.value = '';
    if (pos)    pos.value = '';
    if (search) search.value = '';
    if (posOther) { posOther.value = ''; posOther.style.display = 'none'; }
    if (AppState.fpFilterDate) AppState.fpFilterDate.clear();
    resetAndFetch();
};

window.closeDetail = function () { document.getElementById('detail-overlay').classList.remove('open'); }
window.closeSaveConfirm = function () { document.getElementById('save-confirm-overlay').classList.remove('open'); AppState.pendingSaveData = null; }
