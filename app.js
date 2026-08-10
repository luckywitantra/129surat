const API_URL = 'https://script.google.com/macros/s/AKfycbxj7uQSzJJLESto_xbCuQAw1iDEn-1_jNX68MlwLjtnmJqFpTOtsq2eOpBDZjpz648Y/exec';

let currentUser = null;
let currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

// --- Inisialisasi Aplikasi (Auto-Setup Database) ---
document.addEventListener('DOMContentLoaded', () => {
    initSystem();
});

async function initSystem() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'initApp' }) 
        });

        const result = await response.json();
        
        if(result.status === 'success') {
            setTimeout(() => {
                document.getElementById('init-screen').classList.add('hidden');
                document.getElementById('login-screen').classList.remove('hidden');
            }, 800);
        } else {
            showAlert('Error Sistem', result.message || 'Gagal menyiapkan database.', 'error');
            document.getElementById('init-screen').innerHTML = `<h2 class="text-danger">Koneksi Database Gagal</h2><p>Periksa URL API Anda.</p>`;
        }
    } catch (error) {
        console.error("Init Error:", error);
        setTimeout(() => {
            document.getElementById('init-screen').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
            showAlert('Mode Offline', 'UI berjalan tanpa koneksi backend.', 'info');
        }, 1000);
    }
}

// --- UI Helpers ---
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    const icon = document.getElementById('theme-icon');
    icon.className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

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

function closeAlert() {
    document.getElementById('custom-alert').classList.add('hidden');
}

// ==========================================
// --- NAVIGATION & DYNAMIC TABLE RENDERING ---
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
    if(targetEl) {
        targetEl.classList.remove('hidden');
    } else {
        document.getElementById('view-blank').classList.remove('hidden');
    }

    // TARIK DATA OTOMATIS KETIKA MENU DIKLIK
    if (page === 'surat-masuk' || page === 'surat-keluar' || page === 'sppk') {
        loadDataTabel(page);
    }
    
    const titles = {
        'dashboard': 'Dashboard Utama',
        'surat-masuk': 'Manajemen Surat Masuk',
        'surat-keluar': 'Manajemen Surat Keluar',
        'disposisi': 'Tugas & Disposisi',
        'sppk': 'Data SPPK',
        'pk': 'Data PK',
        'arsip': 'Arsip Dokumen Terpadu',
        'laporan': 'Pusat Laporan',
        'pengaturan': 'Konfigurasi Sistem'
    };
    document.getElementById('page-title').innerText = titles[page] || 'Aplikasi';
}

// Fungsi Fetch Data ke API Google Script
async function loadDataTabel(jenis) {
    const tbody = document.getElementById(`tbody-${jenis}`);
    if(!tbody) return;

    // Loading State
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--primary); padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Menarik data dari server...</td></tr>`;

    let actionName = '';
    if (jenis === 'surat-masuk') actionName = 'getSuratMasuk';
    else if (jenis === 'surat-keluar') actionName = 'getSuratKeluar';
    else if (jenis === 'sppk') actionName = 'getSPPK';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: actionName })
        });
        const result = await response.json();

        if (result.status === 'success') {
            renderHTMLTabel(jenis, result.data, tbody);
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">Gagal terhubung ke database. Periksa CORS atau Deployment Apps Script.</td></tr>`;
    }
}

// Fungsi Cetak HTML ke Tabel
function renderHTMLTabel(jenis, dataArray, tbody) {
    if (!dataArray || dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding:20px;">Belum ada data tersedia.</td></tr>`;
        return;
    }

    let html = '';
    // Reverse array agar data terbaru (paling bawah di sheet) tampil di atas
    dataArray.reverse().forEach(item => {
        let statusBadge = `<span class="badge badge-warning">${item.status}</span>`;
        if (item.status.toLowerCase().includes('selesai') || item.status.toLowerCase().includes('terkirim') || item.status.toLowerCase().includes('sudah')) {
            statusBadge = `<span class="badge badge-success">${item.status}</span>`;
        }

        // Tampilkan ikon PDF merah jika ada URL Lampiran
        let fileBtn = item.fileUrl ? `<a href="${item.fileUrl}" target="_blank" class="btn-icon" title="Lihat Lampiran"><i class="fa-solid fa-file-pdf text-danger"></i></a>` : `<span style="opacity:0.3; font-size:0.8rem;">-No File-</span>`;

        if (jenis === 'surat-masuk') {
            html += `<tr>
                <td><strong>${item.nomor}</strong></td>
                <td>${item.tanggal}</td>
                <td>${item.pengirim}</td>
                <td>${item.perihal}</td>
                <td>${statusBadge}</td>
                <td>${fileBtn}</td>
            </tr>`;
        } 
        else if (jenis === 'surat-keluar') {
            html += `<tr>
                <td><strong>${item.tujuan}</strong></td>
                <td>${item.tanggal}</td>
                <td>${item.perihal}</td>
                <td>${item.penandatangan}</td>
                <td>${statusBadge}</td>
                <td>${fileBtn}</td>
            </tr>`;
        } 
        else if (jenis === 'sppk') {
            let rpFormat = "Rp " + parseFloat(item.plafon || 0).toLocaleString('id-ID');
            html += `<tr>
                <td><strong>${item.nomorAplikasi}</strong></td>
                <td>${item.tanggal}</td>
                <td>${item.debitur}</td>
                <td>${rpFormat}</td>
                <td>${statusBadge}</td>
                <td>${fileBtn}</td>
            </tr>`;
        }
    });

    tbody.innerHTML = html;
}

