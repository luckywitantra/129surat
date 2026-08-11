const API_URL = 'https://script.google.com/macros/s/AKfycbxj7uQSzJJLESto_xbCuQAw1iDEn-1_jNX68MlwLjtnmJqFpTOtsq2eOpBDZjpz648Y/exec';

let currentUser = null; 
let currentTheme = localStorage.getItem('theme') || 'light';
let storeData = { 'surat-masuk': [], 'surat-keluar': [], 'sppk': [], 'pk': [], 'arsip': [], 'cabang': [] };
let globalDataJenisSurat = []; 
let globalDataUser = []; 
let globalDataRefPK = [];

document.documentElement.setAttribute('data-theme', currentTheme);
document.addEventListener('DOMContentLoaded', () => { initSystem(); });

async function initSystem() {
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'initApp' }) });
        const result = await response.json();
       // Di dalam initSystem(), ubah blok IF success menjadi:
if(result.status === 'success') { 
    await loadConfig(); // Panggil config terlebih dahulu
    setTimeout(() => { 
        document.getElementById('init-screen').classList.add('hidden'); 
        document.getElementById('login-screen').classList.remove('hidden'); 
    }, 800); 
}
        else showAlert('Error Sistem', result.message, 'error');
    } catch (error) { setTimeout(() => { document.getElementById('init-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); showAlert('Mode Offline', 'UI berjalan tanpa koneksi backend.', 'info'); }, 1000); }
}

function toggleTheme() { currentTheme = currentTheme === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', currentTheme); localStorage.setItem('theme', currentTheme); document.getElementById('theme-icon').className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function closeAlert() { document.getElementById('custom-alert').classList.add('hidden'); }
function openModal(modalId) { document.getElementById(modalId).classList.remove('hidden'); }
function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }
function showAlert(title, message, type) {
    document.getElementById('alert-title').innerText = title; document.getElementById('alert-message').innerText = message;
    const icon = document.getElementById('alert-icon');
    if(type === 'success') icon.innerHTML = '<i class="fa-solid fa-check-circle icon-success"></i>'; else if(type === 'error') icon.innerHTML = '<i class="fa-solid fa-circle-xmark icon-error"></i>'; else icon.innerHTML = '<i class="fa-solid fa-circle-info icon-info"></i>';
    document.getElementById('custom-alert').classList.remove('hidden');
}

// TOGGLE D1 FIELDS (SURAT MASUK)
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

// NAVIGATION
function navigate(page) {
    document.getElementById('sidebar').classList.remove('open'); document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); event.currentTarget.classList.add('active');
    ['dashboard', 'surat-masuk', 'surat-keluar', 'sppk', 'pk', 'arsip', 'laporan', 'pengaturan'].forEach(v => { const el = document.getElementById(`view-${v}`); if(el) el.classList.add('hidden'); });
    const targetEl = document.getElementById(`view-${page}`); if(targetEl) targetEl.classList.remove('hidden');

    if (page === 'dashboard') loadDashboardStats();
    else if (page === 'pengaturan') { loadDataTabel('cabang'); loadDataTabel('referensi-pk'); loadDataTabel('jenis-surat'); loadDataTabel('user'); loadConfig(); }
    else if (['surat-masuk', 'surat-keluar', 'sppk', 'pk', 'arsip'].includes(page)) { buildFilterUI(page); loadDataTabel(page); }
    
    const titles = { 'dashboard': 'Dashboard', 'surat-masuk': 'Surat Masuk', 'surat-keluar': 'Surat Keluar', 'sppk': 'Data SPPK', 'pk': 'Data PK', 'arsip': 'Arsip Dokumen', 'laporan': 'Pusat Laporan', 'pengaturan': 'Pengaturan Sistem' }; document.getElementById('page-title').innerText = titles[page] || 'Aplikasi';
}

async function loadDashboardStats() {
    try { const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDashboardStats' }) }); const result = await response.json(); if (result.status === 'success') { document.getElementById('stat-sm').innerText = result.data.sm; document.getElementById('stat-sk').innerText = result.data.sk; document.getElementById('stat-sppk').innerText = result.data.sppk; document.getElementById('stat-pk').innerText = result.data.pk; } } catch (e) { console.error(e); }
}

// GANTI fungsi loadConfig() dengan yang baru ini:
async function loadConfig() {
    try { 
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getConfig' }) }); 
        const result = await response.json(); 
        if (result.status === 'success') { 
            const formPenomoran = document.getElementById('form-config'); 
            const formIdentitas = document.getElementById('form-config-identitas'); 
            
            // Render ke form
            for(let key in result.data) { 
                if(formPenomoran.elements[key]) formPenomoran.elements[key].value = result.data[key]; 
                if(formIdentitas.elements[key]) formIdentitas.elements[key].value = result.data[key]; 
            }

            // Terapkan Identitas ke DOM Aplikasi secara langsung
            applyIdentitas(result.data);
        } 
    } catch (e) { console.error(e); }
}

// TAMBAHKAN fungsi applyIdentitas di bawah loadConfig():
function applyIdentitas(data) {
    const appName = data['AppName'] || 'SuratApp';
    const companyName = data['CompanyName'] || 'Sistem Manajemen Terpadu';
    const appLogo = data['AppLogo'] || 'https://cdn-icons-png.flaticon.com/512/3062/3062634.png';
    
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

// GANTI sedikit fungsi toggleTheme() agar merekam setting manual:
function toggleTheme() { 
    currentTheme = currentTheme === 'light' ? 'dark' : 'light'; 
    document.documentElement.setAttribute('data-theme', currentTheme); 
    localStorage.setItem('theme', currentTheme); 
    localStorage.setItem('theme_manually_set', 'true'); // Penanda user menimpa default sistem
    document.getElementById('theme-icon').className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; 
}

// TAMBAHKAN submitIdentitas di area FORM SUBMITTERS (berdekatan dengan submitConfig):
async function submitIdentitas(e) { 
    e.preventDefault(); const form = e.target; const payload = {}; 
    Array.from(form.elements).forEach(el => { if(el.name) payload[el.name] = el.value; }); 
    sendFormData('saveConfig', payload, form, null, null); 
    setTimeout(loadConfig, 1000); // Reload config agar UI langsung berubah
}

// GANTI FUNGSI INI
function buildFilterUI(jenis) {
    const container = document.getElementById(`filter-${jenis}`); if(!container) return;
    
    let extraFilter = '';
    if (jenis === 'surat-masuk' || jenis === 'surat-keluar') {
        extraFilter = `<select id="fil-jenis-surat-${jenis}" class="search-input sel-jenissurat-filter" onchange="applyFilter('${jenis}')"><option value="">Semua Jenis</option></select>`;
    } else if (jenis === 'arsip') {
        extraFilter = `<select id="fil-kategori-arsip" class="search-input" onchange="applyFilter('${jenis}')"><option value="">Semua Kategori</option><option value="Surat Masuk">Surat Masuk</option><option value="Surat Keluar">Surat Keluar</option><option value="SPPK">SPPK</option><option value="PK">PK</option></select>`;
    }

    // Perhatikan penggunaan class "filter-container"
    container.innerHTML = `
        <div class="filter-container">
            <input type="text" id="search-${jenis}" class="search-input" placeholder="🔍 Cari nama/nomor..." onkeyup="applyFilter('${jenis}')">
            ${extraFilter}
            <select id="sort-${jenis}" class="search-input" onchange="applyFilter('${jenis}')">
                <option value="newest">📅 Baru - Lama</option>
                <option value="oldest">📅 Lama - Baru</option>
                <option value="az">🔤 A - Z</option>
                <option value="za">🔤 Z - A</option>
            </select>
            <select id="fil-cabang-${jenis}" class="search-input sel-cabang-filter" onchange="applyFilter('${jenis}')"><option value="">🏢 Semua Cabang</option></select>
            <select id="fil-bulan-${jenis}" class="search-input" onchange="applyFilter('${jenis}')">
                <option value="">🗓️ Bulan</option><option value="01">Januari</option><option value="02">Februari</option><option value="03">Maret</option><option value="04">April</option><option value="05">Mei</option><option value="06">Juni</option><option value="07">Juli</option><option value="08">Agustus</option><option value="09">September</option><option value="10">Oktober</option><option value="11">November</option><option value="12">Desember</option>
            </select>
            <select id="fil-tahun-${jenis}" class="search-input" onchange="applyFilter('${jenis}')">
                <option value="">⏳ Tahun</option><option value="2026">2026</option><option value="2027">2027</option>
            </select>
        </div>`;
    
    populateCabangFilters();
    if (jenis === 'surat-masuk' || jenis === 'surat-keluar') populateJenisSuratFilters();
}

// TAMBAHKAN FUNGSI INI DI BAWAH buildFilterUI
function populateJenisSuratFilters() {
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJenisSurat' }) }).then(res => res.json()).then(result => { 
        if(result.status === 'success') { 
            let options = '<option value="">Semua Jenis Surat</option>';
            result.data.forEach(j => options += `<option value="${j.kode}">${j.kode} - ${j.nama}</option>`); 
            document.querySelectorAll('.sel-jenissurat-filter').forEach(el => { el.innerHTML = options; }); 
        } 
    });
}

function populateCabangFilters() {
    let options = '<option value="">Semua Cabang</option>'; storeData['cabang'].forEach(c => options += `<option value="${c.kodeSM}">${c.nama}</option>`);
    document.querySelectorAll('.sel-cabang-filter').forEach(el => { el.innerHTML = options; });
}

async function loadDataTabel(jenis) {
    const tbody = document.getElementById(`tbody-${jenis}`); if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--primary); padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Menarik data...</td></tr>`;

    let act = '';
    if (jenis === 'surat-masuk') act = 'getSuratMasuk'; else if (jenis === 'surat-keluar') act = 'getSuratKeluar'; else if (jenis === 'sppk') act = 'getSPPK'; else if (jenis === 'pk') act = 'getPK'; else if (jenis === 'arsip') act = 'getArsip'; else if (jenis === 'jenis-surat') act = 'getJenisSurat'; else if (jenis === 'user') act = 'getUser'; else if (jenis === 'referensi-pk') act = 'getReferensiPK'; else if (jenis === 'cabang') act = 'getCabang';

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: act }) });
        const result = await response.json();
        if (result.status === 'success') {
            if(['surat-masuk','surat-keluar','sppk','pk','arsip','cabang'].includes(jenis)) {
                storeData[jenis] = result.data;
                if(jenis === 'cabang') populateCabangFilters();
                if(jenis === 'pk') populatePKForm();
                applyFilter(jenis); 
            } else {
                renderHTMLTabel(jenis, result.data, tbody);
            }
        } else tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">${result.message}</td></tr>`;
    } catch (error) { tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Gagal memuat.</td></tr>`; }
}

// GANTI FUNGSI INI
function applyFilter(jenis) {
    if(!storeData[jenis]) return;
    let data = [...storeData[jenis]]; const tbody = document.getElementById(`tbody-${jenis}`); if(!tbody) return;

    if(['surat-masuk','surat-keluar','sppk','pk','arsip'].includes(jenis)) {
        const searchVal = document.getElementById(`search-${jenis}`) ? document.getElementById(`search-${jenis}`).value.toLowerCase() : '';
        const sortVal = document.getElementById(`sort-${jenis}`) ? document.getElementById(`sort-${jenis}`).value : 'newest';
        const cabVal = document.getElementById(`fil-cabang-${jenis}`) ? document.getElementById(`fil-cabang-${jenis}`).value : '';
        const thnVal = document.getElementById(`fil-tahun-${jenis}`) ? document.getElementById(`fil-tahun-${jenis}`).value : '';
        const blnVal = document.getElementById(`fil-bulan-${jenis}`) ? document.getElementById(`fil-bulan-${jenis}`).value : '';
        const jnsVal = document.getElementById(`fil-jenis-surat-${jenis}`) ? document.getElementById(`fil-jenis-surat-${jenis}`).value : '';
        const katVal = document.getElementById(`fil-kategori-arsip`) ? document.getElementById(`fil-kategori-arsip`).value : '';

        data = data.filter(item => {
            let mTxt = true, mCb = true, mThn = true, mBln = true, mJns = true, mKat = true;
            let target = (item.nomor||item.nomorSPPK||item.nomorPK||'') + " " + (item.pengirim||item.tujuan||item.debitur||item.deskripsi||'');
            
            if(searchVal) mTxt = target.toLowerCase().includes(searchVal);
            if(cabVal && item.cabang) mCb = item.cabang.includes(cabVal) || item.cabang === cabVal;
            if(jnsVal && item.jenisSurat) mJns = item.jenisSurat === jnsVal;
            if(katVal && item.kategori) mKat = item.kategori === katVal;

            if(item.tanggal) { 
                const d = new Date(item.tanggal); 
                if(thnVal) mThn = d.getFullYear().toString() === thnVal; 
                if(blnVal) mBln = ("0"+(d.getMonth()+1)).slice(-2) === blnVal;
            }
            return mTxt && mCb && mThn && mBln && mJns && mKat;
        });

        data.sort((a, b) => {
            let da = new Date(a.tanggal), db = new Date(b.tanggal);
            let txtA = (a.pengirim||a.tujuan||a.debitur||a.deskripsi||'').toLowerCase(); let txtB = (b.pengirim||b.tujuan||b.debitur||b.deskripsi||'').toLowerCase();
            if(sortVal === 'newest') return db - da; if(sortVal === 'oldest') return da - db;
            if(sortVal === 'az') return txtA.localeCompare(textB); if(sortVal === 'za') return textB.localeCompare(textA);
        });
    }

    renderHTMLTabel(jenis, data, tbody);
}

function renderHTMLTabel(jenis, dataArray, tbody) {
    if (!dataArray || dataArray.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding:20px;">Belum ada data tersedia.</td></tr>`; return; }
    let html = '';
    
    if(jenis === 'jenis-surat') globalDataJenisSurat = [...dataArray]; 
    if(jenis === 'user') globalDataUser = [...dataArray]; 
    if(jenis === 'referensi-pk') globalDataRefPK = [...dataArray];

    dataArray.forEach(item => {
        let fileBtn = item.fileUrl ? `<a href="${item.fileUrl}" target="_blank" class="btn-icon"><i class="fa-solid fa-file-pdf text-danger"></i></a>` : `<span style="opacity:0.3; font-size:0.8rem;">-No File-</span>`;
        let s = (item.status || "").toLowerCase(); let badge = 'warning';
        if(s.includes('selesai') || s.includes('terkirim') || s.includes('sudah') || s.includes('aktif')) badge = 'success'; 
        if(s.includes('belum')) badge = 'danger'; 
        let statusBadge = `<span class="badge badge-${badge}">${item.status || '-'}</span>`;

        let editBtn = `<button class="btn-icon text-primary" title="Edit" onclick="editData('${jenis}', '${item.id}')"><i class="fa-solid fa-edit"></i></button>`;
        let delBtn = `<button class="btn-icon text-danger" title="Hapus" onclick="deleteData('delete${jenis.replace('-','')}', '${item.id}', '${jenis}')"><i class="fa-solid fa-trash"></i></button>`;
        let timeBtn = item.debitur ? `<button class="btn-icon text-info" title="SLA Timeline" onclick="showTimeline('${item.debitur}')"><i class="fa-solid fa-clock-rotate-left"></i></button>` : '';

        // Tampilan Baris Tabel
        if (jenis === 'cabang') html += `<tr><td><strong>${item.nama}</strong></td><td>${item.kodeSM}</td><td>${item.kodePK}</td><td>${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'jenis-surat') html += `<tr><td><strong>${item.kode}</strong></td><td>${item.nama}</td><td>${item.uraian}</td><td>${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'user') html += `<tr><td><strong>${item.username}</strong></td><td>${item.nama}</td><td>${item.role}</td><td>${item.jabatan}</td><td>${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'referensi-pk') html += `<tr><td><span class="badge badge-primary">${item.kategori}</span></td><td><strong>${item.kode}</strong></td><td>${item.uraian}</td><td>${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'surat-masuk') html += `<tr><td><strong>${item.nomor}</strong></td><td>${item.tanggal}</td><td>${item.pengirim}<br><small>Cab: ${item.cabang}</small></td><td>${item.perihal}</td><td>${statusBadge}</td><td>${item.jenisSurat==='D1'?timeBtn:''} ${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'surat-keluar') html += `<tr><td><strong>${item.nomor}</strong></td><td>${item.tanggal}</td><td>${item.tujuan}<br><small>Cab: ${item.cabang}</small></td><td>${item.perihal}</td><td>${statusBadge}</td><td>${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'sppk') html += `<tr><td><strong>${item.nomorSPPK}</strong></td><td>${item.tanggal}</td><td>${item.debitur}<br><small>Cab: ${item.cabang}</small></td><td>Rp ${parseFloat(item.plafon||0).toLocaleString('id-ID')}</td><td>${statusBadge}</td><td>${timeBtn} ${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'pk') html += `<tr><td><strong>${item.nomorPK||'-'}</strong></td><td>${item.sppkInduk}</td><td>${item.tanggal}</td><td>${item.debitur}<br><small>Cab: ${item.cabang}</small></td><td>Rp ${parseFloat(item.plafon||0).toLocaleString('id-ID')}</td><td>${statusBadge}</td><td>${timeBtn} ${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'arsip') html += `<tr><td><span class="badge badge-primary">${item.kategori}</span></td><td><strong>${item.nomor||'-'}</strong></td><td>${item.tanggal}</td><td>${item.deskripsi}</td><td>${fileBtn}</td></tr>`;
    });
    tbody.innerHTML = html;
}

