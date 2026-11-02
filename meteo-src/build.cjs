/* node build.cjs /path/to/node_modules. All generated files stay in dist/meteo. */
const path=require('node:path'),fs=require('node:fs');
// MeteoNL has its own shared version, independent of each house application.
const version=fs.readFileSync(path.join(__dirname,'app-info.ts'),'utf8').match(/APP_VERSION\s*=\s*["'](\d+\.\d+)["']/)?.[1];
if(!version)throw new Error('Missing MeteoNL APP_VERSION');
const dependencies=path.resolve(process.argv[2]||path.join(__dirname,'node_modules'));
const esbuild=require(process.argv[3] || require.resolve('esbuild',{paths:[dependencies]}));
esbuild.buildSync({entryPoints:[path.join(__dirname,'main.tsx')],bundle:true,minify:true,format:'iife',target:['safari15'],jsx:'automatic',nodePaths:[dependencies],outdir:path.join(__dirname,'../meteo/assets'),entryNames:'app-'+version,define:{'process.env.NODE_ENV':'"production"'}});