// --- Authentication ---
function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const role = document.getElementById('login-role').value;
    
    if(!user) return showAlert('Error', 'Username tidak boleh kosong', 'error');
    
    currentUser = { username: user, role: role };
    document.getElementById('user-name').innerText = user;
    document.getElementById('user-role').innerText = role;
    
    if(role !== 'Admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    
    showAlert('Selamat Datang', `Login berhasil sebagai ${role}`, 'success');
}

function handleLogout() {
    currentUser = null;
    document.getElementById('main-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-form').reset();
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
}

function copyWhatsAppSummary() {
    const text = `*Ringkasan Laporan SPPK & PK*\nPeriode: Agustus 2026\nTotal SPPK: 45\nTotal PK: 42\nTotal Plafon: Rp 5.000.000.000\n\n_Auto-generated by Sistem Manajemen Surat_`;
    navigator.clipboard.writeText(text).then(() => {
        showAlert('Sukses', 'Ringkasan laporan disalin ke clipboard! Siap di-paste ke WhatsApp.', 'success');
    }).catch(() => {
        showAlert('Error', 'Gagal menyalin ke clipboard', 'error');
    });
}

// ==========================================
// --- Modal Form Handlers & API Integrasi ---
// ==========================================

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

const getBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({
        mimeType: file.type,
        filename: file.name,
        base64Data: reader.result.split(',')[1] 
    });
    reader.onerror = error => reject(error);
});

async function sendFormData(action, payload, formEl, modalId, jenisMenuRef) {
    const btn = formEl.querySelector('button[type="submit"]');
    const originalBtnHTML = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: action, payload: payload })
        });
        const result = await response.json();

        if (result.status === 'success') {
            closeModal(modalId);
            showAlert('Berhasil', result.message || 'Data berhasil disimpan.', 'success');
            formEl.reset(); 
            
            // REFRESH TABEL SECARA LIVE SETELAH SIMPAN
            if(jenisMenuRef) loadDataTabel(jenisMenuRef);
            
        } else {
            showAlert('Gagal', result.message || 'Terjadi kesalahan pada sistem backend.', 'error');
        }
    } catch (error) {
        console.error(error);
        showAlert('Koneksi Gagal', 'Gagal mengirim data. Periksa jaringan Anda.', 'error');
    } finally {
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
    }
}

// Handler Submit Surat Masuk
async function submitSuratMasuk(e) {
    e.preventDefault();
    const form = e.target;
    
    const fileInput = form.elements['fileUpload'];
    const fileData = (fileInput && fileInput.files.length > 0) ? await getBase64(fileInput.files[0]) : null;
    
    const payload = {
        nomorSurat: form.elements['nomorSurat'].value,
        tanggalSurat: form.elements['tanggalSurat'].value,
        pengirim: form.elements['pengirim'].value,
        sifatSurat: form.elements['sifatSurat'].value,
        perihal: form.elements['perihal'].value,
        file: fileData, 
        user: currentUser ? currentUser.username : 'Unknown'
    };
    sendFormData('insertSuratMasuk', payload, form, 'modal-surat-masuk', 'surat-masuk');
}

// Handler Submit Surat Keluar
async function submitSuratKeluar(e) {
    e.preventDefault();
    const form = e.target;
    
    const fileInput = form.elements['fileUpload'];
    const fileData = (fileInput && fileInput.files.length > 0) ? await getBase64(fileInput.files[0]) : null;
    
    const payload = {
        jenisSurat: form.elements['jenisSurat'].value,
        tujuan: form.elements['tujuan'].value,
        perihal: form.elements['perihal'].value,
        penandatangan: form.elements['penandatangan'].value,
        sifat: form.elements['sifat'].value,
        file: fileData,
        user: currentUser ? currentUser.username : 'Unknown'
    };
    sendFormData('insertSuratKeluar', payload, form, 'modal-surat-keluar', 'surat-keluar');
}

// Handler Submit SPPK
async function submitSPPK(e) {
    e.preventDefault();
    const form = e.target;
    
    const fileInput = form.elements['fileUpload'];
    const fileData = (fileInput && fileInput.files.length > 0) ? await getBase64(fileInput.files[0]) : null;
    
    const payload = {
        nomorAplikasi: form.elements['nomorAplikasi'].value,
        tanggalSPPK: form.elements['tanggalSPPK'].value,
        namaDebitur: form.elements['namaDebitur'].value,
        jenisKredit: form.elements['jenisKredit'].value,
        plafon: form.elements['plafon'].value,
        jangkaWaktu: form.elements['jangkaWaktu'].value,
        tujuanKredit: form.elements['tujuanKredit'].value,
        file: fileData,
        user: currentUser ? currentUser.username : 'Unknown'
    };
    sendFormData('insertSPPK', payload, form, 'modal-sppk', 'sppk');
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error(err));
}

window.onload = () => {
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
};
