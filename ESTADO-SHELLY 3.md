# Contador e estado da comunicação Shelly — 1.83

Cápsula azul no topo, por baixo do resumo da casa. Exibe progresso por equipamento associado (IDs físicos únicos, não número de canais), comunicação, confirmação e estado pronto. Clique abre o contador detalhado: equipamentos consultados, lotes desta atualização, dados indisponíveis, comandos pendentes, pedidos terminados/falhados nesta janela, fila/atividade de transporte e hora da última consulta.

**Pronta** exige configuração guardada e credenciais presentes, ciclo completo sem erro, dados de menos de45s, leituras utilizáveis dos equipamentos associados e ausência de pedido em curso/fila ou comando físico por confirmar. Não substitui validações individuais nem desbloqueia botões. Canais não encontrados, relés desconhecidos, contactos por confirmar, sensores sem leitura e dispositivos offline não dão sinal verde. Deduplicar indisponibilidade por ID, mesmo que um Shelly tenha vários papéis. Equipamentos não associados não entram no denominador; os avisos de IDs em falta mantêm-se nas definições.

A contagem de equipamentos consultados avança pelo tamanho de cada lote concluído. Uma resposta que omite um dispositivo conta como consulta terminada, mas esse dispositivo fica indisponível. Um ciclo interrompido por HTTP429 ou erro permanece incompleto e não aparece pronto. Um HTTP200 de comando termina o pedido de rede, mas a app continua em confirmação até receber o estado reportado ou terminar a espera existente.

`cloud-activity-core.js` calcula estado sem efeitos. `shelly.js.activitySnapshot()` só devolve rótulos/contadores/tempos genéricos, sem IDs, endpoints, chave, resposta bruta ou credenciais. `cloud-activity.js` atualiza visualmente cada segundo e por eventos, sem pedidos Cloud. O indicador e o popup pertencem a casa-app e respeitam a abertura da MeteoNL, teclado e movimento reduzido.

`ShellyTransport.stats()` contabiliza requests queued/active/sent/completed/failed/cancelled e classificação segura de erro. `completed` inclui pedidos falhados; `failed` é esse subconjunto. Cancelamento antes de enviar não aumenta sent/completed. Observadores recebem cópia e uma exceção num observador não interrompe transporte. Não modificar fila, intervalo1,1s, payloads, destinos, geração, timeout ou política de não repetir comandos. Totais são apenas desta janela desde o carregamento, não da conta inteira nem de outras apps; não persistem e não entram no JSON de backup.

## Verificações

Testes `tests/cloud-activity.test.cjs` para progresso, estados incompletos/erros/limite, filas, dados antigos e confirmação. `tests/cloud-transport.test.cjs` verifica contagem real de pedidos serializados, cancelamento e falha429 sem repetição ou exposição de credenciais. Testes existentes de transporte continuam aplicados à versão em dist.

Fixture isolada habitual: combinação windows=closed, media=normal, office=normal, sensors, heater=off, dehumidifier=off, fan=off e ev=off mostra22 equipamentos/3 lotes e estado Pronta22/22. cloud429 força um erro sem rede real e sem falso sinal verde. alarm=armed&alarmhold mantém um comando fictício por confirmar; indicador exibe A confirmar1 após a consulta e nunca pronto. Abrir o contador não envia pedidos nem comandos. Nenhum equipamento real é usado.

Atualização 1.85: o pedido de maior fluidez altera a exclusividade das consultas, o polling e a indicação da cápsula. As regras atuais estão em FLUIDEZ-SHELLY.md. A cápsula continua exclusivamente de leitura, sem gerar pedidos próprios ou revelar destinos/credenciais.
