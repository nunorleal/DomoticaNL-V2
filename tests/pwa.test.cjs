const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8')),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('PWA opens standalone with a clean launch URL and project-relative identity/scope',()=>{
 assert.equal(manifest.name,'Domótica');assert.equal(manifest.short_name,'Domótica');assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'any');
 for(const base of ['https://example.github.io/casa/','https://example.github.io/','http://localhost:8083/']){
  const file=new URL('manifest.webmanifest',base),scope=new URL(manifest.scope,file),start=new URL(manifest.start_url,file),id=new URL(manifest.id,file);
  assert.equal(scope.href,base);assert.equal(start.href,base);assert.equal(id.href,base);assert.equal(start.search,'');assert.equal(start.hash,'');
 }
});
test('iPad installation metadata and standalone-only safe areas preserve ordinary browser layout',()=>{
 for(const [name,value]of [['apple-mobile-web-app-capable','yes'],['apple-mobile-web-app-status-bar-style','black-translucent'],['apple-mobile-web-app-title','Domótica']])assert.match(html,new RegExp('<meta name="'+name+'" content="'+value+'">'));
 const viewports=html.match(/<meta name="viewport"[^>]+>/g);assert.equal(viewports.length,1);assert.match(viewports[0],/viewport-fit=cover/);
 assert.match(html,/<link rel="manifest" href="manifest.webmanifest">/);assert.match(html,/<link rel="apple-touch-icon" sizes="180x180" href="assets\/icons\/apple-touch-icon.png">/);
 const css=fs.readFileSync(path.join(root,'pwa.css'),'utf8');assert.match(css,/@media \(display-mode: standalone\)/);for(const side of ['top','right','bottom','left'])assert.ok(css.includes('env(safe-area-inset-'+side+')'));assert.match(css,/#meteo-view\{/);
});
test('home-screen PNG icons are valid opaque images at the declared sizes',()=>{
 const icons=[...manifest.icons,{src:'assets/icons/apple-touch-icon.png',sizes:'180x180'}];assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));
 for(const icon of icons){const bytes=fs.readFileSync(path.join(root,icon.src)),size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);assert.equal(bytes[25],2)}
});
test('installation adds no service worker or network/cache interception to device traffic',()=>{
 const scripts=[...html.matchAll(/<script src="([^"?]+)(?:\?[^" ]*)?"><\/script>/g)].map(m=>m[1]);
 for(const name of scripts){const code=fs.readFileSync(path.join(root,name),'utf8');assert.doesNotMatch(code,/serviceWorker\s*\.\s*register\s*\(/);}
 assert.equal(fs.existsSync(path.join(root,'service-worker.js')),false);
});
