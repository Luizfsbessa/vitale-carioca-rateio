/* ============================================
   tab-conferencia.js — aba de Conferência de status
   Mostra somente dados já salvos — não exige
   redigitação de consumo/valor da fatura.
   ============================================ */

const TabConferencia = (() => {

  /** Preenche o <select> de competências com as já salvas (mais recente primeiro). */
  function populateSelect(mapaCompetencias) {
    const sel = document.getElementById('conf-comp');
    const chaves = Object.keys(mapaCompetencias).sort().reverse();
    sel.innerHTML = chaves.length
      ? chaves.map(k => `<option value="${k}">${Fmt.formatarCompetencia(k)}</option>`).join('')
      : '<option value="">— Nenhuma competência salva —</option>';
  }

  async function render(mapaCompetencias) {
    const cp = document.getElementById('conf-comp').value;
    const filtro = document.getElementById('conf-filtro').value;
    const busca = document.getElementById('conf-busca').value.trim();

    const summaryEl = document.getElementById('conf-summary');
    const barEl = document.getElementById('conf-bar');
    const legendEl = document.getElementById('conf-legend');
    const bodyEl = document.getElementById('conf-body');

    if (!cp || !mapaCompetencias[cp]) {
      summaryEl.innerHTML = '';
      bodyEl.innerHTML = '<div class="empty">Selecione uma competência salva para conferir.</div>';
      barEl.style.width = '0%';
      legendEl.textContent = '';
      return;
    }

    const reg = mapaCompetencias[cp];
    const unidades = RateioLogic.listarUnidades();

    let lancadas = 0, pendentes = 0, totalConsumido = 0, totalValor = 0;
    unidades.forEach(u => {
      const d = reg.u[u];
      if (d && d.la > 0) { lancadas++; totalConsumido += d.c || 0; totalValor += d.v || 0; }
      else pendentes++;
    });
    const pct = Math.round(lancadas / unidades.length * 100);
    const refLabel = reg.compAnterior ? `ref. ${Fmt.formatarCompetencia(reg.compAnterior)}` : 'primeira competência';

    summaryEl.innerHTML = `
      <div class="mc"><div class="ml">Competência</div><div class="mv" style="font-size:15px;">${Fmt.formatarCompetencia(cp)}</div></div>
      <div class="mc"><div class="ml">Leitura anterior</div><div class="mv" style="font-size:14px;color:#555;">${refLabel}</div></div>
      <div class="mc"><div class="ml">Lançadas</div><div class="mv g">${lancadas} <span style="font-size:13px;color:#888;">/ ${unidades.length}</span></div></div>
      <div class="mc"><div class="ml">Sem Leitura</div><div class="mv ${pendentes > 0 ? 'r' : 'g'}">${pendentes}</div></div>
      <div class="mc"><div class="ml">Consumo identificado</div><div class="mv">${totalConsumido.toFixed(2)} m³</div></div>
      <div class="mc"><div class="ml">Valor parcial</div><div class="mv">R$ ${Fmt.formatarBRL(totalValor)}</div></div>`;
    barEl.style.width = pct + '%';
    legendEl.textContent = `${pct}% das unidades com leitura lançada`;

    let html = '';
    for (let andar = 1; andar <= RateioLogic.ANDARES; andar++) {
      const unidadesDoAndar = RateioLogic.listarUnidadesDoAndar(andar);

      const filtradas = unidadesDoAndar.filter(u => {
        if (busca && !u.includes(busca)) return false;
        const d = reg.u[u];
        const ok = d && d.la > 0;
        if (filtro === 'lancadas' && !ok) return false;
        if (filtro === 'pendentes' && ok) return false;
        return true;
      });
      if (!filtradas.length) continue;

      const okAndar = unidadesDoAndar.filter(u => reg.u[u] && reg.u[u].la > 0).length;
      const pctAndar = Math.round(okAndar / unidadesDoAndar.length * 100);
      const allOk = okAndar === unidadesDoAndar.length;

      html += `<div class="conf-floor">
        <div class="conf-floor-title">
          <div class="ft-label"><span>🏢 ${andar}º Andar</span><span style="font-size:11px;color:#888;">${okAndar}/${unidadesDoAndar.length} lançadas</span></div>
          <span class="ft-pct" style="color:${allOk ? '#065f46' : '#92400e'};border-color:${allOk ? '#6ee7b7' : '#fcd34d'};background:${allOk ? '#d1fae5' : '#fef3c7'};">${pctAndar}%</span>
        </div>
        <div class="conf-units">`;

      for (const u of filtradas) {
        const d = reg.u[u];
        const ok = d && d.la > 0;
        const leituraTxt = ok ? `${d.la.toFixed(2)} m³` : 'Sem Leitura';
        const consumoTxt = ok ? `${d.c.toFixed(2)} m³` : '';

        const valorIndividual = ok ? reg.vpm3 * d.c : 0;
        const valorRateio = ok ? reg.vpm3 * d.r : 0;
        const valorTotalTxt = ok ? `R$ ${Fmt.formatarBRL(d.v)}` : '';

        html += `<div class="cu ${ok ? 'cu-ok' : 'cu-pend'}">
          <div class="cu-num">${u}</div>
          <div class="cu-row" style="margin-top:4px;"><span class="cu-tag">Leitura</span><span class="cu-leit">${leituraTxt}</span></div>
          ${ok ? `
            <div class="cu-sep"></div>
            <div class="cu-row"><span class="cu-tag">Consumo</span><span class="cu-cons">${consumoTxt}</span></div>
            <div class="cu-sep"></div>
            <div class="cu-row"><span class="cu-tag">Valor ind.</span><span class="cu-val">R$ ${Fmt.formatarBRL(valorIndividual)}</span></div>
            <div class="cu-row"><span class="cu-tag">Rateio diff.</span><span class="cu-val" style="opacity:.8;">R$ ${Fmt.formatarBRL(valorRateio)}</span></div>
            <div class="cu-row" style="margin-top:2px;border-top:1px solid currentColor;padding-top:3px;opacity:.9;">
              <span class="cu-tag" style="font-weight:600;">Total</span><span class="cu-val" style="font-weight:700;">${valorTotalTxt}</span>
            </div>` : ''}
        </div>`;
      }
      html += '</div></div>';
    }

    bodyEl.innerHTML = html || '<div class="empty">Nenhuma unidade encontrada com este filtro.</div>';
  }

  return { populateSelect, render };
})();
