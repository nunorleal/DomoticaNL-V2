# Âmbito das alterações

Por instrução explícita do utilizador, a partir de agora todas as alterações deste projeto devem ficar exclusivamente dentro de `dist/`, cujo conteúdo é colocado no GitHub. Não alterar ficheiros noutras pastas para implementar, documentar, testar ou versionar mudanças.

Cada entrega deve funcionar apenas com o conteúdo de `dist/`, também quando este estiver na raiz de um branch do GitHub Pages. Manter recursos com caminhos relativos e a ligação direta à Shelly Cloud sem depender de um servidor local.

Preservar o incremento da versão visível a cada alteração funcional, mas respeitar o âmbito acima: não executar o antigo script de versões se este escrever fora de `dist/`. Quando necessário, manter a versão e a respetiva atualização dentro desta pasta. O registo desta preferência, por si só, não altera a versão da aplicação.

Manter as restantes regras de iluminação, configurações, privacidade e comandos Shelly do projeto que sejam compatíveis com esta instrução. Nunca usar equipamentos reais em testes de movimentos.

# Candeeiros em planta

Os candeeiros da sala e dos quartos são vistos rigorosamente de cima: nunca mostrar pés, hastes ou bases. `lamps.js` insere apenas discos locais das imagens `assets/candeeiros-*-v1.png`; os restantes píxeis gerados não são usados. Posições nas coordenadas 1024×1536: quarto principal (737,223), quarto 2 (750,534), sala (475,840). Manter alinhados os três estados: diurno, apagado e elétrico. Os grupos de render noturno/elétrico incluem a imagem original e o respetivo disco para misturar a opacidade em conjunto. Preservar a camada branca de paredes acima de tudo.

A versão atual dentro desta pasta está em `version.json` e nos metadados, texto visível e parâmetros de cache de `index.html`. Não usar o ficheiro de versão antigo fora de `dist/`.

# Associações dos candeeiros

A configuração `casa-nl-shelly-cloud-v1` inclui opcionalmente `lightBindings`, separada de `bindings` dos estores. Chaves das luzes: master, bedroom2, living; cada entrada contém deviceId hexadecimal, canal inteiro 0..15 e tipo switch/light. Não reutilizar o mesmo ID/canal para dois equipamentos. Configurações e backups antigos sem este campo mantêm o formato original e continuam compatíveis. A exportação/importação valida e preserva as luzes através de ShellyCore.config. A chave de autorização segue as regras da conta existente.

Desde a versão 1.27 os três candeeiros associados têm controlo real: comandos explícitos on=true/false por set/switch ou set/light, usando o ID/canal/tipo guardados e a fila partilhada com os estores. O popup, Ligar todas e Apagar todas controlam os candeeiros Cloud; os restantes equipamentos continuam simulados. Cenários de demonstração preservam luzes e estores reais. Repor demonstração reaplica as últimas leituras reais sem enviar comandos.

Guardar/carregar/importar/consultar nunca aciona equipamentos. A consulta inicial ou depois de guardar é apenas de leitura. A planta e os interruptores só mudam com o estado booleano reportado, nunca com a aceitação HTTP de um comando. Dados ausentes, offline, erros e saída/tipo/canal desconhecidos são identificados; não deduzir estados a partir da potência. Os botões reais exigem dados online recentes. Depois de um comando, consultar imediatamente e acompanhar o estado a cada 2 segundos, até 90 segundos; nunca repetir automaticamente um comando falhado. Preservar a compatibilidade Gen1 relays/lights e Gen2 switch:n/light:n.

Testes de configuração, backup, normalização e transporte estão em tests/shelly-lights.test.cjs dentro desta pasta. A fixture tests/serve_lights_fixture.py usa apenas IDs/chave fictícios, interceta todas as chamadas Shelly e simula os estados. Nunca executar testes de botões com dispositivos reais.

# Deteção da saída de luz — 1.28

O tipo guardado é uma preferência. `lightStatus` enumera saídas switch:n/relays e light:n/lights da resposta, apenas no canal configurado. Se só existir uma família nesse canal, utiliza a família real mesmo que a preferência seja outra; se existirem ambas, respeita a preferência. `resolvedLightCommand` usa o tipo detetado e exige correspondência exata de canal. Não reescrever automaticamente as associações, não mudar de canal e não experimentar endpoints por envio de comandos. Sem saída no canal, bloquear e mostrar as saídas disponíveis. A fixture suporta ?wrongtype (três preferências switch com saídas light) e ?wrongchannel.

# Sensores de temperatura e humidade — 1.29

Associações opcionais em `sensorBindings` na mesma configuração Cloud: living e master, com deviceId, temperatureChannel e humidityChannel (ambos 0 por omissão, inteiros 0..255). Não alterar os esquemas antigos quando este campo estiver ausente. Validar na importação e preservar no backup. Sensores podem partilhar o dispositivo com uma saída já associada; deduplicar IDs em `deviceIds`, com até 9 dispositivos distintos numa consulta.

Consultar apenas dados reais em temperatura/humidade: Gen1 H&T tmp/hum com indicadores is_valid e unidades, Gen2+ temperature:n.tC e humidity:n.rh. Nunca usar a temperatura interna de um relé como temperatura ambiente. Valores inválidos/ausentes ficam indisponíveis, não zero. Leituras válidas de sensores offline podem ser exibidas como últimas disponíveis, com indicação de offline/repouso. Mostrar hora de consulta como consulta, nunca como hora da medição. Bateria opcional bat.value/devicepower:0.battery.percent.

Os popups da sala e do quarto principal mostram os sensores, com atualização manual e consulta periódica de 60 segundos quando a app está visível; abertura da divisão renova dados antigos. Guardar sensores e importar só podem provocar leituras. Não adicionar os sensores a nenhum fluxo de comandos de iluminação/estores. Testes em tests/shelly-sensors.test.cjs; fixture isolada suporta ?sensors, ?sensorsonly, sensoroffline e invalidsensor.

# Grupos das definições — 1.30

Os grupos Sensores, Luzes e Estores usam details/summary nativos (`.shelly-equipment-group`), fechados por omissão e independentes. Manter os campos no DOM ao colapsar para preservar a edição e a leitura do formulário. A validação nativa abre todos os details antecessores de um campo inválido para permitir corrigir/focar o campo. Abrir/fechar grupos não guarda configurações nem envia comandos. Os botões gerais Guardar configuração e Consultar dados dos equipamentos ficam fora dos grupos.

# Leituras nos banners — 1.31

Os banners dos nomes de divisões com sensor associado incluem temperatura e humidade por baixo do nome, usando exclusivamente CasaShelly.sensorReading. Sem associação, o banner mantém apenas o nome. Não inventar valores ausentes; mostrar traço. Leituras offline/em erro/desatualizadas com valores são assinaladas como Última leitura. O mesmo botão mantém clique, duplo clique, teclado e arrastamento. Recalcular a contenção do retângulo completo depois de atualizar leituras ou mostrar os banners para manter o banner dentro da divisão. Ocultar nomes oculta também as leituras desse banner.

# Cartões de informação — 1.32

As informações por equipamento em `#shelly-data` também usam details/summary (`data-shelly-result` com tipo + ID estável da divisão), fechados por omissão. O título identifica a divisão e o subtítulo distingue estore, candeeiro e sensor. Preservar quais cartões estão abertos quando summary() atualiza as leituras; abrir/fechar nunca envia pedidos Cloud ou comandos. Não aplicar este colapso aos controlos do popup da divisão.

# MeteoNL integrada — 1.33

MeteoNL funciona em `meteo/`, num iframe da mesma origem, aberto pelo botão de meteorologia ou após 30 segundos sem interação na Casa NL. `meteo-core.js` gere o temporizador e valida as preferências; `meteo.js` gere a navegação e a ponte com a Casa. Preservar os popups/campos em edição ao entrar/sair. O botão de casa no topo da MeteoNL permite regressar. O temporizador nunca envia comandos e adia a mudança durante comunicações Shelly em curso.

Não adicionar credenciais/IDs nem um transporte Shelly à MeteoNL. O botão do candeeiro usa exclusivamente CasaShelly.lampSnapshot/commandLight para `master`, com consulta em falta de estado recente, sem atuação nessa primeira consulta. Manter os comandos explícitos, fila única e estado confirmado. `lampSnapshot` só expõe configuração presente, estado, disponibilidade e mensagens seguras: nunca segredo nem ID. A cidade usa CasaEnvironment.selectCity/getState; as preferências visuais não guardam outra cidade. `casa-nl-meteo-v1` é validado e incluído no backup; caches de previsão da MeteoNL são regeneráveis e não exportadas.

Fontes adaptadas em `meteo-src/`, compiladas para `meteo/assets/` com esbuild; não editar apenas o bundle. Não modificar o projeto original MeteoNL. Não registar o antigo service worker da MeteoNL. Preservar caminhos relativos e publicação estática em GitHub Pages. Ver METEONL.md para manutenção e testes.

# Carregamento local da MeteoNL — 1.34

Preservar formato IIFE no build e script clássico (sem type=module). No Safari, documentos file:// diferentes não partilham necessariamente a origem: usar iframe.srcdoc herdando a origem do pai e base para meteo/. Em HTTP/HTTPS manter iframe relativo. Não contornar proteções do navegador nem pedir para as desativar. A montagem React chama CasaMeteoBridge.ready; até essa confirmação, disponibilizar o regresso à casa. Não validar apenas no servidor local: verificar também abertura direta em Safari.

# Tempo configurável do protetor — 1.35

O seletor #screensaver-delay nas definições da Casa controla imediatamente o temporizador, reiniciando a contagem. Opções em segundos: 0 (desativado), 15, 30, 60, 120, 300, 600, 900, 1800; omissão 30 para instalações/cópias antigas. Persistir em casa-nl-screensaver-v1 como {seconds}, validar com CasaMeteoCore.screensaver e incluir no backup. Não reutilizar as preferências React da MeteoNL para não haver escritas concorrentes. Desativar não bloqueia abrir manualmente nem envia pedidos/comandos Shelly. Preservar a suspensão durante comunicações e a edição dos popups.

# Piso −1 — 1.36

Novo piso estático em floors.js/floors.css com cave 6 × 1,5 m e carro à direita (assets/carro-eletrico-recortado-v1.png), usando o mesmo fundo de paralelos. A porta é em baixo; paredes continuam brancas. Não alterar os renders, máscaras, IDs/estados do piso 0. Não acrescentar comandos/percentagens fictícias do veículo ou associações Shelly sem pedido.

Desde 1.37, a cave fica por baixo da casa: scroll para baixo / swipe para cima no piso 0 abre −1; scroll para cima / swipe para baixo em −1 regressa a 0. Animar a cave a entrar de baixo e a casa de cima; botões Descer/Subir. Botão no rodapé e Casa permitem a navegação por clique. Bloquear mudanças dentro dos popups e durante MeteoNL. Preservar arrastamento dos banners, supressão de cliques após swipe, limite entre transições e preferência de movimento reduzido. Incluir os dois pisos e o popup da cave no contentor Casa antes da inicialização de meteo.js. A MeteoNL preserva o piso ao regressar. Ver PISO-CAVE.md para dimensões, recurso gerado, prompt e verificações.

# Indicadores de piso — 1.38

Duas bolinhas verticais no lado esquerdo, a meio da altura: botão superior para piso 0 e inferior para −1. Marcar apenas o piso visível com aria-current=page, círculo preenchido e maior. Cada alvo tem 44 × 44 px, nome acessível e permite mudar de piso. A indicação deve acompanhar scroll, swipe, botão do rodapé e Casa. Incluir a navegação no contentor inerte quando a MeteoNL abre.

# Ajustes visuais da cave e navegação — 1.39

Retirar medidas da planta, banner e popup da cave. A cave passa à proporção visual equivalente a 2 m de largura, expandindo para a esquerda através de .cellar-outline e preservando o alinhamento da parede direita, porta e carro. Não reintroduzir cotas visíveis. Bolinhas de 5/8 px, próximas (28 px entre centros), mantendo alvos de toque separados de 44 px. Reservar margem lateral para não encostar à planta. Garantir contraste em dia e noite. A indicação inferior usa apenas texto/seta subtil, sem cápsula nem sombra, com espaço acima do menu principal.

# Carregamento do carro — 1.40

Associação opcional `ev` na mesma configuração Shelly Cloud: meter, totalMeter opcional, relay e thresholdWatts (1..1000, omissão 50 W). Shelly EM pode usar o mesmo ID para a pinça e o relé, com canais independentes. Validação e backup via ShellyCore.config; preservar configurações antigas sem ev. Duplicar saída de atuação de luz/estore é proibido; partilhar ID/canal apenas para leitura é permitido. Consultas de até 12 dispositivos distintos em lotes de no máximo 10, na fila comum.

EVCore normaliza W/kWh: emeters Gen1 total Wh, meters Gen1 total Watt-minute, Gen2 switch/pm1 aenergy.total Wh, em1data.total_act_energy Wh e emdata.total_act Wh. Não inventar zeros ausentes, não converter consumo negativo para positivo, não somar famílias ambíguas. O tipo auto exige só uma família no canal exato.

A alimentação visual segue exclusivamente o booleano do relé reportado; o cabo conectado e a animação seguem apenas potência válida, online e recente acima do limiar. Sem dados recentes (45 s), erro ou offline: cabo recolhido, consumo por confirmar, atuação bloqueada; total anterior identificado como última leitura. Não inferir ficha física, bateria ou carga completa. Atualização a cada 15 s visível; não controlar automaticamente pelo consumo.

Ligar/desligar o ponto é só por botão explícito no popup, com ID/canal do relay e set/switch, estado recente e configuração guardada. Usar a mesma fila, geração, proteção de credenciais e confirmação por consulta. Não retry, não estado otimista. O carregador nunca pertence a all-lights, all-blinds, cenários nem reset. Guardar/importar/carregar/abrir popup só consulta.

UI em ev.js/ev.css, associada à parking-space depois de floors.js e antes de meteo.js. Os pixeis do carro e renders da casa não são alterados. Testes apenas com fixture fictícia; ver CARREGAMENTO-EV.md e tests/ev.test.cjs.


# Navegação simplificada — 1.44
Por pedido do utilizador, retirar a legenda «Cave · Entrada pela porta inferior» e os textos/botões «Subir/Descer» do rodapé. A indicação dos pisos usa apenas as duas bolinhas discretas à esquerda, centradas verticalmente: cima = casa, baixo = cave, piso atual mais carregado. Preservar clique nas bolinhas, scroll, swipe e botão Casa.

