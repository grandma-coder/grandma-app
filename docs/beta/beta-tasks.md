# Beta — fila de tarefas (controle)

Atualizado a cada tarefa. ✅ feito · 🔄 em andamento · ⬜ a fazer · 👤 depende do Igor

| # | Tarefa | Dono | Status |
|---|---|---|---|
| T1 | Migração de segurança (C1, H2, H3, M1, M3, M4, Low) — escrita e testada localmente | Claude | ✅ (👤 aplicar em prod) |
| T2 | Neutralizar seeds que apagavam dados por nome de criança | Claude | ✅ |
| T3 | Remover código morto (App.tsx, index.ts, ActivityTimeline) | Claude | ✅ |
| T4 | Conferir avisos médicos e consentimento | Claude | ✅ (👤 decidir idade mínima) |
| T5 | H1 — cuidadora bloqueada/pausada não lê mais a ficha (migração parte 2); colunas médicas p/ cuidadora ativa sem permissão ficam pós-beta | Claude | ✅ (👤 aplicar) |
| T6 | M2 — `create_notification`: só tipos do app, respeita bloqueio, limita tamanho (migração parte 2) | Claude | ✅ (👤 aplicar) |
| T7 | Storage do brechó: editar/apagar já é só do dono; sem mudança (avatares de canal usam `channels/`) | Claude | ✅ |
| T8 | Datas e fuso: 22 lugares liam datas como UTC (aniversário, memórias, consultas e idades 1 dia antes) → corrigido | Claude | ✅ |
| T9 | Sem internet: aviso de conexão nas leituras, erro traduzido ao salvar, retry na abertura; sem fila offline (conhecido) | Claude | ✅ |
| T10 | Lembretes locais no idioma do app e reagendados ao trocar idioma ✅; push de campanha do admin tem 1 texto só e o idioma do usuário não fica no banco | Claude | ✅ (👤 decidir) |
| T11 | Convite: link antigo `invite/…` dava 404 → rota de redirecionamento; texto com "Guru Grandma" e masculino → corrigido; nome antigo removido do app | Claude | ✅ |
| T12 | Inventário de dados para App Privacy → `docs/beta/app-privacy-inventory.md` (👤 decidir Anthropic/Skeleton na política) | Claude | ✅ |
| T13 | Conta nova no iPhone SE: filhos+ciclo (EN), gravidez (ES), menopausa (PT), calendário, notas, ajustes. 13 bugs achados e corrigidos (ver known-issues). Não coberto no simulador: convite de cuidadora entre 2 contas, lembretes no aparelho, Apple/Google login | Claude | ✅ |
| T14 | PR aberto: https://github.com/grandma-coder/grandma-app/pull/2 (👤 merge depois de T15/T16) | Claude | ✅ |
| T15 | Aplicar migração de segurança + rodar `prod-verification.sql`. **Bloqueia o beta:** conta nova não consegue convidar cuidadora ("círculo cheio" com 0 pessoas) — a migração `20261102200000_paywall_flag` não parece estar em produção; o bloco 5b do SQL confirma | Igor | ⬜ |
| T16 | Build final + TestFlight interno no aparelho | Igor | ⬜ |
| T17 | App Store Connect: Beta App Review, App Privacy, conta demo | Igor | ⬜ |
| T18 | Ícone novo no TestFlight: o ícone novo (6 nov) só existe no `feat/site-look`; builds 14/15 são anteriores. Sai no build do T16, depois do merge do PR #2 — conferir o ícone no TestFlight e na tela inicial | Igor | ⬜ |
| T19 | Simulador, 2ª rodada: todas as combinações jornada × idioma cobertas (filhos ES/PT, gravidez EN/ES/PT, menopausa EN/PT, ciclo do zero em ES com conta nova). Sugestão enviada (👤 conferir no Suporte do admin: "Teste beta T19"), sair/entrar ✅, esqueci a senha ✅ (👤 conferir e-mail em production@), convite de cuidadora ⛔ bloqueado em prod (T15). Contas de teste: production+gbeta-en@ (Bia) e production+gbeta-es@ (Lucia), senha Beta-Grandma-2026! | Claude | ✅ |
| T20 | Decidir (pedidos da sessão dos reels): campo de valor (°C/°F) no registro de temperatura dos filhos; lembrete com repetição diária/semanal; entrada "Pergunte à vila" na Comunidade (hoje só o canal) | Igor | ⬜ |
