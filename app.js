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
        // Fallback untuk keperluan demo UI jika API belum di-deploy:
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

// --- Navigation & Routing Dinamis ---
function navigate(page) {
    document.getElementById('sidebar').classList.remove('open');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Daftar semua view yang tersedia
    const views = ['dashboard', 'surat-masuk', 'surat-keluar', 'disposisi', 'sppk', 'pk', 'arsip', 'laporan', 'pengaturan'];
    
    // Sembunyikan semua view
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if(el) el.classList.add('hidden');
    });
    
    // Tampilkan view target
    const targetEl = document.getElementById(`view-${page}`);
    if(targetEl) {
        targetEl.classList.remove('hidden');
    } else {
        document.getElementById('view-blank').classList.remove('hidden');
    }
    
    // Ubah Judul Halaman
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
    
    // Kembalikan visibilitas menu admin
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

// Helper: Convert File ke Base64 (Aman dikirim via JSON ke Google Script)
const getBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({
        mimeType: file.type,
        filename: file.name,
        base64Data: reader.result.split(',')[1] // Ambil raw base64 data
    });
    reader.onerror = error => reject(error);
});

// Fungsi universal kirim form
async function sendFormData(action, payload, formEl, modalId) {
    const btn = formEl.querySelector('button[type="submit"]');
    const originalBtnHTML = btn.innerHTML;
    
    // UI Loading di tombol submit
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
            formEl.reset(); // Kosongkan form jika berhasil
        } else {
            showAlert('Gagal', result.message || 'Terjadi kesalahan pada sistem backend.', 'error');
        }
    } catch (error) {
        console.error(error);
        showAlert('Koneksi Gagal', 'Gagal mengirim data. Periksa jaringan Anda.', 'error');
    } finally {
        // Kembalikan tombol ke keadaan semula
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
    }
}

// Handler Submit Surat Masuk
async function submitSuratMasuk(e) {
    e.preventDefault();
    const form = e.target;
    
    // Periksa apakah user mengupload file atau tidak (Opsional)
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
    sendFormData('insertSuratMasuk', payload, form, 'modal-surat-masuk');
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
    sendFormData('insertSuratKeluar', payload, form, 'modal-surat-keluar');
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
    sendFormData('insertSPPK', payload, form, 'modal-sppk');
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error(err));
}

window.onload = () => {
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
};
