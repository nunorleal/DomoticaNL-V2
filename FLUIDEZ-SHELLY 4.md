# Consultas em segundo plano — 1.85

A consulta geral é iniciada 30 segundos após terminar a anterior, apenas com a app visível e a configuração guardada. Substitui o ciclo geral de 15 segundos e a consulta geral adicional de sensores de 60 segundos. Os temporizadores de desenho da interface não consultam a Cloud.

Os controlos com leituras online, válidas e recentes continuam disponíveis durante as consultas. Cada comando volta a validar o estado e a geração quando chega à vez de envio. O pedido de leitura já em curso termina; os lotes que ainda não começaram cedem ao comando. Uma resposta iniciada antes desse comando não substitui o estado confirmado. Uma consulta geral interrompida pode ser retomada por nova consulta após dois segundos, sem atrasar os comandos em envio.

Abrir um painel consulta apenas os respetivos IDs quando necessário. Pedidos sobre os mesmos IDs aguardam a consulta atual e aproveitam leituras acabadas de receber. Atualizar um aparelho ou confirmar um comando consulta apenas esse aparelho; uma resposta parcial não apaga nem renova artificialmente as leituras dos outros. A confirmação continua a intervalos de dois segundos enquanto existem alvos pendentes, até ao limite anterior de 90 segundos. Um comando não é repetido automaticamente.

O transporte mantém uma fila única, intervalo mínimo de 1,1 segundos, timeout de 20 segundos e credenciais privadas. HTTP 429 suspende envios durante pelo menos 30 segundos, respeitando Retry-After até 120 segundos; o contador mostra o tempo restante. Não há reenvio automático de atuadores. Após a pausa, a consulta periódica pode renovar os estados. Leituras expiradas ou erros continuam a bloquear o respetivo comando.

A cápsula indica “Disponível · a atualizar” quando há uma leitura em segundo plano e os dados guardados continuam utilizáveis. Envio, confirmação física, pausa Cloud, erros e indisponibilidade mantêm indicações próprias. A contagem Pronta refere os IDs configurados; os detalhes mostram o âmbito e progresso da consulta atual. A cápsula não concede autorização a um aparelho: os seus próprios validadores continuam a decidir.

Validação: testes fluid-requests, cloud-activity e cloud-transport e fixture isolada `?fluidproof`. Consulta lenta artificial de seis segundos demonstrou botão disponível e sequência leitura em curso → comando único → consulta apenas do aparelho, sem restantes lotes prévios. Todas as rotas Shelly da fixture são intercetadas; nunca testar com aparelhos reais.

## Prioridades e confirmações limitadas — 1.88

Corrige o caso em que o prazo global terminava sem retirar os estores do mapa de pendentes, deixando a cápsula “A confirmar” permanentemente. Cada comando tem agora um ticket independente em confirmation-core.js. Um comando posterior não prolonga o anterior. Alterar o alvo/sequência de um estore substitui apenas o seu ticket.

O primeiro pedido de verificação é agendado 1,5 s após o comando. Relés/luzes: no máximo três consultas, com esperas de 1,5/4/10 s, prazo absoluto de 30 s. Estores: até cinco consultas, com esperas de 1,5/4/8/12/16 s, prazo absoluto de 60 s. São consultas de estado, nunca repetição da atuação. Parar assim que chegar uma leitura válida posterior ao comando que confirme o booleano, a posição ou o movimento do estore na direção pedida. Confirmação do movimento não significa chegada à posição final.

Esgotado o prazo/tentativas, retirar todos os tipos de pendentes, incluindo os estores, e indicar explicitamente “Comando sem confirmação”. Manter o último estado recebido, sem assumir o estado pedido, e prosseguir apenas com a consulta geral normal. Não pedir refresh manual como condição habitual de utilização. Offline/erros/dados expirados mantêm as proteções próprias do aparelho.

Um comando pode abortar uma leitura HTTP em curso, permitindo enviar sem esperar pelos 20 s de timeout. cancelStatus só interrompe leituras; nunca atuações. Cancelamentos por prioridade contam como cancelados e não como falhas de rede. As verificações de comando têm prioridade sobre consultas gerais e pedidos de painéis que aguardam. Preservar geração, estado validado à saída da fila e intervalo mínimo entre pedidos.

Aplicar cada lote recebido imediatamente, com timestamp real de consulta. Uma falha/interrupção num lote posterior não invalida os lotes já recebidos. A restante frota continua na consulta geral 30 s após terminar a anterior. Regresso à app e evento online antecipam a consulta geral automaticamente, respeitando a pausa Cloud.

