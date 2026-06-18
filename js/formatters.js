/* ============================================
   formatters.js — funções de formatação reutilizadas
   em várias telas (datas, moeda, etc.)
   ============================================ */

const NOMES_MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/**
 * "2026-06" → "Jun/2026"
 */
function formatarCompetencia(ym) {
  if (!ym) return '';
  const [ano, mes] = ym.split('-');
  return `${NOMES_MESES[parseInt(mes, 10) - 1]}/${ano}`;
}

/**
 * Formata número como moeda brasileira sem o "R$" (para compor strings).
 */
function formatarBRL(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Retorna a competência seguinte (para auto-avançar após fechar um mês).
 * "2026-06" → "2026-07" | "2026-12" → "2027-01"
 */
function proximaCompetencia(cp) {
  const [ano, mes] = cp.split('-').map(Number);
  return mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, '0')}`;
}

/**
 * Dispara o download de um conteúdo de texto/JSON como arquivo.
 */
function downloadFile(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

window.Fmt = { formatarCompetencia, formatarBRL, proximaCompetencia, downloadFile, NOMES_MESES };
