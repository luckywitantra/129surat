const API_URL = 'https://script.google.com/macros/s/AKfycbxj7uQSzJJLESto_xbCuQAw1iDEn-1_jNX68MlwLjtnmJqFpTOtsq2eOpBDZjpz648Y/exec';

let currentUser = null; 
let currentPage = {};
let currentTheme = localStorage.getItem('theme') || 'light';
let storeData = { 'surat-masuk': [], 'surat-keluar': [], 'sppk': [], 'pk': [], 'arsip': [], 'cabang': [], 'disposisi': [] };
let globalDataJenisSurat = []; 
let globalDataUser = []; 
let globalDataRefPK = [];

document.documentElement.setAttribute('data-theme', currentTheme);

// ========================================================
// --- UTILITY: FORMAT RUPIAH & AUTO UPPERCASE ---
// ========================================================
const formatRupiah = (angka) => {
    if (!angka) return '';
    let number_string = angka.toString().replace(/[^,\d]/g, '');
    let split = number_string.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    if (ribuan) { let separator = sisa ? '.' : ''; rupiah += separator + ribuan.join('.'); }
    rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    return 'Rp ' + rupiah;
};

const cleanNominal = (val) => { return val ? val.replace(/[^0-9]/g, '') : ''; };

// 1. Auto Uppercase untuk semua input tipe teks dan password
document.addEventListener('input', function(e) {
    if (e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'password')) {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(start, end);
    }
});

document.addEventListener('DOMContentLoaded', () => { 
    initSystem(); 
    // Inisialisasi input Rupiah
    const plafonInputs = ['sm-plafon', 'sppk-plafon', 'pk-plafon'];
    plafonInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.type = 'text'; 
            el.setAttribute('inputmode', 'numeric');
            el.addEventListener('input', function(e) { e.target.value = formatRupiah(e.target.value); });
        }
    });
});

async function initSystem() {
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'initApp' }) });
        const result = await response.json();
        if(result.status === 'success') { 
            await loadConfig(); 
            setTimeout(() => { 
                document.getElementById('init-screen').classList.add('hidden'); 
                document.getElementById('login-screen').classList.remove('hidden'); 
            }, 800); 
        } else showAlert('Error Sistem', result.message, 'error');
    } catch (error) { 
        setTimeout(() => { document.getElementById('init-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); showAlert('Mode Offline', 'UI berjalan tanpa koneksi backend.', 'info'); }, 1000); 
    }
}

function toggleTheme() { 
    currentTheme = currentTheme === 'light' ? 'dark' : 'light'; 
    document.documentElement.setAttribute('data-theme', currentTheme); 
    localStorage.setItem('theme', currentTheme); 
    localStorage.setItem('theme_manually_set', 'true'); 
    document.getElementById('theme-icon').className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; 
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function closeAlert() { document.getElementById('custom-alert').classList.add('hidden'); }
function openModal(modalId) { document.getElementById(modalId).classList.remove('hidden'); }
function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }
function showAlert(title, message, type) {
    document.getElementById('alert-title').innerText = title; document.getElementById('alert-message').innerText = message;
    const icon = document.getElementById('alert-icon');
    if(type === 'success') icon.innerHTML = '<i class="fa-solid fa-check-circle text-success"></i>'; 
    else if(type === 'error') icon.innerHTML = '<i class="fa-solid fa-circle-xmark text-danger"></i>'; 
    else icon.innerHTML = '<i class="fa-solid fa-circle-info text-info"></i>';
    document.getElementById('custom-alert').classList.remove('hidden');
}

function toggleD1Fields() {
    const jenis = document.getElementById('select-jenis-sm').value;
    const normal = document.getElementById('sm-normal-fields'), d1 = document.getElementById('sm-d1-fields');
    if(jenis === 'D1') {
        normal.classList.add('hidden'); d1.classList.remove('hidden');
        document.getElementById('sm-pengirim').required = false; document.getElementById('sm-perihal').required = false;
        document.getElementById('sm-nama-debitur').required = true; document.getElementById('sm-plafon').required = true; document.getElementById('sm-jangkawaktu').required = true;
    } else {
        normal.classList.remove('hidden'); d1.classList.add('hidden');
        document.getElementById('sm-pengirim').required = true; document.getElementById('sm-perihal').required = true;
        document.getElementById('sm-nama-debitur').required = false; document.getElementById('sm-plafon').required = false; document.getElementById('sm-jangkawaktu').required = false;
    }
}

function navigate(page) {
    document.getElementById('sidebar').classList.remove('open'); document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); event.currentTarget.classList.add('active');
    ['dashboard', 'surat-masuk', 'surat-keluar', 'disposisi', 'sppk', 'pk', 'arsip', 'laporan', 'pengaturan'].forEach(v => { const el = document.getElementById(`view-${v}`); if(el) el.classList.add('hidden'); });
    const targetEl = document.getElementById(`view-${page}`); if(targetEl) targetEl.classList.remove('hidden');

    if (page === 'dashboard') loadDashboardStats();
    else if (page === 'pengaturan') { loadDataTabel('cabang'); loadDataTabel('referensi-pk'); loadDataTabel('jenis-surat'); loadDataTabel('user'); loadConfig(); }
    else if (['surat-masuk', 'surat-keluar', 'disposisi', 'sppk', 'pk', 'arsip'].includes(page)) { buildFilterUI(page); loadDataTabel(page); }
    
    const titles = { 'dashboard': 'Dashboard', 'surat-masuk': 'Surat Masuk', 'surat-keluar': 'Surat Keluar', 'disposisi': 'Disposisi Tugas', 'sppk': 'Data SPPK', 'pk': 'Data PK', 'arsip': 'Arsip Dokumen', 'laporan': 'Pusat Laporan', 'pengaturan': 'Pengaturan Sistem' }; document.getElementById('page-title').innerText = titles[page] || 'Aplikasi';
}

async function loadDashboardStats() {
    try { 
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDashboardStats' }) }); 
        const result = await response.json(); 
        if (result.status === 'success') { 
            const data = result.data;
            document.getElementById('stat-sm').innerText = data.sm; document.getElementById('stat-sk').innerText = data.sk; document.getElementById('stat-sppk').innerText = data.sppk; document.getElementById('stat-pk').innerText = data.pk; 

            const pendingList = document.getElementById('dash-pending-list');
            if (data.pending && data.pending.length > 0) {
                let pHtml = '';
                data.pending.forEach(p => {
                    let icon = p.type === 'D1' ? '<i class="fa-solid fa-user-clock text-warning"></i>' : '<i class="fa-solid fa-file-signature text-danger"></i>';
                    let bg = p.type === 'D1' ? 'var(--warning-light)' : 'var(--danger-light)';
                    pHtml += `<li onclick="handleDashboardAction('${p.type}', '${p.ref}')" title="Klik untuk menindaklanjuti"><div class="activity-icon" style="background:${bg}">${icon}</div><div class="activity-content"><h4>${p.title}</h4><p>${p.desc}</p></div><div class="activity-time">${formatDateShort(p.time)}</div></li>`;
                });
                pendingList.innerHTML = pHtml;
            } else { pendingList.innerHTML = '<li style="padding:30px 20px; justify-content:center; text-align:center;"><div style="color:var(--success);"><i class="fa-solid fa-check-circle fa-2x" style="margin-bottom:10px;"></i><br><strong>Sempurna!</strong><br><small style="color:var(--text-secondary)">Tidak ada dokumen yang mengantri.</small></div></li>'; }

            const recentList = document.getElementById('dash-recent-list');
            if (data.recent && data.recent.length > 0) {
                let rHtml = '';
                data.recent.forEach(r => {
                    let icon = '', bg = '';
                    if(r.type === 'SM') { icon = '<i class="fa-solid fa-inbox text-info"></i>'; bg = 'var(--info-light)'; }
                    else if(r.type === 'SK') { icon = '<i class="fa-solid fa-paper-plane text-success"></i>'; bg = 'var(--success-light)'; }
                    else if(r.type === 'SPPK') { icon = '<i class="fa-solid fa-file-contract text-primary"></i>'; bg = 'var(--primary-light)'; }
                    else if(r.type === 'PK') { icon = '<i class="fa-solid fa-handshake text-orange"></i>'; bg = 'var(--warning-light)'; }
                    rHtml += `<li onclick="handleDashboardAction('${r.type}', '${r.ref}')" title="Lihat detail dokumen"><div class="activity-icon" style="background:${bg}">${icon}</div><div class="activity-content"><h4>${r.title}</h4><p>${r.desc}</p></div><div class="activity-time">${formatDateShort(r.time)}</div></li>`;
                });
                recentList.innerHTML = rHtml;
            } else { recentList.innerHTML = '<li style="padding:20px; justify-content:center; color:var(--text-secondary);">Belum ada aktivitas.</li>'; }
            
            // PUSH NOTIFICATION STAF
            if (currentUser && currentUser.role === 'Staf' && storeData['surat-masuk']) {
                const myTasks = storeData['surat-masuk'].filter(d => d.disposisiKe === currentUser.nama && d.status === 'Didisposisikan');
                const notifBell = document.getElementById('topbar-notif');
                if(myTasks.length > 0) {
                    notifBell.classList.remove('hidden'); document.getElementById('notif-count').innerText = myTasks.length;
                    if(!sessionStorage.getItem('notified_tasks')) { setTimeout(() => { showAlert('Tugas Baru Masuk!', `Anda memiliki ${myTasks.length} surat disposisi baru yang harus segera ditindaklanjuti.`, 'info'); sessionStorage.setItem('notified_tasks', 'true'); }, 1500); }
                } else { notifBell.classList.add('hidden'); }
            }
        } 
    } catch (e) { console.error(e); }
}

function formatDateShort(dateStr) { if(!dateStr) return ''; const d = new Date(dateStr); return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`; }

function handleDashboardAction(type, ref) {
    if (type === 'D1') {
        navigate('sppk'); setTimeout(() => { openModalSPPK(); const selectD1 = document.getElementById('sppk-sumber-d1'); if(selectD1) { selectD1.value = ref; selectD1.dispatchEvent(new Event('change')); } }, 800);
    } else if (type === 'SPPK') {
        navigate('pk'); setTimeout(() => { openModalPK(); const selectSPPK = document.getElementById('select-sppk-induk'); if(selectSPPK) { selectSPPK.value = ref; selectSPPK.dispatchEvent(new Event('change')); } }, 800);
    } else {
        let targetMap = { 'SM': 'surat-masuk', 'SK': 'surat-keluar', 'SPPK': 'sppk', 'PK': 'pk' };
        if (targetMap[type]) { navigate(targetMap[type]); setTimeout(() => { const searchBox = document.getElementById(`search-${targetMap[type]}`); if(searchBox) { searchBox.value = ref; applyFilter(targetMap[type], 1); } }, 600); }
    }
}

async function loadConfig() {
    try { 
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getConfig' }) }); 
        const result = await response.json(); 
        if (result.status === 'success') { 
            const formPenomoran = document.getElementById('form-config'), formIdentitas = document.getElementById('form-config-identitas'); 
            for(let key in result.data) { 
                if(formPenomoran.elements[key]) formPenomoran.elements[key].value = result.data[key]; 
                if(formIdentitas.elements[key] && formIdentitas.elements[key].type !== 'file') formIdentitas.elements[key].value = result.data[key]; 
            }
            
            // Tampilkan Preview Logo yang sudah tersimpan
            if (result.data['AppLogo']) {
                const previewImg = document.getElementById('preview-logo-img');
                if(previewImg) { previewImg.src = result.data['AppLogo']; previewImg.style.display = 'block'; }
            }
            applyIdentitas(result.data);
        } 
    } catch (e) { console.error(e); }
}

// TAMBAHKAN LOGIKA KONVERSI LINK GAMBAR GOOGLE DRIVE
function applyIdentitas(data) {
    const appName = data['AppName'] || 'SuratApp';
    const companyName = data['CompanyName'] || 'Sistem Manajemen Terpadu';
    let appLogo = data['AppLogo'] || 'https://cdn-icons-png.flaticon.com/512/3062/3062634.png';
    
    // LOGIKA ANTI-BLOKIR GOOGLE DRIVE (Ubah uc?export ke thumbnail API)
    if (appLogo.includes('drive.google.com')) {
        const match = appLogo.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            // Memaksa Google mengeluarkan gambar dengan ukuran lebar 500px yang stabil
            appLogo = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w500`;
        }
    }
    
    // Set Sidebar & Login Texts
    if(document.getElementById('sidebar-app-name')) document.getElementById('sidebar-app-name').innerText = appName;
    if(document.getElementById('login-app-name')) document.getElementById('login-app-name').innerText = appName;
    if(document.getElementById('login-company-name')) document.getElementById('login-company-name').innerText = companyName;
    
    // Set Logos
    if(document.getElementById('sidebar-app-logo')) document.getElementById('sidebar-app-logo').src = appLogo;
    if(document.getElementById('login-app-logo')) document.getElementById('login-app-logo').src = appLogo;
    
    // Update Document Title
    document.title = `${appName} - ${companyName}`;
    
    // Cek jika tema belum pernah diset manual oleh user, gunakan DefaultTheme
    if(!localStorage.getItem('theme_manually_set') && data['DefaultTheme']) {
        currentTheme = data['DefaultTheme'];
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (document.getElementById('theme-icon')) {
            document.getElementById('theme-icon').className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }
    }
}

