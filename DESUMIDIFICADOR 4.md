# Desumidificador — 1.81

Aparelho móvel, visto de cima, inicialmente no chão da casa de banho do quarto principal (`bath1`), coordenadas (165,254) na imagem original. Dois sprites independentes da planta: `assets/desumidificador-dia-v1.png` e `assets/desumidificador-noite-v1.png`. A mistura acompanha a escuridão e a luz elétrica da divisão atribuída. Não altera a planta nem inventa luz de funcionamento, humidade medida, temperatura ou modo do aparelho.

Clique abre o popup com alimentação confirmada, botão único verde/grey, atualização, seletor de divisão e ligação direta às definições Shelly. Arrastamento entre divisões do piso0, com contenção no destino, persistência, cancelamento e supressão de clique depois de mover. Teclado: setas para pequenos movimentos; seletor para acesso às outras divisões. Mover não envia comandos.

Associação própria `config.dehumidifier`, sem reutilizar `heater` ou `fan`. ID confirmado pelo utilizador: **88d798**, canal 0 por omissão. O primeiro valor «86/P88» foi rejeitado por não ser hexadecimal e não é guardado. Migração única `casa-nl-dehumidifier-added-v1` respeita associação existente, remoção explícita e edições futuras. Mesmo transporte, conta, fila, generation guards, consulta de estados em lotes e acompanhamento de comandos existentes. Não criar temporizador de rede independente; o intervalo visual de 2s só desenha leituras locais.

Ligado/desligado indica alimentação do relé; humidade pretendida e modo permanecem no aparelho. Comando só com estado booleano fresco, online, sem erros, fila ocupada, pending ou campos sujos. Booleano explícito on=true/false, nunca endpoint toggle; não repetir automaticamente um comando. Aceitação HTTP não confirma estado. Não incluir em iluminação coletiva, cenas ou contadores de luzes.

Backup inclui `dehumidifier`, `casa-nl-dehumidifier-layout-v1` `{room,x,y}` e o marcador booleano. Validar importação e preservar papel em ficheiros antigos incompletos. Posição independente de termoventilador e ventoinha.

## Renders

Gerados com skill imagegen e ferramenta integrada, com transparência real. Dia: desumidificador doméstico compacto branco, grelha superior escura e barra eletrónica de controlo, vista ortográfica rigorosamente de cima a90°, sem pés, laterais, perspetiva inclinada, fundo, chão, texto ou cabo. Noite: edição do mesmo recurso preservando enquadramento e geometria, apenas iluminação ambiente azul escura, ecrã sem luz. Copiar os resultados para assets; não modificar os renders da casa.

## Verificação

`tests/dehumidifier.test.cjs`: compatibilidade, ID confirmado, rejeição do ID mal formado, canais, duplicados com outros atuadores, posição inicial contida na casa de banho e validação de posições. `tests/backup-complete.test.cjs`: dois aparelhos com IDs/posições/marcadores independentes em backup completo e preservação numa importação antiga.

Fixture isolada `tests/serve_lights_fixture.py`, `?dehumidifier=off|on|unknown|offline` usa ID falso `deadbeefab02` e interceta todas as chamadas Shelly. Nunca testar com dispositivos reais.

Verificação visual concluída em iPad vertical820×1180: posição inicial livre junto ao lavatório sem tapar WC, arrastamento para o quarto principal, persistência após recarregar, seletor a regressar à posição inicial da casa de banho, clique no popup, botão verde após confirmação do relé falso, acesso ao Device ID/canal e gravação sem comandos adicionais. Log contém apenas o comando explícito para deadbeefab02; nenhum pedido de comando ao termoventilador. Vista noturna confirmada sem erros de JavaScript. Imagens em review/desumidificador-dia-1.81.png e review/desumidificador-noite-1.81.png. Suite166 testes passou.

Desde1.82, o indicador na planta é um contorno verde junto à silhueta quando o relé está confirmado ligado. A bolinha foi removida; desligado ou desconhecido não tem contorno verde. Mantém os mesmos estados, dados, arrastamento e controlos.

## Popup compacto — 1.93

O seletor Colocar na divisão foi retirado por pedido do utilizador. Para mudar de divisão, arraste o aparelho na planta; movimento por teclado e persistência continuam disponíveis. Alimentação, atualizar e definições têm botões circulares na mesma fila. As regras de comandos, consumo e histórico não mudaram.
