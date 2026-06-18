/* ============================================
   photo-utils.js — captura e compressão de imagens
   Reduz fotos de câmera (3-5MB) para ~50-100KB,
   mantendo legibilidade do hidrômetro para auditoria.
   ============================================ */

const PHOTO_MAX_DIMENSION = 1000;  // px — lado maior da imagem
const PHOTO_QUALITY = 0.7;         // 0-1 — qualidade JPEG

/**
 * Lê um arquivo de imagem (input file ou captura de câmera),
 * redimensiona e comprime, retornando um data URL JPEG.
 * @param {File} file
 * @returns {Promise<string>} data URL comprimido
 */
function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const dataUrl = resizeAndCompress(img);
          resolve(dataUrl);
        } catch (err) { reject(err); }
      };
      img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function resizeAndCompress(img) {
  let { width, height } = img;
  const maxDim = Math.max(width, height);

  if (maxDim > PHOTO_MAX_DIMENSION) {
    const scale = PHOTO_MAX_DIMENSION / maxDim;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
}

/**
 * Estima o tamanho em KB de um data URL.
 */
function estimateDataUrlSizeKB(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  const bytes = base64.length * 0.75;
  return Math.round(bytes / 1024);
}

/**
 * Formata a data/hora de registro da foto para exibição.
 */
function formatPhotoTimestamp(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Lê um arquivo genérico (PDF ou imagem) como data URL, SEM compressão.
 * Usado para anexar a fatura/boleto — diferente da foto do hidrômetro,
 * aqui queremos preservar o documento original (PDF não se beneficia
 * de redimensionamento, e comprimir demais pode tornar valores ilegíveis).
 * @param {File} file
 * @returns {Promise<string>} data URL original
 */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

/** Limite de tamanho para anexos de fatura (10MB — PDFs de boleto raramente passam disso). */
const INVOICE_MAX_SIZE_MB = 10;

function validarTamanhoArquivo(file, maxMB = INVOICE_MAX_SIZE_MB) {
  const sizeMB = file.size / (1024 * 1024);
  return sizeMB <= maxMB;
}

window.PhotoUtils = {
  compressImageFile, estimateDataUrlSizeKB, formatPhotoTimestamp,
  readFileAsDataUrl, validarTamanhoArquivo, INVOICE_MAX_SIZE_MB
};
