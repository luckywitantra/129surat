const API_URL = 'https://script.google.com/macros/s/AKfycbxj7uQSzJJLESto_xbCuQAw1iDEn-1_jNX68MlwLjtnmJqFpTOtsq2eOpBDZjpz648Y/exec';

let currentUser = null;
let currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

document.addEventListener('DOMContentLoaded', () => { initSystem(); });

async function initSystem() {
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'initApp' }) });
        const result = await response.json();
        
        if(result.status === 'success') {
            setTimeout(() => {
                document.getElementById('init-screen').classList.add('hidden');
                document.getElementById('login-screen').classList.remove('hidden');
            }, 800);
        } else {
            showAlert('Error Sistem', result.message, 'error');
            document.getElementById('init-screen').innerHTML = `<h2 class="text-danger">Koneksi Database Gagal</h2><p>Periksa URL API Anda.</p>`;
        }
    } catch (error) {
        setTimeout(() => {
            document.getElementById('init-screen').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
            showAlert('Mode Offline', 'UI berjalan tanpa koneksi backend.', 'info');
        }, 1000);
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    document.getElementById('theme-icon').className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function closeAlert() { document.getElementById('custom-alert').classList.add('hidden'); }

function showAlert(title, message, type) {
    const overlay = document.getElementById('custom-alert');
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    
    const icon = document.getElementById('alert-icon');
    if(type === 'success') icon.innerHTML = '<i class="fa-solid fa-check-circle icon-success"></i>';
    else if(type === 'error') icon.innerHTML = '<i class="fa-solid fa-circle-xmark icon-error"></i>';
    else icon.innerHTML = '<i class="fa-solid fa-circle-info icon-info"></i>';
    overlay.classList.remove('hidden');
}

// ==========================================
// --- NAVIGATION & DYNAMIC FETCHING ---
// ==========================================

function navigate(page) {
    document.getElementById('sidebar').classList.remove('open');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    const views = ['dashboard', 'surat-masuk', 'surat-keluar', 'disposisi', 'sppk', 'pk', 'arsip', 'laporan', 'pengaturan'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if(el) el.classList.add('hidden');
    });
    
    const targetEl = document.getElementById(`view-${page}`);
    if(targetEl) targetEl.classList.remove('hidden');

    // TARIK DATA SESUAI MENU AKTIF
    if (page === 'dashboard') loadDashboardStats();
    else if (['surat-masuk', 'surat-keluar', 'sppk', 'pk', 'disposisi', 'arsip'].includes(page)) {
        loadDataTabel(page);
    }
    
    const titles = {
        'dashboard': 'Dashboard Utama', 'surat-masuk': 'Manajemen Surat Masuk', 'surat-keluar': 'Manajemen Surat Keluar',
        'disposisi': 'Tugas & Disposisi', 'sppk': 'Data SPPK', 'pk': 'Data PK', 'arsip': 'Arsip Dokumen Terpadu',
        'laporan': 'Pusat Laporan', 'pengaturan': 'Konfigurasi Sistem'
    };
    document.getElementById('page-title').innerText = titles[page] || 'Aplikasi';
}

// Tarik Angka Real-Time Dashboard
async function loadDashboardStats() {
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDashboardStats' }) });
        const result = await response.json();
        if (result.status === 'success') {
            document.getElementById('stat-sm').innerText = result.data.sm;
            document.getElementById('stat-sk').innerText = result.data.sk;
            document.getElementById('stat-sppk').innerText = result.data.sppk;
            document.getElementById('stat-pk').innerText = result.data.pk;
        }
    } catch (e) { console.error("Gagal memuat statistik dashboard", e); }
}

async function loadDataTabel(jenis) {
    const tbody = document.getElementById(`tbody-${jenis}`);
    if(!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--primary); padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Menarik data dari server...</td></tr>`;

    let actionName = '';
    if (jenis === 'surat-masuk') actionName = 'getSuratMasuk';
    else if (jenis === 'surat-keluar') actionName = 'getSuratKeluar';
    else if (jenis === 'sppk') actionName = 'getSPPK';
    else if (jenis === 'pk') actionName = 'getPK';
    else if (jenis === 'disposisi') actionName = 'getDisposisi';
    else if (jenis === 'arsip') actionName = 'getArsip';

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: actionName }) });
        const result = await response.json();

        if (result.status === 'success') renderHTMLTabel(jenis, result.data, tbody);
        else tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">${result.message}</td></tr>`;
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Gagal terhubung ke database.</td></tr>`;
    }
}

function renderHTMLTabel(jenis, dataArray, tbody) {
    if (!dataArray || dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding:20px;">Belum ada data tersedia.</td></tr>`;
        return;
    }

    let html = '';
    dataArray.reverse().forEach(item => {
        // Status Badge Logic
        let s = (item.status || "").toLowerCase();
        let badge = 'warning';
        if(s.includes('selesai') || s.includes('terkirim') || s.includes('sudah') || s.includes('aktif')) badge = 'success';
        if(s.includes('belum')) badge = 'danger';
        let statusBadge = `<span class="badge badge-${badge}">${item.status || '-'}</span>`;

        let fileBtn = item.fileUrl ? `<a href="${item.fileUrl}" target="_blank" class="btn-icon" title="Lihat"><i class="fa-solid fa-file-pdf text-danger"></i></a>` : `<span style="opacity:0.3; font-size:0.8rem;">-No File-</span>`;

        if (jenis === 'surat-masuk') {
            html += `<tr><td><strong>${item.nomor}</strong></td><td>${item.tanggal}</td><td>${item.pengirim}</td><td>${item.perihal}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        } else if (jenis === 'surat-keluar') {
            html += `<tr><td><strong>${item.tujuan}</strong></td><td>${item.tanggal}</td><td>${item.perihal}</td><td>${item.penandatangan}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        } else if (jenis === 'sppk') {
            let rpFormat = "Rp " + parseFloat(item.plafon || 0).toLocaleString('id-ID');
            html += `<tr><td><strong>${item.nomorAplikasi}</strong></td><td>${item.tanggal}</td><td>${item.debitur}</td><td>${rpFormat}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        } else if (jenis === 'pk') {
            let rpFormat = "Rp " + parseFloat(item.plafon || 0).toLocaleString('id-ID');
            html += `<tr><td><strong>${item.nomorPK || 'DRAFT-PK'}</strong></td><td>${item.sppkInduk}</td><td>${item.tanggal}</td><td>${item.debitur}</td><td>${rpFormat}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        } else if (jenis === 'disposisi') {
            html += `<tr><td><strong>${item.suratSumber}</strong></td><td>${item.dari}</td><td>${item.instruksi}</td><td>${item.batas}</td><td>${statusBadge}</td><td><button class="btn btn-primary-light btn-sm">Follow Up</button></td></tr>`;
        } else if (jenis === 'arsip') {
            let catBadge = `<span class="badge badge-primary">${item.kategori}</span>`;
            html += `<tr><td>${catBadge}</td><td><strong>${item.nomor || '-'}</strong></td><td>${item.tanggal}</td><td>${item.deskripsi}</td><td>${fileBtn}</td></tr>`;
        }
    });
    tbody.innerHTML = html;
}

