const API_URL = 'https://script.google.com/macros/s/AKfycbxj7uQSzJJLESto_xbCuQAw1iDEn-1_jNX68MlwLjtnmJqFpTOtsq2eOpBDZjpz648Y/exec';

let currentUser = null;
let currentTheme = localStorage.getItem('theme') || 'light';
let globalDataJenisSurat = [];
let globalDataUser = [];
let globalDataRefPK = [];
document.documentElement.setAttribute('data-theme', currentTheme);

document.addEventListener('DOMContentLoaded', () => { initSystem(); });

async function initSystem() {
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'initApp' }) });
        const result = await response.json();
        if(result.status === 'success') {
            setTimeout(() => { document.getElementById('init-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); }, 800);
        } else showAlert('Error Sistem', result.message, 'error');
    } catch (error) {
        setTimeout(() => { document.getElementById('init-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); showAlert('Mode Offline', 'UI berjalan tanpa koneksi backend.', 'info'); }, 1000);
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
function openModal(modalId) { document.getElementById(modalId).classList.remove('hidden'); }
function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }

function showAlert(title, message, type) {
    document.getElementById('alert-title').innerText = title; document.getElementById('alert-message').innerText = message;
    const icon = document.getElementById('alert-icon');
    if(type === 'success') icon.innerHTML = '<i class="fa-solid fa-check-circle icon-success"></i>';
    else if(type === 'error') icon.innerHTML = '<i class="fa-solid fa-circle-xmark icon-error"></i>';
    else icon.innerHTML = '<i class="fa-solid fa-circle-info icon-info"></i>';
    document.getElementById('custom-alert').classList.remove('hidden');
}

function navigate(page) {
    document.getElementById('sidebar').classList.remove('open');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    ['dashboard', 'surat-masuk', 'surat-keluar', 'disposisi', 'sppk', 'pk', 'arsip', 'laporan', 'pengaturan'].forEach(v => {
        const el = document.getElementById(`view-${v}`); if(el) el.classList.add('hidden');
    });
    
    const targetEl = document.getElementById(`view-${page}`);
    if(targetEl) targetEl.classList.remove('hidden');

    if (page === 'dashboard') loadDashboardStats();
    else if (page === 'pengaturan') { loadDataTabel('jenis-surat'); loadDataTabel('user'); loadDataTabel('referensi-pk'); loadConfig(); }
    else if (page === 'pk') { loadDataTabel('pk'); populatePKForm(); }
    else if (['surat-masuk', 'surat-keluar', 'sppk', 'disposisi', 'arsip'].includes(page)) loadDataTabel(page);
    
    const titles = { 'dashboard': 'Dashboard', 'surat-masuk': 'Surat Masuk', 'surat-keluar': 'Surat Keluar', 'disposisi': 'Disposisi', 'sppk': 'Data SPPK', 'pk': 'Data PK', 'arsip': 'Arsip Dokumen', 'laporan': 'Laporan', 'pengaturan': 'Pengaturan Sistem' };
    document.getElementById('page-title').innerText = titles[page] || 'Aplikasi';
}

async function loadConfig() {
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getConfig' }) });
        const result = await response.json();
        if (result.status === 'success') {
            const form = document.getElementById('form-config');
            for(let key in result.data) { if(form.elements[key]) form.elements[key].value = result.data[key]; }
        }
    } catch (e) { console.error(e); }
}

async function loadDashboardStats() {
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getDashboardStats' }) });
        const result = await response.json();
        if (result.status === 'success') {
            document.getElementById('stat-sm').innerText = result.data.sm; document.getElementById('stat-sk').innerText = result.data.sk;
            document.getElementById('stat-sppk').innerText = result.data.sppk; document.getElementById('stat-pk').innerText = result.data.pk;
        }
    } catch (e) { console.error(e); }
}

async function loadDataTabel(jenis) {
    const tbody = document.getElementById(`tbody-${jenis}`); if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--primary); padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Menarik data...</td></tr>`;

    let actionName = '';
    if (jenis === 'surat-masuk') actionName = 'getSuratMasuk'; else if (jenis === 'surat-keluar') actionName = 'getSuratKeluar';
    else if (jenis === 'sppk') actionName = 'getSPPK'; else if (jenis === 'pk') actionName = 'getPK';
    else if (jenis === 'disposisi') actionName = 'getDisposisi'; else if (jenis === 'arsip') actionName = 'getArsip';
    else if (jenis === 'jenis-surat') actionName = 'getJenisSurat'; else if (jenis === 'user') actionName = 'getUser';
    else if (jenis === 'referensi-pk') actionName = 'getReferensiPK';

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: actionName }) });
        const result = await response.json();
        if (result.status === 'success') renderHTMLTabel(jenis, result.data, tbody);
        else tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">${result.message}</td></tr>`;
    } catch (error) { tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Gagal memuat.</td></tr>`; }
}

function renderHTMLTabel(jenis, dataArray, tbody) {
    if (!dataArray || dataArray.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding:20px;">Belum ada data tersedia.</td></tr>`; return; }
    let html = '';
    
    if(jenis === 'jenis-surat') globalDataJenisSurat = [...dataArray];
    if(jenis === 'user') globalDataUser = [...dataArray];
    if(jenis === 'referensi-pk') globalDataRefPK = [...dataArray];

    dataArray.reverse().forEach(item => {
        let fileBtn = item.fileUrl ? `<a href="${item.fileUrl}" target="_blank" class="btn-icon"><i class="fa-solid fa-file-pdf text-danger"></i></a>` : `-`;
        let s = (item.status || "").toLowerCase(); let badge = 'warning';
        if(s.includes('selesai') || s.includes('terkirim') || s.includes('sudah') || s.includes('aktif')) badge = 'success';
        if(s.includes('belum')) badge = 'danger'; let statusBadge = `<span class="badge badge-${badge}">${item.status || '-'}</span>`;

        if (jenis === 'jenis-surat') {
            html += `<tr><td><strong>${item.kode}</strong></td><td>${item.nama}</td><td>${item.uraian}</td><td><button class="btn-icon text-primary" onclick="editJenisSurat('${item.id}')"><i class="fa-solid fa-edit"></i></button><button class="btn-icon text-danger" onclick="deleteData('deleteJenisSurat', '${item.id}', 'jenis-surat')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        } else if (jenis === 'user') {
            html += `<tr><td><strong>${item.username}</strong></td><td>${item.nama}</td><td>${item.role}</td><td>${item.jabatan}</td><td><button class="btn-icon text-primary" onclick="editUser('${item.id}')"><i class="fa-solid fa-edit"></i></button><button class="btn-icon text-danger" onclick="deleteData('deleteUser', '${item.id}', 'user')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        } else if (jenis === 'referensi-pk') {
            html += `<tr><td><span class="badge badge-primary">${item.kategori}</span></td><td><strong>${item.kode}</strong></td><td>${item.uraian}</td><td><button class="btn-icon text-primary" onclick="editReferensiPK('${item.id}')"><i class="fa-solid fa-edit"></i></button><button class="btn-icon text-danger" onclick="deleteData('deleteReferensiPK', '${item.id}', 'referensi-pk')"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        } else if (jenis === 'surat-masuk') html += `<tr><td><strong>${item.nomor}</strong></td><td>${item.tanggal}</td><td>${item.pengirim}</td><td>${item.perihal}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        else if (jenis === 'surat-keluar') html += `<tr><td><strong>${item.nomor}</strong><br><small>${item.tujuan}</small></td><td>${item.tanggal}</td><td>${item.perihal}</td><td>${item.penandatangan}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        else if (jenis === 'sppk') html += `<tr><td><strong>${item.nomorSPPK}</strong><br><small>App: ${item.nomorAplikasi}</small></td><td>${item.tanggal}</td><td>${item.debitur}</td><td>Rp ${parseFloat(item.plafon).toLocaleString('id-ID')}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        else if (jenis === 'pk') html += `<tr><td><strong>${item.nomorPK||'-'}</strong></td><td>${item.sppkInduk}</td><td>${item.tanggal}</td><td>${item.debitur}</td><td>Rp ${parseFloat(item.plafon).toLocaleString('id-ID')}</td><td>${statusBadge}</td><td>${fileBtn}</td></tr>`;
        else if (jenis === 'disposisi') html += `<tr><td><strong>${item.suratSumber}</strong></td><td>${item.dari}</td><td>${item.instruksi}</td><td>${item.batas}</td><td>${statusBadge}</td><td><button class="btn btn-primary-light btn-sm">Follow Up</button></td></tr>`;
        else if (jenis === 'arsip') html += `<tr><td><span class="badge badge-primary">${item.kategori}</span></td><td><strong>${item.nomor||'-'}</strong></td><td>${item.tanggal}</td><td>${item.deskripsi}</td><td>${fileBtn}</td></tr>`;
    });
    tbody.innerHTML = html;
}

// ==== MASTER DATA FORM HANDLERS ====
function openModalJenisSurat() { document.getElementById('idJenisSurat').value = ''; document.getElementById('kodeJenis').value = ''; document.getElementById('namaJenis').value = ''; document.getElementById('uraianJenis').value = ''; document.getElementById('title-jenis-surat').innerHTML = '<i class="fa-solid fa-tags text-primary"></i> Tambah Jenis Surat'; openModal('modal-jenis-surat'); }
function editJenisSurat(id) { const data = globalDataJenisSurat.find(d => d.id === id); if(data) { document.getElementById('idJenisSurat').value = data.id; document.getElementById('kodeJenis').value = data.kode; document.getElementById('namaJenis').value = data.nama; document.getElementById('uraianJenis').value = data.uraian; document.getElementById('title-jenis-surat').innerHTML = '<i class="fa-solid fa-edit text-primary"></i> Edit Jenis Surat'; openModal('modal-jenis-surat'); } }

function openModalUser() { document.getElementById('idUser').value = ''; document.getElementById('namaLengkap').value = ''; document.getElementById('usernameLogin').value = ''; document.getElementById('jabatanUser').value = ''; document.getElementById('title-user').innerHTML = '<i class="fa-solid fa-user-plus text-primary"></i> Tambah User'; openModal('modal-user'); }
function editUser(id) { const data = globalDataUser.find(d => d.id === id); if(data) { document.getElementById('idUser').value = data.id; document.getElementById('namaLengkap').value = data.nama; document.getElementById('usernameLogin').value = data.username; document.getElementById('roleUser').value = data.role; document.getElementById('jabatanUser').value = data.jabatan; document.getElementById('title-user').innerHTML = '<i class="fa-solid fa-edit text-primary"></i> Edit User'; openModal('modal-user'); } }

function openModalReferensiPK() { document.getElementById('idRefPK').value = ''; document.getElementById('kodeRefPK').value = ''; document.getElementById('descRefPK').value = ''; document.getElementById('title-referensi-pk').innerHTML = '<i class="fa-solid fa-list text-primary"></i> Tambah Referensi PK'; openModal('modal-referensi-pk'); }
function editReferensiPK(id) { const data = globalDataRefPK.find(d => d.id === id); if(data) { document.getElementById('idRefPK').value = data.id; document.getElementById('katRefPK').value = data.kategori; document.getElementById('kodeRefPK').value = data.kode; document.getElementById('descRefPK').value = data.uraian; document.getElementById('title-referensi-pk').innerHTML = '<i class="fa-solid fa-edit text-primary"></i> Edit Referensi PK'; openModal('modal-referensi-pk'); } }

async function deleteData(actionName, id, tableRef) {
    if(!confirm("Yakin ingin menghapus data ini?")) return;
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: actionName, payload: { id: id } }) });
        const result = await response.json();
        if (result.status === 'success') { showAlert('Dihapus', 'Data berhasil dihapus.', 'success'); loadDataTabel(tableRef); } 
        else showAlert('Gagal', result.message, 'error');
    } catch (e) { showAlert('Error', 'Gagal koneksi.', 'error'); }
}

