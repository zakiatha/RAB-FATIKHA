/**
 * security.js - Keamanan, Validasi, Sanitasi XSS, dan Manajemen Hak Akses (Role-Based Access Control)
 * Sistem RAB (Rencana Anggaran Biaya)
 */

const Security = (function() {
  'use strict';

  const STORAGE_KEY_ROLE = 'rab_current_role';
  const STORAGE_KEY_PIN_HASH = 'rab_admin_pin_hash';
  const DEFAULT_PIN = '1234';

  /**
   * Simple secure hash helper (SHA-256 via Web Crypto API or fallback)
   */
  async function hashPIN(pin) {
    if (window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(pin + '_rab_salt_2026');
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback simple hash for older environments
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      hash = ((hash << 5) - hash) + pin.charCodeAt(i);
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }

  // Initialize stored PIN hash if not exists
  async function initSecurity() {
    if (!localStorage.getItem(STORAGE_KEY_PIN_HASH)) {
      const defaultHash = await hashPIN(DEFAULT_PIN);
      localStorage.setItem(STORAGE_KEY_PIN_HASH, defaultHash);
    }
    // Default role is 'user' (read-only) for safety
    if (!sessionStorage.getItem(STORAGE_KEY_ROLE)) {
      sessionStorage.setItem(STORAGE_KEY_ROLE, 'user');
    }
  }

  /**
   * Sanitasi String untuk mencegah serangan Cross-Site Scripting (XSS)
   * Mengubah karakter berbahaya menjadi entitas HTML aman
   */
  function sanitize(str) {
    if (typeof str !== 'string') {
      if (str === null || str === undefined) return '';
      return String(str);
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Cek apakah role saat ini adalah admin
   */
  function isAdmin() {
    return sessionStorage.getItem(STORAGE_KEY_ROLE) === 'admin';
  }

  /**
   * Dapatkan role saat ini ('admin' atau 'user')
   */
  function getCurrentRole() {
    return sessionStorage.getItem(STORAGE_KEY_ROLE) || 'user';
  }

  const STORAGE_KEY_ATTEMPTS = 'rab_pin_failed_attempts';
  const STORAGE_KEY_LOCKOUT = 'rab_pin_lockout_until';
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 60 * 1000; // 60 detik lockout

  /**
   * Cek status lockout brute force
   */
  function getLockoutStatus() {
    const lockoutUntil = parseInt(localStorage.getItem(STORAGE_KEY_LOCKOUT) || '0', 10);
    const now = Date.now();
    if (lockoutUntil > now) {
      const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return { isLocked: true, remainingSeconds };
    }
    return { isLocked: false, remainingSeconds: 0 };
  }

  /**
   * Verifikasi PIN untuk login Admin (Dengan Proteksi Anti Brute-Force)
   */
  async function verifyAdminPIN(inputPin) {
    const lockStatus = getLockoutStatus();
    if (lockStatus.isLocked) {
      return {
        success: false,
        locked: true,
        message: `Terlalu banyak percobaan salah! Akun terkunci sementara demi keamanan. Coba lagi dalam ${lockStatus.remainingSeconds} detik.`
      };
    }

    if (!inputPin || typeof inputPin !== 'string') {
      return { success: false, locked: false, message: 'PIN tidak boleh kosong' };
    }

    const inputHash = await hashPIN(inputPin.trim());
    const storedHash = localStorage.getItem(STORAGE_KEY_PIN_HASH);

    if (inputHash === storedHash) {
      // Reset counter saat berhasil
      localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
      localStorage.removeItem(STORAGE_KEY_LOCKOUT);
      sessionStorage.setItem(STORAGE_KEY_ROLE, 'admin');
      return { success: true, locked: false };
    }

    // Gagal: hitung percobaan
    let attempts = parseInt(localStorage.getItem(STORAGE_KEY_ATTEMPTS) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEY_ATTEMPTS, attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(STORAGE_KEY_LOCKOUT, lockUntil.toString());
      localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
      return {
        success: false,
        locked: true,
        message: `Terdeteksi 5 kali percobaan salah! Sistem terkunci selama 60 detik untuk mencegah serangan tebakan PIN (Brute-Force).`
      };
    }

    return {
      success: false,
      locked: false,
      message: `PIN salah! Sisa percobaan: ${MAX_ATTEMPTS - attempts} kali sebelum terkunci.`
    };
  }

  /**
   * Ubah PIN Admin (Hanya bisa dilakukan jika saat ini adalah Admin)
   */
  async function changeAdminPIN(oldPin, newPin) {
    if (!isAdmin()) throw new Error('Akses ditolak: Hanya admin yang dapat mengubah PIN');
    if (!newPin || newPin.length < 4) throw new Error('PIN baru minimal harus 4 digit angka');
    
    const verified = await verifyAdminPIN(oldPin);
    if (!verified) throw new Error('PIN lama tidak sesuai');

    const newHash = await hashPIN(newPin.trim());
    localStorage.setItem(STORAGE_KEY_PIN_HASH, newHash);
    return true;
  }

  /**
   * Logout Admin kembali ke mode User (Read-Only)
   */
  function logoutAdmin() {
    sessionStorage.setItem(STORAGE_KEY_ROLE, 'user');
  }

  /**
   * Memastikan aksi tertentu hanya bisa dieksekusi jika berstatus Admin
   */
  function assertAdmin(actionName = 'Aksi ini') {
    if (!isAdmin()) {
      const msg = `Akses ditolak: ${actionName} hanya dapat dilakukan oleh Admin. Mode Pengguna hanya memiliki akses baca (Read-Only).`;
      alert(msg);
      throw new Error(msg);
    }
  }

  /**
   * Format angka menjadi mata uang Rupiah yang aman
   */
  function formatRupiah(amount) {
    const num = Number(amount);
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  }

  /**
   * Parse input angka dari string yang mungkin mengandung format Rp / titik / koma
   */
  function parseAmount(val) {
    if (typeof val === 'number') return Math.max(0, val);
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9]/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Format angka menjadi singkatan ribuan 'k' (contoh: 12500 -> 12,5k, 287500 -> 287,5k)
   */
  function formatK(amount) {
    const num = Number(amount);
    if (isNaN(num)) return '0k';
    if (num === 0) return '0k';

    const kVal = num / 1000;
    // Format dengan koma jika ada desimal (misal 12.5 -> "12,5k", 16 -> "16k")
    let formatted = kVal.toLocaleString('id-ID', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    });
    return formatted + 'k';
  }

  // Self init
  initSecurity();

  return {
    sanitize,
    isAdmin,
    getCurrentRole,
    verifyAdminPIN,
    getLockoutStatus,
    changeAdminPIN,
    logoutAdmin,
    assertAdmin,
    formatRupiah,
    formatK,
    parseAmount
  };
})();