// SLA TIMELINE
function showTimeline(debitur) {
    let tHtml = '';
    const smD1 = storeData['surat-masuk'].filter(d => d.jenisSurat === 'D1' && d.pengirim === debitur);
    smD1.forEach(d => { tHtml += `<div class="timeline-item"><div class="timeline-date">${d.tanggal}</div><div class="timeline-title">Surat Masuk (Pengajuan Kredit)</div><div class="timeline-desc">No: ${d.nomor}<br>Plafon: Rp ${parseFloat(d.plafon||0).toLocaleString('id-ID')}</div></div>`; });
    
    const sppk = storeData['sppk'].filter(d => d.debitur === debitur);
    sppk.forEach(d => { tHtml += `<div class="timeline-item"><div class="timeline-date">${d.tanggal}</div><div class="timeline-title">SPPK Diterbitkan</div><div class="timeline-desc">No: ${d.nomorSPPK}<br>Plafon Disetujui: Rp ${parseFloat(d.plafon||0).toLocaleString('id-ID')}</div></div>`; });
    
    const pk = storeData['pk'].filter(d => d.debitur === debitur);
    pk.forEach(d => { tHtml += `<div class="timeline-item"><div class="timeline-date">${d.tanggal}</div><div class="timeline-title">Perjanjian Kredit (PK) Selesai</div><div class="timeline-desc">No PK: ${d.nomorPK}<br>Status: Aktif</div></div>`; });

    if(tHtml === '') tHtml = '<p>Tidak ada riwayat untuk debitur ini.</p>';
    document.getElementById('timeline-debitur').innerText = `Riwayat SLA: ${debitur}`; 
    document.getElementById('timeline-content').innerHTML = tHtml; 
    openModal('modal-timeline');
}

