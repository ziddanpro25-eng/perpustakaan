/**
 * LibraVault — Perpustakaan Digital
 * app.js
 * © 2026 Firdaus Ziddan Azzainuri
 */

'use strict';

// ============================================================
// STORAGE KEYS
// ============================================================
const KEY_BOOKS   = 'LIBRAVAULT_BOOKS';
const KEY_LOANS   = 'LIBRAVAULT_LOANS';
const KEY_HISTORY = 'LIBRAVAULT_HISTORY';

// ============================================================
// STORAGE HELPERS
// ============================================================
function loadData(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
}
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ============================================================
// DATA ACCESSORS
// ============================================================
function getBooks()   { return loadData(KEY_BOOKS);   }
function getLoans()   { return loadData(KEY_LOANS);   }
function getHistory() { return loadData(KEY_HISTORY); }

function saveBooks(data)   { saveData(KEY_BOOKS, data);   }
function saveLoans(data)   { saveData(KEY_LOANS, data);   }
function saveHistory(data) { saveData(KEY_HISTORY, data); }

// ============================================================
// DATE HELPERS
// ============================================================
function todayISO() {
    return new Date().toISOString().split('T')[0];
}
function formatDate(iso) {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}
function daysUntil(iso) {
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(iso); due.setHours(0,0,0,0);
    return Math.round((due - today) / 86400000);
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3200);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function animateValue(element, start, end, duration = 600) {
    const from = Number(start) || 0;
    const to = Number(end) || 0;
    if (from === to) {
        element.textContent = to;
        return;
    }
    const startTime = performance.now();
    function tick(now) {
        const elapsed = Math.min(duration, now - startTime);
        const progress = easeOutCubic(elapsed / duration);
        element.textContent = Math.round(from + (to - from) * progress);
        if (elapsed < duration) {
            requestAnimationFrame(tick);
        }
    }
    requestAnimationFrame(tick);
}

function staggerCardAnimations(container, selector, baseDelay = 50) {
    const cards = container.querySelectorAll(selector);
    cards.forEach((card, index) => {
        card.style.animationDelay = `${Math.min(300, index * baseDelay)}ms`;
    });
}

// ============================================================
// NAVIGATION / TABS
// ============================================================
function initTabs() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');
            renderAll();
        });
    });
}