function buildFilterUI(jenis) {
    const container = document.getElementById(`filter-${jenis}`); if(!container) return;
    let extraFilter = '';
    if (jenis === 'surat-masuk' || jenis === 'surat-keluar') extraFilter = `<select id="fil-jenis-surat-${jenis}" class="search-input sel-jenissurat-filter" onchange="applyFilter('${jenis}')"><option value="">Semua Jenis</option></select>`;
    else if (jenis === 'arsip') extraFilter = `<select id="fil-kategori-arsip" class="search-input" onchange="applyFilter('${jenis}')"><option value="">Semua Kategori</option><option value="Surat Masuk">Surat Masuk</option><option value="Surat Keluar">Surat Keluar</option><option value="SPPK">SPPK</option><option value="PK">PK</option></select>`;

    container.innerHTML = `<div class="filter-container"><input type="text" id="search-${jenis}" class="search-input" placeholder="🔍 Cari nama/nomor..." onkeyup="applyFilter('${jenis}')">${extraFilter}<select id="sort-${jenis}" class="search-input" onchange="applyFilter('${jenis}')"><option value="newest">📅 Baru - Lama</option><option value="oldest">📅 Lama - Baru</option><option value="az">🔤 A - Z</option><option value="za">🔤 Z - A</option></select><select id="fil-cabang-${jenis}" class="search-input sel-cabang-filter" onchange="applyFilter('${jenis}')"><option value="">🏢 Semua Cabang</option></select><select id="fil-bulan-${jenis}" class="search-input" onchange="applyFilter('${jenis}')"><option value="">🗓️ Bulan</option><option value="01">Januari</option><option value="02">Februari</option><option value="03">Maret</option><option value="04">April</option><option value="05">Mei</option><option value="06">Juni</option><option value="07">Juli</option><option value="08">Agustus</option><option value="09">September</option><option value="10">Oktober</option><option value="11">November</option><option value="12">Desember</option></select><select id="fil-tahun-${jenis}" class="search-input" onchange="applyFilter('${jenis}')"><option value="">⏳ Tahun</option><option value="2026">2026</option><option value="2027">2027</option></select></div>`;
    populateCabangFilters(); if (jenis === 'surat-masuk' || jenis === 'surat-keluar') populateJenisSuratFilters();
}

