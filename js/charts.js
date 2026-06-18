/* ============================================
   charts.js — desenho de gráficos em <canvas>
   Sem dependências externas (Chart.js, etc.)
   ============================================ */

const CORES_SERIES = ['#60a5fa','#34d399','#f87171','#fbbf24','#a78bfa','#38bdf8','#fb923c','#4ade80','#e879f9','#f472b6','#2dd4bf','#facc15'];

function niceStep(max) {
  const raw = max / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

function roundRect(ctx, x, y, w, h, r) {
  if (h <= 0) return;
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function setupCanvas(canvas) {
  canvas.width = canvas.offsetWidth || 600;
  canvas.height = parseInt(canvas.getAttribute('height')) || 220;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

/**
 * Gráfico de barras simples.
 */
function drawBarChart(canvasId, labels, data, color, unit) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = setupCanvas(canvas);
  const W = canvas.width, H = canvas.height;
  const pad = { l: 52, r: 16, t: 14, b: 36 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const max = Math.max(...data, 1);
  const step = niceStep(max);
  const yMax = Math.ceil(max / step) * step;
  const n = data.length;
  const bw = Math.max(4, Math.min(40, cw / n * 0.6));
  const gap = cw / n;

  for (let y = 0; y <= yMax; y += step) {
    const yy = pad.t + ch * (1 - y / yMax);
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(pad.l + cw, yy); ctx.stroke();
    ctx.fillStyle = '#999'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(unit === 'R$' ? Fmt.formatarBRL(y) : y, pad.l - 4, yy + 3.5);
  }

  data.forEach((v, i) => {
    const x = pad.l + i * gap + (gap - bw) / 2;
    const barH = ch * v / yMax;
    const y = pad.t + ch - barH;
    ctx.fillStyle = color;
    roundRect(ctx, x, y, bw, barH, 3); ctx.fill();
    if (v > 0) {
      ctx.fillStyle = '#333'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(unit === 'R$' ? Fmt.formatarBRL(v) : v, x + bw / 2, y - 4);
    }
    const lbl = labels[i];
    const maxChars = Math.floor(gap / 6.5 + 1);
    const shortLbl = lbl.length > maxChars ? lbl.slice(0, maxChars) + '…' : lbl;
    ctx.fillStyle = '#666'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(shortLbl, x + bw / 2, pad.t + ch + 16);
  });
}

/**
 * Gráfico de barras empilhadas (usado para Consumo vs Diferença).
 */
function drawStackedBarChart(canvasId, labels, data1, data2) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = setupCanvas(canvas);
  const W = canvas.width, H = canvas.height;
  const pad = { l: 52, r: 80, t: 14, b: 36 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const maxV = Math.max(...data1.map((v, i) => v + data2[i]), 1);
  const step = niceStep(maxV);
  const yMax = Math.ceil(maxV / step) * step;
  const n = labels.length;
  const bw = Math.max(4, Math.min(40, cw / n * 0.6));
  const gap = cw / n;

  for (let y = 0; y <= yMax; y += step) {
    const yy = pad.t + ch * (1 - y / yMax);
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(pad.l + cw, yy); ctx.stroke();
    ctx.fillStyle = '#999'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(y, pad.l - 4, yy + 3.5);
  }

  data1.forEach((v1, i) => {
    const v2 = data2[i];
    const x = pad.l + i * gap + (gap - bw) / 2;
    const h1 = ch * v1 / yMax, h2 = ch * v2 / yMax;
    ctx.fillStyle = '#60a5fa'; roundRect(ctx, x, pad.t + ch - h1, bw, h1, 3); ctx.fill();
    if (h2 > 0) { ctx.fillStyle = '#f87171'; roundRect(ctx, x, pad.t + ch - h1 - h2, bw, h2, 3); ctx.fill(); }
    ctx.fillStyle = '#666'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + bw / 2, pad.t + ch + 16);
  });

  const lx = W - pad.r + 8, ly = pad.t + 14;
  [[' Cons.', '#60a5fa'], [' Diff.', '#f87171']].forEach(([l, c], i) => {
    ctx.fillStyle = c; ctx.fillRect(lx, ly + i * 18, 10, 10);
    ctx.fillStyle = '#444'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(l, lx + 13, ly + i * 18 + 9);
  });
}

/**
 * Gráfico de múltiplas linhas (evolução de várias unidades ao longo do tempo).
 * @param {Array<{label:string,color:string,data:number[]}>} series
 */
function drawMultiLineChart(canvasId, labels, series) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = setupCanvas(canvas);
  const W = canvas.width, H = canvas.height;
  const pad = { l: 52, r: 16, t: 14, b: 36 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const allV = series.flatMap(s => s.data);
  const max = Math.max(...allV, 1);
  const step = niceStep(max);
  const yMax = Math.ceil(max / step) * step;
  const n = labels.length;
  const gap = n > 1 ? cw / (n - 1) : cw;

  for (let y = 0; y <= yMax; y += step) {
    const yy = pad.t + ch * (1 - y / yMax);
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(pad.l + cw, yy); ctx.stroke();
    ctx.fillStyle = '#999'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(y, pad.l - 4, yy + 3.5);
  }

  series.forEach(s => {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath();
    s.data.forEach((v, i) => {
      const x = pad.l + (n > 1 ? i * gap : cw / 2);
      const y = pad.t + ch * (1 - v / yMax);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    s.data.forEach((v, i) => {
      const x = pad.l + (n > 1 ? i * gap : cw / 2);
      const y = pad.t + ch * (1 - v / yMax);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.stroke();
    });
  });

  labels.forEach((lbl, i) => {
    const x = pad.l + (n > 1 ? i * gap : cw / 2);
    ctx.fillStyle = '#666'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(lbl, x, pad.t + ch + 16);
  });
}

window.Charts = { drawBarChart, drawStackedBarChart, drawMultiLineChart, CORES_SERIES };
