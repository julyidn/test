// --- 0. FUNGSI UI / UX (TOAST & CUSTOM CONFIRM) ---
function showToast(message, type = 'primary') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

let confirmAction = null;
const confirmModal = document.getElementById('confirmModal');

function showConfirm(message, callback) {
    document.getElementById('confirmMessage').innerText = message;
    confirmAction = callback;
    confirmModal.classList.add('show');
}
function closeConfirmModal() { confirmModal.classList.remove('show'); confirmAction = null; }
document.getElementById('btnConfirmYes').addEventListener('click', () => {
    if (confirmAction) confirmAction();
    closeConfirmModal();
});

// 1. Elemen DOM Utama
const formInputStok = document.getElementById('formInputStok');
const stockContainer = document.getElementById('stockContainer');
const tabButtons = document.querySelectorAll('.tab-btn');
const searchInput = document.getElementById('searchInput');

const dashCards = document.querySelectorAll('.dash-card');
const statTotal = document.getElementById('statTotal');
const statAman = document.getElementById('statAman');
const statMin = document.getElementById('statMin');
const statKosong = document.getElementById('statKosong');
const statExp = document.getElementById('statExp');

const editModal = document.getElementById('editModal');
const formEditStok = document.getElementById('formEditStok');
const addBatchModal = document.getElementById('addBatchModal');
const formAddBatch = document.getElementById('formAddBatch');
const issueModal = document.getElementById('issueModal');
const formIssueStock = document.getElementById('formIssueStock');
const historyModal = document.getElementById('historyModal');
const historyContainer = document.getElementById('historyContainer');
const opnameModal = document.getElementById('opnameModal');
const formOpname = document.getElementById('formOpname');
const moveEceranModal = document.getElementById('moveEceranModal');
const formMoveEceran = document.getElementById('formMoveEceran');

const qrModal = document.getElementById('qrModal');
const scannerModal = document.getElementById('scannerModal');
const scanActionModal = document.getElementById('scanActionModal');
let html5QrcodeScanner = null;
let tempScanData = null; 

const STORAGE_KEY = 'mbg_stok_bahan_v3'; 
const HISTORY_KEY = 'mbg_riwayat_stok_v3';
let currentFilter = 'semua';
let currentAlertFilter = 'semua'; 
let daftarStok = loadDataFromStorage();
let riwayatStok = loadHistoryFromStorage();

// TOGGLE LOGIC UNTUK ECERAN
window.toggleEceran = function() {
    const hasEceran = document.getElementById('hasEceran').checked;
    document.getElementById('containerSatuanKecil').style.display = hasEceran ? 'flex' : 'none';
    document.getElementById('containerIsiPerKardus').style.display = hasEceran ? 'flex' : 'none';
    document.getElementById('satuanKecil').required = hasEceran;
    document.getElementById('isiPerKardus').required = hasEceran;
    const sb = document.getElementById('satuanBesar');
    const satuanUtama = sb.options[sb.selectedIndex]?.text || 'Satuan Utama';
    document.getElementById('lblMinStock').innerText = hasEceran ? 'Stok Minimum (Dalam Satuan Eceran)' : `Stok Minimum (Dalam ${satuanUtama})`;
};

window.toggleEditEceran = function() {
    const hasEceran = document.getElementById('editHasEceran').checked;
    document.getElementById('editContainerSatuanKecil').style.display = hasEceran ? 'flex' : 'none';
    document.getElementById('editContainerIsiPerKardus').style.display = hasEceran ? 'flex' : 'none';
    document.getElementById('editSatuanKecil').required = hasEceran;
    document.getElementById('editIsiPerKardus').required = hasEceran;
    const satuanUtama = document.getElementById('editSatuanBesar').value || 'Satuan Utama';
    document.getElementById('editLblMinStock').innerText = hasEceran ? 'Stok Minimum (Dalam Eceran)' : `Stok Minimum (Dalam ${satuanUtama})`;
};

function loadDataFromStorage() {
    const storedData = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('mbg_stok_bahan_v2');
    let data = storedData ? JSON.parse(storedData) : [];
    data.forEach(item => {
        if(item.kuantitas !== undefined && !item.batches) {
            item.batches = [{ idBatch: Date.now(), kuantitas: item.kuantitas, expDate: item.expDate }];
            delete item.kuantitas; delete item.expDate;
        }
        if(item.stokEceran === undefined) item.stokEceran = 0;
        if(item.satuanBesar === undefined) {
            item.satuanBesar = item.satuan || 'pcs';
            item.satuanKecil = item.satuan || 'pcs';
            item.isiPerKardus = 1;
        }
        if(item.hasEceran === undefined) {
            item.hasEceran = (item.isiPerKardus > 1);
        }
    });
    return data;
}

function saveDataToStorage() { localStorage.setItem(STORAGE_KEY, JSON.stringify(daftarStok)); }
function loadHistoryFromStorage() { const storedData = localStorage.getItem(HISTORY_KEY) || localStorage.getItem('mbg_riwayat_stok_v2'); return storedData ? JSON.parse(storedData) : []; }
function saveHistoryToStorage() { localStorage.setItem(HISTORY_KEY, JSON.stringify(riwayatStok)); }

function getTotalInEceran(item) {
    let totalBatchQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    return item.hasEceran ? (totalBatchQty * (item.isiPerKardus || 1)) + (item.stokEceran || 0) : totalBatchQty; 
}