// ============================================================
// RENDER: KOLEKSI BUKU
// ============================================================
function renderKoleksi() {
    const books  = getBooks();
    const loans  = getLoans();
    const grid   = document.getElementById('bookGrid');
    const empty  = document.getElementById('emptyKoleksi');
    const search = document.getElementById('searchKoleksi').value.toLowerCase();
    const filter = document.getElementById('filterStatus').value;

    // Determine status per book
    const loanedMap = {};
    loans.forEach(l => {
        if (!loanedMap[l.bukuId] || loanedMap[l.bukuId] < l.totalPinjam) {
            loanedMap[l.bukuId] = (loanedMap[l.bukuId] || 0) + 1;
        }
    });

    let filtered = books.filter(b => {
        const matchSearch = b.judul.toLowerCase().includes(search) || b.penulis.toLowerCase().includes(search);
        const loanCount = loanedMap[b.id] || 0;
        const available = (b.stok - loanCount) > 0;
        const matchFilter =
            filter === 'semua' ||
            (filter === 'tersedia' && available) ||
            (filter === 'dipinjam' && !available);
        return matchSearch && matchFilter;
    });

    grid.innerHTML = '';

    if (filtered.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    filtered.forEach((book, idx) => {
        const loanCount = loanedMap[book.id] || 0;
        const sisaStok  = book.stok - loanCount;

        // Find if any loan for this book is late
        const bookLoans = loans.filter(l => l.bukuId === book.id);
        const hasLate   = bookLoans.some(l => daysUntil(l.tglKembali) < 0);

        let statusClass, statusLabel, spineClass, dotClass;
        if (sisaStok <= 0 && hasLate) {
            statusClass = 'status-terlambat'; statusLabel = 'Terlambat Kembali';
            spineClass  = 'terlambat'; dotClass = 'dot-terlambat';
        } else if (sisaStok <= 0) {
            statusClass = 'status-dipinjam'; statusLabel = 'Semua Dipinjam';
            spineClass  = 'dipinjam'; dotClass = 'dot-dipinjam';
        } else {
            statusClass = 'status-tersedia'; statusLabel = `${sisaStok} Tersedia`;
            spineClass  = ''; dotClass = 'dot-tersedia';
        }

        const card = document.createElement('div');
        card.className = 'book-card';
        card.style.animationDelay = `${Math.min(300, idx * 50)}ms`;
        card.innerHTML = `
            <div class="book-card-spine ${spineClass}"></div>
            <div class="book-card-body">
                <span class="book-card-genre">${book.genre}</span>
                <div class="book-card-title">${book.judul}</div>
                <div class="book-card-author">✍️ ${book.penulis}</div>
                <div class="book-card-year">📅 ${book.tahun}</div>
                <div class="book-card-stok">Stok: ${book.stok} | Dipinjam: ${loanCount}</div>
                <div class="book-card-status ${statusClass}">
                    <div class="status-dot ${dotClass}"></div>
                    ${statusLabel}
                </div>
            </div>
            <div class="book-card-footer">
                ${sisaStok > 0
                    ? `<button class="btn-sm btn-pinjam" onclick="openModalPinjam(${book.id})">📖 Pinjam</button>`
                    : `<button class="btn-sm btn-pinjam" disabled style="opacity:0.4;cursor:not-allowed;">📖 Pinjam</button>`
                }
                <button class="btn-sm btn-hapus" onclick="openModalHapus(${book.id})">🗑️ Hapus</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ============================================================
// RENDER: PINJAMAN AKTIF
// ============================================================
function renderPinjamAktif() {
    const loans = getLoans();
    const books = getBooks();
    const list  = document.getElementById('loanActiveList');
    const empty = document.getElementById('emptyPinjam');

    list.innerHTML = '';

    if (loans.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    // Sort: late first
    const sorted = [...loans].sort((a, b) => {
        const da = daysUntil(a.tglKembali), db = daysUntil(b.tglKembali);
        return da - db;
    });

    sorted.forEach((loan, idx) => {
        const book = books.find(b => b.id === loan.bukuId);
        if (!book) return;
        const days = daysUntil(loan.tglKembali);
        const isLate = days < 0;

        const card = document.createElement('div');
        card.className = `loan-card${isLate ? ' terlambat-card' : ''}`;
        card.style.animationDelay = `${Math.min(300, idx * 60)}ms`;
        card.innerHTML = `
            <div class="loan-book-info">
                <div class="loan-book-title">${book.judul}</div>
                <div class="loan-book-meta">✍️ ${book.penulis} &nbsp;|&nbsp; 👤 ${loan.peminjam}</div>
            </div>
            <div class="loan-dates">
                <div class="loan-date-item">📤 Pinjam: <span class="loan-date-val">${formatDate(loan.tglPinjam)}</span></div>
                <div class="loan-date-item ${isLate ? 'loan-due-warning' : ''}">
                    📥 Kembali: <span class="loan-date-val">${formatDate(loan.tglKembali)}</span>
                    ${isLate ? ' ⚠️' : ''}
                </div>
            </div>
            <div class="loan-countdown">
                <span class="countdown-num ${isLate ? 'late' : ''}">${isLate ? Math.abs(days) : days}</span>
                <span class="countdown-label">${isLate ? 'hari terlambat' : 'hari lagi'}</span>
            </div>
            <button class="btn-sm btn-kembali" onclick="kembalikanBuku(${loan.id})">✅ Kembalikan</button>
        `;
        list.appendChild(card);
    });
}

// ============================================================
// RENDER: RIWAYAT
// ============================================================
function renderRiwayat() {
    const history = getHistory();
    const tbody   = document.getElementById('historyTableBody');
    const empty   = document.getElementById('emptyRiwayat');

    tbody.innerHTML = '';

    if (history.length === 0) {
        empty.classList.remove('hidden');
        document.querySelector('.history-table-wrap').style.display = 'none';
        return;
    }
    empty.classList.add('hidden');
    document.querySelector('.history-table-wrap').style.display = '';

    // Show newest first
    const sorted = [...history].sort((a, b) => b.tglKembaliAktual.localeCompare(a.tglKembaliAktual));

    sorted.forEach(h => {
        const isLate = h.terlambat;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${h.judulBuku}</strong></td>
            <td>${h.peminjam}</td>
            <td>${formatDate(h.tglPinjam)}</td>
            <td>${formatDate(h.tglKembaliAktual)}</td>
            <td>
                ${isLate
                    ? `<span class="badge badge-late">⚠️ Terlambat ${h.hariTerlambat}h</span>`
                    : `<span class="badge badge-returned">✅ Tepat Waktu</span>`
                }
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================================
// RENDER: STATISTIK
// ============================================================
function renderStatistik() {
    const books   = getBooks();
    const loans   = getLoans();
    const history = getHistory();

    const loanCount  = loans.length;
    const lateCount  = loans.filter(l => daysUntil(l.tglKembali) < 0).length;
    const available  = books.reduce((acc, b) => {
        const borrowed = loans.filter(l => l.bukuId === b.id).length;
        return acc + Math.max(0, b.stok - borrowed);
    }, 0);

    const totalBukuEl = document.getElementById('sTotalBuku');
    const dipinjamEl = document.getElementById('sDipinjam');
    const tersediaEl = document.getElementById('sTersedia');
    const terlambatEl = document.getElementById('sTerlambat');

    animateValue(totalBukuEl, totalBukuEl.textContent, books.length);
    animateValue(dipinjamEl, dipinjamEl.textContent, loanCount);
    animateValue(tersediaEl, tersediaEl.textContent, available);
    animateValue(terlambatEl, terlambatEl.textContent, lateCount);

    // --- TOP BOOKS RANKING ---
    const allTransactions = [...loans.map(l => ({ bukuId: l.bukuId })), ...history.map(h => ({ bukuId: h.bukuId }))];
    const countMap = {};
    allTransactions.forEach(t => {
        countMap[t.bukuId] = (countMap[t.bukuId] || 0) + 1;
    });

    const maxCount = Math.max(1, ...Object.values(countMap));
    const sorted = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const rankList  = document.getElementById('topBooksRanking');
    const rankEmpty = document.getElementById('emptyRanking');
    rankList.innerHTML = '';

    if (sorted.length === 0) {
        rankEmpty.classList.remove('hidden');
        return;
    }
    rankEmpty.classList.add('hidden');

    sorted.forEach(([bukuId, count], idx) => {
        const book = books.find(b => b.id === Number(bukuId));
        if (!book) return;
        const rank = idx + 1;
        const numClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
        const barWidth = Math.round((count / maxCount) * 100);
        const item = document.createElement('div');
        item.className = 'rank-item';
        item.innerHTML = `
            <div class="rank-num ${numClass}">${rank}</div>
            <div class="rank-info">
                <div class="rank-title">${book.judul}</div>
                <div class="rank-author">${book.penulis} · ${book.genre}</div>
                <div class="rank-bar-wrap"><div class="rank-bar" style="width:0%" data-width="${barWidth}%"></div></div>
            </div>
            <div class="rank-count">
                <span class="rank-count-num">${count}</span>
                <span class="rank-count-label">kali dipinjam</span>
            </div>
        `;
        rankList.appendChild(item);
        // Animate bar
        requestAnimationFrame(() => {
            setTimeout(() => {
                item.querySelector('.rank-bar').style.width = barWidth + '%';
            }, 50 + idx * 80);
        });
    });
}

// ============================================================
// RENDER: SIDEBAR BADGES & MINI STATS
// ============================================================
function renderSidebarStats() {
    const books = getBooks();
    const loans = getLoans();
    const lateCount = loans.filter(l => daysUntil(l.tglKembali) < 0).length;

    const statTotalEl = document.getElementById('statTotalBuku');
    const statDipinjamEl = document.getElementById('statDipinjam');
    const statTerlambatEl = document.getElementById('statTerlambat');

    animateValue(statTotalEl, statTotalEl.textContent, books.length);
    animateValue(statDipinjamEl, statDipinjamEl.textContent, loans.length);
    animateValue(statTerlambatEl, statTerlambatEl.textContent, lateCount);

    const badge = document.getElementById('badgePinjam');
    if (loans.length > 0) {
        badge.textContent = loans.length;
        badge.classList.add('show');
    } else {
        badge.classList.remove('show');
    }
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll() {
    renderKoleksi();
    renderPinjamAktif();
    renderRiwayat();
    renderStatistik();
    renderSidebarStats();
}

// ============================================================
// MODAL: TAMBAH BUKU
// ============================================================
let editBookId = null;

function openModalTambahBuku() {
    editBookId = null;
    document.getElementById('modalTambahTitle').textContent = 'Tambah Buku Baru';
    document.getElementById('fJudul').value   = '';
    document.getElementById('fPenulis').value = '';
    document.getElementById('fTahun').value   = '';
    document.getElementById('fStok').value    = 1;
    document.getElementById('fGenre').value   = 'Umum';
    document.getElementById('modalTambahBuku').classList.remove('hidden');
}

function closeModalTambahBuku() {
    document.getElementById('modalTambahBuku').classList.add('hidden');
}

function saveBuku() {
    const judul  = document.getElementById('fJudul').value.trim();
    const penulis= document.getElementById('fPenulis').value.trim();
    const tahun  = parseInt(document.getElementById('fTahun').value);
    const stok   = parseInt(document.getElementById('fStok').value) || 1;
    const genre  = document.getElementById('fGenre').value;

    if (!judul || !penulis || !tahun) {
        showToast('Mohon lengkapi semua field wajib!', 'error'); return;
    }
    if (tahun < 1800 || tahun > 2099) {
        showToast('Tahun terbit tidak valid!', 'error'); return;
    }

    const books = getBooks();

    if (editBookId) {
        const idx = books.findIndex(b => b.id === editBookId);
        if (idx !== -1) {
            books[idx] = { ...books[idx], judul, penulis, tahun, stok, genre };
            showToast(`Buku "${judul}" berhasil diperbarui!`, 'success');
        }
    } else {
        books.push({ id: Date.now(), judul, penulis, tahun, stok, genre, addedAt: todayISO() });
        showToast(`Buku "${judul}" berhasil ditambahkan!`, 'success');
    }

    saveBooks(books);
    closeModalTambahBuku();
    renderAll();
}

// ============================================================
// MODAL: HAPUS BUKU
// ============================================================
let hapusBookId = null;

function openModalHapus(id) {
    const books = getBooks();
    const book  = books.find(b => b.id === id);
    if (!book) return;
    hapusBookId = id;
    document.getElementById('hapusJudul').textContent = book.judul;
    document.getElementById('modalHapus').classList.remove('hidden');
}

function closeModalHapus() {
    document.getElementById('modalHapus').classList.add('hidden');
    hapusBookId = null;
}

function confirmHapus() {
    if (!hapusBookId) return;
    const loans = getLoans();
    const hasActiveLoan = loans.some(l => l.bukuId === hapusBookId);
    if (hasActiveLoan) {
        showToast('Tidak dapat menghapus: buku masih dipinjam!', 'error');
        closeModalHapus(); return;
    }
    const books = getBooks().filter(b => b.id !== hapusBookId);
    saveBooks(books);
    showToast('Buku berhasil dihapus.', 'info');
    closeModalHapus();
    renderAll();
}

// ============================================================
// MODAL: PINJAM BUKU
// ============================================================
let pinjamBookId = null;

function openModalPinjam(id) {
    const books = getBooks();
    const book  = books.find(b => b.id === id);
    if (!book) return;
    pinjamBookId = id;

    document.getElementById('infoBukuPinjam').innerHTML = `
        <strong>${book.judul}</strong>
        <span>${book.penulis} · ${book.genre} · ${book.tahun}</span>
    `;
    document.getElementById('fPeminjam').value   = '';
    document.getElementById('fTglPinjam').value  = todayISO();

    // Default return date: 7 days from today
    const ret = new Date(); ret.setDate(ret.getDate() + 7);
    document.getElementById('fTglKembali').value = ret.toISOString().split('T')[0];

    document.getElementById('modalPinjam').classList.remove('hidden');
}

function closeModalPinjam() {
    document.getElementById('modalPinjam').classList.add('hidden');
    pinjamBookId = null;
}

function savePinjam() {
    const peminjam  = document.getElementById('fPeminjam').value.trim();
    const tglPinjam = document.getElementById('fTglPinjam').value;
    const tglKembali= document.getElementById('fTglKembali').value;

    if (!peminjam) { showToast('Nama peminjam wajib diisi!', 'error'); return; }
    if (!tglKembali) { showToast('Tanggal kembali wajib diisi!', 'error'); return; }
    if (tglKembali <= tglPinjam) { showToast('Tanggal kembali harus setelah tanggal pinjam!', 'error'); return; }

    const books = getBooks();
    const book  = books.find(b => b.id === pinjamBookId);
    const loans = getLoans();
    const loanCount = loans.filter(l => l.bukuId === pinjamBookId).length;
    if (loanCount >= book.stok) {
        showToast('Stok buku sudah habis!', 'error'); return;
    }

    loans.push({
        id: Date.now(),
        bukuId: pinjamBookId,
        peminjam,
        tglPinjam,
        tglKembali,
    });
    saveLoans(loans);
    showToast(`Buku dipinjam oleh ${peminjam} hingga ${formatDate(tglKembali)}.`, 'success');
    closeModalPinjam();
    renderAll();
}

// ============================================================
// KEMBALIKAN BUKU
// ============================================================
function kembalikanBuku(loanId) {
    const loans = getLoans();
    const loan  = loans.find(l => l.id === loanId);
    if (!loan) return;

    const books = getBooks();
    const book  = books.find(b => b.id === loan.bukuId);
    const days  = daysUntil(loan.tglKembali);
    const isLate= days < 0;

    // Save to history
    const history = getHistory();
    history.push({
        id: Date.now(),
        bukuId: loan.bukuId,
        judulBuku: book ? book.judul : 'Tidak diketahui',
        peminjam: loan.peminjam,
        tglPinjam: loan.tglPinjam,
        tglKembaliDue: loan.tglKembali,
        tglKembaliAktual: todayISO(),
        terlambat: isLate,
        hariTerlambat: isLate ? Math.abs(days) : 0,
    });
    saveHistory(history);

    // Remove from active loans
    saveLoans(loans.filter(l => l.id !== loanId));

    const msg = isLate
        ? `Buku dikembalikan terlambat ${Math.abs(days)} hari.`
        : `Buku berhasil dikembalikan tepat waktu!`;
    showToast(msg, isLate ? 'info' : 'success');
    renderAll();
}

// ============================================================
// INIT EVENTS
// ============================================================
function initEvents() {
    // Sidebar nav
    initTabs();

    // Tambah Buku
    document.getElementById('btnTambahBuku').addEventListener('click', openModalTambahBuku);
    document.getElementById('closeTambahBuku').addEventListener('click', closeModalTambahBuku);
    document.getElementById('cancelTambahBuku').addEventListener('click', closeModalTambahBuku);
    document.getElementById('saveBuku').addEventListener('click', saveBuku);

    // Hapus Buku
    document.getElementById('closeHapus').addEventListener('click', closeModalHapus);
    document.getElementById('cancelHapus').addEventListener('click', closeModalHapus);
    document.getElementById('confirmHapus').addEventListener('click', confirmHapus);

    // Pinjam
    document.getElementById('closePinjam').addEventListener('click', closeModalPinjam);
    document.getElementById('cancelPinjam').addEventListener('click', closeModalPinjam);
    document.getElementById('savePinjam').addEventListener('click', savePinjam);

    // Close modal on overlay click
    ['modalTambahBuku', 'modalPinjam', 'modalHapus'].forEach(id => {
        document.getElementById(id).addEventListener('click', function(e) {
            if (e.target === this) this.classList.add('hidden');
        });
    });

    // Search & filter
    document.getElementById('searchKoleksi').addEventListener('input', renderKoleksi);
    document.getElementById('filterStatus').addEventListener('change', renderKoleksi);

    // Keyboard shortcut: ESC closes modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            ['modalTambahBuku', 'modalPinjam', 'modalHapus'].forEach(id => {
                document.getElementById(id).classList.add('hidden');
            });
        }
    });
}

// ============================================================
// SEED DATA (first-time only)
// ============================================================
function seedDataIfEmpty() {
    if (getBooks().length > 0) return;
    const seed = [
        { id: 1000001, judul: 'Bumi Manusia', penulis: 'Pramoedya Ananta Toer', tahun: 1980, stok: 3, genre: 'Sastra', addedAt: '2025-01-01' },
        { id: 1000002, judul: 'Laskar Pelangi', penulis: 'Andrea Hirata', tahun: 2005, stok: 4, genre: 'Fiksi', addedAt: '2025-01-01' },
        { id: 1000003, judul: 'Sapiens: Riwayat Singkat Umat Manusia', penulis: 'Yuval Noah Harari', tahun: 2011, stok: 2, genre: 'Sejarah', addedAt: '2025-01-01' },
        { id: 1000004, judul: 'Atomic Habits', penulis: 'James Clear', tahun: 2018, stok: 3, genre: 'Non-Fiksi', addedAt: '2025-01-01' },
        { id: 1000005, judul: 'Filosofi Teras', penulis: 'Henry Manampiring', tahun: 2018, stok: 2, genre: 'Filsafat', addedAt: '2025-01-01' },
        { id: 1000006, judul: 'Clean Code', penulis: 'Robert C. Martin', tahun: 2008, stok: 2, genre: 'Sains & Teknologi', addedAt: '2025-01-01' },
    ];
    saveBooks(seed);

    // Seed beberapa pinjaman aktif
    const today = new Date();
    const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
    const daysFwd = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };

    saveLoans([
        { id: 2000001, bukuId: 1000001, peminjam: 'Siti Rahayu', tglPinjam: daysAgo(10), tglKembali: daysFwd(4) },
        { id: 2000002, bukuId: 1000002, peminjam: 'Budi Santoso', tglPinjam: daysAgo(14), tglKembali: daysAgo(2) }, // TERLAMBAT
        { id: 2000003, bukuId: 1000004, peminjam: 'Dewi Lestari', tglPinjam: daysAgo(3), tglKembali: daysFwd(11) },
    ]);

    // Seed riwayat
    saveHistory([
        { id: 3000001, bukuId: 1000003, judulBuku: 'Sapiens: Riwayat Singkat Umat Manusia', peminjam: 'Ari Wibowo', tglPinjam: daysAgo(30), tglKembaliDue: daysAgo(16), tglKembaliAktual: daysAgo(18), terlambat: false, hariTerlambat: 0 },
        { id: 3000002, bukuId: 1000001, judulBuku: 'Bumi Manusia', peminjam: 'Nurul Hidayah', tglPinjam: daysAgo(25), tglKembaliDue: daysAgo(11), tglKembaliAktual: daysAgo(9), terlambat: true, hariTerlambat: 2 },
        { id: 3000003, bukuId: 1000002, judulBuku: 'Laskar Pelangi', peminjam: 'Rizky Firmansyah', tglPinjam: daysAgo(20), tglKembaliDue: daysAgo(6), tglKembaliAktual: daysAgo(7), terlambat: false, hariTerlambat: 0 },
        { id: 3000004, bukuId: 1000005, judulBuku: 'Filosofi Teras', peminjam: 'Maya Putri', tglPinjam: daysAgo(18), tglKembaliDue: daysAgo(4), tglKembaliAktual: daysAgo(5), terlambat: false, hariTerlambat: 0 },
        { id: 3000005, bukuId: 1000002, judulBuku: 'Laskar Pelangi', peminjam: 'Hendra Kurniawan', tglPinjam: daysAgo(40), tglKembaliDue: daysAgo(26), tglKembaliAktual: daysAgo(24), terlambat: true, hariTerlambat: 2 },
    ]);
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    seedDataIfEmpty();
    initEvents();
    renderAll();
});