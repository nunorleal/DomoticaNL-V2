/* node build.cjs /path/to/node_modules. All generated files stay in dist/meteo. */
const path=require('node:path'),fs=require('node:fs');
const version=JSON.parse(fs.readFileSync(path.join(__dirname,'../version.json'),'utf8')).version;
const dependencies=path.resolve(process.argv[2]||path.join(__dirname,'node_modules'));
const esbuild=require(process.argv[3] || require.resolve('esbuild',{paths:[dependencies]}));
esbuild.buildSync({entryPoints:[path.join(__dirname,'main.tsx')],bundle:true,minify:true,format:'iife',target:['safari15'],jsx:'automatic',nodePaths:[dependencies],outdir:path.join(__dirname,'../meteo/assets'),entryNames:'app-'+version,define:{'process.env.NODE_ENV':'"production"'}});
