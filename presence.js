(function () {
  'use strict';

  const ABSENCE_DELAY = 5 * 60_000;
  const MAX_AGE = 3 * 60_000;
  const POLL_INTERVAL = 60_000;
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5 20v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/></svg>';
  const states = {home: ['Em casa', '✓'], away: ['Fora do Wi-Fi', '−'], unknown: ['Por confirmar', '?']};
  const defaults = ['Eu', 'Esposa', 'Filho'];
  const mac = value => /^(?:[a-f\d]{2}[:-]){5}[a-f\d]{2}$/i.test(value || '') ? value.toLowerCase().replaceAll('-', ':') : '';
  const ipv4 = value => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) && value.split('.').every(part => +part <= 255);

  async function unifi(key, path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const reply = await fetch('https://api.ui.com/v1/' + path, {
        headers: {'X-API-Key': key}, credentials: 'omit', redirect: 'error', signal: controller.signal
      });
      if (!reply.ok) throw new Error('O UniFi devolveu HTTP ' + reply.status + '.');
      const page = await reply.json();
      if (!Array.isArray(page.data)) throw new Error('Resposta do UniFi inesperada.');
      return page;
    } finally {
      clearTimeout(timeout);
    }
  }

  const network = host => 'connector/consoles/' + encodeURIComponent(host) + '/proxy/network/integration/v1/';

  async function connectedPhones(config) {
    const path = network(config.host) + 'sites/' + encodeURIComponent(config.site) + '/clients';
    const result = [];
    for (let offset = 0; offset < 2000;) {
      const {data, totalCount} = await unifi(config.key, path + '?limit=200&offset=' + offset);
      if (!Number.isSafeInteger(totalCount) || totalCount < 0) throw new Error('Lista UniFi incompleta.');
      result.push(...data.filter(device => device.type === 'WIRELESS'));
      offset += data.length;
      if (offset >= totalCount) return result;
      if (!data.length) break;
    }
    throw new Error('Lista UniFi incompleta.');
  }

  function mount(house) {
    const group = document.querySelector('#plant-display-settings .display-settings');
    const header = document.querySelector('.topbar');
    const information = header?.querySelector('.header-information');
    if (!group || !information) return;
    const t2 = house === 't2';
    const prefix = 'presence-unifi:' + house + ':';
    const storage = {
      read(key) {
        try { return JSON.parse(localStorage.getItem(prefix + key)); } catch { return null; }
      },
      write(key, value) { localStorage.setItem(prefix + key, JSON.stringify(value)); }
    };
    const layoutDefault = {shown: false, x: null, y: null};
    let layout = layoutDefault;
    let snapshot, account, selected, savedLayout, lastPoll = 0, syncing = false, syncQueued = false;
    let absentSince = [], lastSuccess = 0, settingsGeneration = 0;
    let isEmitter = () => false;
    let removed = false;

    const preference = document.createElement(t2 ? 'button' : 'label');
    const preferenceLabel = 'Mostrar presenças no cabeçalho';
    if (t2) {
      preference.type = 'button';
      preference.className = 'settings-row';
      preference.setAttribute('role', 'checkbox');
      preference.innerHTML = '<span>' + ICON + '</span>' + preferenceLabel;
      preference.append(group.querySelector('.row-check').cloneNode(true));
    } else {
      preference.className = 'check-row';
      preference.innerHTML = ICON.replace('<svg ', '<svg class="setting-check-icon" ') +
        '<span>' + preferenceLabel + '</span><input type="checkbox">';
    }
    const checkbox = preference.querySelector('input');
    const settings = document.createElement('details');
    settings.className = 'presence-settings';
    settings.innerHTML = `
      <summary>Configurar presenças · UniFi</summary>
      <form autocomplete="off">
        <p class="presence-setup"></p>
        <fieldset hidden>
          <label>Chave de API do UniFi Site Manager<input name="apiKey" type="password" autocomplete="off" spellcheck="false"></label>
          <button type="button" class="secondary-action" data-discover>Consultar consolas</button>
          <label>Consola<select name="host" required></select></label>
          <label>Site<select name="site" required></select></label>
          <div class="presence-phones"></div>
          <button type="submit" class="primary-action">Guardar presenças</button>
          <button type="button" class="secondary-action" data-remove>Retirar configuração deste dispositivo</button>
        </fieldset>
        <p role="status" class="presence-feedback"></p>
      </form>`;
    const size = group.querySelector('.sensor-size-setting, #room-power-size')?.closest('.sensor-size-setting, section');
    group.insertBefore(preference, size?.parentElement === group ? size : null);
    const avatarName = index => {
      const person = snapshot?.people?.[index];
      return typeof person?.name === 'string' && person.name ? person.name : defaults[index];
    };
    const photos = window.CasaPresencePhotos?.mount({
      group, house, names: defaults, name: avatarName, icon: ICON, storage, render
    });
    group.append(settings);
    const form = settings.querySelector('form');
    const fields = form.querySelector('fieldset');
    const inputs = form.elements;
    const message = form.querySelector('.presence-feedback');
    const discover = form.querySelector('[data-discover]');
    const remove = form.querySelector('[data-remove]');
    const setup = form.querySelector('.presence-setup');
    const phones = defaults.map((name, index) => {
      const row = document.createElement('div');
      row.className = 'presence-phone';
      row.innerHTML = `<label>Nome <input type="text" maxlength="32" placeholder="${name}"></label>
        <label>IP ou MAC <input type="text" placeholder="192.168.0.${10 + index}" spellcheck="false" autocapitalize="none"></label>`;
      form.querySelector('.presence-phones').append(row);
      return Array.from(row.querySelectorAll('input'));
    });

    const bar = document.createElement('div');
    bar.className = 'presence-bar';
    bar.hidden = true;
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Presenças em casa');
    bar.innerHTML = '<output class="presence-caption" hidden></output>';
    header.insertBefore(bar, information);
    const caption = bar.querySelector('output');
    const avatars = defaults.map((_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'presence-person';
      button.title = 'Toque para ver o nome e o estado da pessoa.';
      button.innerHTML = '<span class="presence-portrait">' + ICON +
        '<img alt="" hidden></span><span class="presence-state" aria-hidden="true"></span>';
      button.addEventListener('click', () => {
        selected = selected === index ? undefined : index;
        render();
      });
      bar.insertBefore(button, caption);
      return button;
    });

    function render() {
      if (checkbox) checkbox.checked = layout.shown;
      else preference.setAttribute('aria-checked', String(layout.shown));
      bar.hidden = !layout.shown;
      const age = Date.now() - Number(snapshot?.checkedAt);
      const fresh = age >= -30_000 && age <= MAX_AGE;
      avatars.forEach((avatar, index) => {
        const person = snapshot?.people?.[index];
        const state = fresh && Object.hasOwn(states, person?.state) ? person.state : 'unknown';
        avatar.hidden = state !== 'home';
        if (avatar.hidden && selected === index) selected = undefined;
        const label = avatarName(index) + ' · ' + states[state][0];
        photos?.setImage(avatar, photos.current(index));
        avatar.dataset.state = state;
        avatar.setAttribute('aria-label', label);
        avatar.setAttribute('aria-pressed', String(selected === index));
        avatar.lastElementChild.textContent = states[state][1];
        if (selected === index) caption.textContent = label;
      });
      bar.hidden ||= avatars.every(avatar => avatar.hidden);
      header.classList.toggle('has-presences', !bar.hidden);
      document.body.classList.toggle('has-header-presences', !bar.hidden);
      photos?.paint();
      caption.hidden = selected === undefined;
    }

    function updateLayout(next) {
      layout = next;
      if (account) {
        savedLayout = next;
        try { storage.write(account.user + ':pending', next); } catch {}
      }
      try { storage.write((account?.user || 'local') + ':layout', next); } catch {}
      render();
      void sync();
    }

    preference.addEventListener(t2 ? 'click' : 'change', () => {
      updateLayout({...layout, shown: checkbox?.checked ?? !layout.shown});
    });
    const configKey = current => current.user + ':config';
    const config = () => account && storage.read(configKey(account));
    window.CasaPresence.backupConfig = () => config() || storage.read('restored-config');
    window.CasaPresence.backupStorageKey = () => prefix + (account ? configKey(account) : 'restored-config');
    const option = (select, value, name) => select.add(new Option(name, value));
    function populate() {
      const saved = config();
      const editable = !!account && isEmitter();
      fields.hidden = !editable;
      fields.disabled = !editable;
      setup.textContent = editable
        ? 'A chave e os endereços ficam neste dispositivo. Pode começar com o IP que aparece no UniFi.'
        : 'Configure os telefones no iPad com sessão iniciada e a opção de emissor ativa.';
      inputs.apiKey.value = '';
      inputs.apiKey.placeholder = saved?.key ? 'Chave guardada neste dispositivo' : 'Cole a chave da API';
      inputs.host.replaceChildren();
      inputs.site.replaceChildren();
      if (saved?.host) option(inputs.host, saved.host, saved.hostName);
      if (saved?.site) option(inputs.site, saved.site, saved.siteName);
      phones.forEach(([name, address], index) => {
        name.value = saved?.people?.[index]?.name || defaults[index];
        address.value = saved?.people?.[index]?.address || '';
      });
      remove.hidden = !saved;
      message.textContent = '';
    }

    function key() { return inputs.apiKey.value.trim() || config()?.key; }

    async function discoverWith(load) {
      if (!account || !isEmitter()) return;
      const current = account;
      const generation = ++settingsGeneration;
      const valid = () => current === account && generation === settingsGeneration && isEmitter();
      if (!key()) { discover.disabled = inputs.host.disabled = inputs.site.disabled = false; message.textContent = 'Introduza a chave de API.'; return; }
      discover.disabled = true;
      inputs.host.disabled = true;
      inputs.site.disabled = true;
      message.textContent = 'A consultar o UniFi…';
      try {
        await load(key(), valid);
        if (valid()) message.textContent = inputs.site.value ? 'Escolha a consola e o site da casa.' : 'A consola não devolveu sites.';
      } catch (error) {
        if (valid()) message.textContent = error.message?.startsWith('O UniFi devolveu') ? error.message : 'Não foi possível consultar o UniFi.';
      } finally {
        if (generation === settingsGeneration) discover.disabled = inputs.host.disabled = inputs.site.disabled = false;
      }
    }

    async function sites(apiKey, valid) {
      inputs.site.replaceChildren();
      if (!inputs.host.value) return;
      const {data} = await unifi(apiKey, network(inputs.host.value) + 'sites?limit=200');
      if (!valid()) return;
      for (const site of data) {
        if (site?.id) option(inputs.site, site.id, site.name || 'Site');
      }
      const saved = config();
      if (saved?.host === inputs.host.value && [...inputs.site.options].some(entry => entry.value === saved.site)) inputs.site.value = saved.site;
    }

    discover.addEventListener('click', () => discoverWith(async (apiKey, valid) => {
      const {data} = await unifi(apiKey, 'hosts');
      if (!valid()) return;
      inputs.host.replaceChildren();
      for (const host of data) {
        if (host?.id) option(inputs.host, host.id, host.reportedState?.hostname || host.name || host.id);
      }
      const saved = config();
      if ([...inputs.host.options].some(entry => entry.value === saved?.host)) inputs.host.value = saved.host;
      await sites(apiKey, valid);
    }));
    inputs.host.addEventListener('change', () => discoverWith(sites));

    function resetPoll() {
      lastPoll = lastSuccess = 0;
      absentSince = [];
      snapshot = undefined;
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!account || !isEmitter()) return;
      const apiKey = key();
      if (!apiKey || !inputs.host.value || !inputs.site.value) {
        message.textContent = 'Introduza a chave e selecione a consola e o site.';
        return;
      }
      const existing = config();
      const people = phones.map(([name, field], index) => {
        const address = field.value.trim();
        const previous = existing?.people?.[index];
        return {name: name.value.trim() || defaults[index], address,
          mac: mac(address) || (previous?.address === address && existing.host === inputs.host.value && existing.site === inputs.site.value ? mac(previous.mac) : '')};
      });
      const addresses = people.map(person => person.mac || person.address).filter(Boolean);
      if (!addresses.length || addresses.some(address => !mac(address) && !ipv4(address)) || new Set(addresses).size !== addresses.length) {
        message.textContent = 'Preencha pelo menos um telefone. Use um IP ou MAC válido e diferente para cada pessoa.';
        return;
      }
      try {
        storage.write(configKey(account), {key: apiKey, host: inputs.host.value, site: inputs.site.value,
          hostName: inputs.host.selectedOptions[0].textContent, siteName: inputs.site.selectedOptions[0].textContent,
          people, revision: Date.now()});
        resetPoll();
        removed = false;
        populate();
        render();
        message.textContent = 'Configuração guardada. A consultar os telefones…';
        void sync();
      } catch {
        message.textContent = 'Não foi possível guardar a configuração neste dispositivo.';
      }
    });

    remove.addEventListener('click', () => {
      if (!account || !isEmitter()) return;
      try {
        storage.write(configKey(account), null);
        resetPoll();
        populate();
        render();
        removed = true;
        void sync();
        message.textContent = 'Configuração retirada deste dispositivo.';
      } catch {
        message.textContent = 'Não foi possível retirar a configuração.';
      }
    });

    async function store(current, kind, value) {
      const {error} = await current.client.from('casa_presence').upsert(
        {owner_id: current.user, house, kind, value}, {onConflict: 'owner_id,house,kind'});
      if (error) throw error;
    }

    async function poll(current, settings) {
      lastPoll = Date.now();
      let devices;
      try {
        devices = await connectedPhones(settings);
      } catch (error) {
        if (account === current && isEmitter() && config()?.revision === settings.revision) {
          lastSuccess = 0;
          absentSince = [];
          message.textContent = error.message?.startsWith('O UniFi devolveu') ? error.message : 'O UniFi está indisponível. A aguardar nova consulta.';
        }
        return;
      }
      if (account !== current || !isEmitter() || config()?.revision !== settings.revision) return;
      const now = Date.now();
      if (now - lastSuccess > POLL_INTERVAL * 2) absentSince = [];
      lastSuccess = now;
      let learned = false;
      const claimed = new Set(settings.people.map(person => person.mac).filter(Boolean));
      const people = settings.people.map((person, index) => {
        const device = person.mac
          ? devices.find(candidate => mac(candidate.macAddress) === person.mac)
          : person.address && devices.find(candidate => candidate.ipAddress === person.address && !claimed.has(mac(candidate.macAddress)));
        if (device && !person.mac && mac(device.macAddress)) {
          person.mac = mac(device.macAddress);
          claimed.add(person.mac);
          learned = true;
        }
        let state = 'unknown';
        if (device) {
          state = 'home';
          absentSince[index] = undefined;
        } else if (person.address) {
          absentSince[index] ??= now;
          if (now - absentSince[index] >= ABSENCE_DELAY) state = 'away';
          else if (snapshot?.people?.[index]?.state === 'home' && now - snapshot.checkedAt <= MAX_AGE) state = 'home';
        }
        return {name: person.name, state};
      });
      if (learned) {
        try { storage.write(configKey(current), settings); } catch {}
      }
      const next = {checkedAt: now, people};
      await store(current, 'status', next);
      if (current === account && config()?.revision === settings.revision) {
        snapshot = next;
        if (!discover.disabled) message.textContent = 'UniFi consultado às ' + new Date(now).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'}) + '.';
      }
    }

    async function sync() {
      if (!account) return;
      void photos?.sync();
      if (syncing) { syncQueued = true; return; }
      const current = account;
      syncing = true;
      try {
        const pending = savedLayout;
        if (pending) {
          await store(current, 'layout', pending);
          if (account !== current) return;
          if (savedLayout === pending) {
            savedLayout = null;
            try { storage.write(current.user + ':pending', null); } catch {}
          }
        }
        const {data, error} = await current.client.from('casa_presence').select('kind,value').eq('house', house).eq('owner_id', current.user);
        if (error) throw error;
        if (account !== current) return;
        const incoming = data.find(row => row.kind === 'layout')?.value;
        if (!savedLayout && typeof incoming?.shown === 'boolean') {
          const coordinates = [incoming.x, incoming.y].every(n => Number.isFinite(n) && n >= 0 && n <= 100);
          layout = {shown: incoming.shown, x: coordinates ? incoming.x : null, y: coordinates ? incoming.y : null};
          try { storage.write(current.user + ':layout', layout); } catch {}
        }
        if (removed && isEmitter()) {
          await store(current, 'status', {checkedAt: 0, people: []});
          if (account !== current) return;
          removed = false;
        } else {
          snapshot = data.find(row => row.kind === 'status')?.value;
        }
        render();
        const saved = config();
        if (saved && isEmitter() && Date.now() - lastPoll >= POLL_INTERVAL) await poll(current, saved);
      } catch {
        if (account === current && !discover.disabled && isEmitter()) message.textContent = 'Sincronização indisponível. Nova tentativa automática.';
      } finally {
        syncing = false;
        render();
        const again = syncQueued || current !== account;
        syncQueued = false;
        if (again) void sync();
      }
    }

    function emitterChanged() {
      ++settingsGeneration;
      discover.disabled = inputs.host.disabled = inputs.site.disabled = false;
      populate();
      if (!isEmitter()) {
        lastSuccess = 0;
        absentSince = [];
      }
      void sync();
    }
    function connect(client, user, emitter) {
      isEmitter = emitter;
      if ((account?.user ?? null) === user && (account?.client ?? null) === client && user) return;
      account = user ? {client, user} : null;
      if (account) {
        const imported = storage.read('restored-config');
        if (imported) {
          try {
            storage.write(configKey(account), {...imported, revision: Date.now()});
            storage.write('restored-config', null);
          } catch { /* Keep the imported configuration available for the next sign-in. */ }
        }
      }
      photos?.connect(account);
      const stored = storage.read((user || 'local') + ':layout');
      layout = stored || layoutDefault;
      savedLayout = user ? storage.read(user + ':pending') : null;
      removed = false;
      selected = undefined;
      resetPoll();
      emitterChanged();
      render();
    }

    window.addEventListener('floorchange', render);
    window.addEventListener('resize', render);
    window.addEventListener('online', sync);
    window.addEventListener('pageshow', sync);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void sync(); });
    setInterval(() => { if (!document.hidden || isEmitter()) void sync(); }, 15_000);
    connect(null, null, () => false);
    return {connect, emitterChanged, sync};
  }

  window.CasaPresence = {mount};
})();