// ==========================================
// --- MODAL FORM OPENERS (MASTER DATA) ---
// ==========================================

function openModalCabang() { document.getElementById('idCabang').value = ''; document.getElementById('namaCabang').value = ''; document.getElementById('kodeSMSK').value = ''; document.getElementById('kodePK').value = ''; document.getElementById('title-cabang').innerHTML = '<i class="fa-solid fa-code-branch text-primary"></i> Tambah Cabang'; openModal('modal-cabang'); }
function openModalJenisSurat() { document.getElementById('idJenisSurat').value = ''; document.getElementById('kodeJenis').value = ''; document.getElementById('namaJenis').value = ''; document.getElementById('uraianJenis').value = ''; document.getElementById('title-jenis-surat').innerHTML = '<i class="fa-solid fa-tags text-primary"></i> Tambah Jenis Surat'; openModal('modal-jenis-surat'); }
function openModalUser() { document.getElementById('idUser').value = ''; document.getElementById('namaLengkap').value = ''; document.getElementById('usernameLogin').value = ''; document.getElementById('jabatanUser').value = ''; document.getElementById('title-user').innerHTML = '<i class="fa-solid fa-user-plus text-primary"></i> Tambah User'; openModal('modal-user'); }
function openModalReferensiPK() { document.getElementById('idRefPK').value = ''; document.getElementById('kodeRefPK').value = ''; document.getElementById('descRefPK').value = ''; document.getElementById('title-referensi-pk').innerHTML = '<i class="fa-solid fa-list text-primary"></i> Tambah Referensi PK'; openModal('modal-referensi-pk'); }

