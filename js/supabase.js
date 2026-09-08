/**
 * supabase.js - Integrasi Cloud Database Supabase untuk Sistem RAB
 * Mendukung sinkronisasi real-time transaksi & anggaran dengan fallback offline aman
 */

const SupabaseClient = (function() {
  'use strict';

  const SUPABASE_URL = 'https://xisddretdjwbrmwstgsk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpc2RkcmV0ZGp3YnJtd3N0Z3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NTAyNTcsImV4cCI6MjEwNDQyNjI1N30.gMDkHVlBSvdOFRs5bNA6-14Yu1QCc171gW3aeuxCZqM';

  let isConnected = false;
  let onStatusChangeCallback = null;

  function getHeaders() {
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  function setStatus(connected, message = '') {
    isConnected = connected;
    if (typeof onStatusChangeCallback === 'function') {
      onStatusChangeCallback(connected, message);
    }
  }

  /**
   * Menguji konektivitas ke Supabase REST Endpoint
   */
  async function testConnection() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rab_budgets?select=month_key&limit=1`, {
        method: 'GET',
        headers: getHeaders()
      });
      if (res.ok || res.status === 200) {
        setStatus(true, 'Terhubung ke Supabase Cloud');
        return true;
      }
      setStatus(false, 'Gagal terhubung ke endpoint');
      return false;
    } catch (e) {
      console.warn('Gagal koneksi ke Supabase Cloud:', e);
      setStatus(false, 'Offline / Mode Lokal');
      return false;
    }
  }

  /**
   * Mengambil semua transaksi dari Supabase (rab_transactions)
   */
  async function fetchTransactions() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rab_transactions?select=*&order=date.asc`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!res.ok) {
        // Table may not be created yet in user's Supabase
        console.warn('Tabel rab_transactions belum ada atau belum diizinkan RLS. Menggunakan data lokal.');
        return null;
      }

      const rows = await res.json();
      setStatus(true, 'Data tersinkronisasi dari Cloud');
      return rows.map(r => ({
        id: r.id,
        date: r.date,
        categoryId: r.category_id,
        itemName: r.item_name,
        qty: r.qty,
        unit: r.unit,
        amount: Number(r.amount),
        note: r.note,
        createdAt: r.created_at
      }));
    } catch (e) {
      console.warn('Koneksi Supabase offline saat mengambil transaksi:', e.message);
      setStatus(false, 'Mode Lokal (Offline)');
      return null;
    }
  }

  /**
   * Mengambil semua anggaran bulanan dari Supabase (rab_budgets)
   */
  async function fetchBudgets() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rab_budgets?select=*`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!res.ok) {
        console.warn('Tabel rab_budgets belum ada atau belum diizinkan RLS. Menggunakan data lokal.');
        return null;
      }

      const rows = await res.json();
      const budgetMap = {};
      rows.forEach(r => {
        budgetMap[r.month_key] = {
          initialAmount: Number(r.initial_amount),
          periodName: r.period_name,
          notes: r.notes || ''
        };
      });
      return budgetMap;
    } catch (e) {
      console.warn('Koneksi Supabase offline saat mengambil anggaran:', e.message);
      return null;
    }
  }

  /**
   * Menyimpan / Upsert transaksi ke Supabase
   */
  async function syncTransaction(tx) {
    try {
      const payload = {
        id: tx.id,
        date: tx.date,
        category_id: tx.categoryId,
        item_name: tx.itemName,
        qty: tx.qty || null,
        unit: tx.unit || null,
        amount: Number(tx.amount),
        note: tx.note || null,
        created_at: tx.createdAt || new Date().toISOString()
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/rab_transactions`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatus(true, 'Data berhasil disimpan ke Cloud');
        return true;
      } else {
        const errText = await res.text();
        console.error('Supabase REST error saat simpan transaksi:', res.status, errText);
        return false;
      }
    } catch (e) {
      console.warn('Gagal sinkron transaksi ke Supabase (tersimpan di lokal):', e.message);
      return false;
    }
  }

  /**
   * Menghapus transaksi dari Supabase
   */
  async function deleteTransaction(id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rab_transactions?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return res.ok;
    } catch (e) {
      console.warn('Gagal menghapus transaksi di Supabase:', e.message);
      return false;
    }
  }

  /**
   * Menyimpan / Upsert anggaran bulanan ke Supabase
   */
  async function syncBudget(monthKey, budget) {
    try {
      const payload = {
        month_key: monthKey,
        initial_amount: Number(budget.initialAmount),
        period_name: budget.periodName,
        notes: budget.notes || '',
        updated_at: new Date().toISOString()
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/rab_budgets`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatus(true, 'Anggaran berhasil disimpan ke Cloud');
        return true;
      } else {
        const errText = await res.text();
        console.error('Supabase REST error saat simpan anggaran:', res.status, errText);
        return false;
      }
    } catch (e) {
      console.warn('Gagal sinkron anggaran ke Supabase:', e.message);
      return false;
    }
  }

  const api = {
    testConnection,
    fetchTransactions,
    fetchBudgets,
    syncTransaction,
    deleteTransaction,
    syncBudget,
    onStatusChange: (cb) => { onStatusChangeCallback = cb; },
    isConnected: () => isConnected,
    getUrl: () => SUPABASE_URL
  };

  if (typeof window !== 'undefined') {
    window.SupabaseClient = api;
  }

  return api;
})();

