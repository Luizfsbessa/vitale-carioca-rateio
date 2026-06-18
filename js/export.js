/* ============================================
   export.js — exportação CSV e backup completo
   (inclui fotos no backup, via IndexedDB)
   ============================================ */

const ExportUtils = (() => {

  function competenciaParaCSV(cp, reg) {
    let csv = 'Competencia;Unidade;Leit.ant(m3);Leit.atual(m3);Consumo(m3);RateioDiff(m3);Valor(R$)\n';
    Object.entries(reg.u).forEach(([u, d]) => {
      csv += `${Fmt.formatarCompetencia(cp)};${u};${d.p.toFixed(2)};${d.la.toFixed(2)};${d.c.toFixed(2)};${d.r.toFixed(4)};${d.v.toFixed(2)}\n`;
    });
    return csv;
  }

  function exportarCSVCompetencia(cp, reg) {
    const csv = competenciaParaCSV(cp, reg);
    Fmt.downloadFile(csv, 'text/csv', `rateio_${cp || 'sem-comp'}.csv`);
  }

  async function exportarBackupCompleto() {
    const backup = await RateioDB.exportFullBackup();
    Fmt.downloadFile(JSON.stringify(backup, null, 2), 'application/json',
      `backup_rateio_${new Date().toISOString().slice(0, 10)}.json`);
    return backup;
  }

  function lerArquivoComoTexto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      reader.readAsText(file);
    });
  }

  async function importarBackupCompleto(file) {
    const texto = await lerArquivoComoTexto(file);
    const backup = JSON.parse(texto);
    await RateioDB.importFullBackup(backup);
    return backup;
  }

  return { exportarCSVCompetencia, exportarBackupCompleto, importarBackupCompleto };
})();
