"""Isolated Meteo UI proof: fake weather, clock, blind and command log; no devices."""
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
shim='''<script>
Date.now=()=>parent.proofNow;
localStorage.setItem('casa-nl-meteo-v1',JSON.stringify({night:'on',nightPalette:'red',redSchedule:'night',focusSeconds:0}));
window.fetch=async()=>new Response(JSON.stringify(parent.proofWeather),{status:200,headers:{'Content-Type':'application/json'}});
</script>'''
page='''<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Teste botão matinal</title><style>body{margin:0}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}aside{position:fixed;bottom:0;left:0;z-index:100;background:#fff;padding:8px}button{padding:10px}pre{margin:0}</style><script src="meteo-core.js"></script><script>
window.proofNow=Date.UTC(2026,10,2,6,59);let position=0,online=true,busy=false;const commands=[];
const sec=s=>Date.parse('2026-11-02T'+s+'Z')/1000;
window.proofWeather={timezone:'Europe/Lisbon',current:{time:sec('07:00'),temperature_2m:14,relative_humidity_2m:70,apparent_temperature:13,is_day:0,precipitation:0,weather_code:0,wind_speed_10m:3,wind_direction_10m:0,pressure_msl:1021},daily:{time:[sec('00:00')],weather_code:[0],temperature_2m_max:[20],temperature_2m_min:[10],sunrise:[sec('07:00')],sunset:[sec('17:30')]},hourly:{time:[sec('07:00'),sec('08:00')],weather_code:[0,0],temperature_2m:[14,15],precipitation_probability:[0,0],is_day:[0,1]}};
const snapshot=()=>CasaMeteoCore.bedroomBlind({deviceId:'deadbeef0001'},{online,hasCover:true,calibrated:true,position,fetchedAt:proofNow},online?'ready':'offline',proofNow);
const api={isBusy:()=>busy,hasUnsavedChanges:()=>false,command:async(...args)=>{commands.push(args);document.getElementById('commands').textContent=JSON.stringify(commands);busy=true;await new Promise(r=>setTimeout(r,1000));busy=false;return true}};
window.CasaMeteoBridge={preferences:CasaMeteoCore.preferences,visible:()=>true,city:()=>null,ready(){},bedroomBlind:snapshot,blindBusy:()=>busy,lamp:()=>({configured:false,state:null,busy:false}),realTemperature:()=>({configured:false,temperature:null,status:'unconfigured'}),openMorningBlind:({sunrise,sunset})=>CasaMeteoCore.morningBlindAction(api,snapshot,()=>({red:document.querySelector('iframe').contentDocument.querySelector('main').dataset.nightPalette==='red',now:proofNow,sunrise,sunset}))};
function setProof(kind){if(kind==='sun')proofNow=Date.UTC(2026,10,2,7,0);if(kind==='before')proofNow=Date.UTC(2026,10,2,6,59);if(kind==='half'){position=50;online=true}if(kind==='closed'){position=0;online=true}if(kind==='offline')online=false;}
</script><iframe title="Meteo de teste" src="meteo/index.html"></iframe><aside><button onclick="setProof('before')">Antes do sol</button><button onclick="setProof('sun')">Nascer do sol</button><button onclick="setProof('half')">Estore50%</button><button onclick="setProof('closed')">Estore fechado</button><button onclick="setProof('offline')">Offline</button><button onclick="this.parentElement.remove()">Ocultar teste</button><pre id="commands">[]</pre></aside></html>'''
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  if self.path.startswith('/harness'):
   data=page.replace('</style>','iframe{width:375px;height:812px}</style>').encode() if 'phone' in self.path else page.encode()
  elif self.path.split('?')[0]=='/meteo/index.html':
   data=(ROOT/'meteo/index.html').read_text().replace('<div id="root">',shim+'<div id="root">').encode()
  else:return super().do_GET()
  self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(data)
ThreadingHTTPServer(('127.0.0.1',8103),lambda *args,**kwargs:Handler(*args,directory=str(ROOT),**kwargs)).serve_forever()
