"""Meteo indoor sensor UI fixture: fake sensors/weather, no network or commands."""
import ast,sys
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
ROOT=Path(__file__).resolve().parents[1]
values={node.targets[0].id:ast.literal_eval(node.value) for node in ast.parse((ROOT/'tests/serve_morning_fixture.py').read_text()).body if isinstance(node,ast.Assign) and isinstance(node.targets[0],ast.Name) and node.targets[0].id in ('page','shim')}
page=values['page'].replace('Teste botão matinal','Teste sensor interior').replace('const api=',"const sensors=[{id:'master',name:'Quarto principal',configured:true},{id:'living',name:'Sala',configured:true},{id:'cellar',name:'Cave',configured:true}];let selected='master';const climate=id=>({temperature:id==='living'?23.4:id==='cellar'?17.2:20.1,humidity:id==='living'?61:72,online:true,fetchedAt:proofNow});const api=")
page=page.replace('window.CasaMeteoBridge={preferences:',"window.CasaMeteoBridge={indoorSensors:()=>sensors,selectIndoorSensor:id=>{selected=id;return true},bedroomClimate:()=>CasaMeteoCore.indoorClimate(selected,sensors,climate,proofNow),preferences:")
shim=values['shim'].replace("night:'on'","night:'off'")
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  if self.path.startswith('/harness'):data=page.encode()
  elif self.path.split('?')[0]=='/meteo/index.html':data=(ROOT/'meteo/index.html').read_text().replace('<div id="root">',shim+'<div id="root">').encode()
  else:return super().do_GET()
  self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(data)
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),lambda *args,**kwargs:Handler(*args,directory=str(ROOT),**kwargs)).serve_forever()