# Porta de entrada — 1.46

A entrada na esquerda da sala usa três pequenos recortes gerados de porta fechada, um por ambiente, aplicados apenas à sala por CasaDoor.patch dentro de drawRoomLighting. Preservar todo o resto da planta e a máscara branca. Só ocultar esses recortes para mostrar a porta aberta com leitura true válida; unknown/offline/error/stale mostram visual fechado e legenda por confirmar. Config opcional door na mesma conta Shelly, validação e backup partilhados; apenas leituras na fila normal. Modo BLU window e alternativa BTHomeSensor de gateway configurado para contacto obj_id45; nunca inferir por luminosidade, ângulo, bateria ou saída de relé e nunca configurar/acionar o sensor. Ver PORTA-ENTRADA.md sobre limites dos payloads Cloud e testes fictícios.

Desde 1.47, IDs BLU podem ter formato XB seguido de dígitos decimais. Preservar o ID completo nas leituras/config/backup e usar ShellyCore.statusDeviceId só no transporte de consultas. Não substituir pelo MAC nem remover XB. Todos os atuadores e o gateway BTHome continuam a exigir ShellyCore.deviceId hexadecimal. Comparar resposta e associação BLU sem distinguir maiúsculas/minúsculas, inclusive na deteção de alterações do formulário.


# Geometria correta da entrada — 1.48
A porta principal fecha na HORIZONTAL, no vão inferior do recanto à esquerda da sala, entre x129 e x194 junto a y1058. Não fechar ao longo da parede esquerda vertical. Usar variantes porta-fechada-*-v2.png com recorte SVG x119,y975,w76,h89; preservar paredes brancas e todos os restantes pixels dos renders originais. A versão v1 tinha orientação incorreta.

# Contador geral — 1.49

energy-core/energy.js/energy.css: monitor apenas de leitura. Reutiliza ID do EM do carro por omissão, canal 0, contrato 6,9 kVA; não modificar a associação do carro. homeEnergy opcional validado em ShellyCore.config e no backup; ID manual possível. deviceIds deduplica também este ID; todos os lotes continuam até dez, sem limite total artificial de 12. Ler emeters[channel] com validade/frescura; calcular kVA com hypot(power,reactive), nunca equiparar kW/kVA nem assumir reativa zero quando ausente. Cor neutra em offline/erro/stale/desconhecido; total anterior explicitamente antigo. Banner esquerdo na sala com popup, preferência booleana casa-nl-show-energy-banner, check igual/alinhado aos outros e acesso em Controlos gerais. Ocultar/guardar/importar/carregar/consultar nunca aciona equipamentos. Usar fila, conta, geração e temporizador partilhados existentes. Ver CONTADOR-GERAL.md e testes fictícios.

# Porta da cave — 1.51

cellarDoor opcional na configuração Shelly, independente do campo legado door da entrada. Mesmo schema BLU/BTHome, IDs XB preservados, config/backup/consultas partilhados. Rejeitar contacto duplicado para as duas portas, permitir gateway com componentes distintos. doorSnapshot('cellar') e doorEnsureFresh('cellar') apenas leem. Cave mostra estado no banner/popup e atalho de associação. O desenho da cave é SVG nativo em floors.js: grupos cellar-door-closed (horizontal no vão inferior, por omissão) e cellar-door-open (folha/arco originais). Só mostrar aberto com leitura true válida, através de body.cellar-door-is-open; erros/unknown/offline/stale mantêm desenho fechado e legenda por confirmar. Não alterar a porta principal, chão, carro, paredes nem geometria. Testes sempre fictícios; ver PORTA-ENTRADA.md.

# Alarme e banners da cave — 1.52

alarm opcional na configuração Cloud, com papéis arm (atuador) e trigger (só leitura). Utilizador confirmou ON=armado, OFF=desarmado. Outro Shelly indica disparo; nunca o comandar. Config/polaridade/IDs/canais em alarm-form.js; validação, backup e transporte partilhados. Estado estritamente de relays/switch, online/fresco; disparo true tem prioridade mesmo com arm false/desconhecido. Halo verde armado, cinzento desarmado, vermelho intermitente no disparo, âmbar desconhecido/parcial. Sem respostas não inventar silêncio nem desarmado. Atuação explícita de arm, sem retry/estado otimista, confirmar por consulta e suspender protetor enquanto pendente; nunca grupos/reset/cenários.

Cave, alarme e EV são arrastáveis por rato/toque através de basement-layout.js, depois de floors/alarm/ev e antes de meteo. Preservar clique normal e suprimir clique após drag; excluir .basement-movable de swipes de piso. Posições percentuais em casa-nl-basement-layout-v1, validadas/restauradas pelo backup-core e ajustadas dentro da cave/estacionamento ao redimensionar/mudar piso. Não reposicionar/alterar carro ou renders. Ver ALARME-CAVE.md, testes de alarm e basement-layout, e fixtures estritamente fictícias.

# Ventoinha da cave — 1.53

fan opcional {deviceId,channel}, null para remoção explícita. Migração única validada para ID pedido 8819dc/canal0, preservando política de credenciais; nunca atuar ao guardar/carregar/importar. Mesmo transporte, geração, consultas e polling de confirmação. Estado real booleano relays/switch exato, fresco45s, sem inferência de consumo nem atualização otimista. Animação apenas ON confirmado, parar em desconhecido/offline/stale. Excluir grupos de luzes, cenários/reset e alarme. Banner fan arrastável/backup via basement-layout; ícone SVG visto de cima, sem pés. Ver VENTOINHA-CAVE.md e tests/fan.test.cjs. Testes só com mocks.

# Temperatura da cave — 1.54

sensorBindings aceita cellar com type opcional environment/door-window2. Door Window 2 (SHDW-2 ou tipo explicitamente associado) lê tmp no componente0 sem exigir humidade. Preservar a exclusão da temperatura interna de relés genéricos, validade, erros e ausência de valores. Migração única associa ID pedido 7dc19d, componentes0, só leitura, com marcador booleano casa-nl-cellar-temperature-added-v1 incluído/validado no backup; preservar associação existente e permitir retirar sem voltar a adicionar. Mesma conta, fila, lotes e polling dos sensores. Banner Cave mostra temperatura, traço quando inválida e Última leitura em offline/erro/stale. Popup mostra temperatura/bateria/qualidade/hora da consulta, sem humidade inventada e sem confundir contacto da porta com este sensor. Atualizar dados consulta porta e sensor; atalho Sensor de temperatura abre Sensores/Cave. Ver cellar-temperature.js e fixture cellartemp=online/offline/invalid, exclusivamente fictícia.

# Diagnóstico do gateway da porta — 1.56

ID e465b8b9c64c indicado como possível gateway, não confirmado. door-gateway.js acrescenta verificação explícita só de leitura no grupo Porta de entrada. Não migrar BLU para gateway nem supor componente200. Campo de diagnóstico temporário, associação/config/backup anteriores intactos. CasaShelly.inspectDoorGateway usa conta/fila/geração existentes, valida ID hexadecimal, bloqueia configuração suja e só chama status/get. DoorCore.inspectGateway devolve dados mínimos (online/ausente/componentes BTHome, número/booleano/últimoevento); não infere contacto de valor ou nome. Confirmar obj_id45 no gateway antes de associação BTHome manual. Sem criação/configuração de componentes nem atuação. Testes fictícios; estado real continua por verificar.

# Estado BLU window.open — 1.57

DoorCore.status deve aceitar window:N.open além de value legado; false explícito nunca cai num fallback. Se ambos presentes e divergentes/inválidos, manter unknown. Preservar guardas offline/erros/stale/canal e estado/render fechado por omissão. Não substituir o ID BLU pelo gateway só porque este está online. Sensor original funciona na app oficial segundo o utilizador; diagnóstico gateway sem BTHome. Não alegar teste real: regressões com mocks incluem formato open true/false e XB. InspectSensor/inspectDoorSensor e botão Verificar sensor BLU são só leitura, pela mesma fila/conta/geração, com dados mínimos e sem segredos/valores arbitrários. Ver PORTA-ENTRADA.md.

# Diagnóstico BLU também na cave — 1.58

inspectDoorSensor(doorId='entrance') aceita apenas entrance/cellar; cave usa config.cellarDoor e nunca recorre ao ID da entrada quando não associada. Botões e resultados de diagnóstico únicos em ambos os grupos. Preservar normalizador window.open, renders e polling comuns; nenhuma migração/cópia de IDs ou gateway entre portas. Testes de seleção de ID e interface sempre fictícios.

# Popup da consola de televisão — 1.59

media.js/media.css e assets/multimedia-sala.png reutilizam integralmente a imagem fornecida pelo utilizador, sem edição do render da planta. Botão #open-media-console sobre a consola (x310..447/y803..846 nas coordenadas1024x1536), acesso no popup da sala via CasaMedia.decorateRoom e nos Controlos gerais. Popup #media-dialog responsivo, imagem inteira sem recorte e fechar acessível, integrado antes de meteo.js para preservar inert/navegação existente. Estados Ligada/Ligado estão impressos na imagem e são explicitamente ilustrativos; não inferir leituras reais, associar IDs nem enviar comandos. A imagem e os rótulos não são ainda controlos de equipamentos. Preservar associação futura independente de luzes/estores. Verificação iPad vertical820x1180 e desktop, zero comandos na fixture; prova review/multimedia-sala-1.59.png.

# Associações da sala e IDs reservados do escritório — 1.60

Utilizador corrigiu os primeiros quatro IDs: pertencem ao escritório, não à sala. Preservar officeBindings (monitor441db8, apollo e43ad8, terramaster e9df12, blackdrive bb8ac4; canal0) só para guardar/backup/edição futura, sem consulta/controlo pelo popup atual. mediaBindings da sala: tv437c82, soundbar4359bb, playstation435aa1, vodafone e465b8b9c64c, unifi e465b84553bc, canal0 editável. Defaults apenas em campos ausentes, não substituir edições/remover{}; campos opcionais continuam compatíveis e validados no backup. Proibir saídas duplicadas entre todos os atuadores, permitir gateway/contacto só de leitura partilhar ID.

Banners da imagem deixam de ser referências: HTML cobre os textos/estados impressos e pontos, mostrando só energia do relé confirmado. Não chamar a energia estado operacional da TV/consola/router. MC.IDS só admite os cinco da sala, MC.OFFICE_IDS guardados separadamente; deviceIds exclui escritório. Fila/credenciais/geração/polling comuns; sem estado otimista, retry, ligação automática ou participação em cenários/reset/grupos. Popup cabe sem scroll em iPad820×1180 e768×1024 com cabeçalho, imagem e painel fixos. Ver MULTIMEDIA.md, tests/media.test.cjs e fixtures fictícias; não acionar dispositivos reais em testes.

# Consumos na multimédia — 1.61

mediaReadings[id].meter usa EV.meterStatus no mesmo ID/canal, auto sem ambiguidade, na consulta já existente. MC.state powerWatts/energyKWh só com medidor válido online, sem erros e fresco45s; null/Não disponível quando ausente/inválido/offline/stale, preservar zero medido sem o inferir de OFF. BannersW e painelW/kWh acumulados, sem alegar período de consumo. Preservar relé separado de medição, IDs/canais/backup e escritório reservado. Popup continua sem scroll em768×1024. Testes de media e fixture medianometer/mediainvalid/media=offline; só simulação.

# TV e PS5 pelo consumo — 1.62

Nova instrução explícita do utilizador substitui a regra puramente relé apenas paraTV/PS5:0W real=off;Wpositivos=on; ausente/inválido/negativo/offline/stale=unknown. MC.activityFromPower e snapshot.activity não alteram snapshot.on nem comandos/guardas de relé. UI mostra Ligada/Desligada e Relé separado no painel. SVG nativo TVpreta e PS5LEDsoff/onazul, bitmap/fotografia intactos; unknown visual neutro sem emissão com legendaPorconfirmar. Nenhuma atuação automática por potência. Watts pequenos não devem arredondar para0 e contradizer atividade. Outros dispositivos/escritório permanecem como antes. Ver MULTIMEDIA.md e testes fictícios.

# Limiar de standby da TV — 1.63

Por pedido do utilizador, TV off com0..4W inclusive e on apenas>4W. MC.activityThreshold('tv')=4 aplicado por mediaSnapshot. PS5 continua>0W. Não aplicar limiar às leituras exibidas nem comutar relés automaticamente. Unknown mantém guardas anteriores. Ver testes de fronteira e snapshot em media.test.cjs.

# Iluminação da consola — 1.64

Render alternativo assets/multimedia-sala-luz-apagada-v1.png, gerado com imagegen incorporado a partir do original. Candeeiro e LEDs da consola seguem só a luz living: estado booleano real válido online sem erros e recente45s; sem associação usar a simulação da divisão. Unknown usa render sem emissão e legenda por confirmar. TV/PS5 mantêm estados independentes pelo consumo. Não enviar comandos ao abrir/trocar render; mesma conta/consulta. Prompt em MULTIMEDIA-RENDER.md.

# Secretária do Gui — 1.65

office.js reutiliza integralmente assets/secretaria-gui.png fornecida pelo utilizador; sobrepor HTML aos quatro banners e cabeçalho impressos. Desenho SVG visto de cima na área marcada do quarto bedroom2, botão #open-office-desk; acessos também no popup do quarto e Controlos gerais. Popup completo sem scroll em iPad768×1024 e820×1180.

A instrução atual ativa officeBindings anteriormente reservados: monitor441db8, apollo e43ad8, terramaster e9df12, blackdrive bb8ac4, canais editáveis. Não mover para mediaBindings nem reescrever associações existentes. deviceIds inclui escritório, com lotes até10 e mesma conta/fila/geração. mediaSnapshot normaliza ambos, commandMedia só aceita sala e commandOffice só escritório. Estado/consumo válido online fresco45s; não inventar zeros nem estado operacional. Comandos explícitos set/switch, confirmar por leitura/polling comum, sem retry/otimismo; nunca grupos/cenários/reset. Abrir/guardar/importar só lê. Informar que cortar corrente ao servidor/disco requer encerramento pelo sistema. Ver SECRETARIA-GUI.md e fixture office=normal/offline/unknown; nunca testar equipamentos reais.

# Associação explícita dos IDs do Gui — 1.66

