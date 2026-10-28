# Candeeiros reais — 1.28

Definições → Shelly Cloud · luzes e estores → Associar candeeiros. Guardar o Device ID, canal (começa em 0) e tipo: switch para relé/tomada, light para luz/dimmer. Usa a conta Cloud já configurada. Guardar consulta o estado sem acionar os equipamentos. Também é possível usar Consultar dados dos equipamentos.

Tocar na sala ou num dos quartos abre o popup. O interruptor Iluminação envia ligar/desligar ao candeeiro associado. Ligar todas/Apagar todas inclui os três associados e identifica individualmente as falhas; luzes sem associação continuam simuladas. A planta só acompanha estados confirmados pelo dispositivo. Offline, tipo/canal inválido ou estado desconhecido bloqueiam o interruptor e mostram a causa. Os cenários continuam simulados e preservam equipamentos Cloud.

A API usa POST /v2/devices/api/set/switch ou set/light com {id,channel,on}, sem toggle. A consulta usa get com select status. Fila única com intervalo mínimo de 1,1 segundos, sem cookies ou redirecionamentos; sem repetição automática de comandos. Guardar, importar, abrir uma divisão e iniciar a app só podem fazer leituras.

Documentação: [Shelly Cloud v2](https://shelly-api-docs.shelly.cloud/cloud-control-api/communication-v2/).

Verificação: 55 testes JavaScript, incluindo backups antigos, roundtrip dos candeeiros, Gen1/Gen2, tipos switch/light, canal 0 e 1, estados desconhecidos, offline e comandos recusados sem repetição. Interface verificada exclusivamente na fixture isolada (porta 8083): ligar individual, ligar/apagar conjunto, recusa parcial, offline, arranque sem comandos e cenário sem acionar equipamentos reais.

## Deteção de tipo e diagnóstico

A versão 1.28 resolve a saída real pela consulta de estado. Uma luz Gen1 em lights ou Gen2 em light:n já não fica bloqueada apenas porque a preferência era switch. A saída efetiva aparece na legenda quando difere da preferência. Os comandos usam o tipo detetado antes do envio e mantêm exatamente o canal escolhido. Não há tentativas de comandos em tipos ou canais alternativos.

Se o canal não existir, a mensagem enumera as saídas disponíveis (por exemplo, configurado light:1; disponível light:2). Corrigir o canal nas definições e guardar. Se não forem reportadas saídas, confirmar o Device ID e o tipo de dispositivo. Esta correção foi verificada com respostas simuladas, sem acionar equipamentos reais.
