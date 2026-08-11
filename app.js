const API_URL = 'https://script.google.com/macros/s/AKfycbxj7uQSzJJLESto_xbCuQAw1iDEn-1_jNX68MlwLjtnmJqFpTOtsq2eOpBDZjpz648Y/exec';

let currentUser = null; let currentTheme = localStorage.getItem('theme') || 'light';
let storeData = { 'surat-masuk': [], 'surat-keluar': [], 'sppk': [], 'pk': [], 'arsip': [], 'cabang': [] };
let globalDataJenisSurat = []; let globalDataUser = []; let globalDataRefPK = [];

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
function showAlert(title, message, type) { document.getElementById('alert-title').innerText = title; document.getElementById('alert-message').innerText = message; const icon = document.getElementById('alert-icon'); if(type === 'success') icon.innerHTML = '<i class="fa-solid fa-check-circle icon-success"></i>'; else if(type === 'error') icon.innerHTML = '<i class="fa-solid fa-circle-xmark icon-error"></i>'; else icon.innerHTML = '<i class="fa-solid fa-circle-info icon-info"></i>'; document.getElementById('custom-alert').classList.remove('hidden'); }

// ==========================================
// --- NAVIGATION & DYNAMIC FETCHING ---
// ==========================================
function navigate(page) {
    document.getElementById('sidebar').classList.remove('open'); document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); event.currentTarget.classList.add('active');
    ['dashboard', 'surat-masuk', 'surat-keluar', 'disposisi', 'sppk', 'pk', 'arsip', 'laporan', 'pengaturan'].forEach(v => { const el = document.getElementById(`view-${v}`); if(el) el.classList.add('hidden'); });
    const targetEl = document.getElementById(`view-${page}`); if(targetEl) targetEl.classList.remove('hidden');

    if (page === 'dashboard') loadDashboardStats();
    else if (page === 'pengaturan') { loadDataTabel('jenis-surat'); loadDataTabel('user'); loadDataTabel('referensi-pk'); loadDataTabel('cabang'); loadConfig(); }
    else if (page === 'laporan') { loadDataTabel('cabang'); }
    else if (['surat-masuk', 'surat-keluar', 'sppk', 'pk', 'arsip'].includes(page)) { buildFilterUI(page); loadDataTabel(page); }
    
    const titles = { 'dashboard': 'Dashboard', 'surat-masuk': 'Surat Masuk', 'surat-keluar': 'Surat Keluar', 'sppk': 'Data SPPK', 'pk': 'Data PK', 'arsip': 'Arsip Dokumen', 'laporan': 'Pusat Laporan', 'pengaturan': 'Pengaturan Sistem' }; document.getElementById('page-title').innerText = titles[page] || 'Aplikasi';
}

