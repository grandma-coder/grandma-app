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
| Ícones de atividade | Natação usa sol, música usa sino, dança usa estrela | Faltam figurinhas próprias |

## Bugs conhecidos em aberto

| Área | Sintoma | Status |
|---|---|---|
| Guia de parto | Trecho editado pelo admin pode aparecer em inglês | Tradutor do servidor (`translate-content`) fora do ar; conteúdo embutido está traduzido |
| Notificações antigas | Contas antigas podem ter notificações gravadas em inglês | Só contas criadas antes da correção; limpeza pendente |
| Onboarding do ciclo | Condições e suplementos não ficam salvos quando a data da última menstruação é "não sei" | Precisa de coluna nova no banco |
| Sem internet | Registro sem conexão mostra erro e não fica pendente para reenviar | Sem fila offline |

## Corrigido recentemente (se aparecer de novo, é regressão — prioridade alta)

- Calendário travava ao escolher um tipo de registro (iOS presenting dois modais).
- Anel do ciclo andava ao contrário da faixa da semana; anel girava ao rolar a tela.
- Natação com o ícone da menstruação; remédios com a gota vermelha.
- "Cartão de [criança]" com caixas "?" no lugar dos ícones.
- Textos quebrando com fonte grande do sistema.
- Chaves de Ajustes inacessíveis para o VoiceOver.