// 3. Kalkulasi Dashboard (Diperbarui dengan AMAN dan KOSONG)
function updateDashboard() {
    const today = new Date(); today.setHours(0,0,0,0);
    let countAman = 0; let countMenipis = 0; let countKosong = 0; let countKadaluwarsa = 0;

    daftarStok.forEach(item => {
        let totalEqv = getTotalInEceran(item);
        
        if (totalEqv <= 0) {
            countKosong++;
        } else if (totalEqv <= (item.minStock || 0)) {
            countMenipis++;
        } else {
            countAman++;
        }

        let isHampirExp = item.batches.some(b => {
            const exp = new Date(b.expDate);
            const daysDiff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
            return daysDiff <= 7;
        });
        if (isHampirExp) countKadaluwarsa++;
    });
    
    statTotal.innerText = daftarStok.length; 
    statAman.innerText = countAman;
    statMin.innerText = countMenipis;
    statKosong.innerText = countKosong;
    statExp.innerText = countKadaluwarsa;
}

// 4. Render & Filter Tampilan
function renderStockData() {
    stockContainer.innerHTML = ''; updateDashboard(); 

    const query = searchInput.value.toLowerCase();
    const today = new Date(); today.setHours(0,0,0,0);

    const filteredData = daftarStok.filter(item => {
        const matchGudang = currentFilter === 'semua' || item.lokasiGudang === currentFilter;
        const matchSearch = item.namaBahan.toLowerCase().includes(query);
        let totalEqv = getTotalInEceran(item);
        
        let isHampirExp = item.batches.some(b => {
            const exp = new Date(b.expDate);
            const daysDiff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
            return daysDiff <= 7;
        });

        let matchAlert = true;
        if (currentAlertFilter === 'aman') matchAlert = (totalEqv > (item.minStock || 0));
        else if (currentAlertFilter === 'min') matchAlert = (totalEqv > 0 && totalEqv <= (item.minStock || 0));
        else if (currentAlertFilter === 'kosong') matchAlert = (totalEqv <= 0);
        else if (currentAlertFilter === 'exp') matchAlert = isHampirExp;

        return matchGudang && matchSearch && matchAlert;
    });

    if (filteredData.length === 0) {
        stockContainer.innerHTML = `<p>Tidak ada data ditemukan.</p>`; return;
    }

    const stockListElement = document.createElement('div');
    stockListElement.className = 'stock-list';

    filteredData.forEach(item => {
        let totalBatchQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
        let totalEqv = getTotalInEceran(item);
        
        let daysDiffNearest = Infinity;
        item.batches.forEach(b => {
            const exp = new Date(b.expDate); const daysDiff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
            if(daysDiff < daysDiffNearest) daysDiffNearest = daysDiff;
        });

        let expBadge = '';
        if (daysDiffNearest !== Infinity) {
            if (daysDiffNearest < 0) expBadge = '<span class="badge danger">Ada yg Kadaluwarsa!</span>';
            else if (daysDiffNearest <= 7) expBadge = `<span class="badge warning">Exp dlm ${daysDiffNearest} hr</span>`;
            else expBadge = `<span class="badge primary">Exp Aman</span>`;
        }

        // Tampilan Status Aman, Menipis, Kosong
        let stockBadge = '';
        if (totalEqv <= 0) {
            stockBadge = '<span class="badge danger">Stok Kosong</span>';
        } else if (totalEqv <= (item.minStock || 0)) {
            stockBadge = '<span class="badge warning">Stok Menipis</span>';
        } else {
            stockBadge = '<span class="badge success">Stok Aman</span>';
        }

        let batchesHtml = item.batches.sort((a,b) => new Date(a.expDate) - new Date(b.expDate)).map(b => `
            <div class="batch-row">
                <span>Exp: ${b.expDate}</span>
                <strong>${b.kuantitas} ${item.satuanBesar}</strong>
            </div>
        `).join('');

        const rasioText = item.hasEceran ? `| Rasio: 1 ${item.satuanBesar} = ${item.isiPerKardus} ${item.satuanKecil}` : '';
        const eceranStockHtml = item.hasEceran ? `<div style="font-size: 0.95rem; font-weight: 700; color: var(--warning-color); margin-top: 0.2rem;">🛍️ ${item.stokEceran || 0} <small>${item.satuanKecil}</small></div>` : '';
        const btnBukaKardus = item.hasEceran ? `<button class="btn-action text-warning" onclick="openMoveEceranModal(${item.id})">Buka Kardus</button>` : '';

        const card = document.createElement('div'); card.className = 'stock-card';
        card.innerHTML = `
            <div class="stock-info">
                <span class="stock-name">${item.namaBahan}</span>
                <span class="stock-kategori">${item.kategori || 'Tanpa Kategori'} | Gudang: ${item.lokasiGudang.toUpperCase()} ${rasioText}</span>
                <div class="badges-container">
                    ${stockBadge}
                    ${expBadge}
                </div>
                <div class="batch-list-container">
                    <div class="batch-list-title">Rincian Stok Utama:</div>
                    ${batchesHtml || '<div style="font-size: 0.8rem; color: var(--text-muted);">Tidak ada stok tersedia.</div>'}
                </div>
            </div>
            
            <div class="stock-controls-wrapper">
                <div class="stock-qty-adjust">
                    <button class="btn-qty" onclick="openIssueModal(${item.id})" title="Keluarkan Stok">-</button>
                    <div style="text-align:center; padding: 0 10px;">
                        <div style="font-size: 1.15rem; font-weight: 700; color: var(--primary-color);">📦 ${totalBatchQty} <small>${item.satuanBesar}</small></div>
                        ${eceranStockHtml}
                    </div>
                    <button class="btn-qty" onclick="openAddBatchModal(${item.id})" title="Tambah Stok Masuk">+</button>
                </div>

                <div class="action-buttons">
                    ${btnBukaKardus}
                    <button class="btn-action text-primary" onclick="showQRCode(${item.id}, '${item.namaBahan}')">Cetak QR Bahan</button>
                    <button class="btn-action text-primary" onclick="openOpnameModal(${item.id})">Opname</button>
                    <button class="btn-action text-primary" onclick="openEditModal(${item.id})">Edit Info</button>
                    <button class="btn-action text-danger" onclick="deleteStock(${item.id})">Hapus</button>
                </div>
            </div>
        `;
        stockListElement.appendChild(card);
    });
    stockContainer.appendChild(stockListElement);
}

