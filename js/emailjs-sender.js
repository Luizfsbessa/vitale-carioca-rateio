/* ============================================
   emailjs-sender.js — envio de extrato por e-mail
   usando EmailJS (gratuito até 250/mês).

   CONFIGURAÇÃO NECESSÁRIA (feita uma vez no app):
   - Aba "⚙️ Config" ou no localStorage:
     EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY
   ============================================ */

const EMAILJS_CDN = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';

let _ejsLoaded = false;

/**
 * Carrega o SDK do EmailJS dinamicamente (só quando necessário).
 */
async function carregarEmailJS() {
  if (_ejsLoaded || (typeof emailjs !== 'undefined')) { _ejsLoaded = true; return true; }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = EMAILJS_CDN;
    script.onload = () => { _ejsLoaded = true; resolve(true); };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Lê a configuração do EmailJS salva no localStorage.
 */
function getConfig() {
  return {
    serviceId:   localStorage.getItem('ejs_service_id')  || '',
    templateId:  localStorage.getItem('ejs_template_id') || '',
    publicKey:   localStorage.getItem('ejs_public_key')  || '',
  };
}

function salvarConfig(serviceId, templateId, publicKey) {
  localStorage.setItem('ejs_service_id',  serviceId.trim());
  localStorage.setItem('ejs_template_id', templateId.trim());
  localStorage.setItem('ejs_public_key',  publicKey.trim());
}

function configValida() {
  const c = getConfig();
  return !!(c.serviceId && c.templateId && c.publicKey);
}

/**
 * Gera o PDF e envia por e-mail para o condômino.
 * O PDF é convertido para base64 e passado como variável
 * no template do EmailJS.
 *
 * @param {string} cpSel - competência
 * @param {string} unidade
 * @param {Object} regComp - registro da competência
 * @param {Object} resident - { nome, email, whatsapp }
 * @param {Function} onStatus - callback(msg, tipo) para mostrar progresso
 */
async function enviarEmailExtrato(cpSel, unidade, regComp, resident, onStatus) {
  const email = resident?.email || '';
  if (!email) {
    onStatus('E-mail não cadastrado para esta unidade.', 'erro');
    return false;
  }

  if (!configValida()) {
    abrirModalConfigEmailJS();
    return false;
  }

  onStatus('Gerando PDF...', 'info');

  // Gera PDF em base64 sem baixar (modo silencioso)
  const pdfBase64 = await PDFGenerator.gerarBase64Unidade(cpSel, unidade, regComp, resident);
  if (!pdfBase64) { onStatus('Erro ao gerar o PDF.', 'erro'); return false; }

  const ok = await carregarEmailJS();
  if (!ok) { onStatus('Não foi possível carregar o serviço de e-mail. Verifique a conexão.', 'erro'); return false; }

  onStatus('Enviando e-mail...', 'info');

  const cfg = getConfig();
  const d = regComp.u[unidade];
  const andar = Math.floor(parseInt(unidade) / 100);

  const templateParams = {
    to_email:      email,
    to_name:       resident?.nome || `Unidade ${unidade}`,
    unidade:       unidade,
    andar:         `${andar}º Andar`,
    competencia:   Fmt.formatarCompetencia(cpSel),
    leitura:       d.la > 0 ? `${d.la.toFixed(2)} m³` : '—',
    consumo:       `${d.c.toFixed(2)} m³`,
    valor_ind:     `R$ ${Fmt.formatarBRL(regComp.vpm3 * d.c)}`,
    valor_rateio:  `R$ ${Fmt.formatarBRL(regComp.vpm3 * d.r)}`,
    valor_total:   `R$ ${Fmt.formatarBRL(d.v)}`,
    pdf_base64:    pdfBase64,
    pdf_nome:      `extrato_${unidade}_${cpSel}.pdf`,
  };

  try {
    emailjs.init(cfg.publicKey);
    const result = await emailjs.send(cfg.serviceId, cfg.templateId, templateParams);
    if (result.status === 200) {
      onStatus(`✅ E-mail enviado para ${email}`, 'ok');
      return true;
    } else {
      onStatus(`Erro no envio: ${result.text}`, 'erro');
      return false;
    }
  } catch (err) {
    onStatus(`Erro: ${err?.text || err?.message || 'Falha desconhecida'}`, 'erro');
    return false;
  }
}

/**
 * Modal de configuração do EmailJS — aparece na primeira vez.
 */
function abrirModalConfigEmailJS() {
  const cfg = getConfig();
  const overlay = document.createElement('div');
  overlay.className = 'photo-modal-overlay';
  overlay.innerHTML = `
    <div class="photo-modal" style="max-width:500px;">
      <div class="photo-modal-header">
        <span class="photo-modal-title">⚙️ Configurar envio de e-mail</span>
        <button class="photo-modal-close" id="ejs-cfg-close">✕</button>
      </div>

      <div class="ai" style="margin-bottom:14px;">
        📧 O envio de e-mail usa o <strong>EmailJS</strong> (gratuito até 250/mês).<br>
        Configure uma vez e funciona para sempre.
      </div>

      <div style="font-size:13px;font-weight:600;color:#1a2b4a;margin-bottom:10px;">
        Passo a passo (2 minutos):
      </div>
      <ol style="font-size:12px;color:#555;line-height:2;padding-left:18px;margin-bottom:14px;">
        <li>Acesse <a href="https://www.emailjs.com" target="_blank" style="color:#1d4ed8;">emailjs.com</a> → crie conta grátis com seu Gmail</li>
        <li>Em <strong>Email Services</strong> → Add Service → Gmail → copie o <strong>Service ID</strong></li>
        <li>Em <strong>Email Templates</strong> → Create Template → cole o template abaixo → copie o <strong>Template ID</strong></li>
        <li>Em <strong>Account</strong> → copie a <strong>Public Key</strong></li>
        <li>Cole os valores abaixo e salve</li>
      </ol>

      <details style="margin-bottom:14px;">
        <summary style="font-size:12px;cursor:pointer;color:#1d4ed8;font-weight:500;">📋 Ver template de e-mail para copiar</summary>
        <div style="background:#f5f5f0;border-radius:6px;padding:10px;margin-top:8px;font-size:11px;font-family:monospace;white-space:pre-wrap;color:#333;line-height:1.6;">Assunto: Extrato de Água - {{competencia}} - Unidade {{unidade}}

Olá {{to_name}},

Segue seu extrato de consumo de água referente a {{competencia}}.

🏢 Unidade: {{unidade}} ({{andar}})
💧 Leitura: {{leitura}}
📊 Consumo: {{consumo}}

💰 Composição:
• Individual: {{valor_ind}}
• Rateio: {{valor_rateio}}
• Total a pagar: {{valor_total}}

O extrato completo em PDF está em anexo.

Dúvidas? Entre em contato com a administração.

Condomínio Vitale Carioca</div>
      </details>

      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:3px;">Service ID</label>
          <input id="ejs-svc" type="text" value="${cfg.serviceId}" placeholder="ex: service_abc123"
            style="width:100%;height:34px;border:1px solid #d1cfc6;border-radius:6px;padding:0 10px;font-size:13px;">
        </div>
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:3px;">Template ID</label>
          <input id="ejs-tpl" type="text" value="${cfg.templateId}" placeholder="ex: template_xyz789"
            style="width:100%;height:34px;border:1px solid #d1cfc6;border-radius:6px;padding:0 10px;font-size:13px;">
        </div>
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:3px;">Public Key</label>
          <input id="ejs-key" type="text" value="${cfg.publicKey}" placeholder="ex: user_ABCDEFGH"
            style="width:100%;height:34px;border:1px solid #d1cfc6;border-radius:6px;padding:0 10px;font-size:13px;">
        </div>
      </div>

      <div style="display:flex;gap:8px;">
        <button class="bp" id="ejs-save-btn" style="flex:1;">💾 Salvar configuração</button>
        <button class="bg" id="ejs-test-btn">🧪 Testar envio</button>
      </div>
      <div id="ejs-cfg-status" style="font-size:12px;margin-top:8px;"></div>
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById('ejs-cfg-close').onclick = () => overlay.remove();

  document.getElementById('ejs-save-btn').onclick = () => {
    const svc = document.getElementById('ejs-svc').value.trim();
    const tpl = document.getElementById('ejs-tpl').value.trim();
    const key = document.getElementById('ejs-key').value.trim();
    if (!svc || !tpl || !key) {
      document.getElementById('ejs-cfg-status').innerHTML = '<span style="color:#dc2626;">Preencha todos os campos.</span>';
      return;
    }
    salvarConfig(svc, tpl, key);
    document.getElementById('ejs-cfg-status').innerHTML = '<span style="color:#065f46;">✅ Configuração salva! Agora pode enviar e-mails.</span>';
    setTimeout(() => overlay.remove(), 1500);
  };

  document.getElementById('ejs-test-btn').onclick = async () => {
    const svc = document.getElementById('ejs-svc').value.trim();
    const tpl = document.getElementById('ejs-tpl').value.trim();
    const key = document.getElementById('ejs-key').value.trim();
    if (!svc || !tpl || !key) {
      document.getElementById('ejs-cfg-status').innerHTML = '<span style="color:#dc2626;">Salve a configuração antes de testar.</span>';
      return;
    }
    salvarConfig(svc, tpl, key);
    document.getElementById('ejs-cfg-status').innerHTML = '<span style="color:#555;">Enviando e-mail de teste...</span>';
    const ok = await carregarEmailJS();
    if (!ok) { document.getElementById('ejs-cfg-status').innerHTML = '<span style="color:#dc2626;">Sem conexão com EmailJS.</span>'; return; }
    try {
      emailjs.init(key);
      const res = await emailjs.send(svc, tpl, {
        to_email: 'teste@vitale.carioca',
        to_name: 'Teste', unidade: '101', andar: '1º Andar',
        competencia: 'Teste', leitura: '—', consumo: '—',
        valor_ind: '—', valor_rateio: '—', valor_total: '—',
        pdf_base64: '', pdf_nome: 'teste.pdf'
      });
      document.getElementById('ejs-cfg-status').innerHTML =
        res.status === 200
          ? '<span style="color:#065f46;">✅ Teste enviado! Verifique a caixa de entrada.</span>'
          : `<span style="color:#dc2626;">Erro: ${res.text}</span>`;
    } catch (e) {
      document.getElementById('ejs-cfg-status').innerHTML = `<span style="color:#dc2626;">Erro: ${e?.text || e?.message}</span>`;
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
