/* ============================================
   photos-ui.js — captura de foto do hidrômetro
   e modal de visualização (auditoria)
   ============================================ */

let _photoModalCallback = null;

/**
 * Cria (uma vez) o input de arquivo escondido usado para abrir a câmera.
 * `capture="environment"` força a câmera traseira em celulares.
 */
function ensurePhotoInput() {
  if (document.getElementById('photo-input-global')) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.id = 'photo-input-global';
  input.className = 'photo-input-hidden';
  input.addEventListener('change', handlePhotoInputChange);
  document.body.appendChild(input);
}

let _pendingPhotoTarget = null; // { cp, unidade }

function abrirCapturaFoto(cp, unidade) {
  ensurePhotoInput();
  _pendingPhotoTarget = { cp, unidade };
  document.getElementById('photo-input-global').click();
}

async function handlePhotoInputChange(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !_pendingPhotoTarget) return;
  const { cp, unidade } = _pendingPhotoTarget;

  try {
    const dataUrl = await PhotoUtils.compressImageFile(file);
    await RateioDB.savePhoto(cp, unidade, dataUrl);
    if (typeof onPhotoSaved === 'function') onPhotoSaved(unidade);
  } catch (err) {
    alert('Não foi possível processar a foto: ' + err.message);
  }
}

/**
 * Abre o modal mostrando a foto registrada de uma unidade, com
 * data/hora de captura (trilha de auditoria) e opções de substituir/remover.
 */
async function abrirModalFoto(cp, unidade) {
  const registro = await RateioDB.getPhoto(cp, unidade);

  const overlay = document.createElement('div');
  overlay.className = 'photo-modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const sizeKB = registro ? PhotoUtils.estimateDataUrlSizeKB(registro.dataUrl) : 0;
  const dataFormatada = registro ? PhotoUtils.formatPhotoTimestamp(registro.timestamp) : '';

  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-header">
        <span class="photo-modal-title">📷 Unidade ${unidade}</span>
        <button class="photo-modal-close" id="photo-modal-close-btn">✕</button>
      </div>
      ${registro
        ? `<img class="photo-preview" src="${registro.dataUrl}" alt="Foto do hidrômetro da unidade ${unidade}">
           <div class="photo-meta">📅 Registrada em ${dataFormatada}<br>💾 ${sizeKB} KB</div>
           <div class="photo-actions">
             <button class="bg" id="photo-replace-btn">🔄 Substituir foto</button>
             <button class="bd" id="photo-delete-btn">🗑️ Remover foto</button>
           </div>`
        : `<p style="font-size:13px;color:#666;margin-bottom:1rem;">Nenhuma foto registrada para esta unidade nesta competência.</p>
           <button class="bp" id="photo-add-btn">📷 Adicionar foto</button>`
      }
    </div>`;

  document.body.appendChild(overlay);

  document.getElementById('photo-modal-close-btn').onclick = () => overlay.remove();

  const addBtn = document.getElementById('photo-add-btn');
  if (addBtn) addBtn.onclick = () => { overlay.remove(); abrirCapturaFoto(cp, unidade); };

  const replaceBtn = document.getElementById('photo-replace-btn');
  if (replaceBtn) replaceBtn.onclick = () => { overlay.remove(); abrirCapturaFoto(cp, unidade); };

  const deleteBtn = document.getElementById('photo-delete-btn');
  if (deleteBtn) deleteBtn.onclick = async () => {
    if (!confirm(`Remover a foto da unidade ${unidade}?`)) return;
    await RateioDB.deletePhoto(cp, unidade);
    overlay.remove();
    if (typeof onPhotoSaved === 'function') onPhotoSaved(unidade);
  };
}

/**
 * Renderiza o botão de câmera (com indicador verde se já há foto)
 * para ser inserido na linha de uma unidade.
 */
async function renderPhotoButton(cp, unidade) {
  const registro = await RateioDB.getPhoto(cp, unidade);
  const hasPhoto = !!registro;
  return `<button type="button" class="photo-btn ${hasPhoto ? 'has-photo' : ''}"
            onclick="PhotosUI.abrirModalFoto('${cp}','${unidade}')"
            title="${hasPhoto ? 'Ver foto registrada' : 'Adicionar foto do hidrômetro'}">
            📷${hasPhoto ? '<span class="photo-dot"></span>' : ''}
          </button>`;
}

window.PhotosUI = { abrirCapturaFoto, abrirModalFoto, renderPhotoButton };
