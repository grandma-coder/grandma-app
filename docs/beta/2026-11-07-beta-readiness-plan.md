# grandma.app — plano de prontidão para beta testers

Data: 7 nov 2026 · Branch: `feat/site-look` (já contém a `main`) · Idiomas do lançamento: EN, PT-BR, ES

Objetivo: colocar o app nas mãos de beta testers sem crash, sem tela travada, sem inglês misturado,
sem dado perdido e com um caminho claro para eles reportarem problemas. Cada item tem dono:
**Claude** (faço no código/simulador), **Igor** (aparelho real, contas, lojas, decisões) ou **ambos**.

Legenda: ✅ feito · 🟡 parcial / precisa confirmar · ⬜ a fazer

```mermaid
flowchart LR
  A[1. Código fechado<br/>merge + CI verde] --> B[2. Backend de produção<br/>migrações, funções, RLS]
  B --> C[3. Teste de ponta a ponta<br/>conta nova, 4 jornadas, 3 idiomas]
  C --> D[4. Aparelho real<br/>TestFlight interno]
  D --> E[5. Lojas e jurídico<br/>App Store Connect, privacidade]
  E --> F[6. Operação do beta<br/>feedback, Sentry, comunicação]
  F --> G((Beta externo))
```

---

## 1. Código fechado e integrado

| # | Item | Dono | Status |
|---|---|---|---|
| 1.1 | Revisão por jornada (ciclo, gravidez, filhos, menopausa): idioma, ícones, rótulos, lógica | Claude | ✅ |
| 1.2 | Onboarding, login, Ajustes de todas as jornadas, social, notificações, crashes de hooks | Claude | ✅ |
| 1.3 | Modo escuro, texto grande (teto 1,3×), visão da cuidadora, anéis, travamento de modais | Claude | ✅ |
| 1.4 | Tradução automática (`i18n:sync` + `i18n:check` + GitHub Action) | Claude | ✅ |
| 1.5 | Abrir PR `feat/site-look` → `main` e fazer o merge (CI: typecheck, testes, i18n) | Claude abre · Igor aprova | ⬜ |
| 1.6 | Juntar `feat/admin-feedback-labels` na `main` e publicar o admin | Igor | ⬜ |
| 1.7 | Remover código morto conhecido (`App.tsx`/`index.ts` template, `ActivityTimeline`, chaves sem uso) | Claude | ⬜ |
| 1.8 | Build de produção a partir da `main` (ícone novo, splash, todas as correções) | Igor roda | ⬜ |

## 2. Backend de produção (Supabase)

| # | Item | Dono | Status |
|---|---|---|---|
| 2.1 | Conferir que todas as migrações do app (`supabase/migrations`, última `20261102200000_paywall_flag`) e do admin (`admin/migrations`, última `0019_waitlist_place`) estão aplicadas em produção | Igor (painel) · Claude gera o checklist SQL | 🟡 |
| 2.2 | Edge functions no ar: `submit-feedback` ✅, `invite-caregiver`, `accept-invite`, `delete-account`, `export-user-data`, `notification-opened` | Igor confirma no painel | 🟡 |
| 2.3 | `translate-content` (tradutor do servidor) quebrado — hoje é só rede de segurança. Decidir: consertar ou desligar a chamada | Igor decide | ⬜ |
| 2.4 | Auditoria de RLS: toda tabela com dado de saúde só lê/escreve o dono (e cuidador autorizado nas de filhos) | Claude (leitura das migrações) | ⬜ |
| 2.5 | Flags remotas no estado de beta: chat OFF, recompensas OFF, paywall OFF, Diffuse OFF | Igor confirma no admin | 🟡 |
| 2.6 | Dados de exemplo (rotinas "Sleep Log", notificações em inglês) só na conta de teste — nunca em produção para usuários reais | Claude verifica seeds | ⬜ |
| 2.7 | Excluir conta e exportar dados funcionando de ponta a ponta | Ambos | ⬜ |

### Security migration (apply before beta)