// --- Modals & Forms ---
function openModal(modalId) { document.getElementById(modalId).classList.remove('hidden'); }
function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }

const getBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({ mimeType: file.type, filename: file.name, base64Data: reader.result.split(',')[1] });
    reader.onerror = e => reject(e);
});

async function sendFormData(action, payload, formEl, modalId, jenisMenuRef) {
    const btn = formEl.querySelector('button[type="submit"]');
    const originalBtnHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: action, payload: payload }) });
        const result = await response.json();

        if (result.status === 'success') {
            closeModal(modalId);
            showAlert('Berhasil', result.message, 'success');
            formEl.reset(); 
            if(jenisMenuRef) loadDataTabel(jenisMenuRef);
            loadDashboardStats(); // update dashboard otomatis tiap ada form disubmit
        } else {
            showAlert('Gagal', result.message, 'error');
        }
    } catch (error) {
        showAlert('Koneksi Gagal', 'Gagal mengirim data. Periksa jaringan Anda.', 'error');
    } finally {
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
    }
}

// Form Handlers
async function submitSuratMasuk(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; sendFormData('insertSuratMasuk', { nomorSurat: f.elements['nomorSurat'].value, tanggalSurat: f.elements['tanggalSurat'].value, pengirim: f.elements['pengirim'].value, sifatSurat: f.elements['sifatSurat'].value, perihal: f.elements['perihal'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-masuk', 'surat-masuk'); }
async function submitSuratKeluar(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; sendFormData('insertSuratKeluar', { jenisSurat: f.elements['jenisSurat'].value, tujuan: f.elements['tujuan'].value, perihal: f.elements['perihal'].value, penandatangan: f.elements['penandatangan'].value, sifat: f.elements['sifat'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-keluar', 'surat-keluar'); }
async function submitSPPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; sendFormData('insertSPPK', { nomorAplikasi: f.elements['nomorAplikasi'].value, tanggalSPPK: f.elements['tanggalSPPK'].value, namaDebitur: f.elements['namaDebitur'].value, jenisKredit: f.elements['jenisKredit'].value, plafon: f.elements['plafon'].value, jangkaWaktu: f.elements['jangkaWaktu'].value, tujuanKredit: f.elements['tujuanKredit'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-sppk', 'sppk'); }
async function submitDisposisi(e) { e.preventDefault(); const f = e.target; sendFormData('insertDisposisi', { suratSumber: f.elements['suratSumber'].value, kepada: f.elements['kepada'].value, instruksi: f.elements['instruksi'].value, batasWaktu: f.elements['batasWaktu'].value, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-disposisi', 'disposisi'); }
async function submitPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; sendFormData('insertPK', { nomorSPPK: f.elements['nomorSPPK'].value, tanggalPK: f.elements['tanggalPK'].value, namaDebitur: f.elements['namaDebitur'].value, plafon: f.elements['plafon'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-pk', 'pk'); }

// Login & Logout
function handleLogin(e) {
    e.preventDefault();
    currentUser = { username: document.getElementById('login-username').value, role: document.getElementById('login-role').value };
    document.getElementById('user-name').innerText = currentUser.username;
    document.getElementById('user-role').innerText = currentUser.role;
    if(currentUser.role !== 'Admin') document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    loadDashboardStats(); // Load stats on login
    showAlert('Selamat Datang', `Login berhasil sebagai ${currentUser.role}`, 'success');
}
function handleLogout() { currentUser = null; document.getElementById('main-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('login-form').reset(); document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex'); }
function copyWhatsAppSummary() { navigator.clipboard.writeText("Laporan SPPK...").then(()=>showAlert('Sukses', 'Disalin!', 'success')); }

window.onload = () => { if (document.getElementById('theme-icon')) document.getElementById('theme-icon').className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; };