// 5. FITUR: BUKA KARDUS / PINDAH KE ECERAN
window.openMoveEceranModal = function(id) {
    const item = daftarStok.find(i => i.id === id);
    if (!item) return;
    let totalBatchQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    if (totalBatchQty <= 0) return showToast("Tidak ada stok di dalam kardus/batch untuk dibuka.", "danger");

    document.getElementById('eceranItemId').value = id;
    document.getElementById('lblMoveEceran').innerText = `Jumlah Kardus yang dibuka (dalam ${item.satuanBesar})`;
    document.getElementById('lblMoveEceranPreview').innerText = '';
    
    document.getElementById('eceranQty').oninput = function() {
        let val = parseFloat(this.value) || 0;
        let converted = val * item.isiPerKardus;
        document.getElementById('lblMoveEceranPreview').innerText = `Akan menghasilkan: +${converted} ${item.satuanKecil} Eceran`;
    };

    formMoveEceran.reset();
    moveEceranModal.classList.add('show');
}
window.closeMoveEceranModal = function() { moveEceranModal.classList.remove('show'); }

formMoveEceran.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('eceranItemId').value);
    const amountKardus = parseFloat(document.getElementById('eceranQty').value);
    const item = daftarStok.find(i => i.id === id);
    if (!item) return;

    let totalBatchQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    if (totalBatchQty < amountKardus) return showToast("Stok di dalam kardus tidak mencukupi untuk dipindahkan sejumlah tersebut!", "danger");

    let sisaDipotong = amountKardus;
    item.batches.sort((a, b) => new Date(a.expDate) - new Date(b.expDate));
    for (let i = 0; i < item.batches.length; i++) {
        if (sisaDipotong <= 0) break;
        let batch = item.batches[i];
        if (batch.kuantitas >= sisaDipotong) {
            batch.kuantitas -= sisaDipotong; sisaDipotong = 0;
        } else {
            sisaDipotong -= batch.kuantitas; batch.kuantitas = 0;
        }
    }
    item.batches = item.batches.filter(b => b.kuantitas > 0);
    
    let amountEceran = amountKardus * item.isiPerKardus;
    item.stokEceran = (item.stokEceran || 0) + amountEceran;
    
    catatRiwayat(item.namaBahan, 'Pindah', `${amountKardus} ${item.satuanBesar} -> ${amountEceran} ${item.satuanKecil}`, getSisaText(item), '', 'Buka Kardus', `Konversi 1 ${item.satuanBesar} = ${item.isiPerKardus} ${item.satuanKecil}`);

    saveDataToStorage();
    renderStockData();
    closeMoveEceranModal();
    showToast(`Berhasil memindahkan ${amountKardus} ${item.satuanBesar} menjadi ${amountEceran} ${item.satuanKecil} Eceran.`, 'success');
});

function getSisaText(item) {
    let batchQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    if(item.hasEceran) {
        return `${batchQty} ${item.satuanBesar} & ${item.stokEceran || 0} ${item.satuanKecil}`;
    }
    return `${batchQty} ${item.satuanBesar}`;
}

// 6. FITUR KELUARKAN STOK
window.updateIssueLabel = function() {
    const id = parseInt(document.getElementById('issueId').value);
    const item = daftarStok.find(i => i.id === id);
    if (!item) return;
    const source = document.getElementById('issueSource').value;
    
    if(item.hasEceran && source === 'eceran') {
        document.getElementById('lblIssueQty').innerText = `Jumlah Keluar (dalam ${item.satuanKecil})`;
    } else {
        document.getElementById('lblIssueQty').innerText = `Jumlah Keluar (dalam ${item.satuanBesar})`;
    }
}

window.openIssueModal = function(id, specificBatchId = null) {
    const item = daftarStok.find(i => i.id === id);
    if (!item) return;

    let totalBatchQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    if(totalBatchQty <= 0 && (item.stokEceran || 0) <= 0) return showToast("Stok habis total, tidak bisa dikurangi.", "danger");

    document.getElementById('issueId').value = id;
    document.getElementById('issueBatchId').value = specificBatchId || "";
    formIssueStock.reset();
    
    const issueSourceSelect = document.getElementById('issueSource');
    if(item.hasEceran) {
        issueSourceSelect.innerHTML = `<option value="eceran">Stok Eceran / Luar Kardus</option><option value="batch">Stok Kardus (Batch Utama - FIFO)</option>`;
    } else {
        issueSourceSelect.innerHTML = `<option value="batch">Stok Utama (FIFO)</option>`;
    }

    if(specificBatchId || !item.hasEceran) document.getElementById('issueSource').value = 'batch';
    updateIssueLabel();
    
    issueModal.classList.add('show');
}
window.closeIssueModal = function() { issueModal.classList.remove('show'); }

