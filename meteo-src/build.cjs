// Build the integrated MeteoNL once. Optionally copy the same release to Casa Condados.
// node build.cjs [node_modules] [esbuild module] [--condados path]
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const condadosFlag = args.indexOf('--condados');
let condados;
if (condadosFlag !== -1) {
  const [, target] = args.splice(condadosFlag, 2);
  if (!target) throw new Error('Indique a pasta da Casa Condados depois de --condados.');
  condados = path.resolve(target);
}
const home = path.resolve(__dirname, '..');
const sibling = path.join(home, '..', 'Casa Condados');
if (!condados && fs.existsSync(path.join(sibling, 'meteo-src', 'build.cjs'))) condados = sibling;
if (condados && (condados === home ||
  !fs.existsSync(path.join(condados, 'meteo-src', 'build.cjs')) ||
  !fs.existsSync(path.join(condados, 'meteo-core.js')))) {
  throw new Error('Indique uma pasta diferente com o projeto Casa Condados.');
}

const version = fs.readFileSync(path.join(__dirname, 'app-info.ts'), 'utf8')
  .match(/APP_VERSION\s*=\s*["'](\d+\.\d+)["']/)?.[1];
if (!version) throw new Error('APP_VERSION da MeteoNL em falta.');
if (require('./package.json').version !== version + '.0') {
  throw new Error('A versão em package.json deve corresponder a APP_VERSION.');
}
const dependencies = path.resolve(args[0] || path.join(__dirname, 'node_modules'));
const esbuild = require(args[1] || require.resolve('esbuild', {paths: [dependencies]}));
const stem = 'app-' + version;
const result = esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'main.tsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['safari15'],
  jsx: 'automatic',
  nodePaths: [dependencies],
  outdir: path.join(home, 'meteo', 'assets'),
  entryNames: stem,
  write: false,
  define: {'process.env.NODE_ENV': '"production"'}
});
const html = '<!doctype html><html lang="pt"><head><meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<title>MeteoNL · Casa NL</title><link rel="stylesheet" href="assets/' + stem + '.css"></head>' +
  '<body><div id="root"></div><script src="assets/' + stem + '.js"></script></body></html>';
const bootstrap = '// Gerado por meteo-src/build.cjs.\nwindow.CasaMeteoRelease = Object.freeze(' +
  JSON.stringify({version, html}) + ');\n';

for (const target of condados ? [home, condados] : [home]) {
  const meteo = path.join(target, 'meteo');
  const assets = path.join(meteo, 'assets');
  fs.mkdirSync(assets, {recursive: true});
  for (const file of result.outputFiles) {
    fs.writeFileSync(path.join(assets, path.basename(file.path)), file.contents);
  }
  fs.writeFileSync(path.join(meteo, 'index.html'), html + '\n');
  fs.writeFileSync(path.join(meteo, 'release.js'), bootstrap);
}

if (condados) {
  // The mirror keeps the test helpers available in a standalone checkout.
  for (const entry of fs.readdirSync(__dirname, {withFileTypes: true})) {
    const sourceFile = entry.isFile() && /\.(tsx?|css|cjs|md)$/.test(entry.name) &&
      entry.name !== 'build.cjs';
    if (!sourceFile && entry.name !== 'package.json' && entry.name !== 'vendor') continue;
    fs.cpSync(path.join(__dirname, entry.name), path.join(condados, 'meteo-src', entry.name), {recursive: true});
  }
}
