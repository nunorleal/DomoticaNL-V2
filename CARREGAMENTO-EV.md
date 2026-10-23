# Carregamento do carro — Casa NL 1.40

Na cave, o carro e o pilar abrem o popup Carregamento do carro. A planta mostra potência instantânea em kW e energia acumulada em kWh. O símbolo do pilar acende quando o Shelly reporta a saída ligada. O cabo só aparece conectado ao carro quando há consumo válido acima do limiar configurado; em espera/desligado fica recolhido junto ao pilar. Leituras ausentes, offline, inválidas ou sem atualização há mais de 45 segundos não permitem afirmar carregamento nem controlar a saída. O total anterior pode aparecer como Último total.

## Associar o Shelly EM

Definições → Shelly Cloud · equipamentos → Carregamento do carro.

1. Em Consumo do carro, introduzir o ID do Shelly EM, escolher o canal da pinça que mede exclusivamente o carregamento (0 ou 1 no Shelly EM) e o tipo Shelly EM / 3EM · Gen1.
2. Em Interruptor do ponto de carregamento, repetir o ID desse Shelly EM e indicar o canal do relé (habitualmente 0). O canal da pinça e o canal do relé são independentes.
3. Deixar Contador acumulado separado vazio para mostrar o total do mesmo canal de consumo. Preencher apenas se outro contador/canal deve fornecer o total.
4. O limiar de carregamento começa em 50 W; ajustar para ignorar o consumo em espera. Guardar carregamento e consultar os dados.

A conta/chave já configurada é a mesma; não há outras credenciais. Guardar, importar, abrir o popup e consultar nunca enviam comandos de ligar/desligar. A associação entra no backup JSON. Cópias antigas sem `ev` continuam compatíveis.

Os botões Ligar ponto/Desligar ponto enviam um booleano explícito para a saída configurada, pela fila Shelly já usada na casa, sem toggle e sem repetição de comandos falhados. O estado só muda após leitura do Shelly. Não são incluídos em Ligar todas/Apagar todas, estores, cenários ou reposição da demonstração. Não há comandos automáticos baseados no consumo. Não mostramos percentagem de bateria, estado físico da ficha ou carregamento concluído, porque o contador não fornece esses dados. Uma saída ligada representa o estado do relé, não uma medição independente de tensão no ponto.

## Implementação

- `ev-core.js`: configuração, normalização e regras puras. `shelly-core.js` valida opcionalmente `ev` e deduplica os IDs.
- `ev-form.js`: campos do grupo de carregamento no formulário central.
- `shelly.js`: leituras e comandos na mesma fila, cancelamento por geração, confirmação e polling após comando. Consulta periódica de 15 segundos enquanto a página está visível. Até 12 IDs são divididos em lotes de no máximo 10 pela fila única.
- `ev.js` / `ev.css`: popup, métricas, pilar e cabo em vista superior, sem alterar o carro ou os renders da casa. Respeita movimento reduzido.

Schema opcional: `ev: {thresholdWatts, meter?: {deviceId,channel,component}, totalMeter?: {...}, relay?: {deviceId,channel}}`. Tipos de medidor: auto, emeter, meter, switch, pm1, em1, em. A deteção automática exige exatamente uma família no canal selecionado; nunca se escolhe outro canal ou se testa um comando para descobrir o equipamento. Meter e relay podem partilhar o mesmo ID/canal porque um só consulta. A saída do relay não pode duplicar uma saída já associada a um candeeiro ou estore.

## Unidades e fontes

A normalização segue a documentação oficial Shelly:

- [Gen1](https://shelly-api-docs.shelly.cloud/gen1/): `emeters[].power` em W e `emeters[].total` em Wh; `meters[].total` dos dispositivos PM em Watt-minute. Converte-se respetivamente por 1000 e por 60000 para kWh.
- [EM1](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/EM1/) / [EM1Data](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/EM1Data/): potência `act_power` e energia `total_act_energy`.
- [EM](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/EM/) / [EMData](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/EMData/): potência total `total_act_power` e energia `total_act`.
- [PM1](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/PM1/): potência `apower` e energia `aenergy.total` em Wh.

Não somar famílias de medições diferentes nem usar energia devolvida à rede como energia consumida. Consumos negativos não são convertidos em positivos para inferir carregamento. O limiar refere-se a consumo no circuito associado ao carro.

## Verificação

Testes em `tests/ev.test.cjs`: configuração partilhada, unidades Gen1/Gen2+, ambiguidades, limites de canais, consumo em espera, dados offline/desatualizados/erro, relé independente, backup com rollback e comando explícito sem retry. A fixture `tests/serve_lights_fixture.py?ev=charging` interceta todos os pedidos Cloud e usa apenas IDs/chave fictícios. `ev=idle`, `ev=off`, `ev=offline`, `ev=unknown`, `evbadchannel`, `evreject` e `evtotal` cobrem os restantes estados. Não testar em equipamentos físicos.