Arquivo: `supabase/migrations/20261107120000_beta_security_hardening.sql` — resultado da auditoria de RLS (item 2.4).
**Ainda não aplicada.** Igor revisa e aplica no SQL editor do Supabase (colar o arquivo inteiro) ou via CLI
(`supabase db push`). É idempotente: pode rodar de novo sem efeito colateral. Cada bloco que falhar emite um
`WARNING` com o motivo em vez de abortar o resto — **ler a saída**: um WARNING significa que aquela correção não entrou.

| Achado | O que a migração corrige |
|---|---|
| C1 (crítico) | Quem convidou não consegue mais reescrever o próprio convite para apontar para o filho de outra família. A policy de UPDATE exige que a criança seja do próprio usuário, e um trigger congela `child_id`, `invited_by`, `user_id` e `is_locked` e bloqueia "→ accepted" vindo do app (aceitar continua pela edge function `accept-invite`). Fecha também: cuidador revogado se reativando sozinho e convidante reativando cuidador sem passar pelo limite de vagas. |
| H2 | `leaderboard_scores` passa a devolver só a linha do próprio usuário (a view completa vira `leaderboard_scores_all`, sem acesso de cliente). Admin e service role continuam vendo tudo. O ranking público (flag OFF no beta) vai precisar de uma view opt-in antes de ligar. |
| H3 | Selo de especialista verificado (`is_verified_expert`, `expert_title`) só pode ser alterado pelo backend/admin. |
| M3 | `scan_history` INSERT: a linha precisa ser sempre do próprio usuário, e a criança precisa ser dele ou de quem ele cuida ativamente (com permissão de registrar). |
| M4 | Cuidadores pausados ou com vaga bloqueada perdem acesso a `kids_vaccine_schedule` (leitura), `nanny_notes` e `kids_reminders`. |
| M1 | Tabelas da comunidade (`channel_members`, `poll_votes`, `post_reactions`, `channel_posts`, `post_comments`, `channel_ratings`) deixam de ser lidas com a chave anon (sem login). |
| Baixo | `active_seats_for(uuid)` deixa de ser RPC pública. |

**Fica para depois (não está nesta migração):**

- **H1** — o SELECT de `children` para cuidadores expõe colunas médicas; a tela do cuidador usa o RPC `get_caregiver_children`, mas outras leituras podem bater direto na tabela. Precisa de análise do app antes de restringir.
- **H4** — tabelas usadas pelo app que não são criadas em nenhuma migração do repo; conferir RLS direto em produção.
- **M2** — RPC `create_notification` (qualquer membro de canal notifica qualquer outro membro).
- **M5** — toggles de privacidade: revisar se o servidor respeita cada um.
- Buckets de storage do garage — revisar políticas de storage.

Depois de aplicar: testar no app convidar/aceitar/pausar cuidador, lembretes e vacinas na visão do cuidador, scan com criança selecionada e a tela de conquistas (badges).

## 3. Teste de ponta a ponta no simulador (conta NOVA, sem dados)

Tudo até aqui foi testado na conta de teste cheia de dados. Beta tester chega **vazio** — estados vazios,
primeiros registros e onboarding são o que ele vê primeiro.

Para cada jornada × cada idioma (EN, PT, ES):

| # | Fluxo | Status |
|---|---|---|
| 3.1 | Cadastro com e-mail → confirmação → onboarding completo → home | ⬜ |
| 3.2 | Home vazia: textos, cards, anel, mensagem do dia | ⬜ |
| 3.3 | Primeiro registro de cada tipo (pelo dock da home e pelo "+" do calendário) | ⬜ |
| 3.4 | Editar e apagar um registro; registrar em dia passado; bloquear dia futuro | 🟡 (feito na conta cheia) |
| 3.5 | Calendário, Notas e Ajustes com poucos dados (1 dia, 1 semana) | ⬜ |
| 3.6 | Lembretes: criar, receber (no aparelho), desligar | ⬜ |
| 3.7 | Trocar de jornada, adicionar segunda jornada | ⬜ |
| 3.8 | Convidar cuidadora → aceitar convite em outra conta → visão da cuidadora | ⬜ |
| 3.9 | Enviar sugestão → aparece na caixa de Suporte do admin | ⬜ |
| 3.10 | Sair, entrar de novo, esqueci a senha, Apple/Google | ⬜ |