Nova autorização para preencher também officeBindings vazio/parcial: MC.associateOffice completa só papéis em falta com os quatro IDs fornecidos/canal0, preservando edições. Migração única casa-nl-gui-ids-associated-v1 booleana incluída/validada no backup; guardar marcador só após config válida e persistência. Depois de concluída, permitir remoção sem voltar a adicionar. Mesma política de credenciais e validação de saídas duplicadas. Apenas consulta, nunca comando na associação.

# Secretária acompanha a iluminação — 1.67

CasaOffice.syncPlan lê darkness/electricOpacity do quarto bedroom2, as mesmas funções/ciclo drawRoomLighting da planta. Escurecimento proporcional da secretária SVG com estores/luz diurna/noite; luz elétrica devolve brilho e ligeiro tom quente. Sem hover que volte a iluminar o móvel e com movimento reduzido respeitado. Sem alterações a estados/comandos, popup, imagens ou paredes.

# Janelas BLU — 1.68

windowBindings opcional para master/bedroom2/living/kitchen, IDs XB fornecidos pelo utilizador em windows-core.js, mesma conta/fila/consulta15s/lotes<=10. Config/backup preservam IDs completos, source blu/bthome e componente; recusar contacto repetido entre portas e janelas. Migração única casa-nl-window-ids-associated-v1 preenche só papéis em falta, preserva edições e remoções futuras. Não atuar nem configurar gateways. Janela e estore independentes: abertura nunca altera percentagem ou luz natural.

windowSnapshot usa DoorCore.status/state com window:N.open explícito, online/fresco45s; unknown/offline/erro/stale = recorte fechado com texto por confirmar, não falso fechado. UI Janelas colapsável nas definições e estado/consulta no popup da divisão. CasaWindows.patch usa apenas retângulos locais dos renders gerados dia/noite/elétrico; manter máscaras brancas por cima e todos os outros pixels originais. Ocultar recorte apenas com true confirmado. Ver JANELAS.md para recursos/prompts e tests/windows.test.cjs/fixture windows para testes sem equipamentos reais.

# Hover da consola e secretária — 1.69

Manter o sombreado verde da TV; aplicar o mesmo à secretária. Móvel da secretária em .office-desk-graphic independente do botão, com iluminação só no gráfico: hover nunca oculta/filtra o móvel. Ícones separados e preferência booleana casa-nl-show-console-icons, check Mostrar ícones da TV e secretária junto dos outros nas definições, validada/incluída no backup. Ocultar só os ícones; manter móvel, zonas clicáveis, hover e foco de teclado. Sem comandos ou alterações aos renders.

# Botão único de alimentação — 1.70

Nos popups media/office, substituir ações on/off por botão circular de energia junto do refresh. Verde = relé on confirmado, cinzento = off; unknown âmbar desativado, nunca inferir de watts. aria-pressed mixed para unknown e aria-busy em confirmação. Clique lê snapshot recente/canControl e envia booleano explícito inverso pelo comando individual existente, nunca endpoint toggle nem mudança otimista. Durante busy/pending bloquear. Preservar nota de encerramento prévio de servidor/disco.

# Backup completo e proteção de associações — 1.71

Exportação recusa formulário Shelly sujo, evitando omitir IDs ainda por guardar. Resumo por categoria conta todos os papéis (incluindo luzes dos quartos), sem imprimir chave. CasaBackup.prepareImport em cópia profunda preserva por omissão associações atuais ausentes de JSON antigo/parcial, apenas na mesma conta/servidor; check na pré-visualização permite reposição exata. Revalidar duplicados antes de escrever, nunca misturar servidores diferentes nem promover rememberKey de ficheiro. Recalcular plano antes da confirmação. Guardar Shelly recusa se outra janela alterou o valor persistido desde o carregamento/último save. Nenhuma operação de backup aciona dispositivos. Teste de roundtrip integral32 associações em tests/backup-complete.test.cjs, sem segredos reais. IDs apagados antes desta versão só recuperáveis de uma cópia anterior ou reintrodução pelo utilizador.

# Aviso de IDs em falta — 1.72

association-warnings.js lista associações sem Device ID nas definições gerais e no menu Shelly, com ligações diretas aos campos e indicação vermelha ID em falta. Atualiza ao editar/preencher/guardar; não usar validação required nem bloquear remoção ou gravação de outros equipamentos. Contador separado EV é opcional; contador geral em origem car usa ID partilhado, só avisar campo próprio quando custom. Não confundir ID em falta com dispositivo offline, não alterar configurações nem enviar pedidos/comandos ao mostrar aviso. Não reconstruir o formulário ao navegar do aviso, para preservar edições.

# IDs reais dos três candeeiros — 1.73

Utilizador voltou a fornecer os IDs: master98cdac1df7e9, bedroom298cdac1f18fa, living98cdac2d2eb6. Migração única casa-nl-lights-restored-v1 associa explicitamente os três, com canal0/preferência switch por omissão; se o mesmo ID já estava guardado, preservar canal/tipo. Preservar toda a restante configuração/conta; validar antes de persistir, marcar só após sucesso. Depois permitir edição/remoção sem reaplicar. Marcador booleano validado/exportado no backup. Guardar/carregar só consulta; não ligar/desligar para testar. Fixtures marcam a migração como concluída para continuar a usar só IDs fictícios.

# IDs confirmados das portas — 1.74

Utilizador corrigiu a porta da cave para XB106582486435511; entrada mantém XB66172384118439. DoorCore.suppliedBindings aplica os dois IDs distintos como BLU, componente0 por omissão, preservando componente do mesmo sensor já guardado. Migração única casa-nl-door-ids-restored-v1 validada/exportada no backup; preservar restante conta/config, permitir edição/remoção posterior sem reaplicar. Apenas consultar contactos; não alterar renders, gateways, estores ou atuadores. Fixtures excluem a migração dos IDs reais.

# Temperatura da varanda — 1.75

Adicionar balcony a sensorBindings/SENSOR_ROOM_IDS com ID fornecido10521c0752cc; componente temperatura0 e humidade0 por omissão, preservando componentes existentes para o mesmo ID. Migração única casa-nl-balcony-sensor-added-v1 validada/exportada no backup. Banner varanda mostra só temperatura em°C e Por consultar/Indisponível/Última leitura quando aplicável, sem humidade inventada; mantém contenção, arrastamento e preferência de ocultação dos banners. Sensores/Varanda e popup usam normalização ambiente e transporte partilhados, sem comandos. Fixtures usam ID falso; ver teste sensors e cenário balcony=online/offline/invalid.

O banner Varanda com sensor usa padding compacto. fitBanner mantém contenção e, se houver sobreposição com o estore da cozinha, procura posição acima dentro do polígono da varanda. Não mover o banner do estore nem alterar a sua associação.

# Temperatura Real na MeteoNL — 1.76

Leitura secundária Real por baixo da temperatura meteorológica, sem nome Varanda. RealTemperature.tsx lê só a ponte CasaMeteoBridge.realTemperature; mesma conta/sensorBindings.balcony/fila partilhada, sem novos IDs/credenciais/transportes em MeteoNL. Respeitar C/F, decimal1; ocultar se não associado, indicar Por consultar/Indisponível/Última leitura sem inventar zero. Mostrar também se previsão falhar. Ponte devolve só configured/temperature/status; dados recentes120s, erro/offline/stale com valor=última leitura. Abrir MeteoNL e minuto visível renovam sensor pela ensureFresh existente, nunca comandos.

# Banners azuis translúcidos — 1.77

blue-glass.css, carregado depois dos estilos dos componentes, aplica a paleta azul translúcida às divisões, estores, energia, cave e multimédia. Preservar dimensões, posições, arrastamento, contraste e cores semânticas de consumo/alarme/alimentação. Não alterar renders nem leituras ou comandos. Manter o sombreado verde de hover da TV/secretária solicitado anteriormente.

# Tipografia azul dos menus — 1.78

A paleta de blue-glass.css abrange também títulos, texto secundário, ícones e botões neutros dos popups e definições. Texto azul escuro sobre superfícies claras; manter cores semânticas de erros, estados, alarmes e botões de alimentação.

# Botão único de alimentação — 1.79

EV, ventoinha e armação do alarme usam CasaPowerButton: botão único verde em estado confirmado ativo, transparente/cinzento inativo, âmbar bloqueado se desconhecido. Clique relê snapshot e envia inverso booleano explícito apenas com canControl, sem busy/pending; sem alteração otimista. EV expõe pending e bloqueia enquanto espera confirmação. Luzes das divisões mantêm lógica existente com ícone de energia e cor verde ligada. Multimédia/secretária mantêm botão único e passam a fundo transparente inativo. Não fundir ações coletivas nem Abrir/Parar/Fechar estores.

# Termoventilador móvel — 1.80

Configuração opcional heater independente de fan, associada uma vez ao ID fornecido ea9d29/canal0 por casa-nl-heater-added-v1. Usar conta/fila/geração/consultas partilhadas. Estado confirmado fresco, botão único, booleanos explícitos e pending próprio; nenhum comando por arrastamento, configuração, leitura ou cenário. heater-form.js antes de shelly.js, heater-core.js antes de backup-core.js, heater.js depois de power-button.js. Backup valida associação, marcador e casa-nl-heater-layout-v1 e preserva o papel ausente em importações antigas.

Os dois sprites ImageGen com transparência em assets/termoventilador-*-v1.png mantêm vista ortográfica de cima; a mistura acompanha a iluminação da divisão atribuída, sem tocar nos renders da planta. Arrastar entre divisões do piso0 guarda {room,x,y}; validar contenção no destino, reverter se inválido, suprimir clique pós-arrastamento. Preservar teclado e seletor de divisão no popup. Ver TERMOVENTILADOR.md e fixture heater=off/on/unknown/offline só com IDs falsos.

# Desumidificador móvel — 1.81

Papel opcional dehumidifier separado de heater/fan; ID confirmado88d798/canal0 por omissão. Não guardar nem tentar corrigir o valor inicial inválido86/P88. Migração única casa-nl-dehumidifier-added-v1, conta/fila/generation/consultas e comandos booleanos explícitos partilhados. Estado recente confirmado, pending próprio e sem repetições automáticas. Nenhum comando ao mover, carregar, guardar ou em cenários/luzes gerais. Consulta visual não cria polling Cloud adicional.

dehumidifier-core.js valida posição inicial bath1(165,254) e layout portátil casa-nl-dehumidifier-layout-v1; sprites diurno/noturno vistos de cima e independentes da planta, seguem a iluminação da divisão. Preservar arrastamento entre divisões, contenção, cancelamento e teclado. Backup inclui papel, posição e marcador e preserva associações ausentes em ficheiros antigos. Definições e popup seguem o mesmo fluxo do termoventilador. Fixture usa só ID falso deadbeefab02. Ver DESUMIDIFICADOR.md.

# Contorno verde nos aparelhos móveis — 1.82

Retirar a bolinha de heater/dehumidifier. O wrapper *-render recebe contorno verde pela silhueta alfa dos sprites, com drop-shadow, apenas em data-power=on confirmado. Sem contorno em off/unknown; não mudar leituras ou comandos. Hover/foco e arrastamento mantêm os seus indicadores próprios. Não reintroduzir a bolinha nem desenhar um retângulo em torno da área transparente da imagem.

# Contador de pedidos Shelly — 1.83

cloud-activity-core.js antes de shelly.js; cloud-activity.js depois de todas as interfaces Shelly e antes de meteo.js para integrar casa-app. Cápsula no topo e popup são só de leitura. Sem pedidos Cloud adicionais, nem dados de credenciais/IDs/endpoints nos snapshots. Mostrar progresso pelos IDs configurados únicos e lotes reais da atualização; contabilizar transporte por janela. Pronta só após ciclo completo recente, leituras utilizáveis, sem edição suja, erro, fila, envio ou confirmação pendente. Dispositivos offline/saídas/contactos inválidos dão atenção; HTTP429 dá erro, nunca pronto. Não confundir pedido HTTP concluído com estado físico confirmado. Contador não desbloqueia atuadores nem altera polling/retries/intervalos. Validar geração e estados incompletos antes de emitir eventos; resetar ciclo ao guardar conta. Ver ESTADO-SHELLY.md e testes cloud-activity/cloud-transport; fixture apenas com IDs fictícios.

# Aparelhos na planta da cave — 1.84

Ventoinha e alarme deixam de ter cartão azul/rótulos permanentes; cellar-devices.css carregado por último apresenta os gráficos como aparelhos na planta, com sombra própria. Preservar IDs de botões, labels/estados acessíveis e popups, conta/Shellys/comandos, dimensões mínimas44px e posições no backup existente. Ventoinha usa SVG existente; ON confirmado = auréola verde na caixa e só as pás rodam. OFF/unknown sem verde/rotação. Alarme usa novo corpo vetorial circular local com a auréola existente: verde armado, vermelho orbitante/pulsante se disparado, sem auréola desarmado, âmbar desconhecido/parcial. Preservar movimento reduzido. Não voltar a aplicar azul/blur/bordas de cartão a estes dois elementos, nem criar polling para animações. Ver APARELHOS-CAVE.md.

# Fluidez da comunicação e cozinha — 1.85

Por novo pedido explícito do utilizador, a consulta geral passa a 30 s após conclusão, removendo o ciclo redundante dos sensores. Os controlos com dados recentes não ficam bloqueados por consultas de fundo; diagnósticos, comando em envio, confirmação do próprio aparelho, configuração suja e pausa 429 continuam protegidos. Comandos invalidam o ciclo de leitura anterior por readEpoch; não aplicar resultados pré-comando, nem enviar os restantes lotes antes do comando. Revalidar geração/frescura à saída da fila. Confirmação e painéis usam consultas por IDs deduplicados que só atualizam os aparelhos solicitados. Nunca fazer retry de atuação. HTTP429 impõe pausa 30..120s; não acumular pedidos durante essa pausa. Disponível em segundo plano não significa estado físico confirmado de um comando pendente. Ver FLUIDEZ-SHELLY.md; esta mudança atualiza as regras de polling/contador anteriores conforme o pedido atual.

Grupo opcional kitchenBindings com dishwasher e465b8b1526c, washer 485519eb7022, boiler bc1c2a, canais iniciais0 editáveis. Mesmo validador, fila, snapshot de relé/consumo e backup; nunca incluir em iluminação/cenários. Migração única preserva personalizações e remoções posteriores. Manter grupos e equipamento colapsáveis, aviso de ID em falta, preservação de grupos nos backups antigos. Na planta, apenas hit areas transparentes sobre L/R/C: sem ícones, novos renders ou alterações aos píxeis. Realce no hover/foco, popup com alimentação confirmada e medições reais; ON não significa máquina em programa ou caldeira a aquecer. Ver COZINHA.md. Testes exclusivamente com IDs/chave fictícios e todas as rotas Cloud intercetadas.

