# Regras de saúde e lojas — o que vale para o grandma.app

*2 nov 2026. Pesquisa de fontes oficiais (Apple, Google Play, FDA, MDR/MDCG, MHRA, ANVISA, FTC, WA MHMDA). Não é parecer jurídico: GDPR/LGPD, COPPA e leis estaduais pós-Dobbs precisam de confirmação com advogado.*

## Situação do app hoje

| Ponto | Estado | Ação |
|---|---|---|
| Claim de contracepção ("dias seguros", "evitar gravidez") | Não existe | Manter assim; incluir "não use como método contraceptivo" no rodapé do ciclo e no disclaimer |
| Scores numéricos + rótulos ("4.5/10", "needs care", "needs attention") em Kids | Existe — **risco alto** (MHRA trata risk score como dispositivo) | Trocar por contagens e tendências neutras ("3 noites com sono curto"); remover nota e "needs care" |
| Regra 5-1-1 das contrações ("head to the hospital") | Texto fixo | Reescrever como informação: "um critério comum é 5-1-1 — ligue para sua maternidade" |
| Disclaimer geral ("não é dispositivo médico…") na primeira abertura e perto dos insights | Só pontual (vacinas, ciclo, chat) | Adicionar na onboarding, em Sobre e no rodapé dos insights |
| Insights com IA (Claude) | Atrás da flag `grandma_chat` (off) desde este commit | Antes de ligar: consentimento explícito para envio a IA de terceiro (Apple 5.1.2(i)) |
| Exclusão de conta e exportação de dados | Existem (`delete-account`, `export-user-data`) | Conferir que apagam Care Circle e backups |
| Comunidade: bloquear usuário | Existe | Conferir denúncia, filtro e contato publicado (Apple 1.2) |
| Relatório para o médico (Kids) | Existe | Rotular "dados informados pelo usuário" |
| SDKs de ads/analytics com dado de saúde | A confirmar | Nenhum dado de saúde em analytics; declarar no privacy manifest e no Data safety |
| Consentimento granular (saúde / comunidade / IA) | A confirmar | Telas separadas na onboarding (GDPR art. 9, LGPD art. 11, WA MHMDA) |

## Linhas vermelhas
1. Contracepção ou "dias seguros" → dispositivo classe IIb (UE) / FDA De Novo. Só a Natural Cycles tem.
2. Diagnóstico, dose, recomendar tratamento (inclusive TRH).
3. Medir sinais vitais só com sensor do celular (Apple 1.4.1).
4. Dado de saúde para ads, marketing ou SDK de analytics (Apple 5.1.3(i); caso FTC × Flo).
5. Disclaimer não salva: vale a finalidade que o marketing e a interface comunicam.
6. Chat de IA com conduta médica ou enviando dado a terceiro sem consentimento.
7. Não marcar como Kids Category.

## Obrigatório na submissão
- **Apple:** lembrar de consultar o médico (1.4.1); documentar metodologia (curvas OMS, previsão de ovulação); política de privacidade no app e na loja; exclusão de conta no app (5.1.1(v)); consentimento para terceiros/IA (5.1.2(i)); UGC com filtro, denúncia, bloqueio e contato (1.2); privacy labels + `PrivacyInfo.xcprivacy`.
- **Google Play:** Health apps declaration; política em URL pública; frase "not a medical device and does not diagnose, treat, cure, or prevent any medical condition"; Data safety coerente; exclusão no app e na web.

## Palavras
| Seguro | Arriscado |
|---|---|
| registrar, acompanhar | diagnosticar, detectar |
| "a vovó notou um padrão" | "você tem", "sinal de doença" |
| "janela fértil estimada" | "dias seguros" |
| "converse com seu médico" | "tratamento", "cura" |
| "fora do seu padrão habitual" | "normal/anormal", "precisa de cuidado", nota /10 |
| "calendário do Ministério/OMS (fonte, data)" | "seu filho está atrasado" |
| "um critério comum é…" + "ligue para sua maternidade" | "vá ao hospital agora" calculado pelo app |

**Disclaimer modelo:** "O grandma.app é uma ferramenta de registro e informação. Não é um dispositivo médico, não diagnostica, não trata e não previne nenhuma condição, nem substitui orientação profissional. As estimativas de ciclo e fertilidade não servem como método contraceptivo. Em caso de dúvida ou sintomas, procure um profissional de saúde. Em emergência, ligue para o serviço local."

## Risco por funcionalidade
| Feature | Risco | Mitigação |
|---|---|---|
| Janela fértil / ovulação | Média | "estimativa para quem quer engravidar"; "não é contraceptivo" |
| Contrações | Média | Regra como informação estática + "ligue para sua maternidade" |
| Percentis de crescimento | Média | Posição na curva com fonte OMS; sem rótulo; "converse com o pediatra" |
| Febre / temperatura | Alta | Só registrar; aviso fixo de fonte oficial |
| Vacinas por país | Baixa | Fonte e data; lembretes, sem "atrasado" |
| Scores e "needs care" | Alta | Contagens e tendências neutras |
| Menopausa / TRH | Média | Registrar + relatório; sem recomendar terapia |
| Chat IA | Alta | Manter off até consentimento, filtros de emergência, DPA sem treino |
| Comunidade | Média | Denúncia, bloqueio, moderação, aviso "experiência pessoal" |
| Care Circle | Média | Convite com consentimento, permissões por categoria, revogação, log |
| PDF para o médico | Baixa | "dados informados pelo usuário" |

## Privacidade
- GDPR art. 9 / LGPD art. 11: consentimento explícito; DPIA antes do lançamento; encarregado (DPO).
- FTC Health Breach Notification Rule (desde 29/jul/2024): compartilhar com anunciante conta como violação.
- WA My Health My Data Act: opt-in para coletar, consentimento separado para compartilhar, política própria.
- Pós-Dobbs: minimizar dados, sem SDK de ads, retenção curta, política para pedido judicial, PIN/Face ID (já existe app lock) e considerar modo só local para ciclo/gravidez.

## Fontes
- Apple: https://developer.apple.com/app-store/review/guidelines/
- Google Play: https://support.google.com/googleplay/android-developer/answer/16679511
- FDA 2026: https://www.ropesgray.com/en/insights/alerts/2026/01/fda-adapts-with-the-times-on-digital-health-updated-guidances-on-general-wellness-products
- MDCG 2019-11: https://health.ec.europa.eu/system/files/2020-09/md_mdcg_2019_11_guidance_en_0.pdf
- MHRA: https://cms.law/en/gbr/legal-updates/MHRA-releases-updated-guidance-on-medical-device-software-and-apps
- ANVISA RDC 657: https://bibliotecadigital.anvisa.gov.br/jspui/bitstream/anvisa/16043/1/perguntas-respostas-rdc-657-de-2022-v1-01-09-2022.pdf
- FTC HBNR: https://www.ftc.gov/news-events/news/press-releases/2024/04/ftc-finalizes-changes-health-breach-notification-rule
- FTC × Flo: https://www.ftc.gov/news-events/news/press-releases/2021/06/ftc-finalizes-order-flo-health-fertility-tracking-app-shared-sensitive-health-data-facebook-google
- Natural Cycles: https://www.statnews.com/2018/08/10/fda-clears-natural-cycles-app/
- WA MHMDA: https://app.leg.wa.gov/RCW/default.aspx?cite=19.373&full=true