// TRANSAKSI
function openModalSM() { document.getElementById('idSuratMasuk').value=''; document.getElementById('title-sm').innerHTML='<i class="fa-solid fa-inbox text-primary"></i> Tambah Surat Masuk'; toggleD1Fields(); openModal('modal-surat-masuk'); }
function openModalSK() { document.getElementById('idSuratKeluar').value=''; document.getElementById('title-sk').innerHTML='<i class="fa-solid fa-paper-plane text-success"></i> Buat Surat Keluar'; openModal('modal-surat-keluar'); }
function openModalSPPK() { 
    document.getElementById('idSPPK').value=''; document.getElementById('title-sppk').innerHTML='<i class="fa-solid fa-file-contract text-primary"></i> Input SPPK Baru'; 
    let ops = '<option value="">-- Manual / Pilih Sumber (D1) --</option>'; 
    
    // Filter D1 yang BELUM dibuatkan SPPK (Akan otomatis hide yang sudah terpakai)
    const usedD1 = storeData['sppk'].map(s => s.debitur);
    storeData['surat-masuk'].filter(d => d.jenisSurat === 'D1' && !usedD1.includes(d.pengirim)).forEach(d => { 
        ops += `<option value="${d.pengirim}">${d.nomor} - ${d.pengirim}</option>`; 
    }); 
    document.getElementById('sppk-sumber-d1').innerHTML = ops;
    openModal('modal-sppk'); 
}

