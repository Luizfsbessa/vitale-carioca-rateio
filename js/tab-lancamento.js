/* ============================================
   tab-lancamento.js — aba de Lançamento de leituras
   ============================================ */

const TabLancamento = (() => {

  function getCompetenciaSelecionada() {
    return document.getElementById('comp').value;
  }
  function getConsumoTotal() {
    return parseFloat(document.getElementById('tc').value) || 0;
  }
  function getValorFatura() {
    return parseFloat(document.getElementById('tv').value) || 0;
  }

  /** Lê do DOM o mapa { unidade: leituraAtualDigitada } */
  function lerLeiturasAtuais() {
    const leituras = {};
    RateioLogic.listarUnidades().forEach(u => {
      const el = document.getElementById('a' + u);
      const v = el ? parseFloat(el.value) : NaN;
      leituras[u] = isNaN(v) ? null : v;
    });
    return leituras;
  }

  /**
   * Reconstrói o grid de andares. Se `cpParaCarregar` for informado e já
   * existir no banco, preenche os campos com os valores salvos (modo edição).
   */
  async function buildGrid(mapaCompetencias, cp, cpParaCarregar) {
    const grid = document.getElementById('fg');
    grid.innerHTML = '';

    for (let andar = 1; andar <= RateioLogic.ANDARES; andar++) {
      const unidadesDoAndar = RateioLogic.listarUnidadesDoAndar(andar);

      let filled = 0;
      if (cpParaCarregar && mapaCompetencias[cpParaCarregar]) {
        unidadesDoAndar.forEach(u => {
          const d = mapaCompetencias[cpParaCarregar].u[u];
          if (d && d.la > 0) filled++;
        });
      }
      const pct = cpParaCarregar ? Math.round(filled / RateioLogic.UNIDADES_POR_ANDAR * 100) : null;
      const pillStyle = pct === 100
        ? 'color:#065f46;border-color:#6ee7b7;background:#d1fae5;'
        : 'color:#92400e;border-color:#fcd34d;background:#fef3c7;';
      const pill = pct !== null ? `<span class="fl-pct" style="${pillStyle}">${pct}%</span>` : '';

      const box = document.createElement('div');
      box.className = 'fb';

      let html = `<div class="fl"><span>🏢 ${andar}º Andar</span>${pill}</div><div class="fb-body">`;
      html += `<div class="ur" style="margin-bottom:4px;"><span></span><div class="ch">Hidrôm. anterior</div><div class="ch" title="Leitura acumulada do hidrômetro">Hidrôm. atual (m³)</div></div>`;

      for (const u of unidadesDoAndar) {
        const leitAnt = RateioLogic.leituraAnterior(mapaCompetencias, cp, u);
        const leitAntTxt = leitAnt !== null ? leitAnt.toFixed(2) : '—';

        let valorAtual = '';
        if (cpParaCarregar && mapaCompetencias[cpParaCarregar] && mapaCompetencias[cpParaCarregar].u[u]) {
          const la = mapaCompetencias[cpParaCarregar].u[u].la;
          if (la > 0) valorAtual = la;
        }

        const photoBtnHtml = await PhotosUI.renderPhotoButton(cp, u);

        html += `<div class="ur with-photo">
          <span class="un">${u}</span>
          <span class="up">${leitAntTxt}</span>
          <input class="ui" type="number" min="${leitAnt || 0}" step="0.01" placeholder="m³"
            id="a${u}" value="${valorAtual}"
            oninput="TabLancamento.onInputChange(this, ${leitAnt || 0}, ${andar})">
          ${photoBtnHtml}
        </div>`;
      }
      html += `</div>`;
      box.innerHTML = html;
      grid.appendChild(box);
    }
  }

  /** Chamado a cada digitação: valida mínimo, atualiza pílula do andar, recalcula totais. */
  function onInputChange(inputEl, minVal, andar) {
    validarMinimo(inputEl, minVal);
    atualizarPilulaAndar(andar);
    if (typeof onLancamentoChanged === 'function') onLancamentoChanged();
  }

  function validarMinimo(inputEl, minVal) {
    if (minVal === 0) { inputEl.classList.remove('invalid'); inputEl.title = ''; return; }
    const v = parseFloat(inputEl.value);
    if (!isNaN(v) && v < minVal) {
      inputEl.classList.add('invalid');
      inputEl.title = `Valor não pode ser inferior à leitura anterior (${minVal.toFixed(2)} m³)`;
    } else {
      inputEl.classList.remove('invalid');
      inputEl.title = '';
    }
  }

  function atualizarPilulaAndar(andar) {
    const boxes = document.querySelectorAll('.fb');
    const box = boxes[andar - 1];
    if (!box) return;
    let filled = 0;
    RateioLogic.listarUnidadesDoAndar(andar).forEach(u => {
      const el = document.getElementById('a' + u);
      if (el && parseFloat(el.value) > 0) filled++;
    });
    const pct = Math.round(filled / RateioLogic.UNIDADES_POR_ANDAR * 100);
    const allOk = pct === 100;
    let pill = box.querySelector('.fl-pct');
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'fl-pct';
      box.querySelector('.fl').appendChild(pill);
    }
    pill.style.cssText = allOk
      ? 'color:#065f46;border-color:#6ee7b7;background:#d1fae5;'
      : 'color:#92400e;border-color:#fcd34d;background:#fef3c7;';
    pill.textContent = pct + '%';
  }

  /** Atualiza os 4 cartões de métrica + aviso de diferença. */
  function atualizarMetricas(mapaCompetencias, cp) {
    const t = getConsumoTotal(), v = getValorFatura();
    const leituras = lerLeiturasAtuais();
    const consumos = {};
    RateioLogic.listarUnidades().forEach(u => {
      const ant = RateioLogic.leituraAnterior(mapaCompetencias, cp, u);
      consumos[u] = leituras[u] === null ? 0 : RateioLogic.calcularConsumo(leituras[u], ant);
    });
    const { somaIdentificada, diferenca, rateioPorUnidade } = RateioLogic.calcularRateio(t, v, consumos);

    document.getElementById('mm1').textContent = t > 0 ? t.toFixed(2) + ' m³' : '—';
    document.getElementById('mm2').textContent = t > 0 ? somaIdentificada.toFixed(2) + ' m³' : '—';
    document.getElementById('mm3').textContent = t > 0 ? diferenca.toFixed(2) + ' m³' : '—';
    document.getElementById('mm4').textContent = v > 0 ? 'R$ ' + Fmt.formatarBRL(v) : '—';

    const dn = document.getElementById('dn');
    if (diferenca > 0.001 && t > 0) {
      dn.textContent = `⚠️ Diferença de ${diferenca.toFixed(2)} m³ não coberta. Serão rateados ${rateioPorUnidade.toFixed(4)} m³/unidade (${diferenca.toFixed(2)} m³ ÷ 96).`;
      dn.classList.add('on');
    } else {
      dn.classList.remove('on');
    }
  }

  return {
    getCompetenciaSelecionada, getConsumoTotal, getValorFatura,
    lerLeiturasAtuais, buildGrid, onInputChange, atualizarMetricas
  };
})();
