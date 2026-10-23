# Backup e associações — 1.71

A auditoria confirmou que CasaBackup.create/parse/restore preserva todos os grupos atuais de ShellyCore.config: estores, três candeeiros (incluindo master/bedroom2), sensores ambientais, quatro janelas, duas portas, multimédia, secretária, alarme, ventoinha, carregamento e contador geral. Teste integral com32 associações, sem credenciais reais, em tests/backup-complete.test.cjs. A chave Cloud só se exporta com rememberKey=true; IDs não dependem desse check. Meteorologia em cache é regenerável, excluída do backup.

Riscos identificados no fluxo anterior, sem prova de qual aconteceu ao utilizador: exportar com formulário Shelly editado mas não guardado usava os valores persistidos; importar um JSON antigo/parcial substituía a configuração atual e podia retirar IDs ausentes da cópia. LocalStorage também é separado por origem/navegador; não se alegou que esta fosse a causa.

Correções: bloquear exportação quando há alterações Shelly por guardar; mostrar resumo por grupo; preservar por omissão associações atuais ausentes do ficheiro, na mesma conta/servidor. A pré-visualização mostra o número de associações preservadas. O check pode ser retirado para reposição exata, deixando essa escolha explícita. Não misturar servidores diferentes; validar novamente toda a configuração e conflitos ID/canal antes de escrever. O plano é recalculado na confirmação. Não guardar a chave atual contra a preferência do ficheiro. Guardar formulário em janela desatualizada é recusado para prevenir sobrescrita por uma configuração antiga.

Validação: 148 testes passaram. Exportação real de fixture por download incluiu master/bedroom2/living, respetivos IDs fictícios, canais0/1 e tipos switch/light; guardou também secretária/janelas. UI bloqueou exportação com ID master editado por guardar. Importação de ficheiro sem as duas luzes apresentou «2 associações atuais preservadas» e3 luzes totais. Sem comandos na fixture. Prova review/backup-preserva-luzes-1.71.png. O JSON de teste descarregado e o ficheiro temporário de importação foram removidos após verificar.

Limite: IDs já ausentes do armazenamento e de todas as cópias não podem ser reconstruídos pela app. Para recuperar os dois candeeiros reais, é necessário um JSON anterior que os contenha ou voltar a indicar os Device IDs.

## Avisos de IDs — 1.72

Definições gerais e Shelly Cloud mostram aviso vermelho expansível com equipamentos sem ID. Cada nome abre o grupo e foca o campo correspondente sem repor o formulário nem perder edições. Junto ao campo aparece ID em falta; desaparece ao preenchê-lo. Não bloqueia gravação, não exige o contador acumulado EV opcional nem ID próprio para contador geral partilhado com o carro. Verificação visual com fixture: retirar e guardar as3 luzes mostra3 novos avisos e preserva os restantes equipamentos; atalho para candeeiro principal funciona; preencher remove o aviso; zero comandos. Prova review/aviso-ids-em-falta-1.72.png.

## Sensor da varanda — 1.75

Backup passa a aceitar/preservar sensorBindings.balcony, associado ao ID10521c0752cc. Inclui marcador de migração casa-nl-balcony-sensor-added-v1. A bateria/leitura consultada não é uma associação adicional. Teste completo agora inclui33 associações, com os quatro sensores ambientais.

Verificação da varanda: 152 testes passaram, incluindo texto só com temperatura, dados ausentes/offline, associação e backup. Prova visual com sensor fictício em review/varanda-temperatura-1.75.png; zero comandos.
