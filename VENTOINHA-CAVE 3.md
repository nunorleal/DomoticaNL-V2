# Ventoinha da cave · 1.53

Associação `fan` opcional na configuração Cloud, com `deviceId` e `channel` 0..15. A instalação atual acrescenta uma vez o ID pedido pelo utilizador, 8819dc, canal 0. A migração valida conflitos com outros atuadores e preserva a política da chave. Não substitui configurações inválidas nem envia comandos; sem armazenamento disponível, o ID pode ser guardado nas definições. `fan:null` significa associação retirada e impede nova migração. Backups anteriores sem o campo continuam válidos.

Definições → Shelly Cloud → Ventoinha da cave permite editar ou remover a associação. Usa o servidor, chave, fila HTTPS, geração de configuração, normalizador de relés e consultas partilhadas. Apenas set/switch ON/OFF por botão explícito. Sem velocidade, comandos de grupo, cenários ou ligação automática. Aceitação HTTP não altera o estado: aguarda consulta e acompanha durante até 90 segundos, sem repetir comandos. Dados offline, inválidos ou com mais de 45 segundos bloqueiam a atuação e a animação.

Ícone SVG preto com três pás e grelha, sem pés, em `fan.js`. Só as pás rodam quando o estado reportado é ON e recente; respeita movimento reduzido. Banner arrastável com a mesma persistência e exportação JSON dos restantes banners da cave.

Verificação: 121 testes automáticos; interface com fixture que interceta todas as chamadas Shelly. Nenhum equipamento real acionado. `?fan=off|on|unknown|offline`, `fanreject` usam ID fictício deadbeefbb01, canal 0.
