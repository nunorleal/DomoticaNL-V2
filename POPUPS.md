# Popups dos equipamentos — 2.01

Os equipamentos usam o desenho sóbrio do termoventilador: cartões de potência instantânea e acumulado, estado curto e botões circulares de alimentação, atualização e definições na mesma fila. As imagens e os controlos próprios de estores, alarme e contador são preservados.

Foram retirados os textos explicativos de funcionamento e notas repetidas da cozinha, candeeiros, aparelhos móveis, multimédia, secretária e contador. Permanecem erros, estados por confirmar e qualidade da leitura. A ajuda nos formulários de configuração é independente.

popup-ui.js move os elementos existentes sem trocar listeners ou regras dos comandos; consumption.js mantém os cartões comuns. Não há novos pedidos, timers de rede, credenciais ou alterações aos backups. Verificação visual no iPad vertical e atualização na fixture isolada, sem comandos reais ou simulados aos atuadores.

## Fechar — 2.05

Todos os popups podem fechar pelo X ou por toque/clique na área exterior, incluindo equipamentos criados dinamicamente e definições do MeteoNL. Tocar nos controlos ou no espaço interior mantém o popup aberto. Arrastar um controlo para fora não é tratado como toque exterior. O gesto de fecho é consumido e não atua nos elementos por baixo.

## Atualizar — 2.06

Todos os botões de atualização manual passam a círculos com o mesmo símbolo de duas setas, incluindo sensores, janelas, cave, meteorologia e consulta geral Shelly. O nome da ação mantém-se no título e na acessibilidade; os listeners e as condições de disponibilidade não mudam.

## Ordem dos elementos — 2.09

Por indicação posterior, os controlos e botões ficam acima, e os cartões de consumo fecham todos os popups. A regra aplica-se também aos estores, candeeiros, aparelhos móveis, cozinha e painéis de multimédia/secretária. Apenas é alterada a ordem dos elementos existentes.
