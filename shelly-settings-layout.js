/* Arrange the existing form nodes. A device keeps its association, validation and shortcuts. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const t2 = Boolean($('shelly-form'));
  const form = $('shelly-form') || $('shelly-setup-form');
  const server = $(t2 ? 'shelly-server' : 'cloud-server');
  const sections = {};
  function group(title, description = '') {
    const element = document.createElement('details');
    element.className = 'shelly-layout-section';
    const summary = document.createElement('summary');
    const text = document.createElement('span');
    const heading = document.createElement('strong');
    heading.textContent = title;
    text.append(heading);
    if (description) {
      const detail = document.createElement('small');
      detail.textContent = description;
      text.append(detail);
    }
    summary.append(text);
    element.append(summary);
    return element;
  }
  function move(group, ids) {
    for (const id of ids) {
      const element = $(id);
      if (element) group.append(element);
    }
  }
  function reveal(target) {
    if (!target) return;
    for (let element = target; element && element !== form; element = element.parentElement) {
      if (element.tagName === 'DETAILS' && !element.hidden) element.open = true;
    }
  }
  window.CasaShellyLayout = {reveal};

  const connection = group('Ligação à Shelly Cloud', 'Servidor e chave de acesso');
  const equipment = group('Equipamentos', 'Associações, IDs, canais e leitura');
  const diagnostic = group('Avisos e diagnóstico', 'Leituras, dispositivos offline e associações em falta');
  connection.id = 'shelly-layout-connection';
  equipment.id = 'shelly-layout-equipment';
  diagnostic.id = 'shelly-layout-diagnostic';
  for (const section of [connection, equipment, diagnostic]) section.setAttribute('name', 'shelly-layout-sections');
  equipment.open = true;
  const categories = {
    rooms: 'Divisões', media: 'Eletrodomésticos e multimédia',
    mobile: 'Equipamentos móveis', access: 'Garagem e acessos', energy: 'Contador geral'
  };
  for (const [key, title] of Object.entries(categories)) {
    const item = group(title);
    item.id = 'shelly-category-' + key;
    item.setAttribute('name', 'shelly-layout-categories');
    item.classList.add('shelly-layout-category');
    equipment.append(item);
    sections[key] = item;
  }

  const first = server.previousElementSibling;
  const last = t2 ? form.querySelector('.shelly-help') : $('cloud-remember').closest('label').nextElementSibling;
  const connectionNodes = [];
  for (let node = first; node; node = node.nextElementSibling) {
    connectionNodes.push(node);
    if (node === last) break;
  }
  form.insertBefore(connection, first);
  connection.append(...connectionNodes);
  connection.after(equipment, diagnostic);
  form.classList.add('shelly-layout');

  move(sections.mobile, ['shelly-heater-group', 'shelly-dehumidifier-group', 'shelly-christmas-tree-group']);
  if (t2) {
    const roomGroups = $('shelly-room-groups');
    sections.access.append(roomGroups.querySelector('[data-shelly-room="cellar"]'));
    sections.rooms.append(roomGroups);
    move(sections.media, ['shelly-kitchen-group', 'shelly-media-group', 'shelly-office-group']);
    move(sections.access, ['shelly-door-group', 'shelly-cellar-door-group', 'shelly-alarm-group', 'shelly-fan-group', 'shelly-ev-group']);
    move(sections.energy, ['shelly-energy-group']);
    move(diagnostic, ['shelly-missing-ids', 'shelly-refresh', 'shelly-data']);
    // Every submit already saves the whole form. Keep one visible save action.
    for (const button of equipment.querySelectorAll('button[type="submit"]')) {
      const actions = button.parentElement;
      button.remove();
      if (actions.matches('.shelly-actions') && !actions.children.length) actions.remove();
    }
    const dialog = $('shelly-dialog');
    $('shelly-title').textContent = 'Shelly Cloud e equipamentos';
    for (const element of dialog.querySelectorAll(':scope > .eyebrow, :scope > .popup-subtitle, :scope > .settings-explanation')) element.hidden = true;
  } else {
    const rooms = $('shelly-room-associations');
    const garage = rooms.querySelector('[data-setup-floor="-1"]');
    const deviceRooms = new Map();
    for (const field of rooms.querySelectorAll('[data-shelly-category="media"]')) {
      const parent = field.closest('.setup-room');
      if (!deviceRooms.has(parent)) {
        const room = group(parent.querySelector('summary').textContent);
        room.classList.add('shelly-layout-category');
        deviceRooms.set(parent, room);
        sections.media.append(room);
      }
      deviceRooms.get(parent).append(field);
    }
    window.addEventListener('roomnameschange', () => {
      for (const [room, media] of deviceRooms) media.querySelector('strong').textContent = room.querySelector('summary').textContent;
    });
    sections.access.append(garage);
    move(sections.access, ['shelly-fan-group']);
    move(sections.energy, ['shelly-energy-group']);
    sections.rooms.append(rooms);
    const refresh = document.createElement('button');
    refresh.className = 'secondary-action';
    refresh.type = 'button';
    refresh.textContent = 'Consultar dados dos equipamentos';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const labels = {ready: 'Disponível', offline: 'Offline', error: 'Erro', stale: 'Leitura antiga', pending: 'Por consultar', unavailable: 'Indisponível'};
    const readings = document.createElement('ul');
    const unassigned = document.createElement('p');
    function updateUnassigned() {
      const count = [...form.querySelectorAll('.shelly-disable-option input[type="checkbox"]')].filter(box => {
        const input = $(box.id.replace(/-disabled$/, ''));
        return !box.checked && input && !input.value.trim();
      }).length;
      unassigned.textContent = count === 1 ? '1 associação por preencher.' : count + ' associações por preencher.';
    }
    function updateReadings() {
      if (!diagnostic.open) return;
      updateUnassigned();
      const health = window.CasaCloudRead.healthSnapshot();
      const rows = health.map(device => {
        const row = document.createElement('li');
        row.textContent = device.id + ' · ' + (labels[device.status] || 'Indisponível');
        return row;
      });
      readings.replaceChildren(...rows);
      status.textContent = rows.length ? '' : 'Sem equipamentos ativos associados.';
      const cloud = window.CasaCloudRead;
      refresh.disabled = !rows.length || !cloud.snapshot().accountReady || window.CasaShellySetup.isDirty() || cloud.isBusy();
      if (rows.length && !cloud.snapshot().accountReady) status.textContent = 'Confirme a ligação à Shelly Cloud para consultar dados.';
    }
    refresh.addEventListener('click', async () => {
      refresh.disabled = true;
      try {
        await window.CasaCloudRead.refresh();
        updateReadings();
      } catch {
        updateReadings();
        status.textContent = 'Não foi possível consultar os equipamentos.';
      }
    });
    diagnostic.addEventListener('toggle', updateReadings);
    form.addEventListener('input', updateReadings);
    form.addEventListener('change', updateReadings);
    window.addEventListener('energychange', updateReadings);
    diagnostic.append(unassigned, refresh, status, readings);
  }

  const readingsDisabled = document.createElement('p');
  readingsDisabled.className = 'shelly-layout-disabled';
  diagnostic.querySelector('summary').after(readingsDisabled);
  function updateDisabled() {
    const count = form.querySelectorAll('.shelly-disable-option input:checked').length;
    readingsDisabled.textContent = count === 1 ? '1 leitura desativada · excluída dos avisos de Shelly em falta.' :
      count + ' leituras desativadas · excluídas dos avisos de Shelly em falta.';
  }
  diagnostic.addEventListener('toggle', updateDisabled);
  form.addEventListener('change', updateDisabled);
  updateDisabled();
})();
