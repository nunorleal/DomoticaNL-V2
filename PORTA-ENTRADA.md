# Porta de entrada — 1.46

A porta de entrada na esquerda da sala fica fechada por omissão. Só se mostra o render original com porta aberta quando CasaDoorCore.state devolve true. Estado desconhecido, erro, offline e consulta com mais de 45 segundos mostram a imagem fechada, mas a legenda diz «por confirmar», nunca «fechada» sem leitura false válida. Não é uma fechadura nem envia comandos.

Três imagens geradas por edição dos renders originais: assets/porta-fechada-dia-v2.png, porta-fechada-noite-v2.png, porta-fechada-eletrica-v2.png. Prompt: fechar apenas a porta de entrada no canto inferior esquerdo da sala, preservar câmara rigorosamente de cima, geometria, luz, mobiliário e todas as outras portas; repor pavimento onde estava a folha aberta. Variantes noturna/elétrica usam o render correspondente e a variante diurna como referência. Apenas um pequeno recorte SVG (x119..195, y975..1064) é usado na planta, dentro do grupo da sala e em cada ambiente; os restantes píxeis gerados não são aplicados. A máscara permanente de paredes brancas continua acima. A classe entrance-is-open oculta apenas estes recortes.

Em Definições → Shelly Cloud → Porta de entrada: a mesma conta/segredo/fila e transação de guardar dos restantes equipamentos. Campo opcional door em casa-nl-shelly-cloud-v1: {deviceId,source:'blu'|'bthome',component}. O ID BLU ou o ID do gateway em modo BTHome entra na lista deduplicada, dividida em lotes de dez. Consulta a cada 15 segundos visível e sem outra operação. Nenhum pedido de escrita ou configuração do gateway é feito.

O BLU depende de um gateway Bluetooth com Cloud ativa. Modo blu reconhece contactos binários em status['window:N'].value e status.window no componente 0. A documentação Cloud não garante o payload específico BLU em todas as contas/firmwares: validar com o dispositivo real após associação; estados não reconhecidos ficam desconhecidos. Alternativa documentada: componente BTHomeSensor do gateway já configurado para contacto/window (obj_id 45), lido em status['bthomesensor:N'].value. A app não cria componentes no gateway e não procura canais por tentativa. O timestamp BTHome é o último evento recebido e é mostrado como tal; não confundir com hora de consulta. Em modo regular o BLU transmite quando o estado muda, pelo que o último evento pode ser antigo.

Fontes oficiais:
- https://kb.shelly.cloud/knowledge-base/shellyblu-door-window
- https://shelly-api-docs.shelly.cloud/gen2/DynamicComponents/BTHome/BTHomeSensor/
- https://shelly-api-docs.shelly.cloud/cloud-control-api/communication-v2/

Config e backup validam a associação antes de gravar; cópias antigas continuam compatíveis. Tests: tests/door.test.cjs; fixture UI tests/serve_lights_fixture.py?door=closed|open|unknown|offline, opcional &bthome. A fixture só usa IDs/chave fictícios e interceta Cloud. Nunca testar comandos em dispositivos reais.

## 1.47 — IDs BLU com prefixo XB

A imagem enviada pelo utilizador confirma um ID de dispositivo BLU com prefixo XB e dígitos decimais, distinto do MAC hexadecimal. Aceitar esse ID completo na associação BLU e nas consultas de estado; preservar prefixo XB em maiúsculas e os dígitos como string, sem converter para MAC ou remover o prefixo. A comparação com a resposta ignora apenas a caixa. Continuar a exigir hexadecimal para todos os comandos e para o gateway em modo BTHome. statusDeviceId é exclusivo de consultas; deviceId continua estrito para atuação. O formulário explica os dois formatos. A aceitação do ID não confirma, por si só, que o endpoint Cloud devolverá o contacto; manter por confirmar se não o fizer.


## 1.48 — Orientação correta do vão
A porta de entrada fecha na HORIZONTAL no fundo do pequeno recanto à esquerda da sala: entre o retorno da parede esquerda (x129) e o ressalto branco (x194), junto a y1058. A folha aberta sobe a partir da dobradiça inferior esquerda; fechada, atravessa o vão inferior. A versão anterior interpretou incorretamente o vão como vertical. Foram geradas três variantes v2 a partir dos renders originais, removendo apenas a folha aberta/arco e repondo o chão, com uma folha fechada horizontal. O recorte usado tem x119,y975,w76,h89. Mantém-se a regra: imagem aberta só com leitura true; desconhecido usa fechado sem confirmar estado.

## 1.51 — Porta da cave

Segunda associação opcional cellarDoor na mesma configuração Cloud, com formato/validação idênticos a door. Não migrar nem reescrever a associação antiga da entrada. As duas leituras, classes visuais e cartões são independentes. O mesmo contacto (ID/origem/componente) não pode identificar as duas portas; o mesmo gateway BTHome com componentes distintos é permitido. IDs XB completos suportados nas consultas e no backup.

