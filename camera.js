// ============================================================
// WATERMARK MODULE
// ============================================================
function applyWatermark(canvas, ctx) {
    const outletInput = document.getElementById('f-outlet-name');
    const outletName = (outletInput && outletInput.value) ? outletInput.value : 'No Outlet Selected';
    const empName = AppState.userProfile.name || 'Unknown BDE';

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const fontSize = Math.max(12, Math.floor(canvas.width / 70));
    ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const padding = 12;
    const x = canvas.width - padding;
    const y = canvas.height - padding;
    const lineH = fontSize * 1.4;

    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillText(`Date: ${dateStr}`, x, y);
    ctx.fillText(`By: ${empName}`, x, y - lineH);
    ctx.fillText(`Outlet: ${outletName}`, x, y - (lineH * 2));

    ctx.shadowColor = 'transparent';
}

// ============================================================
// CAMERA & MEDIA MODULE
// ============================================================
window.toggleCamera = async function () {
    if (AppState.isCameraLoading) return;
    AppState.currentFacingMode = AppState.currentFacingMode === 'environment' ? 'user' : 'environment';
    if (AppState.cameraStream) {
        AppState.cameraStream.getTracks().forEach(t => t.stop());
        AppState.cameraStream = null;
    }
    await window.startCamera();
}

window.startCamera = async function () {
    if (AppState.isCameraLoading) return;
    AppState.isCameraLoading = true;
    const btn = document.getElementById('btn-start-cam');
    if (btn) btn.disabled = true;

    const video = document.getElementById('camera-view');
    const modal = document.getElementById('camera-modal');
    updateMiniGalleryThumb();

    try {
        if (AppState.cameraStream) AppState.cameraStream.getTracks().forEach(t => t.stop());
        AppState.cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: AppState.currentFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        video.srcObject = AppState.cameraStream;
        video.style.transform = AppState.currentFacingMode === 'user' ? 'scaleX(-1)' : 'none';
        modal.classList.add('open');
        updateModalCounter();
    } catch (err1) {
        try {
            AppState.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = AppState.cameraStream;
            video.style.transform = 'none';
            modal.classList.add('open');
            updateModalCounter();
        } catch (err2) { toast('Cannot access camera.', false); }
    } finally {
        AppState.isCameraLoading = false;
        if (btn) btn.disabled = false;
    }
}

window.stopCamera = function () {
    if (AppState.cameraStream) { AppState.cameraStream.getTracks().forEach(t => t.stop()); AppState.cameraStream = null; }
    document.getElementById('camera-modal').classList.remove('open');
    closeCameraGallery();
}

