# Multimédia da sala · 1.60

Associações fornecidas pelo utilizador, canal 0 por omissão e editável:

| Sala | Device ID |
|---|---|
| Televisão LG | 437c82 |
| Soundbar Polk | 4359bb |
| PlayStation 5 | 435aa1 |
| Router Vodafone | e465b8b9c64c |
| UniFi Dream Router | e465b84553bc |

Os quatro IDs inicialmente enviados são do escritório, segundo correção explícita do utilizador, e ficam em officeBindings, separados da sala: Monitor 441db8; Placa de som Apollo e43ad8; Servidor TerraMaster e9df12; Disco rígido preto bb8ac4. Ficam disponíveis nas definições/backup para trabalho futuro; não são consultados por deviceIds nem aceites pelos comandos do popup da sala.

mediaBindings contém apenas tv, soundbar, playstation, vodafone e unifi, com deviceId hexadecimal e channel inteiro0..15. officeBindings aceita monitor, apollo, terramaster e blackdrive. Validar duplicações de saídas também contra luzes, estores, EV, alarme e ventoinha. Um papel só de leitura, como o gateway Bluetooth da porta, pode partilhar ID. Campos ausentes em cópias antigas continuam opcionais. A inicialização acrescenta os defaults autorizados apenas quando o respetivo campo não existe; não substitui associações guardadas nem reintroduz um campo explicitamente esvaziado ({}). Mesma política da chave e armazenamento de configuração existentes. Importação/exportação valida e preserva ambas as coleções.

Os banners HTML cobrem integralmente os estados impressos na imagem fornecida; pontos sobre os aparelhos acompanham os mesmos dados. Estados são Com energia/Sem energia/Por confirmar/Por associar, exclusivamente do relé switch/relays no canal exato. Não inferir aparelho em funcionamento ou em standby. Dados offline, inválidos, erros, ausência ou idade acima de45s bloqueiam o controlo e ficam neutros. Sem endpoints ou SDKs dos fabricantes.

Clicar num banner seleciona o aparelho; ligar/desligar é explícito nos botões do painel. Usar CasaShelly.commandMedia e a fila HTTPS Cloud existente, com payload switch/on booleano. Não atualizar otimisticamente; aceitação HTTP aguarda consulta. Polling partilhado15s, e2s após comando até90s, sem retry automático. Guardar/importar/carregar/consultar/selecionar nunca aciona equipamentos. Excluir comandos gerais de iluminação, estores, cenários e reset; protetor adiado enquanto um comando fica pendente.

Definições → Shelly Cloud → Multimédia da sala permite editar os cinco IDs/canais, com grupos por equipamento. Grupo separado Escritório · associações guardadas. Atalho no painel abre o equipamento selecionado.

Popup ajustado a toda a altura disponível, imagem dimensionada por ResizeObserver, cabeçalho/fechar e painel sempre visíveis. Verificado em820×1180 e768×1024: scrollHeight=clientHeight, sem scroll. Mesma consola, popup da sala e Controlos gerais como acessos.

133 testes automáticos passaram, incluindo schema, duplicações, estados reais, comandos explícitos e backup das duas divisões. Interface isolada em tests/serve_lights_fixture.py?media=normal/offline/unknown, mediahold e mediareject. Cinco IDs falsos deadbeefff00..04. Verificadas atuação independente TV/soundbar, offline bloqueado e confirmação pendente sem estado otimista. Nenhum equipamento real foi acionado. Prova: review/multimedia-sala-1.60-ipad.png (dados simulados).

## 1.61 — Consumos por equipamento

Cada consulta existente de multimédia também normaliza o medidor do mesmo ID/canal via CasaEVCore.meterStatus(component:auto), sem pedido adicional. Gen1 meters/emeters e Gen2 switch/pm1 reutilizam a conversão W/kWh testada. Não escolher famílias ambíguas, não usar outro canal nem deduzir zeros a partir do relé desligado. Schema/IDs do escritório e comandos não mudam.

