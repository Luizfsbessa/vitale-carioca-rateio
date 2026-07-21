/* ============================================
   bulk-send.js — envio em lote do extrato
   para todos os condôminos com e-mail cadastrado
   ============================================ */

const BulkSend = (() => {

  function abrirModal() {
    document.getElementById('bulk-overlay')?.remove();

    if (!EmailJSSender.configValida()) {
      EmailJSSender.abrirModalConfigEmailJS();
      return;
    }

    const chaves = Object.keys(MAPA_COMPETENCIAS).sort().reverse();
    if (!chaves.length) {
      alert('Nenhuma competência fechada. Feche um mês antes de enviar.');
      return;
    }

    const optsComp = chaves.map(k =>
      `<option value="${k}">${Fmt.formatarCompetencia(k)}</option>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.id = 'bulk-overlay';
    overlay.className = 'photo-modal-overlay';
    overlay.innerHTML = `
      <div class="photo-modal" style="max-width:520px;">
        <div class="photo-modal-header">
          <span class="photo-modal-title">📨 Enviar para todos</span>
          <button class="photo-modal-close" id="bulk-close">✕</button>
        </div>

        <div class="ai" style="margin-bottom:14px;">
          Envia o extrato individual por e-mail para todas as unidades com e-mail cadastrado.
          Unidades sem e-mail serão listadas ao final como pendências.
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">Competência a enviar:</label>
          <select id="bulk-comp" style="width:100%;height:36px;border:1px solid #d1cfc6;border-radius:6px;padding:0 10px;font-size:13px;">
            ${optsComp}
          </select>
        </div>

        <!-- Preview de quantos serão enviados -->
        <div id="bulk-preview" style="font-size:13px;color:#555;margin-bottom:14px;padding:10px 12px;background:#f8f8f6;border-radius:8px;border:1px solid #e5e3da;">
          Carregando...
        </div>

        <!-- Barra de progresso (oculta inicialmente) -->
        <div id="bulk-progress-wrap" style="display:none;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#555;margin-bottom:6px;">
            <span id="bulk-progress-label">Iniciando...</span>
            <span id="bulk-progress-pct">0%</span>
          </div>
          <div style="background:#e5e3da;border-radius:8px;height:12px;overflow:hidden;">
            <div id="bulk-progress-bar" style="height:100%;background:linear-gradient(90deg,#60a5fa,#1d4ed8);border-radius:8px;width:0%;transition:width .3s;"></div>
          </div>
        </div>

        <!-- Log de envios -->
        <div id="bulk-log" style="display:none;max-height:200px;overflow-y:auto;font-size:12px;border:1px solid #e5e3da;border-radius:8px;padding:8px 12px;margin-bottom:14px;background:#fafaf8;line-height:2;">
        </div>

        <div style="display:flex;gap:8px;">
          <button class="bp" id="bulk-start-btn" style="flex:1;">📨 Iniciar envio</button>
          <button class="bg" id="bulk-cancel-btn">Cancelar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    document.getElementById('bulk-close').onclick    = () => overlay.remove();
    document.getElementById('bulk-cancel-btn').onclick = () => overlay.remove();

    // Preview ao abrir e ao trocar competência
    atualizarPreview();
    document.getElementById('bulk-comp').onchange = atualizarPreview;

    document.getElementById('bulk-start-btn').onclick = () => iniciarEnvio(overlay);
  }

  async function atualizarPreview() {
    const cp = document.getElementById('bulk-comp')?.value;
    const previewEl = document.getElementById('bulk-preview');
    if (!cp || !previewEl) return;

    const residents = await RateioDB.getAllResidents();
    const regComp = MAPA_COMPETENCIAS[cp];
    if (!regComp) return;

    const comEmail    = residents.filter(r => r.email && regComp.u[r.unidade]);
    const semEmail    = residents.filter(r => !r.email && regComp.u[r.unidade]?.la > 0);
    const semCadastro = RateioLogic.listarUnidades().filter(u =>
      !residents.find(r => r.unidade === u) && regComp.u[u]?.la > 0
    );

    previewEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
        <div style="background:#d1fae5;border-radius:6px;padding:8px;">
          <div style="font-size:20px;font-weight:700;color:#065f46;">${comEmail.length}</div>
          <div style="font-size:11px;color:#065f46;">📧 Receberão e-mail</div>
        </div>
        <div style="background:#fef3c7;border-radius:6px;padding:8px;">
          <div style="font-size:20px;font-weight:700;color:#92400e;">${semEmail.length}</div>
          <div style="font-size:11px;color:#92400e;">⚠️ Sem e-mail</div>
        </div>
        <div style="background:#f5f5f0;border-radius:6px;padding:8px;">
          <div style="font-size:20px;font-weight:700;color:#888;">${semCadastro.length}</div>
          <div style="font-size:11px;color:#888;">👤 Sem cadastro</div>
        </div>
      </div>`;
  }

  async function iniciarEnvio(overlay) {
    const cp = document.getElementById('bulk-comp').value;
    const regComp = MAPA_COMPETENCIAS[cp];
    if (!cp || !regComp) return;

    const residents = await RateioDB.getAllResidents();
    const fila = residents.filter(r => r.email && regComp.u[r.unidade]);

    if (!fila.length) {
      alert('Nenhuma unidade com e-mail cadastrado para esta competência.');
      return;
    }

    // UI: mostra progresso e log, esconde botão
    document.getElementById('bulk-progress-wrap').style.display = '';
    document.getElementById('bulk-log').style.display = '';
    document.getElementById('bulk-start-btn').disabled = true;
    document.getElementById('bulk-start-btn').textContent = '⏳ Enviando...';
    document.getElementById('bulk-cancel-btn').textContent = 'Fechar';
    document.getElementById('bulk-cancel-btn').onclick = () => overlay.remove();
    document.getElementById('bulk-close').onclick = () => overlay.remove();

    const logEl  = document.getElementById('bulk-log');
    const barEl  = document.getElementById('bulk-progress-bar');
    const lblEl  = document.getElementById('bulk-progress-label');
    const pctEl  = document.getElementById('bulk-progress-pct');

    let enviados = 0, falhas = 0;
    const pendentes = []; // sem e-mail

    for (let i = 0; i < fila.length; i++) {
      const resident = fila[i];
      const { unidade, nome, email } = resident;
      const pct = Math.round((i / fila.length) * 100);

      barEl.style.width = pct + '%';
      pctEl.textContent = pct + '%';
      lblEl.textContent = `Enviando ${i + 1}/${fila.length} — Unidade ${unidade}`;

      // Pequeno delay para não sobrecarregar a API (250ms entre envios)
      if (i > 0) await sleep(250);

      const ok = await EmailJSSender.enviarEmailExtrato(
        cp, unidade, regComp, resident,
        (msg, tipo) => {
          // Ignora callbacks intermediários de status no bulk
        }
      );

      if (ok) {
        enviados++;
        addLog(logEl, `✅ ${unidade} — ${nome || email}`, '#065f46');
      } else {
        falhas++;
        addLog(logEl, `❌ ${unidade} — ${nome || email} (falha no envio)`, '#dc2626');
      }
    }

    // Unidades sem e-mail
    const semEmail = residents.filter(r => !r.email && regComp.u[r.unidade]?.la > 0);
    semEmail.forEach(r => pendentes.push(r.unidade));

    // Finaliza
    barEl.style.width = '100%';
    pctEl.textContent = '100%';
    lblEl.textContent = 'Concluído!';

    addLog(logEl, '─'.repeat(40), '#ccc');
    addLog(logEl, `📊 Resultado: ${enviados} enviados · ${falhas} falhas · ${pendentes.length} sem e-mail`, '#1a2b4a');

    if (pendentes.length) {
      addLog(logEl, `⚠️ Sem e-mail: ${pendentes.join(', ')}`, '#92400e');
    }

    document.getElementById('bulk-start-btn').textContent = '✅ Concluído';
    document.getElementById('bulk-start-btn').style.background = '#d1fae5';
    document.getElementById('bulk-start-btn').style.color = '#065f46';
    document.getElementById('bulk-start-btn').style.borderColor = '#6ee7b7';
  }

  function addLog(el, msg, color) {
    const line = document.createElement('div');
    line.style.color = color || '#333';
    line.textContent = msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return { abrirModal };
})();