formIssueStock.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('issueId').value);
    const specificBatchId = document.getElementById('issueBatchId').value;
    const item = daftarStok.find(i => i.id === id);
    if (!item) return;

    const source = document.getElementById('issueSource').value;
    const amount = parseFloat(document.getElementById('issueQty').value);
    const alasan = document.getElementById('issueReason').value;
    const notes = document.getElementById('issueNotes').value;

    let totalBatchQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);

    if (item.hasEceran && source === 'eceran') {
        if ((item.stokEceran || 0) < amount) return showToast(`Stok Eceran tidak mencukupi! Sisa: ${item.stokEceran} ${item.satuanKecil}`, "danger");
        
        item.stokEceran -= amount;
        catatRiwayat(item.namaBahan, 'Keluar', amount, getSisaText(item), item.satuanKecil, alasan, '(Dari Eceran) ' + notes);
        finalizeIssue();
    } else {
        if (totalBatchQty < amount) return showToast(`Stok Utama tidak mencukupi! Sisa: ${totalBatchQty} ${item.satuanBesar}`, "danger");
        
        let targetBatch = specificBatchId ? item.batches.find(b => b.idBatch == specificBatchId) : null;
        if (targetBatch && targetBatch.kuantitas < amount) {
            const sisaDibutuhkan = amount - targetBatch.kuantitas;
            showConfirm(`Sisa di batch spesifik ini hanya ${targetBatch.kuantitas} ${item.satuanBesar}. Kekurangan ${sisaDibutuhkan} ${item.satuanBesar} akan ditarik dari batch lain (FIFO). Lanjutkan?`, () => {
                executeIssueBatchStock(item, amount, targetBatch, alasan, notes);
            });
        } else {
            executeIssueBatchStock(item, amount, targetBatch, alasan, notes);
        }
    }
});

function executeIssueBatchStock(item, amount, targetBatch, alasan, notes) {
    let sisaDipotong = amount;
    if(targetBatch) {
        if(targetBatch.kuantitas >= sisaDipotong) {
            targetBatch.kuantitas -= sisaDipotong; sisaDipotong = 0;
        } else {
            sisaDipotong -= targetBatch.kuantitas; targetBatch.kuantitas = 0;
        }
    }

    if(sisaDipotong > 0) {
        item.batches.sort((a, b) => new Date(a.expDate) - new Date(b.expDate));
        for (let i = 0; i < item.batches.length; i++) {
            if (sisaDipotong <= 0) break;
            let batch = item.batches[i];
            if (batch.kuantitas <= 0) continue;
            if (batch.kuantitas >= sisaDipotong) {
                batch.kuantitas -= sisaDipotong; sisaDipotong = 0;
            } else {
                sisaDipotong -= batch.kuantitas; batch.kuantitas = 0;
            }
        }
    }

    item.batches = item.batches.filter(b => b.kuantitas > 0);
    const originText = item.hasEceran ? '(Dari Kardus) ' : '';
    catatRiwayat(item.namaBahan, 'Keluar', amount, getSisaText(item), item.satuanBesar, alasan, originText + notes);
    finalizeIssue();
}

function finalizeIssue() { saveDataToStorage(); renderStockData(); closeIssueModal(); showToast('Stok berhasil dikeluarkan.', 'success'); }

// 7. LOGIKA OPNAME
window.openOpnameModal = function(id) {
    const item = daftarStok.find(i => i.id === id); if (!item) return;
    let totalBatchQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    
    document.getElementById('opnameId').value = id;
    
    if(item.hasEceran) {
        document.getElementById('opnameSystemQty').value = `${totalBatchQty} ${item.satuanBesar} (Kardus) | ${item.stokEceran || 0} ${item.satuanKecil} (Eceran)`;
        document.getElementById('lblOpnameBatch').innerText = `Fisik: Stok Kardus (${item.satuanBesar})`;
        document.getElementById('lblOpnameEceran').innerText = `Fisik: Stok Eceran (${item.satuanKecil})`;
        document.getElementById('containerOpnameEceran').style.display = 'flex';
        document.getElementById('opnameActualEceran').value = item.stokEceran || 0;
    } else {
        document.getElementById('opnameSystemQty').value = `${totalBatchQty} ${item.satuanBesar}`;
        document.getElementById('lblOpnameBatch').innerText = `Fisik: Stok Utama (${item.satuanBesar})`;
        document.getElementById('containerOpnameEceran').style.display = 'none';
        document.getElementById('opnameActualEceran').value = 0;
    }
    
    document.getElementById('opnameActualBatch').value = totalBatchQty;
    document.getElementById('opnameNotes').value = '';
    
    document.getElementById('opnameExpDateContainer').style.display = 'none';
    document.getElementById('opnameActualBatch').oninput = function() {
        if (parseFloat(this.value) > totalBatchQty) {
            document.getElementById('opnameExpDateContainer').style.display = 'flex';
            document.getElementById('opnameExpDate').required = true;
        } else {
            document.getElementById('opnameExpDateContainer').style.display = 'none';
            document.getElementById('opnameExpDate').required = false;
        }
    };
    opnameModal.classList.add('show');
}
window.closeOpnameModal = function() { opnameModal.classList.remove('show'); }

