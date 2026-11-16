const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createSync} = require('../plant-settings-sync');
const tick = () => new Promise(resolve => setImmediate(resolve));
const defer = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return {promise, resolve};
};
function memory() {
  const data = new Map();
  return {getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k)};
}
function device(db, house='t2', storage=memory()) {
  const shown = new Map();
  const d = createSync({
    house, storage, apply: (setting, value) => shown.set(setting, value), report() {},
    read: async account => {
      if (db.offline) throw Error();
      if (db.blockRead) {
        const old = db.rows.filter(r => r.owner_id === account.user && r.house === house);
        await db.blockRead.promise;
        return old;
      }
      return db.rows.filter(r => r.owner_id === account.user && r.house === house);
    },
    write: async (account, rows) => {
      if (db.offline) throw Error();
      if (db.blockWrite) await db.blockWrite.promise;
      for (const row of rows) {
        assert.equal(row.owner_id, account.user);
        const k = db.rows.findIndex(r => r.owner_id === row.owner_id && r.house === row.house && r.setting === row.setting);
        if (k === -1) db.rows.push(row);
        else db.rows[k] = row;
      }
    }
  });
  return {...d, shown};
}
test('either device can change each check and changes to different checks merge by house', async () => {
  const db = {rows:[]};
  const ipad = device(db), phone = device(db), cond = device(db,'duplex');
  for (const d of [ipad,phone,cond]) d.connect({},'nuno');
  await tick();
  ipad.change('heater',false);
  phone.change('christmas-tree',false);
  cond.change('heater',true);
  await tick();
  await ipad.sync();
  await phone.sync();
  assert.deepEqual([...ipad.shown.entries()], [['heater',false],['christmas-tree',false]]);
  assert.deepEqual([...phone.shown.entries()], [...ipad.shown.entries()]);
  phone.change('heater',true);
  await tick();
  await ipad.sync();
  assert.equal(ipad.shown.get('heater'),true);
  assert.deepEqual([...cond.shown.entries()], [['heater',true]]);
  assert.equal(db.rows.length,3);
});
test('a check changed during an older read is neither reverted nor lost', async () => {
  const db = {rows:[{owner_id:'nuno',house:'t2',setting:'heater',shown:true}],blockRead:defer()};
  const ipad = device(db);
  ipad.connect({},'nuno');
  ipad.change('heater',false);
  const before = db.blockRead;
  delete db.blockRead;
  before.resolve();
  await tick();
  assert.equal(ipad.shown.get('heater'),false);
  assert.equal(db.rows[0].shown,false);
});
test('retry queue is saved per account, survives reload and cannot leak to another account', async () => {
  const db = {rows:[],offline:true};
  const storage = memory(), ipad = device(db,'t2',storage);
  ipad.connect({},'nuno');
  ipad.change('heater',false);
  await tick();
  db.offline = false;
  const reopened = device(db,'t2',storage);
  reopened.connect({},'outro');
  await tick();
  assert.equal(db.rows.length,0);
  reopened.connect({},'nuno');
  await tick();
  assert.equal(db.rows[0].shown,false);
  assert.equal(reopened.shown.get('heater'),false);
});
test('a second change to the same check replaces the pending first change', async () => {
  const db = {rows:[]};
  const ipad = device(db);
  ipad.connect({},'nuno');
  await tick();
  db.blockWrite = defer();
  ipad.change('heater',false);
  ipad.change('heater',true);
  const before = db.blockWrite;
  delete db.blockWrite;
  before.resolve();
  await tick();
  assert.equal(db.rows[0].shown,true);
});


test('position sync validates each house and stays independent of visibility', async () => {
  const writes = [], applied = [];
  const position = {room:'living',x:230,y:450,floor:'4'};
  const d = createSync({
    house:'duplex', positions:true, storage:memory(), report() {},
    write:async (_account, rows) => writes.push(...rows),
    read:async () => [
      {setting:'heater',position},
      {setting:'dehumidifier',position:{room:'living',x:500,y:400}},
      {setting:'christmas-tree',position:{...position,x:1800}},
      {setting:'cats',position}
    ],
    apply:(...args) => applied.push(args)
  });
  d.connect({},'nuno');
  await tick();
  assert.deepEqual(applied,[['heater',position]]);
  d.change('heater',{...position,x:235,shown:false,deviceId:'ignored'});
  d.change('christmas-tree',false);
  await tick();
  assert.deepEqual(writes,[{owner_id:'nuno',house:'duplex',setting:'heater',position:{...position,x:235}}]);
});
