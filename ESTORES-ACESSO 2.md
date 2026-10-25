# Acesso separado aos estores — 1.96

Clicar numa divisão ou no respetivo nome abre iluminação, sensores e informação própria da divisão, sem slider, Abrir/Parar/Fechar ou consumo do estore. O banner do estore e uma área transparente sobre a respetiva janela abrem os controlos apenas desse estore. A lista de estores nos controlos gerais continua a abrir esse mesmo painel.

app.js mantém detailView room/blind durante as atualizações e reutiliza room-dialog com título/fecho adequados. drawBlindDetail preserva os IDs e validadores existentes, sem duplicar os controlos. shelly.decorateRoom tem vista explícita: a divisão decora iluminação/sensores; o estore aplica apenas disponibilidade, estado e atualização do cover. CasaDeviceEnergy mostra consumo do candeeiro ou estore de acordo com a vista. Leituras do painel da divisão não incluem o cover; ensureBlindFresh e refreshEquipment blind consultam só o ID do estore. A consulta geral mantém as associações e cadência existentes.

Quatro blind-window-trigger na planta, com label próprio, teclado e alvo mínimo44px, independentemente da preferência de mostrar banners. Não alterar os renders, sensores das janelas, divisões nem o estado dos estores. As áreas transparentes só mostram realce ao passar o rato/focar, seguindo o estilo da consola. Abrir um painel consulta dados quando necessário; nunca move um estore.

## Paleta azul

Por pedido posterior na mesma entrega, os realces da janela, consola, secretária e cozinha usam variáveis plan-highlight em blue-glass.css. Os símbolos de atividade das máquinas e da caldeira usam o fundo azul dos banners e traço azul claro; o texto de atividade no popup também é azul. Mantêm-se os critérios >10W, animações e preferências de movimento reduzido. Esta alteração de realces não muda os estados dos relés nem os indicadores funcionais dos outros equipamentos.

Validação: testes blind-access cobrem separação dos controlos, contexto após redraw e IDs das consultas; suite211 testes aprovada. Fixture isolada com blinds simula posições80/50/100/25 e metering; washeron/boileron simulam os três aparelhos ativos. Verificados quatro acessos pela janela, acesso pelo banner, divisão sem controlos do estore, cores computadas azuis, ausência de erros e zero atuações. Prova review/realces-azuis-estores-1.96.png.
