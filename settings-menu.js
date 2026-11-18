/* Assemble the same menu in both houses, keeping the existing controls alive. */
(function () {
  'use strict';
  const dialog = document.getElementById('settings-dialog');
  const plant = document.getElementById('plant-display-settings');
  const shelly = document.getElementById('shelly-settings-group') || document.getElementById('shelly-setup');
  const energyActions = document.getElementById('energy-settings-actions');
  const backup = dialog.querySelector('.backup-settings');
  const screensaver = document.getElementById('screensaver-delay').closest('section');
  const glyphs = {
    meteo: '<path d="M7 3v2M3 7H1m10-4L9.6 4.4M3.4 3.4 4.8 4.8M9 8a3 3 0 1 0-4 3"/><path d="M8 20a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 19 13a3.5 3.5 0 0 1-.5 7Z"/>',
    energy: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
    backup: '<path d="M4 8v12h16V8M3 4h18v4H3zm6 8h6"/>'
  };
  function section(id, title, icon, ...content) {
    const group = document.createElement('details');
    group.id = id;
    group.className = 'settings-display';
    const summary = document.createElement('summary');
    summary.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + glyphs[icon] + '</svg>';
    const heading = document.createElement('span');
    heading.textContent = title;
    summary.append(heading);
    group.append(summary, ...content);
    return group;
  }
  const meteoContent = document.createElement('div');
  meteoContent.id = 'meteo-settings-content';
  const meteoStatus = document.createElement('p');
  meteoStatus.id = 'meteo-settings-load';
  meteoStatus.setAttribute('role', 'status');
  meteoStatus.textContent = 'A abrir as opções da MeteoNL…';
  const clockTimer = document.createElement('div');
  clockTimer.id = 'meteo-clock-timer';
  const timers = document.createElement('div');
  timers.className = 'meteo-timers';
  const screensaverLabel = screensaver.querySelector('label');
  screensaverLabel.textContent = 'Abrir MeteoNL após inatividade';
  const context = document.createElement('small');
  context.textContent = 'Quando estás na planta';
  screensaverLabel.append(context);
  screensaver.classList.add('meteo-screensaver-timer');
  timers.append(screensaver, clockTimer);
  const meteo = section('meteo-settings-group', 'MeteoNL', 'meteo', timers, meteoStatus, meteoContent);
  const energy = section('energy-settings-group', 'Energia e histórico', 'energy', energyActions);
  const backupHeading = backup.querySelector('h3');
  backupHeading.hidden = true;
  const backupGroup = section('backup-settings-group', 'Cópia de segurança', 'backup', backup);

  const environment = document.getElementById('environment-mode').closest('section');
  plant.querySelector('summary').after(environment);
  const groups = [plant, meteo, shelly, energy, backupGroup];
  const shellyEditor = document.getElementById('shelly-dialog');
  if (shellyEditor) {
    const editorBack = document.createElement('button');
    editorBack.type = 'button';
    editorBack.className = 'settings-back';
    editorBack.textContent = '‹ Voltar às Definições';
    editorBack.hidden = true;
    editorBack.addEventListener('click', () => shellyEditor.close());
    shellyEditor.querySelector('h2').before(editorBack);
    shellyEditor.addEventListener('close', () => {
      if (shellyEditor.open) return;
      editorBack.hidden = true;
      if (activeGroup === shelly) back();
    });
  }
  const list = document.createElement('div');
  list.className = 'settings-sections';
  list.append(...groups);
  const heading = document.getElementById('settings-title');
  const mainTitle = heading.textContent;
  const close = dialog.querySelector('#close-settings, [data-close="settings-dialog"]');
  const closeLabel = close.getAttribute('aria-label');
  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'settings-back';
  backButton.textContent = '‹ Voltar às Definições';
  backButton.hidden = true;
  heading.before(backButton);
  heading.after(list);
  const titles = new Map();
  let activeGroup = null;
  const descriptions = [
    'Ambiente, banners e elementos visíveis',
    'Protetor de ecrã, cidade, relógio e modo noturno',
    'Ligação, associações e estado dos equipamentos',
    'Tarifários, sincronização e emissor',
    'Exportar e importar ficheiros JSON'
  ];
  for (const [index, group] of groups.entries()) {
    group.setAttribute('name', 'house-settings-sections');
    const summary = group.querySelector('summary');
    const title = document.createElement('span');
    title.className = 'settings-section-title';
    const label = document.createElement('strong');
    const icon = summary.querySelector('svg');
    label.textContent = index === 2 ? 'Shelly Cloud e equipamentos' : summary.textContent.trim();
    titles.set(group, label.textContent);
    const description = document.createElement('small');
    description.textContent = descriptions[index];
    title.append(label, description);
    summary.replaceChildren(icon, title);
    summary.addEventListener('click', event => {
      event.preventDefault();
      openGroup(group);
    });
  }

  function showMain(focus = false) {
    const previous = activeGroup;
    activeGroup = null;
    dialog.classList.remove('settings-submenu-open');
    heading.textContent = mainTitle;
    backButton.hidden = true;
    close.setAttribute('aria-label', closeLabel);
    for (const group of groups) {
      group.hidden = false;
      group.open = false;
    }
    for (const subgroup of meteoContent.querySelectorAll('.meteo-preference-group[open]')) subgroup.open = false;
    dialog.scrollTop = 0;
    if (focus) previous?.querySelector('summary').focus({preventScroll: true});
  }

  function openGroup(group) {
    if (!dialog.open) dialog.showModal();
    if (activeGroup === meteo && group !== meteo) {
      for (const subgroup of meteoContent.querySelectorAll('.meteo-preference-group[open]')) subgroup.open = false;
    }
    activeGroup = group;
    for (const item of groups) {
      item.hidden = item !== group;
      item.open = item === group;
    }
    dialog.classList.add('settings-submenu-open');
    heading.textContent = titles.get(group);
    close.setAttribute('aria-label', 'Voltar ao menu principal');
    backButton.hidden = false;
    dialog.scrollTop = 0;
    backButton.focus({preventScroll: true});
    if (group === meteo) window.dispatchEvent(new Event('meteosettingsopen'));
    if (group === shelly && shellyEditor) {
      document.getElementById('open-shelly').click();
      const editorBack = shellyEditor.querySelector('.settings-back');
      editorBack.hidden = false;
      editorBack.focus({preventScroll: true});
    }
  }

  function back() {
    if (!activeGroup || !dialog.open) return false;
    showMain(true);
    return true;
  }

  backButton.addEventListener('click', back);
  dialog.addEventListener('cancel', event => {
    if (event.target === dialog && back()) event.preventDefault();
  });
  dialog.addEventListener('close', () => {
    if (!dialog.open) showMain();
  });
  window.CasaSettingsMenu = {
    back, showMain,
    openMeteo: () => openGroup(meteo),
    openPlant: () => openGroup(plant),
    openShelly: () => openGroup(shelly)
  };
})();
