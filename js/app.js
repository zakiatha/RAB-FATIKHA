/**
 * app.js - Logika Utama Aplikasi RAB (Rencana Anggaran Biaya & Belanja)
 * Menangani Multi-Month Budgeting, 3 Kategori Utama, Ekspor Excel, Mode Pink Pastel, dan Catatan Saldo Berjalan
 */

const RABApp = (function() {
  'use strict';

  const STORAGE_KEY_DATA = 'rab_application_data_v2';
  const STORAGE_KEY_THEME = 'rab_theme_preference';

  const monthNamesID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // 3 Kategori Utama Belanja Keluarga
  const defaultCategories = [
    { id: 'cat_sayur', name: 'Sayur & Mayur', color: '#10b981', icon: '🥦' },
    { id: 'cat_protein', name: 'Protein (Daging, Ikan, Telur)', color: '#f97316', icon: '🥩' },
    { id: 'cat_bumbu', name: 'Bumbu & Minyak Dapur', color: '#8b5cf6', icon: '🧄' }
  ];

  function getSampleTransactions() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    
    return [
      {
        id: 'tx_1',
        date: `${y}-${m}-01`,
        categoryId: 'cat_bumbu',
        itemName: 'ebi+empon 7,5k, paket lodeh 5k',
        qty: 1,
        unit: 'paket',
        amount: 12500,
        note: 'Belanja bumbu & sayur lodeh pasar pagi',
        createdAt: new Date(`${y}-${m}-01T07:00:00`).toISOString()
      },
      {
        id: 'tx_2',
        date: `${y}-${m}-02`,
        categoryId: 'cat_sayur',
        itemName: 'kacang, lebu siam, tomat ijo, cabe merah besar, daun so',
        qty: 1,
        unit: 'paket',
        amount: 16500,
        note: 'Bahan sayur segar harian',
        createdAt: new Date(`${y}-${m}-02T07:30:00`).toISOString()
      },
      {
        id: 'tx_3',
        date: `${y}-${m}-03`,
        categoryId: 'cat_protein',
        itemName: 'Dada ayam fillet 500gr & telur 1/2 kg',
        qty: 1,
        unit: 'paket',
        amount: 32000,
        note: 'Lauk protein keluarga',
        createdAt: new Date(`${y}-${m}-03T08:15:00`).toISOString()
      },
      {
        id: 'tx_4',
        date: `${y}-${m}-04`,
        categoryId: 'cat_bumbu',
        itemName: 'Minyak kelapa 1L, bawang merah, bawang putih',
        qty: 1,
        unit: 'paket',
        amount: 28000,
        note: 'Stok bumbu dasar dapur',
        createdAt: new Date(`${y}-${m}-04T09:00:00`).toISOString()
      }
    ];
  }

  // App State
  let state = {
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth(), // 0-11
    monthlyBudgets: {}, // { 'YYYY-MM': { initialAmount: 300000, notes: '...' } }
    categories: [...defaultCategories],
    transactions: [],
    filter: {
      search: '',
      categoryId: 'all',
      dateRange: 'this_month' // 'all', 'this_month', 'this_week'
    },
    activeTab: 'dashboard'
  };

  function getActiveMonthKey() {
    return `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`;
  }

  /**
   * Dapatkan budget untuk bulan yang sedang aktif dipilih
   */
  function getCurrentMonthBudget() {
    const key = getActiveMonthKey();
    if (state.monthlyBudgets[key]) {
      return state.monthlyBudgets[key];
    }
    // Jika belum ada anggaran tersimpan untuk bulan ini, gunakan nilai default
    return {
      initialAmount: 300000, // Rp 300.000 default fleksibel
      periodName: `${monthNamesID[state.selectedMonth]} ${state.selectedYear}`,
      notes: `Anggaran belanja bulan ${monthNamesID[state.selectedMonth]} ${state.selectedYear}`
    };
  }

  /**
   * Load data dari LocalStorage
   */
  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DATA);
      if (stored) {
        const parsed = JSON.parse(stored);
        state.monthlyBudgets = parsed.monthlyBudgets || {};
        state.transactions = parsed.transactions || [];

        // Migrasi atau filter agar hanya 3 kategori utama yang aktif
        state.categories = defaultCategories;

        // Migrasi format lama jika ada
        if (parsed.budget && Object.keys(state.monthlyBudgets).length === 0) {
          const defaultKey = getActiveMonthKey();
          state.monthlyBudgets[defaultKey] = {
            initialAmount: parsed.budget.initialAmount || 300000,
            periodName: parsed.budget.periodName || `${monthNamesID[state.selectedMonth]} ${state.selectedYear}`,
            notes: parsed.budget.notes || ''
          };
        }
      } else {
        // First load
        const key = getActiveMonthKey();
        state.monthlyBudgets[key] = {
          initialAmount: 300000,
          periodName: `${monthNamesID[state.selectedMonth]} ${state.selectedYear}`,
          notes: 'Anggaran belanja dapur bulanan'
        };
        state.categories = [...defaultCategories];
        state.transactions = getSampleTransactions();
        saveData();
      }
    } catch (e) {
      console.error('Gagal memuat data LocalStorage:', e);
      state.transactions = getSampleTransactions();
    }
  }

  function saveData() {
    try {
      const payload = {
        monthlyBudgets: state.monthlyBudgets,
        categories: state.categories,
        transactions: state.transactions,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(payload));
    } catch (e) {
      console.error('Gagal menyimpan data ke LocalStorage:', e);
    }
  }

  /**
   * Dapatkan transaksi yang terjadi pada bulan yang dipilih
   */
  function getTransactionsForSelectedMonth() {
    const key = getActiveMonthKey();
    return state.transactions.filter(tx => {
      if (!tx.date) return false;
      return tx.date.startsWith(key);
    }).sort((a, b) => new Date(a.date) - new Date(b.date)); // Urut kronologis
  }

  /**
   * Kalkulasi Metrik Anggaran untuk Bulan yang Dipilih
   */
  function getBudgetMetrics() {
    const budget = getCurrentMonthBudget();
    const initial = Number(budget.initialAmount || 0);

    const monthTxs = getTransactionsForSelectedMonth();
    const totalSpent = monthTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const remaining = initial - totalSpent;
    const percentage = initial > 0 ? (totalSpent / initial) * 100 : 0;
    const isOverbudget = remaining < 0;

    return {
      initial,
      totalSpent,
      remaining,
      percentage: Math.min(percentage, 999),
      formattedPercentage: percentage.toFixed(1),
      isOverbudget
    };
  }

  function getCategoryById(id) {
    return state.categories.find(c => c.id === id) || {
      id: 'cat_sayur',
      name: 'Sayur & Mayur',
      color: '#10b981',
      icon: '🥦'
    };
  }

  /**
   * Filter Transaksi untuk Tampilan Log Belanja
   */
  function getFilteredTransactions() {
    const { search, categoryId, dateRange } = state.filter;
    const key = getActiveMonthKey();
    const now = new Date();

    return state.transactions.filter(tx => {
      // Filter Kategori
      if (categoryId !== 'all' && tx.categoryId !== categoryId) {
        return false;
      }

      // Filter Pencarian Teks
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchName = (tx.itemName || '').toLowerCase().includes(query);
        const matchNote = (tx.note || '').toLowerCase().includes(query);
        if (!matchName && !matchNote) return false;
      }

      // Filter Rentang Waktu
      if (dateRange === 'this_month') {
        if (!tx.date || !tx.date.startsWith(key)) return false;
      } else if (dateRange === 'this_week') {
        const txDate = new Date(tx.date);
        const dayOfWeek = now.getDay() || 7;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        startOfWeek.setHours(0,0,0,0);
        if (txDate < startOfWeek) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Descending untuk log
  }

  /**
   * Render Seluruh Antarmuka
   */
  function renderAll() {
    renderMonthSelectors();
    renderRoleUI();
    renderStatsDashboard();
    renderCategoryBreakdown();
    renderTransactionList();
    renderCompactShoppingNotes();
    renderCategoriesManagement();
    renderCalendarView();
    renderAnalytics();
  }

  /**
   * Render Pilihan Bulan & Tahun (Multi-Month Budgeting)
   */
  function renderMonthSelectors() {
    const monthSelects = document.querySelectorAll('.month-select');
    const yearSelects = document.querySelectorAll('.year-select');

    monthSelects.forEach(select => {
      select.value = state.selectedMonth;
    });

    yearSelects.forEach(select => {
      select.value = state.selectedYear;
    });

    // Update label periode aktif di UI
    const periodLabel = document.getElementById('budgetPeriodBadge');
    if (periodLabel) {
      periodLabel.textContent = `${monthNamesID[state.selectedMonth]} ${state.selectedYear}`;
    }
  }

  /**
   * Render Status Hak Akses (Admin vs User)
   */
  function renderRoleUI() {
    const isAdmin = Security.isAdmin();
    const roleBadge = document.getElementById('currentRoleBadge');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    const adminOnlyElements = document.querySelectorAll('.admin-only');

    if (roleBadge) {
      if (isAdmin) {
        roleBadge.className = 'role-badge role-admin';
        roleBadge.innerHTML = `
          <span class="role-dot"></span>
          <span class="role-text"><span class="desktop-text">Mode Admin (Akses Penuh)</span><span class="mobile-text">Admin</span></span>
        `;
      } else {
        roleBadge.className = 'role-badge role-user';
        roleBadge.innerHTML = `
          <span class="role-dot"></span>
          <span class="role-text"><span class="desktop-text">Mode Pengguna (Hanya Lihat)</span><span class="mobile-text">Tamu</span></span>
        `;
      }
    }

    if (adminLoginBtn) adminLoginBtn.style.display = isAdmin ? 'none' : 'inline-flex';
    if (adminLogoutBtn) adminLogoutBtn.style.display = isAdmin ? 'inline-flex' : 'none';

    adminOnlyElements.forEach(el => {
      if (isAdmin) {
        el.classList.remove('d-none');
        el.removeAttribute('disabled');
      } else {
        el.classList.add('d-none');
        el.setAttribute('disabled', 'true');
      }
    });

    const readOnlyNotice = document.getElementById('readOnlyBanner');
    if (readOnlyNotice) {
      readOnlyNotice.style.display = isAdmin ? 'none' : 'flex';
    }
  }

  /**
   * Render Statistik Dashboard
   */
  function renderStatsDashboard() {
    const metrics = getBudgetMetrics();

    const initialEl = document.getElementById('statInitialBudget');
    const spentEl = document.getElementById('statTotalSpent');
    const remainingEl = document.getElementById('statRemainingBudget');
    const percentEl = document.getElementById('statBudgetPercent');
    const progressBar = document.getElementById('budgetProgressBar');
    const budgetStatusText = document.getElementById('budgetStatusText');

    if (initialEl) initialEl.textContent = Security.formatRupiah(metrics.initial);
    if (spentEl) spentEl.textContent = Security.formatRupiah(metrics.totalSpent);
    
    if (remainingEl) {
      remainingEl.textContent = Security.formatRupiah(metrics.remaining);
      if (metrics.isOverbudget) {
        remainingEl.classList.add('text-danger');
        remainingEl.classList.remove('text-success');
      } else {
        remainingEl.classList.remove('text-danger');
        remainingEl.classList.add('text-success');
      }
    }

    if (percentEl) {
      percentEl.textContent = `${metrics.formattedPercentage}%`;
    }

    if (progressBar) {
      const p = Math.min(metrics.percentage, 100);
      progressBar.style.width = `${p}%`;
      progressBar.className = 'progress-bar-fill';
      if (metrics.percentage >= 100) {
        progressBar.classList.add('bg-danger');
      } else if (metrics.percentage >= 75) {
        progressBar.classList.add('bg-warning');
      } else {
        progressBar.classList.add('bg-success');
      }
    }

    if (budgetStatusText) {
      if (metrics.isOverbudget) {
        budgetStatusText.innerHTML = `<span class="badge-status-danger">⚠️ Melebihi Anggaran (${Security.formatRupiah(Math.abs(metrics.remaining))})</span>`;
      } else if (metrics.percentage >= 80) {
        budgetStatusText.innerHTML = `<span class="badge-status-warning">⚡ Mendekati Batas Anggaran</span>`;
      } else {
        budgetStatusText.innerHTML = `<span class="badge-status-success">✅ Anggaran Aman (${(100 - metrics.percentage).toFixed(1)}% tersisa)</span>`;
      }
    }
  }

  /**
   * Render Pengeluaran 3 Kategori Utama
   */
  function renderCategoryBreakdown() {
    const container = document.getElementById('categoryBreakdownGrid');
    if (!container) return;

    const metrics = getBudgetMetrics();
    const monthTxs = getTransactionsForSelectedMonth();
    const catMap = {};

    state.categories.forEach(c => {
      catMap[c.id] = { ...c, total: 0, count: 0 };
    });

    monthTxs.forEach(tx => {
      if (catMap[tx.categoryId]) {
        catMap[tx.categoryId].total += Number(tx.amount || 0);
        catMap[tx.categoryId].count += 1;
      }
    });

    const categoryList = Object.values(catMap);

    let html = '';
    categoryList.forEach(cat => {
      const share = metrics.totalSpent > 0 ? ((cat.total / metrics.totalSpent) * 100).toFixed(1) : 0;
      html += `
        <div class="category-stat-card">
          <div class="cat-card-header">
            <div class="cat-card-title">
              <span class="cat-icon-badge" style="background-color: ${cat.color}22; color: ${cat.color}">
                ${cat.icon || '🏷️'}
              </span>
              <span class="cat-name">${Security.sanitize(cat.name)}</span>
            </div>
            <span class="cat-share-badge">${share}%</span>
          </div>
          <div class="cat-card-body">
            <div class="cat-amount">${Security.formatRupiah(cat.total)}</div>
            <div class="cat-count">${cat.count} transaksi bulan ini</div>
          </div>
          <div class="cat-progress-track">
            <div class="cat-progress-fill" style="width: ${share}%; background-color: ${cat.color}"></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  /**
   * Render Catatan Belanja Ringkas (Sesuai Format Permintaan: '1. 12,5k (...). saldo : 287,5k')
   */
  function renderCompactShoppingNotes() {
    const container = document.getElementById('compactShoppingNotesList');
    const startBalanceLabel = document.getElementById('notesInitialBudgetLabel');
    if (!container) return;

    const budget = getCurrentMonthBudget();
    const initialAmount = Number(budget.initialAmount || 0);
    let runningBalance = initialAmount;

    if (startBalanceLabel) {
      startBalanceLabel.textContent = `Pagu Awal: ${Security.formatK(initialAmount)} (${Security.formatRupiah(initialAmount)})`;
    }

    const monthTxs = getTransactionsForSelectedMonth();

    if (monthTxs.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 20px; color: var(--text-muted); font-style: italic;">
          Belum ada catatan belanja di bulan ${monthNamesID[state.selectedMonth]} ${state.selectedYear}.
        </div>
      `;
      return;
    }

    let rawCopyText = `Catatan Belanja ${monthNamesID[state.selectedMonth]} ${state.selectedYear} (Pagu Awal: ${Security.formatK(initialAmount)})\n`;
    let html = '';

    monthTxs.forEach((tx, idx) => {
      runningBalance -= Number(tx.amount || 0);
      const spentK = Security.formatK(tx.amount);
      const balanceK = Security.formatK(runningBalance);
      const safeItem = Security.sanitize(tx.itemName);
      
      const lineText = `${idx + 1}. ${spentK} (${safeItem}). saldo : ${balanceK}`;
      rawCopyText += `${lineText}\n`;

      html += `
        <div class="note-item-line">
          <div class="note-text-main">
            <strong>${idx + 1}. ${spentK}</strong> (${safeItem})
          </div>
          <div class="note-balance-tag">
            saldo : ${balanceK}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Tombol Salin Teks
    const copyBtn = document.getElementById('btnCopyShoppingNotes');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(rawCopyText).then(() => {
          const originalText = copyBtn.innerHTML;
          copyBtn.innerHTML = `✅ Tersalin!`;
          setTimeout(() => { copyBtn.innerHTML = originalText; }, 2000);
        }).catch(err => {
          alert('Gagal menyalin teks: ' + err);
        });
      };
    }
  }

  /**
   * Render Tabel Log Belanja
   */
  function renderTransactionList() {
    const container = document.getElementById('transactionTableBody');
    const mobileContainer = document.getElementById('transactionMobileList');
    const countBadge = document.getElementById('txFilteredCount');
    const sumBadge = document.getElementById('txFilteredTotal');
    if (!container) return;

    const filtered = getFilteredTransactions();
    const isAdmin = Security.isAdmin();

    const totalFilteredAmount = filtered.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    if (countBadge) countBadge.textContent = `${filtered.length} Transaksi`;
    if (sumBadge) sumBadge.textContent = Security.formatRupiah(totalFilteredAmount);

    if (filtered.length === 0) {
      const emptyHtml = `
        <tr>
          <td colspan="6" class="text-center empty-state-cell">
            <div class="empty-state-wrap">
              <span class="empty-icon">🛒</span>
              <p class="empty-title">Belum ada catatan belanja di periode ini</p>
              <p class="empty-subtitle">Silakan tambah catatan baru atau ubah pilihan bulan.</p>
            </div>
          </td>
        </tr>
      `;
      container.innerHTML = emptyHtml;
      if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
      return;
    }

    let tableHtml = '';
    let mobileHtml = '';

    filtered.forEach((tx) => {
      const cat = getCategoryById(tx.categoryId);
      const safeName = Security.sanitize(tx.itemName);
      const safeNote = Security.sanitize(tx.note || '-');
      const safeDate = Security.sanitize(tx.date);
      const safeQty = tx.qty ? `${tx.qty} ${Security.sanitize(tx.unit || '')}` : '-';

      tableHtml += `
        <tr class="tx-row" data-id="${tx.id}">
          <td class="col-date">${safeDate}</td>
          <td class="col-cat">
            <span class="category-pill" style="background-color: ${cat.color}20; color: ${cat.color}; border: 1px solid ${cat.color}40">
              <span class="cat-emoji">${cat.icon || '🏷️'}</span>
              ${Security.sanitize(cat.name)}
            </span>
          </td>
          <td class="col-name">
            <strong>${safeName}</strong>
            ${tx.note ? `<div class="tx-row-note">${safeNote}</div>` : ''}
          </td>
          <td class="col-qty">${safeQty}</td>
          <td class="col-amount">
            <span class="tx-amount-text">${Security.formatRupiah(tx.amount)} <small style="color:var(--text-muted)">(${Security.formatK(tx.amount)})</small></span>
          </td>
          <td class="col-action">
            ${isAdmin ? `
              <div class="action-btn-group">
                <button type="button" class="btn-icon btn-edit-tx" data-id="${tx.id}" title="Edit Transaksi">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button type="button" class="btn-icon btn-delete-tx text-danger" data-id="${tx.id}" title="Hapus Transaksi">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            ` : `<span class="badge-readonly" title="Mode Baca Sahaja">Terkunci</span>`}
          </td>
        </tr>
      `;

      mobileHtml += `
        <div class="mobile-tx-card" data-id="${tx.id}">
          <div class="mobile-tx-top">
            <span class="category-pill" style="background-color: ${cat.color}20; color: ${cat.color}">
              <span class="cat-emoji">${cat.icon || '🏷️'}</span>
              ${Security.sanitize(cat.name)}
            </span>
            <span class="mobile-tx-date">${safeDate}</span>
          </div>
          <div class="mobile-tx-mid">
            <h4 class="mobile-tx-title">${safeName}</h4>
            <div class="mobile-tx-amount">${Security.formatRupiah(tx.amount)} <small>(${Security.formatK(tx.amount)})</small></div>
          </div>
          ${tx.note ? `<p class="mobile-tx-note">${safeNote}</p>` : ''}
          <div class="mobile-tx-bottom">
            <span class="mobile-tx-qty">Jumlah: ${safeQty}</span>
            ${isAdmin ? `
              <div class="action-btn-group">
                <button type="button" class="btn btn-outline btn-xs btn-edit-tx" data-id="${tx.id}">Edit</button>
                <button type="button" class="btn btn-outline-danger btn-xs btn-delete-tx" data-id="${tx.id}">Hapus</button>
              </div>
            ` : `<span class="badge-readonly">Hanya Lihat</span>`}
          </div>
        </div>
      `;
    });

    container.innerHTML = tableHtml;
    if (mobileContainer) mobileContainer.innerHTML = mobileHtml;

    attachTransactionRowEvents();
  }

  function attachTransactionRowEvents() {
    const editBtns = document.querySelectorAll('.btn-edit-tx');
    const deleteBtns = document.querySelectorAll('.btn-delete-tx');

    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openEditTransactionModal(id);
      });
    });

    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        deleteTransaction(id);
      });
    });
  }

  /**
   * Render Bagian Kategori (Hanya 3 Kategori Utama)
   */
  function renderCategoriesManagement() {
    const container = document.getElementById('categoriesListContainer');
    const selectFilter = document.getElementById('filterCategorySelect');
    const selectModal = document.getElementById('txCategoryInput');
    if (!container) return;

    let html = '';
    state.categories.forEach(cat => {
      const txCount = state.transactions.filter(t => t.categoryId === cat.id).length;
      html += `
        <div class="category-item-card">
          <div class="cat-badge-info">
            <span class="cat-circle-icon" style="background-color: ${cat.color}">${cat.icon || '🏷️'}</span>
            <div class="cat-text-info">
              <span class="cat-item-title">${Security.sanitize(cat.name)}</span>
              <span class="cat-item-subtitle">${txCount} transaksi tercatat</span>
            </div>
          </div>
          <span class="badge-readonly" style="color: ${cat.color}">Kategori Utama</span>
        </div>
      `;
    });

    container.innerHTML = html;

    if (selectFilter) {
      const currentSelected = selectFilter.value;
      let options = `<option value="all">Semua Kategori (3 Kategori)</option>`;
      state.categories.forEach(cat => {
        options += `<option value="${cat.id}">${cat.icon || ''} ${Security.sanitize(cat.name)}</option>`;
      });
      selectFilter.innerHTML = options;
      if (currentSelected) selectFilter.value = currentSelected;
    }

    if (selectModal) {
      let modalOptions = '';
      state.categories.forEach(cat => {
        modalOptions += `<option value="${cat.id}">${cat.icon || ''} ${Security.sanitize(cat.name)}</option>`;
      });
      selectModal.innerHTML = modalOptions;
    }
  }

  /**
   * Render Kalender
   */
  function renderCalendarView() {
    const calendarContainer = document.getElementById('rabCalendarContainer');
    if (!calendarContainer) return;

    RABCalendar.setMonth(state.selectedYear, state.selectedMonth);
    RABCalendar.render(calendarContainer, state.transactions, (dateStr, dayData) => {
      openDayDetailModal(dateStr, dayData);
    });
  }

  function openDayDetailModal(dateStr, dayData) {
    const modal = document.getElementById('dayDetailModal');
    const modalTitle = document.getElementById('dayDetailModalTitle');
    const modalTotal = document.getElementById('dayDetailModalTotal');
    const modalItemsContainer = document.getElementById('dayDetailItemsList');
    const addOnThisDateBtn = document.getElementById('addExpenseOnThisDateBtn');

    if (!modal) return;

    if (modalTitle) modalTitle.textContent = `Pengeluaran: ${dateStr}`;
    if (modalTotal) modalTotal.textContent = `${Security.formatRupiah(dayData.total)} (${Security.formatK(dayData.total)})`;

    if (addOnThisDateBtn) {
      addOnThisDateBtn.style.display = Security.isAdmin() ? 'inline-flex' : 'none';
      addOnThisDateBtn.onclick = () => {
        closeModal('dayDetailModal');
        openAddTransactionModal(dateStr);
      };
    }

    if (dayData.items.length === 0) {
      modalItemsContainer.innerHTML = `
        <div class="empty-state-wrap p-4 text-center">
          <span class="empty-icon">☕</span>
          <p class="empty-title">Tidak ada pengeluaran pada tanggal ini</p>
          <p class="empty-subtitle">Hari hemat tanpa pengeluaran belanja.</p>
        </div>
      `;
    } else {
      let itemsHtml = '';
      dayData.items.forEach(item => {
        const cat = getCategoryById(item.categoryId);
        itemsHtml += `
          <div class="day-detail-item">
            <div class="day-item-left">
              <span class="category-pill" style="background-color: ${cat.color}20; color: ${cat.color}">
                ${cat.icon || '🏷️'} ${Security.sanitize(cat.name)}
              </span>
              <h5 class="day-item-title">${Security.sanitize(item.itemName)}</h5>
              ${item.note ? `<p class="day-item-note">${Security.sanitize(item.note)}</p>` : ''}
            </div>
            <div class="day-item-right">
              <span class="day-item-amount">${Security.formatRupiah(item.amount)}</span>
              <small style="color:var(--text-muted)">(${Security.formatK(item.amount)})</small>
            </div>
          </div>
        `;
      });
      modalItemsContainer.innerHTML = itemsHtml;
    }

    openModal('dayDetailModal');
  }

  /**
   * Operasi Transaksi
   */
  function saveTransaction(formData) {
    Security.assertAdmin('Menyimpan catatan belanja');

    const { id, date, categoryId, itemName, qty, unit, amount, note } = formData;
    if (!itemName || !amount) {
      alert('Nama barang dan nominal pengeluaran wajib diisi');
      return false;
    }

    let savedTx = null;
    if (id) {
      const idx = state.transactions.findIndex(t => t.id === id);
      if (idx !== -1) {
        state.transactions[idx] = {
          ...state.transactions[idx],
          date: date || new Date().toISOString().split('T')[0],
          categoryId: categoryId || 'cat_sayur',
          itemName: Security.sanitize(itemName.trim()),
          qty: qty ? Number(qty) : null,
          unit: Security.sanitize(unit ? unit.trim() : ''),
          amount: Number(amount),
          note: Security.sanitize(note ? note.trim() : ''),
          updatedAt: new Date().toISOString()
        };
        savedTx = state.transactions[idx];
      }
    } else {
      const newTx = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        date: date || new Date().toISOString().split('T')[0],
        categoryId: categoryId || 'cat_sayur',
        itemName: Security.sanitize(itemName.trim()),
        qty: qty ? Number(qty) : null,
        unit: Security.sanitize(unit ? unit.trim() : ''),
        amount: Number(amount),
        note: Security.sanitize(note ? note.trim() : ''),
        createdAt: new Date().toISOString()
      };
      state.transactions.push(newTx);
      savedTx = newTx;
    }

    saveData();
    renderAll();

    // Sinkronisasi Cloud Supabase jika tersedia
    const client = window.SupabaseClient || (typeof SupabaseClient !== 'undefined' ? SupabaseClient : null);
    if (savedTx && client) {
      client.syncTransaction(savedTx).then(success => {
        if (success) {
          console.log('✅ Transaksi berhasil disinkronkan ke Supabase Cloud:', savedTx.itemName);
        } else {
          console.warn('⚠️ Gagal sinkron ke Supabase Cloud, data tetap tersimpan di lokal.');
        }
      });
    }
    return true;
  }

  function deleteTransaction(id) {
    if (!Security.isAdmin()) {
      openModal('adminPinModal');
      return;
    }

    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    if (confirm(`Apakah Anda yakin ingin menghapus belanja "${tx.itemName}" (${Security.formatRupiah(tx.amount)})?`)) {
      state.transactions = state.transactions.filter(t => t.id !== id);
      saveData();
      renderAll();

      // Hapus dari Supabase jika tersedia
      const client = window.SupabaseClient || (typeof SupabaseClient !== 'undefined' ? SupabaseClient : null);
      if (client) {
        client.deleteTransaction(id).then(success => {
          if (success) {
            console.log('✅ Transaksi berhasil dihapus dari Supabase Cloud');
          }
        });
      }
    }
  }

  /**
   * Perbarui Anggaran Awal Bulan Tertentu (Multi-Month Budgeting)
   */
  function updateMonthBudget(amount, periodName, notes) {
    if (!Security.isAdmin()) {
      openModal('adminPinModal');
      return;
    }

    const key = getActiveMonthKey();
    state.monthlyBudgets[key] = {
      initialAmount: Number(amount),
      periodName: Security.sanitize(periodName || `${monthNamesID[state.selectedMonth]} ${state.selectedYear}`),
      notes: Security.sanitize(notes || '')
    };

    saveData();
    renderAll();

    // Sinkronisasi Anggaran ke Supabase jika tersedia
    const client = window.SupabaseClient || (typeof SupabaseClient !== 'undefined' ? SupabaseClient : null);
    if (client) {
      client.syncBudget(key, state.monthlyBudgets[key]).then(success => {
        if (success) {
          console.log('✅ Anggaran berhasil disinkronkan ke Supabase Cloud');
        }
      });
    }
  }

  /**
   * Ekspor Laporan Belanja Bulanan ke Excel Berformat Rapi (Microsoft Excel XLS/XML Table)
   * Menyediakan section Pagu Anggaran, Nota Rincian Belanja, Rekapitulasi Kategori, dan Neraca
   */
  function exportMonthlyToExcel() {
    const budget = getCurrentMonthBudget();
    const initialAmount = Number(budget.initialAmount || 0);
    const monthTxs = getTransactionsForSelectedMonth();
    const monthName = monthNamesID[state.selectedMonth];
    const year = state.selectedYear;

    const totalSpent = monthTxs.reduce((s, t) => s + Number(t.amount || 0), 0);
    const sisaSaldo = initialAmount - totalSpent;
    const persentase = initialAmount > 0 ? ((totalSpent / initialAmount) * 100).toFixed(1) : 0;
    const isSurplus = sisaSaldo >= 0;

    // Hitung per kategori
    const catTotals = {
      cat_sayur: { name: 'Sayur & Mayur', total: 0, count: 0 },
      cat_protein: { name: 'Protein (Daging, Ikan, Telur)', total: 0, count: 0 },
      cat_bumbu: { name: 'Bumbu & Minyak Dapur', total: 0, count: 0 }
    };

    monthTxs.forEach(tx => {
      if (catTotals[tx.categoryId]) {
        catTotals[tx.categoryId].total += Number(tx.amount || 0);
        catTotals[tx.categoryId].count += 1;
      }
    });

    // Bangun HTML Workbook untuk Microsoft Excel
    let excelHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan RAB ${monthName} ${year}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
          .title-box { font-size: 16pt; font-weight: bold; color: #166534; text-align: center; }
          .subtitle { font-size: 10pt; color: #64748b; text-align: center; }
          .section-title { font-size: 12pt; font-weight: bold; background-color: #f1f5f9; color: #0f172a; padding: 6px 10px; border-bottom: 2px solid #cbd5e1; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th { background-color: #166534; color: #ffffff; font-weight: bold; border: 1px solid #14532d; padding: 8px 10px; text-align: center; }
          td { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: middle; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .num-format { mso-number-format:"\\#\\,\\#\\#0"; text-align: right; }
          .bold { font-weight: bold; }
          .bg-light { background-color: #f8fafc; }
          .bg-total { background-color: #f1f5f9; font-weight: bold; }
          .status-surplus { background-color: #dcfce7; color: #166534; font-weight: bold; text-align: center; }
          .status-deficit { background-color: #fee2e2; color: #991b1b; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="8" class="title-box">LAPORAN RENCANA ANGGARAN BIAYA &amp; REALISASI BELANJA</td>
          </tr>
          <tr>
            <td colspan="8" class="subtitle">Periode: ${monthName} ${year} | Diekspor pada: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
        </table>

        <!-- SECTION 1: PAGU ANGGARAN -->
        <table>
          <tr>
            <td colspan="4" class="section-title">A. PAGU ANGGARAN &amp; STATUS REALISASI</td>
          </tr>
          <tr class="bg-light">
            <th style="width: 25%;">Pagu Anggaran Awal</th>
            <th style="width: 25%;">Total Belanja (Realisasi)</th>
            <th style="width: 25%;">Sisa Saldo</th>
            <th style="width: 25%;">Tingkat Realisasi (%)</th>
          </tr>
          <tr>
            <td class="num-format bold">Rp ${initialAmount.toLocaleString('id-ID')}</td>
            <td class="num-format bold" style="color:#b45309;">Rp ${totalSpent.toLocaleString('id-ID')}</td>
            <td class="num-format bold" style="${isSurplus ? 'color:#15803d;' : 'color:#b91c1c;'}">Rp ${sisaSaldo.toLocaleString('id-ID')}</td>
            <td class="text-center bold">${persentase}% (${isSurplus ? 'Aman / Surplus' : 'Overbudget / Defisit'})</td>
          </tr>
        </table>

        <br>

        <!-- SECTION 2: NOTA RINCIAN BELANJA HARIAN -->
        <table>
          <tr>
            <td colspan="8" class="section-title">B. NOTA CATATAN &amp; RINCIAN BELANJA HARIAN</td>
          </tr>
          <tr>
            <th style="width: 6%;">No</th>
            <th style="width: 14%;">Tanggal</th>
            <th style="width: 18%;">Kategori</th>
            <th style="width: 30%;">Nama Belanja / Rincian Barang</th>
            <th style="width: 8%;">Qty</th>
            <th style="width: 8%;">Satuan</th>
            <th style="width: 16%;">Biaya Belanja</th>
            <th style="width: 16%;">Sisa Saldo</th>
          </tr>
    `;

    let runningBalance = initialAmount;
    if (monthTxs.length === 0) {
      excelHTML += `
          <tr>
            <td colspan="8" class="text-center" style="padding: 20px; color: #94a3b8;">Belum ada catatan belanja di periode ini.</td>
          </tr>
      `;
    } else {
      monthTxs.forEach((tx, idx) => {
        runningBalance -= Number(tx.amount || 0);
        const cat = getCategoryById(tx.categoryId);
        const safeName = tx.itemName + (tx.note ? ` (${tx.note})` : '');
        const rowBg = idx % 2 === 1 ? 'class="bg-light"' : '';

        excelHTML += `
          <tr ${rowBg}>
            <td class="text-center">${idx + 1}</td>
            <td class="text-center">${tx.date}</td>
            <td>${cat.name}</td>
            <td>${safeName}</td>
            <td class="text-center">${tx.qty || 1}</td>
            <td class="text-center">${tx.unit || '-'}</td>
            <td class="num-format">Rp ${Number(tx.amount || 0).toLocaleString('id-ID')}</td>
            <td class="num-format bold">Rp ${runningBalance.toLocaleString('id-ID')}</td>
          </tr>
        `;
      });
    }

    excelHTML += `
          <tr class="bg-total">
            <td colspan="6" class="text-right bold">TOTAL REALISASI PENGELUARAN</td>
            <td class="num-format bold" style="color:#b45309;">Rp ${totalSpent.toLocaleString('id-ID')}</td>
            <td class="num-format bold" style="${isSurplus ? 'color:#15803d;' : 'color:#b91c1c;'}">Rp ${sisaSaldo.toLocaleString('id-ID')}</td>
          </tr>
        </table>

        <br>

        <!-- SECTION 3: REKAPITULASI 3 KATEGORI UTAMA -->
        <table>
          <tr>
            <td colspan="5" class="section-title">C. REKAPITULASI PENGELUARAN 3 KATEGORI UTAMA</td>
          </tr>
          <tr class="bg-light">
            <th style="width: 8%;">No</th>
            <th style="width: 35%;">Kategori Belanja</th>
            <th style="width: 15%;">Jumlah Transaksi</th>
            <th style="width: 22%;">Total Biaya</th>
            <th style="width: 20%;">Proporsi Alokasi (%)</th>
          </tr>
    `;

    const catKeys = ['cat_sayur', 'cat_protein', 'cat_bumbu'];
    catKeys.forEach((key, idx) => {
      const c = catTotals[key];
      const prop = totalSpent > 0 ? ((c.total / totalSpent) * 100).toFixed(1) : 0;
      excelHTML += `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="bold">${c.name}</td>
            <td class="text-center">${c.count} transaksi</td>
            <td class="num-format">Rp ${c.total.toLocaleString('id-ID')}</td>
            <td class="text-center">${prop}%</td>
          </tr>
      `;
    });

    excelHTML += `
          <tr class="bg-total">
            <td colspan="3" class="text-right bold">TOTAL KATEGORI</td>
            <td class="num-format bold">Rp ${totalSpent.toLocaleString('id-ID')}</td>
            <td class="text-center bold">100.0%</td>
          </tr>
        </table>

        <br>

        <!-- SECTION 4: NERACA KEUANGAN BULANAN -->
        <table>
          <tr>
            <td colspan="3" class="section-title">D. NERACA KEUANGAN BULANAN</td>
          </tr>
          <tr>
            <th style="width: 45%;">Pos Neraca</th>
            <th style="width: 30%;">Debet / Kredit</th>
            <th style="width: 25%;">Keterangan</th>
          </tr>
          <tr>
            <td class="bold">1. Pagu Anggaran Masuk (Debet)</td>
            <td class="num-format bold" style="color: #15803d;">Rp ${initialAmount.toLocaleString('id-ID')}</td>
            <td>Pagu Dana Disediakan</td>
          </tr>
          <tr>
            <td class="bold">2. Total Realisasi Belanja (Kredit)</td>
            <td class="num-format bold" style="color: #b45309;">Rp ${totalSpent.toLocaleString('id-ID')}</td>
            <td>Pengeluaran Aktual</td>
          </tr>
          <tr class="${isSurplus ? 'status-surplus' : 'status-deficit'}">
            <td class="bold">3. Saldo Akhir Neraca (${isSurplus ? 'SURPLUS' : 'DEFISIT'})</td>
            <td class="num-format bold">Rp ${Math.abs(sisaSaldo).toLocaleString('id-ID')}</td>
            <td class="bold">${isSurplus ? '✅ Dana Bersisa / Hemat' : '⚠️ Defisit / Melebihi Pagu'}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHTML], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `Laporan_RAB_${monthName}_${year}.xls`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Render Tab Grafik & Neraca Keuangan
   */
  function renderAnalytics() {
    const budget = getCurrentMonthBudget();
    const initialAmount = Number(budget.initialAmount || 0);
    const monthTxs = getTransactionsForSelectedMonth();
    const totalSpent = monthTxs.reduce((s, t) => s + Number(t.amount || 0), 0);
    const sisaSaldo = initialAmount - totalSpent;
    const isSurplus = sisaSaldo >= 0;
    const rasio = initialAmount > 0 ? ((totalSpent / initialAmount) * 100).toFixed(1) : 0;

    // 1. Render Neraca Chips & Periode
    const tableBody = document.getElementById('balanceSheetTableBody');
    const chipSurplus = document.getElementById('neracaStatusChip');
    const chipRatio = document.getElementById('neracaRatioChip');
    const neracaPeriodLabel = document.getElementById('neracaPeriodLabel');

    if (neracaPeriodLabel) {
      neracaPeriodLabel.textContent = `Periode: ${monthNamesID[state.selectedMonth]} ${state.selectedYear}`;
    }

    if (chipSurplus) {
      if (isSurplus) {
        chipSurplus.className = 'balance-chip chip-surplus';
        chipSurplus.innerHTML = `✅ Surplus: ${Security.formatRupiah(sisaSaldo)}`;
      } else {
        chipSurplus.className = 'balance-chip chip-deficit';
        chipSurplus.innerHTML = `⚠️ Defisit: ${Security.formatRupiah(Math.abs(sisaSaldo))}`;
      }
    }

    if (chipRatio) {
      chipRatio.innerHTML = `Rasio: <strong>${rasio}%</strong>`;
    }

    // Hitung pengeluaran per 3 kategori
    const catTotals = {
      cat_sayur: { name: 'Sayur & Mayur', total: 0, count: 0, color: '#10b981', icon: '🥦' },
      cat_protein: { name: 'Protein (Daging, Ikan, Telur)', total: 0, count: 0, color: '#f97316', icon: '🥩' },
      cat_bumbu: { name: 'Bumbu & Minyak Dapur', total: 0, count: 0, color: '#8b5cf6', icon: '🧄' }
    };

    monthTxs.forEach(tx => {
      if (catTotals[tx.categoryId]) {
        catTotals[tx.categoryId].total += Number(tx.amount || 0);
        catTotals[tx.categoryId].count += 1;
      }
    });

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td><strong>1. Pagu Anggaran Masuk (Debet)</strong><br><small style="color:var(--text-muted)">Alokasi belanja awal</small></td>
          <td class="text-right" style="color:var(--success); font-weight:700;">${Security.formatRupiah(initialAmount)}</td>
          <td class="text-right">-</td>
          <td class="text-right font-bold">${Security.formatRupiah(initialAmount)}</td>
        </tr>
        <tr>
          <td><strong>2. Belanja Sayur & Mayur</strong><br><small style="color:var(--text-muted)">${catTotals.cat_sayur.count} transaksi</small></td>
          <td class="text-right">-</td>
          <td class="text-right" style="color:var(--danger);">${Security.formatRupiah(catTotals.cat_sayur.total)}</td>
          <td class="text-right">-</td>
        </tr>
        <tr>
          <td><strong>3. Belanja Protein</strong><br><small style="color:var(--text-muted)">${catTotals.cat_protein.count} transaksi</small></td>
          <td class="text-right">-</td>
          <td class="text-right" style="color:var(--danger);">${Security.formatRupiah(catTotals.cat_protein.total)}</td>
          <td class="text-right">-</td>
        </tr>
        <tr>
          <td><strong>4. Belanja Bumbu & Minyak Dapur</strong><br><small style="color:var(--text-muted)">${catTotals.cat_bumbu.count} transaksi</small></td>
          <td class="text-right">-</td>
          <td class="text-right" style="color:var(--danger);">${Security.formatRupiah(catTotals.cat_bumbu.total)}</td>
          <td class="text-right">-</td>
        </tr>
        <tr class="total-row">
          <td><strong>TOTAL REALISASI BELANJA (KREDIT)</strong></td>
          <td class="text-right">-</td>
          <td class="text-right" style="color:var(--danger); font-weight:800;">${Security.formatRupiah(totalSpent)}</td>
          <td class="text-right">-</td>
        </tr>
        <tr class="total-row" style="${isSurplus ? 'color:var(--success);' : 'color:var(--danger);'}">
          <td><strong>SALDO BERSIH (${isSurplus ? 'SURPLUS' : 'DEFISIT'})</strong></td>
          <td colspan="2" class="text-right"><small style="color:var(--text-muted)">Efisiensi Pengeluaran: ${rasio}%</small></td>
          <td class="text-right" style="font-size:1.05rem;">${Security.formatRupiah(sisaSaldo)}</td>
        </tr>
      `;
    }

    // 2. Render Bar Chart (Tren Pengeluaran Harian)
    renderBarChart(monthTxs);

    // 3. Render Donut / Pie Chart (3 Kategori)
    renderDonutChart(catTotals, totalSpent);
  }

  /**
   * Render Bar Chart (Grafik Batang Pengeluaran Harian)
   */
  function renderBarChart(monthTxs) {
    const container = document.getElementById('dailyBarChartContainer');
    if (!container) return;

    // Grouping per tanggal
    const dailyMap = {};
    monthTxs.forEach(tx => {
      const d = tx.date ? tx.date.split('-')[2] : '01';
      dailyMap[d] = (dailyMap[d] || 0) + Number(tx.amount || 0);
    });

    const days = Object.keys(dailyMap).sort();

    if (days.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="color: var(--text-muted); font-size: 0.85rem; padding: 40px 0;">
          Belum ada data pengeluaran untuk ditampilkan pada grafik batang.
        </div>
      `;
      return;
    }

    const maxVal = Math.max(...Object.values(dailyMap), 50000);
    const chartHeight = 200;
    const barWidth = Math.min(36, Math.max(16, Math.floor(360 / days.length) - 8));
    const totalWidth = Math.max(400, days.length * (barWidth + 14) + 40);

    let svgBars = '';
    days.forEach((day, i) => {
      const amt = dailyMap[day];
      const h = Math.max(4, Math.round((amt / maxVal) * (chartHeight - 40)));
      const x = 30 + i * (barWidth + 14);
      const y = chartHeight - h - 25;

      svgBars += `
        <g>
          <rect class="bar-rect" x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="4" fill="url(#barGradient)">
            <title>Tanggal ${day}: ${Security.formatRupiah(amt)}</title>
          </rect>
          <text class="bar-label-x" x="${x + barWidth / 2}" y="${chartHeight - 8}">Tgl ${parseInt(day, 10)}</text>
          <text class="bar-label-x" x="${x + barWidth / 2}" y="${y - 6}" style="font-weight:700; fill:var(--text-primary); font-size:10px;">${Security.formatK(amt)}</text>
        </g>
      `;
    });

    container.innerHTML = `
      <svg class="bar-chart-svg" viewBox="0 0 ${totalWidth} ${chartHeight}">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#db2777"/>
            <stop offset="100%" stop-color="#6366f1"/>
          </linearGradient>
        </defs>
        <line class="bar-axis-line" x1="10" y1="${chartHeight - 24}" x2="${totalWidth - 10}" y2="${chartHeight - 24}"/>
        ${svgBars}
      </svg>
    `;
  }

  /**
   * Render Donut / Pie Chart (Proporsi 3 Kategori Belanja)
   */
  function renderDonutChart(catTotals, totalSpent) {
    const container = document.getElementById('categoryPieChartContainer');
    const legendContainer = document.getElementById('categoryPieLegendList');
    if (!container || !legendContainer) return;

    if (totalSpent <= 0) {
      container.innerHTML = `
        <div class="text-center" style="color: var(--text-muted); font-size: 0.85rem; padding: 40px 0;">
          Belum ada data pengeluaran untuk ditampilkan pada pie chart.
        </div>
      `;
      legendContainer.innerHTML = '';
      return;
    }

    const radius = 65;
    const circumference = 2 * Math.PI * radius; // ~408.4

    const keys = ['cat_sayur', 'cat_protein', 'cat_bumbu'];
    let accumulatedPercent = 0;
    let svgSlices = '';
    let legendHtml = '';

    keys.forEach(key => {
      const cat = catTotals[key];
      const share = totalSpent > 0 ? (cat.total / totalSpent) : 0;
      const percent = (share * 100).toFixed(1);
      const dashLength = share * circumference;
      const dashOffset = -(accumulatedPercent * circumference);

      accumulatedPercent += share;

      if (share > 0) {
        svgSlices += `
          <circle class="donut-slice" 
                  cx="100" cy="100" r="${radius}" 
                  fill="transparent" 
                  stroke="${cat.color}" 
                  stroke-width="26" 
                  stroke-dasharray="${dashLength} ${circumference - dashLength}" 
                  stroke-dashoffset="${dashOffset}">
            <title>${cat.name}: ${Security.formatRupiah(cat.total)} (${percent}%)</title>
          </circle>
        `;
      }

      legendHtml += `
        <div class="pie-legend-item">
          <div class="pie-legend-left">
            <span class="pie-legend-dot" style="background-color: ${cat.color}"></span>
            <span>${cat.icon} <strong>${Security.sanitize(cat.name)}</strong></span>
          </div>
          <div style="text-align: right;">
            <span class="pie-legend-percent" style="color: ${cat.color}">${percent}%</span>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${Security.formatRupiah(cat.total)}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div style="position: relative; width: 200px; height: 200px;">
        <svg class="donut-svg" viewBox="0 0 200 200">
          ${svgSlices}
        </svg>
        <div class="donut-center-text">
          <span class="donut-center-amount">${Security.formatK(totalSpent)}</span>
          <span class="donut-center-label">Total Belanja</span>
        </div>
      </div>
    `;

    legendContainer.innerHTML = legendHtml;
  }

  /**
   * Modal Management Helpers
   */
  function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.add('active');
      document.body.classList.add('modal-open');
    }
  }

  function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.remove('active');
      document.body.classList.remove('modal-open');
    }
  }

  function openAddTransactionModal(defaultDate = null) {
    if (!Security.isAdmin()) {
      openModal('adminPinModal');
      return;
    }

    const form = document.getElementById('transactionForm');
    if (!form) return;
    form.reset();

    document.getElementById('txIdInput').value = '';
    document.getElementById('txModalTitle').textContent = 'Tambah Catatan Belanja';

    const curMonthStr = String(state.selectedMonth + 1).padStart(2, '0');
    const todayStr = defaultDate || `${state.selectedYear}-${curMonthStr}-01`;
    document.getElementById('txDateInput').value = todayStr;

    openModal('transactionModal');
  }

  function openEditTransactionModal(id) {
    if (!Security.isAdmin()) {
      openModal('adminPinModal');
      return;
    }

    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    document.getElementById('txIdInput').value = tx.id;
    document.getElementById('txModalTitle').textContent = 'Edit Catatan Belanja';
    document.getElementById('txDateInput').value = tx.date || '';
    document.getElementById('txCategoryInput').value = tx.categoryId || 'cat_sayur';
    document.getElementById('txNameInput').value = tx.itemName || '';
    document.getElementById('txQtyInput').value = tx.qty || '';
    document.getElementById('txUnitInput').value = tx.unit || '';
    document.getElementById('txAmountInput').value = tx.amount || '';
    document.getElementById('txNoteInput').value = tx.note || '';

    openModal('transactionModal');
  }

  function openEditBudgetModal() {
    if (!Security.isAdmin()) {
      openModal('adminPinModal');
      return;
    }

    const budget = getCurrentMonthBudget();
    document.getElementById('budgetAmountInput').value = budget.initialAmount || '';
    document.getElementById('budgetPeriodInput').value = `${monthNamesID[state.selectedMonth]} ${state.selectedYear}`;
    document.getElementById('budgetNotesInput').value = budget.notes || '';

    const titleEl = document.getElementById('budgetModalMonthTitle');
    if (titleEl) {
      titleEl.textContent = `Atur Anggaran Bulan ${monthNamesID[state.selectedMonth]} ${state.selectedYear}`;
    }

    openModal('budgetModal');
  }

  /**
   * Export & Import Backup Data JSON
   */
  function exportDataJSON() {
    const payload = {
      app: 'RAB System',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      monthlyBudgets: state.monthlyBudgets,
      categories: state.categories,
      transactions: state.transactions
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `RAB_Full_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function importDataJSON(jsonString) {
    Security.assertAdmin('Mengimpor data backup');

    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed.transactions)) {
        throw new Error('Format file backup JSON tidak valid');
      }

      if (confirm('Impor data akan menggantikan data RAB yang ada saat ini. Lanjutkan?')) {
        state.monthlyBudgets = parsed.monthlyBudgets || {};
        state.transactions = parsed.transactions || [];
        saveData();
        renderAll();
        alert('Data berhasil dipulihkan!');
      }
    } catch (e) {
      alert('Gagal mengimpor file: ' + e.message);
    }
  }

  /**
   * Inisialisasi Tema (Dark, Light, Pink Pastel)
   */
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleUI(savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        let newTheme = 'light';
        if (currentTheme === 'dark') newTheme = 'light';
        else if (currentTheme === 'light') newTheme = 'pink-pastel';
        else newTheme = 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(STORAGE_KEY_THEME, newTheme);
        updateThemeToggleUI(newTheme);
      });
    }
  }

  function updateThemeToggleUI(theme) {
    const iconContainer = document.getElementById('themeToggleIcon');
    const labelContainer = document.getElementById('themeToggleLabel');
    if (!iconContainer) return;

    if (theme === 'pink-pastel') {
      iconContainer.innerHTML = `🌸`;
      if (labelContainer) labelContainer.textContent = 'Pink Pastel';
    } else if (theme === 'light') {
      iconContainer.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
      if (labelContainer) labelContainer.textContent = 'Terang';
    } else {
      iconContainer.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      if (labelContainer) labelContainer.textContent = 'Gelap';
    }
  }

  /**
   * Setup Event Listeners
   */
  function initEventListeners() {
    // 0. Sinkronisasi Kalender
    window.addEventListener('rab:monthchange', (e) => {
      if (e.detail) {
        state.selectedYear = e.detail.year;
        state.selectedMonth = e.detail.month;
        renderAll();
      }
    });

    // 1. Month & Year Selectors
    const monthSelects = document.querySelectorAll('.month-select');
    const yearSelects = document.querySelectorAll('.year-select');

    monthSelects.forEach(select => {
      select.addEventListener('change', (e) => {
        state.selectedMonth = parseInt(e.target.value, 10);
        renderAll();
      });
    });

    yearSelects.forEach(select => {
      select.addEventListener('change', (e) => {
        state.selectedYear = parseInt(e.target.value, 10);
        renderAll();
      });
    });

    // 2. Tombol Navigasi Bulan Cepat (Prev / Next Bulan)
    const prevMonthBtn = document.getElementById('btnPrevMonth');
    const nextMonthBtn = document.getElementById('btnNextMonth');

    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        state.selectedMonth--;
        if (state.selectedMonth < 0) {
          state.selectedMonth = 11;
          state.selectedYear--;
        }
        renderAll();
      });
    }

    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => {
        state.selectedMonth++;
        if (state.selectedMonth > 11) {
          state.selectedMonth = 0;
          state.selectedYear++;
        }
        renderAll();
      });
    }

    // 3. Tab Navigation
    const navTabs = document.querySelectorAll('.nav-tab-btn, .mobile-nav-item');
    navTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (!targetTab) return;

        navTabs.forEach(b => b.classList.remove('active'));
        document.querySelectorAll(`[data-tab="${targetTab}"]`).forEach(b => b.classList.add('active'));

        document.querySelectorAll('.tab-content-section').forEach(sec => {
          sec.classList.remove('active');
        });
        const activeSec = document.getElementById(`tabSection_${targetTab}`);
        if (activeSec) activeSec.classList.add('active');

        if (targetTab === 'calendar') {
          renderCalendarView();
        } else if (targetTab === 'analytics') {
          renderAnalytics();
        }
      });
    });

    // 4. Filter Belanja
    const searchInput = document.getElementById('searchTxInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.filter.search = e.target.value;
        renderTransactionList();
      });
    }

    const catFilter = document.getElementById('filterCategorySelect');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        state.filter.categoryId = e.target.value;
        renderTransactionList();
      });
    }

    const dateFilter = document.getElementById('filterDateRangeSelect');
    if (dateFilter) {
      dateFilter.addEventListener('change', (e) => {
        state.filter.dateRange = e.target.value;
        renderTransactionList();
      });
    }

    // 5. Admin Login & Logout
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    if (adminLoginBtn) {
      adminLoginBtn.addEventListener('click', () => {
        document.getElementById('adminPinInput').value = '';
        openModal('adminPinModal');
      });
    }

    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener('click', () => {
        if (confirm('Keluar dari Mode Admin dan kembali ke Mode Pengguna (Hanya Lihat)?')) {
          Security.logoutAdmin();
          renderAll();
        }
      });
    }

    const pinInput = document.getElementById('adminPinInput');
    const pinSubmitBtn = document.getElementById('adminPinSubmitBtn');
    if (pinInput && pinSubmitBtn) {
      pinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          pinSubmitBtn.click();
        }
      });
    }

    if (pinSubmitBtn) {
      pinSubmitBtn.addEventListener('click', async () => {
        const pinVal = document.getElementById('adminPinInput').value;
        const res = await Security.verifyAdminPIN(pinVal);
        if (res.success) {
          closeModal('adminPinModal');
          renderAll();
        } else {
          alert(res.message || 'PIN salah! Silakan coba lagi.');
        }
      });
    }

    // 6. Form Submit: Transaksi
    const txForm = document.getElementById('transactionForm');
    if (txForm) {
      txForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
          id: document.getElementById('txIdInput').value,
          date: document.getElementById('txDateInput').value,
          categoryId: document.getElementById('txCategoryInput').value,
          itemName: document.getElementById('txNameInput').value,
          qty: document.getElementById('txQtyInput').value,
          unit: document.getElementById('txUnitInput').value,
          amount: document.getElementById('txAmountInput').value,
          note: document.getElementById('txNoteInput').value
        };

        if (saveTransaction(data)) {
          closeModal('transactionModal');
        }
      });
    }

    // 7. Form Submit: Edit Budget Bulan Aktif
    const budgetForm = document.getElementById('budgetForm');
    if (budgetForm) {
      budgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = document.getElementById('budgetAmountInput').value;
        const period = document.getElementById('budgetPeriodInput').value;
        const notes = document.getElementById('budgetNotesInput').value;

        updateMonthBudget(amount, period, notes);
        closeModal('budgetModal');
      });
    }

    // 8. Tombol Ekspor Excel
    document.querySelectorAll('.btn-export-excel').forEach(btn => {
      btn.addEventListener('click', () => {
        exportMonthlyToExcel();
      });
    });

    // 9. Tombol Modal
    const btnOpenAddTx = document.getElementById('btnOpenAddTx');
    if (btnOpenAddTx) btnOpenAddTx.addEventListener('click', () => openAddTransactionModal());

    const btnOpenEditBudget = document.getElementById('btnOpenEditBudget');
    if (btnOpenEditBudget) btnOpenEditBudget.addEventListener('click', () => openEditBudgetModal());

    const btnQuickEditBudgetBar = document.getElementById('btnQuickEditBudgetBar');
    if (btnQuickEditBudgetBar) btnQuickEditBudgetBar.addEventListener('click', () => openEditBudgetModal());

    // 10. Tutup Modal
    document.querySelectorAll('.modal-close-btn, .modal-backdrop-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) modal.classList.remove('active');
        document.body.classList.remove('modal-open');
      });
    });
  }

  async function init() {
    loadData();
    initTheme();
    initEventListeners();
    renderAll();

    // Inisialisasi Sinkronisasi Supabase Cloud
    const client = window.SupabaseClient || (typeof SupabaseClient !== 'undefined' ? SupabaseClient : null);
    if (client) {
      client.onStatusChange((connected, msg) => {
        const badge = document.getElementById('cloudSyncBadge');
        const text = document.getElementById('cloudSyncText');
        if (badge && text) {
          if (connected) {
            badge.style.background = 'rgba(16, 185, 129, 0.15)';
            badge.style.color = '#10b981';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            text.innerHTML = '<span class="desktop-text">Supabase Cloud</span><span class="mobile-text">Cloud</span>';
          } else {
            badge.style.background = 'rgba(245, 158, 11, 0.15)';
            badge.style.color = '#f59e0b';
            badge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
            text.innerHTML = '<span class="desktop-text">Mode Offline (Lokal)</span><span class="mobile-text">Offline</span>';
          }
        }
      });

      await client.testConnection();
      const cloudTxs = await client.fetchTransactions();
      if (cloudTxs && cloudTxs.length > 0) {
        state.transactions = cloudTxs;
      }
      const cloudBudgets = await client.fetchBudgets();
      if (cloudBudgets && Object.keys(cloudBudgets).length > 0) {
        state.monthlyBudgets = { ...state.monthlyBudgets, ...cloudBudgets };
      }
      saveData();
      renderAll();
    }
  }

  return {
    init,
    renderAll,
    saveTransaction,
    deleteTransaction,
    updateMonthBudget,
    exportMonthlyToExcel
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  RABApp.init();
});