MC.state expõe powerWatts/energyKWh apenas com medidor válido, online, sem erros e consulta até45s. Zero real é válido; ausente, inválido, erro ou offline é null. Banners mostram W junto do estado; painel selecionado mostra Agora W e Total kWh, ou Não disponível. O total é o acumulado fornecido pelo equipamento, sem inventar período diário/mensal. Os dados de medição não inferem estado operacional nem alteram disponibilidade de comandos de relé.

134 testes passaram. Interface verificada em768×1024 sem scroll (scrollHeight=clientHeight). Fixture valida0W real,31,5W,13kWh, ausência de medidor e offline; zero comandos. Prova fictícia: review/multimedia-consumos-1.61.png.

## 1.62 — Estado visual de TV e PS5 por consumo

Por pedido explícito do utilizador, apenas TV e PS5 passam a usar consumo medido para o estado visual: exatamente0W=desligada; potência positiva=ligada. MC.activityFromPower devolve null para dados ausentes, inválidos, negativos, erro, offline ou antigos. Não confundir null com0. Esta regra substitui a anterior apresentação exclusivamente por relé nesses dois aparelhos; soundbar e routers mantêm indicação de alimentação do relé.

O relé continua independente da atividade: a TV pode mostrar Desligada com Relé: com energia. Botões só controlam alimentação e continuam a exigir leitura booleana fresca do relé. A mudança visual nunca comanda equipamentos. Valores positivos inferiores a1W mostram até3casas decimais; entre0e0,001W mostram <0,001W para evitar0W arredondados contradizerem a atividade.

Efeitos SVG nativos sobre a imagem original, sem modificar o bitmap: ecrã preto/reflexo subtil quando TV off; imagem original quando on. PS5 tem cobertura neutra das faixas luminosas originais e caminhos azuis com brilho apenas quando o consumo confirma on. Unknown usa visual neutro sem emissão e banner Por confirmar, sem afirmar desligada. Manter alinhamento1225×1284, conectores, mobiliário e banners existentes. Reduzir movimento remove transições.

135 testes passaram. Fixture mediastandby verifica relés ON com0W e visuais off; mediaactive confirma ambos on; mediainvalid mantém unknown. Teste de interface iPad768×1024 continua sem scroll. Zero comandos na fixture. Provas: review/multimedia-desligada-1.62.png e review/multimedia-ligada-1.62.png. Nenhum dispositivo real acionado.

## 1.63 — Limiar da TV de4W

Pedido do utilizador: TV tem baixo consumo em standby. activityThreshold('tv')=4; potências válidas de0até4W inclusive mostram Desligada/ecrã preto; acima de4W mostra Ligada/imagem. PS5 mantém limiar0. mediaSnapshot passa o limiar correto ao normalizador. Nada altera relés, comandos ou medições exibidas; dados inválidos/antigos continuam unknown. Texto no popup atualizado.136 testes passaram, incluindo fronteiras4/4,001W e integração do snapshot real. Sem atuação.

## Iluminação da sala — 1.64

O candeeiro e a consola do popup acompanham a luz da sala. Render sem emissão quando apagada ou por confirmar; TV/PS5 independentes. Ver MULTIMEDIA-RENDER.md para recurso, prompt e validação.

## Botão único de energia — 1.70

As duas ações de alimentação foram substituídas pelo botão circular junto do refresh. Verde é relé ligado confirmado, cinzento desligado; desconhecido aparece neutro âmbar e bloqueado. O clique calcula o booleano inverso do snapshot e usa o comando individual existente; nenhuma troca otimista, endpoint toggle ou atuação automática. Durante pedido/consulta fica desativado; só a leitura confirmada muda a cor. Mantém-se o aviso de encerramento do servidor/disco. UI verificada com dispositivos fictícios e 143 testes passaram.

Prova do botão cinzento: review/sala-botao-energia-1.70.png. Teste isolado: clique envia on explícito só à TV fictícia, mantendo a cor anterior até confirmação.
