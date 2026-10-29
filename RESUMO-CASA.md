# Resumo lateral da casa · 2.50

Coluna adaptada da apresentação da Casa Condados: esfera Shelly, resumo vertical, energia e dois pisos (Piso 1 / Cave). Fontes e associações exclusivamente desta app. Sem importação de IDs ou credenciais.

CasaShelly.houseSnapshot lê apenas as associações validadas e os mapas em memória usados pelo polling existente. Contactos e luzes contam só com estado booleano atual válido (45s); sensores ambiente conservam a janela existente de120s. Demonstrações excluídas. Equipamentos físicos deduplicados pelo ID sem distinguir maiúsculas/minúsculas; cada papel continua validado. Dados antigos, pendentes, offline reportado, falha de consulta e estado inválido são separados. Traço sem associação; ? ou N+? quando há leituras por confirmar. Nenhum segredo é exposto. Não persistir este resumo como estado do equipamento.

A apresentação reutiliza o ciclo visual de1s de cloud-activity e o evento shellyactivitychange, sem outro timer nem pedidos. Abrir resumo ou Estado dos pedidos não consulta nem atua. Navegar para uma divisão/dispositivo reutiliza o respetivo popup, prioridade, consultas e validação existentes. Energia conserva popup e consulta existente. X, Escape e exterior fecham. Controlos gerais continuam no cabeçalho e no resumo; resumo antigo oculto, sinais individuais preservados.

Estilos em floor-layers.css após plan-layout.css reservam uma faixa para a coluna, com50px em computador/tablet e36px no telemóvel; alturas adaptam-se ao ecrã. Dois alvos de piso conservam swipe, teclado e ajuste de zoom ao mudar.

As falhas das consultas já existentes recebem apenas um instante em memória para apresentação: falha recente é identificada como tal; após45s passa a dados antigos. Uma resposta válida limpa esse registo e guardar configuração reinicia-o. Sem retries ou alterações na fila.

A esfera e o resumo usam a mesma classificação de idade/falha, conservando os contadores e temporizadores da comunicação. Nenhuma classificação de apresentação autoriza comandos.

## Encaixe da planta · 2.51

Folga lateral4px. O encaixe usa os limites visíveis do clip original, descontando as margens transparentes da imagem. Banners de estores ficam contidos à direita apenas por CSS; posições guardadas e coordenadas dos dispositivos mantidas. Zoom usa o centro real do canvas.
