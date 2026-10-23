# Popups dos equipamentos — 2.01

Os equipamentos usam o desenho sóbrio do termoventilador: cartões de potência instantânea e acumulado, estado curto e botões circulares de alimentação, atualização e definições na mesma fila. As imagens e os controlos próprios de estores, alarme e contador são preservados.

Foram retirados os textos explicativos de funcionamento e notas repetidas da cozinha, candeeiros, aparelhos móveis, multimédia, secretária e contador. Permanecem erros, estados por confirmar e qualidade da leitura. A ajuda nos formulários de configuração é independente.

popup-ui.js move os elementos existentes sem trocar listeners ou regras dos comandos; consumption.js mantém os cartões comuns. Não há novos pedidos, timers de rede, credenciais ou alterações aos backups. Verificação visual no iPad vertical e atualização na fixture isolada, sem comandos reais ou simulados aos atuadores.

## Fechar — 2.05

Todos os popups podem fechar pelo X ou por toque/clique na área exterior, incluindo equipamentos criados dinamicamente e definições do MeteoNL. Tocar nos controlos ou no espaço interior mantém o popup aberto. Arrastar um controlo para fora não é tratado como toque exterior. O gesto de fecho é consumido e não atua nos elementos por baixo.
