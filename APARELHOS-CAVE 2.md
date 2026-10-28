# Ventoinha e alarme diretamente na planta — 1.84

Retirar o cartão azul e os rótulos permanentes da ventoinha e do alarme na cave. Preservar os botões `fan-pin` e `alarm-pin`, rótulos acessíveis, estado textual no popup, título ao passar o rato, IDs Shelly e controlo existentes. Os textos internos continuam no DOM para os desenhadores de estado, mas ficam ocultos visualmente na planta. Clique abre os controlos; arrastamento mantém posições/backup em `casa-nl-basement-layout-v1` sem migração.

`cellar-devices.css` é carregado depois da paleta azul e dos componentes. Neutralizar fundo, borda retangular, sombra do cartão e blur em todos os estados; o elemento gráfico tem a sua própria sombra/auréola. Alvos de toque de pelo menos44px. Preservar contornos de foco e os indicadores de arrastamento.

## Ventoinha

Reutilizar o render vetorial existente de caixa, grelha, pás e eixo, sem pés ou haste. Apenas o grupo `.fan-blades` roda (0,75s por volta), com caixa e grelha estáticas. O estado `data-fan-state=on`, derivado da leitura fresca confirmada, ativa a auréola verde junto ao contorno circular. Off/unknown não têm auréola verde nem rotação. Não acrescentar comandos ou temporizadores Cloud para a animação.

## Alarme

Novo corpo vetorial local, visto de cima: base circular branca com gradiente metálico, pequenas ranhuras e emblema central de segurança. Não é um novo dispositivo ou associação. A animação de auréola existente permanece uma camada independente sobre o corpo: armado = verde e circulação de2s; disparo = vermelho, circulação de0,7s e pulsação de0,9s; desarmado sem auréola/rotação; desconhecido/parcial com indicação estática âmbar. O trigger continua exclusivamente de leitura; só o papel de armação recebe comandos explícitos pelos controlos existentes. O popup mantém a informação dos dois Shellys.

## Verificação

Fixture isolada com `fan=on&alarm=armed`: confirmação do render sem cartões, `fan-spin`0,75s e `alarm-orbit`2s em estilos calculados. `fan=off&alarm=sounding`: pás sem animação nem auréola verde, `alarm-orbit`0,7s e `alarm-glow`0,9s. Preservar as regras existentes de movimento reduzido. Arrastar a ventoinha não abre popup nem envia comandos; a posição mantém-se após recarregar; clique abre os controlos. Não acionar equipamentos reais.

Imagem de verificação: `review/cave-aparelhos-1.84.png`.
