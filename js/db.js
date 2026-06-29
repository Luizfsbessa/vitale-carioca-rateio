/* ============================================
   db.js — camada de persistência (IndexedDB)
   Substitui o localStorage para suportar fotos
   (localStorage tem limite de ~5-10MB; IndexedDB
   suporta centenas de MB, necessário para fotos
   do hidrômetro vinculadas a cada leitura)
   ============================================ */

const DB_NAME = 'vitale_carioca_rateio';
const DB_VERSION = 3;
const STORE_COMPETENCIAS = 'competencias';
const STORE_PHOTOS = 'photos';
const STORE_INVOICES = 'invoices';
const STORE_RESIDENTS = 'residents';

let _db = null;

/**
 * Abre (ou cria) o banco IndexedDB com as object stores necessárias.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_COMPETENCIAS)) {
        db.createObjectStore(STORE_COMPETENCIAS, { keyPath: 'cp' });
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        // key = `${cp}_${unidade}` ex: "2026-06_1004"
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_INVOICES)) {
        // key = cp (uma fatura por competência) ex: "2026-06"
        db.createObjectStore(STORE_INVOICES, { keyPath: 'cp' });
      }
      if (!db.objectStoreNames.contains(STORE_RESIDENTS)) {
        db.createObjectStore(STORE_RESIDENTS, { keyPath: 'unidade' });
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

/* ── Competências (leituras, valores, rateio) ── */

async function saveCompetencia(reg) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COMPETENCIAS, 'readwrite');
    tx.objectStore(STORE_COMPETENCIAS).put(reg);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getCompetencia(cp) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COMPETENCIAS, 'readonly');
    const req = tx.objectStore(STORE_COMPETENCIAS).get(cp);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getAllCompetencias() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COMPETENCIAS, 'readonly');
    const req = tx.objectStore(STORE_COMPETENCIAS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function deleteCompetencia(cp) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COMPETENCIAS, 'readwrite');
    tx.objectStore(STORE_COMPETENCIAS).delete(cp);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/* ── Fotos do hidrômetro (auditoria) ── */

/**
 * Salva uma foto vinculada a uma unidade + competência.
 * @param {string} cp - competência (ex: "2026-06")
 * @param {string} unidade - número da unidade (ex: "1004")
 * @param {string} dataUrl - imagem já comprimida em base64 (data URL)
 */
async function savePhoto(cp, unidade, dataUrl) {
  const db = await openDB();
  const record = {
    id: `${cp}_${unidade}`,
    cp,
    unidade,
    dataUrl,
    timestamp: new Date().toISOString()
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    tx.objectStore(STORE_PHOTOS).put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getPhoto(cp, unidade) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readonly');
    const req = tx.objectStore(STORE_PHOTOS).get(`${cp}_${unidade}`);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function deletePhoto(cp, unidade) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    tx.objectStore(STORE_PHOTOS).delete(`${cp}_${unidade}`);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getAllPhotos() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readonly');
    const req = tx.objectStore(STORE_PHOTOS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

/* ── Fatura/boleto da Águas do Rio (uma por competência) ── */

/**
 * Salva o arquivo da fatura (PDF ou imagem) vinculado a uma competência.
 * @param {string} cp - competência (ex: "2026-06")
 * @param {string} dataUrl - arquivo em base64 (data URL)
 * @param {string} fileName - nome original do arquivo
 * @param {string} mimeType - tipo do arquivo (application/pdf, image/jpeg, etc.)
 */
async function saveInvoice(cp, dataUrl, fileName, mimeType) {
  const db = await openDB();
  const record = {
    cp,
    dataUrl,
    fileName,
    mimeType,
    timestamp: new Date().toISOString()
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INVOICES, 'readwrite');
    tx.objectStore(STORE_INVOICES).put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getInvoice(cp) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INVOICES, 'readonly');
    const req = tx.objectStore(STORE_INVOICES).get(cp);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function deleteInvoice(cp) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INVOICES, 'readwrite');
    tx.objectStore(STORE_INVOICES).delete(cp);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getAllInvoices() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INVOICES, 'readonly');
    const req = tx.objectStore(STORE_INVOICES).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}


/* ── Condôminos (nome, WhatsApp, e-mail por unidade) ── */

async function saveResident(resident) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RESIDENTS, 'readwrite');
    tx.objectStore(STORE_RESIDENTS).put(resident);
    tx.oncomplete = () => resolve(resident);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getResident(unidade) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RESIDENTS, 'readonly');
    const req = tx.objectStore(STORE_RESIDENTS).get(unidade);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getAllResidents() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RESIDENTS, 'readonly');
    const req = tx.objectStore(STORE_RESIDENTS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function deleteResident(unidade) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RESIDENTS, 'readwrite');
    tx.objectStore(STORE_RESIDENTS).delete(unidade);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/* ── Backup completo (export/import) ── */

async function exportFullBackup() {
  const competencias = await getAllCompetencias();
  const photos = await getAllPhotos();
  const invoices = await getAllInvoices();
  const residents = await getAllResidents();
  return { version: DB_VERSION, exportedAt: new Date().toISOString(), competencias, photos, invoices, residents };
}

async function importFullBackup(backup) {
  if (!backup || !Array.isArray(backup.competencias)) {
    throw new Error('Formato de backup inválido');
  }
  const db = await openDB();
  const tx = db.transaction([STORE_COMPETENCIAS, STORE_PHOTOS, STORE_INVOICES, STORE_RESIDENTS], 'readwrite');
  const compStore = tx.objectStore(STORE_COMPETENCIAS);
  const photoStore = tx.objectStore(STORE_PHOTOS);
  const invoiceStore = tx.objectStore(STORE_INVOICES);

  // limpa dados existentes antes de importar
  compStore.clear();
  photoStore.clear();
  invoiceStore.clear();

  backup.competencias.forEach(c => compStore.put(c));
  (backup.photos || []).forEach(p => photoStore.put(p));
  (backup.invoices || []).forEach(inv => invoiceStore.put(inv));

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/* migração automática do formato antigo (localStorage) */
async function migrateLegacyLocalStorage() {
  const legacyKeys = ['vc_rateio2', 'vc_rateio'];
  for (const key of legacyKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const old = JSON.parse(raw);
      if (old && old.c && Object.keys(old.c).length) {
        const existentes = await getAllCompetencias();
        if (existentes.length === 0) {
          for (const cp of Object.keys(old.c)) {
            await saveCompetencia(old.c[cp]);
          }
          console.info(`[migração] ${Object.keys(old.c).length} competência(s) migradas de localStorage para IndexedDB.`);
        }
      }
    } catch (e) { /* ignora dados corrompidos */ }
  }
}

window.RateioDB = {
  saveCompetencia, getCompetencia, getAllCompetencias, deleteCompetencia,
  savePhoto, getPhoto, deletePhoto, getAllPhotos,
  saveInvoice, getInvoice, deleteInvoice, getAllInvoices,
  saveResident, getResident, getAllResidents, deleteResident,
  exportFullBackup, importFullBackup, migrateLegacyLocalStorage
};
