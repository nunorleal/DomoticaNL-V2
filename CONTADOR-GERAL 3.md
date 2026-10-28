# Contador geral — 1.49

Banner independente sobre a zona esquerda da sala (10%, 63% do plan-stage), na posição marcada pelo utilizador. Mostra potência ativa kW, percentagem do contrato e escala colorida. Toque abre popup com potência ativa, aparente, energia acumulada kWh e margem disponível kVA. Acesso alternativo em Controlos gerais. Check «Mostrar banner do contador geral» nas definições, com o mesmo desenho/alinhamento dos checks de divisões e estores. Preferência booleana em casa-nl-show-energy-banner; por omissão visível, incluída e validada no backup. Ocultar não interrompe leituras nem altera equipamentos.

Mesmo Shelly EM do carro por omissão, no canal 0 e contrato 6,9 kVA. A associação do carro não muda. O ID é reutilizado de ev.meter, ou ev.relay se não houver medidor. Pode configurar outra origem/ID, canal EM 0/1 e contrato positivo até 100 kVA em Shelly Cloud → Contador geral da casa. Campo opcional homeEnergy: {source:'car'|'custom',channel,contractKVA,deviceId?}. Ausência equivale ao comportamento por omissão sem modificar a forma das configurações antigas. Guardar usa a mesma transação/formulário/conta. Configuração e backup via ShellyCore.config.

Apenas leitura em emeters[canal]: power W /1000 → kW, reactive var /1000 → kvar, total Wh /1000 → kWh. Potência aparente calculada S = hypot(P,Q)/1000 kVA; percentagem = S/contrato*100. Não igualar kW a kVA. Sem potência reativa, manter kW se disponível, mas não inventar percentagem/cor verde. P negativo continua negativo. Erros/is_valid=false, offline, consulta falhada ou com mais de 45 segundos: potência e escala indisponíveis, cor neutra; total anterior identificado como última leitura.

Cores: verde <60%, amarelo de 60 a <80%, laranja de 80 a <95%, vermelho de 95 a <100%, vermelho e texto de limite atingido/ultrapassado a partir de 100%. Marcador limitado visualmente a 0..100%, valor numérico de sobrecarga preservado. A escala é informativa; a app não atua relés nem configura proteções.

Integração em energy-core.js, energy.js e energy.css. energy-core antes de shelly-core; energy.js depois do app e antes de shelly.js, floors e meteo. Leituras no refresh partilhado, mesma fila/geração e lotes de dez IDs deduplicados. Atualização visível a cada 15 segundos no temporizador existente. Não criar autenticação, transporte ou temporizador de Cloud separados. Não incluir o contador em comandos gerais, cenas, reset ou movimentos.

Fonte oficial dos campos EM:
https://shelly-api-docs.shelly.cloud/gen1/#shelly-em-emeter-index

Validação: tests/energy.test.cjs; fixture fictícia com ?ev=charging&evproof&energy=green|yellow|orange|red|over|unknown|offline|invalid. Com energy, a fixture usa EM canal 0 para casa e 1 para carro, no mesmo ID fictício, e interceta toda a Cloud. UI verificou popup, sobrecarga a 106%, preferências persistentes, acesso com banner oculto e guardar sem comandos. Nunca foram usados dispositivos reais.