# Símbolo de atividade das máquinas — 1.86

Por pedido do utilizador, dishwasher/washer mostram um pequeno símbolo verde de máquina sobre o aparelho só com potência válida e recente >10W. Em 10W ou menos não mostrar símbolo em planta; no popup indicar Sem atividade. Offline/ausente/erro/desatualizado = Atividade por confirmar, sem animação. Tambor com rotação discreta e movimento reduzido respeitado. O estado da alimentação continua booleano e independente; não controlar o relé pelo consumo. Não aplicar o limiar à caldeira, TV ou outros aparelhos. Os renders continuam intactos e o novo símbolo é apenas uma camada da interface; sem novos pedidos Cloud. Ver COZINHA.md e testes kitchen.

# Atividade da caldeira — 1.87

Por pedido explícito posterior, aplicar também à boiler o limiar >10W anteriormente limitado a dishwasher/washer. Na caldeira usar símbolo próprio de caldeira/chama verde pulsante, mantendo tambor nas máquinas. Símbolo só em planta com atividade elétrica válida; estado textual no popup; nenhuma inferência de temperatura ou chama física, comando automático ou novo polling. Esta regra substitui a exclusão da caldeira na instrução 1.86. Preservar validade, controlo independente da alimentação e movimento reduzido.

# Prioridade de comandos e fim das confirmações — 1.88

O pedido atual exige eliminar confirmações permanentes e refresh manual recorrente. confirmation-core.js define tickets individuais: relés/luzes até3 consultas de estado (esperas1,5/4/10s, prazo30s); estores até5 (1,5/4/8/12/16s, prazo60s). Não renovar tickets anteriores com outro comando; sequência/alvo novo substitui só o próprio estore. Confirmar apenas com leitura válida posterior ao comando; nos estores aceitar movimento na direção correta sem dizer que chegou ao alvo. Expiração remove efetivamente todos os mapas/escalares de pendentes, mostra Comando sem confirmação e conserva o estado reportado. Nunca repetir atuações automaticamente.

Comandos abortam apenas leituras HTTP em curso via cancelStatus; não abortar atuações. Confirmar tem prioridade sobre frota e painéis em espera. Cancelamento por prioridade não é falha de rede. Aplicar lotes de leitura individualmente, guardando geração/epoch após cada await; falhas posteriores não invalidam lotes anteriores. Regresso à app/rede antecipa leitura normal sem exigir refresh. A consulta geral continua30s após conclusão, com pausa429 e validação individual preservadas. Estas instruções atualizam os antigos intervalos e prazo90s por pedido explícito. Ver FLUIDEZ-SHELLY.md e testes confirmation/fluid-requests/cloud-transport. Todos os testes de atuação continuam fictícios.

# Recuperação do limite inicial — 1.89

Por relato do utilizador de pausa imediata e toggle indisponível, substituir o intervalo anterior1,1s por1,5s após conclusão do pedido e usar localStorage/Web Locks para coordenação de janelas na mesma origem/servidor. Pool temporário shelly-cloud-traffic-v2:<server> sem IDs/chave e fora do backup. Web Locks só quando disponíveis; fallback por timestamps partilhados. Não prometer coordenação com outros navegadores/origens/apps.

Não impor30s mínimos após429: respeitar Retry-After válido; sem indicação,2,5s com crescimento5/10/20/40s e reset após sucesso. Manter rejeição de envios durante pausa e nenhuma repetição automática de atuações. Guardar consultas de equipamentos abertos durante pausa em deferredReads, consultar esses IDs prioritariamente ao recuperar, e voltar a guardar se novo429. Limpar ao mudar configuração. Toggle só fica disponível após leitura válida; nunca enfileirar o comando do utilizador com estado desconhecido. No popup do termoventilador explicar a retoma automática e espera. Estas regras atualizam os mínimos/intervalos anteriores por pedido explícito. Ver FLUIDEZ-SHELLY.md e testes cloud-transport/fluid-requests; todas as atuações de teste fictícias.

# Últimas leituras durante pausas — 1.90

Preservar valores previamente recebidos durante falhas/429/expiração: lastReading nos cores de energia, multimédia e EV é só para apresentação, com timestamp original. Exibir Última leitura nos consumos históricos e último booleano dos aparelhos. Estores offline podem mostrar percentagem histórica conhecida com legenda, sem inventar posição inicial. Nunca usar lastReading para desbloquear comandos, calcular carga atual ou animar atividade/carregamento; manter frescura e geração independentes. Não persistir cache adicional nem renovar timestamp numa falha. Testes exclusivamente fictícios. Ver FLUIDEZ-SHELLY.md e tests/last-reading.test.cjs.

# Visibilidade independente dos dados — 1.91

O toggle casa-nl-show-banners controla apenas os nomes das divisões. casa-nl-show-sensor-readings controla temperatura/humidade na planta, por omissão visíveis e com validação booleana opcional no backup. Sem nomes, manter room-pin.has-sensor visível e ocultar só room-pin-name; sem sensor nem nome, ocultar o banner inteiro. Usar os mesmos valores, posições, arrastamento e popups; não duplicar leituras ou criar polling. O consumo conserva o toggle independente casa-nl-show-energy-banner. Os nomes nos controlos, acessibilidade e estores não são apagados.

# Informação elétrica e histórico local — 1.92

consumption-core.js carrega após ev-core e antes de shelly.js/backup-core; consumption.js e consumption.css após os componentes visuais. O bloco reutiliza as mesmas leituras e controlos: potência W (kW para casa/carro), acumulado kWh, qualidade e períodos Diário/Semanal/Mensal/Anual. Não criar polling ou pedidos de histórico Cloud. API pública atual usada não tem histórico documentado nesta integração. Registo local parcial, claramente identificado, por deltas válidos do acumulado com intervalo <=5min; primeira leitura/reset/gap não geram consumo. Zero observado e lacuna são distintos. Não integrar potência nem simular dias anteriores.

Identidade inclui servidor/ID/componente/canal; sem chaves. Limites64 identidades,50 horas,400 dias; gravação diferida e flush antes de exportar/pagehide. Importação cancela persistência antiga depois de restaurar e antes de reload. Backup opcional casa-nl-consumption-history-v1 validado estritamente; ficheiro até8MB para o histórico formatado. Atualiza a regra1.90: há agora histórico persistente separado, exclusivamente para gráficos, nunca cache válido para atuadores. Valores atuais/históricos não controlam relés, alarme, carregamento ou animações. Sensores sem medição elétrica não inventam consumo. Disparo do alarme continua só leitura; seleção do respetivo consumo nunca envia comandos. Preservar popups, render e iPad vertical. Testes/provas exclusivamente na fixture; dados historyproof nunca entram na app normal. Ver CONSUMO.md.

# Popups compactos dos aparelhos móveis — 1.93

Por pedido explícito do utilizador, retirar o seletor Colocar na divisão e respetiva explicação dos popups heater/dehumidifier, incluindo a geração de opções e listener de change. Esta regra substitui a exigência anterior do seletor. A posição/divisão continuam guardadas pelo arrastamento e movimento por teclado já existentes. Não alterar geometria, persistência, iluminação ou comandos.

Alimentação, atualizar e definições ficam na mesma fila portable-device-actions, com botões circulares48px, SVG, título e aria-label. Preservar IDs, listeners e regras de disponibilidade: só alimentação é um toggle e fica verde em ON; os outros são atalhos neutros. consumption.js reutiliza esta fila sem criar wrappers ou deslocar o refresh; restantes equipamentos mantêm o arranjo anterior. Validado nos dois popups em820×1180, sem seletor, refresh e definições funcionais e zero atuações na fixture. Prova review/aparelhos-popup-compacto-1.93.png;209 testes aprovados.

# Retirar gráficos de consumo — 1.94

Por pedido explícito posterior, remover gráficos, períodos e notas de histórico de todos os blocos de consumo. Manter apenas potência instantânea e acumulado do Shelly, qualidade de leitura e os controlos existentes. Não reintroduzir registo local ou séries: shelly.js conserva apenas consumptionReadings em memória e não grava histórico; retirados temporizador/flush/pagehide e hooks do backup. Esta instrução substitui a recolha/gráficos da versão1.92. Preservar compatibilidade de importação dos históricos legados sem os usar ou apagar. Manter os popups compactos1.93, regras de comandos e sinalização Última leitura. Ver CONSUMO.md; prova review/consumo-sem-graficos-1.94.png.

# Ícones uniformes de atualizar e definições — 1.95

Usar exclusivamente icon('refresh') e icon('settings') do catálogo app.js. Refresh é SVG de duas setas simétricas; settings é engrenagem radial de oito dentes centrada em12,12. Ambos usam viewBox24×24, traço1,8, cantos redondos, fillnone e data-ui-icon para identificação. Não voltar a usar glifos Unicode, paths isolados ou o antigo desenho assimétrico. Aplicado aos popups, cozinha, sala, secretária, meteorologia e rodapé; os atalhos criados em consumption.js também usam o catálogo. Preservar cores, IDs, dimensões, labels, listeners e regras de comandos. Validação em fixture/iPad: uma única variante SVG de cada tipo e ícone novo no rodapé, sem erros de consola;209 testes aprovados. Prova review/icones-uniformes-1.95.png.

# Acesso separado aos estores e realces azuis — 1.96

Clicar na divisão/nome abre apenas o contexto room: iluminação, sensores e informação própria, sem controlos/consumo do estore. Banner e blind-window-trigger abrem contexto blind no room-dialog, preservado em cada redraw, com os controlos existentes e consumo só do cover. Lista global de estores usa o mesmo contexto. Validar id antes de abrir. Não enviar comandos por abertura de popup. Consultas room excluem o cover; ensureBlindFresh e refreshEquipment blind consultam só o seu ID. Preservar os validadores, alvos/pendentes e comandos explícitos anteriores.

As quatro áreas transparentes sobre janelas têm teclado, label e mínimo44px, não dependem da visibilidade dos banners e não alteram renders. Realçar apenas no hover/foco, à semelhança da consola. Por pedido explícito posterior, usar azul em realces de janelas, TV, secretária e cozinha e nos símbolos/texto de atividade das máquinas e caldeira. Variáveis plan-highlight em blue-glass.css e fundo banner-glass; esta regra substitui os realces/símbolos verdes anteriormente solicitados. Não mudar limiares/animações ou cores semânticas de alimentação/alarme. Ver ESTORES-ACESSO.md e testes blind-access;211 testes e fixture exclusivamente fictícia, zero atuações. Prova review/realces-azuis-estores-1.96.png.

# Números dos banners sem negrito — 1.97

Por pedido do utilizador, percentagens dos estores (.blind-pin-copy strong) e potência da casa na planta (.energy-pin strong) usam font-weight400. Aplicar só aos banners da planta, preservando tipografia dos popups, ícones, leituras e comportamento. Verificação de estilo computado:400 nos quatro estores e no contador. Prova review/banners-sem-negrito-1.97.png.

# MeteoNL ampliado por inatividade — 1.98

A opção focusSeconds nas preferências casa-nl-meteo-v1 controla a ampliação automática do hero:0 desativa;15,30,60,120,300 segundos;30 por omissão. Validar no meteo-core, preservar backups antigos sem o campo e incluir exportação/importação existente. A lógica meteo-focus-core é exclusivamente de apresentação. Suspender/reiniciar a contagem nas definições, documento oculto ou iframe Meteo oculto pela Casa. Não interferir com o temporizador Casa→Meteo.

A vista ampliada mostra data, hora, cidade, tempo atual, temperatura Real e nascer/pôr do sol, adaptada ao iPad vertical. Uma camada button sobre todo o ecrã recebe o primeiro click/toque e só devolve a vista normal; não desmontar no pointerdown nem deixar o click atingir a lâmpada. Escape/Enter/Espaço também permitem regressar. Não gerar pedidos Cloud ou comandos. Ver METEO-AMPLIADO.md;214 testes aprovados e verificação820×1180 com zero atuações. Prova review/meteo-ampliado-1.98.png.

# Candeeiros interativos — 1.99

CasaLamps.trigger gera três botões transparentes e circulares centrados nas mesmas coordenadas target dos discos master/bedroom2/living. Mínimo44px, realce hover/focus-visible com variáveis plan-highlight azuis, sem alterar renders ou camadas de iluminação. Independentes da visibilidade dos nomes e dos estores.

Clique/teclado abre room-dialog no contexto light, conservado nos redraws, com iluminação, consumo e atalho de definições para o ID do candeeiro. decorateRoom light decora só a luz; abertura/refresh consultam apenas o ID da luz, nunca cover/sensores. Preservar guards e comandos explícitos; abrir popup/definições não atua. O atalho abre a secção Luzes existente e foca a associação correspondente sem a modificar. Versão1.99,215 testes e fixture820×1180;zero atuações. Prova review/candeeiros-realce-1.99.png.

# Paleta vermelha do MeteoNL — 2.00

A preferência opcional nightPalette aceita color/red;por omissão color para preservar o modo anterior. A opção Cores do modo noturno fica em Modo de cabeceira. Aplicar vermelho só quando a lógica night existente está ativa (horário automático ou Sempre ativo), nunca apenas porque a paisagem é noturna. Fora do modo de cabeceira manter cores originais.

night-red-filter é uma camada fixa com mix-blend-mode:multiply, RGB(r,0,0), sem pointer-events, acima de toda a interface Meteo; r segue255*(1-dim/100). Abrange paisagem, ícones, texto, definições e vista ampliada sem alterar layout ou eventos. O colorido mantém os estilos anteriores. Preferência validada em meteo-core, guardada/exportada na chave Meteo existente; backups antigos compatíveis. Sem novos pedidos/atuações. Verificado820×1180:vermelho normal/ampliado,regresso ao colorido,ausência do filtro com night off e zero comandos/erros;216 testes aprovados. Prova review/meteo-vermelho-2.00.png.

# Popups sóbrios e uniformes — 2.01