formOpname.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('opnameId').value); const item = daftarStok.find(i => i.id === id);
    if (!item) return;
    
    let systemBatchQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    let systemEceranQty = item.hasEceran ? (item.stokEceran || 0) : 0;
    
    const actualBatchQty = parseFloat(document.getElementById('opnameActualBatch').value);
    const actualEceranQty = item.hasEceran ? parseFloat(document.getElementById('opnameActualEceran').value) : 0;
    const notes = document.getElementById('opnameNotes').value;
    
    let changed = false;
    const batchTitle = item.hasEceran ? 'Kardus' : 'Utama';

    if (actualBatchQty !== systemBatchQty) {
        if (actualBatchQty < systemBatchQty) {
            let selisih = systemBatchQty - actualBatchQty; 
            item.batches.sort((a, b) => new Date(a.expDate) - new Date(b.expDate));
            let sisaDipotong = selisih;
            for (let i = 0; i < item.batches.length; i++) {
                if (sisaDipotong <= 0) break; let batch = item.batches[i];
                if (batch.kuantitas >= sisaDipotong) { batch.kuantitas -= sisaDipotong; sisaDipotong = 0; } 
                else { sisaDipotong -= batch.kuantitas; batch.kuantitas = 0; }
            }
            item.batches = item.batches.filter(b => b.kuantitas > 0);
            catatRiwayat(item.namaBahan, 'Keluar', selisih, getSisaText(item), item.satuanBesar, 'Selisih Hitung', `(Opname Defisit ${batchTitle}) ` + notes);
        } else {
            let selisih = actualBatchQty - systemBatchQty; 
            const expDate = document.getElementById('opnameExpDate').value;
            item.batches.push({ idBatch: Date.now(), kuantitas: selisih, expDate: expDate });
            catatRiwayat(item.namaBahan, 'Masuk', selisih, getSisaText(item), item.satuanBesar, 'Selisih Hitung', `(Opname Surplus ${batchTitle}) ` + notes);
        }
        changed = true;
    }

    if (item.hasEceran && actualEceranQty !== systemEceranQty) {
        let diff = actualEceranQty - systemEceranQty;
        item.stokEceran = actualEceranQty;
        if(diff > 0) {
            catatRiwayat(item.namaBahan, 'Masuk', diff, getSisaText(item), item.satuanKecil, 'Selisih Hitung', '(Opname Surplus Eceran) ' + notes);
        } else {
            catatRiwayat(item.namaBahan, 'Keluar', Math.abs(diff), getSisaText(item), item.satuanKecil, 'Selisih Hitung', '(Opname Defisit Eceran) ' + notes);
        }
        changed = true;
    }

    if(!changed) { showToast("Stok riil sama persis. Tidak ada penyesuaian.", "warning"); closeOpnameModal(); return; }
    saveDataToStorage(); renderStockData(); closeOpnameModal(); showToast('Penyesuaian stok opname berhasil disimpan.', 'success');
});

// 8. LOGIKA PENAMBAHAN BAHAN & BATCH
window.openAddBatchModal = function(id) { 
    const item = daftarStok.find(i=>i.id===id);
    document.getElementById('addBatchId').value = id; 
    document.getElementById('addBatchLabel').innerText = `Kuantitas Masuk (dalam ${item.satuanBesar})`;
    formAddBatch.reset(); addBatchModal.classList.add('show'); 
}
window.closeAddBatchModal = function() { addBatchModal.classList.remove('show'); }

formAddBatch.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('addBatchId').value); const item = daftarStok.find(i => i.id === id);
    if(item) {
        const qty = parseFloat(document.getElementById('addBatchQty').value); const exp = document.getElementById('addBatchExp').value;
        item.batches.push({ idBatch: Date.now(), kuantitas: qty, expDate: exp });
        catatRiwayat(item.namaBahan, 'Masuk', qty, getSisaText(item), item.satuanBesar);
        saveDataToStorage(); renderStockData(); closeAddBatchModal();
        showToast('Batch stok berhasil ditambahkan.', 'success');
    }
});

formInputStok.addEventListener('submit', function (event) {
    event.preventDefault(); 
    const namaBahanInput = document.getElementById('namaBahan').value.trim();
    const satuanBesar = document.getElementById('satuanBesar').value;
    const lokasiGudangInput = document.getElementById('lokasiGudang').value;
    const hasEceran = document.getElementById('hasEceran').checked;
    const satuanKecil = hasEceran ? document.getElementById('satuanKecil').value : satuanBesar;
    const isiPerKardus = hasEceran ? parseFloat(document.getElementById('isiPerKardus').value) : 1;

    const existingItemIndex = daftarStok.findIndex(i => i.namaBahan.toLowerCase() === namaBahanInput.toLowerCase() && i.satuanBesar === satuanBesar && i.lokasiGudang === lokasiGudangInput);
    if (existingItemIndex !== -1) {
        daftarStok[existingItemIndex].batches.push({ idBatch: Date.now(), kuantitas: parseFloat(document.getElementById('kuantitas').value), expDate: document.getElementById('expDate').value });
        showToast(`Bahan "${namaBahanInput}" sudah ada. Kuantitas berhasil ditambahkan ke Batch baru.`, 'success');
    } else {
        daftarStok.push({ 
            id: Date.now(), namaBahan: namaBahanInput, kategori: document.getElementById('kategori').value, satuanBesar: satuanBesar, satuanKecil: satuanKecil, 
            isiPerKardus: isiPerKardus, minStock: parseFloat(document.getElementById('minStock').value), lokasiGudang: lokasiGudangInput, stokEceran: 0,
            hasEceran: hasEceran, batches: [{ idBatch: Date.now(), kuantitas: parseFloat(document.getElementById('kuantitas').value), expDate: document.getElementById('expDate').value }] 
        });
        showToast('Data bahan baru berhasil ditambahkan!', 'success');
    }
    saveDataToStorage(); renderStockData(); formInputStok.reset(); toggleEceran();
});

// Edit & Hapus
window.openEditModal = function(id) { 
    const item = daftarStok.find(i => i.id === id); 
    if (item) { 
        document.getElementById('editId').value = item.id; document.getElementById('editNama').value = item.namaBahan; document.getElementById('editKategori').value = item.kategori || ''; 
        document.getElementById('editHasEceran').checked = item.hasEceran; toggleEditEceran();
        document.getElementById('editSatuanBesar').value = item.satuanBesar; document.getElementById('editSatuanKecil').value = item.hasEceran ? item.satuanKecil : ''; 
        document.getElementById('editIsiPerKardus').value = item.hasEceran ? (item.isiPerKardus || 1) : ''; document.getElementById('editMinStock').value = item.minStock || 0; 
        document.getElementById('editLokasiGudang').value = item.lokasiGudang; editModal.classList.add('show'); 
    } 
}
window.closeEditModal = function() { editModal.classList.remove('show'); }