function populateJenisSuratFilters() { fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJenisSurat' }) }).then(res => res.json()).then(result => { if(result.status === 'success') { let options = '<option value="">Semua Jenis Surat</option>'; result.data.forEach(j => options += `<option value="${j.kode}">${j.kode} - ${j.nama}</option>`); document.querySelectorAll('.sel-jenissurat-filter').forEach(el => { el.innerHTML = options; }); } }); }
function populateCabangFilters() { let options = '<option value="">Semua Cabang</option>'; storeData['cabang'].forEach(c => options += `<option value="${c.kodeSM}">${c.nama}</option>`); document.querySelectorAll('.sel-cabang-filter').forEach(el => { el.innerHTML = options; }); }

async function loadDataTabel(jenis) {
    const tbody = document.getElementById(`tbody-${jenis}`); if(!tbody) return;
    
    // TAMPILAN SKELETON LOADING (Menggantikan tulisan "Menarik data...")
    let skeletonHtml = '';
    for(let i=0; i<4; i++) {
        skeletonHtml += `
        <tr class="skeleton-tr">
            <td>
                <div class="skeleton-box" style="width: 70%; height: 18px; margin-bottom: 8px;"></div>
                <div class="skeleton-box" style="width: 40%; height: 12px;"></div>
            </td>
            <td class="pc-only"><div class="skeleton-box" style="width: 60%; height: 14px;"></div></td>
            <td class="pc-only"><div class="skeleton-box" style="width: 80%; height: 14px;"></div></td>
            <td class="pc-only"><div class="skeleton-box" style="width: 50%; height: 22px; border-radius: 12px;"></div></td>
            <td><div class="skeleton-box" style="width: 90px; height: 32px; border-radius: 10px; float: right;"></div></td>
        </tr>`;
    }
    tbody.innerHTML = skeletonHtml;

    let act = '';
    if (jenis === 'surat-masuk' || jenis === 'disposisi') act = 'getSuratMasuk'; else if (jenis === 'surat-keluar') act = 'getSuratKeluar'; else if (jenis === 'sppk') act = 'getSPPK'; else if (jenis === 'pk') act = 'getPK'; else if (jenis === 'arsip') act = 'getArsip'; else if (jenis === 'jenis-surat') act = 'getJenisSurat'; else if (jenis === 'user') act = 'getUser'; else if (jenis === 'referensi-pk') act = 'getReferensiPK'; else if (jenis === 'cabang') act = 'getCabang';

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: act }) });
        const result = await response.json();
        if (result.status === 'success') {
            if(['surat-masuk','surat-keluar','sppk','pk','arsip','cabang','disposisi'].includes(jenis)) {
                let targetData = jenis === 'disposisi' ? 'surat-masuk' : jenis;
                storeData[targetData] = result.data;
                if(jenis === 'cabang') populateCabangFilters();
                if(jenis === 'pk') populatePKForm();
                applyFilter(jenis); 
            } else { renderHTMLTabel(jenis, result.data, tbody); }
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger); padding:20px;">Gagal: ${result.message}</td></tr>`;
        }
    } catch (error) { 
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger); padding:20px;">Gagal terhubung ke server.</td></tr>`; 
    }
}

function applyFilter(jenis, page = 1) {
    let targetDataJenis = jenis === 'disposisi' ? 'surat-masuk' : jenis; 
    if(!storeData[targetDataJenis]) return;
    let data = [...storeData[targetDataJenis]]; const tbody = document.getElementById(`tbody-${jenis}`); if(!tbody) return;
    currentPage[jenis] = page;

    if(['surat-masuk','surat-keluar','sppk','pk','arsip', 'disposisi'].includes(jenis)) {
        const searchVal = document.getElementById(`search-${jenis}`) ? document.getElementById(`search-${jenis}`).value.toLowerCase() : '';
        const sortVal = document.getElementById(`sort-${jenis}`) ? document.getElementById(`sort-${jenis}`).value : 'newest';
        const cabVal = document.getElementById(`fil-cabang-${jenis}`) ? document.getElementById(`fil-cabang-${jenis}`).value : '';
        const thnVal = document.getElementById(`fil-tahun-${jenis}`) ? document.getElementById(`fil-tahun-${jenis}`).value : '';
        const blnVal = document.getElementById(`fil-bulan-${jenis}`) ? document.getElementById(`fil-bulan-${jenis}`).value : '';
        const jnsVal = document.getElementById(`fil-jenis-surat-${jenis}`) ? document.getElementById(`fil-jenis-surat-${jenis}`).value : '';
        const katVal = document.getElementById(`fil-kategori-arsip`) ? document.getElementById(`fil-kategori-arsip`).value : '';

        data = data.filter(item => {
            let mTxt = true, mCb = true, mThn = true, mBln = true, mJns = true, mKat = true, mKategori = true;
            let target = (item.nomor||item.nomorSPPK||item.nomorPK||'') + " " + (item.pengirim||item.tujuan||item.debitur||item.deskripsi||'');
            if(searchVal) mTxt = target.toLowerCase().includes(searchVal);
            if(cabVal && item.cabang && jenis !== 'disposisi') mCb = item.cabang.includes(cabVal) || item.cabang === cabVal;
            if(jnsVal && item.jenisSurat && jenis !== 'disposisi') mJns = item.jenisSurat === jnsVal;
            if(katVal && item.kategori && jenis !== 'disposisi') mKat = item.kategori === katVal;
            if(item.tanggal && jenis !== 'disposisi') { const d = new Date(item.tanggal); if(thnVal) mThn = d.getFullYear().toString() === thnVal; if(blnVal) mBln = ("0"+(d.getMonth()+1)).slice(-2) === blnVal; }

            if(jenis === 'disposisi') {
                mKategori = item.jenisSurat !== 'D1';
                if(currentUser && currentUser.role === 'Staf') { mKategori = mKategori && item.disposisiKe === currentUser.nama; }
            }
            return mTxt && mCb && mThn && mBln && mJns && mKat && mKategori;
        });

        data.sort((a, b) => { let da = new Date(a.tanggal), db = new Date(b.tanggal); if(sortVal === 'newest') return db - da; if(sortVal === 'oldest') return da - db; });
    }

    const rowsPerPage = 10;
    const startIndex = (page - 1) * rowsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + rowsPerPage);
    renderHTMLTabel(jenis, paginatedData, tbody);
    if(['surat-masuk','surat-keluar','sppk','pk','arsip','disposisi'].includes(jenis)) { renderPagination(jenis, data.length, page, rowsPerPage); }
}

function renderPagination(jenis, totalItems, page, rowsPerPage) {
    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
    let container = document.getElementById(`pagination-${jenis}`);
    if(!container) { const tableResp = document.getElementById(`tbody-${jenis}`).closest('.table-responsive'); container = document.createElement('div'); container.id = `pagination-${jenis}`; container.className = 'pagination-container'; tableResp.parentNode.insertBefore(container, tableResp.nextSibling); }
    if(totalItems === 0) { container.innerHTML = ''; return; }
    container.innerHTML = `<span style="font-size:0.85rem; color:var(--text-secondary); font-weight:800;">Menampilkan ${Math.min(totalItems, (page-1)*rowsPerPage + 1)} - ${Math.min(totalItems, page*rowsPerPage)} dari <span class="badge badge-primary">${totalItems}</span> total data</span><div class="flex-gap"><button class="btn btn-outline btn-sm" onclick="applyFilter('${jenis}', ${page - 1})" ${page === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i> Sebelumnya</button><span style="font-weight:900; font-size:0.95rem; padding:0 10px; color:var(--primary);">Halaman ${page} / ${totalPages}</span><button class="btn btn-outline btn-sm" onclick="applyFilter('${jenis}', ${page + 1})" ${page === totalPages ? 'disabled' : ''}>Selanjutnya <i class="fa-solid fa-chevron-right"></i></button></div>`;
}