async function submitJenisSurat(e) { e.preventDefault(); const f = e.target; sendFormData('saveJenisSurat', { id: f.elements['idJenisSurat'].value, kode: f.elements['kodeJenis'].value, nama: f.elements['namaJenis'].value, uraian: f.elements['uraianJenis'].value }, f, 'modal-jenis-surat', 'jenis-surat'); }
async function submitUser(e) { e.preventDefault(); const f = e.target; sendFormData('saveUser', { id: f.elements['idUser'].value, nama: f.elements['namaLengkap'].value, username: f.elements['usernameLogin'].value, role: f.elements['roleUser'].value, jabatan: f.elements['jabatanUser'].value }, f, 'modal-user', 'user'); }
async function submitReferensiPK(e) { e.preventDefault(); const f = e.target; sendFormData('saveReferensiPK', { id: f.elements['idRefPK'].value, kategori: f.elements['katRefPK'].value, kode: f.elements['kodeRefPK'].value, uraian: f.elements['descRefPK'].value }, f, 'modal-referensi-pk', 'referensi-pk'); }

async function submitConfig(e) { e.preventDefault(); const form = e.target; const payload = {}; Array.from(form.elements).forEach(el => { if(el.name) payload[el.name] = el.value; }); sendFormData('saveConfig', payload, form, null, null); setTimeout(loadConfig, 1000); }