formEditStok.addEventListener('submit', function(e) { 
    e.preventDefault(); 
    const id = parseInt(document.getElementById('editId').value); const item = daftarStok.find(i => i.id === id); 
    if (item) { 
        const hasEceran = document.getElementById('editHasEceran').checked;
        const satuanBesar = document.getElementById('editSatuanBesar').value;

        item.namaBahan = document.getElementById('editNama').value.trim(); item.kategori = document.getElementById('editKategori').value; item.hasEceran = hasEceran; item.satuanBesar = satuanBesar;
        if (hasEceran) { item.satuanKecil = document.getElementById('editSatuanKecil').value; item.isiPerKardus = parseFloat(document.getElementById('editIsiPerKardus').value); } 
        else { item.satuanKecil = satuanBesar; item.isiPerKardus = 1; }
        item.minStock = parseFloat(document.getElementById('editMinStock').value); item.lokasiGudang = document.getElementById('editLokasiGudang').value; 
        saveDataToStorage(); renderStockData(); closeEditModal(); showToast('Informasi bahan berhasil diperbarui.', 'success');
    } 
});

window.deleteStock = function(id) { 
    showConfirm('Apakah Anda yakin ingin menghapus seluruh data barang ini?', () => { daftarStok = daftarStok.filter(item => item.id !== id); saveDataToStorage(); renderStockData(); showToast('Data barang berhasil dihapus.', 'success'); });
}

// History & Utils
function catatRiwayat(nama, jenis, jumlah, sisaText, satuan, alasan = '', keterangan = '') {
    const log = { id: Date.now(), tanggal: new Date().toLocaleString('id-ID'), namaBahan: nama, jenis: jenis, jumlah: jumlah, sisaText: sisaText, satuan: satuan, alasan: alasan, keterangan: keterangan };
    riwayatStok.unshift(log); if(riwayatStok.length > 100) riwayatStok.pop(); saveHistoryToStorage();
}

window.openHistoryModal = function() {
    historyContainer.innerHTML = '';
    if (riwayatStok.length === 0) { historyContainer.innerHTML = '<p style="text-align:center; padding: 1rem;">Belum ada riwayat transaksi.</p>'; } 
    else {
        riwayatStok.forEach(log => {
            let colorClass = ''; let sign = ''; let badgeTrans = '';
            if(log.jenis === 'Masuk') { colorClass = 'text-green'; sign = '+'; badgeTrans = 'success'; }
            else if(log.jenis === 'Keluar') { colorClass = 'text-red'; sign = '-'; badgeTrans = 'danger'; }
            else { colorClass = 'text-warning'; sign = ''; badgeTrans = 'warning'; }

            let qtyDisplay = log.jenis === 'Pindah' ? log.jumlah : `${sign}${log.jumlah} ${log.satuan}`;
            let extraInfoHtml = '';
            if (log.alasan) {
                let badgeColor = (log.alasan === 'Dimasak' || log.alasan === 'Buka Kardus') ? 'primary' : 'danger';
                extraInfoHtml = `<div style="font-size: 0.8rem; margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(163,177,198,0.5);"><span class="badge ${badgeColor}">${log.alasan}</span> ${log.keterangan ? `<span style="color: var(--text-muted); font-style: italic; margin-left: 5px;">- ${log.keterangan}</span>` : ''}</div>`;
            }
            
            historyContainer.innerHTML += `
                <div class="history-item">
                    <div class="history-header"><strong>${log.namaBahan}</strong><div style="display: flex; align-items: center; gap: 0.5rem;"><span class="badge ${badgeTrans}">${log.jenis}</span><button class="btn-action text-danger" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="hapusItemRiwayat(${log.id})" title="Hapus catatan ini">🗑️</button></div></div>
                    <div class="history-meta"><span>${log.tanggal}</span><strong class="${colorClass}">${qtyDisplay}</strong></div>
                    <div style="font-size: 0.85rem; margin-top: 5px; color: var(--text-muted);">Sisa Akhir: <strong style="color: var(--text-color);">${log.sisaText || '-'}</strong></div>
                    ${extraInfoHtml}
                </div>`;
        });
    }
    historyModal.classList.add('show');
}
window.closeHistoryModal = function() { historyModal.classList.remove('show'); }

window.hapusItemRiwayat = function(id) { showConfirm('Apakah Anda yakin ingin menghapus catatan riwayat transaksi ini?', () => { riwayatStok = riwayatStok.filter(log => log.id !== id); saveHistoryToStorage(); openHistoryModal(); showToast('Riwayat berhasil dihapus.', 'success'); }); }
window.hapusSemuaRiwayat = function() {
    if(riwayatStok.length === 0) { showToast('Tidak ada riwayat untuk dihapus.', 'warning'); return; }
    showConfirm('Peringatan: Anda akan menghapus SEMUA riwayat transaksi. Tindakan ini tidak dapat dibatalkan. Lanjutkan?', () => { riwayatStok = []; saveHistoryToStorage(); openHistoryModal(); showToast('Seluruh riwayat berhasil dihapus.', 'success'); });
}