function autofillSPPK() {
    const deb = document.getElementById('sppk-sumber-d1').value; const data = storeData['surat-masuk'].find(d => d.jenisSurat==='D1' && d.pengirim===deb);
    if(data) { document.getElementById('sppk-debitur').value = data.pengirim; document.getElementById('sppk-plafon').value = data.plafon; document.getElementById('sppk-jangkawaktu').value = data.jangkaWaktu; document.getElementById('sppk-jeniskredit').value = data.jenisKredit; }
}
function openModalPK() { document.getElementById('idPK').value=''; document.getElementById('title-pk').innerHTML='<i class="fa-solid fa-file-signature text-orange"></i> Terbitkan PK Baru'; populatePKForm(); openModal('modal-pk'); }

// ==========================================
// --- EDIT ROUTER ---
// ==========================================
// GANTI FUNGSI INI
function editData(jenis, id) {
    if (jenis === 'sppk') {
        const data = storeData[jenis].find(d => d.id === id); if(!data) return;
        // VALIDASI: SPPK yang sudah di-PK tidak boleh diedit
        if (data.status === 'Sudah PK') {
            showAlert('Akses Ditolak', 'SPPK ini sudah diterbitkan PK. Harap batalkan / hapus PK terlebih dahulu untuk mengubah data SPPK ini.', 'error');
            return;
        }
        document.getElementById('idSPPK').value = data.id; document.querySelector('#modal-sppk select[name="pilihCabang"]').value = storeData['cabang'].find(c=>c.kodePK===data.cabang)?.kodeSM+"|"+storeData['cabang'].find(c=>c.kodePK===data.cabang)?.kodePK; document.querySelector('#modal-sppk input[name="tanggalSPPK"]').value = data.tanggal; document.querySelector('#modal-sppk input[name="namaDebitur"]').value = data.debitur; document.querySelector('#modal-sppk input[name="plafon"]').value = data.plafon; document.querySelector('#modal-sppk input[name="jangkaWaktu"]').value = data.jangkaWaktu; document.querySelector('#modal-sppk select[name="jenisKredit"]').value = data.jenisKredit;
        document.getElementById('title-sppk').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit SPPK'; openModal('modal-sppk');
    } 
    // ... [Hanya timpa bagian 'sppk' saja atau paste fungsi lain yang tidak berubah]
    else if(jenis === 'surat-masuk') {
        const data = storeData[jenis].find(d => d.id === id); if(!data) return;
        document.getElementById('idSuratMasuk').value = data.id; document.querySelector('#modal-surat-masuk select[name="pilihCabang"]').value = storeData['cabang'].find(c=>c.kodeSM===data.cabang)?.kodeSM+"|"+storeData['cabang'].find(c=>c.kodeSM===data.cabang)?.kodePK; document.querySelector('#modal-surat-masuk input[name="tanggalSurat"]').value = data.tanggal; document.querySelector('#modal-surat-masuk select[name="jenisSurat"]').value = data.jenisSurat; toggleD1Fields();
        if(data.jenisSurat === 'D1') { document.getElementById('sm-nama-debitur').value = data.pengirim; document.getElementById('sm-plafon').value = data.plafon; document.getElementById('sm-jangkawaktu').value = data.jangkaWaktu; document.getElementById('sm-jeniskredit').value = data.jenisKredit; } else { document.getElementById('sm-pengirim').value = data.pengirim; document.getElementById('sm-perihal').value = data.perihal; }
        document.getElementById('title-sm').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit Surat Masuk'; openModal('modal-surat-masuk');
    } else if (jenis === 'surat-keluar') {
        const data = storeData[jenis].find(d => d.id === id); if(!data) return;
        document.getElementById('idSuratKeluar').value = data.id; document.querySelector('#modal-surat-keluar select[name="pilihCabang"]').value = storeData['cabang'].find(c=>c.kodeSM===data.cabang)?.kodeSM+"|"+storeData['cabang'].find(c=>c.kodeSM===data.cabang)?.kodePK; document.querySelector('#modal-surat-keluar select[name="jenisSurat"]').value = data.jenisSurat; document.querySelector('#modal-surat-keluar input[name="tujuan"]').value = data.tujuan; document.querySelector('#modal-surat-keluar input[name="perihal"]').value = data.perihal;
        document.getElementById('title-sk').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit Surat Keluar'; openModal('modal-surat-keluar');
    } else if (jenis === 'pk') {
        const data = storeData[jenis].find(d => d.id === id); if(!data) return;
        document.getElementById('idPK').value = data.id; populatePKForm(); setTimeout(() => { document.querySelector('#modal-pk select[name="nomorSPPK"]').value = data.sppkInduk; document.getElementById('pk-nama-debitur').value = data.debitur; document.getElementById('pk-plafon').value = data.plafon; document.querySelector('#modal-pk select[name="pilihCabang"]').value = storeData['cabang'].find(c=>c.kodePK===data.cabang)?.kodeSM+"|"+storeData['cabang'].find(c=>c.kodePK===data.cabang)?.kodePK; }, 500);
        document.getElementById('title-pk').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit PK'; openModal('modal-pk');
    } else if (jenis === 'cabang') {
        const data = storeData['cabang'].find(d => d.id === id); if(!data) return;
        document.getElementById('idCabang').value = data.id; document.getElementById('namaCabang').value = data.nama; document.getElementById('kodeSMSK').value = data.kodeSM; document.getElementById('kodePK').value = data.kodePK; document.getElementById('title-cabang').innerHTML = '<i class="fa-solid fa-edit text-primary"></i> Edit Cabang'; openModal('modal-cabang');
    } else if (jenis === 'jenis-surat') {
        const data = globalDataJenisSurat.find(d => d.id === id); if(!data) return;
        document.getElementById('idJenisSurat').value = data.id; document.getElementById('kodeJenis').value = data.kode; document.getElementById('namaJenis').value = data.nama; document.getElementById('uraianJenis').value = data.uraian; document.getElementById('title-jenis-surat').innerHTML = '<i class="fa-solid fa-edit text-primary"></i> Edit Jenis Surat'; openModal('modal-jenis-surat');
    } else if (jenis === 'user') {
        const data = globalDataUser.find(d => d.id === id); if(!data) return;
        document.getElementById('idUser').value = data.id; document.getElementById('namaLengkap').value = data.nama; document.getElementById('usernameLogin').value = data.username; document.getElementById('roleUser').value = data.role; document.getElementById('jabatanUser').value = data.jabatan; document.getElementById('title-user').innerHTML = '<i class="fa-solid fa-edit text-primary"></i> Edit User'; openModal('modal-user');
    } else if (jenis === 'referensi-pk') {
        const data = globalDataRefPK.find(d => d.id === id); if(!data) return;
        document.getElementById('idRefPK').value = data.id; document.getElementById('katRefPK').value = data.kategori; document.getElementById('kodeRefPK').value = data.kode; document.getElementById('descRefPK').value = data.uraian; document.getElementById('title-referensi-pk').innerHTML = '<i class="fa-solid fa-edit text-primary"></i> Edit Referensi PK'; openModal('modal-referensi-pk');
    }
}

