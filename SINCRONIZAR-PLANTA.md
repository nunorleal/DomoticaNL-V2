# Sincronizar a visualização da planta

A sessão em **Definições → Sincronizar histórico** serve também para sincronizar os checks em **Visualização da planta**. Usa a mesma conta nos dispositivos da mesma casa. Qualquer um pode mudar os checks. Mantém a recolha do histórico ativa apenas no dispositivo emissor.

Os checks são guardados individualmente por conta e por casa. A última escrita confirmada de cada check prevalece. A app envia ao mudar um check e consulta ao abrir, ao regressar ao primeiro plano e a cada 10 segundos enquanto está visível. Alterações feitas durante uma falha de ligação ficam pendentes enquanto houver sessão. O navegador guarda a fila localmente quando consegue aceder ao armazenamento. Cada check começa a ser partilhado na primeira alteração com sessão iniciada.

São partilhados os checks do menu e a posição do termoventilador, do desumidificador e da árvore de Natal. Cada posição começa a ser partilhada na primeira mudança de localização com sessão iniciada. Nos Condados, inclui o piso. É aplicada sem mudar o piso que está a ser visto noutro dispositivo. O tamanho dos banners, a configuração Shelly e as credenciais ficam fora desta sincronização.

## Ativação no Supabase

Executar uma vez `plant-settings-sync.sql` no SQL Editor do mesmo projeto Supabase que já guarda o histórico. O script cria uma tabela separada com acesso limitado à conta autenticada. É comum às duas casas. Depois, abrir as versões atualizadas e iniciar sessão em «Sincronizar histórico». Em Safari, a abertura direta de `index.html` requer voltar a iniciar sessão depois de fechar a página. Na versão HTTPS, a sessão pode ficar guardada.

Executar também `plant-positions-sync.sql` uma vez no mesmo projeto. As posições usam uma tabela separada com acesso limitado à própria conta, tal como os checks.

## Definições da casa

A sincronização inclui os Shellys desativados, o ambiente da planta, o tempo do protetor de ecrã, o tamanho dos banners, os nomes das divisões, a cidade e as definições da MeteoNL. Em cada casa, os ajustes ficam partilhados depois de os alterares com sessão iniciada. No caso dos Shellys, guarda a configuração antes de fechar. A alteração remota aguarda enquanto houver um formulário Shelly por guardar ou uma comunicação em curso.

As associações e credenciais Shelly, o estado ligado ou desligado e os comandos continuam fora desta sincronização. Para ativar as definições partilhadas, executar uma vez `plant-preferences-sync.sql` no projeto Supabase que guarda o histórico.