Testes confirmation, fluid-requests e cloud-transport cobrem expiração efetiva dos estores, limites/backoff, direção do movimento, geração, preservação de lotes anteriores, precedência de consultas e aborto exclusivo de leituras. A fixture com mediahold retém propositadamente o estado para verificar que a UI sai de A confirmar sem cliques de refresh ou repetição de comandos.

Validação visual 1.88 no iPad vertical: com mediahold, exatamente uma atuação fictícia e três consultas individuais terminaram a confirmação, mantiveram o estado realmente recebido e voltaram a disponibilizar o botão. No teste de prioridade, uma leitura artificial de seis segundos foi interrompida: atuação aos1,101s e confirmação individual1,512s depois, sem erros de rede e sem repetir a atuação. Prova em review/prioridades-shelly-1.88.png. Suite completa:192 testes aprovados.

## Limite inicial e recuperação prioritária — 1.89

O screenshot do utilizador mostrou pausa logo ao carregar e termoventilador sem estado. O espaçamento anterior e a pausa só existiam por janela, e o mínimo fixo de30s era da app. A documentação oficial confirma limite de1 pedido/s: https://shelly-api-docs.shelly.cloud/cloud-control-api/communication-v2/ . Não contornar uma recusa real nem desbloquear um toggle de estado desconhecido.

Transporte passa a espaçar pedidos pelo menos1,5s depois de concluir/abortar o anterior. Janelas da mesma origem partilham metadados por servidor em localStorage e, quando disponível, um Web Lock exclusivo durante a operação; sem Web Locks, usam os timestamps partilhados como fallback. Metadados temporários em shelly-cloud-traffic-v2:<servidor> contêm apenas last/retryAt/strikes, sem chave ou IDs, e ficam fora do backup. Não há cache de comandos nem mudanças às credenciais. Navegadores/origens diferentes ou outras apps não podem ser coordenados por este mecanismo.

HTTP429 respeita Retry-After válido (incluindo data). Sem esse cabeçalho, a espera começa em2,5s e cresce para5/10/20/40s se houver novas recusas, regressando ao início depois de uma consulta bem-sucedida. Removido o mínimo arbitrário de30s. Uma atuação nunca é repetida automaticamente.

Abrir um equipamento durante a pausa guarda só o seu pedido de leitura. Ao terminar a pausa, a consulta desse aparelho tem prioridade sobre a frota geral; se repetir429, mantém esse pedido para a próxima recuperação. Nunca guardar ou executar automaticamente a intenção de ligar/desligar um toggle desconhecido. O termoventilador explica no popup a recusa e o tempo para a consulta automática. Depois da leitura online válida, volta a disponibilizar o botão. A consulta geral normal mantém a cadência anterior.

Validação: fixture cloud429once reproduziu a recusa inicial; após2,960s a segunda consulta foi apenas ao termoventilador, sem refresh manual e sem atuação. Só depois de clicar explicitamente foi enviado um comando fictício on=true, confirmado por leitura. Testes simulam duas janelas com lock partilhado, espaçamento após resposta, partilha da pausa entre reloads, crescimento/reinício da espera, respeito de Retry-After e recuperação prioritária. Prova visual em review/termoventilador-recuperado-1.89.png.

## Últimas leituras durante pausas — 1.90

Falhas de consulta, pausa429 e expiração deixam de substituir a potência anteriormente recebida por um traço. O contador geral, carregamento e consumos de multimédia/secretária/cozinha conservam os valores disponíveis e identificam-nos como Última leitura. Estores conservam a percentagem conhecida, mesmo offline, identificada como histórica. Os aparelhos móveis e ventoinha distinguem o último booleano recebido do estado atual por confirmar.

lastReading é exclusivamente de apresentação, derivado da leitura guardada em memória, com o timestamp original. Nunca renovar a data por uma falha, inventar zeros antes da primeira consulta, nem confundir leitura histórica com estado recente. A validade atual, percentagem/margem do limite contratado, comandos, atividade das máquinas e animação de carregamento continuam protegidos pelos validadores existentes. Não há novo cache persistente nem pedidos adicionais. Atualizar o contador geral consulta apenas os seus IDs.

Validação isolada: após leituras válidas, a fixture retainproof respondeu429. O contador conservou1,200kW e6949,6kWh com Última leitura; a máquina de lavar loiça conservou42,5W/10kWh, atividade por confirmar e controlo indisponível. Zero atuações e zero erros de consola. Prova em review/ultimas-leituras-1.90.png; testes last-reading cobrem retenção, timestamps, ausência inicial e separação entre histórico e estado atual.
