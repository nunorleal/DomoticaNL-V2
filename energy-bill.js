/* Extract candidates from electricity invoice text. The original PDF stays in memory. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CasaEnergyBill = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const ascii = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const decimal = s => Number(s.replace(',', '.'));
  const dateISO = s => s.split(/[/-]/).reverse().join('-');
  function parse(text) {
    const fields = {};
    const ambiguous = [];
    function candidate(key, values) {
      const distinct = [...new Set(values)];
      if (distinct.length === 1) fields[key] = distinct[0];
      if (distinct.length > 1) ambiguous.push(key);
    }
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const normalized = lines.map(ascii);
    if (/\bedp comercial\b/i.test(text)) fields.supplier = 'EDP Comercial';
    candidate('name', lines.map(l => l.match(/^tarif[aá]rio\s*[:–-]\s*(.{1,100})$/i)?.[1]).filter(Boolean));
    candidate('power', normalized.flatMap(l => [...l.matchAll(/\b(\d+(?:[.,]\d+)?)\s*kva\b/g)].map(m => decimal(m[1]))));
    candidate('type', normalized.flatMap(l => {
      const m = l.match(/\b(bi[ -]?horari[ao]|tri[ -]?horari[ao]|tarifa simples)\b/);
      return m ? [m[1].startsWith('bi') ? 'bi' : m[1].startsWith('tri') ? 'tri' : 'simple'] : [];
    }));
    candidate('cycle', normalized.flatMap(l => {
      const m = l.match(/\bciclo\s+(diario|semanal)\b/);
      return m ? [m[1] === 'diario' ? 'daily' : 'weekly'] : [];
    }));
    const prices = line => [...line.matchAll(/\b(\d+[.,]\d+)\s*(?:€|eur)\s*\/\s*kwh\b/g)].map(m => decimal(m[1]));
    const isIEC = l => /\b(?:iec|imposto especial (?:de|sobre o) consumo)\b/.test(l);
    const chargeLines = normalized.filter(l => !isIEC(l) && /\b(?:energia|consumo|preco)\b/.test(l));
    candidate('offPeak', chargeLines.filter(l => /\bvazio\b/.test(l) && !/fora\s+(?:de\s+)?vazio/.test(l)).flatMap(prices));
    candidate('peak', chargeLines.filter(l => /fora\s+(?:de\s+)?vazio|\bponta\b/.test(l)).flatMap(prices));
    candidate('shoulder', chargeLines.filter(l => /\bcheias\b/.test(l)).flatMap(prices));
    candidate('flat', chargeLines.filter(l => /\bsimples\b/.test(l)).flatMap(prices));
    candidate('discount', normalized.flatMap(l => [...l.matchAll(/\bdesconto[^%\d]{0,45}(\d+(?:[.,]\d+)?)\s*%/g)].map(m => decimal(m[1]))));
    candidate('iec', normalized.filter(isIEC).flatMap(prices));
    candidate('iecVat', normalized.filter(isIEC).flatMap(l => [...l.matchAll(/\biva\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%/g)].map(m => decimal(m[1]))));
    candidate('priceStart', normalized.flatMap(l => [...l.matchAll(/\bprecos?\s+(?:em vigor|aplicaveis)\s+(?:desde|a partir de)\s+(\d{2}[/-]\d{2}[/-]\d{4})/g)].map(m => dateISO(m[1]))));
    candidate('start', normalized.flatMap(l => [...l.matchAll(/\binicio\s+(?:de vigencia|do contrato)\s*[:–-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/g)].map(m => dateISO(m[1]))));
    const vatCandidates = [...new Set(normalized.flatMap(l => [...l.matchAll(/\biva\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%/g)].map(m => decimal(m[1]))))].sort((a,b) => a-b);
    return {fields, ambiguous, vatCandidates};
  }
  async function read(file) {
    if (!file || file.size > 15 * 1024 * 1024) throw new Error('Escolhe uma fatura PDF até 15 MB.');
    const pdf = await import('./vendor/pdfjs/pdf.min.mjs');
    pdf.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
    const task = pdf.getDocument({
      data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false,
      useWasm: false, useSystemFonts: false, disableFontFace: true, enableXfa: false,
    });
    try {
      const doc = await task.promise;
      if (doc.numPages > 30) throw new Error('A fatura deve ter até 30 páginas.');
      const text = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const {items} = await page.getTextContent();
        let lastY = null;
        for (const item of items) {
          if (typeof item.str !== 'string') continue;
          const y = item.transform?.[5];
          if (lastY !== null && Math.abs(y - lastY) > 2) text.push('\n');
          text.push(item.str, item.hasEOL ? '\n' : ' ');
          lastY = item.hasEOL ? null : y;
        }
        text.push('\n');
        page.cleanup();
      }
      if (!text.join('').trim()) throw new Error('O PDF não tem texto selecionável.');
      return parse(text.join(''));
    } finally {
      await task.destroy();
    }
  }
  return {parse, read};
});
