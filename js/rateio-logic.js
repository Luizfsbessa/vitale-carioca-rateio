/* ============================================
   rateio-logic.js — regras de negócio puras
   (sem DOM, sem IndexedDB — só cálculo)
   Facilita testes e manutenção: qualquer mudança
   na fórmula do rateio acontece só aqui.
   ============================================ */

const ANDARES = 12;
const UNIDADES_POR_ANDAR = 8;
const TOTAL_UNIDADES = ANDARES * UNIDADES_POR_ANDAR; // 96

/**
 * Gera a lista de todas as 96 unidades (ex: "101".."1208").
 */
function listarUnidades() {
  const lista = [];
  for (let andar = 1; andar <= ANDARES; andar++) {
    for (let u = 1; u <= UNIDADES_POR_ANDAR; u++) {
      lista.push(String(andar * 100 + u));
    }
  }
  return lista;
}

/**
 * Retorna as unidades de um andar específico (1 a 12).
 */
function listarUnidadesDoAndar(andar) {
  const lista = [];
  for (let u = 1; u <= UNIDADES_POR_ANDAR; u++) lista.push(String(andar * 100 + u));
  return lista;
}

/**
 * Dado um mapa { cp: registro } e uma competência, encontra a
 * competência imediatamente anterior em ordem cronológica.
 * Esta é a regra central que resolve o problema de "leitura anterior":
 * a referência é sempre a competência salva mais recente ANTES da
 * competência em questão — não um valor solto por unidade.
 */
function competenciaAnterior(mapaCompetencias, cp) {
  if (!cp) return null;
  const todas = Object.keys(mapaCompetencias).sort();
  const idx = todas.indexOf(cp);
  if (idx > 0) return todas[idx - 1];
  if (idx === -1) {
    const anteriores = todas.filter(k => k < cp);
    return anteriores.length ? anteriores[anteriores.length - 1] : null;
  }
  return null;
}

/**
 * Leitura anterior (hidrômetro) de uma unidade, buscada na competência
 * de referência cronológica — não em um cache solto.
 */
function leituraAnterior(mapaCompetencias, cp, unidade) {
  const cpAnt = competenciaAnterior(mapaCompetencias, cp);
  if (!cpAnt) return null;
  const reg = mapaCompetencias[cpAnt];
  if (!reg || !reg.u || !reg.u[unidade]) return null;
  return reg.u[unidade].la > 0 ? reg.u[unidade].la : null;
}

/**
 * Consumo do período = leitura atual do hidrômetro - leitura anterior.
 * Se não há leitura anterior (primeira competência), o consumo é o
 * próprio valor lançado.
 */
function calcularConsumo(leituraAtual, leituraAnt) {
  if (isNaN(leituraAtual)) return 0;
  if (leituraAnt === null) return leituraAtual;
  return Math.max(0, leituraAtual - leituraAnt);
}

/**
 * Calcula o rateio da diferença: quando a soma das leituras individuais
 * é menor que a leitura geral da concessionária, o volume não
 * identificado é dividido igualmente entre as 96 unidades.
 *
 * @param {number} consumoTotalAguasRio - leitura geral (m³)
 * @param {number} valorFatura - valor total da fatura (R$)
 * @param {Object} leiturasPorUnidade - { unidade: consumoDoPeriodo }
 * @returns {{somaIdentificada:number, diferenca:number, rateioPorUnidade:number, valorPorM3:number}}
 */
function calcularRateio(consumoTotalAguasRio, valorFatura, leiturasPorUnidade) {
  const somaIdentificada = Object.values(leiturasPorUnidade).reduce((s, v) => s + v, 0);
  const diferenca = consumoTotalAguasRio > 0
    ? Math.max(0, consumoTotalAguasRio - somaIdentificada)
    : 0;
  const rateioPorUnidade = (diferenca > 0 && consumoTotalAguasRio > 0)
    ? diferenca / TOTAL_UNIDADES
    : 0;
  const valorPorM3 = consumoTotalAguasRio > 0 ? valorFatura / consumoTotalAguasRio : 0;

  return { somaIdentificada, diferenca, rateioPorUnidade, valorPorM3 };
}

/**
 * Valor final de uma unidade = (consumo individual + rateio da diferença) × valor por m³.
 * Retorna também a decomposição (valor individual vs. valor do rateio),
 * usado na aba Conferência para não confundir o usuário.
 */
function calcularValorUnidade(consumoIndividual, rateioPorUnidade, valorPorM3) {
  const valorIndividual = valorPorM3 * consumoIndividual;
  const valorRateio = valorPorM3 * rateioPorUnidade;
  return {
    valorIndividual,
    valorRateio,
    valorTotal: valorIndividual + valorRateio
  };
}

/**
 * Monta o registro completo de uma competência a partir dos valores
 * lançados em tela. Esta função é o "fechamento" da competência.
 *
 * @param {Object} params
 * @param {string} params.cp
 * @param {number} params.consumoTotal
 * @param {number} params.valorFatura
 * @param {Object} params.leiturasAtuais - { unidade: leituraAtualDigitada }
 * @param {Object} mapaCompetencias - todas as competências já salvas
 */
function montarRegistroCompetencia({ cp, consumoTotal, valorFatura, leiturasAtuais }, mapaCompetencias) {
  const unidades = listarUnidades();
  const cpAnt = competenciaAnterior(mapaCompetencias, cp);

  const consumos = {};
  unidades.forEach(u => {
    const atual = leiturasAtuais[u];
    if (atual === undefined || atual === null || isNaN(atual)) { consumos[u] = 0; return; }
    const ant = leituraAnterior(mapaCompetencias, cp, u);
    consumos[u] = calcularConsumo(atual, ant);
  });

  const { diferenca, rateioPorUnidade, valorPorM3 } = calcularRateio(consumoTotal, valorFatura, consumos);

  const u = {};
  unidades.forEach(unidade => {
    const la = leiturasAtuais[unidade] || 0;
    const ant = leituraAnterior(mapaCompetencias, cp, unidade) || 0;
    const consumo = consumos[unidade];
    const { valorTotal } = calcularValorUnidade(consumo, rateioPorUnidade, valorPorM3);
    u[unidade] = {
      p: ant,
      la,
      c: +consumo.toFixed(4),
      r: +rateioPorUnidade.toFixed(6),
      v: +valorTotal.toFixed(2)
    };
  });

  return {
    cp,
    t: consumoTotal,
    v: valorFatura,
    dpu: rateioPorUnidade,
    vpm3: valorPorM3,
    compAnterior: cpAnt || '',
    u
  };
}

/**
 * Valida se alguma leitura lançada é inferior à leitura anterior
 * (o que indicaria erro de digitação, já que o hidrômetro só acumula).
 * @returns {string[]} lista de unidades com problema
 */
function validarLeiturasMenoresQueAnterior(mapaCompetencias, cp, leiturasAtuais) {
  const invalidas = [];
  Object.keys(leiturasAtuais).forEach(unidade => {
    const atual = leiturasAtuais[unidade];
    if (atual === undefined || atual === null || isNaN(atual)) return;
    const ant = leituraAnterior(mapaCompetencias, cp, unidade);
    if (ant !== null && atual < ant) invalidas.push(unidade);
  });
  return invalidas;
}

window.RateioLogic = {
  ANDARES, UNIDADES_POR_ANDAR, TOTAL_UNIDADES,
  listarUnidades, listarUnidadesDoAndar,
  competenciaAnterior, leituraAnterior, calcularConsumo,
  calcularRateio, calcularValorUnidade,
  montarRegistroCompetencia, validarLeiturasMenoresQueAnterior
};