function renderHTMLTabel(jenis, dataArray, tbody) {
    // BEAUTIFUL EMPTY STATE
    if (!dataArray || dataArray.length === 0) { 
        tbody.innerHTML = `
        <tr>
            <td colspan="8" style="padding: 0; background: transparent; border: none;">
                <div class="empty-state">
                    <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="Kosong">
                    <h4>Kotak Kosong</h4>
                    <p>Wah, belum ada data atau tugas yang harus ditampilkan di sini.</p>
                </div>
            </td>
        </tr>`; 
        return; 
    }
    
    let html = '';
    if(jenis === 'jenis-surat') globalDataJenisSurat = [...dataArray]; 
    if(jenis === 'user') globalDataUser = [...dataArray]; 
    if(jenis === 'referensi-pk') globalDataRefPK = [...dataArray];

    dataArray.forEach(item => {
        let fileBtn = item.fileUrl ? `<a href="${item.fileUrl}" target="_blank" class="btn-icon" title="Unduh Berkas"><i class="fa-solid fa-file-pdf text-danger"></i></a>` : `<span style="opacity:0.3; font-size:0.8rem;">-No File-</span>`;
        let s = (item.status || "").toLowerCase(); let badge = 'warning';
        if(s.includes('selesai') || s.includes('terkirim') || s.includes('sudah') || s.includes('aktif') || s.includes('diterbitkan')) badge = 'success'; 
        if(s.includes('belum')) badge = 'danger'; 
        let statusBadge = `<span class="badge badge-${badge}">${item.status || '-'}</span>`;

        let editBtn = `<button class="btn-icon text-primary" title="Edit" onclick="editData('${jenis}', '${item.id}')"><i class="fa-solid fa-edit"></i></button>`;
        let delBtn = `<button class="btn-icon text-danger" title="Hapus" onclick="deleteData('delete${jenis.replace('-','')}', '${item.id}', '${jenis}')"><i class="fa-solid fa-trash"></i></button>`;
        let timeBtn = item.debitur ? `<button class="btn-icon text-warning" title="SLA Timeline" onclick="showTimeline('${item.debitur}')"><i class="fa-solid fa-clock-rotate-left"></i></button>` : '';
        
        // TOMBOL LIHAT DETAIL (BARU)
        let viewBtn = `<button class="btn-icon text-success" title="Lihat Detail Lengkap" onclick="viewDetail('${jenis}', '${item.id}')"><i class="fa-solid fa-eye"></i></button>`;

        if (jenis === 'cabang') html += `<tr><td><strong>${item.nama}</strong></td><td>${item.kodeSM}</td><td>${item.kodePK}</td><td>${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'jenis-surat') html += `<tr><td><strong>${item.kode}</strong></td><td>${item.nama}</td><td>${item.uraian}</td><td>${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'user') html += `<tr><td><strong>${item.username}</strong></td><td>${item.nama}</td><td>${item.role}</td><td>${item.jabatan}</td><td>${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'referensi-pk') html += `<tr><td><span class="badge badge-primary">${item.kategori}</span></td><td><strong>${item.kode}</strong></td><td>${item.uraian}</td><td>${editBtn} ${delBtn}</td></tr>`;
        
        // PENAMBAHAN viewBtn PADA TRANSAKSI
        else if (jenis === 'surat-masuk') html += `<tr><td><strong>${item.nomor}</strong></td><td>${item.tanggal}</td><td>${item.pengirim}<br><small>Cab: ${item.cabang}</small></td><td>${item.perihal}</td><td>${statusBadge}</td><td>${viewBtn} ${item.jenisSurat==='D1'?timeBtn:''} ${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'surat-keluar') html += `<tr><td><strong>${item.nomor}</strong></td><td>${item.tanggal}</td><td>${item.tujuan}<br><small>Cab: ${item.cabang}</small></td><td>${item.perihal}</td><td>${statusBadge}</td><td>${viewBtn} ${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'sppk') html += `<tr><td><strong>${item.nomorSPPK}</strong></td><td>${item.tanggal}</td><td>${item.debitur}<br><small>Cab: ${item.cabang}</small></td><td>${formatRupiah(item.plafon)}</td><td>${statusBadge}</td><td>${viewBtn} ${timeBtn} ${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'pk') html += `<tr><td><strong>${item.nomorPK||'-'}</strong></td><td>${item.sppkInduk}</td><td>${item.tanggal}</td><td>${item.debitur}<br><small>Cab: ${item.cabang}</small></td><td>${formatRupiah(item.plafon)}</td><td>${statusBadge}</td><td>${viewBtn} ${timeBtn} ${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'arsip') html += `<tr><td><span class="badge badge-primary">${item.kategori}</span></td><td><strong>${item.nomor||'-'}</strong></td><td>${item.tanggal}</td><td>${item.deskripsi}</td><td>${viewBtn} ${fileBtn}</td></tr>`;
        else if (jenis === 'disposisi') {
            let aksiBtn = '';
            if(currentUser && currentUser.role !== 'Staf') { aksiBtn = `<button class="btn-icon text-primary" title="Tugaskan (Disposisi)" onclick="openModalDisposisi('${item.id}')"><i class="fa-solid fa-share-nodes"></i></button>`; } 
            else { aksiBtn = `<button class="btn-icon text-info" title="Tandai Selesai" onclick="deleteData('selesaikanTugas', '${item.id}', 'disposisi')"><i class="fa-solid fa-check"></i></button>`; }
            html += `<tr><td><strong>${item.nomor}</strong></td><td>${item.tanggal}</td><td>${item.pengirim}</td><td>${item.perihal}<br><small class="text-warning">Pesan: ${item.pesanDisposisi || '-'}</small></td><td>${statusBadge}<br><small>Staf: <strong>${item.disposisiKe || '-'}</strong></small></td><td>${viewBtn} ${fileBtn} ${aksiBtn}</td></tr>`;
        }
    });
    tbody.innerHTML = html;
}

function showTimeline(debitur) {
    let tHtml = '';
    const smD1 = storeData['surat-masuk'].filter(d => d.jenisSurat === 'D1' && d.pengirim === debitur);
    smD1.forEach(d => { tHtml += `<div class="timeline-item"><div class="timeline-date">${d.tanggal}</div><div class="timeline-title">Surat Masuk (Pengajuan Kredit)</div><div class="timeline-desc">No: ${d.nomor}<br>Plafon: ${formatRupiah(d.plafon)}</div></div>`; });
    
    const sppk = storeData['sppk'].filter(d => d.debitur === debitur);
    sppk.forEach(d => { tHtml += `<div class="timeline-item"><div class="timeline-date">${d.tanggal}</div><div class="timeline-title">SPPK Diterbitkan</div><div class="timeline-desc">No: ${d.nomorSPPK}<br>Plafon Disetujui: ${formatRupiah(d.plafon)}</div></div>`; });
    
    const pk = storeData['pk'].filter(d => d.debitur === debitur);
    pk.forEach(d => { tHtml += `<div class="timeline-item"><div class="timeline-date">${d.tanggal}</div><div class="timeline-title">Perjanjian Kredit (PK) Selesai</div><div class="timeline-desc">No PK: ${d.nomorPK}<br>Status: Aktif</div></div>`; });

    if(tHtml === '') tHtml = '<p>Tidak ada riwayat untuk debitur ini.</p>';
    document.getElementById('timeline-debitur').innerText = `Riwayat SLA: ${debitur}`; 
    document.getElementById('timeline-content').innerHTML = tHtml; 
    openModal('modal-timeline');
}

function openModalCabang() { document.getElementById('idCabang').value = ''; document.getElementById('namaCabang').value = ''; document.getElementById('kodeSMSK').value = ''; document.getElementById('kodePK').value = ''; document.getElementById('title-cabang').innerHTML = '<i class="fa-solid fa-code-branch text-primary"></i> Tambah Cabang'; openModal('modal-cabang'); }
function openModalJenisSurat() { document.getElementById('idJenisSurat').value = ''; document.getElementById('kodeJenis').value = ''; document.getElementById('namaJenis').value = ''; document.getElementById('uraianJenis').value = ''; document.getElementById('title-jenis-surat').innerHTML = '<i class="fa-solid fa-tags text-primary"></i> Tambah Jenis Surat'; openModal('modal-jenis-surat'); }
function openModalUser() { 
    document.getElementById('idUser').value = ''; 
    document.getElementById('namaLengkap').value = ''; 
    document.getElementById('usernameLogin').value = ''; 
    document.getElementById('jabatanUser').value = ''; 
    document.getElementById('passwordUser').value = ''; // Reset password
    document.getElementById('title-user').innerHTML = '<i class="fa-solid fa-user-plus text-primary"></i> Tambah User'; 
    openModal('modal-user'); 
}

   
function openModalReferensiPK() { document.getElementById('idRefPK').value = ''; document.getElementById('kodeRefPK').value = ''; document.getElementById('descRefPK').value = ''; document.getElementById('title-referensi-pk').innerHTML = '<i class="fa-solid fa-list text-primary"></i> Tambah Referensi PK'; openModal('modal-referensi-pk'); }
function openModalSM() { document.getElementById('idSuratMasuk').value=''; document.getElementById('title-sm').innerHTML='<i class="fa-solid fa-inbox text-primary"></i> Tambah Surat Masuk'; toggleD1Fields(); openModal('modal-surat-masuk'); }
function openModalSK() { document.getElementById('idSuratKeluar').value=''; document.getElementById('title-sk').innerHTML='<i class="fa-solid fa-paper-plane text-success"></i> Buat Surat Keluar'; openModal('modal-surat-keluar'); }
function openModalSPPK() { 
    document.getElementById('idSPPK').value=''; document.getElementById('title-sppk').innerHTML='<i class="fa-solid fa-file-contract text-primary"></i> Input SPPK Baru'; 
    let ops = '<option value="">-- Manual / Pilih Sumber (D1) --</option>'; 
    const usedD1 = storeData['sppk'].map(s => s.debitur);
    storeData['surat-masuk'].filter(d => d.jenisSurat === 'D1' && !usedD1.includes(d.pengirim)).forEach(d => { ops += `<option value="${d.pengirim}">${d.nomor} - ${d.pengirim}</option>`; }); 
    document.getElementById('sppk-sumber-d1').innerHTML = ops;
    openModal('modal-sppk'); 
}
function openModalPK() { document.getElementById('idPK').value=''; document.getElementById('title-pk').innerHTML='<i class="fa-solid fa-file-signature text-orange"></i> Terbitkan PK Baru'; populatePKForm(); openModal('modal-pk'); }
function openModalDisposisi(id) {
    document.getElementById('idSuratDisposisi').value = id; let ops = '<option value="">Pilih Staf...</option>';
    globalDataUser.filter(u => u.role === 'Staf').forEach(u => { ops += `<option value="${u.nama}">${u.nama} (${u.jabatan})</option>`; });
    document.getElementById('disposisi-staf').innerHTML = ops; openModal('modal-disposisi');
}

function autofillSPPK() {
    const deb = document.getElementById('sppk-sumber-d1').value; const data = storeData['surat-masuk'].find(d => d.jenisSurat==='D1' && d.pengirim===deb);
    if(data) { document.getElementById('sppk-debitur').value = data.pengirim; document.getElementById('sppk-plafon').value = formatRupiah(data.plafon.toString()); document.getElementById('sppk-jangkawaktu').value = data.jangkaWaktu; document.getElementById('sppk-jeniskredit').value = data.jenisKredit; }
}

function editData(jenis, id) {
    if (jenis === 'sppk') {
        const data = storeData[jenis].find(d => d.id === id); if(!data) return;
        if (data.status === 'Sudah PK') { showAlert('Akses Ditolak', 'SPPK ini sudah diterbitkan PK. Harap batalkan / hapus PK terlebih dahulu untuk mengubah data SPPK ini.', 'error'); return; }
        document.getElementById('idSPPK').value = data.id; document.querySelector('#modal-sppk select[name="pilihCabang"]').value = storeData['cabang'].find(c=>c.kodePK===data.cabang)?.kodeSM+"|"+storeData['cabang'].find(c=>c.kodePK===data.cabang)?.kodePK; document.querySelector('#modal-sppk input[name="tanggalSPPK"]').value = data.tanggal; document.querySelector('#modal-sppk input[name="namaDebitur"]').value = data.debitur; document.querySelector('#modal-sppk input[name="plafon"]').value = formatRupiah(data.plafon.toString()); document.querySelector('#modal-sppk input[name="jangkaWaktu"]').value = data.jangkaWaktu; document.querySelector('#modal-sppk select[name="jenisKredit"]').value = data.jenisKredit;
        document.getElementById('title-sppk').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit SPPK'; openModal('modal-sppk');
    } else if(jenis === 'surat-masuk') {
        const data = storeData[jenis].find(d => d.id === id); if(!data) return;
        document.getElementById('idSuratMasuk').value = data.id; document.querySelector('#modal-surat-masuk select[name="pilihCabang"]').value = storeData['cabang'].find(c=>c.kodeSM===data.cabang)?.kodeSM+"|"+storeData['cabang'].find(c=>c.kodeSM===data.cabang)?.kodePK; document.querySelector('#modal-surat-masuk input[name="tanggalSurat"]').value = data.tanggal; document.querySelector('#modal-surat-masuk select[name="jenisSurat"]').value = data.jenisSurat; toggleD1Fields();
        if(data.jenisSurat === 'D1') { document.getElementById('sm-nama-debitur').value = data.pengirim; document.getElementById('sm-plafon').value = formatRupiah(data.plafon.toString()); document.getElementById('sm-jangkawaktu').value = data.jangkaWaktu; document.getElementById('sm-jeniskredit').value = data.jenisKredit; } else { document.getElementById('sm-pengirim').value = data.pengirim; document.getElementById('sm-perihal').value = data.perihal; }
        document.getElementById('title-sm').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit Surat Masuk'; openModal('modal-surat-masuk');
    } else if (jenis === 'surat-keluar') {
        const data = storeData[jenis].find(d => d.id === id); if(!data) return;
        document.getElementById('idSuratKeluar').value = data.id; document.querySelector('#modal-surat-keluar select[name="pilihCabang"]').value = storeData['cabang'].find(c=>c.kodeSM===data.cabang)?.kodeSM+"|"+storeData['cabang'].find(c=>c.kodeSM===data.cabang)?.kodePK; document.querySelector('#modal-surat-keluar select[name="jenisSurat"]').value = data.jenisSurat; document.querySelector('#modal-surat-keluar input[name="tujuan"]').value = data.tujuan; document.querySelector('#modal-surat-keluar input[name="perihal"]').value = data.perihal;
        document.getElementById('title-sk').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit Surat Keluar'; openModal('modal-surat-keluar');
    } else if (jenis === 'pk') {
        const data = storeData[jenis].find(d => d.id === id); if(!data) return;
        document.getElementById('idPK').value = data.id; populatePKForm(); setTimeout(() => { document.querySelector('#modal-pk select[name="nomorSPPK"]').value = data.sppkInduk; document.getElementById('pk-nama-debitur').value = data.debitur; document.getElementById('pk-plafon').value = formatRupiah(data.plafon.toString()); document.querySelector('#modal-pk select[name="pilihCabang"]').value = storeData['cabang'].find(c=>c.kodePK===data.cabang)?.kodeSM+"|"+storeData['cabang'].find(c=>c.kodePK===data.cabang)?.kodePK; }, 500);
        document.getElementById('title-pk').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit PK'; openModal('modal-pk');
    } else if (jenis === 'cabang') {
        const data = storeData['cabang'].find(d => d.id === id); if(!data) return;
        document.getElementById('idCabang').value = data.id; document.getElementById('namaCabang').value = data.nama; document.getElementById('kodeSMSK').value = data.kodeSM; document.getElementById('kodePK').value = data.kodePK; document.getElementById('title-cabang').innerHTML = '<i class="fa-solid fa-edit text-primary"></i> Edit Cabang'; openModal('modal-cabang');
    } else if (jenis === 'jenis-surat') {
        const data = globalDataJenisSurat.find(d => d.id === id); if(!data) return;
        document.getElementById('idJenisSurat').value = data.id; document.getElementById('kodeJenis').value = data.kode; document.getElementById('namaJenis').value = data.nama; document.getElementById('uraianJenis').value = data.uraian; document.getElementById('title-jenis-surat').innerHTML = '<i class="fa-solid fa-edit text-primary"></i> Edit Jenis Surat'; openModal('modal-jenis-surat');
     } else if (jenis === 'user') {
        const data = globalDataUser.find(d => d.id === id); if(!data) return;
        document.getElementById('idUser').value = data.id; 
        document.getElementById('namaLengkap').value = data.nama; 
        document.getElementById('usernameLogin').value = data.username; 
        document.getElementById('roleUser').value = data.role; 
        document.getElementById('jabatanUser').value = data.jabatan; 
        document.getElementById('passwordUser').value = data.password || ''; // Isi dengan password lama
        document.getElementById('title-user').innerHTML = '<i class="fa-solid fa-edit text-primary"></i> Edit User'; 
        openModal('modal-user');
    
    } else if (jenis === 'referensi-pk') {
        const data = globalDataRefPK.find(d => d.id === id); if(!data) return;
        document.getElementById('idRefPK').value = data.id; document.getElementById('katRefPK').value = data.kategori; document.getElementById('kodeRefPK').value = data.kode; document.getElementById('descRefPK').value = data.uraian; document.getElementById('title-referensi-pk').innerHTML = '<i class="fa-solid fa-edit text-primary"></i> Edit Referensi PK'; openModal('modal-referensi-pk');
    }
}

async function deleteData(actionName, id, tableRef) {
    if (tableRef === 'sppk') {
        const dataSPPK = storeData['sppk'].find(d => d.id === id);
        if (dataSPPK && dataSPPK.status === 'Sudah PK') { 
            showAlert('Akses Ditolak', 'SPPK ini sudah diterbitkan PK. Harap batalkan/hapus PK terlebih dahulu untuk menghapus data SPPK ini.', 'error'); 
            return; 
        }
    }
    if(!confirm("Yakin ingin memproses perintah ini?")) return;
    try { 
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: actionName, payload: { id: id } }) }); 
        const result = await response.json(); 
        if (result.status === 'success') { 
            
            // GUNAKAN TOAST ALIH-ALIH SHOWALERT
            showToast('Berhasil!', 'Tindakan telah selesai diproses.', 'success'); 
            
            loadDataTabel(tableRef); 
            if(tableRef === 'pk') loadDataTabel('sppk'); 
            if(tableRef === 'sppk') loadDataTabel('surat-masuk'); 
            loadDashboardStats(); 
        } else showToast('Gagal', result.message, 'error'); 
    } catch (e) { showToast('Koneksi Error', 'Gagal terhubung.', 'error'); }
}

const getBase64 = (file) => new Promise((resolve, reject) => { if (!file) return resolve(null); const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve({ mimeType: file.type, filename: file.name, base64Data: r.result.split(',')[1] }); r.onerror = e => reject(e); });

async function sendFormData(action, payload, formEl, modalId, jenisMenuRef) {
    const btn = formEl.querySelector('button[type="submit"]'); const originalBtnHTML = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true;
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: action, payload: payload }) }); const result = await response.json();
        if (result.status === 'success') { 
            if(modalId) closeModal(modalId); 
            
            // GUNAKAN TOAST ALIH-ALIH SHOWALERT
            showToast('Tersimpan!', result.message, 'success'); 
            
            if(modalId) formEl.reset(); 
            if(jenisMenuRef) { if(Array.isArray(jenisMenuRef)) { jenisMenuRef.forEach(ref => loadDataTabel(ref)); } else { loadDataTabel(jenisMenuRef); } }
            if(jenisMenuRef && !['user','jenis-surat','referensi-pk','cabang'].includes(jenisMenuRef)) loadDashboardStats(); 
        } else {
            showToast('Gagal', result.message, 'error');
        }
    } catch (error) { 
        showToast('Koneksi Terputus', 'Gagal mengirim data ke server.', 'error'); 
    } finally { btn.innerHTML = originalBtnHTML; btn.disabled = false; }
}

async function submitCabang(e) { e.preventDefault(); const f = e.target; sendFormData('saveCabang', { id: f.elements['idCabang'].value, nama: f.elements['namaCabang'].value, kodeSM: f.elements['kodeSMSK'].value, kodePK: f.elements['kodePK'].value }, f, 'modal-cabang', 'cabang'); }
async function submitJenisSurat(e) { e.preventDefault(); const f = e.target; sendFormData('saveJenisSurat', { id: f.elements['idJenisSurat'].value, kode: f.elements['kodeJenis'].value, nama: f.elements['namaJenis'].value, uraian: f.elements['uraianJenis'].value }, f, 'modal-jenis-surat', 'jenis-surat'); }
// Jangan lupa tambahkan parameter password ke dalam payload
async function submitUser(e) { 
    e.preventDefault(); const f = e.target; 
    sendFormData('saveUser', { 
        id: f.elements['idUser'].value, 
        nama: f.elements['namaLengkap'].value, 
        username: f.elements['usernameLogin'].value, 
        role: f.elements['roleUser'].value, 
        jabatan: f.elements['jabatanUser'].value,
        password: f.elements['passwordUser'].value // Dikirim ke backend
    }, f, 'modal-user', 'user'); 
}

async function submitReferensiPK(e) { e.preventDefault(); const f = e.target; sendFormData('saveReferensiPK', { id: f.elements['idRefPK'].value, kategori: f.elements['katRefPK'].value, kode: f.elements['kodeRefPK'].value, uraian: f.elements['descRefPK'].value }, f, 'modal-referensi-pk', 'referensi-pk'); }
async function submitConfig(e) { e.preventDefault(); const form = e.target; const payload = {}; Array.from(form.elements).forEach(el => { if(el.name) payload[el.name] = el.value; }); sendFormData('saveConfig', payload, form, null, null); setTimeout(loadConfig, 1000); }
async function submitIdentitas(e) { 
    e.preventDefault(); const form = e.target; const payload = {}; 
    Array.from(form.elements).forEach(el => { if(el.name && el.type !== 'file') payload[el.name] = el.value; }); 
    
    // Beri indikator loading pada tombol simpan
    const btn = form.querySelector('button[type="submit"]'); 
    const originalText = btn.innerHTML; 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...'; btn.disabled = true;

    // Proses convert file gambar menjadi data aman (Base64)
    const fileInput = form.elements['AppLogoFile'];
    if (fileInput && fileInput.files.length > 0) {
        payload.AppLogoFile = await getBase64(fileInput.files[0]);
    }

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveConfig', payload: payload }) });
        const result = await response.json();
        if(result.status === 'success') {
            showAlert('Berhasil', 'Identitas Aplikasi & Logo berhasil diperbarui!', 'success');
            setTimeout(loadConfig, 1000);
        } else showAlert('Gagal', result.message, 'error');
    } catch(err) {
        showAlert('Error', 'Gagal menyimpan identitas', 'error');
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
    }
}
async function submitSuratMasuk(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); const isD1 = f.elements['jenisSurat'].value === 'D1'; sendFormData('upsertSuratMasuk', { id: f.elements['idSuratMasuk'].value, cabangSMSK: c[0], jenisSurat: f.elements['jenisSurat'].value, tanggalSurat: f.elements['tanggalSurat'].value, pengirim: isD1 ? f.elements['namaDebiturD1'].value : f.elements['pengirim'].value, sifatSurat: f.elements['sifatSurat'].value, perihal: isD1 ? 'Pengajuan Kredit Baru' : f.elements['perihal'].value, plafon: isD1 ? cleanNominal(f.elements['plafonD1'].value) : '', jangkaWaktu: isD1 ? f.elements['jangkaWaktuD1'].value : '', jenisKredit: isD1 ? f.elements['jenisKreditD1'].value : '', file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-masuk', 'surat-masuk'); }
async function submitSuratKeluar(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); sendFormData('upsertSuratKeluar', { id: f.elements['idSuratKeluar'].value, cabangSMSK: c[0], jenisSurat: f.elements['jenisSurat'].value, tujuan: f.elements['tujuan'].value, perihal: f.elements['perihal'].value, penandatangan: f.elements['penandatangan'].value, sifat: f.elements['sifat'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-keluar', 'surat-keluar'); }
async function submitSPPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); sendFormData('upsertSPPK', { id: f.elements['idSPPK'].value, cabangPK: c[1], tanggalSPPK: f.elements['tanggalSPPK'].value, namaDebitur: f.elements['namaDebitur'].value, jenisKredit: f.elements['jenisKredit'].value, plafon: cleanNominal(f.elements['plafon'].value), jangkaWaktu: f.elements['jangkaWaktu'].value, tujuanKredit: f.elements['tujuanKredit'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-sppk', ['sppk', 'pk', 'surat-masuk']); }
async function submitPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); sendFormData('upsertPK', { id: f.elements['idPK'].value, cabangPK: c[1], nomorSPPK: f.elements['nomorSPPK'].value, tanggalPK: f.elements['tanggalPK'].value, namaDebitur: f.elements['namaDebitur'].value, plafon: cleanNominal(f.elements['plafon'].value), golDebitur: f.elements['golDebitur'].value, jnsPenggunaan: f.elements['jnsPenggunaan'].value, klasKredit: f.elements['klasKredit'].value, sektorEko: f.elements['sektorEko'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-pk', ['pk', 'sppk']); }
async function submitDisposisi(e) { e.preventDefault(); const f = e.target; sendFormData('assignDisposisi', { id: f.elements['idSuratDisposisi'].value, staf: f.elements['stafPenerima'].value, pesan: f.elements['pesanDisposisi'].value }, f, 'modal-disposisi', ['surat-masuk', 'disposisi']); }

function populatePKForm() {
    let options = '<option value="">Pilih SPPK yang Disetujui...</option>'; storeData['sppk'].forEach(j => { if(j.status !== "Sudah PK") options += `<option value="${j.nomorSPPK}">${j.nomorSPPK} - ${j.debitur}</option>`; }); document.getElementById('select-sppk-induk').innerHTML = options;
    document.getElementById('select-sppk-induk').onchange = function(e) { const sel = storeData['sppk'].find(x => x.nomorSPPK === e.target.value); if(sel) { document.getElementById('pk-nama-debitur').value = sel.debitur; document.getElementById('pk-plafon').value = formatRupiah(sel.plafon.toString()); const cbSel = document.getElementById('pk-cabang'); Array.from(cbSel.options).forEach(opt => { if(opt.value.includes(sel.cabang)) cbSel.value = opt.value; }); } };
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getReferensiPK' }) }).then(res => res.json()).then(result => {
        if(result.status === 'success') {
            let opsGol = '<option value="">Pilih...</option>', opsJns = '<option value="">Pilih...</option>', opsKlas = '<option value="">Pilih...</option>', opsSek = '<option value="">Pilih...</option>';
            result.data.forEach(j => { let txt = `<option value="${j.kode}">${j.kode} - ${j.uraian}</option>`; if(j.kategori === 'GolDebitur') opsGol += txt; else if(j.kategori === 'JnsPenggunaan') opsJns += txt; else if(j.kategori === 'KlasKredit') opsKlas += txt; else if(j.kategori === 'SektorEko') opsSek += txt; });
            document.getElementById('sel-goldebitur').innerHTML = opsGol; document.getElementById('sel-jnspenggunaan').innerHTML = opsJns; document.getElementById('sel-klaskredit').innerHTML = opsKlas; document.getElementById('sel-sektoreko').innerHTML = opsSek;
        }
    });
}

function generateLaporanPDF() {
    const jenis = document.getElementById('lap-jenis').value; const cabang = document.getElementById('lap-cabang').value;
    let data = storeData[jenis] || []; if(cabang) data = data.filter(d => d.cabang === cabang || (d.cabang && d.cabang.includes(cabang)));
    let tableHtml = `<table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:12px; font-family:sans-serif;"><thead><tr style="background:#f0f0f0;"><th>Tanggal</th><th>Nomor Dokumen</th><th>Keterangan / Tujuan / Debitur</th><th>Status</th></tr></thead><tbody>`;
    data.forEach(d => { let no = d.nomor || d.nomorSPPK || d.nomorPK || "-"; let info = d.pengirim || d.tujuan || d.debitur || d.deskripsi || "-"; if(d.plafon) info += `<br>Rp ${parseFloat(d.plafon).toLocaleString('id-ID')}`; tableHtml += `<tr><td>${d.tanggal}</td><td>${no}</td><td>${info}</td><td>${d.status}</td></tr>`; }); tableHtml += `</tbody></table>`;
    const container = document.getElementById('pdf-container'); container.innerHTML = `<h2 style="text-align:center; font-family:sans-serif;">Laporan Data ${jenis.toUpperCase()}</h2><p style="text-align:center;">Filter Cabang: ${cabang||'Semua'}</p><br>${tableHtml}`; container.style.display = "block";
    html2pdf().set({ margin: 0.5, filename: `Laporan_${jenis}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(container).save().then(()=> { container.style.display = "none"; });
}
function generateLaporanWA() {
    const jenis = document.getElementById('lap-jenis').value; const cabang = document.getElementById('lap-cabang').value; let data = storeData[jenis] || []; if(cabang) data = data.filter(d => d.cabang === cabang || (d.cabang && d.cabang.includes(cabang)));
    let text = `*Ringkasan Laporan ${jenis.toUpperCase()}*\nCabang: ${cabang || 'Semua Cabang'}\nTotal Data: ${data.length}\n\n`;
    data.slice(0, 15).forEach((d, i) => { let no = d.nomor || d.nomorSPPK || d.nomorPK || "-"; let info = d.pengirim || d.tujuan || d.debitur || d.deskripsi || "-"; text += `${i+1}. ${no} | ${info} (${d.status})\n`; }); if(data.length > 15) text += `\n...dan ${data.length - 15} data lainnya.`; text += `\n_Digenerate otomatis oleh Sistem Manajemen Surat & Kredit_`;
    navigator.clipboard.writeText(text).then(()=>showAlert('Sukses', 'Teks laporan berhasil disalin ke clipboard!', 'success'));
}

// FUNGSI TAMPILKAN/SEMBUNYIKAN PASSWORD
function togglePassword() {
    const passInput = document.getElementById('login-password');
    const eyeIcon = document.getElementById('eye-icon');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
        eyeIcon.classList.add('text-danger');
    } else {
        passInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash', 'text-danger');
        eyeIcon.classList.add('fa-eye');
    }
}

// LOGIKA LOGIN TERBARU (OTENTIKASI DATABASE)
// LOGIKA LOGIN TERBARU (OTENTIKASI KETAT DATABASE)
async function handleLogin(e) {
    e.preventDefault(); 
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...';
    btn.disabled = true;

    const inputUser = document.getElementById('login-username').value;
    const inputPass = document.getElementById('login-password').value;

    try {
        // Tarik data User dari database untuk otentikasi
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getUser' }) });
        const result = await res.json();
        
        if (result.status === 'success') {
            globalDataUser = result.data;
            const validUser = globalDataUser.find(u => u.username === inputUser);
            
            if (validUser) {
                // KUNCI KEAMANAN: Membandingkan inputan dengan password asli dari database
                if (inputPass === validUser.password) {
                    
                    currentUser = { username: validUser.username, role: validUser.role, nama: validUser.nama }; 
                    document.getElementById('user-name').innerText = currentUser.username; 
                    document.getElementById('user-role').innerText = currentUser.role; 
                    
                    // Filter tampilan berdasarkan Role yang ditarik dari Database
                    if(currentUser.role !== 'Admin') document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none'); 
                    else document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');

                    document.getElementById('login-screen').classList.add('hidden'); 
                    document.getElementById('main-screen').classList.remove('hidden'); 
                    loadDashboardStats();
                    showAlert('Otentikasi Berhasil', `Selamat datang kembali, ${currentUser.nama}!`, 'success');
                    
                    // Tarik sisa data master
                    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getCabang' }) }).then(r => r.json()).then(resC => { if(resC.status === 'success') { storeData['cabang'] = resC.data; let ops = '<option value="">Pilih Cabang...</option>'; resC.data.forEach(j => ops += `<option value="${j.kodeSM}|${j.kodePK}">${j.nama}</option>`); document.querySelectorAll('.sel-cabang-global').forEach(el => el.innerHTML = ops); } });
                    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJenisSurat' }) }).then(r => r.json()).then(resJ => { if(resJ.status === 'success') { let ops = '<option value="">Pilih Jenis Surat...</option>'; resJ.data.forEach(j => ops += `<option value="${j.kode}">${j.kode} - ${j.nama}</option>`); if(document.getElementById('select-jenis-sm')) document.getElementById('select-jenis-sm').innerHTML = ops; if(document.getElementById('select-jenis-sk')) document.getElementById('select-jenis-sk').innerHTML = ops; } });

                } else {
                    showAlert('Akses Ditolak', 'Password yang Anda masukkan salah.', 'error');
                }
            } else {
                showAlert('Akses Ditolak', 'Username tidak terdaftar di sistem.', 'error');
            }
        }
    } catch (error) {
        showAlert('Koneksi Gagal', 'Tidak dapat menghubungi server verifikasi.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ========================================================
// --- FUNGSI RENDER POPUP DETAIL ULTRA MODERN ---
// ========================================================
function viewDetail(jenis, id) {
    let targetJenis = jenis === 'disposisi' ? 'surat-masuk' : jenis;
    const data = storeData[targetJenis].find(d => d.id === id);
    if (!data) return;

    let headerTitle = '';
    let headerSubtitle = '';
    let badgeStatus = data.status || '-';

    let html = '<div class="modern-detail-grid">';
    
    // Fungsi Pembangun Mini-Card dengan Ikon
    const addCard = (label, value, icon = 'fa-circle-dot', isFull = false, isHighlight = false) => {
        const fwClass = isFull ? 'full-width' : '';
        const hlClass = isHighlight ? 'highlight' : '';
        const displayValue = value ? value : '-';
        html += `
        <div class="modern-detail-card ${fwClass} ${hlClass}">
            <div class="modern-detail-label"><i class="fa-solid ${icon}"></i> ${label}</div>
            <div class="modern-detail-value">${displayValue}</div>
        </div>`;
    };

    if (jenis === 'surat-masuk' || jenis === 'disposisi') {
        headerTitle = data.nomor;
        headerSubtitle = data.jenisSurat === 'D1' ? 'Pengajuan Kredit Baru (D1)' : 'Dokumen Surat Masuk';
        
        addCard('Tanggal Diterima', data.tanggal, 'fa-calendar-day');
        addCard('Sifat Surat', data.sifatSurat || 'Biasa', 'fa-bolt');
        
        if(data.jenisSurat === 'D1') {
            addCard('Nama Debitur', data.pengirim, 'fa-user-tie', true);
            addCard('Nilai Plafon', formatRupiah(data.plafon), 'fa-money-bill-wave', false, true);
            addCard('Jangka Waktu', data.jangkaWaktu ? data.jangkaWaktu + ' Bulan' : '-', 'fa-stopwatch');
            addCard('Jenis Kredit', data.jenisKredit, 'fa-credit-card', true);
        } else {
            addCard('Instansi Pengirim', data.pengirim, 'fa-building', true);
            addCard('Perihal', data.perihal, 'fa-envelope-open-text', true);
        }
        addCard('Cabang Tujuan', data.cabang, 'fa-code-branch');
        
        if (data.disposisiKe) {
            addCard('Ditugaskan Kepada', data.disposisiKe, 'fa-user-check', true, true);
            addCard('Pesan Instruksi', data.pesanDisposisi, 'fa-comment-dots', true, true);
        }
    } else if (jenis === 'surat-keluar') {
        headerTitle = data.nomor;
        headerSubtitle = 'Dokumen Surat Keluar';
        addCard('Tanggal Surat', data.tanggal, 'fa-calendar-day');
        addCard('Sifat Surat', data.sifat, 'fa-bolt');
        addCard('Instansi Tujuan', data.tujuan, 'fa-building', true);
        addCard('Perihal', data.perihal, 'fa-envelope-open-text', true);
        addCard('Penandatangan', data.penandatangan, 'fa-pen-nib');
        addCard('Cabang Asal', data.cabang, 'fa-code-branch');
    } else if (jenis === 'sppk') {
        headerTitle = data.nomorSPPK;
        headerSubtitle = 'Surat Pemberitahuan Persetujuan Kredit (SPPK)';
        addCard('Tanggal Diterbitkan', data.tanggal, 'fa-calendar-day');
        addCard('Cabang Pemroses', data.cabang, 'fa-code-branch');
        addCard('Nama Debitur', data.debitur, 'fa-user-tie', true);
        addCard('Plafon Disetujui', formatRupiah(data.plafon), 'fa-money-bill-wave', false, true);
        addCard('Jangka Waktu', data.jangkaWaktu ? data.jangkaWaktu + ' Bulan' : '-', 'fa-stopwatch');
        addCard('Jenis Kredit', data.jenisKredit, 'fa-credit-card', true);
    } else if (jenis === 'pk') {
        headerTitle = data.nomorPK || 'DRAFT / PENDING';
        headerSubtitle = 'Perjanjian Kredit (PK)';
        addCard('No. SPPK Induk', data.sppkInduk, 'fa-file-contract', true);
        addCard('Tanggal PK', data.tanggal, 'fa-calendar-day');
        addCard('Cabang Pemroses', data.cabang, 'fa-code-branch');
        addCard('Nama Debitur', data.debitur, 'fa-user-tie', true);
        addCard('Plafon Kredit', formatRupiah(data.plafon), 'fa-money-bill-wave', true, true);
    } else if (jenis === 'arsip') {
        headerTitle = data.nomor;
        headerSubtitle = `Arsip Sistem: ${data.kategori}`;
        addCard('Tanggal Rekam', data.tanggal, 'fa-calendar-day');
        addCard('Cabang Asal', data.cabang, 'fa-code-branch');
        addCard('Keterangan / Deskripsi', data.deskripsi, 'fa-quote-left', true);
    }

    html += '</div>';
    
    // Tampilan Tombol File PDF Ekstra Menonjol
    if (data.fileUrl) {
        html += `
        <div style="margin-top: 25px; padding-top: 25px; border-top: 1px dashed var(--border-color); text-align: center;">
            <a href="${data.fileUrl}" target="_blank" class="btn w-100" style="background: var(--danger-light); color: var(--danger); font-size: 1.05rem; padding: 15px; border-radius: 16px; box-shadow: 0 5px 15px rgba(220, 38, 38, 0.1);">
                <i class="fa-solid fa-file-pdf"></i> Lihat Dokumen Asli
            </a>
        </div>`;
    }

    // Pembangun Blok Header Dinamis Berwarna Sesuai Status
    let sBadgeColor = badgeStatus.toLowerCase().includes('belum') ? 'var(--danger)' : (badgeStatus.toLowerCase().includes('diproses') ? 'var(--warning)' : 'var(--success)');
    
    let headerHtml = `
    <div class="detail-header-hero">
        <span class="badge" style="background: ${sBadgeColor}; border:none; margin-bottom: 12px; display: inline-block;">${badgeStatus}</span>
        <p style="margin: 0 0 5px; color: rgba(255,255,255,0.8); font-size: 0.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">${headerSubtitle}</p>
        <h2>${headerTitle}</h2>
    </div>`;

    document.getElementById('detail-header-dynamic').innerHTML = headerHtml;
    document.getElementById('detail-content').innerHTML = html;
    openModal('modal-detail');
}

// ========================================================
// --- FUNGSI TOAST NOTIFICATION (NON-BLOCKING) ---
// ========================================================
function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Animasikan masuk
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Otomatis hilang setelah 3.5 detik
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Tunggu animasi selesai baru dihapus dari DOM
    }, 3500);
}


function handleLogout() { currentUser = null; document.getElementById('main-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('login-form').reset(); document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex'); }
window.onload = () => { if (document.getElementById('theme-icon')) document.getElementById('theme-icon').className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; };

// SWIPE DOWN TO CLOSE MODAL (HP)
let touchStartY = 0, currentDeltaY = 0, activeSwipeModal = null, isSwiping = false;
document.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 768) return;
    const modal = e.target.closest('.modal-overlay:not(.hidden) .modal-card'); if (!modal) return;
    const form = modal.querySelector('form'); if (form && form.contains(e.target) && form.scrollTop > 0) return; 
    activeSwipeModal = modal; touchStartY = e.touches[0].clientY; isSwiping = true; activeSwipeModal.style.transition = 'none'; 
}, {passive: true});

document.addEventListener('touchmove', (e) => {
    if (!isSwiping || !activeSwipeModal) return;
    const form = activeSwipeModal.querySelector('form');
    if (form && form.contains(e.target) && form.scrollTop > 0 && currentDeltaY <= 0) { isSwiping = false; activeSwipeModal.style.transform = ''; return; }
    const currentY = e.touches[0].clientY; currentDeltaY = currentY - touchStartY;
    if (currentDeltaY > 0) { activeSwipeModal.style.transform = `translateY(${currentDeltaY}px)`; if (e.cancelable) e.preventDefault(); }
}, {passive: false});

document.addEventListener('touchend', () => {
    if (!isSwiping || !activeSwipeModal) return;
    isSwiping = false; activeSwipeModal.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    if (currentDeltaY > 120) { 
        activeSwipeModal.style.transform = 'translateY(100%)'; const overlayId = activeSwipeModal.closest('.modal-overlay').id;
        setTimeout(() => { closeModal(overlayId); activeSwipeModal.style.transform = ''; }, 300); 
    } else { activeSwipeModal.style.transform = 'translateY(0)'; setTimeout(() => { if(activeSwipeModal) activeSwipeModal.style.transform = ''; }, 400); }
    activeSwipeModal = null; currentDeltaY = 0;
});

// ========================================================
// --- INTERAKSI FILE UPLOAD MODERN (DROPZONE) ---
// ========================================================
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('file-input-modern')) {
        const fileMsgEl = e.target.previousElementSibling;
        if (e.target.files && e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            
            // Cek apakah yang diupload adalah gambar (Logo) atau PDF (Dokumen)
            if (e.target.accept && e.target.accept.includes('image')) {
                const reader = new FileReader();
                reader.onload = function(e_read) {
                    fileMsgEl.innerHTML = `<img src="${e_read.target.result}" style="max-height: 45px; margin-bottom: 8px; border-radius: 8px;"> <span style="color: var(--text-primary); margin-top: 5px;">${fileName}</span>`;
                }
                reader.readAsDataURL(e.target.files[0]);
            } else {
                fileMsgEl.innerHTML = `<i class="fa-solid fa-file-pdf text-danger" style="font-size: 2.5rem;"></i> <span style="color: var(--text-primary); margin-top: 5px;">${fileName}</span>`;
            }
            e.target.parentElement.style.background = 'var(--success-light)';
            e.target.parentElement.style.borderColor = 'var(--success)';
        } else {
            // Logika reset
            if (e.target.accept && e.target.accept.includes('image')) {
                fileMsgEl.innerHTML = `<img id="preview-logo-img" src="" style="max-height: 45px; margin-bottom: 8px; display: none; border-radius: 8px;"><span><i class="fa-solid fa-cloud-arrow-up"></i> Klik/Seret File Gambar (PNG/JPG)</span>`;
            } else {
                fileMsgEl.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Klik atau Seret File PDF Anda ke Sini`;
            }
            e.target.parentElement.style.background = 'var(--primary-light)';
            e.target.parentElement.style.borderColor = 'var(--primary)';
        }
    }
});
