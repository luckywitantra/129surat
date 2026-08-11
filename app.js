const API_URL = 'https://script.google.com/macros/s/AKfycbxj7uQSzJJLESto_xbCuQAw1iDEn-1_jNX68MlwLjtnmJqFpTOtsq2eOpBDZjpz648Y/exec';

let currentUser = null; let currentTheme = localStorage.getItem('theme') || 'light';
let storeData = { 'surat-masuk': [], 'surat-keluar': [], 'sppk': [], 'pk': [], 'arsip': [], 'cabang': [] };
document.documentElement.setAttribute('data-theme', currentTheme);

document.addEventListener('DOMContentLoaded', () => { initSystem(); });

async function initSystem() {
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'initApp' }) });
        const result = await response.json();
        if(result.status === 'success') { setTimeout(() => { document.getElementById('init-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); }, 800); } 
        else showAlert('Error Sistem', result.message, 'error');
    } catch (error) { setTimeout(() => { document.getElementById('init-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); showAlert('Mode Offline', 'UI berjalan tanpa koneksi.', 'info'); }, 1000); }
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
    const normal = document.getElementById('sm-normal-fields');
    const d1 = document.getElementById('sm-d1-fields');
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
    else if (['surat-masuk', 'surat-keluar', 'sppk', 'pk', 'arsip'].includes(page)) { buildFilterUI(page); loadDataTabel(page); }
    
    const titles = { 'dashboard': 'Dashboard', 'surat-masuk': 'Surat Masuk', 'surat-keluar': 'Surat Keluar', 'sppk': 'Data SPPK', 'pk': 'Data PK', 'arsip': 'Arsip Dokumen', 'laporan': 'Pusat Laporan', 'pengaturan': 'Pengaturan Sistem' }; document.getElementById('page-title').innerText = titles[page] || 'Aplikasi';
}

async function loadDashboardStats() {
    try { const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDashboardStats' }) }); const result = await response.json(); if (result.status === 'success') { document.getElementById('stat-sm').innerText = result.data.sm; document.getElementById('stat-sk').innerText = result.data.sk; document.getElementById('stat-sppk').innerText = result.data.sppk; document.getElementById('stat-pk').innerText = result.data.pk; } } catch (e) { console.error(e); }
}

function buildFilterUI(jenis) {
    const container = document.getElementById(`filter-${jenis}`); if(!container) return;
    container.innerHTML = `
        <div style="display:flex; gap:10px; margin-bottom:15px; flex-wrap:wrap; background:var(--bg-main); padding:15px; border-radius:8px; border:1px solid var(--border-color);">
            <input type="text" id="search-${jenis}" class="search-input" placeholder="Cari nama / nomor..." onkeyup="applyFilter('${jenis}')" style="flex:1; min-width:200px;">
            <select id="sort-${jenis}" class="search-input" onchange="applyFilter('${jenis}')">
                <option value="newest">Tanggal (Baru - Lama)</option><option value="oldest">Tanggal (Lama - Baru)</option>
                <option value="az">Abjad (A - Z)</option><option value="za">Abjad (Z - A)</option>
            </select>
            <select id="fil-cabang-${jenis}" class="search-input sel-cabang-filter" onchange="applyFilter('${jenis}')"><option value="">Semua Cabang</option></select>
            <select id="fil-tahun-${jenis}" class="search-input" onchange="applyFilter('${jenis}')">
                <option value="">Semua Tahun</option><option value="2026">2026</option><option value="2027">2027</option>
            </select>
        </div>`;
    populateCabangFilters();
}

function populateCabangFilters() {
    let options = '<option value="">Semua Cabang</option>'; storeData['cabang'].forEach(c => options += `<option value="${c.kodeSM}">${c.nama}</option>`);
    document.querySelectorAll('.sel-cabang-filter').forEach(el => { el.innerHTML = options; });
}

async function loadDataTabel(jenis) {
    const tbody = document.getElementById(`tbody-${jenis}`); if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--primary); padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Menarik data...</td></tr>`;

    let act = '';
    if (jenis === 'surat-masuk') act = 'getSuratMasuk'; else if (jenis === 'surat-keluar') act = 'getSuratKeluar'; else if (jenis === 'sppk') act = 'getSPPK'; else if (jenis === 'pk') act = 'getPK'; else if (jenis === 'arsip') act = 'getArsip';

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: act }) });
        const result = await response.json();
        if (result.status === 'success') {
            storeData[jenis] = result.data;
            applyFilter(jenis); 
        } else tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">${result.message}</td></tr>`;
    } catch (error) { tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Gagal memuat.</td></tr>`; }
}

function applyFilter(jenis) {
    if(!storeData[jenis]) return;
    let data = [...storeData[jenis]]; const tbody = document.getElementById(`tbody-${jenis}`); if(!tbody) return;
    const searchVal = document.getElementById(`search-${jenis}`) ? document.getElementById(`search-${jenis}`).value.toLowerCase() : '';
    const sortVal = document.getElementById(`sort-${jenis}`) ? document.getElementById(`sort-${jenis}`).value : 'newest';
    const cabVal = document.getElementById(`fil-cabang-${jenis}`) ? document.getElementById(`fil-cabang-${jenis}`).value : '';
    const thnVal = document.getElementById(`fil-tahun-${jenis}`) ? document.getElementById(`fil-tahun-${jenis}`).value : '';

    data = data.filter(item => {
        let textMatch = true, cabMatch = true, thnMatch = true;
        let textTarget = (item.nomor||item.nomorSPPK||item.nomorPK||'') + " " + (item.pengirim||item.tujuan||item.debitur||item.deskripsi||'');
        if(searchVal) textMatch = textTarget.toLowerCase().includes(searchVal);
        if(cabVal && item.cabang) cabMatch = item.cabang.includes(cabVal) || item.cabang === cabVal;
        if(item.tanggal && thnVal) { const d = new Date(item.tanggal); thnMatch = d.getFullYear().toString() === thnVal; }
        return textMatch && cabMatch && thnMatch;
    });

    data.sort((a, b) => {
        let da = new Date(a.tanggal), db = new Date(b.tanggal);
        let textA = (a.pengirim||a.tujuan||a.debitur||a.deskripsi||'').toLowerCase(); let textB = (b.pengirim||b.tujuan||b.debitur||b.deskripsi||'').toLowerCase();
        if(sortVal === 'newest') return db - da; if(sortVal === 'oldest') return da - db;
        if(sortVal === 'az') return textA.localeCompare(textB); if(sortVal === 'za') return textB.localeCompare(textA);
    });

    renderHTMLTabel(jenis, data, tbody);
}

function renderHTMLTabel(jenis, dataArray, tbody) {
    if (!dataArray || dataArray.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding:20px;">Belum ada data tersedia.</td></tr>`; return; }
    let html = '';
    dataArray.forEach(item => {
        let fileBtn = item.fileUrl ? `<a href="${item.fileUrl}" target="_blank" class="btn-icon"><i class="fa-solid fa-file-pdf text-danger"></i></a>` : `-`;
        let statusBadge = `<span class="badge badge-warning">${item.status || '-'}</span>`;

        let editBtn = `<button class="btn-icon text-primary" title="Edit" onclick="editData('${jenis}', '${item.id}')"><i class="fa-solid fa-edit"></i></button>`;
        let delBtn = `<button class="btn-icon text-danger" title="Hapus" onclick="deleteData('delete${jenis.replace('-','')}', '${item.id}', '${jenis}')"><i class="fa-solid fa-trash"></i></button>`;
        let timeBtn = item.debitur ? `<button class="btn-icon text-info" title="SLA Timeline" onclick="showTimeline('${item.debitur}')"><i class="fa-solid fa-clock-rotate-left"></i></button>` : '';

        if (jenis === 'surat-masuk') html += `<tr><td><strong>${item.nomor}</strong></td><td>${item.tanggal}</td><td>${item.pengirim}<br><small>Cab: ${item.cabang}</small></td><td>${item.perihal}</td><td>${statusBadge}</td><td>${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'surat-keluar') html += `<tr><td><strong>${item.nomor}</strong><br><small>${item.tujuan}</small></td><td>${item.tanggal}</td><td>${item.tujuan}<br><small>Cab: ${item.cabang}</small></td><td>${item.perihal}</td><td>${statusBadge}</td><td>${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'sppk') html += `<tr><td><strong>${item.nomorSPPK}</strong></td><td>${item.tanggal}</td><td>${item.debitur}<br><small>Cab: ${item.cabang}</small></td><td>Rp ${parseFloat(item.plafon||0).toLocaleString('id-ID')}</td><td>${statusBadge}</td><td>${timeBtn} ${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'pk') html += `<tr><td><strong>${item.nomorPK||'-'}</strong></td><td>${item.sppkInduk}</td><td>${item.tanggal}</td><td>${item.debitur}</td><td>Rp ${parseFloat(item.plafon||0).toLocaleString('id-ID')}</td><td>${statusBadge}</td><td>${timeBtn} ${fileBtn} ${editBtn} ${delBtn}</td></tr>`;
        else if (jenis === 'arsip') html += `<tr><td><span class="badge badge-primary">${item.kategori}</span></td><td><strong>${item.nomor||'-'}</strong></td><td>${item.tanggal}</td><td>${item.deskripsi}</td><td>${fileBtn}</td></tr>`;
    });
    tbody.innerHTML = html;
}

// SLA TIMELINE
function showTimeline(debitur) {
    let tHtml = '';
    // Cari di Surat Masuk (D1)
    const smD1 = storeData['surat-masuk'].filter(d => d.jenisSurat === 'D1' && d.pengirim === debitur);
    smD1.forEach(d => { tHtml += `<div class="timeline-item"><div class="timeline-date">${d.tanggal}</div><div class="timeline-title">Surat Masuk (Pengajuan Kredit)</div><div class="timeline-desc">No: ${d.nomor}<br>Plafon: Rp ${parseFloat(d.plafon||0).toLocaleString('id-ID')}</div></div>`; });
    
    // Cari di SPPK
    const sppk = storeData['sppk'].filter(d => d.debitur === debitur);
    sppk.forEach(d => { tHtml += `<div class="timeline-item"><div class="timeline-date">${d.tanggal}</div><div class="timeline-title">SPPK Diterbitkan</div><div class="timeline-desc">No: ${d.nomorSPPK}<br>Plafon Disetujui: Rp ${parseFloat(d.plafon||0).toLocaleString('id-ID')}</div></div>`; });
    
    // Cari di PK
    const pk = storeData['pk'].filter(d => d.debitur === debitur);
    pk.forEach(d => { tHtml += `<div class="timeline-item"><div class="timeline-date">${d.tanggal}</div><div class="timeline-title">Perjanjian Kredit (PK) Selesai</div><div class="timeline-desc">No PK: ${d.nomorPK}<br>Status: Aktif</div></div>`; });

    if(tHtml === '') tHtml = '<p>Tidak ada riwayat untuk debitur ini.</p>';
    document.getElementById('timeline-debitur').innerText = `Riwayat SLA: ${debitur}`;
    document.getElementById('timeline-content').innerHTML = tHtml;
    openModal('modal-timeline');
}

// CRUD & MODALS
function openModalSM() { document.getElementById('idSuratMasuk').value=''; document.getElementById('title-sm').innerHTML='<i class="fa-solid fa-inbox text-primary"></i> Tambah Surat Masuk'; openModal('modal-surat-masuk'); }
function openModalSK() { document.getElementById('idSuratKeluar').value=''; document.getElementById('title-sk').innerHTML='<i class="fa-solid fa-paper-plane text-success"></i> Buat Surat Keluar'; openModal('modal-surat-keluar'); }
function openModalSPPK() { 
    document.getElementById('idSPPK').value=''; document.getElementById('title-sppk').innerHTML='<i class="fa-solid fa-file-contract text-primary"></i> Input SPPK Baru'; 
    // Load D1 ke dropdown
    let ops = '<option value="">-- Pilih Sumber dari Surat Masuk (D1) --</option>';
    storeData['surat-masuk'].filter(d => d.jenisSurat==='D1').forEach(d => { ops += `<option value="${d.pengirim}">${d.nomor} - ${d.pengirim}</option>`; });
    document.getElementById('sppk-sumber-d1').innerHTML = ops;
    openModal('modal-sppk'); 
}
function autofillSPPK() {
    const deb = document.getElementById('sppk-sumber-d1').value;
    const data = storeData['surat-masuk'].find(d => d.jenisSurat==='D1' && d.pengirim===deb);
    if(data) { document.getElementById('sppk-debitur').value = data.pengirim; document.getElementById('sppk-plafon').value = data.plafon; document.getElementById('sppk-jangkawaktu').value = data.jangkaWaktu; document.getElementById('sppk-jeniskredit').value = data.jenisKredit; }
}

function openModalPK() { document.getElementById('idPK').value=''; document.getElementById('title-pk').innerHTML='<i class="fa-solid fa-file-signature text-orange"></i> Terbitkan PK Baru'; populatePKForm(); openModal('modal-pk'); }

function editData(jenis, id) {
    const data = storeData[jenis].find(d => d.id === id); if(!data) return;
    if(jenis === 'surat-masuk') {
        document.getElementById('idSuratMasuk').value = data.id; document.querySelector('#modal-surat-masuk select[name="pilihCabang"]').value = data.cabang; document.querySelector('#modal-surat-masuk input[name="tanggalSurat"]').value = data.tanggal; document.querySelector('#modal-surat-masuk select[name="jenisSurat"]').value = data.jenisSurat;
        toggleD1Fields();
        if(data.jenisSurat === 'D1') { document.getElementById('sm-nama-debitur').value = data.pengirim; document.getElementById('sm-plafon').value = data.plafon; document.getElementById('sm-jangkawaktu').value = data.jangkaWaktu; document.getElementById('sm-jeniskredit').value = data.jenisKredit; } 
        else { document.getElementById('sm-pengirim').value = data.pengirim; document.getElementById('sm-perihal').value = data.perihal; }
        document.getElementById('title-sm').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit Surat Masuk'; openModal('modal-surat-masuk');
    } else if (jenis === 'surat-keluar') {
        document.getElementById('idSuratKeluar').value = data.id; document.querySelector('#modal-surat-keluar select[name="pilihCabang"]').value = data.cabang; document.querySelector('#modal-surat-keluar select[name="jenisSurat"]').value = data.jenisSurat; document.querySelector('#modal-surat-keluar input[name="tujuan"]').value = data.tujuan; document.querySelector('#modal-surat-keluar input[name="perihal"]').value = data.perihal;
        document.getElementById('title-sk').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit Surat Keluar'; openModal('modal-surat-keluar');
    } else if (jenis === 'sppk') {
        document.getElementById('idSPPK').value = data.id; document.querySelector('#modal-sppk select[name="pilihCabang"]').value = data.cabang; document.querySelector('#modal-sppk input[name="tanggalSPPK"]').value = data.tanggal; document.querySelector('#modal-sppk input[name="namaDebitur"]').value = data.debitur; document.querySelector('#modal-sppk input[name="plafon"]').value = data.plafon; document.querySelector('#modal-sppk input[name="jangkaWaktu"]').value = data.jangkaWaktu;
        document.getElementById('title-sppk').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit SPPK'; openModal('modal-sppk');
    } else if (jenis === 'pk') {
        document.getElementById('idPK').value = data.id; document.querySelector('#modal-pk select[name="pilihCabang"]').value = data.cabang; populatePKForm(); setTimeout(() => { document.querySelector('#modal-pk select[name="nomorSPPK"]').value = data.sppkInduk; document.getElementById('pk-nama-debitur').value = data.debitur; document.getElementById('pk-plafon').value = data.plafon; }, 500);
        document.getElementById('title-pk').innerHTML='<i class="fa-solid fa-edit text-primary"></i> Edit PK'; openModal('modal-pk');
    }
}

async function deleteData(actionName, id, tableRef) {
    if(!confirm("Yakin ingin menghapus data ini?")) return;
    try { const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: actionName, payload: { id: id } }) }); const result = await response.json(); if (result.status === 'success') { showAlert('Dihapus', 'Data berhasil dihapus.', 'success'); loadDataTabel(tableRef); } else showAlert('Gagal', result.message, 'error'); } catch (e) { showAlert('Error', 'Gagal koneksi.', 'error'); }
}

const getBase64 = (file) => new Promise((resolve, reject) => { if (!file) return resolve(null); const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve({ mimeType: file.type, filename: file.name, base64Data: r.result.split(',')[1] }); r.onerror = e => reject(e); });

async function sendFormData(action, payload, formEl, modalId, jenisMenuRef) {
    const btn = formEl.querySelector('button[type="submit"]'); const originalBtnHTML = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true;
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: action, payload: payload }) }); const result = await response.json();
        if (result.status === 'success') { closeModal(modalId); showAlert('Berhasil', result.message, 'success'); formEl.reset(); loadDataTabel(jenisMenuRef); loadDashboardStats(); } else showAlert('Gagal', result.message, 'error');
    } catch (error) { showAlert('Koneksi Gagal', 'Gagal mengirim data.', 'error'); } finally { btn.innerHTML = originalBtnHTML; btn.disabled = false; }
}

async function submitSuratMasuk(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const isD1 = f.elements['jenisSurat'].value === 'D1'; sendFormData('upsertSuratMasuk', { id: f.elements['idSuratMasuk'].value, cabangSMSK: f.elements['pilihCabang'].value, jenisSurat: f.elements['jenisSurat'].value, tanggalSurat: f.elements['tanggalSurat'].value, pengirim: isD1 ? f.elements['namaDebiturD1'].value : f.elements['pengirim'].value, sifatSurat: f.elements['sifatSurat'].value, perihal: isD1 ? 'Pengajuan Kredit Baru' : f.elements['perihal'].value, plafon: isD1 ? f.elements['plafonD1'].value : '', jangkaWaktu: isD1 ? f.elements['jangkaWaktuD1'].value : '', jenisKredit: isD1 ? f.elements['jenisKreditD1'].value : '', file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-masuk', 'surat-masuk'); }
async function submitSuratKeluar(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; sendFormData('upsertSuratKeluar', { id: f.elements['idSuratKeluar'].value, cabangSMSK: f.elements['pilihCabang'].value, jenisSurat: f.elements['jenisSurat'].value, tujuan: f.elements['tujuan'].value, perihal: f.elements['perihal'].value, penandatangan: f.elements['penandatangan'].value, sifat: f.elements['sifat'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-keluar', 'surat-keluar'); }
async function submitSPPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; sendFormData('upsertSPPK', { id: f.elements['idSPPK'].value, cabangPK: f.elements['pilihCabang'].value, tanggalSPPK: f.elements['tanggalSPPK'].value, namaDebitur: f.elements['namaDebitur'].value, jenisKredit: f.elements['jenisKredit'].value, plafon: f.elements['plafon'].value, jangkaWaktu: f.elements['jangkaWaktu'].value, tujuanKredit: f.elements['tujuanKredit'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-sppk', 'sppk'); }
async function submitPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; sendFormData('upsertPK', { id: f.elements['idPK'].value, cabangPK: f.elements['pilihCabang'].value, nomorSPPK: f.elements['nomorSPPK'].value, tanggalPK: f.elements['tanggalPK'].value, namaDebitur: f.elements['namaDebitur'].value, plafon: f.elements['plafon'].value, golDebitur: f.elements['golDebitur'].value, jnsPenggunaan: f.elements['jnsPenggunaan'].value, klasKredit: f.elements['klasKredit'].value, sektorEko: f.elements['sektorEko'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-pk', 'pk'); }

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
    const container = document.getElementById('pdf-container'); container.innerHTML = `<h2 style="text-align:center; font-family:sans-serif;">Laporan Data ${jenis.toUpperCase()}</h2><br>${tableHtml}`; container.style.display = "block";
    html2pdf().set({ margin: 0.5, filename: `Laporan_${jenis}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(container).save().then(()=> { container.style.display = "none"; });
}
function generateLaporanWA() {
    const jenis = document.getElementById('lap-jenis').value; const cabang = document.getElementById('lap-cabang').value; let data = storeData[jenis] || []; if(cabang) data = data.filter(d => d.cabang === cabang || (d.cabang && d.cabang.includes(cabang)));
    let text = `*Ringkasan Laporan ${jenis.toUpperCase()}*\nCabang: ${cabang || 'Semua Cabang'}\nTotal Data: ${data.length}\n\n`;
    data.slice(0, 15).forEach((d, i) => { let no = d.nomor || d.nomorSPPK || d.nomorPK || "-"; let info = d.pengirim || d.tujuan || d.debitur || d.deskripsi || "-"; text += `${i+1}. ${no} | ${info} (${d.status})\n`; }); if(data.length > 15) text += `\n...dan ${data.length - 15} data lainnya.`; text += `\n_Digenerate otomatis oleh Sistem Manajemen Surat & Kredit_`;
    navigator.clipboard.writeText(text).then(()=>showAlert('Sukses', 'Teks laporan berhasil disalin ke clipboard!', 'success'));
}

function handleLogin(e) {
    e.preventDefault(); currentUser = { username: document.getElementById('login-username').value, role: document.getElementById('login-role').value }; document.getElementById('user-name').innerText = currentUser.username; document.getElementById('user-role').innerText = currentUser.role; if(currentUser.role !== 'Admin') document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none'); document.getElementById('login-screen').classList.add('hidden'); document.getElementById('main-screen').classList.remove('hidden'); loadDashboardStats();
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getCabang' }) }).then(res => res.json()).then(result => { if(result.status === 'success') { storeData['cabang'] = result.data; let options = '<option value="">Pilih Cabang...</option>'; result.data.forEach(j => options += `<option value="${j.kodeSM}|${j.kodePK}">${j.nama}</option>`); document.querySelectorAll('.sel-cabang-global').forEach(el => el.innerHTML = options); } });
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJenisSurat' }) }).then(res => res.json()).then(result => { if(result.status === 'success') { let options = '<option value="">Pilih Jenis Surat...</option>'; result.data.forEach(j => options += `<option value="${j.kode}">${j.kode} - ${j.nama}</option>`); if(document.getElementById('select-jenis-sm')) document.getElementById('select-jenis-sm').innerHTML = options; if(document.getElementById('select-jenis-sk')) document.getElementById('select-jenis-sk').innerHTML = options; } });
}
function handleLogout() { currentUser = null; document.getElementById('main-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('login-form').reset(); document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex'); }
window.onload = () => { if (document.getElementById('theme-icon')) document.getElementById('theme-icon').className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; };
