async function AbrirModalEnvio(unidade, cp) {
  const mapa = (typeof MAPA_COMPETENCIAS !== 'undefined') ? MAPA_COMPETENCIAS : {};
  const chaves = Object.keys(mapa).sort().reverse();
  if (!cp || !mapa[cp]) {
    if (!chaves.length) {
      alert('Nenhuma competência fechada ainda.\nFeche um mês de lançamentos primeiro.');
      return;
    }
    cp = chaves[0];
  }
  const regComp = mapa[cp];
  const d = regComp.u[unidade];
  if (!d) { alert(`Unidade ${unidade} não encontrada em ${Fmt.formatarCompetencia(cp)}.`); return; }
  const resident = await RateioDB.getResident(unidade);
  const nomeExib = resident?.nome || `Unidade ${unidade}`;
  const wpp = resident?.whatsapp || '';

  const overlay = document.createElement('div');
  overlay.className = 'photo-modal-overlay';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  const optsComp = Object.keys(MAPA_COMPETENCIAS).sort().reverse()
    .map(k => `<option value="${k}"${k===cp?' selected':''}>${Fmt.formatarCompetencia(k)}</option>`).join('');

  overlay.innerHTML = `
    <div class="photo-modal" style="max-width:480px;">
      <div class="photo-modal-header">
        <span class="photo-modal-title">📤 Enviar extrato — ${unidade}</span>
        <button class="photo-modal-close" id="share-close">✕</button>
      </div>
      <div style="font-size:13px;color:#555;margin-bottom:12px;line-height:1.6;">
        <strong style="color:#1a2b4a;">${nomeExib}</strong> · Competência: <strong>${Fmt.formatarCompetencia(cp)}</strong>
      </div>
      <div class="share-summary">
        <div class="share-row"><span>Leitura do hidrômetro</span><strong>${d.la>0?d.la.toFixed(2)+' m³':'—'}</strong></div>
        <div class="share-row"><span>Consumo do período</span><strong>${d.c.toFixed(2)} m³</strong></div>
        <div class="share-row"><span>Valor individual</span><strong>R$ ${Fmt.formatarBRL(regComp.vpm3*d.c)}</strong></div>
        <div class="share-row"><span>Rateio da diferença</span><strong>R$ ${Fmt.formatarBRL(regComp.vpm3*d.r)}</strong></div>
        <div class="share-row share-total"><span>Total a pagar</span><strong>R$ ${Fmt.formatarBRL(d.v)}</strong></div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:#888;">Competência:</label>
        <select id="share-comp-sel" style="margin-left:8px;height:32px;border:1px solid #d1cfc6;border-radius:6px;font-size:13px;padding:0 8px;">${optsComp}</select>
      </div>
      <div style="margin-bottom:8px;">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">WhatsApp (com DDD, sem espaço):</label>
        <input id="share-wpp" type="tel" value="${wpp}"
          style="width:100%;height:34px;border:1px solid #d1cfc6;border-radius:6px;padding:0 10px;font-size:13px;"
          placeholder="ex: 21999990000">
      </div>
      <div id="share-email-status" style="font-size:12px;min-height:18px;margin-top:4px;"></div>
      <div class="photo-actions" style="margin-top:12px;flex-wrap:wrap;gap:8px;">
        <button class="bp" id="share-pdf-btn">⬇️ Baixar PDF</button>
        <button class="bp" id="share-email-btn" style="background:#eef4fd;color:#1d4ed8;border-color:#c7ddf9;"
          ${resident?.email ? '' : 'title="E-mail não cadastrado para esta unidade" disabled style=\"opacity:.5;cursor:not-allowed;background:#eef4fd;color:#1d4ed8;border-color:#c7ddf9;\"'}>
          📧 E-mail${resident?.email ? '' : ' (sem e-mail)'}
        </button>
        <button class="bp" id="share-wpp-btn" style="background:#d1fae5;color:#065f46;border-color:#6ee7b7;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366" style="vertical-align:-3px;margin-right:4px;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.856L.057 23.882a.5.5 0 00.61.61l6.098-1.456A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.869 0-3.628-.49-5.153-1.349l-.369-.213-3.821.913.944-3.726-.234-.381A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          WhatsApp
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById('share-close').onclick = () => overlay.remove();
  document.getElementById('share-comp-sel').onchange = async e => { overlay.remove(); AbrirModalEnvio(unidade, e.target.value); };

  document.getElementById('share-pdf-btn').onclick = async () => {
    const cpSel = document.getElementById('share-comp-sel').value;
    const res = await RateioDB.getResident(unidade);
    await PDFGenerator.gerarPDFUnidade(cpSel, unidade, MAPA_COMPETENCIAS[cpSel], res);
  };

  const emailBtn = document.getElementById('share-email-btn');
  const statusEl = document.getElementById('share-email-status');

  if (emailBtn) {
    emailBtn.onclick = async () => {
      if (!resident?.email) { abrirConfigEmail(); return; }
      if (!EmailJSSender.configValida()) { EmailJSSender.abrirModalConfigEmailJS(); return; }
      const cpSel = document.getElementById('share-comp-sel').value;
      const regSel = MAPA_COMPETENCIAS[cpSel];
      const res = await RateioDB.getResident(unidade);
      emailBtn.disabled = true;
      emailBtn.textContent = '⏳ Enviando...';
      await EmailJSSender.enviarEmailExtrato(cpSel, unidade, regSel, res, (msg, tipo) => {
        statusEl.innerHTML = tipo === 'ok'
          ? `<span style="color:#065f46;">${msg}</span>`
          : tipo === 'erro'
            ? `<span style="color:#dc2626;">${msg}</span>`
            : `<span style="color:#555;">${msg}</span>`;
        if (tipo !== 'info') { emailBtn.disabled = false; emailBtn.textContent = '📧 E-mail'; }
      });
    };
  }

  document.getElementById('share-wpp-btn').onclick = async () => {
    const cpSel = document.getElementById('share-comp-sel').value;
    const num = document.getElementById('share-wpp').value.replace(/\D/g,'');
    if (!num) { alert('Informe o número do WhatsApp.'); return; }
    const res = await RateioDB.getResident(unidade);
    if (res && num !== res.whatsapp) await RateioDB.saveResident({...res, whatsapp: num});
    const reg = MAPA_COMPETENCIAS[cpSel];
    const dSel = reg.u[unidade];
    await PDFGenerator.gerarPDFUnidade(cpSel, unidade, reg, res);
    const msg = `Olá ${res?.nome ? '*'+res.nome+'*,' : `condômino(a) da unidade *${unidade}*,`}\n\n*EXTRATO DE CONSUMO DE ÁGUA — ${Fmt.formatarCompetencia(cpSel)}*\nCondomínio Vitale Carioca\n\n🏢 *Unidade:* ${unidade}\n💧 *Leitura:* ${dSel.la>0?dSel.la.toFixed(2)+' m³':'—'}\n📊 *Consumo:* ${dSel.c.toFixed(2)} m³\n\n💰 *Composição:*\n• Individual: R$ ${Fmt.formatarBRL(reg.vpm3*dSel.c)}\n• Rateio: R$ ${Fmt.formatarBRL(reg.vpm3*dSel.r)}\n• *Total: R$ ${Fmt.formatarBRL(dSel.v)}*\n\nO extrato PDF foi enviado em seguida.\n_Dúvidas? Contate a administração._`;
    const waUrl = `https://wa.me/55${num}?text=${encodeURIComponent(msg)}`;
    const waLink = document.createElement('a');
    waLink.href = waUrl;
    waLink.target = '_blank';
    waLink.rel = 'noopener noreferrer';
    waLink.style.display = 'none';
    document.body.appendChild(waLink);
    waLink.click();
    setTimeout(() => document.body.removeChild(waLink), 1000);
  };
}
