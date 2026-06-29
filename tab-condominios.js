const TabCondominios = (() => {
  let _map = {};

  async function carregar() {
    const lista = await RateioDB.getAllResidents();
    _map = {};
    lista.forEach(r => { _map[r.unidade] = r; });
  }

  function getResident(u) { return _map[u] || null; }
  function getMapaResidents() { return _map; }

  async function render() {
    const body = document.getElementById('cond-body');
    if (!body) return;
    const busca = (document.getElementById('cond-busca')?.value || '').trim().toLowerCase();
    const filtro = document.getElementById('cond-filtro')?.value || 'todos';
    let html = '';

    for (let a = 1; a <= RateioLogic.ANDARES; a++) {
      const unds = RateioLogic.listarUnidadesDoAndar(a);
      const filtradas = unds.filter(u => {
        const r = _map[u];
        const ok = !!(r && r.nome);
        if (busca && !u.includes(busca) && !(r && r.nome && r.nome.toLowerCase().includes(busca))) return false;
        if (filtro === 'cadastrados' && !ok) return false;
        if (filtro === 'pendentes' && ok) return false;
        return true;
      });
      if (!filtradas.length) continue;
      const cad = unds.filter(u => _map[u] && _map[u].nome).length;
      const pct = Math.round(cad / unds.length * 100);
      const allOk = cad === unds.length;
      html += `<div class="cond-floor">
        <div class="cond-floor-title">
          <div class="ft-label"><span>🏢 ${a}º Andar</span><span class="cond-count">${cad}/${unds.length}</span></div>
          <span class="fl-pct" style="${allOk?'color:#065f46;border-color:#6ee7b7;background:#d1fae5;':'color:#92400e;border-color:#fcd34d;background:#fef3c7;'}">${pct}%</span>
        </div>
        <div class="cond-units-list">`;
      filtradas.forEach(u => {
        const r = _map[u] || {};
        const ok = !!(r.nome);
        html += `<div class="cond-unit-row ${ok?'cond-ok':'cond-pend'}" id="cond-row-${u}">
          <div class="cond-apt">${u}</div>
          <div class="cond-fields">
            <input class="cond-input" type="text" placeholder="Nome do condômino" value="${r.nome||''}" id="cond-nome-${u}" onchange="TabCondominios.salvarCampo('${u}')">
            <input class="cond-input" type="tel" placeholder="WhatsApp (ex: 21999990000)" value="${r.whatsapp||''}" id="cond-wpp-${u}" onchange="TabCondominios.salvarCampo('${u}')">
            <input class="cond-input" type="email" placeholder="E-mail (opcional)" value="${r.email||''}" id="cond-email-${u}" onchange="TabCondominios.salvarCampo('${u}')">
          </div>
          <div class="cond-actions">
            ${ok?`<button class="cond-send-btn" onclick="TabCondominios.abrirEnvio('${u}')" title="Enviar extrato">📤</button>`:''}
            ${ok?`<button class="cond-clear-btn" onclick="TabCondominios.limpar('${u}')" title="Limpar">✕</button>`:''}
          </div>
        </div>`;
      });
      html += `</div></div>`;
    }
    body.innerHTML = html || '<div class="empty">Nenhuma unidade encontrada.</div>';
  }

  async function salvarCampo(unidade) {
    const nome  = document.getElementById(`cond-nome-${unidade}`)?.value.trim() || '';
    const wpp   = document.getElementById(`cond-wpp-${unidade}`)?.value.trim() || '';
    const email = document.getElementById(`cond-email-${unidade}`)?.value.trim() || '';
    const record = { unidade, nome, whatsapp: wpp, email };
    await RateioDB.saveResident(record);
    _map[unidade] = record;
    const row = document.getElementById(`cond-row-${unidade}`);
    if (!row) return;
    const ok = !!nome;
    row.className = `cond-unit-row ${ok?'cond-ok':'cond-pend'}`;
    const act = row.querySelector('.cond-actions');
    if (act) act.innerHTML = ok
      ? `<button class="cond-send-btn" onclick="TabCondominios.abrirEnvio('${unidade}')" title="Enviar extrato">📤</button><button class="cond-clear-btn" onclick="TabCondominios.limpar('${unidade}')" title="Limpar">✕</button>`
      : '';
  }

  async function limpar(unidade) {
    if (!confirm(`Limpar cadastro da unidade ${unidade}?`)) return;
    await RateioDB.deleteResident(unidade);
    delete _map[unidade];
    await render();
  }

  function abrirEnvio(unidade) {
    const cp = document.getElementById('comp')?.value || '';
    if (typeof AbrirModalEnvio === 'function') AbrirModalEnvio(unidade, cp);
  }

  async function importarCSV(texto) {
    const linhas = texto.trim().split(/\r?\n/);
    if (linhas.length < 2) return 0;
    // Auto-detecta separador: vírgula ou ponto e vírgula
    const sep = linhas[0].includes(';') ? ';' : ',';
    let count = 0;
    for (const linha of linhas.slice(1)) {
      if (!linha.trim()) continue;
      const p = linha.split(sep).map(x => x.trim().replace(/^"|"$/g, ''));
      if (p.length < 2 || !p[0] || !p[1]) continue;
      const [unidade, nome, whatsapp = '', email = ''] = p;
      const unidadeStr = String(unidade).trim();
      if (!unidadeStr || !nome) continue;
      const rec = { unidade: unidadeStr, nome, whatsapp: whatsapp.replace(/\D/g,''), email };
      await RateioDB.saveResident(rec);
      _map[unidadeStr] = rec;
      count++;
    }
    return count;
  }

  async function exportarCSV() {
    const lista = await RateioDB.getAllResidents();
    let csv = 'Unidade;Nome;WhatsApp;Email\n';
    lista.sort((a,b) => a.unidade.localeCompare(b.unidade))
         .forEach(r => { csv += `${r.unidade};${r.nome};${r.whatsapp||''};${r.email||''}\n`; });
    Fmt.downloadFile(csv, 'text/csv', 'condominios_vitale_carioca.csv');
  }

  return { carregar, render, salvarCampo, limpar, abrirEnvio,
           importarCSV, exportarCSV, getResident, getMapaResidents };
})();
