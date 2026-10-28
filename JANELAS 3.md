# Janelas com contacto BLU — 1.68

Os quatro contactos ficam em windowBindings, na conta Shelly já existente. Associações iniciais (componente0, origem blu):

| Divisão | Device ID |
| --- | --- |
| Quarto principal | XB154411473786357 |
| Quarto do Gui | XB106582486823095 |
| Sala | XB66172384108257 |
| Cozinha | XB106582486821873 |

Definições → Shelly Cloud → Janelas permite editar cada sensor/componente e retirar a associação. A migração única casa-nl-window-ids-associated-v1 completa papéis em falta, preserva edições e permite remoção posterior. O backup preserva as associações e o marcador. Contactos duplicados entre portas/janelas são rejeitados; gateway com componentes distintos é permitido. Não adicionar credenciais nem transporte separado.

A leitura reutiliza DoorCore.status/window:0.open, a fila Cloud, os lotes de até10, geração e consulta periódica de15s. open=true válido, online e fresco45s mostra a janela aberta; false mostra fechada; ausência/erro/offline/stale mostra visual fechado com texto «estado por confirmar». Não inferir por luminosidade, inclinação ou estado do estore. O estore mantém o cálculo independente da luz natural. Os sensores só leem; nenhum fluxo envia comandos a janelas.

## Renders

Edição image_gen incorporada, uma chamada por ambiente. Origens: assets/planta-realista-sofa-v2.png; planta-noturna-sofa-v2.png; planta-noturna-iluminada.png. Recursos guardados: assets/janelas-fechadas-dia-v1.png; janelas-fechadas-noite-v1.png; janelas-fechadas-eletrica-v1.png. Todos1024×1536.

As imagens geradas não substituem a planta completa: CasaWindows.patch insere só quatro retângulos SVG locais junto às folhas/arcos originais. Os recortes são aplicados dentro das camadas diurna/noturna/elétrica existentes; a máscara branca permanece por cima. Mobiliário, candeeiros, secretária, portas interiores e resto da fotografia mantêm os píxeis originais.

Prompt base:

Precise object edit of this exact top-down architectural floor plan. Close ONLY the FOUR glass balcony/window-door leaves on the RIGHT external wall: master bedroom opening at x770..850 y385..465; second bedroom opening x777..850 y500..590; living/dining room opening x770..850 y810..900; kitchen balcony opening x777..850 y1080..1165, in original 1024x1536 coordinates. Remove their inward projecting horizontal glass leaves AND the thin curved opening-swing arcs, restore continuous matching wooden floor in their place, and show each closed glass leaf aligned VERTICALLY within the existing right wall/window track at x840..853. All four closed, viewed strictly from above. Preserve exactly the existing geometry, white walls, furniture, beds, sofa, rugs, lighting, shadows, colors, full image dimensions/framing, balcony, kitchen and all wooden interior doors. Do not move or change anything else. No extra furniture, text or labels. Maintain pixel registration to the reference: only tiny localized edits at those four glass openings. Keep the source lighting exactly.

Sufixo noturno: This reference is the NIGHT lights-off render: preserve its exact dark cool lighting and blue window reflections. Do not brighten the floor. Use precisely the same four closures as the day variant.

Sufixo elétrico: This reference is the ELECTRIC-LIGHTS-ON night render: preserve its exact warm orange artificial lighting, bright floor and dark blue window glazing. Do not switch off any lamps or change their lighting. Use precisely the same four closures as the day variant.

## Verificação

Testes de configuração, IDs XB, contactos duplicados, independência dos quatro sensores, open/closed/unknown/offline/stale e backup em tests/windows.test.cjs. Fixture windows=closed/open/mixed/unknown/offline interceta todas as chamadas Shelly; sem equipamentos reais. Prova review/janelas-fechadas-1.68.png e verificação em iPad820×1180. Modo misto abre apenas master/living; bedroom2/kitchen continuam fechadas; abrir/consultar/guardar não envia comandos.

