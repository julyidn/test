// 1. Elemen DOM Utama
const formInputStok = document.getElementById('formInputStok');
const stockContainer = document.getElementById('stockContainer');
const tabButtons = document.querySelectorAll('.tab-btn');
const searchInput = document.getElementById('searchInput');

// Elemen DOM Dashboard Cards
const dashCards = document.querySelectorAll('.dash-card');
const statTotal = document.getElementById('statTotal');
const statMin = document.getElementById('statMin');
const statExp = document.getElementById('statExp');

// Elemen DOM Modal
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

// Elemen DOM QR & Scanner
const qrModal = document.getElementById('qrModal');
const scannerModal = document.getElementById('scannerModal');
const scanActionModal = document.getElementById('scanActionModal');
let html5QrcodeScanner = null;
let tempScanData = null; 

// Key untuk LocalStorage & Variabel
const STORAGE_KEY = 'mbg_stok_bahan_v2'; 
const HISTORY_KEY = 'mbg_riwayat_stok_v2';
let currentFilter = 'semua';
let currentAlertFilter = 'semua'; 
let daftarStok = loadDataFromStorage();
let riwayatStok = loadHistoryFromStorage();

// 2. Fungsi Akses Data
function loadDataFromStorage() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    let data = storedData ? JSON.parse(storedData) : [];
    data.forEach(item => {
        if(item.kuantitas !== undefined && !item.batches) {
            item.batches = [{ idBatch: Date.now(), kuantitas: item.kuantitas, expDate: item.expDate }];
            delete item.kuantitas;
            delete item.expDate;
        }
    });
    return data;
}

function saveDataToStorage() { localStorage.setItem(STORAGE_KEY, JSON.stringify(daftarStok)); }
function loadHistoryFromStorage() { const storedData = localStorage.getItem(HISTORY_KEY); return storedData ? JSON.parse(storedData) : []; }
function saveHistoryToStorage() { localStorage.setItem(HISTORY_KEY, JSON.stringify(riwayatStok)); }

// 3. Kalkulasi Dashboard
function updateDashboard() {
    const today = new Date(); today.setHours(0,0,0,0);
    let countMenipis = 0; let countKadaluwarsa = 0;

    daftarStok.forEach(item => {
        let totalQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
        if (totalQty <= (item.minStock || 0)) countMenipis++;

        let isHampirExp = item.batches.some(b => {
            const exp = new Date(b.expDate);
            const daysDiff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
            return daysDiff <= 7;
        });
        if (isHampirExp) countKadaluwarsa++;
    });
    statTotal.innerText = daftarStok.length; statMin.innerText = countMenipis; statExp.innerText = countKadaluwarsa;
}