Por pedido do utilizador, usar o termoventilador como modelo visual dos popups dos equipamentos: título, contexto curto/estado, imagem quando existe, dois cartões de consumo e fila de controlos circulares de alimentação/atualizar/definições. popup-ui.js carrega antes de consumption.js e reorganiza os botões existentes, conservando IDs, listeners, disponibilidade e associações. Não recriar atuadores nem alterar comandos. consumption chama normalize após montar os cartões; manter a operação idempotente durante redraws.

Retirar notas explicativas dos popups: limiares e alimentação da cozinha, TV/PS5, encerramento de servidor/disco, cálculo do contador, notas de simulação/Cloud e confirmação redundante de sucesso. Preservar estados, dados antigos, erros e confirmações pendentes. Esta instrução posterior substitui a obrigação anterior de mostrar estas notas nos popups. Não apagar ajuda de configuração ou validação dos formulários. Saúde/online normal não gera parágrafos repetidos; ausência de medições continua explícita e discreta, sem inventar zero.

Apenas forma é comum; estores conservam abertura/parar/range, alarme distingue armação/disparo, contador permanece só leitura com escala e margem, multimédia/secretária conservam imagens interativas. Imagens, animações, arrasto e chaves de configuração intactos. Testado820×1180 com fixture fictícia (candeeiro,cozinha,termoventilador,multimédia,contador,ventoinha,alarme,EV),refresh funcional,zero atuações/erros e216 testes aprovados. Prova review/popups-cozinha-2.01.png.

# Vermelho legível e horário próprio — 2.02

Substitui o filtro escuro2.00: em red-night o fundo é preto, sem paisagem, e não acumular opacidade0,55 de bedside sobre texto/ícones. Usar vermelho claro sobre preto e ajuste moderado pela intensidade dim;settings no top layer tem paleta explícita. Preservar UI, acessibilidade e eventos. Não aplicar à Casa.

Preferências opcionais redSchedule=night/custom,redStart,redEnd (HH:mm), validadas e exportadas na chave Meteo existente. Defaults night/23:00/07:00 preservam o modo anterior. night segue ativação de cabeceira;custom ativa vermelho no intervalo próprio, mesmo se cabeceira geral off, e fora dele regressa à cabeceira colorida ou dia conforme o horário geral. Color desativa vermelho. Intervalos atravessam meia-noite; início inclusivo/fim exclusivo;horas iguais significam24h. redActive no meteo-core é puro, sem pedidos/atuações. Inputs time usam onInput para guardar corretamente no Safari.

Verificado820×1180,horário próprio dentro/fora,preferências mantidas ao reabrir definições,zero erros/comandos.218 testes aprovados incluindo limites/meia-noite/legados/validação/backup. Prova review/meteo-contraste-2.02.png.

# PWA iPad — 2.03

Manifesto manifest.webmanifest com name/short_name Domótica,id/start_url/scope relativos ./,displaystandalone,orientationany. Manter caminhos relativos para raiz ou subpasta GitHub Pages e não colocar parâmetros de ensaio no lançamento. index inclui manifest,apple-touch-icon180,Applecapable/title/status black-translucent e viewport-fitcover. Ícones PNG opacos180/192/512 e maskable512 em assets/icons;fonteSVG local baseada no símbolo da casa.

pwa.css é exclusivamente @media(display-mode:standalone),com insets de segurança em cabeçalho,planta,rodapé,popups e hostMeteo(iframe recebe viewport protegido). Não mudar organização,geometria ou lógica dos equipamentos. Sem serviceworker por decisão explícita: instalação iPadOS não o exige e não criar caches/interceção Cloud nem controlos offline. Não persistir credenciais por instalação.

Ver PWA-IPAD.md para instalação Safari,armazenamento possivelmente separado/backup eHTTPS. TestadoHTTP localhost,manifest application/manifest+json,ícones/CSS200,layout820×1180 e1180×820,zero comandos/erros,222 testes. Instalação/insets físicos só confirmáveis no iPad;HTTPS público não verificado semURL. Prova review/pwa-ipad-2.03.png.

# Ícones MeteoNL centrados no Safari iPad — 2.04

A fotografia do utilizador mostra SVGs da barra Meteo deslocados dentro dos círculos. .icon-button repõe appearance/-webkit-appearance none,padding/margin0,box-sizingborder-box,min-width37 e flex-shrink0;usar inline-flex com align-items/justify-contentcenter em vez de grid sobre o botão nativo. SVG direto displayblock,margin/padding0 e sem shrink. Preservar37×37,desenhos,cores,spinning,ações e posições. Aplica também ao fechar definições.

Verificado820×1180 e1180×820:centros SVG/botão coincidem(dx/dy0)nos quatro atalhos e no fechar;zero comandos/erros e222 testes aprovados. Sem alterações aos controlos Shelly. Prova review/meteo-icons-centrados-2.04.png.

# Fechar popups pelo X ou exterior — 2.05

Usar dialog-dismiss.js:install(document) em delegação capture para todos os dialogs da Casa, incluindo criados depois de app.js. Substitui o bind pontual antigo. Fechar só quando pointerdown e click incidem no mesmo dialog aberto e fora do seu retângulo. Não fechar em padding interior,controlos,arrasto iniciado dentro,pointercancel ou clique sem início. Consumir o click exterior antes de fechar para não atingir planta/atuadores. Preservar os listeners X e Escape existentes.

Settings Meteo usa a mesma política,instalada no dialog com callback onClose e cleanupReact;não fechar apenas pelo event.target===dialog,que incluía paddinginterior. Não mudar saves/importação/comandos. Testes225 aprovados;fixture820×1180:termoventilador e definições fecham por exterior,cozinha/termoventilador/Meteo porX,padding interior mantém aberto,zero comandos/erros. Prova review/popup-fechar-2.05.png.

# Todos os botões de atualizar com símbolo — 2.06

Atualizações manuais usam o ícone refresh do catálogo app.js num botão circular refresh-icon-button,sem texto visível,comtitle earia-label que identificam a ação. popup-ui.symbol marca a classe para refresh;inicializa os IDs terminados -refresh e normalize trata sensor-room-info/window-refresh. A cave chama CasaPopupUI.refresh após criar o botão. Preservar nós/listeners/disabled:alteração só visual,sem pedidos adicionais. Meteo retry também usa o desenho de duas setas e label Atualizar meteorologia. Manter centralização Safari,48px(círculoscompactosmobileconservam44),coresazuis e focoacessível.

Verificado popupmaster com sensor/luz/janela:3SVGs,semtexto,raio50%;refreshsensor funcional,caverefreshSVG,zero comandos/erros.225 testes aprovados. Prova review/atualizar-circular-2.06.png.

# Substituição dos sensores de varanda e cave — 2.07

Pedido explícito de25/10/2026:temperatura varanda XB211299192082120,cave XB211299197137945. replacedTemperatureBindings em ShellyCore substitui só esses dois mapas,usa componentes0/tipoenvironment e preserva canais se já tem o mesmoID. Migração única casa-nl-temperature-sensors-replaced-v2 após migrações anteriores e antes da consulta inicial;guardar configuração validada antes de marcar concluída. Não altera contactos de portas,janelas,atuadores ou outras divisões. Varanda continua a alimentar a leituraReal do Meteo.

Sensores aceitam statusDeviceId(XB ouhex),incluindo guardar formulário/importar/exportar. Manter deviceIdhex rígido paraatuadores. CompararXB sem distinguir maiúsculas/minúsculas no dirty do formulário e correspondência de respostas,conservandoXB no pedidoCloud. Não inferir temperatura interna nem inventar valores. Novo marcador validado comoBoolean no backup. Fixture marca migração já aplicada para não consultar IDs reais;testes deXB usam IDs fictícios.228 testes aprovados:substituição isolada,componentes,config/backup,IDsreadonly e respostasCloud com casos diferentes.

# Humidade nos banners varanda/cave — 2.08

Por pedido posterior, varanda deixa de ser só temperatura:sensorBannerInfo usa a apresentação comum «°C · %»,aria de ambos os valores e qualidadeÚltima leitura/Indisponível sem inventar valores. Esta instrução substitui a restrição de temperatura apenas na varanda. cellar-temperature mostra temperatura/humidade lado a lado no banner da cave e título do popup ajustado. Usar as mesmas leiturasCloud dos novos sensores2.07,sem novos pedidos,timers ou mudanças no MeteoReal. Valores ausentes ficam—,incluindo sensores legados sem humidade.

Fixtureblutemps exclusivamenteXBfictícios com respostasCloudem minúsculas,componentes0. Verificado820×1180,varanda e cave comhumidade,sem colisão comestores,zero comandos/erros e228 testes aprovados. Provas review/humidade-varanda-2.08.png e review/humidade-cave-2.08.png.

# Controlos acima,consumos no fim — 2.09

Instrução posterior do utilizador substitui a ordem de2.01:todos os popups de equipamento mostram controlos/botões primeiro e Consumo(potência/acumulado)no fim. popup-ui.consumptionLast move a secção existente para último filho do seu host,de forma idempotente após normalize,tanto room(light/blind/divisão)como outros equipamentos,incluindo painéis de multimédia/secretária. Não recriar secções/listeners ou mudar lógicaShelly. Removidas as regras que punhamconsumo antes dos botões de luz/multimédia.

Estores conservam slider,abrir/parar/fechar eatalhoscirculares antesdoconsumo. Verificadofixture820×1180,estores,candeeiro,termoventilador,cozinha,multimédia/secretária;secções abaixo dosbotões eúltimasnoseuhost,zero comandos/erros.228 testesaprovados. Provas review/consumos-em-baixo-estore-2.09.png e review/consumos-em-baixo-luz-2.09.png.

# Indicação de piso junto ao rodapé — 2.10

Por pedido do utilizador, retirar o cabeçalho superior «PISO −1 / Cave e estacionamento». Mostrar apenas «Piso −1» na cave e «Piso 1» na casa, centrado por cima do rodapé fixo. O identificador interno da casa continua 0: só muda o texto apresentado. floor-indicator é filho absoluto do bottom-dock, acompanha os insets de segurança e não interfere com cliques;role status/aria-live polite anuncia a mudança. Preservar navegação entre pisos,gestos e lógica Shelly.

Verificado820×1180 e1180×820:indicação acompanha o piso,sem título superior e sem colisão com rodapé;zero erros/comandos.228 testes aprovados. Provas review/piso-menos-1-rodape-2.10.png e review/piso-1-rodape-2.10.png.

# Câmara do hall — 2.11

Por pedido explícito, adicionar UniFi G3 Instant à entrada da casa, coordenadas180,986 do render original, orientada para a porta156,1058. camera.js/camera.css e SVGs locais camera-g3-overhead/front: vista superior na planta, realce e cone azul apenas em hover/foco, alvo44px e popup sóbrio acessível. Iluminação acompanha a sala através de CasaHallCamera.drawLighting no redraw comum, sem timers/pedidos. Preservar todos os renders e geometria das divisões.

Dados fornecidos: câmara192.168.10.57,MACd0:21:f9:95:9b:69,consolaProtect192.168.10.1. O botão Ver no Protect abre explicitamente https://192.168.10.1/protect numa nova página com noopener/noreferrer; não inferir ID internoProtect pelo MAC,não apresentar vídeo/online fictício,não criar iframe/fetch ou guardar credenciais. Esta entrega é elemento/acesso ao Protect,sem transmissão integrada. Não alterar configurações da câmara/consola ou transporteShelly. Endereço real não contactado nos testes.

Verificadofixture820×1180:elemento junto à entrada,popup,hrefProtect,fechoX/exterior,zero erros/comandos;228 testes aprovados. Provas review/camera-hall-planta-2.11.png e review/camera-hall-popup-2.11.png.

# Acesso remoto à câmara sem VPN — 2.12

Pedido posterior substitui o destino local2.11:Ver no Protect abre https://unifi.ui.com/ (Site Manager oficial),com autenticaçãoUniFi e escolha de consola/Protect pelo utilizador. Legenda «Acesso remoto · Conta UniFi». Não construir URL de consola/câmara sem o identificadorProtect,não expor stream público,não guardar credenciais,não alterar router/portas/RemoteManagement. Acesso real depende da consola associada à conta e RemoteManagement ativo; não confirmado por sessão autenticada nesta entrega. Documentação oficial: https://help.ui.com/hc/en-us/articles/115012240067-Enabling-UniFi-Remote-Management . Verificadofixture820×1180:href remoto,legenda,popup e zero comandos. node --check camera.js e buildMeteo concluídos. Prova review/camera-remota-2.12.png.

# Transmissão da câmara no popup — 2.13

O utilizador forneceu um link privado monitor.ui.com e pediu vídeo incorporado,sem navegar no Site Manager. Não colocar esse link/UUID em código,documentação,fixtures ou recursos publicados. camera-core.config valida apenas HTTPS monitor.ui.com/UUID exato,sem credenciais/query/outrosdomínios. Preferência opcional casa-nl-camera-hall-v1={url},localStorage e backup com validação estrita. Formulário na engrenagem permite associar/substituir/remover o link;avisa inclusão na cópiaJSON e expiraçãoProtect.

camera.js cria iframe apenas ao abrir/guardar/atualizar manualmente;allow autoplay/fullscreen,referrer no-referrer,sandbox scripts/same-origin/presentation. Remover iframe ao fechar(X/exterior)ou pagehide para libertar sessão. Não usar polling,nemfetchCloud,nem comandos. Popup820px adaptável ao iPad. Conservar leitorUniFi sem recortesCSS frágeis que ocultem mensagens;os controlos/identificação internos dependem da UniFi,por ser origem diferente,não prometer extração direta do vídeo. Botões locais refresh/settings circulares.

Teste do link fornecido mostrou vídeo real no popup e partilha com expiração26/10/2026às12:07. A UniFi identifica-a como Câmara Estúdio G3;usar o link pedido sem inferir que é outra câmara. Partilha suporta uma sessão:outras tentativas devolveram Livestream Share Link is in Use/MAX_CONNECTIONS_REACHED;não fazer retriesautomáticos nem garantir disponibilidade concorrente. Não gravar imagens privadas da transmissão em recursos publicados.229 testes aprovados incluindo validação de destinos/credenciais,buildMeteo e sintaxeJS. Shelly fixture sem comandos.

# Retirar integração da câmara — 2.14

Pedido explícito posterior:retirar integração por exigir renovação diária do URL. Remover elemento/popup/scripts/CSS/SVGs da câmara e hook de iluminação;eliminar capturas antigas específicas da integração dos recursos publicados. app.js remove a preferência local casa-nl-camera-hall-v1 ao iniciar;backup-core descarta a chave legada ao validar,para não exportar/restaurar links temporários. Não contactar a câmara/consola nem revogar remotamente partilhas como efeito desta remoção. Não alterar outras funcionalidades/associações. BuildMeteo concluído e228 testes aprovados.

