/* ============================================
   invoice-ui.js — anexo do boleto/fatura da
   Águas do Rio, vinculado à competência
   ============================================ */

let _pendingInvoiceCp = null;

function ensureInvoiceInput() {
  if (document.getElementById('invoice-input-global')) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf,image/*';
  input.id = 'invoice-input-global';
  input.className = 'photo-input-hidden';
  input.addEventListener('change', handleInvoiceInputChange);
  document.body.appendChild(input);
}

function abrirSelecaoFatura(cp) {
  ensureInvoiceInput();
  _pendingInvoiceCp = cp;
  document.getElementById('invoice-input-global').click();
}

async function handleInvoiceInputChange(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !_pendingInvoiceCp) return;
  const cp = _pendingInvoiceCp;

  if (!PhotoUtils.validarTamanhoArquivo(file)) {
    alert(`Arquivo muito grande. O limite é ${PhotoUtils.INVOICE_MAX_SIZE_MB}MB.`);
    return;
  }

  try {
    // PDFs vão direto sem compressão; imagens também vão sem compressão aqui
    // (a fatura precisa ficar legível para auditoria — diferente da foto do hidrômetro)
    const dataUrl = await PhotoUtils.readFileAsDataUrl(file);
    await RateioDB.saveInvoice(cp, dataUrl, file.name, file.type);
    if (typeof onInvoiceSaved === 'function') onInvoiceSaved(cp);
  } catch (err) {
    alert('Não foi possível processar o arquivo: ' + err.message);
  }
}

/**
 * Renderiza o botão/indicador de fatura anexada para a competência atual,
 * exibido no painel superior (ao lado dos campos de consumo/valor).
 */
async function renderInvoiceWidget(cp) {
  const registro = cp ? await RateioDB.getInvoice(cp) : null;
  const hasInvoice = !!registro;

  if (hasInvoice) {
    return `<button type="button" class="invoice-btn has-invoice" onclick="InvoiceUI.abrirModalFatura('${cp}')" title="Ver fatura anexada">
      📎 Fatura anexada <span class="invoice-dot"></span>
    </button>`;
  }
  return `<button type="button" class="invoice-btn" onclick="InvoiceUI.abrirModalFatura('${cp}')" title="Anexar boleto/fatura da Águas do Rio">
    📎 Anexar fatura
  </button>`;
}

async function abrirModalFatura(cp) {
  if (!cp) { alert('Selecione a competência antes de anexar a fatura.'); return; }
  const registro = await RateioDB.getInvoice(cp);

  const overlay = document.createElement('div');
  overlay.className = 'photo-modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const isPdf = registro && registro.mimeType === 'application/pdf';
  const sizeKB = registro ? PhotoUtils.estimateDataUrlSizeKB(registro.dataUrl) : 0;
  const dataFormatada = registro ? PhotoUtils.formatPhotoTimestamp(registro.timestamp) : '';

  let previewHtml = '';
  if (registro) {
    previewHtml = isPdf
      ? `<div class="invoice-pdf-preview">
           <span style="font-size:38px;">📄</span>
           <div style="font-size:13px;color:#555;margin-top:6px;">${registro.fileName}</div>
         </div>`
      : `<img class="photo-preview" src="${registro.dataUrl}" alt="Fatura da competência ${Fmt.formatarCompetencia(cp)}">`;
  }

  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-header">
        <span class="photo-modal-title">📎 Fatura — ${Fmt.formatarCompetencia(cp)}</span>
        <button class="photo-modal-close" id="invoice-modal-close-btn">✕</button>
      </div>
      ${registro
        ? `${previewHtml}
           <div class="photo-meta">📅 Anexada em ${dataFormatada}<br>📄 ${registro.fileName}<br>💾 ${sizeKB} KB</div>
           <div class="photo-actions">
             ${isPdf ? `<a class="bg" href="${registro.dataUrl}" download="${registro.fileName}" style="text-decoration:none;display:inline-flex;align-items:center;">⬇️ Baixar PDF</a>` : ''}
             <button class="bg" id="invoice-replace-btn">🔄 Substituir</button>
             <button class="bd" id="invoice-delete-btn">🗑️ Remover</button>
           </div>`
        : `<p style="font-size:13px;color:#666;margin-bottom:1rem;">Nenhuma fatura anexada para esta competência.<br>Aceita PDF ou imagem (foto/print do boleto).</p>
           <button class="bp" id="invoice-add-btn">📎 Anexar fatura</button>`
      }
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById('invoice-modal-close-btn').onclick = () => overlay.remove();

  const addBtn = document.getElementById('invoice-add-btn');
  if (addBtn) addBtn.onclick = () => { overlay.remove(); abrirSelecaoFatura(cp); };

  const replaceBtn = document.getElementById('invoice-replace-btn');
  if (replaceBtn) replaceBtn.onclick = () => { overlay.remove(); abrirSelecaoFatura(cp); };

  const deleteBtn = document.getElementById('invoice-delete-btn');
  if (deleteBtn) deleteBtn.onclick = async () => {
    if (!confirm(`Remover a fatura anexada de ${Fmt.formatarCompetencia(cp)}?`)) return;
    await RateioDB.deleteInvoice(cp);
    overlay.remove();
    if (typeof onInvoiceSaved === 'function') onInvoiceSaved(cp);
  };
}

window.InvoiceUI = { abrirSelecaoFatura, abrirModalFatura, renderInvoiceWidget };
