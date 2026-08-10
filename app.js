// Ganti URL dengan URL Web App Anda
const API_URL = 'https://script.google.com/macros/s/AKfycbwmERQs7jhb2b9f0sWQTtTdnE_BepV0q2Sb9djIYdi5rJf50RFoV4ai71Q7xodJu75m/exec'; 

document.addEventListener('alpine:init', () => {
    Alpine.data('appData', () => ({
        sidebarOpen: false,
        currentView: 'dashboard',
        isLoading: false,
        isSubmitting: false,
        
        menuItems: [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-border-all' },
            { id: 'input_surat', label: 'Surat Masuk', icon: 'fa-solid fa-envelope' },
            { id: 'analytics', label: 'Analytics', icon: 'fa-solid fa-chart-simple' },
            { id: 'loans', label: 'Loans (SPPK/PK)', icon: 'fa-solid fa-money-check-dollar' },
            { id: 'clients', label: 'Clients', icon: 'fa-solid fa-user-group' },
            { id: 'settings', label: 'Settings', icon: 'fa-solid fa-gear' }
        ],
        
        stats: { suratMasuk: 0, suratKeluar: 0, totalPK: 0 },
        loansData: [], // Array untuk data SPPK / PK
        formData: { nomor: '', tanggal: '', pengirim: '', perihal: '' },

        getMenuLabel() { return (this.menuItems.find(m => m.id === this.currentView) || {}).label || 'Menu'; },

        switchMenu(menuId) {
            this.currentView = menuId;
            if (window.innerWidth < 768) this.sidebarOpen = false;
            
            if(menuId === 'dashboard') {
                this.fetchDashboard();
                setTimeout(() => this.renderChart(), 100);
            }
            if(menuId === 'loans') this.fetchLoans();
        },

        async fetchDashboard() {
            this.isLoading = true;
            try {
                const res = await fetch(`${API_URL}?action=getDashboard`, { method: 'GET', mode: 'cors' });
                const data = await res.json();
                this.stats = data;
            } catch (err) { console.error("Gagal get dashboard:", err); }
            this.isLoading = false;
        },

        async fetchLoans() {
            this.isLoading = true;
            try {
                const res = await fetch(`${API_URL}?action=getLoans`, { method: 'GET', mode: 'cors' });
                const data = await res.json();
                
                // Tambahkan inisial huruf pertama nama debitur untuk avatar di UI
                this.loansData = data.map(item => ({
                    ...item,
                    inisial: item.debitur ? item.debitur.charAt(0).toUpperCase() : '?'
                }));
            } catch (err) { console.error("Gagal get loans:", err); }
            this.isLoading = false;
        },

        async submitForm() {
            this.isSubmitting = true;
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'saveSuratMasuk', data: this.formData })
                });
                
                const result = await res.json();
                if(result.success) {
                    alert("Berhasil! Data surat tersimpan ke database.");
                    this.formData = { nomor: '', tanggal: '', pengirim: '', perihal: '' };
                    this.currentView = 'dashboard';
                    this.fetchDashboard(); // Refresh stats
                } else {
                    alert("Gagal menyimpan: " + result.error);
                }
            } catch (err) {
                console.error(err);
                alert("Terjadi kesalahan jaringan.");
            }
            this.isSubmitting = false;
        },

        renderChart() {
            const ctx = document.getElementById('mainChart');
            if (!ctx) return;
            let chartStatus = Chart.getChart("mainChart");
            if (chartStatus != undefined) chartStatus.destroy();

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                    datasets: [
                        { label: 'Masuk', data: [45, 60, 30, 75, 70], backgroundColor: '#2563eb', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.8 },
                        { label: 'Keluar', data: [25, 35, 50, 55, 25], backgroundColor: '#2b8a72', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.8 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, border: {display: false}, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
            });
        },

        init() {
            this.fetchDashboard();
            setTimeout(() => this.renderChart(), 300);
        }
    }));
});

// PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(err => {}));
}