function populatePKForm() {
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getSPPK' }) }).then(res => res.json()).then(result => {
        if(result.status === 'success') {
            let options = '<option value="">Pilih SPPK...</option>';
            result.data.forEach(j => { if(j.status !== "Sudah PK") options += `<option value="${j.nomorSPPK}">${j.nomorSPPK} - ${j.debitur}</option>`; });
            document.getElementById('select-sppk-induk').innerHTML = options;
        }
    });

    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getReferensiPK' }) }).then(res => res.json()).then(result => {
        if(result.status === 'success') {
            let opsGol = '<option value="">Pilih...</option>', opsJns = '<option value="">Pilih...</option>', opsKlas = '<option value="">Pilih...</option>', opsSek = '<option value="">Pilih...</option>', opsCab = '<option value="">Pilih...</option>';
            result.data.forEach(j => {
                let txt = `<option value="${j.kode}">${j.kode} - ${j.uraian}</option>`;
                if(j.kategori === 'GolDebitur') opsGol += txt; else if(j.kategori === 'JnsPenggunaan') opsJns += txt; else if(j.kategori === 'KlasKredit') opsKlas += txt; else if(j.kategori === 'SektorEko') opsSek += txt; else if(j.kategori === 'Cabang') opsCab += txt;
            });
            document.getElementById('sel-goldebitur').innerHTML = opsGol; document.getElementById('sel-jnspenggunaan').innerHTML = opsJns; document.getElementById('sel-klaskredit').innerHTML = opsKlas; document.getElementById('sel-sektoreko').innerHTML = opsSek; document.getElementById('sel-cabang').innerHTML = opsCab;
        }
    });
}

