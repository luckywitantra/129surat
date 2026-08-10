// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    });
}

// Konfigurasi URL Apps Script Backend Anda
const API_URL = 'https://script.google.com/macros/s/AKfycbwmERQs7jhb2b9f0sWQTtTdnE_BepV0q2Sb9djIYdi5rJf50RFoV4ai71Q7xodJu75m/exec'; 

document.addEventListener('alpine:init', () => {
    Alpine.data('appData', () => ({
        sidebarOpen: false,
        currentView: 'dashboard',
        openModal: false,
        showToast: false,
        isDark: false,
        isLoading: false,
        isSubmitting: false,
        searchQuery: '',
        
        menuItems: [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie' },
            { id: 'surat_masuk', label: 'Surat Masuk', icon: 'fa-solid fa-inbox' },
            { id: 'surat_keluar', label: 'Surat Keluar', icon: 'fa-solid fa-paper-plane' },
            { id: 'sppk', label: 'SPPK / PK', icon: 'fa-solid fa-file-contract' }
        ],
        
        stats: { suratMasuk: 0, suratKeluar: 0, totalPK: 0 },
        suratMasukData: [],
        formData: { nomor: '', pengirim: '', perihal: '' },
        
        get filteredSuratMasuk() {
            if (this.searchQuery === '') return this.suratMasukData;
            const q = this.searchQuery.toLowerCase();
            return this.suratMasukData.filter(s => 
                (s.nomor && s.nomor.toLowerCase().includes(q)) || 
                (s.perihal && s.perihal.toLowerCase().includes(q)) ||
                (s.pengirim && s.pengirim.toLowerCase().includes(q))
            );
        },

        getMenuLabel() { 
            return (this.menuItems.find(m => m.id === this.currentView) || {}).label || 'Menu'; 
        },

        switchMenu(menuId) {
            this.currentView = menuId;
            if (window.innerWidth < 768) this.sidebarOpen = false;
            
            // Ambil data dari server jika masuk ke menu terkait
            if(menuId === 'dashboard') this.fetchDashboard();
            if(menuId === 'surat_masuk') this.fetchSuratMasuk();
        },

        toggleTheme() { 
            this.isDark = !this.isDark; 
            localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
        },

        // Komunikasi Fetch dengan Google Apps Script API
        async fetchDashboard() {
            if(this.stats.suratMasuk !== 0) return; // cache ringan
            this.isLoading = true;
            try {
                const res = await fetch(`${API_URL}?action=getDashboard`, {
                    method: 'GET',
                    mode: 'cors'
                });
                const data = await res.json();
                this.stats = data;
            } catch (err) {
                console.error("Gagal mengambil data dashboard:", err);
            }
            this.isLoading = false;
        },

        async fetchSuratMasuk() {
            this.isLoading = true;
            try {
                const res = await fetch(`${API_URL}?action=getSuratMasuk`, {
                    method: 'GET',
                    mode: 'cors'
                });
                const data = await res.json();
                this.suratMasukData = data;
            } catch (err) {
                console.error("Gagal mengambil data surat:", err);
            }
            this.isLoading = false;
        },

        async submitForm() {
            this.isSubmitting = true;
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow', // Wajib untuk Google Apps Script (menangani 302 redirect)
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Wajib text/plain agar tidak memicu Preflight CORS yang ketat
                    body: JSON.stringify({ action: 'saveSuratMasuk', data: this.formData })
                });
                
                const result = await res.json();
                
                if(result.success) {
                    this.openModal = false;
                    this.formData = { nomor: '', pengirim: '', perihal: '' }; // reset
                    this.fetchSuratMasuk(); // Refresh tabel
                    alert("Data berhasil disimpan!");
                } else {
                    alert("Gagal menyimpan: " + (result.error || "Unknown error"));
                }
            } catch (err) {
                console.error(err);
                alert("Terjadi kesalahan koneksi saat menyimpan data.");
            }
            this.isSubmitting = false;
        },

        init() {
            // Cek preferensi tema lokal
            if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                this.isDark = true;
            }
            // Load dashboard awal
            this.fetchDashboard();
        }
    }));
});
