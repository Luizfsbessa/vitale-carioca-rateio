/* ============================================
   emailjs-sender.js — envio de extrato por e-mail
   via EmailJS (gratuito até 250/mês)
   ============================================ */

const EMAILJS_CDNS = [
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',
  'https://unpkg.com/@emailjs/browser@4/dist/email.min.js',
];
let _ejsLoaded = false;

async function carregarEmailJS() {
  if (_ejsLoaded || typeof emailjs !== 'undefined') { _ejsLoaded = true; return true; }
  for (const cdn of EMAILJS_CDNS) {
    const ok = await new Promise(resolve => {
      const s = document.createElement('script');
      s.src = cdn;
      s.onload = () => { _ejsLoaded = true; resolve(true); };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
    if (ok) return true;
  }
  return false;
}

function getConfig() {
  return {
    serviceId:  localStorage.getItem('ejs_service_id')  || '',
    templateId: localStorage.getItem('ejs_template_id') || '',
    publicKey:  localStorage.getItem('ejs_public_key')  || '',
  };
}

function salvarConfig(s, t, k) {
  localStorage.setItem('ejs_service_id',  s.trim());
  localStorage.setItem('ejs_template_id', t.trim());
  localStorage.setItem('ejs_public_key',  k.trim());
}

function configValida() {
  const c = getConfig();
  return !!(c.serviceId && c.templateId && c.publicKey);
}

async function enviarEmailExtrato(cpSel, unidade, regComp, resident, onStatus) {
  const email = resident?.email || '';
  if (!email) { onStatus('E-mail não cadastrado para esta unidade.', 'erro'); return false; }
  if (!configValida()) { abrirModalConfigEmailJS(); return false; }

  onStatus('Gerando PDF...', 'info');
  const pdfBase64 = await PDFGenerator.gerarBase64Unidade(cpSel, unidade, regComp, resident);
  if (!pdfBase64) { onStatus('Erro ao gerar o PDF.', 'erro'); return false; }

  const ok = await carregarEmailJS();
  if (!ok) { onStatus('Sem conexão com o serviço de e-mail.', 'erro'); return false; }

  onStatus('Enviando e-mail...', 'info');
  const cfg = getConfig();
  const d = regComp.u[unidade];
  const andar = Math.floor(parseInt(unidade) / 100);

  try {
    emailjs.init(cfg.publicKey);
    const result = await emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email:     email,
      to_name:      resident?.nome || `Unidade ${unidade}`,
      name:         resident?.nome || `Unidade ${unidade}`,
      email:        email,
      unidade:      unidade,
      andar:        `${andar}º Andar`,
      competencia:  Fmt.formatarCompetencia(cpSel).replace('/', '-'),
      leitura:      d.la > 0 ? `${d.la.toFixed(2)} m³` : '—',
      consumo:      `${d.c.toFixed(2)} m³`,
      valor_ind:    `R$ ${Fmt.formatarBRL(regComp.vpm3 * d.c)}`,
      valor_rateio: `R$ ${Fmt.formatarBRL(regComp.vpm3 * d.r)}`,
      valor_total:  `R$ ${Fmt.formatarBRL(d.v)}`,
      pdf_base64:   pdfBase64,
      pdf_nome:     `extrato_${unidade}_${cpSel}.pdf`,
    });
    if (result.status === 200) {
      onStatus(`✅ E-mail enviado para ${email}`, 'ok');
      return true;
    }
    onStatus(`Erro no envio: ${result.text}`, 'erro');
    return false;
  } catch (err) {
    onStatus(`Erro: ${err?.text || err?.message || 'Falha desconhecida'}`, 'erro');
    return false;
  }
}