// GANTI FUNGSI INI
async function deleteData(actionName, id, tableRef) {
    if (tableRef === 'sppk') {
        const dataSPPK = storeData['sppk'].find(d => d.id === id);
        if (dataSPPK && dataSPPK.status === 'Sudah PK') {
            showAlert('Akses Ditolak', 'SPPK ini sudah diterbitkan PK. Harap batalkan/hapus PK terlebih dahulu untuk menghapus data SPPK ini.', 'error');
            return;
        }
    }
    if(!confirm("Yakin ingin menghapus data ini?")) return;
    try { 
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: actionName, payload: { id: id } }) }); 
        const result = await response.json(); 
        if (result.status === 'success') { 
            showAlert('Dihapus', 'Data berhasil dihapus.', 'success'); 
            loadDataTabel(tableRef); 
            if(tableRef === 'pk') loadDataTabel('sppk'); // Reload SPPK agar dropdown form PK responsif
            if(tableRef === 'sppk') loadDataTabel('surat-masuk'); // Reload SM agar form SPPK responsif
            loadDashboardStats(); 
        } else showAlert('Gagal', result.message, 'error'); 
    } catch (e) { showAlert('Error', 'Gagal koneksi.', 'error'); }
}

// ==========================================
// --- FORM SUBMITTERS ---
// ==========================================

const getBase64 = (file) => new Promise((resolve, reject) => { if (!file) return resolve(null); const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve({ mimeType: file.type, filename: file.name, base64Data: r.result.split(',')[1] }); r.onerror = e => reject(e); });

async function sendFormData(action, payload, formEl, modalId, jenisMenuRef) {
    const btn = formEl.querySelector('button[type="submit"]'); const originalBtnHTML = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true;
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: action, payload: payload }) }); const result = await response.json();
        if (result.status === 'success') { 
            if(modalId) closeModal(modalId); 
            showAlert('Berhasil', result.message, 'success'); 
            if(modalId) formEl.reset(); 
            
            // Reload responsif multi-tabel
            if(jenisMenuRef) {
                if(Array.isArray(jenisMenuRef)) { jenisMenuRef.forEach(ref => loadDataTabel(ref)); } 
                else { loadDataTabel(jenisMenuRef); }
            }
            if(jenisMenuRef && !['user','jenis-surat','referensi-pk','cabang'].includes(jenisMenuRef)) loadDashboardStats(); 
        } else showAlert('Gagal', result.message, 'error');
    } catch (error) { showAlert('Koneksi Gagal', 'Gagal mengirim data.', 'error'); } finally { btn.innerHTML = originalBtnHTML; btn.disabled = false; }
}

