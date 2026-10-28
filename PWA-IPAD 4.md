# Domótica no ecrã principal do iPad — 2.03

## Publicar e instalar

1. Publicar o conteúdo desta pasta num endereço HTTPS, por exemplo GitHub Pages. Manter `manifest.webmanifest`, `pwa.css` e `assets/icons/` ao lado dos restantes recursos. Funciona na raiz de um domínio ou numa subpasta de projeto.
2. No Safari do iPad, abrir o endereço HTTPS da aplicação, sem parâmetros de demonstração/teste.
3. Tocar em Partilhar → Adicionar ao ecrã principal. Confirmar o nome «Domótica». Se aparecer a opção «Abrir como app web», mantê-la ativa.
4. Abrir pelo novo ícone. A navegação do Safari deixa de fazer parte da janela; a barra de estado e o indicador de início do iPadOS podem continuar visíveis. Rodar o iPad mantém o layout responsivo.

O lançamento usa `./`, com identidade e scope `./`, relativos ao manifesto. Não copia query strings de ensaio para o ícone. A orientação é `any`; não há bloqueio de retrato/paisagem. Ícone Apple opaco180×180 e ícones do manifesto192/512, incluindo variante maskable.

## Configurações e Shelly

A lógica, os IDs, a comunicação HTTPS Shelly Cloud, as filas e a confirmação dos comandos permanecem iguais. Não há comandos de arranque/instalação. A PWA usa o armazenamento disponibilizado pelo iPadOS; este pode estar separado do Safari. Antes de instalar, exportar a cópia JSON nas definições. Se as associações não aparecerem na app instalada, importar essa cópia e introduzir a chave Cloud da sessão novamente. A chave não passa a ser persistida/exportada automaticamente. Restaurar a cópia não comanda equipamentos.

Os serviços Shelly e meteorológicos continuam a necessitar de Internet. Não foi acrescentado service worker: não é obrigatório para a instalação de uma web app no ecrã principal do iPad. Não há cache/interceção adicional de respostas Cloud, comandos, meteorologia ou credenciais, nem promessa de controlo offline. O cache meteorológico já existente mantém a sua lógica anterior.

## Ecrã e áreas de segurança

`display: standalone`, meta tags Apple e `viewport-fit=cover` preparam a abertura sem barra de endereço, separadores ou navegação Safari. `black-translucent` permite ocupar o ecrã até às áreas de segurança. Os ajustes em `pwa.css` só se aplicam ao modo instalado: cabeçalho, rodapé, planta, popups e Meteo respeitam os insets do iPadOS. O iframe Meteo recebe um viewport já protegido, pois os insets dentro de iframes podem ser zero. O desenho no Safari normal fica inalterado.

## Verificações e limites do ensaio

-222 testes aprovados, incluindo manifesto em raiz/subpasta, início limpo, meta tags, dimensões PNG e ausência de service worker/interceção de rede.
-Recursos estáticos verificados por HTTP em `http://127.0.0.1:8083/`: manifesto200 com `application/manifest+json`, ícone200 `image/png`, CSS200 e Meteo200.
-Layout revisto em820×1180 e1180×820 na fixture com Shellys fictícios; sem comandos aos equipamentos, sem erros de consola. Ver `review/pwa-ipad-2.03.png`.
-A instalação nativa e os insets físicos devem ser confirmados no próprio iPad; o navegador de ensaio não disponibiliza a instalação iPadOS. Não foi fornecido um endereço público, pelo que o HTTPS de produção não pôde ser confirmado.

`localhost`/`127.0.0.1` são adequados a desenvolvimento no próprio dispositivo que serve a aplicação. No iPad, `localhost` refere-se ao iPad, não ao Mac. Um endereço HTTP da rede local (por exemplo192.168.x.x) não equivale a localhost. Para instalar e utilizar a partir do iPad, preferir o endereço HTTPS publicado; não abrir o ficheiro `index.html` diretamente.

Referências oficiais: [Web apps no Safari26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/), [manifesto e standalone no iPadOS](https://webkit.org/blog/13878/), [meta tags Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html).