// 4. Render & Filter Tampilan
function renderStockData() {
    stockContainer.innerHTML = ''; updateDashboard(); 

    const query = searchInput.value.toLowerCase();
    const today = new Date(); today.setHours(0,0,0,0);

    const filteredData = daftarStok.filter(item => {
        const matchGudang = currentFilter === 'semua' || item.lokasiGudang === currentFilter;
        const matchSearch = item.namaBahan.toLowerCase().includes(query);
        let totalQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
        let isMenipis = totalQty <= (item.minStock || 0);

        let isHampirExp = item.batches.some(b => {
            const exp = new Date(b.expDate);
            const daysDiff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
            return daysDiff <= 7;
        });

        let matchAlert = true;
        if (currentAlertFilter === 'min') matchAlert = isMenipis;
        else if (currentAlertFilter === 'exp') matchAlert = isHampirExp;

        return matchGudang && matchSearch && matchAlert;
    });

    if (filteredData.length === 0) {
        stockContainer.innerHTML = `<p>Tidak ada data ditemukan.</p>`; return;
    }

    const stockListElement = document.createElement('div');
    stockListElement.className = 'stock-list';

    filteredData.forEach(item => {
        let totalQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
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
        let stockBadge = totalQty <= (item.minStock || 0) ? '<span class="badge danger">Stok Menipis</span>' : '';

        let batchesHtml = item.batches.sort((a,b) => new Date(a.expDate) - new Date(b.expDate)).map(b => `
            <div class="batch-row">
                <div class="batch-row-header" style="flex: 1;">
                    <span>Exp: ${b.expDate}</span>
                    <strong style="margin: 0 10px;">${b.kuantitas} ${item.satuan}</strong>
                    <button class="btn-qr" onclick="showQRCode(${item.id}, ${b.idBatch}, '${item.namaBahan}', '${b.expDate}')">Print QR</button>
                </div>
            </div>
        `).join('');

        const card = document.createElement('div'); card.className = 'stock-card';
        card.innerHTML = `
            <div class="stock-info">
                <span class="stock-name">${item.namaBahan}</span>
                <span class="stock-kategori">${item.kategori || 'Tanpa Kategori'}</span>
                <div class="badges-container">
                    <span class="badge primary">Gudang ${item.lokasiGudang}</span> ${stockBadge} ${expBadge}
                </div>
                <div class="batch-list-container">
                    <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 3px; color: var(--text-color);">Rincian Batch (FIFO):</div>
                    ${batchesHtml}
                </div>
            </div>
            
            <div class="stock-controls-wrapper">
                <div class="stock-qty-adjust">
                    <button class="btn-action btn-qty" onclick="openIssueModal(${item.id})" title="Keluarkan Stok (FIFO)">-</button>
                    <div class="qty-display">${totalQty} <small>${item.satuan}</small></div>
                    <button class="btn-action btn-qty" onclick="openAddBatchModal(${item.id})" title="Tambah Stok">+</button>
                </div>
                <div class="action-buttons" style="margin-top: 0.5rem; justify-content: flex-end;">
                    <button class="btn-action btn-edit" style="color: var(--warning-color);" onclick="openOpnameModal(${item.id})">Opname</button>
                    <button class="btn-action btn-edit" onclick="openEditModal(${item.id})">Edit Info</button>
                    <button class="btn-action btn-delete" onclick="deleteStock(${item.id})">Hapus</button>
                </div>
            </div>
        `;
        stockListElement.appendChild(card);
    });
    stockContainer.appendChild(stockListElement);
}

// 5. FITUR: GENERATE & CETAK QR CODE
window.showQRCode = function(idBahan, idBatch, namaBahan, expDate) {
    const qrContainer = document.getElementById('qrcode-container');
    qrContainer.innerHTML = ""; 
    
    const qrText = `MBG|${idBahan}|${idBatch}`;
    
    qrContainer.setAttribute('data-nama', namaBahan);
    qrContainer.setAttribute('data-exp', expDate);
    qrContainer.setAttribute('data-batch', idBatch);
    
    document.getElementById('qrTitle').innerText = `${namaBahan} (Exp: ${expDate})`;
    
    new QRCode(qrContainer, {
        text: qrText,
        width: 150,
        height: 150,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.M
    });
    
    qrModal.classList.add('show');
}
window.closeQRModal = function() { qrModal.classList.remove('show'); }

window.printQRLabel = function() {
    const qrContainer = document.getElementById('qrcode-container');
    const canvas = qrContainer.querySelector('canvas');
    const img = qrContainer.querySelector('img');
    let qrSrc = '';
    
    if (canvas) {
        qrSrc = canvas.toDataURL("image/png");
    } else if (img && img.src) {
        qrSrc = img.src;
    } else {
        alert("Sistem masih merender QR Code, tunggu sedetik dan coba lagi.");
        return;
    }

    const namaBahan = qrContainer.getAttribute('data-nama') || "Bahan MBG";
    const expDate = qrContainer.getAttribute('data-exp') || "-";
    const batchId = qrContainer.getAttribute('data-batch') || "-";

    const printWindow = window.open('', '_blank', 'width=400,height=400');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak QR Stiker</title>
            <style>
                @page { margin: 0; size: 50mm 30mm; }
                body { margin: 0; padding: 0; width: 50mm; height: 30mm; background: #fff; display: flex; align-items: center; font-family: Arial, sans-serif; color: #000; box-sizing: border-box; }
                .label-wrapper { width: 100%; height: 100%; padding: 2mm; display: flex; align-items: center; box-sizing: border-box; }
                .qr-box { width: 25mm; height: 25mm; display: flex; justify-content: center; align-items: center; flex-shrink: 0; }
                .qr-box img { width: 100%; height: 100%; object-fit: contain; }
                .info-box { flex: 1; padding-left: 2mm; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
                .nama-bahan { font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 3px; line-height: 1.1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .detail-teks { font-size: 9px; margin: 1px 0; line-height: 1.1; }
            </style>
        </head>
        <body>
            <div class="label-wrapper">
                <div class="qr-box">
                    <img src="${qrSrc}" alt="QR Code" />
                </div>
                <div class="info-box">
                    <div class="nama-bahan">${namaBahan}</div>
                    <div class="detail-teks"><b>Exp:</b><br>${expDate}</div>
                    <div class="detail-teks"><b>Batch:</b> ${batchId}</div>
                </div>
            </div>
            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 300);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// 6. FITUR: SCANNER QR CODE (KAMERA)
window.openScannerModal = function() {
    scannerModal.classList.add('show');
    html5QrcodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => {
        alert("Gagal mengakses kamera. Pastikan Anda memberikan izin kamera ke browser.");
    });
}
window.closeScannerModal = function() {
    if(html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner.clear();
        }).catch(err => console.log(err));
    }
    scannerModal.classList.remove('show');
}

