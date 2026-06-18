/* ============================================
   tab-dashboard.js — aba de Dashboard (gráficos)
   ============================================ */

const TabDashboard = (() => {

  function populatePeriodo(mapaCompetencias) {
    const tipo = document.getElementById('dash-tipo').value;
    const chaves = Object.keys(mapaCompetencias).sort();
    const p1 = document.getElementById('dash-periodo');
    const p2 = document.getElementById('dash-periodo2');
    const lb2 = document.getElementById('dash-label2');

    if (tipo === 'mensal') {
      p1.innerHTML = chaves.map(k => `<option value="${k}">${Fmt.formatarCompetencia(k)}</option>`).join('');
      p2.style.display = 'none'; lb2.style.display = 'none';
    } else {
      const anos = [...new Set(chaves.map(k => k.split('-')[0]))];
      p1.innerHTML = anos.map(a => `<option value="${a}">${a}</option>`).join('');
      p2.innerHTML = '<option value="">— até atual —</option>' + anos.map(a => `<option value="${a}">${a}</option>`).join('');
      p2.style.display = ''; lb2.style.display = '';
    }
  }

  function onTipoChange(mapaCompetencias) {
    populatePeriodo(mapaCompetencias);
    const sel = document.getElementById('dash-andar');
    sel.innerHTML = [...Array(RateioLogic.ANDARES)].map((_, i) => `<option value="${i + 1}">${i + 1}º Andar</option>`).join('');
  }

  function getCompetenciasFiltradas(mapaCompetencias) {
    const tipo = document.getElementById('dash-tipo').value;
    const p1 = document.getElementById('dash-periodo').value;
    const p2 = document.getElementById('dash-periodo2').value;
    const chaves = Object.keys(mapaCompetencias).sort();

    if (tipo === 'mensal') return chaves.filter(k => k === p1);

    const anos = p2
      ? chaves.filter(k => { const y = k.split('-')[0]; return y >= p1 && y <= p2; }).map(k => k.split('-')[0])
      : [p1];
    const anoSet = new Set(anos.length ? anos : [p1]);
    return chaves.filter(k => anoSet.has(k.split('-')[0]));
  }

  function render(mapaCompetencias) {
    const detalhe = document.getElementById('dash-detalhe').value;
    document.getElementById('dash-andar').style.display = detalhe === 'andar' ? '' : 'none';

    const body = document.getElementById('dash-body');
    const comps = getCompetenciasFiltradas(mapaCompetencias);
    if (!comps.length) {
      body.innerHTML = '<div class="empty card">Nenhuma competência disponível para o período selecionado.</div>';
      return;
    }

    if (detalhe === 'geral') renderGeral(mapaCompetencias, comps, body);
    else if (detalhe === 'andar') renderAndar(mapaCompetencias, comps, body);
    else renderUnidade(mapaCompetencias, comps, body);
  }

  function renderGeral(mapaCompetencias, comps, body) {
    const tipo = document.getElementById('dash-tipo').value;
    let labels = [], consumo = [], valores = [], diff = [];

    if (tipo === 'mensal') {
      comps.forEach(cp => {
        const r = mapaCompetencias[cp]; if (!r) return;
        labels.push(Fmt.formatarCompetencia(cp));
        const somaC = Object.values(r.u).reduce((s, d) => s + d.c, 0);
        consumo.push(+somaC.toFixed(2));
        valores.push(+Object.values(r.u).reduce((s, d) => s + d.v, 0).toFixed(2));
        diff.push(+Math.max(0, r.t - somaC).toFixed(2));
      });
    } else {
      const porAno = {};
      comps.forEach(cp => {
        const y = cp.split('-')[0], r = mapaCompetencias[cp]; if (!r) return;
        if (!porAno[y]) porAno[y] = { c: 0, v: 0, t: 0 };
        porAno[y].c += Object.values(r.u).reduce((s, d) => s + d.c, 0);
        porAno[y].v += Object.values(r.u).reduce((s, d) => s + d.v, 0);
        porAno[y].t += r.t || 0;
      });
      Object.keys(porAno).sort().forEach(y => {
        labels.push(y);
        consumo.push(+porAno[y].c.toFixed(2));
        valores.push(+porAno[y].v.toFixed(2));
        diff.push(+Math.max(0, porAno[y].t - porAno[y].c).toFixed(2));
      });
    }

    body.innerHTML = `
      <div class="dash-row">
        <div class="chart-card"><div class="chart-title">Consumo identificado (m³)</div><canvas id="ch1" height="220"></canvas></div>
        <div class="chart-card"><div class="chart-title">Valor total rateado (R$)</div><canvas id="ch2" height="220"></canvas></div>
      </div>
      <div class="dash-row">
        <div class="chart-card"><div class="chart-title">Diferença não identificada (m³)</div><canvas id="ch3" height="220"></canvas></div>
        <div class="chart-card"><div class="chart-title">Consumo vs Diferença (m³)</div><canvas id="ch4" height="220"></canvas></div>
      </div>`;

    Charts.drawBarChart('ch1', labels, consumo, '#60a5fa', 'm³');
    Charts.drawBarChart('ch2', labels, valores, '#34d399', 'R$');
    Charts.drawBarChart('ch3', labels, diff, '#f87171', 'm³');
    Charts.drawStackedBarChart('ch4', labels, consumo, diff);
  }

  function renderAndar(mapaCompetencias, comps, body) {
    const andar = parseInt(document.getElementById('dash-andar').value);
    const unidadesAndar = RateioLogic.listarUnidadesDoAndar(andar);
    const tipo = document.getElementById('dash-tipo').value;

    const porUnidade = {}; unidadesAndar.forEach(u => { porUnidade[u] = 0; });
    comps.forEach(cp => {
      const r = mapaCompetencias[cp]; if (!r) return;
      unidadesAndar.forEach(u => { if (r.u[u]) porUnidade[u] += r.u[u].c || 0; });
    });
    const labels = unidadesAndar, data = unidadesAndar.map(u => +porUnidade[u].toFixed(2));

    const evolLabels = tipo === 'mensal' ? comps.map(Fmt.formatarCompetencia) : [...new Set(comps.map(c => c.split('-')[0]))];
    const evolData = unidadesAndar.map((u, i) => {
      if (tipo === 'mensal') {
        return { label: u, color: Charts.CORES_SERIES[i % Charts.CORES_SERIES.length],
          data: comps.map(cp => mapaCompetencias[cp] && mapaCompetencias[cp].u[u] ? +(mapaCompetencias[cp].u[u].c || 0).toFixed(2) : 0) };
      }
      const porAno = {};
      comps.forEach(cp => {
        const y = cp.split('-')[0];
        if (!porAno[y]) porAno[y] = 0;
        if (mapaCompetencias[cp] && mapaCompetencias[cp].u[u]) porAno[y] += mapaCompetencias[cp].u[u].c || 0;
      });
      return { label: u, color: Charts.CORES_SERIES[i % Charts.CORES_SERIES.length], data: evolLabels.map(y => +(porAno[y] || 0).toFixed(2)) };
    });

    body.innerHTML = `
      <div class="dash-row">
        <div class="chart-card"><div class="chart-title">Consumo por unidade — ${andar}º Andar (m³)</div><canvas id="ch-a1" height="240"></canvas></div>
        <div class="chart-card"><div class="chart-title">Ranking de consumo — ${andar}º Andar</div><div class="ranking-list" id="rank-andar"></div></div>
      </div>
      <div class="chart-card" style="margin-bottom:1rem;">
        <div class="chart-title">Evolução mensal — unidades do ${andar}º Andar (m³)</div>
        <canvas id="ch-a2" height="220"></canvas>
      </div>`;

    Charts.drawBarChart('ch-a1', labels, data, '#60a5fa', 'm³');
    Charts.drawMultiLineChart('ch-a2', evolLabels, evolData);

    const sorted = [...labels].sort((a, b) => porUnidade[b] - porUnidade[a]);
    const maxV = Math.max(...data, 0.01);
    document.getElementById('rank-andar').innerHTML = sorted.map((u, i) => {
      const v = porUnidade[u] || 0, pct = Math.round(v / maxV * 100);
      return `<div class="rank-item"><div class="rank-pos">${i + 1}</div><div class="rank-apt">${u}</div>
        <div class="rank-bar-wrap"><div class="rank-bar" style="width:${pct}%"></div></div>
        <div class="rank-val">${v.toFixed(2)} m³</div></div>`;
    }).join('');
  }

  function renderUnidade(mapaCompetencias, comps, body) {
    const porUnidade = {};
    RateioLogic.listarUnidades().forEach(u => { porUnidade[u] = 0; });
    comps.forEach(cp => {
      const r = mapaCompetencias[cp]; if (!r) return;
      RateioLogic.listarUnidades().forEach(u => { if (r.u[u]) porUnidade[u] += r.u[u].c || 0; });
    });

    const sorted = Object.keys(porUnidade).sort((a, b) => porUnidade[b] - porUnidade[a]);
    const top20 = sorted.slice(0, 20);
    const bot20 = sorted.slice(-20).reverse();
    const maxV = Math.max(...Object.values(porUnidade), 0.01);

    const porAndar = {};
    for (let a = 1; a <= RateioLogic.ANDARES; a++) {
      porAndar[a] = 0;
      RateioLogic.listarUnidadesDoAndar(a).forEach(u => { porAndar[a] += porUnidade[u] || 0; });
    }
    const andarLabels = [...Array(RateioLogic.ANDARES)].map((_, i) => `${i + 1}º`);
    const andarData = andarLabels.map((_, i) => +porAndar[i + 1].toFixed(2));

    body.innerHTML = `
      <div class="dash-row">
        <div class="chart-card"><div class="chart-title">Top 20 — maior consumo (m³)</div><div class="ranking-list" id="rank-top"></div></div>
        <div class="chart-card"><div class="chart-title">Top 20 — menor consumo (m³)</div><div class="ranking-list" id="rank-bot"></div></div>
      </div>
      <div class="chart-card" style="margin-bottom:1rem;">
        <div class="chart-title">Consumo agregado por andar (m³)</div>
        <canvas id="ch-u1" height="220"></canvas>
      </div>`;

    const mkRank = (elId, list) => {
      document.getElementById(elId).innerHTML = list.map((u, i) => {
        const v = porUnidade[u] || 0, pct = Math.round(v / maxV * 100);
        return `<div class="rank-item"><div class="rank-pos">${i + 1}</div><div class="rank-apt">${u}</div>
          <div class="rank-bar-wrap"><div class="rank-bar" style="width:${pct}%"></div></div>
          <div class="rank-val">${v.toFixed(2)} m³</div></div>`;
      }).join('');
    };
    mkRank('rank-top', top20); mkRank('rank-bot', bot20);
    Charts.drawBarChart('ch-u1', andarLabels, andarData, '#a78bfa', 'm³');
  }

  return { populatePeriodo, onTipoChange, render };
})();