No piso −1, a porta já é um desenho SVG editável: manter esse formato e desenhar a folha fechada horizontalmente sobre o vão inferior (x8..107, y99..105 no viewBox 110×110). Grupo cellar-door-open conserva a folha/arco originais e só se mostra com leitura true válida. Grupo cellar-door-closed é o estado visual por omissão. A classe cellar-door-is-open é independente de entrance-is-open. Paredes brancas, geometria da cave, cimento e veículo mantêm-se.

Banner Cave e popup mostram estado do contacto. Popup permite atualizar leitura ou abrir diretamente Shelly Cloud → Porta da cave. Nova associação entra na transação de guardar/importar e na fila/status/batches/temporizador de 15s existentes; não tem comandos. Não deduzir fechado da ausência de dados: unknown/offline/erro/stale usam desenho fechado e legenda por confirmar.

Testes incluem configuração antiga, sensores independentes, IDs XB, duplicados e partilha de gateway; backup preserva os dois. Fixture ?door=open&cellar=closed ou ?door=closed&cellar=open; cellar=unknown|offline. UI verificou guardar sem comandos, configuração e render aberto/fechado. Tudo com dados fictícios.

## 1.56 — Verificar possível gateway

Utilizador indicou e465b8b9c64c como possível gateway, ainda por confirmar. Campo de diagnóstico pré-preenchido em Porta de entrada, sem reescrever a associação BLU existente nem supor um componente. O campo de diagnóstico é temporário e não faz parte da associação/exportação. Após confirmar o contacto, a associação BTHome existente guarda ID do gateway e componente no backup normal.

Verificar gateway chama CasaShelly.inspectDoorGateway pelo transporte/conta/fila/geração existentes, apenas status/get. Bloquear se faltam credenciais, há alterações por guardar ou comunicação em curso. Não criar componentes, configurar Bluetooth, enviar comandos nem alterar o render. Distinguir gateway ausente, offline e online sem componentes. Mostrar só IDs bthomesensor, valores numéricos/booleanos e hora do último sinal; nunca resposta bruta, chave ou strings arbitrárias. Listar um componente não prova que é o contacto. Confirmar obj_id45 nas definições do gateway antes de selecionar a origem BTHome e guardar. Não usar bateria/lux como contacto mesmo que o valor seja 0/1.

125 testes passaram, incluindo diagnóstico sem atuação/alteração de associação. Fixture gateway=closed/open/empty/offline/missing é totalmente simulada e interceta todas as chamadas Cloud. Não foi consultado o dispositivo real durante os testes. Verificação real pendente no navegador do utilizador.

## 1.57 — Campo open dos sensores BLU

O utilizador confirmou que a app oficial acompanha a abertura/fecho; o diagnóstico do gateway não devolveu componentes BTHome. Foi encontrada uma lacuna no normalizador: aceitava apenas window:N.value e não window:N.open. Suportar open booleano/0/1, incluindo false sem fallback por truthiness. Preservar value legado e window escalar no componente0. Campos simultâneos com valores divergentes ou inválidos ficam por confirmar. Erros, offline, canal incorreto e dados antigos continuam a bloquear confirmação. Não alterar ID/origem/componente, configurar o gateway, criar componentes nem introduzir endpoint legado.

Referência primária de implementação/diagnóstico de outra integração: https://github.com/notDIRK/shelly-cloud-diy-ha/issues/9 (window:0.open, com teste confirmado pelo autor do diagnóstico). Ainda falta confirmar o payload específico do equipamento do utilizador; a correção é compatibilidade de formato, não uma alegação de validação real.

Novo botão Verificar sensor BLU consulta o ID BLU associado pela fila/conta existentes e mostra apenas chaves e escalares selecionados do contacto, sem valores arbitrários/credenciais/resposta bruta. Apenas leitura, guardas iguais às do diagnóstico do gateway. Ajuda a verificar o payload real sem alterar a associação. O campo temporário de gateway continua independente.

127 testes passaram. Fixture door=open|closed&bluopen usa window:0.open com ID XB e verifica popup/estado/render, diagnóstico e ausência de comandos. Dados fictícios apenas; não se acionaram equipamentos. Prova em review/porta-blu-aberta-1.57.png.

## 1.58 — Aplicar à cave

A cave utiliza a mesma leitura window:N.open, polling e normalização da porta principal. O botão Verificar sensor BLU passa a existir também no grupo Porta da cave, com IDs próprios cellar-door-sensor-check/result. inspectDoorSensor('cellar') consulta exclusivamente config.cellarDoor; o argumento omitido mantém a entrada, outros argumentos são rejeitados. Sem associação na cave, informar em vez de usar o sensor da entrada. Não alterar IDs/origens/componentes guardados nem copiar o gateway da entrada.

128 testes passaram; teste da função real de diagnóstico com dois IDs distintos, associação ausente e alvo inválido. Fixture confirmou cave aberta/entrada fechada e vice-versa, render SVG correspondente e zero comandos. Prova fictícia em review/porta-cave-blu-1.58.png.

## IDs confirmados — 1.74

Porta principal: XB66172384118439. Porta da cave: XB106582486435511 (corrigido pelo utilizador após ter repetido o ID da entrada). Origem BLU, componente0 por omissão; manter componente se já configurado para o mesmo ID. Migração única na configuração existente, incluída no backup, só de leitura. Não foram testados sensores físicos.
