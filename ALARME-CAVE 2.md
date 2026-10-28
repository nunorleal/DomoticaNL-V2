# Alarme da cave e banners móveis — 1.52

Dois Shellys independentes na mesma conta Cloud:
- arm: atua a armação. O utilizador confirmou ON=armado e OFF=desarmado.
- trigger: só leitura; ON indica que o alarme está a tocar. Nunca enviar comandos a esta saída.

Configuração opcional alarm:{arm?:{deviceId,channel,activeWhenOn},trigger?:{deviceId,channel,activeWhenOn}} em casa-nl-shelly-cloud-v1. A polaridade é configurável, com true por omissão em ambos os campos. Guardar/consultar/importar/iniciar/reset/cenários não aciona o alarme. O alarme não pertence aos comandos gerais de luzes/estores. Rejeitar a reutilização da saída arm por outro atuador, incluindo EV, e a coincidência de arm/trigger. Partilhar ID com canais diferentes é permitido. Campos antigos preservados; backup valida e conserva os dois papéis.

Leituras Gen1 relays[channel].ison e Gen2 switch:channel.output, estritamente booleanas e no canal configurado, via o normalizador partilhado EV.relayStatus. Dados frescos até 45 s, online, sem erro. Não inferir por potência, estados de luz ou falta de resposta. Disparo true tem prioridade visual, mesmo se a armação for false/desconhecida; o popup mostra os dois valores. Trigger configurado mas desconhecido mostra estado parcial âmbar, nunca silêncio confirmado. Sem configuração do trigger, a armação continua legível, com deteção de disparo por associar.

Escudo na cave: halo tracejado verde em movimento para armado, cinzento estático para desarmado, vermelho com halo rápido/pulsação para disparo, âmbar para desconhecido/parcial. Movimento reduzido mantém as cores sem animar. Popup e acesso em Controlos gerais. Nova associação em Shelly Cloud → Alarme da cave. Ícone SVG nativo; chão, portas, paredes e carro mantêm-se.

Comandos explícitos Armar/Desarmar usam set/switch com booleano on só para alarm.arm. Conta, fila, limites, timeout e geração partilhados. Não retry. HTTP aceite não altera o estado visual: confirmar por nova leitura; consulta a cada 2 s até 90 s durante espera, normal de 15 s no temporizador existente. Bloquear atuações enquanto pendente e suspender o protetor nesse período. O estado trigger nunca é alvo do construtor de comando. Fonte: https://shelly-api-docs.shelly.cloud/cloud-control-api/communication-v2/

## Banners móveis

Cave, alarme e consumo EV podem ser arrastados com rato/toque, mantendo clique normal para abrir. Limiar 6 px distingue arrastar de clicar; suprimir clique depois de arrastar. Ignorar estes banners no gesto de mudança de piso. Conter Cave/alarme dentro do retângulo da cave; EV dentro do estacionamento e espaço inferior disponível no plano. Posições em percentagens do respetivo pai, conservadas em casa-nl-basement-layout-v1. Ausência preserva o layout original. Reajustar à área visível ao mudar piso/tamanho, sem destruir preferências. Cancelar pointer restaura posição anterior. Backup valida esta chave opcional e restaura atomicamente.

Core/UI: alarm-core.js, alarm-form.js, alarm.js, alarm.css, basement-layout-core.js, basement-layout.js. Core e formulário antes de shelly.js; UI do alarme depois de floors.js; arrastamento depois do alarme/EV e antes de meteo.js.

## Validação

Unitários de configuração, independência de estados, prioridade de disparo, dados ausentes/offline/stale, polaridade, canais Gen1/Gen2, recusa sem retry, backup e limites do arrastamento. Fixture só fictícia: ?alarm=armed|disarmed|sounding|partial|offline|unknown|disarmed-trigger, opcional alarmreject/alarmhold. UI testou armar/desarmar apenas deadbeefaa01 canal 1; deadbeefaa02 só leitura. Guardar não acrescentou comandos. Arrastar os três banners não abriu popups nem mudou piso, posições mantiveram-se após reload e clique normal abriu o popup. Nunca usados equipamentos reais.