// 9. LOGIKA EKSPOR LAPORAN EXCEL & JSON (Status Terupdate)
window.exportExcel = async function() {
    if (typeof ExcelJS === 'undefined') { showToast("Library ExcelJS belum dimuat.", "danger"); return; }
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Manajemen Stok MBG';
    workbook.created = new Date();

    const sheet1 = workbook.addWorksheet('Laporan Stok', { views: [{ showGridLines: false }] });

    sheet1.mergeCells('A1:K1');
    const titleCell = sheet1.getCell('A1');
    titleCell.value = 'LAPORAN STOK BAHAN MBG';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' } }; 
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(1).height = 35;

    sheet1.mergeCells('A2:K2');
    const subTitle = sheet1.getCell('A2');
    const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    subTitle.value = `Tanggal Cetak: ${dateStr}   |   Total Jenis Bahan Tersimpan: ${daftarStok.length}`;
    subTitle.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF4A5568' } };
    subTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(2).height = 20;
    sheet1.getRow(3).height = 10;

    const headerRow = sheet1.getRow(4);
    headerRow.values = ['No', 'Nama Bahan', 'Kategori', 'Lokasi Gudang', 'Stok Utama', 'Sat. Utama', 'Stok Eceran', 'Sat. Eceran', 'Total', 'Status', 'Rincian Batch (Exp)'];
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A5568' } }; 
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'medium', color: { argb: 'FF2D3748' } }, bottom: { style: 'medium', color: { argb: 'FF2D3748' } }, left: { style: 'thin', color: { argb: 'FF718096' } }, right: { style: 'thin', color: { argb: 'FF718096' } } };
    });
    headerRow.height = 30;

    sheet1.columns = [{ width: 5 }, { width: 35 }, { width: 22 }, { width: 18 }, { width: 13 }, { width: 11 }, { width: 13 }, { width: 11 }, { width: 17 }, { width: 18 }, { width: 45 }];

    let rowIdx = 5;
    const today = new Date(); today.setHours(0,0,0,0);

    daftarStok.forEach((item, index) => {
        let totalBatch = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
        let eceranEquivalent = getTotalInEceran(item);
        
        let batchInfo = item.batches.sort((a,b) => new Date(a.expDate) - new Date(b.expDate)).map(b => `${b.kuantitas} (Exp: ${b.expDate})`).join(' \n');

        let isHampirExp = false; let isExp = false;
        item.batches.forEach(b => {
            const exp = new Date(b.expDate);
            const daysDiff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (daysDiff < 0) isExp = true;
            else if (daysDiff <= 7) isHampirExp = true;
        });

        // STATUS LOGIC UNTUK EXCEL
        let statusArr = [];
        if (eceranEquivalent <= 0) {
            statusArr.push("KOSONG");
        } else if (eceranEquivalent <= (item.minStock || 0)) {
            statusArr.push("MENIPIS");
        } else {
            statusArr.push("AMAN");
        }

        if (isExp) statusArr.push("EXPIRED");
        else if (isHampirExp) statusArr.push("HAMPIR EXP");

        let statusText = statusArr.join(", ");
        let capitalLokasi = item.lokasiGudang.charAt(0).toUpperCase() + item.lokasiGudang.slice(1);

        const row = sheet1.getRow(rowIdx);
        row.values = [index + 1, item.namaBahan, item.kategori || '-', capitalLokasi, totalBatch, item.satuanBesar, item.hasEceran ? (item.stokEceran || 0) : '-', item.hasEceran ? item.satuanKecil : '-', `${eceranEquivalent} ${item.hasEceran ? item.satuanKecil : item.satuanBesar}`, statusText, batchInfo];

        const isEven = index % 2 === 0;
        row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Arial', size: 10, color: { argb: 'FF2D3748' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF7FAFC' } };
            cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
            cell.alignment = { vertical: 'middle', wrapText: true };
            if ([1, 4, 5, 6, 7, 8, 9, 10].includes(colNumber)) cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });

        const statusCell = row.getCell(10);
        if (statusText.includes('EXPIRED') || statusText.includes('KOSONG')) {
            statusCell.font = { color: { argb: 'FFE53E3E' }, bold: true, name: 'Arial', size: 9 };
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEB' } }; 
        } else if (statusText.includes('MENIPIS') || statusText.includes('HAMPIR EXP')) {
            statusCell.font = { color: { argb: 'FFD69E2E' }, bold: true, name: 'Arial', size: 9 };
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFAF0' } }; 
        } else {
            statusCell.font = { color: { argb: 'FF38A169' }, bold: true, name: 'Arial', size: 9 };
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FFF4' } }; 
        }
        rowIdx++;
    });

    sheet1.autoFilter = { from: 'A4', to: `K${rowIdx - 1}` };

    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Laporan_Stok_MBG_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast("Laporan Excel berhasil diunduh.", "success");
    } catch (error) { showToast("Gagal men-generate file Excel.", "danger"); }
};

