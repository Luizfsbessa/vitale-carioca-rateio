/* ============================================
   app.js — orquestrador principal
   Mantém o estado em memória (cache do IndexedDB)
   e coordena as abas. Cada aba só conhece sua
   própria renderização; este arquivo é quem
   decide QUANDO chamar cada uma.
   ============================================ */

// cache em memória de todas as competências (sincronizado com IndexedDB)
let MAPA_COMPETENCIAS = {};

async function carregarMapaCompetencias() {
  const lista = await RateioDB.getAllCompetencias();
  MAPA_COMPETENCIAS = {};
  lista.forEach(reg => { MAPA_COMPETENCIAS[reg.cp] = reg; });
}

/* ── Lançamento ── */

async function onCompChange() {
  const cp = TabLancamento.getCompetenciaSelecionada();
  const cpAnt = RateioLogic.competenciaAnterior(MAPA_COMPETENCIAS, cp);
  const info = document.getElementById('comp-ant-info');
  if (info) info.textContent = cpAnt ? `↳ ref. ${Fmt.formatarCompetencia(cpAnt)}` : '↳ primeira competência';

  const jaExiste = cp && MAPA_COMPETENCIAS[cp];
  await TabLancamento.buildGrid(MAPA_COMPETENCIAS, cp, jaExiste ? cp : null);

  if (jaExiste) {
    document.getElementById('tc').value = MAPA_COMPETENCIAS[cp].t || '';
    document.getElementById('tv').value = MAPA_COMPETENCIAS[cp].v || '';
  } else {
    document.getElementById('tc').value = '';
    document.getElementById('tv').value = '';
  }

  const invoiceWidget = document.getElementById('invoice-widget');
  if (invoiceWidget) invoiceWidget.innerHTML = await InvoiceUI.renderInvoiceWidget(cp);

  onLancamentoChanged();
}

/** Callback chamado pelo módulo de fatura quando um anexo é salvo/removido. */
async function onInvoiceSaved(cp) {
  const invoiceWidget = document.getElementById('invoice-widget');
  if (invoiceWidget) invoiceWidget.innerHTML = await InvoiceUI.renderInvoiceWidget(cp);
}

function onLancamentoChanged() {
  const cp = TabLancamento.getCompetenciaSelecionada();
  TabLancamento.atualizarMetricas(MAPA_COMPETENCIAS, cp);
}

/** Callback chamado pelo módulo de fotos quando uma foto é salva/removida.
 *  IMPORTANTE: não reconstrói o grid inteiro (perderia leituras já digitadas
 *  pelo usuário em outras unidades) — atualiza somente o botão da unidade afetada. */
async function onPhotoSaved(unidade) {
  const cp = TabLancamento.getCompetenciaSelecionada();
  const novoHtml = await PhotosUI.renderPhotoButton(cp, unidade);
  const botaoAntigo = document.querySelector(`#a${unidade}`)?.nextElementSibling;
  if (botaoAntigo && botaoAntigo.classList.contains('photo-btn')) {
    const temp = document.createElement('div');
    temp.innerHTML = novoHtml;
    botaoAntigo.replaceWith(temp.firstElementChild);
  }
}

async function fecharCompetencia() {
  const cp = TabLancamento.getCompetenciaSelecionada();
  if (!cp) return alert('Selecione a competência.');

  const consumoTotal = TabLancamento.getConsumoTotal();
  const valorFatura = TabLancamento.getValorFatura();
  if (!consumoTotal || !valorFatura) return alert('Preencha consumo e valor da fatura.');

  const leiturasAtuais = TabLancamento.lerLeiturasAtuais();

  const invalidas = RateioLogic.validarLeiturasMenoresQueAnterior(MAPA_COMPETENCIAS, cp, leiturasAtuais);
  if (invalidas.length) {
    alert('⚠️ As seguintes unidades têm leitura inferior à leitura anterior:\n' + invalidas.join(', ') + '\n\nCorrija antes de fechar a competência.');
    return;
  }

  const reg = RateioLogic.montarRegistroCompetencia(
    { cp, consumoTotal, valorFatura, leiturasAtuais },
    MAPA_COMPETENCIAS
  );

  await RateioDB.saveCompetencia(reg);
  MAPA_COMPETENCIAS[cp] = reg;

  alert(`✅ Competência ${Fmt.formatarCompetencia(cp)} fechada!\nReferência anterior: ${reg.compAnterior ? Fmt.formatarCompetencia(reg.compAnterior) : 'nenhuma (primeira competência)'}`);

  document.getElementById('comp').value = Fmt.proximaCompetencia(cp);
  await onCompChange();
}

