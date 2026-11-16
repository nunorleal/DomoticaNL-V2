/* Visual preferences use the history login, independently of the history writer. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CasaPlantSettingsSync = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

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
  function validatePosition(house, position) {
    if (!position || typeof position !== 'object' ||
        typeof position.room !== 'string' || !position.room || position.room.length > 64 ||
        ![position.x, position.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1600)) return null;
    const {room, x, y, floor} = position;
    if (house === 't2' && floor === undefined) return {room, x, y};
    if (house === 'duplex' && ['-1', '3', '4'].includes(floor)) return {room, x, y, floor};
    return null;
  }

  function createSync({house, read, write, apply, report, storage, positions = false}) {
    const supported = positions ? devices : controls[house];
    const field = positions ? 'position' : 'shown';
    const label = positions ? 'posições' : 'checks';
    const normalize = value => positions ? validatePosition(house, value) : typeof value === 'boolean' ? value : null;
    let account = null, currentRun = null;
    let pending = new Map();
    const queuePrefix = positions ? 'casa-plant-positions-pending:' : 'casa-plant-pending:';
    const key = () => queuePrefix + house + ':' + account.user;
    const known = name => Object.hasOwn(supported, name);
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
          const value = normalize(raw);
          if (known(setting) && value !== null && !pending.has(setting)) apply(setting, value);
        }
        if (!pending.size) report(positions ? 'Posições sincronizadas.' : 'Checks sincronizados.');
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
        report(positions ? '' : 'Inicia sessão em «Sincronizar histórico» para partilhar os checks e as posições.');
        return;
      }
      try {
        const saved = JSON.parse(storage.getItem(key()));
        for (const [setting, entry] of Object.entries(saved || {})) {
          const value = normalize(entry?.[field]);
          if (known(setting) && value !== null) pending.set(setting, {[field]: value});
        }
      } catch { /* Start without a queue. */ }
      report('A sincronizar ' + label + '…');
      void sync();
    }

    function change(setting, value) {
      if (!account || !known(setting)) return;
      const clean = normalize(value);
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
        window[devices[setting]]?.applySharedPosition(position);
      },
      report: statusMessage()
    });
    function connect(client, user) {
      checks.connect(client, user);
      positions.connect(client, user);
    }
    async function sync() {
      await Promise.all([checks.sync(), positions.sync()]);
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

  return {createSync, mount};
});
