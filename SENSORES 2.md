# Sensores da sala e do quarto principal — 1.31

Em Definições → Shelly Cloud · equipamentos → Sensores de temperatura e humidade, introduzir o Device ID de cada sensor e escolher Guardar sensores. Usa a conta Cloud existente. Para H&T habituais, os componentes de temperatura e humidade são 0; os campos avançados permitem indicar outros IDs de componente. Deixar o Device ID vazio remove a associação.

Os banners da sala e do quarto principal mostram temperatura e humidade abaixo do nome, com indicação de leitura anterior quando necessário. Tocar no nome ou nos valores abre o popup com temperatura em °C, humidade relativa, bateria quando disponível e estado da consulta. Atualizar sensor consulta de novo; a aplicação consulta também a cada minuto enquanto está visível. O intervalo de consulta não força o sensor a fazer uma nova medição. Valores ausentes são apresentados com um traço, sem inventar leituras. Sensores offline ou em repouso mostram apenas os valores disponíveis no Cloud, com essa indicação. A hora indicada é a da consulta; a hora da medição pode ser anterior.

Compatibilidade implementada: H&T Gen1 (tmp/hum) e H&T Plus/Gen3 (temperature:n/humidity:n), com validação dos componentes selecionados e sem usar temperatura interna de relés. Associações são guardadas na mesma configuração e incluídas no JSON; credenciais mantêm as regras existentes. Nenhum fluxo de sensores envia comandos aos equipamentos.

Verificação: 63 testes JavaScript; interface em iPad vertical com leituras Gen1 e Gen3 fictícias, configuração apenas de sensores, guardar/remover/repor associação, sensor offline e temperatura ausente. Nenhum dispositivo real foi acionado.

Fontes: [H&T Gen1](https://shelly-api-docs.shelly.cloud/gen1/#shelly-h-t-status), [Temperatura](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Temperature/), [Humidade](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Humidity/), [Shelly Plus H&T](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPlusHT/).
