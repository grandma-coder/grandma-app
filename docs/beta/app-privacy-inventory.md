# Inventário de dados — App Store "App Privacy" (beta 1)

Levantado do código em 7 nov 2026, para preencher **App Store Connect → App Privacy**. Revisar com
quem cuida do jurídico antes de publicar. Nenhum dado é usado para **rastreamento** (tracking) nem
vendido; não há SDK de analytics nem de anúncios.

## O que o app coleta

| Categoria Apple | Dado | Onde | Vinculado à pessoa? | Finalidade |
|---|---|---|---|---|
| Contact Info → Email | e-mail da conta; e-mail de quem é convidado para o Círculo | Supabase Auth, `child_caregivers` | Sim | Funcionalidade do app |
| Contact Info → Name | nome; nome das crianças | `profiles`, `children` | Sim | Funcionalidade do app |
| Health & Fitness → Health | ciclo, menstruação, sintomas, temperatura basal, testes de LH/gravidez, muco, humor, sono, peso, gravidez (semanas, consultas, chutes, contrações), menopausa (sintomas, fase), saúde das crianças (vacinas, remédios, temperatura, crescimento, alergias, tipo sanguíneo) | tabelas `*_logs`, `children`, `exams`, `profiles` | Sim | Funcionalidade do app |
| Sensitive Info | registros de **intimidade/atividade sexual** (ciclo) | `cycle_logs` | Sim | Funcionalidade do app |
| User Content → Photos | memórias, fotos de exames, foto do prato, avatar | Storage (buckets privados) | Sim | Funcionalidade do app |
| User Content → Other | posts e comentários da comunidade, anúncios do brechó, mensagens de suporte/sugestão, notas | `channel_posts`, `garage_*`, `support_tickets`, … | Sim | Funcionalidade do app; suporte |
| Location → Coarse | cidade/endereço digitado no perfil (busca por texto) | `profiles` | Sim | Funcionalidade do app |
| Identifiers → User ID | id da conta | Supabase | Sim | Funcionalidade do app |
| Identifiers → Device ID | token de push do aparelho | `push_tokens` | Sim | Funcionalidade (notificações) |
| Diagnostics → Crash Data | relatórios de erro, sem e-mail, IP ou gravação de tela | Sentry | Não | Diagnóstico |
| Other Data → data de nascimento | data de nascimento da usuária e das crianças | `profiles`, `children` | Sim | Funcionalidade do app |

Não coletado no beta: localização precisa, contatos da agenda, histórico de navegação, compras
(paywall desligado), dados de uso/analytics, publicidade.

## Para onde os dados vão (processadores)

| Serviço | O que recebe | Quando |
|---|---|---|
| Supabase | tudo acima (banco, login, arquivos, funções) | sempre |
| Anthropic (Claude) | foto do prato (estimativa de nutrientes), foto de exame / cartão do plano (leitura de texto), resumo dos registros para gerar insights, textos para tradução | só quando a pessoa usa essas funções |
| OpenStreetMap Nominatim | o texto digitado na busca de cidade/endereço | ao buscar endereço no perfil |
| Sentry | dados técnicos de erro | quando ocorre um erro |
| Expo Push | token do aparelho + texto da notificação | ao enviar push |
| Skeleton (mother.tech) | espaço da criança (id e convidados) quando configurado no servidor | onboarding de filhos / convites — **confirmar se está ativo em produção** |

## Pontos para decidir antes de enviar

1. **Anthropic recebe fotos e dados de saúde** quando a pessoa usa o scan do prato, do exame ou os
   insights. Isso precisa estar na política de privacidade e, idealmente, avisado na tela antes do
   primeiro uso.
2. **Skeleton**: se a integração estiver ligada em produção, declarar; se não for usada no beta,
   desligar no servidor.
3. A política de privacidade em thegrandma.app/privacy deve listar os processadores acima.