## 4. Aparelho real (TestFlight interno — Igor + 2–3 pessoas próximas)

| # | Item | Status |
|---|---|---|
| 4.1 | iPhone pequeno (SE / mini) e grande (Pro Max) | ⬜ |
| 4.2 | Notificações push e lembretes locais chegam na hora e no idioma certo | ⬜ |
| 4.3 | Face ID / PIN do bloqueio do app | ⬜ |
| 4.4 | Sem internet: abrir, navegar, tentar registrar (mensagem clara, nada perdido) | ⬜ |
| 4.5 | Fuso horário e virada do dia (registro às 23h55 cai no dia certo) | ⬜ |
| 4.6 | Sentry recebe um crash de teste do build de produção | ⬜ |
| 4.7 | Splash animado, ícone novo, modo escuro e texto grande do sistema | ⬜ |
| 4.8 | Android: decidir se entra no beta (precisa build EAS Android + teste em aparelho) | Igor decide |

## 5. Lojas, privacidade e jurídico

| # | Item | Dono | Status |
|---|---|---|---|
| 5.1 | TestFlight externo exige Beta App Review: descrição do beta, conta de demonstração, contato | Igor | ⬜ |
| 5.2 | App Privacy (rótulos da App Store) coerente com o que o app coleta (saúde, contato, uso) | Igor · Claude levanta o inventário | ⬜ |
| 5.3 | Política de privacidade e termos publicados (thegrandma.app) e linkados no app e na loja | Igor | 🟡 |
| 5.4 | Aviso "não é dispositivo médico / não diagnostica" visível nas telas de saúde | Claude confere | 🟡 |
| 5.5 | Consentimento (LGPD/GDPR) no onboarding, idade mínima, exclusão de conta acessível | Claude confere | 🟡 |
| 5.6 | Sentry sem PII e sem gravação de tela (já configurado) | Claude | ✅ |

## 6. Operação do beta

| # | Item | Dono | Status |
|---|---|---|---|
| 6.1 | Canal de feedback: Ajustes → Enviar sugestão → Suporte do admin | Claude ✅ · Igor testa | 🟡 |
| 6.2 | Alerta de crash do Sentry para o seu e-mail/Slack | Igor | ⬜ |
| 6.3 | Mensagem de boas-vindas para testers: o que testar, como reportar, o que ainda não existe | Claude redige · Igor envia | ⬜ |
| 6.4 | Lista de problemas conhecidos (para não virarem reports repetidos) | Claude | ⬜ |
| 6.5 | Ritmo: um build por semana, notas de versão no TestFlight | Ambos | ⬜ |
| 6.6 | Grupo de testers: tamanho, perfil (ciclo, gestantes, mães, menopausa), idiomas | Igor | ⬜ |

## 7. Decisões abertas (não bloqueiam o beta, mas precisam de dono)

- Coluna nova para condições e suplementos do onboarding do ciclo (migração).
- Campos do onboarding que nada usa: profissional de saúde e nome do parceiro (gravidez), nome do parceiro (filhos), suplementos (ciclo) — remover ou usar.
- Figurinhas novas para natação, música e dança.
- Notificações antigas: limpar as gravadas em inglês; expirar não lidas após 30 dias.
- Brechó para quem está no ciclo; figurinha do muco cervical; lembretes sincronizados entre aparelhos.

## 8. Fora do beta (V2)

Compartilhar jornada entre adultos · os outros 8 idiomas · Insights/leituras/artigos (atrás do chat) ·
chat com a Grandma · ranking e recompensas · paywall.

---

## Ordem sugerida

1. **Claude, agora:** 2.4 RLS, 2.6 seeds, 1.7 código morto, 5.4/5.5 conferências, 6.3/6.4 textos do beta,
   checklist SQL do 2.1. Depois a passada 3 inteira com conta nova nos 3 idiomas.
2. **Igor, em paralelo:** 2.1/2.2/2.5 no painel, 1.6 admin, 5.1–5.3 App Store Connect, 6.2 alertas, 6.6 grupo.
3. **Juntos:** 1.5 merge → 1.8 build → 4 no aparelho → corrigir → build → **beta externo**.
