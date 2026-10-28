# MeteoNL integrada — Casa NL 1.35

O símbolo meteorológico no topo abre a MeteoNL. O botão da casa na MeteoNL regressa à planta. Por omissão, após 30 segundos sem interação na Casa NL, a MeteoNL abre automaticamente; a edição dos popups fica preservada ao regressar. Uma comunicação Shelly em curso adia esta transição. Isto é um protetor visual dentro da aplicação, não uma configuração do bloqueio físico do iPad.

A cidade é única, guardada pela Casa NL, e pode ser selecionada nas definições de qualquer ecrã. O horário de cabeceira da MeteoNL é uma preferência visual independente do modo diurno/noturno da planta.

A conta Shelly Cloud e os IDs continuam em Definições → Shelly Cloud · equipamentos. O botão da lâmpada no topo da MeteoNL controla o candeeiro `master` (quarto principal), com o ID, tipo e canal já configurados na Casa NL. A MeteoNL não guarda outra conta ou outro ID. Sem associação, o botão abre as definições centrais. Sem estado recente/confirmado, o primeiro toque consulta dados e não envia comandos; depois de confirmado, toque novamente para ligar/desligar. Ambos os ecrãs usam a mesma fila de pedidos e só mostram o estado reportado pelo Shelly.

As preferências de relógio, unidades e paisagem usam `casa-nl-meteo-v1`, incluído na exportação/importação JSON da Casa NL. A cidade é guardada apenas na configuração central. Não há migração automática de dados do antigo site MeteoNL, que tem outra origem no navegador; a configuração da Casa NL é a referência.

## Publicar

Publicar o conteúdo completo de `dist/`, incluindo `meteo/` e os novos ficheiros `meteo*.js` e `meteo.css`. Funciona com ficheiros estáticos no GitHub Pages, na raiz ou numa subpasta. Não é necessário Node ou servidor Python em produção. Não há carregamento da app MeteoNL a partir de outro domínio nem novo service worker a substituir a aplicação.

A pasta original MeteoNL/PUBLICAR-GITHUB e o código original não foram alterados. Os ambientes e recursos fornecidos foram copiados para `meteo/`; as fontes adaptadas estão em `meteo-src/`. Não publicar cópias JSON pessoais com credenciais.

## Manutenção

Os ficheiros servidos estão em `meteo/index.html` e `meteo/assets/app-1.35.js` / `app-1.35.css`. Para recompilar alterações React, instalar as dependências descritas em `meteo-src/package.json` dentro dessa pasta e executar `npm run build`. O script também aceita uma pasta node_modules existente e, opcionalmente, o caminho do módulo esbuild como terceiro argumento. Só escreve em `dist/meteo/assets/`.

Atualizar a versão em `version.json`, nos metadados e referências do index principal, em `meteo.js`, `meteo/index.html` e `meteo-src/app-info.ts`; recompilar as fontes. Evitar o script antigo de versões fora de dist.

Testes: `node --test casa-nl/tests/*.test.cjs casa-nl/dist/tests/*.test.cjs` a partir da pasta Domótica NL. Os testes anteriores são apenas lidos; todos os novos testes estão em dist. Testes de UI usam exclusivamente `dist/tests/serve_lights_fixture.py`, com IDs fictícios e interceção de todos os pedidos Shelly. Nunca testar comandos em equipamentos físicos.

## Compatibilidade com ficheiros locais — 1.34

O bundle usa um script clássico IIFE, sem módulos de rede. Em file:// a janela MeteoNL usa srcdoc, herdando a origem da Casa NL, e uma base explícita para localizar os recursos. Isto evita o bloqueio de módulos locais e de acesso à configuração partilhada entre documentos file:// distintos no Safari. Em HTTP/HTTPS mantém o documento relativo meteo/index.html. A confirmação de montagem React oculta a indicação de carregamento; se falhar, fica sempre disponível Voltar à casa. Validado diretamente no Safari com a app aberta em file://, sem acionar candeeiros.

## Tempo do protetor — 1.35

Em Definições → Protetor de ecrã · MeteoNL, escolher 15 ou 30 segundos, 1, 2, 5, 10, 15 ou 30 minutos, ou Desativado. A alteração é imediata, reinicia a contagem e fica guardada automaticamente neste navegador. O valor inicial continua a ser 30 segundos. Desativar só impede a abertura automática; o botão da meteorologia continua disponível. A preferência usa casa-nl-screensaver-v1, incluída e validada na cópia JSON; cópias anteriores continuam compatíveis.

## Leitura Real — 1.76

RealTemperature.tsx apresenta por baixo da temperatura meteorológica a leitura do sensor já associado à varanda, com rótulo apenas Real. Usa CasaMeteoBridge.realTemperature → CasaMeteoCore.realTemperature, sem credenciais, IDs, consulta Cloud ou transporte próprio no iframe. Não interfere com previsão/cidade nem com o botão do candeeiro. Uma casa decimal e unidadeC/F de acordo com as preferências. Sem associação, ocultar; sem leitura, traço e Por consultar/Indisponível; com leitura antiga/offline/erro, identificar Última leitura. Disponível mesmo quando a previsão não carrega.

Abertura/minuto visível renovam o sensor pela ensureFresh da Casa; o componente apenas consulta a ponte a cada segundo. Filtro da ponte expõe só configured/temperature/status, sem segredos ou IDs e sem chamar hora de consulta hora da medição. Teste de qualidade em tests/meteo.test.cjs; 153 testes passaram. Prova visual iPad820×1180 em review/meteo-real-1.76.png usa leitura fictícia18,4°C, com zero comandos a dispositivos.
