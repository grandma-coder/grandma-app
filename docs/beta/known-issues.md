# Problemas conhecidos — beta 1

Lista interna para triagem: se um report bater com um item daqui, marque como conhecido em vez de
abrir de novo. Atualizar a cada build.

## Limitações assumidas (não são bugs)

| Área | O que o tester pode notar | Por quê / quando muda |
|---|---|---|
| Idiomas | Só EN, PT-BR e ES no seletor | Outros 8 idiomas voltam na V2 |
| Chat | Não existe "conversar com a Grandma"; Insights e leituras não aparecem | Atrás da flag do chat, desligada no beta |
| Compartilhar jornada | Não dá para outro adulto ver ou registrar o ciclo/gravidez/menopausa | V2 (Círculo de Cuidados v2); filhos já compartilham |
| Recompensas / ranking | Não aparecem | Flag desligada no beta |
| Assinatura | Não há paywall | Flag desligada no beta |
| Android | Sem build Android | Beta só iOS (decisão pendente) |
| Ícones de atividade | Natação usa sol, música usa sino, dança usa estrela; na menopausa, "café" usa copo e "álcool" usa frutinhas | Faltam figurinhas próprias |

## Bugs conhecidos em aberto

| Área | Sintoma | Status |
|---|---|---|
| Guia de parto | Trecho editado pelo admin pode aparecer em inglês | Tradutor do servidor (`translate-content`) fora do ar; conteúdo embutido está traduzido |
| Notificações antigas | Contas antigas podem ter notificações gravadas em inglês | Só contas criadas antes da correção; limpeza pendente |
| Onboarding do ciclo | Condições e suplementos não ficam salvos quando a data da última menstruação é "não sei" | Precisa de coluna nova no banco |
| Espanhol | "regla" e "período" convivem no app (ambos corretos); unificar depois do beta | Baixa prioridade |
| Onboarding (nome) | No campo de nome vazio, o texto de exemplo aparece mais baixo que o cursor (iOS). O texto digitado fica no lugar certo | Cosmético; 3 hipóteses testadas (altura fixa, autoFocus, letterSpacing) sem sucesso |
| Sem internet | Registro sem conexão mostra erro e não fica pendente para reenviar | Sem fila offline |
| Vila (marketplace) | Anúncio "CRIB" de teste do Igor, com imagem em inglês, aparece para todos | Apagar anúncios de teste antes do beta |
| Gravidez | Registros "Ninho", "Preparação para o parto" e "Resultado de exame" falham ao salvar | Corrigido na migração `20261109120000_pregnancy_log_types_nesting_birth_prep_exam` — falta aplicar em produção (`npx supabase db push`) |
| Onboarding da menopausa | Perguntas de sintomas e terapia hormonal (TRH) não são salvas nem usadas, embora a tela diga que "ajuda a personalizar" | Decisão: salvar (sintomas como primeiros registros) ou remover as 2 telas |
| Onboarding da gravidez | Humor do primeiro dia "calma", "cansada" ou "enjoada" não aparece selecionado ao editar o registro (o formulário só tem 5 humores) | Cosmético; calendário já mostra certo |
| Onboarding do ciclo | O registro de menstruação criado no onboarding guarda a duração no campo de fluxo; ao editar, nenhum fluxo aparece selecionado | Cosmético |

## Corrigido recentemente (se aparecer de novo, é regressão — prioridade alta)

- Convite do Círculo de Cuidados falhava com "círculo cheio" (migrações aplicadas em produção).
- Onboarding só de menopausa não gravava o consentimento no servidor.
- Calendário travava ao escolher um tipo de registro (iOS presenting dois modais).
- Anel do ciclo andava ao contrário da faixa da semana; anel girava ao rolar a tela.
- Natação com o ícone da menstruação; remédios com a gota vermelha.
- "Cartão de [criança]" com caixas "?" no lugar dos ícones.
- Textos quebrando com fonte grande do sistema.
- Chaves de Ajustes inacessíveis para o VoiceOver.
- Conta nova: a home do ciclo perguntava de novo a data da última menstruação logo depois do onboarding.
- Conta nova: sem linha em `profiles` (nome, privacidade e unidades não salvavam).
- Onboarding de filhos com foto-ícone dava tela vermelha; médias de sono/comida dividiam por 7 dias mesmo com 1 registro.
- Passos "parceiro/cuidadora" no onboarding de filhos e gravidez prometiam convite e só guardavam o nome (removidos).
- Ajustes mostrava "Dia 4 · Menstruação" quando a home dizia "3 dias de atraso".
- Data prevista do parto aceitava até 304 dias (máx. agora 280).
- Espanhol: "viaje"/"proveedor" → "etapa"/"médico"; 19 textos PT/ES com barras invertidas ou em inglês.
- Escolhas quebrando palavra no meio em iPhone pequeno ("Tranquil-a").
- Decimais com ponto em PT/ES (8.0 h, 27.8 cm) → vírgula.
- Gota vermelha (menstruação) usada para água, banho, natação e álcool.
- Assistentes em várias etapas (convite de cuidadora e outros) perdiam os botões Voltar/Próximo ao trocar de etapa.
- Contador de chutes falava em "10 movimentos em 2 horas" — agora segue NHS/RCOG (sem número fixo; mudou → maternidade na hora).
- Título do login em PT "Bem-vinda bem-vinda de volta"; placeholder do convite em inglês.
- Nomes de vacina em inglês para catálogos de outros países; tipos de registro em inglês no calendário de filhos ("Sleep"); "1 registrados".
- Humor do onboarding da gravidez aparecia como "Registrado" no calendário.
- Menu central cortava "COMUNIDADE" no iPhone SE; marketplace chamado "Vila" e "Aldeia" ao mesmo tempo.
- Consentimento: primeira caixa em inglês em PT/ES; "acepto los Política… y la Términos".
- Recados da Grandma para filhos em inglês ("Grandma looked at 1 log for Theo").
- Botão de salvar desativado parecia ativo (ex.: "Empezar regla" antes de escolher o fluxo).
