# Seleção de aparelhos nos popups — 2.18

TV, soundbar, PS5, routers, monitor, Apollo, TerraMaster e disco externo têm áreas clicáveis sobre as suas posições na fotografia. Hover/foco realça em azul; clicar/Enter/Espaço seleciona o aparelho no painel existente. A seleção só consulta dados e conserva as regras de prioridade do popup: não envia comandos de alimentação.

O check «Legendas dos dispositivos» em cada popup oculta os banners e os pontos de ligação sem retirar os alvos interativos. Preferências booleanas independentes `casa-nl-media-device-labels-v1` e `casa-nl-office-device-labels-v1`, visíveis por omissão, guardadas localmente e incluídas/validadas no backup JSON. As legendas continuam acima dos alvos quando atravessam outro aparelho. Nome do equipamento selecionado, estados, consumo e controlos permanecem disponíveis no rodapé.

## Imagens limpas

Os banners e linhas também estavam gravados nos PNG originais. Foram editados com a ferramenta integrada imagegen, sem substituir os originais. Resultados usados:

- [Sala iluminada](assets/multimedia-sala-limpa-v2.png)
- [Sala sem iluminação](assets/multimedia-sala-limpa-apagada-v2.png)
- [Secretária](assets/secretaria-gui-limpa-v2.png)

Prompt usado separadamente para cada imagem de origem:

> Use case: precise-object-edit. Edit target: the supplied existing smart-home scene asset. Remove ALL superimposed UI banners, device name labels, status labels, green dots, white connector lines and UI buttons. For the desk image also remove the large top title bar and its X button. Reconstruct only the background hidden by these overlays. Preserve every real physical object, exact positions, exact camera framing, perspective, image aspect ratio, screen contents, all furniture, device sizes, wires and the ORIGINAL LIGHTING of this particular input (do not turn lamps on or off). No added UI, no new labels, no cropping, no repositioning. This is an aligned photographic background for HTML hit targets, so geometric alignment is critical. Keep TV/monitor screens and console/device edges in exactly the same locations. Keep all real book/product text, logos, real LEDs and physical controls. Output the complete clean scene at the original proportions.

Inspecionados os três resultados e alinhamento dos alvos na app. Preservar a mistura ligada/apagada da sala, o ecrã preto/indicador de regeneração da TV e os LEDs da PS5. Não usar versões com texto gravado no fundo para a opção de ocultar legendas.

Verificação: 233 testes aprovados; fixture sem equipamentos reais, zero comandos/erros. PS5 e TerraMaster realçados/selecionados com legendas ocultas, check guardado ao reabrir e legendas recuperadas; secretária em retrato/paisagem sem overflow horizontal. Provas em review/dispositivos-ps5-sem-legendas-2.18.png e review/dispositivos-secretaria-sem-legendas-2.18.png.
