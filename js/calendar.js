/**
 * calendar.js - Visualisasi Kalender Interaktif & Heatmap Pengeluaran Harian
 * Memetakan pengeluaran besar dan kecil harian beserta rincian transaksi
 */

const RABCalendar = (function() {
  'use strict';

  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth(); // 0-11
  let onDayClickCallback = null;

  const monthNamesID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayNamesID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  function setMonth(year, month) {
    currentYear = year;
    currentMonth = month;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    } else if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
  }

  function nextMonth() {
    setMonth(currentYear, currentMonth + 1);
  }

  function prevMonth() {
    setMonth(currentYear, currentMonth - 1);
  }

  function goToToday() {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
  }

  /**
   * Mengumpulkan total pengeluaran per tanggal untuk bulan aktif
   */
  function aggregateExpensesByDate(transactions) {
    const dailyMap = {}; // format key: 'YYYY-MM-DD' => { total: number, count: number, items: [] }

    transactions.forEach(tx => {
      if (!tx.date) return;
      const dateKey = tx.date; // ISO format 'YYYY-MM-DD'
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          total: 0,
          count: 0,
          items: []
        };
      }
      dailyMap[dateKey].total += Number(tx.amount || 0);
      dailyMap[dateKey].count += 1;
      dailyMap[dateKey].items.push(tx);
    });

    return dailyMap;
  }

  /**
   * Tentukan level intensitas pengeluaran (None, Low, Medium, High)
   */
  function getExpenseLevel(amount, maxInMonth) {
    if (!amount || amount <= 0) return 'none';
    if (amount <= 50000) return 'low';
    if (amount <= 200000) return 'medium';
    return 'high';
  }

  /**
   * Render grid kalender ke dalam container DOM
   */
  function render(containerEl, transactions, onDayClick) {
    if (!containerEl) return;
    onDayClickCallback = onDayClick;

    const dailyMap = aggregateExpensesByDate(transactions);

    // Hitung statistik bulan ini
    let monthTotal = 0;
    let maxExpenseDay = { date: '', amount: 0 };
    let minExpenseDay = { date: '', amount: Infinity };
    let activeDaysCount = 0;

    // Filter tanggal di bulan saat ini untuk statistik
    Object.keys(dailyMap).forEach(dateStr => {
      const [y, m] = dateStr.split('-').map(Number);
      if (y === currentYear && m === (currentMonth + 1)) {
        const total = dailyMap[dateStr].total;
        monthTotal += total;
        activeDaysCount++;
        if (total > maxExpenseDay.amount) {
          maxExpenseDay = { date: dateStr, amount: total };
        }
        if (total > 0 && total < minExpenseDay.amount) {
          minExpenseDay = { date: dateStr, amount: total };
        }
      }
    });

    if (minExpenseDay.amount === Infinity) minExpenseDay.amount = 0;

    // Persiapan grid hari
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();

    // Hari pertama dalam seminggu (0 = Minggu, 1 = Senin, dst). Ubah agar Senin = 0, Minggu = 6
    let startingDay = firstDay.getDay() - 1;
    if (startingDay < 0) startingDay = 6;

    // Tanggal hari ini
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Bangun HTML kalender
    let html = `
      <div class="calendar-header">
        <div class="calendar-title-group">
          <h3 class="calendar-month-title">${monthNamesID[currentMonth]} ${currentYear}</h3>
          <span class="calendar-subtitle">Total Bulan Ini: <strong>${Security.formatRupiah(monthTotal)}</strong></span>
        </div>
        <div class="calendar-nav-controls">
          <button type="button" class="btn btn-outline btn-sm" id="calPrevBtn" title="Bulan Sebelumnya">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button type="button" class="btn btn-outline btn-sm" id="calTodayBtn">Hari Ini</button>
          <button type="button" class="btn btn-outline btn-sm" id="calNextBtn" title="Bulan Berikutnya">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      <!-- Indikator Legend -->
      <div class="calendar-legend">
        <span class="legend-item"><span class="legend-badge badge-low"></span> &le; 50rb (Kecil/Hemat)</span>
        <span class="legend-item"><span class="legend-badge badge-medium"></span> 50rb - 200rb (Sedang)</span>
        <span class="legend-item"><span class="legend-badge badge-high"></span> &gt; 200rb (Besar)</span>
      </div>

      <!-- Grid Hari -->
      <div class="calendar-grid">
        <div class="calendar-weekdays">
          ${dayNamesID.map(d => `<div class="weekday-name">${d}</div>`).join('')}
        </div>
        <div class="calendar-days">
    `;

    // Hari kosong sebelum tanggal 1
    for (let i = 0; i < startingDay; i++) {
      html += `<div class="calendar-cell empty"></div>`;
    }

    // Tanggal-tanggal dalam bulan
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = dailyMap[dateStr];
      const hasData = !!(dayData && dayData.total > 0);
      const amount = hasData ? dayData.total : 0;
      const count = hasData ? dayData.count : 0;
      const level = getExpenseLevel(amount);
      const isToday = (dateStr === todayStr);

      html += `
        <div class="calendar-cell day-cell ${level ? 'level-' + level : ''} ${isToday ? 'is-today' : ''} ${hasData ? 'has-expense' : ''}" 
             data-date="${dateStr}">
          <div class="cell-top">
            <span class="day-number">${day}</span>
            ${count > 0 ? `<span class="tx-badge">${count} item</span>` : ''}
          </div>
          ${hasData 
            ? `<div class="cell-amount amount-${level}"><span class="desktop-text">${Security.formatRupiah(amount)}</span><span class="mobile-text">${Security.formatK(amount)}</span></div>`
            : `<div class="cell-amount-empty">-</div>`
          }
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    containerEl.innerHTML = html;

    // Pasang Event Listeners Navigasi
    const prevBtn = containerEl.querySelector('#calPrevBtn');
    const nextBtn = containerEl.querySelector('#calNextBtn');
    const todayBtn = containerEl.querySelector('#calTodayBtn');

    function emitMonthChange() {
      window.dispatchEvent(new CustomEvent('rab:monthchange', {
        detail: { year: currentYear, month: currentMonth }
      }));
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevMonth();
        emitMonthChange();
        render(containerEl, transactions, onDayClickCallback);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextMonth();
        emitMonthChange();
        render(containerEl, transactions, onDayClickCallback);
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        goToToday();
        emitMonthChange();
        render(containerEl, transactions, onDayClickCallback);
      });
    }

    // Pasang Event Listener Klik Tanggal
    const cells = containerEl.querySelectorAll('.day-cell');
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        const dayData = dailyMap[dateStr] || { total: 0, count: 0, items: [] };
        if (typeof onDayClickCallback === 'function') {
          onDayClickCallback(dateStr, dayData);
        }
      });
    });
  }

  return {
    render,
    setMonth,
    nextMonth,
    prevMonth,
    goToToday,
    getMonthName: (m) => monthNamesID[m],
    getCurrentMonth: () => currentMonth,
    getCurrentYear: () => currentYear
  };
})();