// ==== UNIVERSAL FORM SENDER ====
const getBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) return resolve(null); const r = new FileReader(); r.readAsDataURL(file);
    r.onload = () => resolve({ mimeType: file.type, filename: file.name, base64Data: r.result.split(',')[1] }); r.onerror = e => reject(e);
});

async function sendFormData(action, payload, formEl, modalId, jenisMenuRef) {
    const btn = formEl.querySelector('button[type="submit"]'); const originalBtnHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true;

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: action, payload: payload }) });
        const result = await response.json();
        if (result.status === 'success') {
            if(modalId) closeModal(modalId);
            showAlert('Berhasil', result.message, 'success');
            if(modalId) formEl.reset(); 
            if(jenisMenuRef) loadDataTabel(jenisMenuRef);
            if(jenisMenuRef && jenisMenuRef !== 'user' && jenisMenuRef !== 'jenis-surat' && jenisMenuRef !== 'referensi-pk') loadDashboardStats();
        } else showAlert('Gagal', result.message, 'error');
    } catch (error) { showAlert('Koneksi Gagal', 'Gagal mengirim data.', 'error'); }
    finally { btn.innerHTML = originalBtnHTML; btn.disabled = false; }
}

async function submitSuratMasuk(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; sendFormData('insertSuratMasuk', { jenisSurat: f.elements['jenisSurat'].value, tanggalSurat: f.elements['tanggalSurat'].value, pengirim: f.elements['pengirim'].value, sifatSurat: f.elements['sifatSurat'].value, perihal: f.elements['perihal'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-masuk', 'surat-masuk'); }
async function submitSuratKeluar(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; sendFormData('insertSuratKeluar', { jenisSurat: f.elements['jenisSurat'].value, tujuan: f.elements['tujuan'].value, perihal: f.elements['perihal'].value, penandatangan: f.elements['penandatangan'].value, sifat: f.elements['sifat'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-surat-keluar', 'surat-keluar'); }
async function submitSPPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; sendFormData('insertSPPK', { nomorAplikasi: f.elements['nomorAplikasi'].value, tanggalSPPK: f.elements['tanggalSPPK'].value, namaDebitur: f.elements['namaDebitur'].value, jenisKredit: f.elements['jenisKredit'].value, plafon: f.elements['plafon'].value, jangkaWaktu: f.elements['jangkaWaktu'].value, tujuanKredit: f.elements['tujuanKredit'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-sppk', 'sppk'); }
async function submitDisposisi(e) { e.preventDefault(); const f = e.target; sendFormData('insertDisposisi', { suratSumber: f.elements['suratSumber'].value, kepada: f.elements['kepada'].value, instruksi: f.elements['instruksi'].value, batasWaktu: f.elements['batasWaktu'].value, user: currentUser?currentUser.username:'Unknown' }, f, 'modal-disposisi', 'disposisi'); }

// Submit PK menggunakan format Referensi Master
async function submitPK(e) { e.preventDefault(); const f = e.target; const fileData = f.elements['fileUpload'].files.length > 0 ? await getBase64(f.elements['fileUpload'].files[0]) : null; 
    const p = { nomorSPPK: f.elements['nomorSPPK'].value, tanggalPK: f.elements['tanggalPK'].value, namaDebitur: f.elements['namaDebitur'].value, plafon: f.elements['plafon'].value, golDebitur: f.elements['golDebitur'].value, jnsPenggunaan: f.elements['jnsPenggunaan'].value, klasKredit: f.elements['klasKredit'].value, kodeCabang: f.elements['kodeCabang'].value, sektorEko: f.elements['sektorEko'].value, file: fileData, user: currentUser?currentUser.username:'Unknown' };
    sendFormData('insertPK', p, f, 'modal-pk', 'pk'); 
}

function handleLogin(e) {
    e.preventDefault();
    currentUser = { username: document.getElementById('login-username').value, role: document.getElementById('login-role').value };
    document.getElementById('user-name').innerText = currentUser.username; document.getElementById('user-role').innerText = currentUser.role;
    if(currentUser.role !== 'Admin') document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    document.getElementById('login-screen').classList.add('hidden'); document.getElementById('main-screen').classList.remove('hidden');
    loadDashboardStats();
    
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getJenisSurat' }) }).then(res => res.json()).then(result => {
        if(result.status === 'success') {
            let options = '<option value="">Pilih Jenis Surat...</option>';
            result.data.forEach(j => options += `<option value="${j.kode}">${j.kode} - ${j.nama}</option>`);
            if(document.getElementById('select-jenis-sm')) document.getElementById('select-jenis-sm').innerHTML = options;
            if(document.getElementById('select-jenis-sk')) document.getElementById('select-jenis-sk').innerHTML = options;
        }
    });
}
function handleLogout() { currentUser = null; document.getElementById('main-screen').classList.add('hidden'); document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('login-form').reset(); document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex'); }
