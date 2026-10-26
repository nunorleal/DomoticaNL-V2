# Temperatura no banner Cave · 1.54

Sensor fornecido: Shelly Door Window 2, Device ID 7dc19d; leitura ambiental de tmp.tC no componente 0. Referência: https://shelly-api-docs.shelly.cloud/gen1/#shelly-door-window-status

A associação fica em sensorBindings.cellar, na conta Cloud existente, com type door-window2. Edição em Definições → Shelly Cloud → Sensores → Cave. O marcador booleano de migração é incluído nos backups; retirar o ID mantém a associação retirada nas visitas seguintes. Configurações anteriores e tipos omitidos continuam compatíveis. O contacto da porta da cave é independente.

cellar-temperature.js atualiza o banner e o popup com os eventos das consultas existentes. Não envia comandos. Temperatura inválida/ausente é — °C; offline, erro ou consulta com mais de 120 segundos marca Última leitura. Hora da consulta não é apresentada como hora da medição. Modelo sem humidade não mostra uma medição fictícia. Arrastamento e contenção do banner mantêm-se.

123 testes automáticos passaram. Verificação da interface com temperatura simulada 17,6 °C, offline/repouso e valor inválido; nenhum equipamento real acionado. Prova em review/temperatura-cave-1.54.png usa dados fictícios.
