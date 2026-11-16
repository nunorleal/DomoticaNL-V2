# MeteoNL integrada nas duas casas

O símbolo meteorológico no topo abre a MeteoNL. O botão da casa na MeteoNL regressa à planta. Por omissão, após 30 segundos sem interação na Casa NL, a MeteoNL abre automaticamente; a edição dos popups fica preservada ao regressar. Uma comunicação Shelly em curso adia esta transição. Isto é um protetor visual dentro da aplicação, não uma configuração do bloqueio físico do iPad.

A cidade é única, guardada pela Casa NL, e pode ser selecionada nas definições de qualquer ecrã. O horário de cabeceira da MeteoNL é uma preferência visual independente do modo diurno/noturno da planta.

A conta Shelly Cloud e os IDs continuam em Definições → Shelly Cloud · equipamentos. O botão da lâmpada no topo da MeteoNL controla o candeeiro `master` (quarto principal), com o ID, tipo e canal já configurados na Casa NL. A MeteoNL não guarda outra conta ou outro ID. Sem associação, o botão abre as definições centrais. Sem estado recente/confirmado, o primeiro toque consulta dados e não envia comandos; depois de confirmado, toque novamente para ligar/desligar. Ambos os ecrãs usam a mesma fila de pedidos e só mostram o estado reportado pelo Shelly.

As preferências de relógio, unidades e paisagem usam `casa-nl-meteo-v1`, incluído na exportação/importação JSON da Casa NL. A cidade é guardada apenas na configuração central. Não há migração automática de dados do antigo site MeteoNL, que tem outra origem no navegador; a configuração da Casa NL é a referência.

## Versão partilhada

A MeteoNL integrada na T2 é a única fonte mantida, em `DomoticaNL V2/meteo-src/`. A Casa Condados recebe o mesmo pacote gerado. A versão autónoma anterior é histórica e as suas preferências não são importadas automaticamente. O botão de meteorologia ou a navegação acima do piso superior abrem a MeteoNL da respetiva casa.

Definir a versão da MeteoNL em `meteo-src/app-info.ts` e alinhar `meteo-src/package.json`. Com as dependências locais instaladas, executar na raiz da T2:

```sh
node meteo-src/build.cjs
```

Se a pasta Casa Condados estiver noutro local, indicar `--condados <caminho>`. Se as dependências estiverem noutra pasta, passar o caminho de `node_modules` como primeiro argumento. O build gera os mesmos ficheiros JS e CSS, `meteo/index.html` para HTTP e `meteo/release.js` para o Safari com ficheiro local. Também sincroniza a cópia das fontes nos Condados, que é mantida para inspeção e testes. Os dois projetos podem ser publicados separadamente com os ficheiros da respetiva pasta. As pontes `meteo.js`, os dispositivos, as preferências e os recursos de cada casa continuam locais.

Executar `node --test tests/*.test.cjs` a partir da raiz de cada casa. Usar dados fictícios para validar equipamentos.

## Compatibilidade com ficheiros locais — 1.34

O bundle usa um script clássico IIFE, sem módulos de rede. Em file:// a janela MeteoNL usa srcdoc, herdando a origem da Casa NL, e uma base explícita para localizar os recursos. Isto evita o bloqueio de módulos locais e de acesso à configuração partilhada entre documentos file:// distintos no Safari. Em HTTP/HTTPS mantém o documento relativo meteo/index.html. A confirmação de montagem React oculta a indicação de carregamento; se falhar, fica sempre disponível Voltar à casa. Validado diretamente no Safari com a app aberta em file://, sem acionar candeeiros.

## Tempo do protetor — 1.35

Em Definições → Protetor de ecrã · MeteoNL, escolher 15 ou 30 segundos, 1, 2, 5, 10, 15 ou 30 minutos, ou Desativado. A alteração é imediata, reinicia a contagem e fica guardada automaticamente neste navegador. O valor inicial continua a ser 30 segundos. Desativar só impede a abertura automática; o botão da meteorologia continua disponível. A preferência usa casa-nl-screensaver-v1, incluída e validada na cópia JSON; cópias anteriores continuam compatíveis.

## Leitura Real — 1.76

RealTemperature.tsx apresenta por baixo da temperatura meteorológica a leitura do sensor já associado à varanda, com rótulo apenas Real. Usa CasaMeteoBridge.realTemperature → CasaMeteoCore.realTemperature, sem credenciais, IDs, consulta Cloud ou transporte próprio no iframe. Não interfere com previsão/cidade nem com o botão do candeeiro. Uma casa decimal e unidadeC/F de acordo com as preferências. Sem associação, ocultar; sem leitura, traço e Por consultar/Indisponível; com leitura antiga/offline/erro, identificar Última leitura. Disponível mesmo quando a previsão não carrega.

Abertura/minuto visível renovam o sensor pela ensureFresh da Casa; o componente apenas consulta a ponte a cada segundo. Filtro da ponte expõe só configured/temperature/status, sem segredos ou IDs e sem chamar hora de consulta hora da medição. Teste de qualidade em tests/meteo.test.cjs; 153 testes passaram. Prova visual iPad820×1180 em review/meteo-real-1.76.png usa leitura fictícia18,4°C, com zero comandos a dispositivos.