window.capturePhoto = function () {
    if (AppState.photos.length >= CONFIG.MAX_PHOTOS) { toast(`Max ${CONFIG.MAX_PHOTOS} photos allowed.`, false); return; }
    const video = document.getElementById('camera-view');
    const canvas = document.getElementById('camera-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    if (AppState.currentFacingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (AppState.currentFacingMode === 'user') { ctx.setTransform(1, 0, 0, 1, 0, 0); }

    applyWatermark(canvas, ctx);

    AppState.photos.push(canvas.toDataURL('image/jpeg', 0.7));
    video.style.opacity = '0.3';
    setTimeout(() => { video.style.opacity = '1'; }, 150);

    updateModalCounter(); renderPreviews(); updateMiniGalleryThumb(); saveAutoSaveData();
    if (document.getElementById('m-photo-grid')) renderModalPhotos();
    if (AppState.photos.length >= CONFIG.MAX_PHOTOS) { toast(`Reached ${CONFIG.MAX_PHOTOS} photos maximum.`); setTimeout(window.stopCamera, 500); }
}

window.selectFromLibrary = function () {
    if (!CONFIG.ALLOW_LIBRARY_UPLOAD) { toast('Photo capture only.', false); return; }
    document.getElementById('library-input').click();
}

function compressImage(file, maxWidth = 1280, maxHeight = 1280, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                if (width > height) { if (width > maxWidth) { height = Math.round((height *= maxWidth / width)); width = maxWidth; } }
                else { if (height > maxHeight) { width = Math.round((width *= maxHeight / height)); height = maxHeight; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                applyWatermark(canvas, ctx);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

window.handleLibrarySelection = async function (input) {
    if (!input.files || !input.files.length) return;
    const availableSlots = CONFIG.MAX_PHOTOS - AppState.photos.length;
    if (availableSlots <= 0) { toast(`Photo limit reached.`, false); input.value = ''; return; }

    const filesToUpload = Array.from(input.files).slice(0, availableSlots);
    toast('Processing images...', true);

    for (const file of filesToUpload) {
        if (!file.type.startsWith('image/')) continue;
        try { AppState.photos.push(await compressImage(file, 1280, 1280, 0.7)); } catch (e) { console.error("image processing failed:", e); }
    }
    input.value = '';
    renderPreviews(); updateModalCounter(); saveAutoSaveData();
    if (document.getElementById('m-photo-grid')) renderModalPhotos();
}

// ============================================================
// PHOTO GALLERY UI
// ============================================================
function updateModalCounter() { const el = document.getElementById('modal-photo-counter'); if (el) el.textContent = `${AppState.photos.length} / ${CONFIG.MAX_PHOTOS}`; }

function updateMiniGalleryThumb() {
    const recentThumb = document.getElementById('camera-recent-thumb');
    if (!recentThumb) return;
    if (AppState.photos.length > 0) { recentThumb.style.backgroundImage = `url(${AppState.photos[AppState.photos.length - 1]})`; recentThumb.style.opacity = '1'; }
    else { recentThumb.style.opacity = '0'; }
}

window.openCameraGallery = function () {
    if (AppState.photos.length === 0) return;
    document.getElementById('camera-header').style.display = 'none';
    document.getElementById('camera-body').style.display = 'none';
    document.getElementById('camera-footer').style.display = 'none';
    document.getElementById('camera-gallery').style.display = 'flex';
    renderCameraGallery();
}

window.closeCameraGallery = function () {
    document.getElementById('camera-header').style.display = 'flex';
    document.getElementById('camera-body').style.display = 'flex';
    document.getElementById('camera-footer').style.display = 'flex';
    document.getElementById('camera-gallery').style.display = 'none';
    updateMiniGalleryThumb();
}

function renderCameraGallery() {
    document.getElementById('cg-grid').innerHTML = AppState.photos.map((p, i) => `<div class="cg-item"><img src="${p}" onclick="window.openLightbox('${p}')"><button class="cg-delete" onclick="window.removePhotoFromGallery(${i})">✕</button></div>`).join('');
}

window.removePhotoFromGallery = function (i) {
    AppState.photos.splice(i, 1);
    renderPreviews(); updateModalCounter(); saveAutoSaveData();
    if (AppState.photos.length === 0) window.closeCameraGallery(); else renderCameraGallery();
}

function renderPreviews() {
    document.getElementById('photo-counter').textContent = `${AppState.photos.length} / ${CONFIG.MAX_PHOTOS}`;
    const previewContainer = document.getElementById('previews');
    const capturedSection = document.getElementById('captured-section');
    if (AppState.photos.length > 0) {
        capturedSection.style.display = 'block';
        previewContainer.innerHTML = AppState.photos.map((p, i) => `<div class="photo-thumb"><img src="${p}" onclick="window.openLightbox('${p}')"><button type="button" onclick="window.removePhoto(${i})">✕</button></div>`).join('');
    } else {
        capturedSection.style.display = 'none'; previewContainer.innerHTML = '';
    }
    updateSaveBtn();
}

window.removePhoto = function (i) { AppState.photos.splice(i, 1); renderPreviews(); updateModalCounter(); updateMiniGalleryThumb(); saveAutoSaveData(); }
function renderThumbStrip(ph) { if (!ph || !ph.length) return ''; return `<div class="vc-thumbs">${ph.slice(0, 5).map(p => `<div class="vc-thumb"><img src="${p}"></div>`).join('')}${ph.length > 5 ? `<div class="vc-thumb">+${ph.length - 5}</div>` : ''}</div>`; }