window.exportJSON = function() {
    const dataToExport = { daftarStok: daftarStok, riwayatStok: riwayatStok };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `backup_stok_mbg_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
}

window.importJSON = function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.daftarStok && importedData.riwayatStok) {
                daftarStok = importedData.daftarStok; riwayatStok = importedData.riwayatStok;
                saveDataToStorage(); saveHistoryToStorage(); renderStockData();
                showToast('Data berhasil di-restore!', 'success');
            }
        } catch (error) { showToast('Gagal membaca file JSON!', 'danger'); }
    };
    reader.readAsText(file); event.target.value = '';
};

// --- QR GENERATOR DAN SCANNER ---
window.showQRCode = function(idBahan, namaBahan) {
    const qrContainer = document.getElementById('qrcode-container');
    qrContainer.innerHTML = ''; 
    const qrData = JSON.stringify({ i: idBahan, n: namaBahan });
    new QRCode(qrContainer, { text: qrData, width: 160, height: 160, colorDark : "#2d3748", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H });
    document.getElementById('qrTitle').innerText = `${namaBahan}`;
    qrModal.classList.add('show');
}
window.closeQRModal = function() { qrModal.classList.remove('show'); }

window.printQRLabel = function() { 
    const qrContainer = document.getElementById('qrcode-container');
    let img = qrContainer.querySelector('img');
    let imgSrc = img && img.src ? img.src : '';

    if (!imgSrc || imgSrc === window.location.href || imgSrc.endsWith('/')) {
        const canvas = qrContainer.querySelector('canvas');
        if (canvas) { imgSrc = canvas.toDataURL("image/png"); }
    }

    if(!imgSrc) { showToast('QR Code belum siap untuk dicetak!', 'warning'); return; }
    
    const printWindow = window.open('', '_blank', 'width=450,height=450');
    printWindow.document.write(`
        <html><head><title>Print QR Label</title></head>
        <body style="text-align:center; padding-top: 30px; font-family: sans-serif;">
            <img src="${imgSrc}" style="width:160px; height:160px; margin-bottom: 10px;" />
            <h4 style="margin:0; padding:0; color:#2d3748;">${document.getElementById('qrTitle').innerText}</h4>
            <script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 300); }<\/script>
        </body></html>
    `);
    printWindow.document.close();
}

window.openScannerModal = function() { 
    scannerModal.classList.add('show');
    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    }
}

window.closeScannerModal = function() { 
    scannerModal.classList.remove('show');
    if (html5QrcodeScanner) { 
        html5QrcodeScanner.clear().then(() => { html5QrcodeScanner = null; }).catch(err => { console.error("Gagal menutup scanner:", err); html5QrcodeScanner = null; });
    }
}

function onScanSuccess(decodedText, decodedResult) {
    try {
        const data = JSON.parse(decodedText); closeScannerModal();
        const item = daftarStok.find(i => i.id === data.i);
        if (!item) { showToast("Bahan tidak ditemukan di dalam sistem!", "danger"); return; }
        
        let activeBatches = item.batches.filter(b => b.kuantitas > 0);
        activeBatches.sort((a, b) => new Date(a.expDate) - new Date(b.expDate));

        tempScanData = { idBahan: data.i };
        document.getElementById('scanItemName').innerText = item.namaBahan;
        let totalStok = activeBatches.reduce((sum, b) => sum + b.kuantitas, 0);
        document.getElementById('scanItemKategori').innerText = `${item.kategori || 'Tanpa Kategori'} | Total Tersedia: ${totalStok} ${item.satuanBesar}`;

        let batchesHtml = '';
        if(activeBatches.length === 0) {
            batchesHtml = '<p style="color:var(--danger-color); text-align:center; margin-top: 1rem;">Stok Utama/Kardus Kosong!</p>';
        } else {
            activeBatches.forEach((b, index) => {
                let isFefo = index === 0; let bgStyle = isFefo ? 'var(--bg-color)' : 'transparent';
                let borderStyle = isFefo ? '2px solid var(--primary-color)' : '1px solid rgba(163,177,198,0.3)';
                let shadowStyle = isFefo ? 'inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light)' : 'none';
                let badgeFefo = isFefo ? `<span class="badge success" style="margin-bottom:0.5rem; display:inline-block;">Recomended (FEFO)</span><br>` : '';

                batchesHtml += `<div style="padding: 1rem; border: ${borderStyle}; border-radius: var(--border-radius-md); background: ${bgStyle}; box-shadow: ${shadowStyle}; text-align: left;">
                        ${badgeFefo}
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
                            <div><strong style="display:block; color:var(--text-color); font-size: 0.95rem;">Exp: ${b.expDate}</strong><span style="font-size:0.85rem; color:var(--text-muted);">Sisa: ${b.kuantitas} ${item.satuanBesar}</span></div>
                            <button class="btn-action text-danger" onclick="triggerScanIssueBatch(${item.id}, ${b.idBatch})">Keluarkan</button>
                        </div>
                    </div>`;
            });
        }

        document.getElementById('scanBatchList').innerHTML = batchesHtml; scanActionModal.classList.add('show');
    } catch (e) { showToast("Format QR Code tidak dikenali oleh sistem ini.", "danger"); }
}
function onScanFailure(error) { }
window.closeScanActionModal = function() { scanActionModal.classList.remove('show'); tempScanData = null; }
window.triggerScanAdd = function() { if(tempScanData && tempScanData.idBahan) { const idBahan = tempScanData.idBahan; closeScanActionModal(); openAddBatchModal(idBahan); } }
window.triggerScanIssueBatch = function(idBahan, idBatch) { closeScanActionModal(); openIssueModal(idBahan, idBatch); }

searchInput.addEventListener('input', renderStockData);
tabButtons.forEach(button => { button.addEventListener('click', () => { tabButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); currentFilter = button.getAttribute('data-filter'); renderStockData(); }); });
dashCards.forEach(card => { card.addEventListener('click', () => { dashCards.forEach(c => c.classList.remove('active')); card.classList.add('active'); currentAlertFilter = card.getAttribute('data-alert'); renderStockData(); }); });

// --- 10. SCROLL TO TOP LOGIC ---
const scrollTopBtn = document.getElementById("scrollTopBtn");
window.addEventListener("scroll", function() { if (window.scrollY > 300) { scrollTopBtn.classList.add("show"); } else { scrollTopBtn.classList.remove("show"); } });
window.scrollToTop = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };

// --- 11. DARK MODE LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    renderStockData();
    toggleEceran();

    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        const currentTheme = localStorage.getItem('mbg_theme');
        if (currentTheme === 'dark') { document.body.classList.add('dark-mode'); darkModeToggle.innerText = '☀️ Mode Terang'; }

        darkModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            let theme = 'light';
            if (document.body.classList.contains('dark-mode')) { theme = 'dark'; darkModeToggle.innerText = '☀️ Mode Terang'; } 
            else { darkModeToggle.innerText = '🌙 Mode Gelap'; }
            localStorage.setItem('mbg_theme', theme);
        });
    }
});