// Master Data Submits
async function submitCabang(e) { e.preventDefault(); const f = e.target; sendFormData('saveCabang', { id: f.elements['idCabang'].value, nama: f.elements['namaCabang'].value, kodeSM: f.elements['kodeSMSK'].value, kodePK: f.elements['kodePK'].value }, f, 'modal-cabang', 'cabang'); }
async function submitJenisSurat(e) { e.preventDefault(); const f = e.target; sendFormData('saveJenisSurat', { id: f.elements['idJenisSurat'].value, kode: f.elements['kodeJenis'].value, nama: f.elements['namaJenis'].value, uraian: f.elements['uraianJenis'].value }, f, 'modal-jenis-surat', 'jenis-surat'); }
async function submitUser(e) { e.preventDefault(); const f = e.target; sendFormData('saveUser', { id: f.elements['idUser'].value, nama: f.elements['namaLengkap'].value, username: f.elements['usernameLogin'].value, role: f.elements['roleUser'].value, jabatan: f.elements['jabatanUser'].value }, f, 'modal-user', 'user'); }
async function submitReferensiPK(e) { e.preventDefault(); const f = e.target; sendFormData('saveReferensiPK', { id: f.elements['idRefPK'].value, kategori: f.elements['katRefPK'].value, kode: f.elements['kodeRefPK'].value, uraian: f.elements['descRefPK'].value }, f, 'modal-referensi-pk', 'referensi-pk'); }
async function submitConfig(e) { e.preventDefault(); const form = e.target; const payload = {}; Array.from(form.elements).forEach(el => { if(el.name) payload[el.name] = el.value; }); sendFormData('saveConfig', payload, form, null, null); setTimeout(loadConfig, 1000); }

