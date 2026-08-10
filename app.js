// Konfigurasi API Google Apps Script 
// PENTING: Ganti dengan URL Web App Deployment Anda yang baru
const API_URL = 'https://script.google.com/macros/s/AKfycbwmERQs7jhb2b9f0sWQTtTdnE_BepV0q2Sb9djIYdi5rJf50RFoV4ai71Q7xodJu75m/exec';

let currentUser = null;
let currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

// --- Inisialisasi Aplikasi (Auto-Setup Database) ---
document.addEventListener('DOMContentLoaded', () => {
    initSystem();
});

async function initSystem() {
    try {
        // Fetch menggunakan method POST tanpa 'Content-Type: application/json' header 
        // untuk menghindari CORS preflight block dari browser ke Google Script.
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'initApp' }) 
        });

        const result = await response.json();
        
        if(result.status === 'success') {
            console.log('Database Initialized:', result.data);
            
            // Transisi dari layar Loading ke Login
            setTimeout(() => {
                document.getElementById('init-screen').classList.add('hidden');
                document.getElementById('login-screen').classList.remove('hidden');
            }, 800); // delay estetika
        } else {
            showAlert('Error Sistem', result.message || 'Gagal menyiapkan database.', 'error');
            document.getElementById('init-screen').innerHTML = `<h2 class="text-danger">Koneksi Database Gagal</h2><p>Periksa URL API Anda.</p>`;
        }
    } catch (error) {
        console.error("Init Error:", error);
        showAlert('Koneksi Gagal', 'Tidak dapat terhubung ke server backend.', 'error');
        document.getElementById('init-screen').innerHTML = `<h2 class="text-danger">Gagal Memuat</h2><p>Pastikan API URL sudah benar dan server aktif.</p>`;
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

// --- Navigation & Routing ---
function navigate(page) {
    document.getElementById('sidebar').classList.remove('open');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    
    const titleEl = document.getElementById('page-title');
    if (page === 'dashboard') {
        document.getElementById('view-dashboard').classList.remove('hidden');
        titleEl.innerText = 'Dashboard';
    } else if (page === 'sppk') {
        document.getElementById('view-sppk').classList.remove('hidden');
        titleEl.innerText = 'Data SPPK';
    } else {
        document.getElementById('view-blank').classList.remove('hidden');
        titleEl.innerText = page.charAt(0).toUpperCase() + page.slice(1).replace('-', ' ');
    }
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
}

function copyWhatsAppSummary() {
    const text = `*Ringkasan Laporan SPPK & PK*\nPeriode: Agustus 2026\nTotal SPPK: 45\nTotal PK: 42\nTotal Plafon: Rp 5.000.000.000\n\n_Auto-generated by Sistem Manajemen Surat_`;
    navigator.clipboard.writeText(text).then(() => {
        showAlert('Sukses', 'Ringkasan laporan disalin ke clipboard! Siap di-paste ke WhatsApp.', 'success');
    }).catch(() => {
        showAlert('Error', 'Gagal menyalin ke clipboard', 'error');
    });
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error(err));
}

window.onload = () => {
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
};