function onScanSuccess(decodedText, decodedResult) {
    const parts = decodedText.split('|');
    if(parts.length === 3 && parts[0] === 'MBG') {
        closeScannerModal(); 
        
        const idBahan = parseInt(parts[1]);
        const idBatch = parseInt(parts[2]);
        
        const item = daftarStok.find(i => i.id === idBahan);
        if(!item) return alert("Barang tidak ditemukan di database!");
        
        const batch = item.batches.find(b => b.idBatch === idBatch);
        if(!batch) return alert("Batch tidak valid atau sudah habis.");
        
        tempScanData = { idBahan, idBatch, item, batch };
        
        document.getElementById('scanItemDesc').innerText = `${item.namaBahan} (Sisa Batch Ini: ${batch.kuantitas} ${item.satuan})`;
        scanActionModal.classList.add('show');
    } else {
        alert("QR Code bukan format sistem MBG!");
    }
}
window.closeScanActionModal = function() { scanActionModal.classList.remove('show'); }

window.triggerScanAdd = function() {
    closeScanActionModal();
    openAddBatchModal(tempScanData.idBahan);
    document.getElementById('addBatchExp').value = tempScanData.batch.expDate;
}
window.triggerScanIssue = function() {
    closeScanActionModal();
    openIssueModal(tempScanData.idBahan, tempScanData.idBatch); 
}

// 7. Modifikasi Form Keluarkan Stok (Mendukung Scan + Konfirmasi Multi-Batch)
window.openIssueModal = function(id, specificBatchId = null) {
    const item = daftarStok.find(i => i.id === id);
    if (!item) return;

    let totalQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    if(totalQty <= 0) return alert("Stok habis, tidak bisa dikurangi.");

    document.getElementById('issueId').value = id;
    document.getElementById('issueBatchId').value = specificBatchId || "";
    formIssueStock.reset();
    issueModal.classList.add('show');
}
window.closeIssueModal = function() { issueModal.classList.remove('show'); }

formIssueStock.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('issueId').value);
    const specificBatchId = document.getElementById('issueBatchId').value;
    const item = daftarStok.find(i => i.id === id);
    if (!item) return;

    const amount = parseFloat(document.getElementById('issueQty').value);
    const alasan = document.getElementById('issueReason').value;
    const notes = document.getElementById('issueNotes').value;

    let totalQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    if (totalQty < amount) return alert("Stok tidak mencukupi untuk dikeluarkan sejumlah tersebut!");

    // ==========================================
    // OPTIMISASI: KONFIRMASI MULTI-BATCH (FIFO)
    // ==========================================
    let targetBatch = specificBatchId ? item.batches.find(b => b.idBatch == specificBatchId) : null;
    
    // Jika scan QR digunakan dan kuantitas batch yang discan TIDAK cukup
    if (targetBatch && targetBatch.kuantitas < amount) {
        const sisaDibutuhkan = amount - targetBatch.kuantitas;
        const pesanKonfirmasi = 
            `⚠️ PERINGATAN BATCH ⚠️\n\n` +
            `Stok pada batch yang Anda scan hanya tersisa ${targetBatch.kuantitas} ${item.satuan}.\n` +
            `Kekurangan sebanyak ${sisaDibutuhkan} ${item.satuan} akan DITARIK SECARA OTOMATIS dari batch lain (metode FIFO).\n\n` +
            `Pastikan Anda benar-benar mengambil fisik barang dari batch lain di gudang.\n` +
            `Apakah Anda yakin ingin melanjutkan?`;
            
        // Hentikan proses jika user membatalkan
        if (!confirm(pesanKonfirmasi)) {
            return; 
        }
    }
    // ==========================================

    let sisaDipotong = amount;

    // Potong dari spesifik batch hasil scan terlebih dahulu (jika ada)
    if(targetBatch) {
        if(targetBatch.kuantitas >= sisaDipotong) {
            targetBatch.kuantitas -= sisaDipotong;
            sisaDipotong = 0;
        } else {
            sisaDipotong -= targetBatch.kuantitas;
            targetBatch.kuantitas = 0;
        }
    }

    // Jika masih ada sisa pemotongan (baik karena multi-batch di atas, atau manual FIFO tanpa scan)
    if(sisaDipotong > 0) {
        item.batches.sort((a, b) => new Date(a.expDate) - new Date(b.expDate));
        for (let i = 0; i < item.batches.length; i++) {
            if (sisaDipotong <= 0) break;
            let batch = item.batches[i];
            
            // Skip jika kita memotong batch spesifik tadi (karena kuantitasnya pasti sudah 0)
            if (batch.kuantitas <= 0) continue;

            if (batch.kuantitas >= sisaDipotong) {
                batch.kuantitas -= sisaDipotong;
                sisaDipotong = 0;
            } else {
                sisaDipotong -= batch.kuantitas;
                batch.kuantitas = 0;
            }
        }
    }

    // Bersihkan batch yang kosong
    item.batches = item.batches.filter(b => b.kuantitas > 0);
    
    let newTotal = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    catatRiwayat(item.namaBahan, 'Keluar', amount, newTotal, item.satuan, alasan, notes);

    saveDataToStorage(); renderStockData(); closeIssueModal();
});

