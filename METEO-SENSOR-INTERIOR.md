# Sensor interior da MeteoNL

Em Definições da MeteoNL → Ambiente interior → Sensor da divisão, escolher um sensor já associado à casa. Mantém o quarto principal por omissão nas instalações e backups antigos. Não muda a associação da luz, estore ou temperatura exterior «Real».

Preferência opcional indoorSensor em casa-nl-meteo-v1, validada por CasaMeteoCore.preferences e incluída no JSON existente. A ponte expõe apenas papéis, nomes e leituras normalizadas; não expõe IDs físicos ou credenciais. O cartão usa o nome da divisão selecionada; sensor removido fica sem associação, sem escolher outro automaticamente. Offline/erros/valores ausentes preservam as regras de última leitura e traços.

Trocar sensor só consulta pela fila existente. Não envia comandos nem altera associações. Ver tests/meteo-bedroom.test.cjs e tests/serve_indoor_sensor_fixture.py (apenas sensores/meteorologia fictícios).
