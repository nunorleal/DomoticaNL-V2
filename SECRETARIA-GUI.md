# Secretária de produção — 1.65

Acesso sobre a secretária vista de cima no quarto do Gui, na área assinalada pelo utilizador. O novo desenho SVG não modifica a fotografia original da planta, as paredes nem as máscaras de iluminação. A imagem do popup foi fornecida pelo utilizador (Secretária de Produção Inteligente.png), copiada para assets/secretaria-gui.png; não foi gerada nem editada. Os banners/cabeçalho impressos são cobertos por controlos HTML acessíveis, associados a leituras reais.

Associações officeBindings já guardadas, mantidas separadas da sala:

| Equipamento | ID inicial | Canal inicial |
| --- | --- | --- |
| Monitor | 441db8 | 0 |
| Apollo | e43ad8 | 0 |
| TerraMaster | e9df12 | 0 |
| Disco externo preto | bb8ac4 | 0 |

Definições → Shelly Cloud → Secretária do Gui permite editar os IDs/canais. O ícone de definições do popup abre diretamente o equipamento selecionado. Backup e validação existentes preservam estas associações. Nenhuma chave ou configuração privada está nos recursos publicados.

Os estados Com energia/Sem energia correspondem ao relé confirmado, não ao funcionamento do sistema operativo. Potência W e energia kWh vêm do medidor do mesmo ID/canal; inexistente, offline, inválido ou antigo aparece indisponível. Ligar/Cortar alimentação são comandos individuais pela fila Shelly partilhada; nunca desligar um servidor/disco pelo relé antes de o encerrar pelo respetivo sistema. Não há novos grupos nem automatismos.

Verificação: 138 testes automáticos; fixture fictícia isolada com quatro equipamentos, leituras, seleção, acesso à associação e um comando Apollo exato no canal0, confirmado pela consulta. Abrir/selecionar não envia comandos. Layout completo sem scroll em iPad768×1024 e820×1180. Provas review/secretaria-planta-1.65.png e review/secretaria-gui-1.65-ipad.png. Não foram acionados equipamentos reais.

## Iluminação da planta — 1.67

A secretária segue imediatamente darkness/electricOpacity do quarto bedroom2 no mesmo ciclo de desenho da planta: brilho proporcional à luz natural, escuro quando sem luz e tom quente com o candeeiro ligado. O efeito aplica-se só ao SVG do móvel; mantém o foco/clique, não altera a fotografia do popup nem as paredes. Respeita movimento reduzido. Prova: review/secretaria-escura-1.67.png. 139 testes passaram; verificação visual com candeeiro fictício.

## Realce e ícones — 1.69

Mantém-se o realce verde da consola da TV e usa-se o mesmo hover/foco na secretária. O móvel SVG fica numa camada independente do botão para nunca desaparecer com o filtro de hover. Definições → Mostrar ícones da TV e secretária oculta apenas os dois ícones; móveis, zonas de clique e realce mantêm-se. Preferência booleana persistente/backup. Verificação em iPad820×1180, foco visual comum ao hover, ícones ocultos, móvel visível e popup acessível pelo teclado; zero comandos na fixture. Provas review/secretaria-realce-1.69.png e review/secretaria-sem-icones-1.69.png. 143 testes passaram.

## Botão único de energia — 1.70

As duas ações de alimentação foram substituídas pelo botão circular junto do refresh. Verde é relé ligado confirmado, cinzento desligado; desconhecido aparece neutro âmbar e bloqueado. O clique calcula o booleano inverso do snapshot e usa o comando individual existente; nenhuma troca otimista, endpoint toggle ou atuação automática. Durante pedido/consulta fica desativado; só a leitura confirmada muda a cor. Mantém-se o aviso de encerramento do servidor/disco. UI verificada com dispositivos fictícios e 143 testes passaram.

Prova do botão verde: review/secretaria-botao-energia-1.70.png. Teste isolado: clique envia uma única saída off para monitor fictício e só a consulta muda a cor para cinzento.