O utilizador pediu aviso caso a situação mude. Criada automação heartbeat semanal às segundas10:00,Europe/Lisbon,«Verificar integração permanente UniFi Protect»,que consulta fontes oficiais e só avisa se surgir solução suportada e verificada para vídeo privado em PWA/iPad,remoto semVPN e sem renovação diária. A automação não altera app/dispositivos/permissões.

# Prioridade ao equipamento aberto — 2.15

Pedido do utilizador:ao abrir dispositivo,suspender atualizações de outros equipamentos. shelly.popupIds resolve contexto room(light/blind/divisão),seleção multimédia/secretária,cozinha,aparelhos,alarme,EV,contador,cave. showPopup agenda focusPopup depois do desenho;seleção de dispositivos multimédia atualiza também o foco e close delegado volta à política geral. IDs deduplicados,sem alterar associações/persistência.

Ao mudar foco,invalidar restantes lotes de leitura e cancelar status em curso,conservando caches. Leituras normais/pendentes na fila são filtradas novamente para os IDs do popup antes de enviar. Consultar prioritariamente se necessário,reutilizando coalescência10s;durante popup a rotina só renova os IDs abertos a cada15s e recupera apenas deferredReads desses IDs. Sem popup retomar consulta geral após2s,sem esvaziar leituras ou gerar comandos. Refresh da cave passa a ser específico à cave.

Exceção intencional:verificações limitadas de comandos já aceites (confirmation:true) podem consultar o respetivo ID fora do popup;preservar prazos,tentativas,guards,Parar,prioridade de atuações,serialização,intervaloCloud e429. Não interromper leitura de confirmação ativa ao trocar popup. Não criar retries de comandos nem estados otimistas. Outros banners conservam últimas leituras e qualidade conforme frescura.

231 testes aprovados,incluindo interrupção da consulta geral sem apagar valores,filtragem de leituras previamente enfileiradas,exceção de confirmação,recuperação restrita e retoma. Fixture820×1180 com consulta lenta:após abrir candeeiro master os próximos pedidos continham apenas o ID fictício desse candeeiro;zero erros/comandos. Prova review/prioridade-popup-2.15.png. BuildMeteo atualizado.

# Indicação de regeneração da TV — 2.16

Pedido explícito:entre2e10W mostrar símbolo no ecrã da TV por provável regeneração. CasaMediaCore.tvRegenerating usa exclusivamente snapshot configurado,reléON,dados atuais/não stale e potência finita2..10W inclusive. É inferência por consumo,nunca modo confirmado da LG. media.js sobrepõe símbolo refresh azul e legendaRegeneração no centro do ecrã preto;banner/estado dizem Regeneração estimada e título/aria explicam intervalo. Sobrepõe a apresentaçãoLigada dentro deste intervalo mesmo acima do limiar legado4W;fora dele conserva a regra anterior e não alteraactivityThreshold,PS5 ou outros equipamentos.

Não controlar relés,persistir novo estado,criar polling ou modificar prioridades2.15. Manter alimentação distinta de atividade. Não mostrar símbolo com dados antigos/offline/erro/semmedição/reléOFF. Fixturetvregen usa TVfictícia6W.232 testes aprovados,incluindo limites2/10,fora do intervalo,offline,ausência e staleness. UI820×1180:ecrãpreto,símboloazul,legendaestimada,6W/12kWh,zero comandos. Prova review/tv-regeneracao-2.16.png. BuildMeteo atualizado.

# Popups à largura das imagens — 2.17

Pedido:retirar faixas laterais escuras dos popupsTV/secretária e ajustar o próprio popup à largura do render. fit em media.js/office.js usa proporção original,largura disponível e altura útil depois do cabeçalho/painel,até820px e1120px;largura mínima360px limitada ao ecrã para manter controlos legíveis. Aplicar a mesma largura à imagem e ao dialog acrescentando apenas as bordas. ResizeObserver acompanha cena,cabeçalho e painel;resize recalcula a partir do viewport para permitir voltar a alargar após rotação. Não recortar/esticar renders ou deslocar banners.

consumption.css posterior remove altura fixa/flex da cena e permite scroll vertical do popup em alturas pequenas,sem scrollhorizontal. Imagens completas,controlos econsumos preservados;sem alteraçõesShelly/pedidos. Verificado820×1180 e1180×820:TV761,9/446,2px e secretária545,3/362px,imagem2px menor pelas bordas,semoverflowhorizontal e semloopResizeObserver. Zero comandos;232 testes aprovados e buildMeteo concluído. Provas review/popup-largura-secretaria-2.17.png e review/popup-largura-tv-2.17.png.

# Aparelhos selecionáveis nas imagens e legendas opcionais — 2.18

Pedido do utilizador:realce azul ao passar o rato no próprio dispositivo dos popupsTV/secretária,e seleção por clique,com check de ocultar as legendas dentro de ambos. Áreas media-device-hit mantêm coordenadas relativas à imagem e selecionam o mesmo ID dos banners,reutilizando draw/focusPopup2.15. Clique/teclado nunca envia comando;alimentação só nos botões explícitos existentes. Alvos acessíveis mesmo sem legendas. Banners ficam acima dos alvos nas sobreposições.

Checks nativos «Legendas dos dispositivos» em cada cabeçalho,persistidos independentemente como Boolean em casa-nl-media-device-labels-v1 e casa-nl-office-device-labels-v1,por omissão true;backup opcional validado. Ocultar apenas banners,pontos e conectores,não painéis de controlo ou símbolo de regeneração. Não confundir com preferência dos ícones na planta.

Imagens tinham legendas embutidas:três versões limpas via imagegen integrado em assets/multimedia-sala-limpa-v2.png,multimedia-sala-limpa-apagada-v2.png e secretaria-gui-limpa-v2.png,originais preservados. Ver POPUP-DISPOSITIVOS.md com prompt e validação. Preservar iluminaçãoTV/PS5,ajuste de largura2.17,associações e comandos.233 testes aprovados,UI820×1180 e1180×820,preferência mantida,seleção dePS5/TerraMaster comlegendas ocultas,zero erros/comandos. Provas review/dispositivos-ps5-sem-legendas-2.18.png e review/dispositivos-secretaria-sem-legendas-2.18.png.

# Texto contido nos banners — 2.19

Correção pedida para nomes/consumos fora das caixas e temperatura/humidade na varanda. Bannersmedia passam de altura percentual fixa a heightauto com prioridade sobre inline,min44px,padding e line-height explícitos. Nome/estado com largura100%,quebra de linha e sem shrink. Alargados/distribuídos PS5/Vodafone/UniFi e discoexterno;UniFi mais abaixo para não cruzar os pontos. CenaTV abaixo520px usa arranjo compacto comfont10/9 e três banners distribuídos verticalmente. Não cortar/ocultar texto ou valores.

roomBanner separa duas medições em sensor-measure,com unidades inseparáveis;varanda usa coluna de duas linhas e font adaptado à largura máxima da divisão. Status pode quebrar linha. Resize atualiza --pin-max-width antes de conter/recolocar os banners,para não conservar largura antiga após rotação. Preservar arrasto,preferências,leituras,qualidade,alvosinterativos e pedidosShelly.

233 testes aprovados,JS/buildMeteo concluídos. Verificação820×1180 e1180×820:nove bannersmedia/office comscrollWidth/Height dentro declientWidth/Height;varanda44px sem overflow,temperatura/humidade em duas linhas. Zero erros/comandos. Provas review/banner-varanda-ajustado-2.19.png e review/banners-dispositivos-ajustados-2.19.png.

# Candeeiro da consola usa luz da sala — 2.20

Pedido explícito:associar candeeiro do popup multimédia à mesma luz da sala. Acrescentar alvo sobre abat-jour,realceazul,banner opcional e seleção local living-lamp;sem nova entrada em mediaBindings ouID/canal. Snapshot usa lightBinding/lightReading/lampSnapshot('living'),controlo usa commandLight('living',on),refresh light/living e definições focam shelly-light-id-living. Scope do popup resolve living-lamp para a associação living existente. Reutilizar guards,frescura,confirmação e estado real;lampSnapshot passa a expor pending sem IDs/segredos.

Consumo partilhado usa rolelight/idliving. consumption.mount reutiliza o mesmo painel ao trocar rolemedia/light e limpa assinatura,sem duplicar cartões ou manter consumo da TV selecionada anteriormente. Não inventar medições ausentes. Iluminação do candeeiro/consola continua a seguir apenas o estado confirmado da luz living,com os renders existentes. Sem alterações aos outros equipamentos,layout da planta ou associação da sala.

234 testes aprovados,incluindo ID/scope partilhado sem associação media. Fixture fictícia820×1180:seleção consultou luzliving,clique explícito enviou apenas set/switch deadbeef3333/canal0/ontrue e confirmação mudou iluminação da consola;nenhum equipamento real contactado. Alternância TV/candeeiro mantém um painel de consumo e role correto,zero erros. Prova review/candeeiro-popup-luz-sala-2.20.png.

# Monitor da secretária com ecrã preto — 2.21

Pedido explícito:quando o monitor estiver desligado,o seu ecrã fica preto no popup. office.js acrescenta SVG sobre apenas os píxeis do ecrã(129,486..896,718 em1024×1536),preservando moldura,webcam,restantefotografia,banners e alvosclicáveis. Estado visual segue mediaSnapshot('monitor').on confirmado:falso preto,verdadeiro revela render original;desconhecido não mostra imagem iluminada. Não criar novo limiar de consumo ou inferir standby,nem mudar comandos/associações. Overlaysem pointerevents,camada1 sob realces/banners,transição respeita reducedmotion.

Fixture office=off apenas ID fictício deadbeefee00OFF.234 testes aprovados e buildMeteo concluído. Verificação820×1180:OFF opacidade1,ecrãpreto sem recortar moldura,sem comandos reais. Prova review/monitor-preto-2.21.png.

# Contador distingue espera e indisponibilidade — 2.22

Pedido/diagnóstico:ao abrir popup e suspender consultas gerais2.15,o contador marcava como indisponíveis os restantes equipamentos porque usava validadores de atuação que expiram com a idade. Não significa perda da ligação dos Shellys.

CasaCloudActivityCore.readingCondition separa erro/offline/missing/errocomponentes/leiturasinválidas atuais(unavailable),semconsulta(pending) e timestampantigo(stale). activitySnapshot deduplica as categorias porID com prioridadedeerro e preserva120s para sensores;max45s restantes. No popup o contador mostra «Prioridade ao dispositivo» e estado poratualizar quando necessário,sem tratar a espera do resto comooffline. Detalhes separam Indisponíveis,Dados desatualizados,Ainda por consultar eEm espera pelo popup. Contagens disponíveis descontam valoresantigos/pendentes;fasefocused não declara todosprontos. Envio,confirmar,429,erros de consulta eestado de fila conservam precedência.

Alteração apenas de diagnóstico/apresentação:nenhuma mudança a polling,prioridade,guards,comandos,frescura paraatuação ou leituras recebidas.237 testes aprovados,incluindo tempoenvelhecido vsfalha,scope eprecedênciadecomandos/pausas. BuildMeteo concluído.
Verificado em fixture1180×820 após envelhecimento das leituras de fundo:contador «Shelly · Prioridade ao dispositivo»,TV atualizada e restantes mantêmúltimaleitura,sem comandos/erros. Prova review/contador-prioridade-popup-2.22.png.

# Intensidade dos três candeeiros — 2.23

Pedido explícito:slider além deON/OFF na sala,quartoGui/bedroom2 eprincipal/master. brightnessControl monta controlo nativo0..100 em decorateLight e também no candeeiro partilhado do popupmultimédia. input apenas ajusta rascunho;change(largar/teclado)envia uma só alteração pela fila existente. Valor0 enviaONfalse;acima0ONtrue combrightness. Manter botão de alimentação e último valor confirmado;nenhuma escrita no arranque/consultas/importação nem persistência otimista.

CORE.lightStatus aceita brightness finita0..100 de lightsGen1/light:nGen2 no canal exato. canDim exige tipo real light,percentagem reportada,estado online/fresco/sem erros/não futuro. dimmerCommand e transport/lightCommand validam inteiro0..100 e proíbembrightness em switch. Transporte usa o endpointCloudv2set/light com id/channel/on/brightness;guard verifica novamente saída/tipo/canal/frescura no envio,sem inventar capacidade em relés.

commandLight opcionalbrightness reutiliza lightTargets e confirmação limitada3tentativas/30s;brightnessTargets adicional obriga novoON epercentagem correspondente antes de confirmar. Expiração/settle/configlimpamambos;nunca retry deatuações. ComandoON/OFFmaisnovo cancela expectativa antiga debrightness. lampSnapshot expõe brightness/canDim semIDssegredos. Sliders desativados e «Intensidade indisponível» quando a Cloud não reporta capacidade;não mudar tipo/canal/configuração para forçar dimmer. Sem novos timers/pedidos de polling.

Documentação confirmada: https://shelly-api-docs.shelly.cloud/cloud-control-api/communication-v2/ (Control aLight),https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Light/ .241 testes aprovados:Gen1/2,canal/tipocorreto,intervalos,stale/futuro/offline,transporte,confirmação depercentagem e expiração. Fixture dimmers exclusivamenteIDsfictícios,brightness65/45/70. SalaEnd enviou exatamenteumset/light deadbeef3333,canal0,ontrue,brightness100;receção posterior confirmou100. Três sliders ativos,consolamultimédia partilha100,zero erros. Prova review/intensidade-candeeiro-2.23.png. BuildMeteo concluído.

# Largura do popup da secretária — 2.24

Pedido explícito:alargar o popup para título e valores de consumo ficarem numa linha. office.fit conserva ajuste proporcional da imagem,mas usa largura mínima640px limitada pela área disponível(viewport−28px),em vez de360px. A altura disponível deixa de apertar o popup abaixo desse mínimo;em ecrãs baixos mantém scrollvertical nativo. Apenas secretária,sem alterações ao popupTV ou à comunicaçãoShelly.

CSS restrito aoffice-popup impede quebra do título e dos valores/unidades,com tamanho adaptativo do título abaixo520px. Imagem completa sem recorte,alvos,banners e controlos preservados. Verificação em fixture isolada820×1180,1180×820 e390×844:sem overflowhorizontal,título e valores numa linha,zero comandos e erros.241 testes aprovados e buildMeteo concluído. Prova completa820×1450 em review/secretaria-largura-2.24.png.

