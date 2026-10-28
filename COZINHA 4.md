# Equipamentos da cozinha — 1.85

As áreas transparentes na bancada correspondem às marcações fornecidas:

| Marca | Equipamento | Device ID | Canal inicial |
|---|---|---|---|
| L | Máquina de lavar loiça | e465b8b1526c | 0 |
| R | Máquina de lavar roupa | 485519eb7022 | 0 |
| C | Caldeira Bosch | bc1c2a | 0 |

Não há ícones nem alterações aos renders. Botões transparentes sobre os aparelhos mostram realce no hover ou foco e abrem um popup por clique/toque/teclado. Dimensões em percentagem do plan-stage, com o mesmo recorte 1024×1180 da planta. O popup cabe no iPad vertical.

`kitchenBindings` é um grupo opcional independente, validado com os mesmos IDs/canais e controlo de duplicações de outros atuadores. As associações fornecidas são acrescentadas uma única vez, preservando as existentes, com marcador `casa-nl-kitchen-ids-associated-v1`. Retirar depois um ID não o repõe no próximo carregamento. Definições → Shelly Cloud → Equipamentos da cozinha permite editar cada aparelho num grupo colapsável.

Conta, transporte, fila, normalização Gen1/Gen2+, frescura, mensagens e confirmação são partilhados com os outros relés. O botão verde/cinzento mostra apenas alimentação confirmada; não representa o programa de lavagem nem a atividade de aquecimento. Potência W e energia kWh só aparecem se reportadas. Sem dados válidos, a atuação fica bloqueada. Não criar comandos coletivos, automatismos nem polling adicional.

Backup completo preserva grupo e marcador. A importação com preservação mantém também os IDs da cozinha ao importar uma cópia antiga. Os IDs em falta aparecem no aviso existente das definições. Testes em `tests/kitchen.test.cjs`; fixture apenas fictícia com `?kitchen=normal`, `unknown` ou `offline`.

## Atividade das máquinas — 1.86

Máquina de lavar loiça e máquina de lavar roupa usam o limiar estrito de 10 W: acima = A trabalhar; até 10 W = Sem atividade. Uma leitura ausente, offline, em erro ou expirada fica por confirmar. O relé continua independente do indicador de atividade. A caldeira mantém apenas a informação anterior de alimentação/consumo.

Na planta, apenas quando a máquina está a trabalhar, aparece um pequeno símbolo de máquina verde com o tambor em rotação. No popup, o mesmo símbolo acompanha o estado textual. Respeitar movimento reduzido e retirar imediatamente símbolo/animação se a leitura deixar de ser válida. A atualização visual usa os eventos e temporizador existentes, sem pedidos Cloud adicionais ou comandos automáticos. Testes incluem 10 W exatos, 10,001 W, valores ausentes e expiração.

## Atividade da caldeira — 1.87

A caldeira Bosch usa agora o mesmo limiar estrito de >10 W e as mesmas regras de validade das máquinas. O seu símbolo é uma caldeira com chama verde pulsante, na planta e no popup. Até 10 W não aparece na planta; leituras inválidas ficam por confirmar. A chama representa atividade elétrica inferida do consumo, não uma confirmação da chama física ou temperatura. Sem novos pedidos Cloud ou atuação automática. Movimento reduzido desativa a pulsação. A fixture `?kitchen=normal&boileron` usa apenas dados fictícios.

## Paleta azul — 1.96

Realce de hover/foco e símbolos de atividade das máquinas de lavar e caldeira passam a tons azuis dos banners, incluindo a indicação A trabalhar no popup. Preservar limiar >10W, disponibilidade, animações e comandos existentes. A mudança de realces também abrange consola, secretária e os novos acessos aos estores pelas janelas.
