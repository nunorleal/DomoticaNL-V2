# Temporal na MeteoNL — 2.91

Render `../meteo/weather-backgrounds/storm-v2.png`, criado com a ferramenta image_gen integrada, usando o fundo storm.webp apenas como referência visual. O original é preservado.

Prompt exato usado na ferramenta integrada:

```text
Use case: lighting-weather. Create a new high quality cinematic photorealistic storm background for the MeteoNL weather app, based on this reference image of the Portuguese Atlantic coast and small red topped lighthouse on a stone breakwater. Preserve the recognizable coastal setting and the lighthouse to the right of centre. Develop an intense Atlantic temporal: immense layered dark slate blue thunderclouds, distant rain curtains across the sea, rough teal ocean, whitecaps and wind blown sea spray, wet rocky shore. Subdued cool light and dramatic cloud depth. IMPORTANT remove all static visible lightning bolts and orange glows from the reference: lightning will be animated in code later, so this image must have NO lightning bolts. No text, no UI, no people, no borders. Compose as a landscape wide image suitable for cover cropping on landscape and portrait tablets: the central sky remains simple and dark for legible white clock text, lighthouse and horizon stay visible in central crop. Horizon around 62 percent down, ocean and rocks below. Render final image with realistic fine detail and no excessive blur.
```

StormAtmosphere monta apenas em storm. Raios variáveis com ramos e brilho localizado, intervalo de vários segundos, 48 traços de chuva e 9 rajadas CSS atrás do conteúdo. A intensidade usa a preferência existente. O scheduler usa no máximo dois timeouts, pára ao ocultar/desmontar e respeita animações desligadas e movimento reduzido. Sem som, rede adicional ou comandos Shelly. O modo vermelho mantém as regras existentes.

Pré-visualização: MeteoNL → Definições → Viajar pela paisagem → Trovoada / temporal. A seleção automática de trovoada continua a usar os códigos meteorológicos existentes.