# Fundo preto no modo vermelho da MeteoNL — 2.25

Pedido explícito:fundo completamente preto,apenas informação e símbolos vermelhos. #root recebe fundo opaco#000,minheight100dvh e isolation:isolate apenas emred-night,garantindo que a camada multiply multiplica uma superfíciepreta em vez de tingir uma superfície transparente. Paisagem e nightveil ocultos no vermelho;cartões,horaatual,botões,aviso e definições têm fundopreto sem blur/sombras coloridas. Preservar paleta/intensidade de primeiro plano,horários,modocolorido,layout e controlos.

BuildMeteo e241 testes aprovados. Verificação1180×820:palettered,root/card/hour rgb(0,0,0),isolationisolate;píxeisde fundo confirmados#000 na captura. Prova review/meteo-vermelho-preto-2.25.png. Nenhum comandoShelly.

# Slider das luzes igual ao dos estores — 2.26

Pedido explícito:mostrar linha no slider de intensidade,igual à dos estores. A regra global do range usa gradiente com--value;nas luzes faltava essa variável,o que invalidava o fundo. brightnessControl define--value ao apresentar a leitura e durante input(rascunho),sem novos comandos. Campo mantém cursor partilhado e linha6px,substituindoaltura32px por margens21px para preservar espaço vertical. Controlo partilhado aplica-se aos três candeeiros e candeeiro da consola. Sem alteração deenviochange,confirmação ou guardas.

241 testes ebuildMeteo aprovados. Fixture dimmers:sliderSala70%,gradiente azul até70% e linha6px,cursor correspondente,zero comandos. Prova review/slider-luzes-linha-2.26.png.

# Secretária inteira sem scroll — 2.27

Pedido explícito:caber todo o popup,cortando imagem por cima e por baixo. Manter largura mínima640px limitada à viewport2.24. office.fit agora atribui à cena apenas altura restante depois do cabeçalho e painel;fotografia mantém proporção e tamanho original dentro de stage único com todos os overlays/banners/alvossolidários. Recorte usa42% do excesso emcima(limite20% daimagem),restanteembaixo,priorizando os equipamentos. Cabeçalho embutido duplicado oculta-se quando há corte para evitar umbannerparcial. Popup e painel sem scroll;imagem não deformada,monitorpreto e alvos alinhados.

Fixture isolada820×1180:clientHeight=scrollHeight1150;1180×820:790/790,painel203/203,todos os8alvos/banners contidos na cena. SeleçãoTerraMaster funcional,zero erros/comandos.241 testes aprovados,buildMeteo concluído. Provas review/secretaria-sem-scroll-2.27.png e review/secretaria-sem-scroll-paisagem-2.27.png.

# Realce de utilização das consolas na planta — 2.28

Pedido corrigido explicitamente:feedbackvisual na planta sobre consolaTV e secretária,não nos popups. Os dois triggers existentes recebem data-screen-working e realceazul persistente(contorno,aureola e íconeazul) enquanto emutilização;hover/clique/ocultarícones mantêm comportamento. Não acrescentar halo/legenda aos ecrãs dos popups.

CasaMediaCore.screenWorking exige associação,ontrue,leitura não stale e potênciafinita>10WTV(exclui regeneração2..10) ou>2Wmonitor(limiarvisual para descartar consumoemespera). Não altera estado do relé,imagem do monitor/regrasTV ou comandos. syncOperatingPlan reaplica apósmediachange e no timer local2s existente também quando popup fechado;sem consultasnovas. Leituras ausentes/desatualizadas não afirmam utilização.

242 testes aprovados com limites/standby/regeneração/ausência/offlineindireto,buildMeteo concluído. Fixture comTV23,5W e monitor25W:ambos realçados na planta e nenhum realce novo dentro dos popups;zero comandos. Prova review/planta-consolas-em-utilizacao-2.28.png.

# Reflexo da televisão no chão — 2.29

Pedido explícito:luz/reflexo daTV no chão da sala na planta. media.js acrescenta grupoSVGtv-floor-reflection à room-lighting,antes dawhite-wall-overlay,recortado pelo night-clip-living. Gradientesazuis com blur9 nas coordenadas315..445,y839 projetam luz atéy985,à frente da consola,sem atingir sofá/paredes ou captar cliques. Preservar máscaras/renders de luz atuais.

Visibilidade segue exclusivamente screenWorkingTV2.28:potênciafresca>10W,ontrue,sem regeneração/standby. Intensidadevisual .3diurna até.85noite conformeCasaEnvironment.darkness;environmentchange sincroniza sem consultas ou comandos. Transição suave,respeita reducedmotion. Sem persistência/configuração nova.

242 testes ebuildMeteo aprovados. Fixture isolada820×1180:TV23,5W,reflexo visível à frente da consola,opacidade.85noturno,clipliving e máscara deparedes acima,zero erros/comandos. Prova review/tv-reflexo-chao-2.29.png.

# Contornos verdes e previews diurnos — 2.30

Pedidos explícitos:realce daTV/secretária na planta verde como desumidificador;aparelhos nos popups emmodo diurno. media.css troca apenas paleta de[data-screen-working=true] para#23eb86/halo#14d873,igual ao desumidificador. Estados/limiares/hover existentes e reflexoazulado daTV no chão preservados.

heater/dehumidifier.drawLighting mantêm noite dinâmica apenas no objeto da planta;variávelnight do dialog fica0 para revelar sempre o renderdiurno nos popups. Sem mudanças ao controlo/consumo/layout/arrasto ou à iluminação da planta.

242 testes ebuildMeteo aprovados. Verificação visual não executada:revisãoautomática rejeitou iniciar a fixture por limite deutilização do serviço,não por determinação de insegurança. Não contornar essa revisão ou contactar equipamentosreais.

# Reflexo do monitor e visibilidade com iluminação — 2.31

Pedido explícito:adicionar luz do monitor na planta e manter ambos os reflexos visíveis também no render de iluminação elétrica. office.js acrescenta grupooffice-floor-reflection antes dawhite-wall-overlay,clippedpor night-clip-bedroom2;gradientesblur9 projetam luzfria à frente da secretária575..714,y558..671,sem alvos de interação. Usa screenWorkingmonitor existente>2W;estadoOFF/desatualizado não mostrareflexo. Preservar contornosverdes2.30 e popupsdiurnos.

CasaMediaCore.reflectionStrength partilhada:.6base+.25darkness+.15electricOpacity,entradas finitas limitadas0..1,totalaté1. TV e monitor usam--screen-floor-strength para não apagar/atenuar demasiado a luz com renderelétrico oudiurno. Ambos os grupos ficam acima dos renders noturno/elétrico e abaixo da máscara branca de paredes. syncPlan/ambiente e timerlocalexistente atualizam apenasvisual;sem novospedidos/persistência/comandos.

243 testes aprovados,incluindo intensidadefinita nos modosdiurno/noturno/elétrico,JScheck ebuildMeteo concluídos. Verificação visual pendente:início dafixture anteriormente bloqueado por revisãoautomática devido a limite deutilização;nenhuma tentativa de contornar ou testar equipamentosreais.

# Contorno único nas consolas — 2.32

Pedido explícito:retirar linha dupla do contorno da consolaTV e usar o estilo sóbrio do termoventilador. Regra partilhada de utilizaçãoTV/secretária passa a border2pxverde#23eb86,sem outline,sem preenchimento e apenas sombraexterna suave6px#14d873b3. Não aplicar anel adicional inset. Hover/seleção/estado/limiares/reflexos preservados.

BuildMeteo concluído. Fixture isolada820×1180:ambos emutilização com border2px,outline none,backgroundtransparente e uma sombraexterna;reflexosTV/monitor continuamvisíveis. Zero comandos. Prova review/contorno-unico-consolas-2.32.png.

# Inventário de dispositivos por divisão — 2.33

Pedido explícito:clique no banner da divisão mostra todos os seus equipamentos com estado/botão de alimentação. Novo room-devices-core.entries partilhado por UI e scope de leitura:iluminação por divisão,sensores master/living/balcony,estores/janelas nasquatrodivisões,cincomedia+portaentrada na sala,quatrooffice no Gui,trêskitchen na cozinha eportáteis conforme roomId atual. Não duplicar candeeiro da consola. Sem IDs/credenciais novos ou novos dados persistidos.

room-devices.js renderiza lista compacta no detailViewroom,com nome clicável para controlos individuais,potência/atividade quando existente,temperatura/humidade,contactos e percentagem doestore. Botões CasaPowerButton reutilizam snapshots/guards e commandLight/Media/Office/Kitchen/Heater/Dehumidifier;verdes apenas comONreportado,unknown/desatualizado/pending desativados,sem otimismonem retries. Relés mostram Com/Sem energia para não confundir standby/regeneração com utilização. Luzes semassociação mantêm simulação explícita. Sem botão de alimentação em sensores/estores. Refreshcircularúnico consulta sóinventário. Nome do candeeiro abre slider jáexistente,estore abre controlossem mover,media/officeopen(id) selecionaaparelho sem comandar. Portáteis expõem getterroomId eopen sem mudarposição.

app.drawDetail delega apenas detailViewroom e mantém controlos específicos de candeeiro/estore. consumption.room não acrescenta consumo isolado do candeeiro à listageral. CSSroom-overview520pxmáximo,responsivo/listascroll. Atualizações reutilizam linhas/botões para preservar foco;sem gráficos ou explicaçõeslongas.

Shelly roomDeviceBindings deriva scope da mesma lista e resolve associaçõesexistentes;popup room agora prioriza todos os IDs da divisão,com deduplicação e lotesexistentes. Contextos light/blind/selecionadomedia mantêm scopeindividual. selectRoom deixa renovação inicial a focusPopup,evitando consultasfragmentadas duplicadas;refreshEquipmentroom resolve mesmo inventário. Sem alterar intervalos/fila/limites/frescura/confirmações.

246 testes aprovados:inventárioSala semduplicações,membershipportáteis,isolamentoentredivisões,scopecompleto e contextosindividuais;teste antigo blind-access atualizado para permitir leitura doestore no inventário mas continuar a separar movimentos/controlos. BuildMeteo eJScheck concluídos. Fixture820×1180:Sala10dispositivos,Gui7,Cozinha6,Principal5incluiheater;botãoTV enviou apenas umset/switch deadbeefff00/canal0/onfalse e confirmou;clique nomeTV abriu respetivo popup sem novos comandos. Ecrã390×844 semoverflowhorizontal(client/scrollWidth350). Zero erros. Prova review/dispositivos-sala-2.33.png.

# Reflexos mais fortes com luz acesa — 2.34

Pedido explícito:dar mais ênfase à luz projetada por TV/monitor no renderelétrico. reflectionStrength mantém .6base/.85escuro mas aumenta contribuiçãoelétrica de.15 para.7,limitada1. Ambos os grupos recebem brightness1+1.25electricOpacity em variávelCSSprópria:até2.25x com luzacesa,1x apagada. Não ampliarprojeções/recortes nem alterar limiares,estado/fila,Shelly,contornosverdes ou popups. Blur/gradientes e paredebranca permanecem.

246 testes ebuildMeteo aprovados;teste asseguraopacidade1 comelétrico1 e>.9 comcontribuição.45. Fixture isolada820×1180,3candeeirosONreportados,TV/monitorativos:reflexos sobre render quente,opacity1 ebrightness2.25,zero comandos. Prova review/reflexos-luz-acesa-2.34.png.

# Auréolas verdes dos candeeiros — 2.35

Pedido explícito:auréolaverde nas três lâmpadas acesas. CasaLamps.halo usa os pontos/radius existentes do disco visto de cima(master737,223;Gui750,534;sala475,840),com círculo radius+1,linhaúnica2px#23eb86 e sombra4px#14d873b3. app insere círculos noSVGroom-lighting após renders deiluminação e antes dawhite-wall-overlay. drawRoomLighting liga opacidade arooms.light existente,que deriva doONreportado para associaçõesreais ou simulação explícita. Nenhum novoestadootimista,pedido ou comando.

Alvos44pxdehover/clique permanecemtransparentes e separados;halo segue somente odisco,sem pés/mobiliário/parede.246 testes ebuildMeteo aprovados. Fixture820×1180:trêsONopacidade1,desligadosopacidade0,zero comandos. Carregamento inicial teve scriptCasaPowerButton ausente transitoriamente;reload carregou todos os controlos,sem alterar código alheio à tarefa. Prova review/candeeiros-aureola-verde-2.35.png.

# Lista de Shellys no banner da cave — 2.36

Pedido explícito:bannerCave deve mostrar também os equipamentos do local. Coreentriescellar contém ventoinha,alarme/arm,alarme/trigger,sensorcellar e portacellar. O carregamento continua no estacionamento comoseu acessoexistente. CasaRoomDevices.openCellar usa basement-dialog com a mesma lista/toolbar/estados das divisões,sem duplicar cabeçalho ou textos antigos. Ventoinha usa commandFan;alarme/arm usa commandAlarm(polaridade/guardsexistentes);alarme/trigger é sóleitura,sem botão de alimentação e sem ramo de comando. Nomesventoinha/alarme abrem os popups individuais existentes. Sensor/porta conservam leitura real sem inventar valores.

InventáriosDOM emWeakMapperhostpara atualizações simultâneas de detail-card e basement-dialog-info não trocarem os handlers/linhas. GetterdoorSnapshot usa e.id;CasaFan expõeopen. Floorsbanner delega ao novo inventário quando disponível,preservando fallbackantigo e acessoEV separado. Scopebasement e refreshEquipmentcellar resolvem a mesma listadeassociaçõesfan/alarm2/sensor/door comdeduplicação;nenhum novo timer/fila/ID/configuração persistida. Semmovimentos ou atuaçõesaoabrir.

248 testes ebuildMeteo aprovados,novos testesinventorycellar e isolamento de prioridades. Fixture820×1180:5linhas;trigger0botõesdepotência;ventoinhaON ealarmeArmado;togglefan enviou exatamenteumset/switch deadbeefbb01/canal0/onfalse e confirmouDesligado;clicarDisparo abriu popupAlarme sematuar. Zero erros. Prova review/dispositivos-cave-2.36.png.

# Hover sobre consolas ligadas — 2.37

