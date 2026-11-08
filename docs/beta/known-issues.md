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
| Sem internet | Registro sem conexão mostra erro e não fica pendente para reenviar | Sem fila offline |
| Círculo de Cuidados | Convite falha com "Seu círculo de cuidado está cheio" mesmo sem ninguém no círculo | Migração `20261102200000_paywall_flag` faltando em produção (T15) |

## Corrigido recentemente (se aparecer de novo, é regressão — prioridade alta)

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
