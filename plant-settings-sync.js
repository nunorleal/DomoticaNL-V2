/* Visual preferences use the history login, independently of the history writer. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.CasaPlantSettingsSync = factory();
    root.CasaSharedConfig = {equal: root.CasaPlantSettingsSync.equal};
  }
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  function equal(a,b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b,key) && equal(a[key],b[key]));
  }
  const shared = {
    'energy-banner': 'show-energy-banner',
    'ev-banner': 'show-ev-banner',
    'blind-bars': 'show-blind-bars',
    'christmas-tree': 'show-christmas-tree',
    heater: 'show-heater',
    dehumidifier: 'show-dehumidifier'
  };
  const controls = {
    t2: {
      ...shared, 'room-labels': 'toggle-labels', 'sensor-readings': 'toggle-sensor-readings',
      'blind-banners': 'toggle-blind-labels', cats: 'toggle-house-cats', 'media-icons': 'toggle-console-icons'
    },
    duplex: {
      ...shared, 'room-labels': 'show-room-labels', 'sensor-readings': 'show-sensor-readings',
      'blind-banners': 'show-blind-banners', cats: 'show-house-cats'
    }
  };

  const devices = {
    heater: 'CasaHeater',
    dehumidifier: 'CasaDehumidifier',
    'christmas-tree': 'CasaChristmasTree'
  };
  const garageItems = Object.freeze({
    'garage-fan': 'fan',
    'garage-cellar': 'cellar',
    'garage-alarm': 'alarm',
    'garage-ev': 'ev'
  });
  function validatePosition(house, setting, position) {
    if (Object.hasOwn(garageItems, setting)) {
      if (house !== 't2' || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
      const {x, y} = position;
      return x >= 0 && x <= 100 && y >= 0 && y <= (setting === 'garage-ev' ? 130 : 100) ? {x, y} : null;
    }
    if (!position || typeof position !== 'object' ||
        typeof position.room !== 'string' || !position.room || position.room.length > 64 ||
        ![position.x, position.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1600)) return null;
    const {room, x, y, floor} = position;
    if (house === 't2' && floor === undefined) return {room, x, y};
    if (house === 'duplex' && ['-1', '3', '4'].includes(floor)) return {room, x, y, floor};
    return null;
  }

  function createSync({house, read, write, apply, report, storage, positions = false, preferences}) {
    const supported = positions ? devices : controls[house];
    const field = preferences ? 'value' : positions ? 'position' : 'shown';
    const label = preferences ? 'definições' : positions ? 'posições' : 'checks';
    const normalize = (name, value) => preferences ? preferences.normalize(name, value)
      : positions ? validatePosition(house, name, value) : typeof value === 'boolean' ? value : null;
    let account = null, currentRun = null;
    let pending = new Map();
    const queuePrefix = preferences ? 'casa-plant-preferences-pending:'
      : positions ? 'casa-plant-positions-pending:' : 'casa-plant-pending:';
    const key = () => queuePrefix + house + ':' + account.user;
    const known = name => preferences ? preferences.known(name) : Object.hasOwn(supported, name) ||
      (positions && house === 't2' && Object.hasOwn(garageItems, name));
    function saveQueue() {
      try {
        if (pending.size) storage.setItem(key(), JSON.stringify(Object.fromEntries(pending)));
        else storage.removeItem(key());
      } catch { /* Keep pending changes in memory if storage is unavailable. */ }
    }

    async function sync() {
      const active = account;
      if (!active || currentRun === active) return;
      currentRun = active;
      active.resend = false;
      try {
        // Compare entries by identity so a second click during a send is still queued.
        while (account === active && pending.size) {
          const batch = [...pending];
          await write(active, batch.map(([setting, value]) => ({
            owner_id: active.user, house, setting, [field]: value[field]
          })));
          if (account !== active) return;
          for (const [setting, value] of batch) {
            if (pending.get(setting) === value) pending.delete(setting);
          }
          saveQueue();
        }
        if (account !== active) return;
        const rows = await read(active);
        if (account !== active) return;
        for (const {setting, [field]: raw} of rows) {
          const value = normalize(setting, raw);
          if (known(setting) && value !== null && !pending.has(setting)) apply(setting, value);
        }
        if (!pending.size) report(preferences ? 'Definições sincronizadas.' : positions ? 'Posições sincronizadas.' : 'Checks sincronizados.');
      } catch {
        if (account === active) report(pending.size
          ? 'Alterações por enviar. A app tenta novamente quando recuperar a ligação.'
          : 'Sincronização de ' + label + ' indisponível.');
      } finally {
        if (currentRun === active) currentRun = null;
        // A click during the read belongs in the next request, never in its response.
        if (account === active && pending.size && active.resend) {
          active.resend = false;
          void sync();
        }
      }
    }

    function connect(client, user) {
      if (account?.user === user) return;
      account = user ? {client, user, resend: false} : null;
      pending = new Map();
      if (!account) {
        report(positions || preferences ? '' : 'Inicia sessão em «Sincronizar histórico» para partilhar as definições da casa.');
        return;
      }
      try {
        const saved = JSON.parse(storage.getItem(key()));
        for (const [setting, entry] of Object.entries(saved || {})) {
          const value = normalize(setting, entry?.[field]);
          if (known(setting) && value !== null) pending.set(setting, {[field]: value});
        }
      } catch { /* Start without a queue. */ }
      report('A sincronizar ' + label + '…');
      void sync();
    }

    function change(setting, value) {
      if (!account || !known(setting)) return;
      const clean = normalize(setting, value);
      if (clean === null) return;
      pending.set(setting, {[field]: clean});
      saveQueue();
      report('A enviar alteração…');
      if (currentRun === account) account.resend = true;
      else void sync();
    }
    return {connect, change, sync};
  }

  function mount(house, document, window) {
    const group = document.getElementById('plant-display-settings');
    if (!group || !Object.hasOwn(controls, house)) return null;
    const nodes = new Map(Object.entries(controls[house]).map(([setting, id]) =>
      [setting, document.getElementById(id)]).filter(([, node]) => node && group.contains(node)));
    const keys = new Map([...nodes].map(([setting, node]) => [node, setting]));
    function statusMessage() {
      const message = document.createElement('p');
      message.className = 'plant-settings-sync-status';
      message.setAttribute('role', 'status');
      message.hidden = true;
      group.append(message);
      return text => {
        if (message.textContent !== text) message.textContent = text;
        message.hidden = !text;
      };
    }
    let applying = false;
    const checked = node => node.matches('input[type="checkbox"]') ? node.checked : node.getAttribute('aria-checked') === 'true';
    const storage = {
      getItem: key => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: key => window.localStorage.removeItem(key)
    };
    const transport = (table, field) => ({
      async read({client}) {
        const {data, error} = await client.from(table).select('setting,' + field).eq('house', house);
        if (error) throw error;
        return data || [];
      },
      async write({client}, batch) {
        const {error} = await client.from(table).upsert(batch, {onConflict: 'owner_id,house,setting'});
        if (error) throw error;
      }
    });
    const checks = createSync({
      house, storage, ...transport('casa_plant_settings', 'shown'),
      apply(setting, shown) {
        const node = nodes.get(setting);
        if (!node || checked(node) === shown) return;
        applying = true;
        try { node.click(); }
        finally { applying = false; }
      },
      report: statusMessage()
    });
    const positions = createSync({
      house, storage, positions: true, ...transport('casa_plant_positions', 'position'),
      apply(setting, position) {
        if (Object.hasOwn(garageItems, setting)) {
          window.CasaBasementLayout?.applySharedPosition(garageItems[setting], position);
        } else {
          window[devices[setting]]?.applySharedPosition(position);
        }
      },
      report: statusMessage()
    });
    const housePreferences = mountPreferences(house, document, window, storage, transport, statusMessage());
    function connect(client, user) {
      housePreferences.connect(client, user);
      checks.connect(client, user);
      positions.connect(client, user);
    }
    async function sync() {
      await Promise.all([checks.sync(), positions.sync(), housePreferences.sync()]);
    }
    connect(null, null);
    window.addEventListener('plantpositionchange', event => {
      if (event.detail) positions.change(event.detail.setting, event.detail.position);
    });
    const record = node => {
      const setting = keys.get(node);
      if (!applying && setting) checks.change(setting, checked(node));
    };
    group.addEventListener('change', event => record(event.target));
    group.addEventListener('click', event => record(event.target.closest('button[role="checkbox"]')));
    window.addEventListener('online', sync);
    window.addEventListener('pageshow', sync);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void sync(); });
    window.setInterval(() => { if (!document.hidden) void sync(); }, 10000);
    return {connect, sync};
  }

  function mountPreferences(house, document, window, storage, transport, report) {
    const duplex = house === 'duplex';
    const meteoKey = 'casa-nl-meteo-v1';
    let appliedMeteo = '';
    let applying = false;
    const meteoCore = window.CasaMeteoCore;
    const rangeId = duplex ? 'banner-scale' : 'room-power-size';
    const staticNames = ['shelly-disabled','shelly-config','environment-mode','screensaver-delay','banner-scale','weather-city','meteo-settings','energy-tariff','media-labels','office-labels'];
    const roomPrefix = 'room-name:';
    const bannerPrefix = 'banner-position:';
    const timerPrefix = 'timer-preset:';
    const labels = {
      room: () => duplex ? window.CasaLabelLayout : window.CasaSharedRoomPosition,
      sensor: () => window.CasaSensorLayout,
      alarm: () => window.CasaAlarmLayout,
      fan: () => window.CasaFanLayout,
      ev: () => window.CasaEVRead?.layout
    };
    const shelly = duplex ? window.CasaShellySetup : window.CasaShelly;
    const timerStore = window.CasaApplianceTimerStore;
    const known = name => typeof name === 'string' && (
      staticNames.includes(name) || /^room-name:[a-z0-9:-]{1,55}$/.test(name) ||
      /^timer-preset:(heater|dehumidifier)-dialog$/.test(name) ||
      (duplex ? /^banner-position:(room|sensor|alarm|fan|ev):(-1|3|4):[a-z0-9-]{1,40}$/.test(name)
        : /^banner-position:room:[a-z0-9-]{1,40}$/.test(name))
    );
    function normalize(name, value) {
      if (!known(name)) return null;
      try {
        if (name === 'shelly-config') {
          if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
          return shelly?.sharedConfiguration(value) ?? null;
        }
        if (name === 'energy-tariff') {
          const {globalTotals,...tariff} = window.CasaEnergyCostCore.validate({...value,globalTotals:[]});
          return tariff;
        }
        if (name.startsWith(timerPrefix)) return timerStore.presetList(value);
        if (name.startsWith(bannerPrefix)) {
          const limit = duplex ? 1600 : 100;
          return value && [value.x,value.y].every(n=>Number.isFinite(n)&&n>=0&&n<=limit)
            ? {x:value.x,y:value.y} : null;
        }
        if (name === 'shelly-disabled') {
          const fields = duplex ? window.CasaHomeCore.disabledFields(window.CasaPlans) : window.ShellyCore.disabledFields();
          return window.CasaShellyDisabled.normalize(value, fields) ?? null;
        }
        if (name === 'media-labels' || name === 'office-labels') return !duplex && typeof value === 'boolean' ? value : null;
        if (name === 'environment-mode') return ['auto','day','night'].includes(value) ? value : null;
        if (name === 'screensaver-delay') return meteoCore.screensaver({seconds:value}).seconds;
        if (name === 'banner-scale') return Number.isInteger(value) && value >= 60 && value <= 160 && value % 5 === 0 ? value : null;
        if (name.startsWith(roomPrefix)) return typeof value === 'string' && value.length <= (duplex ? 120 : 40) ? value : null;
        if (name === 'meteo-settings') return meteoCore.preferences(value);
        if (!value || typeof value.name !== 'string' || !value.name.trim() ||
            value.name.length > 150 || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90 ||
            !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180) return null;
        const {name: city, latitude, longitude} = value;
        const details = Object.fromEntries(['admin1','country','country_code','timezone'].map(key =>
          [key, typeof value[key] === 'string' ? value[key].slice(0,120) : '']));
        if (typeof value.id === 'number' && Number.isSafeInteger(value.id)) details.id = value.id;
        return {name:city, latitude, longitude, ...details};
      } catch { return null; }
    }
    function loadMeteo() {
      try { return meteoCore.preferences(JSON.parse(storage.getItem(meteoKey)) || {}); }
      catch { return {}; }
    }
    function apply(setting, value) {
      if (setting === 'shelly-disabled') {
        shelly?.applySharedDisabled(value);
      } else if (setting === 'shelly-config') {
        shelly?.applySharedConfiguration(value);
      } else if (setting === 'media-labels' || setting === 'office-labels') {
        window.dispatchEvent(new window.CustomEvent('shared-'+setting,{detail:value}));
      } else if (setting === 'energy-tariff') {
        window.CasaEnergyCost?.applySharedPreferences(value);
      } else if (setting.startsWith(timerPrefix)) {
        const role = setting.slice(timerPrefix.length);
        let saved = {};
        try { saved = timerStore.presetSettings(JSON.parse(storage.getItem(timerStore.PRESET_KEY) || '{}')); } catch {}
        if (!equal(saved[role],value)) {
          try { storage.setItem(timerStore.PRESET_KEY,JSON.stringify({...saved,[role]:value})); } catch {}
        }
      } else if (setting.startsWith(bannerPrefix)) {
        const [kind,...parts] = setting.slice(bannerPrefix.length).split(':');
        const address = parts.join(':');
        const layout = labels[kind]?.();
        if (duplex) layout?.applySharedPosition?.(address,value);
        else layout?.apply?.(address,value);
      } else if (setting.startsWith(roomPrefix)) {
        window.CasaSharedRoomNames?.apply(setting.slice(roomPrefix.length), value);
      } else if (setting === 'weather-city') {
        const current = window.CasaEnvironment?.getState()?.city;
        if (current?.name !== value.name || current?.latitude !== value.latitude ||
            current?.longitude !== value.longitude || current?.timezone !== (value.timezone || 'UTC')) {
          void window.CasaEnvironment?.selectCity(value, false);
        }
      } else if (setting === 'meteo-settings') {
        const current = loadMeteo();
        const signature = JSON.stringify(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
        if (signature === appliedMeteo && Object.entries(value).every(([key,v])=>JSON.stringify(current[key])===JSON.stringify(v))) return;
        try { storage.setItem(meteoKey, JSON.stringify({...current,...value})); } catch {}
        if (signature !== appliedMeteo) {
          appliedMeteo = signature;
          window.dispatchEvent(new window.CustomEvent('sharedmeteopreferences', {detail:value}));
        }
      } else {
        const slider = setting === 'banner-scale';
        const node = document.getElementById(slider ? rangeId : setting);
        if (!node || node.value === String(value) || node.matches(':active')) return;
        node.value = String(value);
        if (slider) node.dispatchEvent(new window.Event('input', {bubbles:true}));
        else node.dispatchEvent(new window.Event('change', {bubbles:true}));
      }
    }
    const sync = createSync({
      house, storage, preferences:{known,normalize}, ...transport('casa_plant_preferences','value'),
      apply(setting, value) {
        applying = true;
        try { apply(setting, value); }
        finally { applying = false; }
      },
      report
    });
    window.addEventListener('housepreferencechange', event => {
      if (!applying && event.detail) {
        if (event.detail.setting === 'meteo-settings') appliedMeteo = '';
        sync.change(event.detail.setting, event.detail.value);
      }
    });
    return sync;
  }

  return {createSync, mount, equal};
});
