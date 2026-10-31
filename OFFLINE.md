# Offline na Domótica · 2.54

Contorno vermelho1px e etiqueta Offline sobre o equipamento ou junto ao respetivo nome. Usa exatamente a classificação atual de house-summary-core.condition: resposta Cloud recente e explícita online=false/0. A associação tem de existir. Dados antigos/pendentes, simulação, falha de consulta, ID em falta e canal desconhecido conservam as mensagens próprias, sem simular offline.

Os papéis são lidos de CasaShelly.houseSnapshot().deviceRows, sem expor a chave ou o servidor. O ID físico só existe na camada de agregação em memória para deduplicação; o DOM recebe nomes e estados. Grupos mostram N Offline; cada elemento recebe as suas próprias leituras. Em grupos parciais, continuam visíveis os estados dos restantes equipamentos. Não alterar comandos, posição, alimentação, brilho, carga, alarme ou abertura como efeito de mudar o desenho.

Estrutura: offline-core.js (agregação pura, sem DOM/rede), offline.js (apresentação/seletores da Domótica), offline.css (etiqueta/contorno) e ciclo visual já existente em cloud-activity.js. Sem timer de rede novo, armazenamento ou preferência nova. Não copiar configurações da Casa Condados.

Não acrescentar um aviso geral fixo: a cápsula Resumo da casa já contém o total de indisponíveis e acessos aos equipamentos. Manter sinais individuais na planta/listas/popups.

Validação exclusivamente com leituras fictícias, incluindo retorno a online, dados antigos e estados desconhecidos. A fixture não pode acionar os equipamentos reais.

A fixture tests/serve_lights_fixture.py aceita offlineproof=heater (ou all) e mostra controlos exclusivos de teste para escolher equipamentos, recuperar, simular desconhecido/falha/ID em falta e envelhecer leituras. Interceta o endpoint Cloud e usa exclusivamente associações fictícias; os indicadores de produção não consultam estes parâmetros. Ao testar o relógio fictício, usar uma origem nova no fim para evitar que os timestamps de espaçamento entre consultas, guardados pela fila existente, fiquem no futuro relativamente ao relógio reposto.