/* ── Conferência ── */

async function abrirConferencia() {
  TabConferencia.populateSelect(MAPA_COMPETENCIAS);
  // seleciona automaticamente a competência atualmente escolhida no topo, se existir
  const cpAtual = TabLancamento.getCompetenciaSelecionada();
  const sel = document.getElementById('conf-comp');
  if (cpAtual && MAPA_COMPETENCIAS[cpAtual]) sel.value = cpAtual;
  await TabConferencia.render(MAPA_COMPETENCIAS);
}

async function onConferenciaFiltroChange() {
  await TabConferencia.render(MAPA_COMPETENCIAS);
}

/* ── Dashboard ── */

function onDashTipoChange() {
  TabDashboard.onTipoChange(MAPA_COMPETENCIAS);
}

function abrirDashboard() {
  TabDashboard.onTipoChange(MAPA_COMPETENCIAS);
  TabDashboard.render(MAPA_COMPETENCIAS);
}

function onDashboardChange() {
  TabDashboard.render(MAPA_COMPETENCIAS);
}

/* ── Histórico ── */

async function abrirHistorico() {
  await TabHistorico.render(MAPA_COMPETENCIAS, editarCompetencia, excluirCompetencia, exportarCSVHistorico);
}

async function onHistoricoBuscaChange() {
  await TabHistorico.render(MAPA_COMPETENCIAS, editarCompetencia, excluirCompetencia, exportarCSVHistorico);
}

async function editarCompetencia(cp) {
  document.getElementById('comp').value = cp;
  await onCompChange();
  ativarTab('tl', document.querySelectorAll('.tab')[0]);
}

async function excluirCompetencia(cp) {
  if (!confirm(`Excluir competência ${Fmt.formatarCompetencia(cp)}?\nOutros meses que usam esta como referência serão afetados.\n\nObs: a fatura anexada (se houver) não será excluída automaticamente — remova-a manualmente se desejar.`)) return;
  await RateioDB.deleteCompetencia(cp);
  delete MAPA_COMPETENCIAS[cp];
  await TabHistorico.render(MAPA_COMPETENCIAS, editarCompetencia, excluirCompetencia, exportarCSVHistorico);
}

function exportarCSVHistorico(cp) {
  ExportUtils.exportarCSVCompetencia(cp, MAPA_COMPETENCIAS[cp]);
}

function exportarCSVAtual() {
  const cp = TabLancamento.getCompetenciaSelecionada();
  if (MAPA_COMPETENCIAS[cp]) {
    ExportUtils.exportarCSVCompetencia(cp, MAPA_COMPETENCIAS[cp]);
  } else {
    alert('Salve a competência antes de exportar, ou exporte pelo Histórico.');
  }
}

/* ── Backup ── */

async function exportarBackup() {
  await ExportUtils.exportarBackupCompleto();
  setStatusBackup('✅ Backup exportado com sucesso.', true);
}

async function importarBackup(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    const backup = await ExportUtils.importarBackupCompleto(file);
    await carregarMapaCompetencias();
    await onCompChange();
    setStatusBackup(`✅ ${backup.competencias.length} competência(s) e ${(backup.photos || []).length} foto(s) importadas.`, true);
  } catch (err) {
    setStatusBackup('❌ Erro ao importar: arquivo inválido ou corrompido.', false);
  }
}

function setStatusBackup(msg, ok) {
  const el = document.getElementById('ssSt');
  el.className = ok ? 'ssok' : 'sserr';
  el.textContent = msg;
}

/* ── Navegação entre abas ── */

const TAB_IDS = ['tl', 'tc2', 'td', 'th', 'ts', 'ti'];

function ativarTab(id, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  TAB_IDS.forEach(t => { document.getElementById(t).style.display = (t === id) ? '' : 'none'; });

  if (id === 'tc2') abrirConferencia();
  if (id === 'td') abrirDashboard();
  if (id === 'th') abrirHistorico();
}

/* ── Inicialização ── */

async function initApp() {
  await RateioDB.migrateLegacyLocalStorage();
  await carregarMapaCompetencias();

  const hoje = new Date();
  document.getElementById('comp').value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('comp').addEventListener('change', onCompChange);

  await onCompChange();
}

document.addEventListener('DOMContentLoaded', initApp);