// 8. LOGIKA LAINNYA 
window.openAddBatchModal = function(id) { document.getElementById('addBatchId').value = id; formAddBatch.reset(); addBatchModal.classList.add('show'); }
window.closeAddBatchModal = function() { addBatchModal.classList.remove('show'); }
formAddBatch.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('addBatchId').value); const item = daftarStok.find(i => i.id === id);
    if(item) {
        const qty = parseFloat(document.getElementById('addBatchQty').value); const exp = document.getElementById('addBatchExp').value;
        item.batches.push({ idBatch: Date.now(), kuantitas: qty, expDate: exp });
        let newTotal = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
        catatRiwayat(item.namaBahan, 'Masuk', qty, newTotal, item.satuan);
        saveDataToStorage(); renderStockData(); closeAddBatchModal();
    }
});

function catatRiwayat(nama, jenis, jumlah, sisa, satuan, alasan = '', keterangan = '') {
    const log = { id: Date.now(), tanggal: new Date().toLocaleString('id-ID'), namaBahan: nama, jenis: jenis, jumlah: jumlah, sisa: sisa, satuan: satuan, alasan: alasan, keterangan: keterangan };
    riwayatStok.unshift(log); if(riwayatStok.length > 100) riwayatStok.pop(); saveHistoryToStorage();
}

window.openHistoryModal = function() {
    historyContainer.innerHTML = '';
    if (riwayatStok.length === 0) { historyContainer.innerHTML = '<p style="text-align:center; margin-top: 1rem;">Belum ada riwayat transaksi.</p>'; } 
    else {
        riwayatStok.forEach(log => {
            const isMasuk = log.jenis === 'Masuk';
            const colorClass = isMasuk ? 'text-green' : 'text-red';
            const sign = isMasuk ? '+' : '-';
            let extraInfoHtml = '';
            if (!isMasuk && log.alasan) {
                let badgeColor = log.alasan === 'Dimasak' ? 'primary' : 'danger';
                extraInfoHtml = `<div style="font-size: 0.75rem; margin-top: 6px; border-top: 1px dashed #cbd5e0; padding-top: 6px;"><span class="badge ${badgeColor}">${log.alasan}</span> ${log.keterangan ? `<span style="color: var(--text-muted); font-style: italic; margin-left: 5px;">- ${log.keterangan}</span>` : ''}</div>`;
            }
            historyContainer.innerHTML += `<div class="history-item"><div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><strong>${log.namaBahan}</strong><span class="badge ${isMasuk ? 'primary' : 'danger'}">${log.jenis}</span></div><div style="font-size: 0.85rem; color: var(--text-muted); display: flex; justify-content: space-between;"><span>${log.tanggal}</span><strong class="${colorClass}">${sign}${log.jumlah} ${log.satuan}</strong></div><div style="font-size: 0.8rem; margin-top: 5px; color: var(--text-muted);">Sisa stok akhir: <strong>${log.sisa} ${log.satuan}</strong></div>${extraInfoHtml}</div>`;
        });
    }
    historyModal.classList.add('show');
}
window.closeHistoryModal = function() { historyModal.classList.remove('show'); }

