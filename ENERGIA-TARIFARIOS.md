# Energia e Tarifários

Em **Definições → Energia e Tarifários**, indica o preço por kWh em vazio e fora de vazio, com desconto e sem impostos. O ciclo diário considera vazio das 22:00 às 08:00, pela hora de Portugal continental. Os preços de referência são 0,08952 €/kWh em vazio e 0,15480 €/kWh fora de vazio.

A app usa os preços simples já guardados ou aproveita os preços da última configuração bi-horária de ciclo diário, aplicando o desconto guardado quando necessário. Os preços aplicam-se também ao histórico e podem ser diferentes em cada casa.

Os kWh sem hora registada usam a média de 10 horas em vazio e 14 horas fora de vazio. Se ainda não houver kWh registados e existir uma leitura de potência atual, a app estima o custo por hora. A estimativa inclui só energia.
