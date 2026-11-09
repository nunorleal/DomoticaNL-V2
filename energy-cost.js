/* Shared energy tariff editor and consumption annotations. */
(function () {
  'use strict';
  const C = window.CasaEnergyCostCore;
  const D = window.CasaDailyEnergy;
  const euros = new Intl.NumberFormat('pt-PT', {style:'currency', currency:'EUR'});
  const quantity = new Intl.NumberFormat('pt-PT', {maximumFractionDigits:3});
  const rateFormat = new Intl.NumberFormat('pt-PT', {maximumFractionDigits:8});
  const load = () => {
    try { return C.validate(JSON.parse(localStorage.getItem(C.KEY))); }
    catch { return {schemaVersion:1, enabled:true, versions:[], globalTotals:[]}; }
  };
  let config = load();
  if (!config.dailyRates) {
    const previous = config.versions.slice().reverse().find(version => version.type === 'bi' && version.cycle === 'daily');
    const multiplier = previous?.discounted ? 1 : 1 - (previous?.discount ?? 0) / 100;
    config.dailyRates = previous ? {
      offPeak: previous.prices.offPeak * multiplier,
      peak: previous.prices.peak * multiplier,
    } : C.referenceRates;
  }
  const button = (text, className) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  function modal(title) {
    const el = document.createElement('dialog');
    el.className = 'energy-tariff-dialog popup';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const close = button('×', 'energy-tariff-close');
    close.setAttribute('aria-label','Fechar ' + title);
    close.addEventListener('click', () => el.close());
    el.setAttribute('aria-label', title);
    el.append(close, heading);
    document.body.append(el);
    return el;
  }
  const editor = modal('Energia e Tarifários');
  const detail = modal('Custo estimado de consumo');
  const detailBody = document.createElement('div');
  detail.append(detailBody);
  const panel = document.createElement('div');
  panel.innerHTML = `
    <label class="energy-check"><input type="checkbox" id="energy-show-euros"> Mostrar custo em euros nos Shelly</label>
    <form id="energy-daily-form">
      <h3>Bi-horário · ciclo diário</h3>
      <p class="energy-hint">Introduz os preços da energia com desconto e sem impostos.</p>
      <div class="energy-field-grid">
        <label>Vazio (€/kWh)
          <input id="energy-daily-offpeak" type="text" inputmode="decimal" maxlength="12" required>
        </label>
        <label>Fora de vazio (€/kWh)
          <input id="energy-daily-peak" type="text" inputmode="decimal" maxlength="12" required>
        </label>
      </div>
      <p class="energy-hint">Vazio das 22:00 às 08:00 e fora de vazio das 08:00 às 22:00, pela hora de Portugal continental.</p>
      <button type="submit" class="primary-action">Guardar preços</button>
    </form>
    <p id="energy-tariff-status" role="status"></p>`;
  editor.append(panel);
  const $ = id => editor.querySelector('#' + id);
  const status = text => { $('energy-tariff-status').textContent = text; };
  $('energy-daily-form').addEventListener('submit', event => {
    event.preventDefault();
    const offPeak = $('energy-daily-offpeak').value.trim();
    const peak = $('energy-daily-peak').value.trim();
    const validRate = /^\d{1,3}(?:[,.]\d{1,8})?$/;
    if (!validRate.test(offPeak) || !validRate.test(peak)) {
      status('Introduz os dois preços em €/kWh, por exemplo 0,08952.');
      return;
    }
    const rates = {offPeak:Number(offPeak.replace(',', '.')), peak:Number(peak.replace(',', '.'))};
    save({...config, dailyRates:rates}, 'Preços guardados.');
  });
  function save(next, message) {
    try {
      const valid = C.validate(next);
      localStorage.setItem(C.KEY, JSON.stringify(valid));
      config = valid;
      status(message);
      window.dispatchEvent(new Event('energycostchange'));
      return true;
    } catch (error) {
      status(error.message);
      return false;
    }
  }
  $('energy-show-euros').addEventListener('change', event => {
    if (!save({...config, enabled:event.target.checked}, 'Preferência guardada.')) event.target.checked = config.enabled;
  });
  const access = button('Energia e Tarifários','secondary-action energy-tariff-access');
  const settings = document.querySelector('#settings-dialog');
  settings?.append(access);
  access.addEventListener('click', () => {
    $('energy-show-euros').checked = config.enabled;
    const rates = config.dailyRates;
    $('energy-daily-offpeak').value = rateFormat.format(rates.offPeak);
    $('energy-daily-peak').value = rateFormat.format(rates.peak);
    status('');
    editor.showModal();
  });

  function cost(role,id,start,end) {
    const today = window.CasaDailyEnergyCore.day(Date.now());
    const rates = config.dailyRates;
    const days = D.timedHistory(role,id,start,end).days;
    const result = C.calculate({days,start,end,config:{dailyRates:rates},today});
    if (result.total !== null) return result;
    if (today < start || today > end || D.today(role,id).unavailable) return result;
    const watts = D.power(role,id) ?? (role === 'ev' && id === 'totalMeter' ? D.power('ev','meter') : null);
    if (watts === null) return result;
    return {quality:'estimated', total:watts / 1000 * C.dailyAverage(rates), hourly:true, watts, rates};
  }
  function formatCost(result) {
    return euros.format(result.total) + (result.hourly ? '/h' : '');
  }
  function showDetail(result) {
    detailBody.replaceChildren();
    if (result.total === null) {
      detailBody.textContent = result.reason;
    } else if (result.hourly) {
      detailBody.textContent = 'Ao ritmo atual de ' + quantity.format(result.watts) + ' W, o custo estimado é '
        + formatCost(result) + ', usando o preço médio de ' + rateFormat.format(C.dailyAverage(result.rates))
        + ' €/kWh. Só energia, sem IVA, IEC ou encargos fixos.';
    } else {
      const table = document.createElement('dl');
      const rates = result.dailyRates;
      const rows = [
        ['Vazio', quantity.format(result.kWh.offPeak) + ' kWh × ' + rateFormat.format(rates.offPeak) + ' €/kWh'],
        ['Fora de vazio', quantity.format(result.kWh.peak) + ' kWh × ' + rateFormat.format(rates.peak) + ' €/kWh'],
        ...(result.unknown ? [['Consumo sem hora', quantity.format(result.unknown) + ' kWh × ' + rateFormat.format(C.dailyAverage(rates)) + ' €/kWh']] : []),
        ['Custo estimado', formatCost(result)],
      ];
      for (const [key,value] of rows) {
        const dt = document.createElement('dt'), dd = document.createElement('dd');
        dt.textContent = key;
        dd.textContent = value;
        table.append(dt,dd);
      }
      const notes = document.createElement('p');
      notes.textContent = 'Só energia, sem IVA, IEC ou encargos fixos.'
        + (result.unknown ? ' O consumo sem hora usa o preço médio de 10 horas em vazio e 14 horas fora de vazio.' : '');
      detailBody.append(table,notes);
    }
    detail.showModal();
  }
  function paint(target,role,id,start,end) {
    target.hidden = !config.enabled;
    if (!config.enabled) return;
    const result = cost(role,id,start,end);
    target.hidden = result.total === null;
    if (target.hidden) return;
    const amount = formatCost(result);
    target.textContent = (result.quality === 'estimated' ? '≈ ' : '') + amount
      + (result.hourly ? ' ao ritmo atual' : '');
    target.setAttribute('aria-label','Custo estimado de consumo · ' + (result.reason || amount));
    target.title = result.reason || 'Ver detalhe do custo estimado';
    target.onclick = () => showDetail(result);
  }
  function display(node,role,id,start,end) {
    if (!node?.parentElement) return;
    const next = node.nextElementSibling;
    const anchor = next?.matches('small') && next.textContent.trim() === 'kWh' ? next : node;
    let target = anchor.nextElementSibling;
    if (!target?.classList.contains('energy-cost-value')) {
      target = button('—','energy-cost-value');
      anchor.after(target);
    }
    paint(target,role,id,start,end);
  }
  function today(node,role,id) {
    node.dataset.energyCostRole = role;
    node.dataset.energyCostId = id || '';
    const day = window.CasaDailyEnergyCore.day(Date.now());
    display(node,role,id,day,day);
  }
  window.addEventListener('energycostchange', () => {
    document.querySelectorAll('[data-energy-cost-role]').forEach(node => today(node,node.dataset.energyCostRole,node.dataset.energyCostId));
  });
  window.CasaEnergyCost = {today, display, snapshot:() => config};
})();