function abrirModalConfigEmailJS() {
  // Remove modal anterior se existir
  document.getElementById('ejs-cfg-overlay')?.remove();

  const cfg = getConfig();
  const overlay = document.createElement('div');
  overlay.id = 'ejs-cfg-overlay';
  overlay.className = 'photo-modal-overlay';
  overlay.innerHTML = `
    <div class="photo-modal" style="max-width:500px;">
      <div class="photo-modal-header">
        <span class="photo-modal-title">⚙️ Configurar envio de e-mail</span>
        <button class="photo-modal-close" id="ejs-close">✕</button>
      </div>
      <div class="ai" style="margin-bottom:14px;">
        📧 O envio usa o <strong>EmailJS</strong> (gratuito até 250/mês). Configure uma vez e funciona sempre.
      </div>
      <ol style="font-size:12px;color:#555;line-height:2.2;padding-left:18px;margin-bottom:14px;">
        <li>Acesse <a href="https://www.emailjs.com" target="_blank" style="color:#1d4ed8;">emailjs.com</a> → crie conta grátis com seu Gmail</li>
        <li>Em <strong>Email Services</strong> → Add Service → Gmail → copie o <strong>Service ID</strong></li>
        <li>Em <strong>Email Templates</strong> → Create Template → copie o <strong>Template ID</strong></li>
        <li>Em <strong>Account</strong> → <strong>API Keys</strong> → copie a <strong>Public Key</strong></li>
      </ol>

      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:3px;">Service ID</label>
          <input id="ejs-svc" type="text" value="${cfg.serviceId}" placeholder="ex: service_abc1234"
            style="width:100%;height:36px;border:1px solid #d1cfc6;border-radius:6px;padding:0 10px;font-size:13px;">
        </div>
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:3px;">Template ID</label>
          <input id="ejs-tpl" type="text" value="${cfg.templateId}" placeholder="ex: template_xyz7890"
            style="width:100%;height:36px;border:1px solid #d1cfc6;border-radius:6px;padding:0 10px;font-size:13px;">
        </div>
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:3px;">Public Key</label>
          <input id="ejs-key" type="text" value="${cfg.publicKey}" placeholder="ex: aBcDeFgHiJkLmNoP"
            style="width:100%;height:36px;border:1px solid #d1cfc6;border-radius:6px;padding:0 10px;font-size:13px;">
        </div>
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:3px;">E-mail para testar</label>
          <input id="ejs-test-email" type="email" placeholder="seu@email.com"
            style="width:100%;height:36px;border:1px solid #d1cfc6;border-radius:6px;padding:0 10px;font-size:13px;">
        </div>
      </div>

      <div style="display:flex;gap:8px;">
        <button class="bp" id="ejs-save-btn" style="flex:1;">💾 Salvar configuração</button>
        <button class="bg" id="ejs-test-btn">🧪 Testar envio</button>
      </div>
      <div id="ejs-cfg-status" style="font-size:12px;margin-top:10px;min-height:18px;"></div>
    </div>`;

  document.body.appendChild(overlay);

  document.getElementById('ejs-close').onclick = () => overlay.remove();

  document.getElementById('ejs-save-btn').onclick = () => {
    const svc = document.getElementById('ejs-svc').value.trim();
    const tpl = document.getElementById('ejs-tpl').value.trim();
    const key = document.getElementById('ejs-key').value.trim();
    if (!svc || !tpl || !key) {
      document.getElementById('ejs-cfg-status').innerHTML = '<span style="color:#dc2626;">Preencha os 3 campos obrigatórios.</span>';
      return;
    }
    salvarConfig(svc, tpl, key);
    document.getElementById('ejs-cfg-status').innerHTML = '<span style="color:#065f46;">✅ Configuração salva!</span>';
    setTimeout(() => overlay.remove(), 1200);
  };

  document.getElementById('ejs-test-btn').onclick = async () => {
    const svc = document.getElementById('ejs-svc').value.trim();
    const tpl = document.getElementById('ejs-tpl').value.trim();
    const key = document.getElementById('ejs-key').value.trim();
    const dest = document.getElementById('ejs-test-email').value.trim();
    const statusEl = document.getElementById('ejs-cfg-status');

    if (!svc || !tpl || !key) {
      statusEl.innerHTML = '<span style="color:#dc2626;">Preencha Service ID, Template ID e Public Key.</span>';
      return;
    }
    if (!dest || !dest.includes('@')) {
      statusEl.innerHTML = '<span style="color:#dc2626;">Preencha o campo "E-mail para testar" com um e-mail válido.</span>';
      return;
    }

    salvarConfig(svc, tpl, key);
    statusEl.innerHTML = '<span style="color:#555;">⏳ Carregando serviço de e-mail...</span>';

    const ok = await carregarEmailJS();
    if (!ok) { statusEl.innerHTML = '<span style="color:#dc2626;">Sem conexão com EmailJS. Verifique a internet.</span>'; return; }

    statusEl.innerHTML = '<span style="color:#555;">⏳ Enviando e-mail de teste...</span>';
    try {
      emailjs.init(key);
      const res = await emailjs.send(svc, tpl, {
        to_email:     dest,
        to_name:      'Teste Vitale Carioca',
        name:         'Teste Vitale Carioca',
        email:        dest,
        unidade:      '101',
        andar:        '1º Andar',
        competencia:  'Jun-2026',
        leitura:      '125.00 m³',
        consumo:      '5.00 m³',
        valor_ind:    'R$ 36,21',
        valor_rateio: 'R$ 7,54',
        valor_total:  'R$ 43,75',
        pdf_base64:   '',
        pdf_nome:     'extrato_101_2026-06.pdf',
      });
      statusEl.innerHTML = res.status === 200
        ? `<span style="color:#065f46;">✅ E-mail de teste enviado para ${dest}! Verifique a caixa de entrada.</span>`
        : `<span style="color:#dc2626;">Erro: ${res.text}</span>`;
    } catch (e) {
      statusEl.innerHTML = `<span style="color:#dc2626;">Erro: ${e?.text || e?.message || JSON.stringify(e)}</span>`;
    }
  };
}

window.EmailJSSender = {
  enviarEmailExtrato,
  abrirModalConfigEmailJS,
  configValida,
  getConfig,
  salvarConfig,
};