Pedido explícito:consolaTV/secretária perderam feedbackdehover enquanto realçadas a verde. Causa:regra[data-screen-working=true] substituía fundo/outlines das regras:hover originais. Acrescentar regras específicas paraactive:hover/active:focus-visible:preenchimentoazulvar(--plan-highlight-bg) e íconemaisclaro,singleborderverde mantido,outline none semanelduplo. Estado/desenho/reflexos ecliques preservados;alteraçãoCSSapenas.

BuildMeteo concluído. Fixture820×1180:TV/monitorativos,hoververdadeirocombackgroundrgba117,172,216,.26,borderverdeRGB35,235,134,outline none. Ao moverparaoutro,primeiro regressaaotransparente;clicarsecretária abre office-dialog normalmente. Zero comandos. Prova review/hover-consola-ligada-2.37.png.

# Espessura uniforme dos contornos verdes — 2.38

Pedido explícito:todas as linhasverdes da planta iguais,consolas mais finas. TokensCSSpartilhados--device-on-width1px,--device-on-color#23eb86,--device-on-glow#14d873b3 efilterdecontorno. Consolas usam border1px eglow4px;halos das lâmpadas stroke1px comvector-effectnon-scaling-stroke para não variar com escaladaplanta. Heater/dehumidifier/fan reutilizamfiltercomoffsets±1px. Alarme armado usa haloSVG1pxnon-scaling eglow4px,preservando animação/estadovermelho dedisparo. Não afetar botõespopups,hoverazul,limiares,estados oureflexos.

BuildMeteo concluído. Fixture820×1180:consolasborder1px,lâmpadasstroke1pxnon-scaling,aparelhosfilter±1px/glow4px;na cave alarme1px efilterfanigual. Zero comandos. Prova review/contornos-uniformes-2.38.png.

# Definições Shelly organizadas por divisão — 2.39

Pedido explícito:agrupar as configurações dos Shellys por divisão. Novo shelly-rooms.js monta secções com nomes atuais das divisões e move os gruposDOM existentes(sala/multimédia/porta,Gui/secretária,cozinha,cave/porta/alarme/ventoinha,portáteis conforme roomId). Contadorgeral emCasa·geral eEV emEstacionamento. Secções vazias ocultas. Secções são abertas/cabeçalhos simples;details individuais preservam colapso/acessibilidade e atalhos diretos sem novos antecessores fechados.

Mapeamentos partilhados de candeeiros/sensores/estores movidos como fieldsets reais para details individuais por divisão,com labels/IDs/valores/listeners intactos;originaiscontainers/grupos mantidos ocultos para compatibilidade. Janela mantém seu nódetails/inputs existente com summaryJanela econtentwrapper. Não clonar campos,reescrever associações ou persistir novaestrutura. Guardarconfiguração globalmantido;grupos dedicados mantêm os seus botões existentes.

Antes de Shelly.fill,CasaShellyRooms.restore devolve fieldsets às fontes;fillregenera campos comoantes;sync reposiciona os novosnós. Isto evitaIDsduplicados,perda devalores ou deixar leitores de formulário a usar nósantigos. Sync não move nós cujo parentjá estácorreto,preserva edição;atualiza nomes/portáteis emeventosexistentes sem pedidosCloud. Warnings,jump evalidationusamIDs/antecessores reais econtinuamfuncionais.

248 testes ebuildMeteo aprovados. Fixture820×1180:101campos(comchave),zeroIDsduplicados;100camposnão secretos exatamenteiguais antes/depoisdeGuardarconfiguração,reabertura epreenchimento;zero comandos. Atalho do popupcandeeiroSala abre novo grupocorreto,DeviceIDvisível e focado. Zero erros. Prova review/shelly-definicoes-divisoes-2.39.png.

# Hover exterior das consolas ligadas — 2.40

Pedido explícito: TV e secretária em utilização devem manter o contorno verde e receber o realce azul exterior ao passar o rato, coerente com os restantes dispositivos. Em media.css, o hover/focus dos triggers com data-screen-working=true mantém background transparente e acrescenta outline azul de 2px com offset 2px. Contorno verde de 1px e reflexos preservados; sem alterações de comandos ou leituras.

Build Meteo concluído. Verificação na fixture isolada a 820×1180 para ambas as consolas ligadas: hover verdadeiro, fundo transparente, border verde 1px, outline azul 2px exterior com offset 2px; zero comandos. Provas review/hover-exterior-secretaria-2.40.png e review/hover-exterior-tv-2.40.png.

# Cabeçalho, área da planta e zoom — 2.41

Pedido explícito: retirar a barra inferior azul, mover Controlos/Definições para junto do relógio, permitir pinch no iPad até 4× e ajustar a vista ao mudar de piso. O cabeçalho contém agora o banner com Controlos/Cenários/Definições, preservando os IDs/listeners existentes; Casa passa ao ícone no topo. Indicador Piso 1/−1 independente no fundo, sem dock. plan-layout.css usa o espaço livre e as safe areas, adapta o cabeçalho a ecrãs estreitos e mantém os controlos fora da zona ampliada.

plan-zoom-core.js contém apenas geometria (1..4×, âncora entre dedos, limites de deslocação). plan-zoom.js usa Pointer Events com touch-action:none herdado dos pisos: pinch cancela primeiro drags de equipamentos/banners, captura ambos os dedos e suprime o clique final; pan de um dedo quando ampliado, preservando o arrasto dos elementos móveis. A 1× mantém o swipe original; ampliado, um swipe vertical para fora do limite muda de piso. floorchange/resize/Casa repõem ambos os pisos a 1× e centrados. Botões +/ajustar/− acessíveis com alvos 44px, canto inferior esquerdo; pinch de trackpad via ctrl+wheel também suportado. Sem persistência de zoom, mudanças de associações, comandos ou novos pedidos Cloud. Não ampliar a página inteira nem os popups.

pinMaxWidth usa offsetWidth sem transformação, para o zoom não alterar as dimensões lógicas/persistência dos banners. Preservar divisão/posição/recortes de iluminação e a camada branca das paredes.

253 testes aprovados (incluindo âncora/limites, sequências pinch/pan, cancelamento de drag, supressão de clique e reset entre pisos/resize), build Meteo concluído. Fixture isolada: cabeçalho/controlos/definições/cenários operacionais; selecionar secretária a 1,5× abre o mesmo popup; 4× confirmado, mudar para cave repõe ambos a 1×; zero comandos. Verificados 820×1180,1180×820,390×844 sem overflow horizontal do documento. Gesto físico em iPad não disponível neste ambiente; as sequências de Pointer Events são verificadas em testes isolados. Provas review/planta-cabecalho-2.41.png e review/planta-zoom-4x-2.41.png.

# Consumo geral fixo na coluna lateral — 2.42

Pedido explícito: consumo da casa sempre presente em barra vertical por cima dos pontos de piso, com a mesma largura, verde em baixo/vermelho em cima e clique para o popup. energy-pin passa de filho de plan-stage para irmão dos pisos (dentro de casa-app após montagem Meteo), com posição fixed; fica visível nos dois pisos e independente do zoom. Barra, navegação de piso e controlos de zoom partilham largura44px e alinhamento à safe area esquerda. Consumo kW compacto no topo e marcador horizontal na escala vertical. Valor/percentagem/acessibilidade/tooltip continuam a usar o mesmo snapshot; sem associação/erro/stale, escala neutra e marcador oculto, sem inventar zero. Popup e fonte de dados mantidos.

O toggle antigo Mostrar consumo geral da casa foi retirado para cumprir sempre presente. A chave histórica casa-nl-show-energy-banner mantém validação/roundtrip de backups antigos, mas já não oculta esta barra fixa; não apagar preferências nem reescrever backups. Meteo cobre a Casa e mantém o contentor inerte como antes. Nenhum novo pedido Cloud, comando, associação ou temporizador.

253 testes e build Meteo aprovados. Fixture820×1180: barra/pontos/zoom com44px de largura e left0; barra permanece exatamente no mesmo retângulo a4× e no piso−1. Leitura fictícia1,200kW/17%, gradiente to top verde→vermelho; clique desde a cave abre contador geral com os mesmos dados; zero comandos, sem errosJS. Prova review/consumo-vertical-2.42.png.

# Retirar Cenários — 2.43

Pedido explícito: retirar também os Cenários. Removidos botão do cabeçalho, popup e handlers/função de simulação associados; texto das definições atualizado para já não referir cenários. Banner superior fica apenas com Controlos/Definições. Sem alterações a comandos, associações, estados ou preferências dos dispositivos.

Sintaxe app.js e build Meteo aprovados. Fixture820×1180: ambos os botões restantes abrem/fecham os seus popups; sem errosJS. Prova review/cabecalho-sem-cenarios-2.43.png.

# Progresso Shelly na barra lateral — 2.44

Pedido explícito: substituir o indicador/botão horizontal de pedidos Shelly por barra lateral no estilo do consumo, a subir durante a consulta e verde no final. cloud-activity.js agrupa o botão existente e energy-pin em plan-status-rails, acima dos pontos de piso (Shelly por cima do consumo). Largura/alinhamento44px comuns; altura das duas barras adapta-se ao espaço acima dos pontos e à orientação. Popups/IDs/acessos existentes preservados; fora do zoom, ambos os pisos; dentro de casa-app para a mesma proteção inerte/cobertura Meteo.

CasaCloudActivityCore.progress calcula apenas a apresentação: durante loading usa doneDevices/totalDevices; restantes fases usam availableDevices/configuredDevices. Verde cheio exige ready e todos os associados disponíveis; carregamento azul, aviso amarelo, erro vermelho, não configurado neutro. Atualizações de fundo com dados recentes mantêm100% verde. Prioridade de popup e dados em espera nunca simulam prontidão geral. Cliques abrem o mesmo Estado dos pedidos; métricas e leitura de snapshots/timer existentes mantidos, sem novos pedidos Cloud/comandos.

255 testes e build Meteo aprovados, incluindo progresso parcial, prontidão completa, atualização de fundo e estados indisponível/focado/sem configuração. Fixture:53% durante10/19,100% verde após19/19 com0 indisponíveis; popup mantém19/19 e2/2 pedidos.820×1180: barras44×184 emx0, acima dos pontos;1180×820:44×125, sem sobrepor cabeçalho/pontos. Sem comandos. Prova review/shelly-barra-lateral-2.44.png.

# Retirar barra de zoom — 2.45

Pedido explícito: desaparecer a barra de zoom. Retirada a criação dos botões +/1×/− e respetivos estilos/listeners; mantidos pinch até4×, pan, trackpad, reset na mudança de piso/resize e ajuste pelo botão Casa. Testes existentes adaptados para usar gestos em vez dos botões retirados; os5 testes de zoom passam. Build Meteo aprovado. Fixture820×1180 sem barra, barras Shelly/consumo e indicadores de piso intactos; sem errosJS. Prova review/planta-sem-barra-zoom-2.45.png.

# Versão no fundo das Definições — 2.46

Pedido explícito: número da versão também no fundo das Definições, porque o cabeçalho compacto oculta a marca no iPad. Acrescentado footer textual Casa NL · Versão 2.46 após Repor demonstração, com data-app-version e estilo discreto/separador. Em próximas versões atualizar também este texto ao sincronizar index.html. Sem alterações de comportamento/configuração/comunicação.

Build Meteo aprovado. Fixture768×1024 com marca oculta no cabeçalho: footer visível no fim do popup, texto correto, zero comandos. Prova review/versao-definicoes-2.46.png.

# Regeneração da TV e desvanecimento da iluminação — 2.47

Pedido explícito: regeneração TV entre5 e50W, e cortes de iluminação mais suaves no tempo e nos bordos (utilizador confirmou Ambos). MediaCore centraliza TV_REGEN_MIN=5/TV_REGEN_MAX=50: regeneração inclusiva nesse intervalo apenas com leitura atual/relé ligado; activityThreshold e screenWorking TV passam a>50W, preservando monitor>2W e máquinas>10W. Tooltip/aria do indicador atualizado. Fixture tvregen aceita valor numérico fictício e mediaactive usa85,5W na TV para continuar a representar utilização real segundo a nova regra.

Iluminação: drawRoomLighting mantém os nósSVG entre atualizações. Dois campos globais (noturno/elétrico) recebem máscaras alpha partilhadas com paths por divisão e blur4px no grupo das máscaras, para evitar a composição de várias imagens parcialmente transparentes nas junções. Stroke branco16px dos paths expande a máscara sob a suavização, evitando linhas claras finas nas bordas de pavimento; clip exterior continua limitado à união dos polígonos de chão/vãos existentes. Clips individuais preservados para reflexos, sprites e outras dependências. Paredes brancas permanecem na camada white-wall-overlay acima de tudo, opacidade1. Patches dos candeeiros/portas/janelas e efeitos existentes preservados. Opacidade das máscaras e patches noturnos/elétricos transita em1,8s ease-in-out; respeitar prefers-reduced-motion. Modelo de luz diurna/abertura proporcional e luz elétrica inalterado; apenas apresentação, sem interpolar estados/percentagens Shelly nem alterar comandos/polling.

257 testes e build Meteo aprovados. Cobertura5/50W inclusivos,50,001W utilização, valores inválidos/offline/stale, threshold das máquinas preservado; iluminação mantém nós para permitir fade, endpoints0/.5/1, clip do chão e paredes acima. Fixture820×1180:50W mostra Regeneração estimada com tvActivity=off e screenWorking=false. Fecho simulado Gui100→0: target máscara1, computado inicialmente0 e depois1 com duração1,8s; WC/corredor seguem Gui, master/sala/cozinha mantêm0; paredes1; zero comandos e errosJS. Provas review/tv-regeneracao-50w-2.47.png e review/iluminacao-desvanecer-2.47.png.

# Pisos em camadas — 2.48

Pedido explícito: usar símbolo de layers da referência em vez dos pontos de piso. floor-dots recebe classe floor-layers e SVGs vetoriais com planos em losango sobrepostos, um por cada piso existente (Casa/Piso1 e Cave/−1). Mantidos IDs de piso, aria-label/title, aria-current=page, listeners, hit targets44×44 independentes e navegação/swipe/reset de zoom. Ativo em azul claro com contorno branco; hover/foco realçados; sem novos pisos ou ícones raster.

Dois testes de floors-core e build Meteo aprovados. Fixture820×1180: clique em Cave seleciona−1/aria-current correto, clique Casa regressa1; dois alvos44×44, novo símbolo visível sob a barra de consumo. Prova review/pisos-camadas-2.48.png.
