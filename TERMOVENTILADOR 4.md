# Termoventilador — 1.80

Elemento móvel visto rigorosamente de cima, inicialmente no chão do quarto principal. Render independente da planta: `assets/termoventilador-dia-v1.png` e `assets/termoventilador-noite-v1.png`. Nunca reescrever os renders da casa. A mistura segue a escuridão e a iluminação elétrica da divisão onde o aparelho está; o estado do relé só altera o contorno verde e o botão de energia, não inventa luz ou aquecimento.

`heater.js` permite arrastar entre divisões do piso 0. A posição é guardada em `casa-nl-heater-layout-v1` como `{room,x,y}` nas coordenadas da imagem original (1024 px; y 140..1320). No fim de um arrastamento inválido regressa à posição anterior; não deixar o aparelho fora da planta ou numa parede. Um arrastamento não abre o popup e nunca aciona o Shelly. Setas permitem pequenos movimentos com teclado; o seletor no popup oferece acesso às outras divisões. Posição e associação entram no JSON de segurança.

Clique abre estado, botão único de alimentação, mudança de divisão, atualização e acesso direto às definições Shelly. A associação `config.heater` contém Device ID e canal, partilha conta, transporte, fila e consultas existentes. Migração única `casa-nl-heater-added-v1`: associa o ID fornecido `ea9d29`, canal 0 por omissão, apenas se o papel ainda não existir. Remoções posteriores são respeitadas. Impedir duplicação de saídas com outros atuadores. O equipamento não participa em ações coletivas de luzes nem em cenários de demonstração.

Comandos explícitos on=true/false, exclusivamente por clique com estado booleano recente e online, sem busy/pending/edições por guardar. Cor verde apenas após confirmação reportada; desconhecido/offline/stale bloqueado, nunca zero ou desligado inventado. Uma aceitação HTTP não confirma o relé. Reutilizar o acompanhamento de 2 segundos/90 segundos, geração e cancelamento da conta; não repetir automaticamente comandos.

## Recursos gerados

Skill imagegen, ferramenta integrada, transparência real. Dia: aparelho compacto branco, grelha preta e dois seletores circulares; vista ortográfica de cima a 90°, sem pés, chão, texto ou fundo, iluminação diurna suave. Noite: edição do mesmo sprite, mantendo enquadramento e silhueta, apenas com luz ambiente azul escura, sem brilho de resistência ou alteração de estado. Os ficheiros resultantes foram copiados para assets sem editar a planta.

## Verificação

`tests/heater.test.cjs` e `tests/backup-complete.test.cjs` verificam configuração opcional, duplicados, normalização Gen1/Gen2, dados ausentes/offline/stale e backup com posição/associação/marcador. Fixture isolada `tests/serve_lights_fixture.py`, `?heater=off|on|unknown|offline`, usa exclusivamente ID falso `deadbeefab01` e interceta todos os pedidos Shelly. Verificados arrastamento entre quartos, ausência de comandos ao mover/abrir, persistência após recarregar, popup, comando booleano só ao ID falso, e render noturno pelo seletor normal de ambiente. Nunca usar equipamentos reais para testar.

Desde1.82, o indicador na planta é um contorno verde junto à silhueta quando o relé está confirmado ligado. A bolinha foi removida; desligado ou desconhecido não tem contorno verde. Mantém os mesmos estados, dados, arrastamento e controlos.

## Popup compacto — 1.93

O seletor Colocar na divisão foi retirado por pedido do utilizador. Para mudar de divisão, arraste o aparelho na planta; movimento por teclado e persistência continuam disponíveis. Alimentação, atualizar e definições têm botões circulares na mesma fila. As regras de comandos, consumo e histórico não mudaram.