window.openOpnameModal = function(id) {
    const item = daftarStok.find(i => i.id === id); if (!item) return;
    let totalQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    document.getElementById('opnameId').value = id;
    document.getElementById('opnameSystemQty').value = `${totalQty} ${item.satuan}`;
    document.getElementById('opnameActualQty').value = totalQty;
    document.getElementById('opnameNotes').value = '';
    document.getElementById('opnameExpDateContainer').style.display = 'none';
    document.getElementById('opnameActualQty').oninput = function() {
        if (parseFloat(this.value) > totalQty) {
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
    let systemQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
    const actualQty = parseFloat(document.getElementById('opnameActualQty').value);
    const notes = document.getElementById('opnameNotes').value;
    if (actualQty === systemQty) { alert("Stok riil sama. Tidak ada penyesuaian."); closeOpnameModal(); return; }
    if (actualQty < systemQty) {
        let selisih = systemQty - actualQty; item.batches.sort((a, b) => new Date(a.expDate) - new Date(b.expDate));
        let sisaDipotong = selisih;
        for (let i = 0; i < item.batches.length; i++) {
            if (sisaDipotong <= 0) break; let batch = item.batches[i];
            if (batch.kuantitas >= sisaDipotong) { batch.kuantitas -= sisaDipotong; sisaDipotong = 0; } 
            else { sisaDipotong -= batch.kuantitas; batch.kuantitas = 0; }
        }
        item.batches = item.batches.filter(b => b.kuantitas > 0);
        let newTotal = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
        catatRiwayat(item.namaBahan, 'Keluar', selisih, newTotal, item.satuan, 'Selisih Hitung', '(Opname Defisit) ' + notes);
    } else {
        let selisih = actualQty - systemQty; const expDate = document.getElementById('opnameExpDate').value;
        item.batches.push({ idBatch: Date.now(), kuantitas: selisih, expDate: expDate });
        let newTotal = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
        catatRiwayat(item.namaBahan, 'Masuk', selisih, newTotal, item.satuan, 'Selisih Hitung', '(Opname Surplus) ' + notes);
    }
    saveDataToStorage(); renderStockData(); closeOpnameModal();
});

window.openEditModal = function(id) { const item = daftarStok.find(i => i.id === id); if (item) { document.getElementById('editId').value = item.id; document.getElementById('editNama').value = item.namaBahan; document.getElementById('editKategori').value = item.kategori || ''; document.getElementById('editSatuan').value = item.satuan; document.getElementById('editMinStock').value = item.minStock || 0; document.getElementById('editLokasiGudang').value = item.lokasiGudang; editModal.classList.add('show'); } }
window.closeEditModal = function() { editModal.classList.remove('show'); }
formEditStok.addEventListener('submit', function(e) { e.preventDefault(); const id = parseInt(document.getElementById('editId').value); const item = daftarStok.find(i => i.id === id); if (item) { item.namaBahan = document.getElementById('editNama').value.trim(); item.kategori = document.getElementById('editKategori').value; item.satuan = document.getElementById('editSatuan').value; item.minStock = parseFloat(document.getElementById('editMinStock').value); item.lokasiGudang = document.getElementById('editLokasiGudang').value; saveDataToStorage(); renderStockData(); closeEditModal(); } });

window.deleteStock = function(id) { if (confirm('Yakin ingin menghapus seluruh data barang ini?')) { daftarStok = daftarStok.filter(item => item.id !== id); saveDataToStorage(); renderStockData(); } }

formInputStok.addEventListener('submit', function (event) {
    event.preventDefault(); 
    const namaBahanInput = document.getElementById('namaBahan').value.trim();
    const existingItemIndex = daftarStok.findIndex(i => i.namaBahan.toLowerCase() === namaBahanInput.toLowerCase());
    if (existingItemIndex !== -1) {
        daftarStok[existingItemIndex].batches.push({ idBatch: Date.now(), kuantitas: parseFloat(document.getElementById('kuantitas').value), expDate: document.getElementById('expDate').value });
        alert(`Bahan "${namaBahanInput}" sudah ada. Kuantitas berhasil ditambahkan ke dalam Batch baru.`);
    } else {
        daftarStok.push({ id: Date.now(), namaBahan: namaBahanInput, kategori: document.getElementById('kategori').value, satuan: document.getElementById('satuan').value, minStock: parseFloat(document.getElementById('minStock').value), lokasiGudang: document.getElementById('lokasiGudang').value, batches: [{ idBatch: Date.now(), kuantitas: parseFloat(document.getElementById('kuantitas').value), expDate: document.getElementById('expDate').value }] });
    }
    saveDataToStorage(); renderStockData(); formInputStok.reset();
});

searchInput.addEventListener('input', renderStockData);
tabButtons.forEach(button => { button.addEventListener('click', () => { tabButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); currentFilter = button.getAttribute('data-filter'); renderStockData(); }); });
dashCards.forEach(card => { card.addEventListener('click', () => { dashCards.forEach(c => c.classList.remove('active')); card.classList.add('active'); currentAlertFilter = card.getAttribute('data-alert'); renderStockData(); }); });

