/* ============================================
   tab-historico.js — aba de Histórico de competências
   ============================================ */

const TabHistorico = (() => {

  async function render(mapaCompetencias, onEditar, onExcluir, onExportarCSV) {
    const busca = document.getElementById('hs').value.trim().toLowerCase();
    const body = document.getElementById('hb');
    const chaves = Object.keys(mapaCompetencias).sort().reverse();

    if (!chaves.length) {
      body.innerHTML = '<div class="empty">Nenhuma competência salva ainda.</div>';
      return;
    }

    let html = '';
    for (const cp of chaves) {
      if (busca && !Fmt.formatarCompetencia(cp).toLowerCase().includes(busca) && !cp.includes(busca)) continue;
      const r = mapaCompetencias[cp];
      const valorTotal = Object.values(r.u).reduce((s, x) => s + x.v, 0);
      const refLabel = r.compAnterior ? `ref. ${Fmt.formatarCompetencia(r.compAnterior)}` : 'primeira competência';
      const invoiceBtn = await InvoiceUI.renderInvoiceWidget(cp);

      html += `<div class="he">
        <div class="hh">
          <span class="hc">📅 ${Fmt.formatarCompetencia(cp)}</span>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            <span class="hm">${r.t.toFixed(2)} m³ · R$ ${Fmt.formatarBRL(valorTotal)} · <em>${refLabel}</em></span>
            ${invoiceBtn}
            <button class="bg" onclick="TabHistorico.exportarCSV('${cp}')" style="padding:3px 10px;font-size:12px;">⬇️ CSV</button>
            <button class="bg" onclick="TabHistorico.editar('${cp}')" style="padding:3px 10px;font-size:12px;">✏️ Editar</button>
            <button class="bd" onclick="TabHistorico.excluir('${cp}')">🗑️</button>
          </div>
        </div>
        <details>
          <summary>Ver detalhes das unidades</summary>
          <div style="margin-top:8px;overflow-x:auto;">
            <table class="rt"><thead><tr>
              <th>Unidade</th><th style="text-align:right">Leit. ant.</th><th style="text-align:right">Leit. atual</th>
              <th style="text-align:right">Consumo</th><th style="text-align:right">Rateio diff.</th><th style="text-align:right">Valor R$</th>
            </tr></thead><tbody>
            ${Object.entries(r.u).map(([u, d]) => `<tr>
              <td><b>${u}</b></td>
              <td class="n">${d.p.toFixed(2)}</td>
              <td class="n">${d.la > 0 ? d.la.toFixed(2) : '—'}</td>
              <td class="n">${d.c.toFixed(2)}</td>
              <td class="n">${d.r > 0.0001 ? d.r.toFixed(4) : '—'}</td>
              <td class="n">R$ ${Fmt.formatarBRL(d.v)}</td>
            </tr>`).join('')}
            </tbody></table>
          </div>
        </details>
      </div>`;
    }

    body.innerHTML = html || '<div class="empty">Nenhum resultado.</div>';

    // guarda callbacks para os botões inline chamarem
    _onEditar = onEditar;
    _onExcluir = onExcluir;
    _onExportarCSV = onExportarCSV;
  }

  let _onEditar = null, _onExcluir = null, _onExportarCSV = null;

  function editar(cp) { if (_onEditar) _onEditar(cp); }
  function excluir(cp) { if (_onExcluir) _onExcluir(cp); }
  function exportarCSV(cp) { if (_onExportarCSV) _onExportarCSV(cp); }

  return { render, editar, excluir, exportarCSV };
})();
