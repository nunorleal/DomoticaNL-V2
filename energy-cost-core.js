/* Electricity charges for observed energy. All dates and tariff slots use Lisbon time. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CasaEnergyCostCore = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const SLOT = 1800000;
  const DAY = 86400000;
  const KEY = 'casa-nl-electricity-tariffs-v1';
  const MAX_SLOTS = 48000;
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon', weekday: 'short', hour: '2-digit',
    minute: '2-digit', hourCycle: 'h23',
  });
  const dailySchedule = [[0,16,'offPeak'],[16,44,'peak'],[44,48,'offPeak']]
    .map(([from,to,band]) => ({season:'all',day:'all',from,to,band}));
  const dailyTariff = {type:'bi', schedule:dailySchedule};
  const referenceRates = Object.freeze({offPeak:0.08952, peak:0.1548});
  const bands = {simple: ['flat'], bi: ['offPeak', 'peak'], tri: ['offPeak', 'shoulder', 'peak']};
  const isNumber = (v, max) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  const dayNumber = date => Date.parse(date + 'T00:00:00Z') / DAY;
  const dayFromNumber = value => new Date(value * DAY).toISOString().slice(0, 10);
  const dateOK = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(dayNumber(date)) && dayFromNumber(dayNumber(date)) === date;
  const fail = message => { throw new Error(message); };
  function number(v, max, label) {
    if (!isNumber(v, max)) fail(label + ' inválido.');
    return v;
  }
  function date(v, label) {
    if (!dateOK(v)) fail(label + ' inválida.');
    return v;
  }
  function label(v) {
    if (typeof v !== 'string' || v.length > 100) fail('Nome inválido.');
    return v.trim();
  }
  function effective(t) {
    return t.start > t.priceStart ? t.start : t.priceStart;
  }
  function regimeAt(day, versions) {
    let chosen = null;
    for (const version of versions) {
      if (effective(version) <= day && (!chosen || effective(version) >= effective(chosen))) chosen = version;
    }
    return chosen && (!chosen.end || day <= chosen.end) ? chosen : null;
  }
  function schedule(input, type, cycle) {
    if (type === 'simple') return [];
    if (!Array.isArray(input) || input.length > 100) fail('Horários inválidos.');
    const rows = input.map(row => {
      const {season, day, from, to, band} = row;
      if (!['all', 'winter', 'summer'].includes(season) || !['all', 'weekday', 'sat', 'sun'].includes(day)
        || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > 48 || from >= to
        || !bands[type].includes(band)) fail('Cada horário deve usar intervalos de 30 minutos e um período válido.');
      if (cycle === 'daily' && day !== 'all') fail('O ciclo diário aplica os mesmos horários a todos os dias.');
      return {season, day, from, to, band};
    });
    for (const season of ['winter', 'summer']) for (const day of ['weekday', 'sat', 'sun']) {
      const matching = rows.filter(r => (r.season === 'all' || r.season === season) && (r.day === 'all' || r.day === day));
      for (let i = 0; i < 48; i++) {
        if (matching.filter(r => r.from <= i && i < r.to).length !== 1) fail('Os horários devem cobrir o dia inteiro sem lacunas nem sobreposições.');
      }
    }
    return rows;
  }
  function taxRule(rule) {
    const start = date(rule.start, 'Data inicial de IVA');
    const end = rule.end ? date(rule.end, 'Data final de IVA') : '';
    const normal = number(rule.normal, 100, 'IVA normal');
    const reduced = number(rule.reduced, normal, 'IVA reduzido');
    const limit = number(rule.limit, 1000000, 'Limite de IVA');
    if (end && end < start) fail('A data final de IVA precede a inicial.');
    if (!['day', 'month', 'fixed'].includes(rule.period)) fail('Periodicidade de IVA inválida.');
    const days = rule.period === 'fixed' ? number(rule.days, 366, 'Duração do período') : 1;
    if (!Number.isInteger(days) || days < 1) fail('A duração do período deve ser um número inteiro de dias.');
    return {start, end, normal, reduced, limit, period: rule.period, days};
  }
  function tariff(input) {
    const {type, cycle, discounted} = input;
    if (!bands[type] || !['daily', 'weekly', 'custom'].includes(cycle) || typeof discounted !== 'boolean') fail('Tipo de tarifário inválido.');
    const start = date(input.start, 'Data inicial do contrato');
    const priceStart = date(input.priceStart, 'Data inicial dos preços');
    const end = input.end ? date(input.end, 'Data final do tarifário') : '';
    if (end && end < effective({start, priceStart})) fail('A data final precede o início do tarifário.');
    const prices = Object.fromEntries(bands[type].map(b => [b, number(input.prices?.[b], 100, 'Preço ' + b)]));
    if (!Array.isArray(input.taxes) || !input.taxes.length || input.taxes.length > 30) fail('Confirma pelo menos uma regra de IVA.');
    const taxes = input.taxes.map(taxRule).sort((a,b) => a.start.localeCompare(b.start));
    if (new Set(taxes.map(r => r.start)).size !== taxes.length) fail('As regras de IVA devem ter datas iniciais distintas.');
    if (typeof input.iec?.enabled !== 'boolean') fail('Configuração do IEC inválida.');
    return {
      id: label(input.id), supplier: label(input.supplier), name: label(input.name),
      power: number(input.power, 1000, 'Potência contratada'), type, cycle, start, priceStart, end,
      prices, discount: number(input.discount, 100, 'Desconto'), discounted,
      schedule: schedule(input.schedule, type, cycle), taxes,
      iec: {enabled: input.iec.enabled, price: number(input.iec.price, 100, 'Valor de IEC'),
        vat: number(input.iec.vat, 100, 'IVA do IEC')},
    };
  }
  function validate(input) {
    if (input?.schemaVersion !== 1 || typeof input.enabled !== 'boolean'
      || !Array.isArray(input.versions) || input.versions.length > 100
      || !Array.isArray(input.globalTotals) || input.globalTotals.length > 500) fail('Definições de energia inválidas.');
    const versions = input.versions.map(tariff);
    if (new Set(versions.map(t => t.id)).size !== versions.length || versions.some(t => !t.id)) fail('Versões de tarifário inválidas.');
    const globalTotals = input.globalTotals.map(r => ({
      start: date(r.start, 'Início do consumo global'), end: date(r.end, 'Fim do consumo global'),
      kWh: number(r.kWh, 10000000, 'Consumo global'),
    }));
    if (globalTotals.some(r => r.end < r.start)
      || new Set(globalTotals.map(r => r.start + '/' + r.end)).size !== globalTotals.length) fail('Intervalos globais inválidos ou repetidos.');
    const result = {schemaVersion: 1, enabled: input.enabled, versions, globalTotals};
    if (input.averageRate !== undefined) result.averageRate = number(input.averageRate, 100, 'Preço médio');
    if (input.dailyRates !== undefined) {
      result.dailyRates = {
        offPeak: number(input.dailyRates?.offPeak, 100, 'Preço em vazio'),
        peak: number(input.dailyRates?.peak, 100, 'Preço fora de vazio'),
      };
    }
    return result;
  }

  function localBand(tariff, slot) {
    if (tariff.type === 'simple') return 'flat';
    const timestamp = new Date(slot * SLOT);
    const parts = Object.fromEntries(clock.formatToParts(timestamp).map(p => [p.type, p.value]));
    const season = Number(parts.hour) === timestamp.getUTCHours() ? 'winter' : 'summer';
    const day = parts.weekday === 'Sat' ? 'sat' : parts.weekday === 'Sun' ? 'sun' : 'weekday';
    const index = Number(parts.hour) * 2 + Math.floor(Number(parts.minute) / 30);
    return tariff.schedule.find(r => (r.season === 'all' || r.season === season)
      && (r.day === 'all' || r.day === day) && index >= r.from && index < r.to)?.band;
  }
  function taxPeriod(day, rule) {
    if (rule.period === 'day') return {start: day, end: day};
    if (rule.period === 'month') {
      const [y,m] = day.split('-').map(Number);
      return {start: day.slice(0, 7) + '-01', end: new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)};
    }
    const origin = dayNumber(rule.start);
    const first = origin + Math.floor((dayNumber(day) - origin) / rule.days) * rule.days;
    return {start: dayFromNumber(first), end: dayFromNumber(first + rule.days - 1)};
  }
  function totalFor(period, records, globalDays) {
    const confirmed = records.find(r => r.start === period.start && r.end === period.end);
    if (confirmed) return confirmed.kWh;
    let total = 0;
    for (let n = dayNumber(period.start); n <= dayNumber(period.end); n++) {
      const row = globalDays?.[dayFromNumber(n)];
      if (!row?.observed || row.partial) return null;
      total += row.kWh;
    }
    return total;
  }
  function dailyAverage(rates) {
    return dailySchedule.reduce((sum, {from,to,band}) => sum + (to - from) * rates[band], 0) / 48;
  }

  function dailyEstimate(observed, rates, partial) {
    const kWh = {offPeak:0, peak:0};
    let unknown = 0;
    const bandBySlot = new Map();
    for (const [, row] of observed) {
      let allocated = 0;
      for (const [slot, value] of Object.entries(row.slots || {})) {
        if (!bandBySlot.has(slot)) bandBySlot.set(slot, localBand(dailyTariff, Number(slot)));
        kWh[bandBySlot.get(slot)] += value;
        allocated += value;
      }
      const missing = row.kWh - allocated;
      if (missing > Math.max(1e-9, row.kWh * 1e-9)) unknown += missing;
      partial ||= row.partial;
    }
    const knownCost = kWh.offPeak * rates.offPeak + kWh.peak * rates.peak;
    return {
      quality:'estimated', dailyRates:rates, kWh, unknown, partial,
      total:knownCost + unknown * dailyAverage(rates),
    };
  }

  function calculate({days, start, end, config, globalDays, today}) {
    const unavailable = reason => ({quality: 'unavailable', reason, total: null});
    if (!days || !dateOK(start) || !dateOK(end) || end < start) return unavailable('Sem consumo registado.');
    const observed = Object.entries(days).filter(([d,r]) => d >= start && d <= end && r.observed);
    if (!observed.length) return unavailable('Sem consumo registado neste período.');
    const expectedEnd = today && today < end ? today : end;
    let partial = observed.length < dayNumber(expectedEnd) - dayNumber(start) + 1;
    if (config.dailyRates) return dailyEstimate(observed, config.dailyRates, partial);
    if (config.averageRate !== undefined) {
      const kWh = observed.reduce((sum, [, row]) => sum + row.kWh, 0);
      return {
        quality: 'estimated', averageRate: config.averageRate, kWh,
        total: kWh * config.averageRate,
        partial: partial || observed.some(([, row]) => row.partial),
      };
    }
    let estimated = false, conservative = false;
    const result = {kWh: {flat:0, offPeak:0, shoulder:0, peak:0}, energy:0, discount:0, vat:0, iec:0, total:0};
    const priceLookup = new Map();
    const fiscalTotals = new Map();
    for (const [day,row] of observed) {
      const t = regimeAt(day, config.versions);
      let rule;
      for (const candidate of t?.taxes || []) {
        if (candidate.start <= day) rule = candidate;
      }
      if (!t || !rule || (rule.end && day > rule.end)) return unavailable('Falta um tarifário ou uma regra de IVA confirmada para ' + day + '.');
      partial ||= row.partial;
      const quantities = {};
      if (t.type === 'simple') quantities.flat = row.kWh;
      else {
        let allocated = 0;
        for (const [slot,value] of Object.entries(row.slots || {})) {
          const key = t.id + '/' + slot;
          if (!priceLookup.has(key)) priceLookup.set(key, localBand(t, Number(slot)));
          const band = priceLookup.get(key);
          if (!band) return unavailable('Horário tarifário por configurar.');
          quantities[band] = (quantities[band] || 0) + value;
          allocated += value;
        }
        if (Math.abs(allocated - row.kWh) > Math.max(1e-9, row.kWh * 1e-9)) return unavailable('Parte do consumo registado não tem horário conhecido.');
        estimated ||= Boolean(row.split);
      }
      let share = 0;
      if (row.kWh > 0 && rule.limit > 0 && rule.reduced < rule.normal) {
        const period = taxPeriod(day, rule), key = period.start + '/' + period.end;
        if (!fiscalTotals.has(key)) fiscalTotals.set(key, totalFor(period, config.globalTotals, globalDays));
        const global = fiscalTotals.get(key);
        if (global > 0 && global >= row.kWh) {
          share = Math.min(1, rule.limit / global);
          estimated = true;
        } else {
          conservative = true;
        }
      }
      for (const [band,kWh] of Object.entries(quantities)) {
        const price = t.prices[band];
        const net = t.discounted ? price : price * (1 - t.discount / 100);
        const energy = kWh * net;
        result.kWh[band] += kWh;
        result.energy += energy;
        result.discount += kWh * (t.discounted ? (t.discount < 100 ? price / (1 - t.discount / 100) - price : 0) : price - net);
        result.vat += energy * (rule.normal * (1 - share) + rule.reduced * share) / 100;
        if (t.iec.enabled) {
          const iec = kWh * t.iec.price;
          result.iec += iec;
          result.vat += iec * t.iec.vat / 100;
        }
      }
    }
    result.total = result.energy + result.iec + result.vat;
    return {...result, partial, conservative, quality: partial || estimated || conservative ? 'estimated' : 'measured'};
  }

  // The source readings stay unrounded. Small boundary intervals are split by elapsed time.
  function addSlots(row, from, to, delta) {
    if (!delta) return 0;
    const first = Math.floor(from / SLOT), last = Math.ceil(to / SLOT) - 1;
    if (first !== last && to - from > 300000) return 0;
    const slots = row.slots ||= {};
    const firstEnergy = first === last ? delta : delta * ((first + 1) * SLOT - from) / (to - from);
    let added = Number(!Object.hasOwn(slots, first));
    slots[first] = (slots[first] || 0) + firstEnergy;
    if (first !== last) {
      added += Number(!Object.hasOwn(slots, last));
      slots[last] = (slots[last] || 0) + delta - firstEnergy;
      row.split = true;
    }
    return added;
  }

  function defaultDraft() {
    return {
      id:'', supplier:'EDP Comercial', name:'Bi-horário · ciclo diário', power:6.9, type:'bi',
      cycle:'daily', start:'2026-09-09', priceStart:'2026-09-09', end:'2027-03-31',
      prices:{...referenceRates}, discount:20, discounted:true,
      schedule:dailySchedule.map(row => ({...row})),
      taxes:[], iec:{enabled:true,price:0.001,vat:null},
    };
  }

  return {KEY, SLOT, MAX_SLOTS, bands, referenceRates, dailyAverage, validate, tariff, calculate, addSlots, defaultDraft, localBand, taxPeriod};
});