async function loadConfig() { try { const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getConfig' }) }); const result = await response.json(); if (result.status === 'success') { const form = document.getElementById('form-config'); for(let key in result.data) { if(form.elements[key]) form.elements[key].value = result.data[key]; } } } catch (e) { console.error(e); } }
async function loadDashboardStats() { try { const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDashboardStats' }) }); const result = await response.json(); if (result.status === 'success') { document.getElementById('stat-sm').innerText = result.data.sm; document.getElementById('stat-sk').innerText = result.data.sk; document.getElementById('stat-sppk').innerText = result.data.sppk; document.getElementById('stat-pk').innerText = result.data.pk; } } catch (e) { console.error(e); } }

// UI FILTER BUILDER
function buildFilterUI(jenis) {
    const container = document.getElementById(`filter-${jenis}`);
    if(!container) return;
    container.innerHTML = `
        <div style="display:flex; gap:10px; margin-bottom:15px; flex-wrap:wrap; background:var(--bg-main); padding:15px; border-radius:8px; border:1px solid var(--border-color);">
            <input type="text" id="search-${jenis}" class="search-input" placeholder="Cari nama / nomor..." onkeyup="applyFilter('${jenis}')" style="flex:1; min-width:200px;">
            <select id="sort-${jenis}" class="search-input" onchange="applyFilter('${jenis}')">
                <option value="newest">Terbaru - Terlama</option>
                <option value="oldest">Terlama - Terbaru</option>
                <option value="az">Abjad (A - Z)</option>
                <option value="za">Abjad (Z - A)</option>
            </select>
            <select id="fil-cabang-${jenis}" class="search-input sel-cabang-filter" onchange="applyFilter('${jenis}')"><option value="">Semua Cabang</option></select>
            <select id="fil-bulan-${jenis}" class="search-input" onchange="applyFilter('${jenis}')">
                <option value="">Semua Bulan</option><option value="01">Jan</option><option value="02">Feb</option><option value="03">Mar</option><option value="04">Apr</option><option value="05">Mei</option><option value="06">Jun</option><option value="07">Jul</option><option value="08">Agu</option><option value="09">Sep</option><option value="10">Okt</option><option value="11">Nov</option><option value="12">Des</option>
            </select>
            <select id="fil-tahun-${jenis}" class="search-input" onchange="applyFilter('${jenis}')">
                <option value="">Semua Tahun</option><option value="2026">2026</option><option value="2027">2027</option>
            </select>
        </div>`;
    populateCabangFilters();
}

function populateCabangFilters() {
    let options = '<option value="">Semua Cabang</option>';
    storeData['cabang'].forEach(c => options += `<option value="${c.kodeSM}">${c.nama}</option>`);
    document.querySelectorAll('.sel-cabang-filter').forEach(el => { el.innerHTML = options; });
}

// FETCH AND RENDER
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
                applyFilter(jenis); // Apply filter triggers render
            } else {
                renderHTMLTabel(jenis, result.data, tbody);
            }
        } else tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">${result.message}</td></tr>`;
    } catch (error) { tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Gagal memuat.</td></tr>`; }
}

function applyFilter(jenis) {
    if(!storeData[jenis]) return;
    let data = [...storeData[jenis]];
    const tbody = document.getElementById(`tbody-${jenis}`); if(!tbody) return;

    // Get filter values if UI exists
    const searchVal = document.getElementById(`search-${jenis}`) ? document.getElementById(`search-${jenis}`).value.toLowerCase() : '';
    const sortVal = document.getElementById(`sort-${jenis}`) ? document.getElementById(`sort-${jenis}`).value : 'newest';
    const cabVal = document.getElementById(`fil-cabang-${jenis}`) ? document.getElementById(`fil-cabang-${jenis}`).value : '';
    const blnVal = document.getElementById(`fil-bulan-${jenis}`) ? document.getElementById(`fil-bulan-${jenis}`).value : '';
    const thnVal = document.getElementById(`fil-tahun-${jenis}`) ? document.getElementById(`fil-tahun-${jenis}`).value : '';

    // Filter
    data = data.filter(item => {
        let textMatch = true, cabMatch = true, blnMatch = true, thnMatch = true;
        
        let textTarget = (item.nomor||item.nomorSPPK||item.nomorPK||'') + " " + (item.pengirim||item.tujuan||item.debitur||item.deskripsi||'');
        if(searchVal) textMatch = textTarget.toLowerCase().includes(searchVal);
        
        if(cabVal && item.cabang) cabMatch = item.cabang.includes(cabVal) || item.cabang === cabVal;
        
        if(item.tanggal) {
            const d = new Date(item.tanggal);
            if(blnVal) blnMatch = (("0"+(d.getMonth()+1)).slice(-2)) === blnVal;
            if(thnVal) thnMatch = d.getFullYear().toString() === thnVal;
        }
        return textMatch && cabMatch && blnMatch && thnMatch;
    });

    // Sort
    data.sort((a, b) => {
        let da = new Date(a.tanggal), db = new Date(b.tanggal);
        let textA = (a.pengirim||a.tujuan||a.debitur||a.deskripsi||'').toLowerCase();
        let textB = (b.pengirim||b.tujuan||b.debitur||b.deskripsi||'').toLowerCase();

        if(sortVal === 'newest') return db - da;
        if(sortVal === 'oldest') return da - db;
        if(sortVal === 'az') return textA.localeCompare(textB);
        if(sortVal === 'za') return textB.localeCompare(textA);
    });

    renderHTMLTabel(jenis, data, tbody);
}

function renderHTMLTabel(jenis, dataArray, tbody) {
    if (!dataArray || dataArray.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding:20px;">Belum ada data tersedia.</td></tr>`; return; }
    let html = '';
    if(jenis === 'jenis-surat') globalDataJenisSurat = [...dataArray]; if(jenis === 'user') globalDataUser = [...dataArray]; if(jenis === 'referensi-pk') globalDataRefPK = [...dataArray];

    dataArray.forEach(item => {
        let fileBtn = item.fileUrl ? `<a href="${item.fileUrl}" target="_blank" class="btn-icon"><i class="fa-solid fa-file-pdf text-danger"></i></a>` : `-`;
        let s = (item.status || "").toLowerCase(); let badge = 'warning';
        if(s.includes('selesai') || s.includes('terkirim') || s.includes('sudah') || s.includes('aktif')) badge = 'success'; if(s.includes('belum')) badge = 'danger'; let statusBadge = `<span class="badge badge-${badge}">${item.status || '-'}</span>`;

        if (jenis === 'cabang') html += `<tr><td><strong>${item.nama}</strong></td><td>${item.kodeSM}</td><td>${item.kodePK}</td><td><button class="btn-icon text-danger" onclick="deleteData('deleteCabang', '${item.id}', 'cabang')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        else if (jenis === 'jenis-surat') html += `<tr><td><strong>${item.kode}</strong></td><td>${item.nama}</td><td>${item.uraian}</td><td><button class="btn-icon text-danger" onclick="deleteData('deleteJenisSurat', '${item.id}', 'jenis-surat')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        else if (jenis === 'user') html += `<tr><td><strong>${item.username}</strong></td><td>${item.nama}</td><td>${item.role}</td><td>${item.jabatan}</td><td><button class="btn-icon text-danger" onclick="deleteData('deleteUser', '${item.id}', 'user')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        else if (jenis === 'referensi-pk') html += `<tr><td><span class="badge badge-primary">${item.kategori}</span></td><td><strong>${item.kode}</strong></td><td>${item.uraian}</td><td><button class="btn-icon text-danger" onclick="deleteData('deleteReferensiPK', '${item.id}', 'referensi-pk')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        else if (jenis === 'surat-masuk') html += `<tr><td><strong>${item.nomor}</strong></td><td>${item.tanggal}</td><td>${item.pengirim}<br><small>Cab: ${item.cabang}</small></td><td>${item.perihal}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        else if (jenis === 'surat-keluar') html += `<tr><td><strong>${item.nomor}</strong></td><td>${item.tanggal}</td><td>${item.tujuan}<br><small>Cab: ${item.cabang}</small></td><td>${item.perihal}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        else if (jenis === 'sppk') html += `<tr><td><strong>${item.nomorSPPK}</strong></td><td>${item.tanggal}</td><td>${item.debitur}<br><small>Cab: ${item.cabang}</small></td><td>Rp ${parseFloat(item.plafon||0).toLocaleString('id-ID')}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        else if (jenis === 'pk') html += `<tr><td><strong>${item.nomorPK||'-'}</strong></td><td>${item.sppkInduk}</td><td>${item.tanggal}</td><td>${item.debitur}<br><small>Cab: ${item.cabang}</small></td><td>Rp ${parseFloat(item.plafon||0).toLocaleString('id-ID')}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        else if (jenis === 'arsip') html += `<tr><td><span class="badge badge-primary">${item.kategori}</span></td><td><strong>${item.nomor||'-'}</strong></td><td>${item.tanggal}</td><td>${item.deskripsi}<br><small>Cab: ${item.cabang}</small></td><td>${fileBtn}</td></tr>`;
    });
    tbody.innerHTML = html;
}

// ==== AUTO-FILL PK FORM ====
function populatePKForm() {
    let options = '<option value="">Pilih SPPK yang Disetujui...</option>';
    storeData['sppk'].forEach(j => { if(j.status !== "Sudah PK") options += `<option value="${j.nomorSPPK}">${j.nomorSPPK} - ${j.debitur}</option>`; });
    document.getElementById('select-sppk-induk').innerHTML = options;

    // Trigger Auto-Fill
    document.getElementById('select-sppk-induk').onchange = function(e) {
        const sel = storeData['sppk'].find(x => x.nomorSPPK === e.target.value);
        if(sel) {
            document.getElementById('pk-nama-debitur').value = sel.debitur;
            document.getElementById('pk-plafon').value = sel.plafon;
            // set auto cabang based on sppk
            const cbSel = document.getElementById('pk-cabang');
            Array.from(cbSel.options).forEach(opt => { if(opt.value.includes(sel.cabang)) cbSel.value = opt.value; });
        } else {
            document.getElementById('pk-nama-debitur').value = '';
            document.getElementById('pk-plafon').value = '';
        }
    };

    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getReferensiPK' }) }).then(res => res.json()).then(result => {
        if(result.status === 'success') {
            let opsGol = '<option value="">Pilih...</option>', opsJns = '<option value="">Pilih...</option>', opsKlas = '<option value="">Pilih...</option>', opsSek = '<option value="">Pilih...</option>';
            result.data.forEach(j => {
                let txt = `<option value="${j.kode}">${j.kode} - ${j.uraian}</option>`;
                if(j.kategori === 'GolDebitur') opsGol += txt; else if(j.kategori === 'JnsPenggunaan') opsJns += txt; else if(j.kategori === 'KlasKredit') opsKlas += txt; else if(j.kategori === 'SektorEko') opsSek += txt;
            });
            document.getElementById('sel-goldebitur').innerHTML = opsGol; document.getElementById('sel-jnspenggunaan').innerHTML = opsJns; document.getElementById('sel-klaskredit').innerHTML = opsKlas; document.getElementById('sel-sektoreko').innerHTML = opsSek;
        }
    });
}

// ==== EXPORT LAPORAN PDF & WA ====
function generateLaporanPDF() {
    const jenis = document.getElementById('lap-jenis').value;
    const cabang = document.getElementById('lap-cabang').value;
    let data = storeData[jenis] || [];
    if(cabang) data = data.filter(d => d.cabang === cabang || (d.cabang && d.cabang.includes(cabang)));
    
    let tableHtml = `<table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:12px; font-family:sans-serif;">`;
    tableHtml += `<thead><tr style="background:#f0f0f0;"><th>Tanggal</th><th>Nomor</th><th>Keterangan / Tujuan / Debitur</th><th>Status</th></tr></thead><tbody>`;
    data.forEach(d => {
        let no = d.nomor || d.nomorSPPK || d.nomorPK || "-";
        let info = d.pengirim || d.tujuan || d.debitur || d.deskripsi || "-";
        if(d.plafon) info += `<br>Rp ${parseFloat(d.plafon).toLocaleString('id-ID')}`;
        tableHtml += `<tr><td>${d.tanggal}</td><td>${no}</td><td>${info}</td><td>${d.status}</td></tr>`;
    });
    tableHtml += `</tbody></table>`;

    const container = document.getElementById('pdf-container');
    container.innerHTML = `<h2 style="text-align:center; font-family:sans-serif;">Laporan Data ${jenis.toUpperCase()}</h2><br>${tableHtml}`;
    container.style.display = "block";

    const opt = { margin: 0.5, filename: `Laporan_${jenis}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    html2pdf().set(opt).from(container).save().then(()=> { container.style.display = "none"; });
}

function generateLaporanWA() {
    const jenis = document.getElementById('lap-jenis').value;
    const cabang = document.getElementById('lap-cabang').value;
    let data = storeData[jenis] || [];
    if(cabang) data = data.filter(d => d.cabang === cabang || (d.cabang && d.cabang.includes(cabang)));
    
    let text = `*Ringkasan Laporan ${jenis.toUpperCase()}*\nCabang: ${cabang || 'Semua Cabang'}\nTotal Data: ${data.length}\n\n`;
    data.slice(0, 15).forEach((d, i) => { // limit WA text length
        let no = d.nomor || d.nomorSPPK || d.nomorPK || "-";
        let info = d.pengirim || d.tujuan || d.debitur || d.deskripsi || "-";
        text += `${i+1}. ${no} | ${info} (${d.status})\n`;
    });
    if(data.length > 15) text += `\n...dan ${data.length - 15} data lainnya.`;
    text += `\n_Digenerate otomatis oleh Sistem Manajemen Surat & Kredit_`;
    
    navigator.clipboard.writeText(text).then(()=>showAlert('Sukses', 'Teks laporan berhasil disalin ke clipboard!', 'success'));
}

// ==== UNIVERSAL FORM SENDER ====
const getBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) return resolve(null); const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve({ mimeType: file.type, filename: file.name, base64Data: r.result.split(',')[1] }); r.onerror = e => reject(e);
});

async function sendFormData(action, payload, formEl, modalId, jenisMenuRef) {
    const btn = formEl.querySelector('button[type="submit"]'); const originalBtnHTML = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true;
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: action, payload: payload }) }); const result = await response.json();
        if (result.status === 'success') { if(modalId) closeModal(modalId); showAlert('Berhasil', result.message, 'success'); if(modalId) formEl.reset(); if(jenisMenuRef) loadDataTabel(jenisMenuRef); if(jenisMenuRef && !['user','jenis-surat','referensi-pk','cabang'].includes(jenisMenuRef)) loadDashboardStats(); } else showAlert('Gagal', result.message, 'error');
    } catch (error) { showAlert('Koneksi Gagal', 'Gagal mengirim data.', 'error'); } finally { btn.innerHTML = originalBtnHTML; btn.disabled = false; }
}

async function submitSuratMasuk(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); sendFormData('insertSuratMasuk', { cabangSMSK: c[0], jenisSurat: f.elements['jenisSurat'].value, tanggalSurat: f.elements['tanggalSurat'].value, pengirim: f.elements['pengirim'].value, sifatSurat: f.elements['sifatSurat'].value, perihal: f.elements['perihal'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-masuk', 'surat-masuk'); }
async function submitSuratKeluar(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); sendFormData('insertSuratKeluar', { cabangSMSK: c[0], jenisSurat: f.elements['jenisSurat'].value, tujuan: f.elements['tujuan'].value, perihal: f.elements['perihal'].value, penandatangan: f.elements['penandatangan'].value, sifat: f.elements['sifat'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-keluar', 'surat-keluar'); }
async function submitSPPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); sendFormData('insertSPPK', { cabangPK: c[1], tanggalSPPK: f.elements['tanggalSPPK'].value, namaDebitur: f.elements['namaDebitur'].value, jenisKredit: f.elements['jenisKredit'].value, plafon: f.elements['plafon'].value, jangkaWaktu: f.elements['jangkaWaktu'].value, tujuanKredit: f.elements['tujuanKredit'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-sppk', 'sppk'); }
async function submitPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; const c = f.elements['pilihCabang'].value.split('|'); sendFormData('insertPK', { cabangPK: c[1], nomorSPPK: f.elements['nomorSPPK'].value, tanggalPK: f.elements['tanggalPK'].value, namaDebitur: f.elements['namaDebitur'].value, plafon: f.elements['plafon'].value, golDebitur: f.elements['golDebitur'].value, jnsPenggunaan: f.elements['jnsPenggunaan'].value, klasKredit: f.elements['klasKredit'].value, sektorEko: f.elements['sektorEko'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-pk', 'pk'); }

// CRUD MASTER DATA
async function deleteData(actionName, id, tableRef) { if(!confirm("Yakin ingin menghapus data ini?")) return; try { const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: actionName, payload: { id: id } }) }); const result = await response.json(); if (result.status === 'success') { showAlert('Dihapus', 'Data berhasil dihapus.', 'success'); loadDataTabel(tableRef); } else showAlert('Gagal', result.message, 'error'); } catch (e) { showAlert('Error', 'Gagal koneksi.', 'error'); } }
async function submitCabang(e) { e.preventDefault(); const f = e.target; sendFormData('saveCabang', { id: f.elements['idCabang'].value, nama: f.elements['namaCabang'].value, kodeSM: f.elements['kodeSMSK'].value, kodePK: f.elements['kodePK'].value }, f, 'modal-cabang', 'cabang'); }
async function submitJenisSurat(e) { e.preventDefault(); const f = e.target; sendFormData('saveJenisSurat', { id: f.elements['idJenisSurat'].value, kode: f.elements['kodeJenis'].value, nama: f.elements['namaJenis'].value, uraian: f.elements['uraianJenis'].value }, f, 'modal-jenis-surat', 'jenis-surat'); }
async function submitUser(e) { e.preventDefault(); const f = e.target; sendFormData('saveUser', { id: f.elements['idUser'].value, nama: f.elements['namaLengkap'].value, username: f.elements['usernameLogin'].value, role: f.elements['roleUser'].value, jabatan: f.elements['jabatanUser'].value }, f, 'modal-user', 'user'); }
async function submitReferensiPK(e) { e.preventDefault(); const f = e.target; sendFormData('saveReferensiPK', { id: f.elements['idRefPK'].value, kategori: f.elements['katRefPK'].value, kode: f.elements['kodeRefPK'].value, uraian: f.elements['descRefPK'].value }, f, 'modal-referensi-pk', 'referensi-pk'); }
async function submitConfig(e) { e.preventDefault(); const form = e.target; const payload = {}; Array.from(form.elements).forEach(el => { if(el.name) payload[el.name] = el.value; }); sendFormData('saveConfig', payload, form, null, null); setTimeout(loadConfig, 1000); }

function handleLogin(e) {
    e.preventDefault(); currentUser = { username: document.getElementById('login-username').value, role: document.getElementById('login-role').value }; document.getElementById('user-name').innerText = currentUser.username; document.getElementById('user-role').innerText = currentUser.role; if(currentUser.role !== 'Admin') document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none'); document.getElementById('login-screen').classList.add('hidden'); document.getElementById('main-screen').classList.remove('hidden'); loadDashboardStats();
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getCabang' }) }).then(res => res.json()).then(result => { if(result.status === 'success') { let options = '<option value="">Pilih Cabang...</option>'; result.data.forEach(j => { options += `<option value="${j.kodeSM}|${j.kodePK}">${j.nama}</option>`; }); document.querySelectorAll('.sel-cabang-global').forEach(el => el.innerHTML = options); storeData['cabang'] = result.data; } });
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJenisSurat' }) }).then(res => res.json()).then(result => { if(result.status === 'success') { let options = '<option value="">Pilih Jenis Surat...</option>'; result.data.forEach(j => options += `<option value="${j.kode}">${j.kode} - ${j.nama}</option>`); if(document.getElementById('select-jenis-sm')) document.getElementById('select-jenis-sm').innerHTML = options; if(document.getElementById('select-jenis-sk')) document.getElementById('select-jenis-sk').innerHTML = options; } });
}
function handleLogout() { currentUser = null; document.getElementById('main-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('login-form').reset(); document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex'); }
window.onload = () => { if (document.getElementById('theme-icon')) document.getElementById('theme-icon').className = currentTheme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; };
