const {test}=require('node:test'),assert=require('node:assert/strict');
const Crypto=require('../backup-crypto.js'),Backup=require('../backup-core.js'),Energy=require('../daily-energy-core.js');
const duplex=!!Backup.FORMAT,server='https://xnxkezilascdouyueukm.supabase.co';
const login={server,email:'fixture@example.test',password:'FAKE-private-password-only'},pass='1234';
function storage(){const map=new Map();return {map,get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}}
function backup(encrypted){
 if(duplex)return Backup.create({supabaseCredentials:encrypted},{});
 const ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];
 return Backup.parse(JSON.stringify({application:'Casa NL',schemaVersion:1,appVersion:'2.228',supabaseCredentials:encrypted,data:{'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:50}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{city:null,mode:'auto'}}}));
}
function restore(s,b,options){return duplex?Backup.write(s,b,{},options):Backup.restore(s,b,options)}
test('Supabase password is encrypted and rejects wrong password, tampering and ciphertext from other credentials',async()=>{
 const encrypted=await Crypto.encryptSupabase(login,pass);assert.ok(!JSON.stringify(encrypted).includes(login.password));assert.ok(!JSON.stringify(encrypted).includes(login.email));assert.deepEqual(await Crypto.decryptSupabase(encrypted,pass),login);
 await assert.rejects(Crypto.decryptSupabase(encrypted,'wrong'));assert.throws(()=>Crypto.validateUnifi(encrypted));assert.throws(()=>Crypto.supabaseConfig({...login,server:'https://untrusted.example'}));
 const bad=JSON.parse(JSON.stringify(encrypted));bad.encrypted.ciphertext=(bad.encrypted.ciphertext[0]==='A'?'B':'A')+bad.encrypted.ciphertext.slice(1);await assert.rejects(Crypto.decryptSupabase(bad,pass));
});
test('encrypted Supabase access roundtrips on explicit restore, stays absent otherwise, and never stores plaintext',async()=>{
 const encrypted=await Crypto.encryptSupabase(login,pass),b=backup(encrypted),s=storage(),key='casa-history-sync-'+(duplex?'duplex':'t2')+'-backup-login';
 restore(s,b,{});assert.equal(s.getItem(key),null);
 assert.throws(()=>restore(s,b,{restoreCredentials:true}),/palavra-passe/);
 restore(s,b,{restoreCredentials:true,supabase:login});assert.deepEqual(JSON.parse(s.getItem(key)),encrypted);assert.ok(![...s.map.values()].join('').includes(login.password));
 const old=s.getItem(key);const without=JSON.parse(JSON.stringify(b));if(duplex)delete without.data.supabaseCredentials;else delete without.supabaseCredentials;
 if(!duplex||Object.keys(without.data).length)restore(s,without,{});assert.equal(s.getItem(key),old);
});
test('backup includes receiver history with emitter totals and slots, without adding totals or changing the local ledger',()=>{
 const id=Energy.identity('https://shelly-1-eu.shelly.cloud',{deviceId:'deadbeef',channel:0}),at=Date.parse('2026-11-18T10:00:00Z'),a=Energy.create(),b=Energy.create();
 a.record(id,100,at);a.record(id,101,at+60000);b.record(id,90,at-60000);b.record(id,95,at);const local=a.snapshot(),copy=JSON.stringify(local),combined=Energy.backupSnapshot(local,b.snapshot());
 const day=Energy.day(at);assert.equal(combined.entries[id].days[day].kWh,5);assert.deepEqual(combined.entries[id].last,local.entries[id].last);assert.equal(JSON.stringify(local),copy);assert.deepEqual(Energy.backupSnapshot(local,null),local);
});
