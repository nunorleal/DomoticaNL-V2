const {test} = require('node:test');
const assert = require('node:assert/strict');
const Backup = require('../backup-core.js');
const Crypto = require('../backup-crypto.js');

const duplex = !!Backup.FORMAT;
const house = duplex ? 'duplex' : 't2';
const secret = 'FAKE-UNIFI-BACKUP-ONLY';
const password = 'Fake password for backup tests';
const cloud = {server: 'https://shelly-fixture.shelly.cloud', authKey: 'FAKE-CLOUD-BACKUP-ONLY'};
const config = {
  key: secret, host: 'fixture-console', site: 'fixture-site',
  hostName: 'Consola de teste', siteName: 'Default', revision: 123,
  people: ['Eu', 'Esposa', 'Filho'].map((name, index) => ({
    name, address: '192.0.2.' + (index + 10), mac: ''
  }))
};

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key: index => [...values.keys()][index],
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    values
  };
}

function backup(unifiCredentials, shellyCredentials) {
  if (duplex) return Backup.create({
    shellySetup: {server: cloud.server, lights: {}, blinds: {}},
    ...(unifiCredentials ? {unifiCredentials} : {}),
    ...(shellyCredentials ? {shellyCredentials} : {})
  }, {});
  const ids = ['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];
  const data = {
    'casa-nl-realistic-v2': ids.map((id, index) => ({id, light: false, ...(index < 4 ? {blind: 50} : {})})),
    'casa-nl-room-layout-v1': Object.fromEntries(ids.map(id => [id, {name: null, lx: 50, ly: 50}])),
    'casa-nl-show-banners': true,
    'casa-nl-environment-v1': {city: null, mode: 'auto'},
    'casa-nl-shelly-cloud-v1': {schemaVersion: 1, server: cloud.server, authKey: '', rememberKey: false, bindings: {}}
  };
  const value = {application: 'Casa NL', schemaVersion: 1, appVersion: '2.216', data,
    ...(unifiCredentials ? {unifiCredentials} : {}),
    ...(shellyCredentials ? {shellyCredentials} : {})};
  return Backup.parse(JSON.stringify(value));
}

function restore(target, value, options) {
  if (duplex) return Backup.write(target, value, {}, options);
  return Backup.restore(target, value, options);
}

test('password protects both keys and restores UniFi config and Shelly together', async () => {
  const unifiCredentials = await Crypto.encryptUnifi(config, password);
  const shellyCredentials = await Crypto.encrypt(cloud, password);
  const value = backup(unifiCredentials, shellyCredentials);
  const json = JSON.stringify(value);
  for (const hidden of [secret, cloud.authKey, password, config.people[0].address]) {
    assert(!json.includes(hidden));
  }
  const unifi = await Crypto.decryptUnifi(unifiCredentials, password);
  const decrypted = await Crypto.decrypt(shellyCredentials, password);
  assert.deepEqual(unifi, config);
  const target = storage();
  const unifiStorageKey = 'presence-unifi:' + house + ':fake-user:config';
  restore(target, duplex ? {...value, data: {...value.data, shellyCredentials: decrypted}} : value, {
    restoreCredentials: true, decrypted, unifi, unifiStorageKey
  });
  const saved = JSON.parse(target.getItem(unifiStorageKey));
  assert.equal(saved.key, secret);
  assert.deepEqual(saved.people, config.people);
  const shelly = JSON.parse(target.getItem(duplex ? Backup.KEYS.shellyCredentials : 'casa-nl-shelly-cloud-v1'));
  assert.equal(shelly.authKey, cloud.authKey);
  assert(![...target.values.keys()].some(key => key.includes('writer')));
});

test('UniFi ciphertext rejects wrong passwords, tampering and interchange with Cloud', async () => {
  const encrypted = await Crypto.encryptUnifi(config, password);
  await assert.rejects(Crypto.decryptUnifi(encrypted, 'Wrong password'), /incorreta/);
  const bytes = Buffer.from(encrypted.encrypted.ciphertext, 'base64');
  bytes[0] ^= 1;
  await assert.rejects(Crypto.decryptUnifi({...encrypted, encrypted: {
    ...encrypted.encrypted, ciphertext: bytes.toString('base64')
  }}, password), /alterados/);
  assert.throws(() => Crypto.validate(encrypted));
  const shelly = await Crypto.encrypt(cloud, password);
  assert.throws(() => Crypto.validateUnifi(shelly));
});

test('unselected restoration and old backups keep current UniFi settings', async () => {
  const targetKey = 'presence-unifi:' + house + ':restored-config';
  const target = storage({[targetKey]: 'original'});
  const encrypted = await Crypto.encryptUnifi(config, password);
  restore(target, backup(encrypted), {restoreCredentials: false});
  assert.equal(target.getItem(targetKey), 'original');
  restore(target, backup(), {restoreCredentials: true});
  assert.equal(target.getItem(targetKey), 'original');
  assert.throws(() => restore(target, backup(encrypted), {restoreCredentials: true}), /palavra-passe/);
  assert.equal(target.getItem(targetKey), 'original');
});

test('failure saving UniFi rolls back all backup changes', async () => {
  const targetKey = 'presence-unifi:' + house + ':restored-config';
  const target = storage({[targetKey]: 'original', unrelated: 'keep'});
  const before = [...target.values.entries()];
  const encrypted = await Crypto.encryptUnifi(config, password);
  const set = target.setItem;
  let failed = false;
  target.setItem = (key, value) => {
    if (key === targetKey && !failed) { failed = true; throw Error('Quota'); }
    set(key, value);
  };
  assert.throws(() => restore(target, backup(encrypted), {restoreCredentials: true, unifi: config}), /guardar/);
  assert.deepEqual([...target.values.entries()].sort(), before.sort());
});

test('invalid and oversized UniFi settings fail before encryption', async () => {
  for (const broken of [{...config, key: ''}, {...config, key: 'a'.repeat(4097)},
    {...config, people: []}, {...config, people: [{...config.people[0], address: '999.0.0.1'}, ...config.people.slice(1)]}]) {
    await assert.rejects(Crypto.encryptUnifi(broken, password));
  }
  assert.equal((await Crypto.decryptUnifi(await Crypto.encryptUnifi({...config, key: 'a'.repeat(4096)}, password), password)).key.length, 4096);
});
