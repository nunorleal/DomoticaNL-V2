# Consumo uniforme — 1.94

O bloco comum apresenta apenas potência instantânea (W; kW nos contadores), total acumulado (kWh) e qualidade da leitura. Os gráficos, períodos e notas de histórico foram retirados por pedido do utilizador. Preservar o acumulado reportado pelo dispositivo: não o substituir por um cálculo local.

Abrange os aparelhos móveis, ventoinha, os dois Shellys do alarme, cozinha, sala, secretária, candeeiros/estores associados e contadores. Sem medições disponíveis, indicar Não disponível. Dados antigos continuam identificados como Última leitura e nunca desbloqueiam comandos. O acumulado pode reiniciar no próprio Shelly. Os sensores sem medição elétrica conservam os respetivos dados próprios.

consumption.js reutiliza os controlos e leituras existentes, sem rede adicional. consumption-core.js normaliza as unidades e mantém a compatibilidade dos dados legados nos backups. shelly.js guarda apenas as leituras atuais em memória: não cria séries, não recolhe deltas, não grava histórico nem executa flush no pagehide/exportação. Os históricos antigos não são apagados nem usados pela interface; os backups anteriores continuam válidos.

Os popups do termoventilador e desumidificador conservam a fila compacta alimentação/atualizar/definições e movimento por arrasto/teclado, sem seletor de divisão. Os restantes dados próprios dos equipamentos mantêm-se, incluindo o limite contratado do contador geral.

Validação exclusivamente em fixture com IDs/chave falsos: 1250,4W/21,364kWh no termoventilador e245,6W/28,05kWh no desumidificador, sem gráfico ou seletor de período nos popups, sem erros de consola. Suite209 testes aprovada. Prova review/consumo-sem-graficos-1.94.png.