// Transaksi Submits
async function submitSuratMasuk(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); const isD1 = f.elements['jenisSurat'].value === 'D1'; sendFormData('upsertSuratMasuk', { id: f.elements['idSuratMasuk'].value, cabangSMSK: c[0], jenisSurat: f.elements['jenisSurat'].value, tanggalSurat: f.elements['tanggalSurat'].value, pengirim: isD1 ? f.elements['namaDebiturD1'].value : f.elements['pengirim'].value, sifatSurat: f.elements['sifatSurat'].value, perihal: isD1 ? 'Pengajuan Kredit Baru' : f.elements['perihal'].value, plafon: isD1 ? f.elements['plafonD1'].value : '', jangkaWaktu: isD1 ? f.elements['jangkaWaktuD1'].value : '', jenisKredit: isD1 ? f.elements['jenisKreditD1'].value : '', file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-masuk', 'surat-masuk'); }
async function submitSuratKeluar(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); sendFormData('upsertSuratKeluar', { id: f.elements['idSuratKeluar'].value, cabangSMSK: c[0], jenisSurat: f.elements['jenisSurat'].value, tujuan: f.elements['tujuan'].value, perihal: f.elements['perihal'].value, penandatangan: f.elements['penandatangan'].value, sifat: f.elements['sifat'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-keluar', 'surat-keluar'); }
// Menggunakan Array reload agar dropdown tabel lain langsung update
async function submitSPPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); sendFormData('upsertSPPK', { id: f.elements['idSPPK'].value, cabangPK: c[1], tanggalSPPK: f.elements['tanggalSPPK'].value, namaDebitur: f.elements['namaDebitur'].value, jenisKredit: f.elements['jenisKredit'].value, plafon: f.elements['plafon'].value, jangkaWaktu: f.elements['jangkaWaktu'].value, tujuanKredit: f.elements['tujuanKredit'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-sppk', ['sppk', 'pk']); }
async function submitPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); sendFormData('upsertPK', { id: f.elements['idPK'].value, cabangPK: c[1], nomorSPPK: f.elements['nomorSPPK'].value, tanggalPK: f.elements['tanggalPK'].value, namaDebitur: f.elements['namaDebitur'].value, plafon: f.elements['plafon'].value, golDebitur: f.elements['golDebitur'].value, jnsPenggunaan: f.elements['jnsPenggunaan'].value, klasKredit: f.elements['klasKredit'].value, sektorEko: f.elements['sektorEko'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-pk', ['pk', 'sppk']); }

function populatePKForm() {
    let options = '<option value="">Pilih SPPK yang Disetujui...</option>'; storeData['sppk'].forEach(j => { if(j.status !== "Sudah PK") options += `<option value="${j.nomorSPPK}">${j.nomorSPPK} - ${j.debitur}</option>`; }); document.getElementById('select-sppk-induk').innerHTML = options;
    document.getElementById('select-sppk-induk').onchange = function(e) { const sel = storeData['sppk'].find(x => x.nomorSPPK === e.target.value); if(sel) { document.getElementById('pk-nama-debitur').value = sel.debitur; document.getElementById('pk-plafon').value = sel.plafon; const cbSel = document.getElementById('pk-cabang'); Array.from(cbSel.options).forEach(opt => { if(opt.value.includes(sel.cabang)) cbSel.value = opt.value; }); } };
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getReferensiPK' }) }).then(res => res.json()).then(result => {
        if(result.status === 'success') {
            let opsGol = '<option value="">Pilih...</option>', opsJns = '<option value="">Pilih...</option>', opsKlas = '<option value="">Pilih...</option>', opsSek = '<option value="">Pilih...</option>';
            result.data.forEach(j => { let txt = `<option value="${j.kode}">${j.kode} - ${j.uraian}</option>`; if(j.kategori === 'GolDebitur') opsGol += txt; else if(j.kategori === 'JnsPenggunaan') opsJns += txt; else if(j.kategori === 'KlasKredit') opsKlas += txt; else if(j.kategori === 'SektorEko') opsSek += txt; });
            document.getElementById('sel-goldebitur').innerHTML = opsGol; document.getElementById('sel-jnspenggunaan').innerHTML = opsJns; document.getElementById('sel-klaskredit').innerHTML = opsKlas; document.getElementById('sel-sektoreko').innerHTML = opsSek;
        }
    });
}

// ==== EXPORT PDF & WA ====
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

// LOGIN
function handleLogin(e) {
    e.preventDefault(); currentUser = { username: document.getElementById('login-username').value, role: document.getElementById('login-role').value }; document.getElementById('user-name').innerText = currentUser.username; document.getElementById('user-role').innerText = currentUser.role; if(currentUser.role !== 'Admin') document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none'); document.getElementById('login-screen').classList.add('hidden'); document.getElementById('main-screen').classList.remove('hidden'); loadDashboardStats();
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getCabang' }) }).then(res => res.json()).then(result => { if(result.status === 'success') { storeData['cabang'] = result.data; let options = '<option value="">Pilih Cabang...</option>'; result.data.forEach(j => options += `<option value="${j.kodeSM}|${j.kodePK}">${j.nama}</option>`); document.querySelectorAll('.sel-cabang-global').forEach(el => el.innerHTML = options); } });
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJenisSurat' }) }).then(res => res.json()).then(result => { if(result.status === 'success') { let options = '<option value="">Pilih Jenis Surat...</option>'; result.data.forEach(j => options += `<option value="${j.kode}">${j.kode} - ${j.nama}</option>`); if(document.getElementById('select-jenis-sm')) document.getElementById('select-jenis-sm').innerHTML = options; if(document.getElementById('select-jenis-sk')) document.getElementById('select-jenis-sk').innerHTML = options; } });
}
function handleLogout() { currentUser = null; document.getElementById('main-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('login-form').reset(); document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex'); }
window.onload = () => { if (document.getElementById('theme-icon')) document.getElementById('theme-icon').className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; };

// ========================================================
// --- UPGRADE UI/UX: SWIPE DOWN TO CLOSE MODAL (HP) ---
// ========================================================

let touchStartY = 0;
let currentDeltaY = 0;
let activeSwipeModal = null;
let isSwiping = false;

document.addEventListener('touchstart', (e) => {
    // Hanya aktif di layar HP (lebar maksimal 768px)
    if (window.innerWidth > 768) return;

    // Cari apakah sentuhan terjadi di dalam modal card
    const modal = e.target.closest('.modal-overlay:not(.hidden) .modal-card');
    if (!modal) return;
    
    // Cek apakah pengguna sedang scroll ke bawah di dalam form
    const form = modal.querySelector('form');
    if (form && form.contains(e.target) && form.scrollTop > 0) {
        return; // Biarkan pengguna men-scroll isi form
    }

    activeSwipeModal = modal;
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
    
    // Matikan animasi transisi sementara agar modal mengikuti jari tanpa delay
    activeSwipeModal.style.transition = 'none'; 
}, {passive: true});

document.addEventListener('touchmove', (e) => {
    if (!isSwiping || !activeSwipeModal) return;
    
    const form = activeSwipeModal.querySelector('form');
    // Jika pengguna mulai scroll form saat swipe, batalkan swipe
    if (form && form.contains(e.target) && form.scrollTop > 0 && currentDeltaY <= 0) {
        isSwiping = false;
        activeSwipeModal.style.transform = '';
        return;
    }

    const currentY = e.touches[0].clientY;
    currentDeltaY = currentY - touchStartY;

    // Hanya izinkan modal digeser ke arah BAWAH (currentDeltaY > 0)
    if (currentDeltaY > 0) {
        activeSwipeModal.style.transform = `translateY(${currentDeltaY}px)`;
        // Cegah layar background ikut ter-scroll
        if (e.cancelable) e.preventDefault(); 
    }
}, {passive: false});

document.addEventListener('touchend', () => {
    if (!isSwiping || !activeSwipeModal) return;
    isSwiping = false;
    
    // Kembalikan efek transisi membal (bouncy)
    activeSwipeModal.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    // Jika ditarik ke bawah lebih dari 120 pixel, TUTUP modal
    if (currentDeltaY > 120) { 
        activeSwipeModal.style.transform = 'translateY(100%)';
        const overlayId = activeSwipeModal.closest('.modal-overlay').id;
        
        setTimeout(() => {
            closeModal(overlayId);
            activeSwipeModal.style.transform = ''; // Reset posisi untuk dibuka lagi nanti
        }, 300); // Tunggu animasi selesai
    } else {
        // Jika tarikan kurang dari 120 pixel, KEMBALIKAN (snap back) ke atas
        activeSwipeModal.style.transform = 'translateY(0)';
        setTimeout(() => {
             if(activeSwipeModal) activeSwipeModal.style.transform = '';
        }, 400);
    }
    
    // Reset state
    activeSwipeModal = null;
    currentDeltaY = 0;
});