// 9. LOGIKA EXPORT & IMPORT DATA 
window.exportExcel = async function() {
    if (typeof ExcelJS === 'undefined') {
        alert("Library ExcelJS belum dimuat. Pastikan Anda memiliki koneksi internet aktif.");
        return;
    }
    
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Daftar Stok
    const sheet1 = workbook.addWorksheet('Daftar Stok');
    sheet1.columns = [
        { header: 'Nama Bahan', key: 'nama', width: 25 },
        { header: 'Kategori', key: 'kategori', width: 20 },
        { header: 'Lokasi Gudang', key: 'lokasi', width: 15 },
        { header: 'Total Qty', key: 'total', width: 15 },
        { header: 'Satuan', key: 'satuan', width: 10 },
        { header: 'Rincian Batch', key: 'batch', width: 45 }
    ];
    sheet1.getRow(1).font = { bold: true };
    
    daftarStok.forEach(item => {
        let totalQty = item.batches.reduce((sum, b) => sum + b.kuantitas, 0);
        let batchInfo = item.batches.map(b => `${b.kuantitas} (Exp: ${b.expDate})`).join(', ');
        sheet1.addRow({
            nama: item.namaBahan,
            kategori: item.kategori || '-',
            lokasi: item.lokasiGudang,
            total: totalQty,
            satuan: item.satuan,
            batch: batchInfo
        });
    });

    // Sheet 2: Riwayat
    const sheet2 = workbook.addWorksheet('Riwayat Transaksi');
    sheet2.columns = [
        { header: 'Tanggal', key: 'tanggal', width: 20 },
        { header: 'Nama Bahan', key: 'nama', width: 25 },
        { header: 'Jenis', key: 'jenis', width: 10 },
        { header: 'Jumlah', key: 'jumlah', width: 10 },
        { header: 'Sisa Stok', key: 'sisa', width: 10 },
        { header: 'Satuan', key: 'satuan', width: 10 },
        { header: 'Alasan', key: 'alasan', width: 20 },
        { header: 'Keterangan', key: 'keterangan', width: 30 }
    ];
    sheet2.getRow(1).font = { bold: true };
    
    riwayatStok.forEach(log => {
        sheet2.addRow({
            tanggal: log.tanggal,
            nama: log.namaBahan,
            jenis: log.jenis,
            jumlah: log.jumlah,
            sisa: log.sisa,
            satuan: log.satuan,
            alasan: log.alasan || '-',
            keterangan: log.keterangan || '-'
        });
    });

    // Generate file dan download otomatis
    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Laporan_Stok_MBG_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
        alert("Gagal men-generate file Excel.");
        console.error(error);
    }
};

window.exportJSON = function() {
    const dataToExport = {
        daftarStok: daftarStok,
        riwayatStok: riwayatStok
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `backup_stok_mbg_${new Date().toISOString().split('T')[0]}.json`);
    
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

window.importJSON = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.daftarStok && importedData.riwayatStok) {
                daftarStok = importedData.daftarStok;
                riwayatStok = importedData.riwayatStok;
                saveDataToStorage();
                saveHistoryToStorage();
                renderStockData();
                alert('Data berhasil di-restore!');
            } else {
                alert('Format JSON tidak sesuai dengan sistem MBG!');
            }
        } catch (error) {
            alert('Gagal membaca file JSON!');
            console.error(error);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
};

document.addEventListener('DOMContentLoaded', renderStockData);