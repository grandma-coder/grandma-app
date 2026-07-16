# Flo Health Assistant — Benchmark Study
**18 screens documenting Flo's AI chatbot architecture for women's health.**

---

## Screen #185 — Messages Hub / Topic List
- **Purpose:** Entry point to AI health conversations — displays queued conversation topics with mode-specific sticker icons.
- **Text inventory:** "Messages", "Digestive health" (Let's discuss causes and relief...), "It's ovulation time" (Let's look at signs...), "Luteal phase" (Let's look at what happens...), "Sex check-in" (Let's talk about chances...), timestamps (2:59 PM, 2:53 PM, etc.), tab bar: Today, Insights, Secret Chats, Messages (active), Partner.
- **UI structure:** Topic cards with left-aligned circular sticker icon (gut = pink intestine, ovulation = cycle ring, luteal = cycle ring, sex = heart), title, subtitle (2 lines), right-aligned timestamp + pink dot (unread indicator). Chat list scroll. Bottom tab bar with icons.
- **Flow & logic:** Pre-scripted conversation topics curated by Flo, not user-initiated. Each topic links to a canned chat tree. Unread indicator (pink dot) shows new conversations. Topics appear to refresh based on cycle phase / logged data.

---

## Screen #186 — Bloating Topic Warm-up
- **Purpose:** Transition between topic selection and chat initialization.
- **Text inventory:** "Hi 😊", "Let's see if there's reason to worry about bloating ❤️ that you logged."
- **UI structure:** Chat interface with Flo bot avatar (pink speech bubble icon). Bot message in light gray bubble, user emoji response. Pink "OK" pill button below.
- **Flow & logic:** Conversational setup: bot acknowledges logged symptom (bloating) and proposes assessment. User confirms via pill button to enter questionnaire.

---

## Screen #187 — Loading State
- **Purpose:** Placeholder during bot response generation.
- **Text inventory:** (none visible)
- **UI structure:** Three-dot loading indicator in gray bubble (animated).
- **Flow & logic:** Brief pause between user action and next bot message or form render.

---

## Screen #190 — Diagnostic Cramps Chat with Context
- **Purpose:** Bot delivers differential diagnosis (cycle vs. other causes) based on logged cramps symptom.
- **Text inventory:** "Hello! Flo Health Assistant here 👋", "I see you've logged cramps.", "These could be related to your cycle, as you're in your predicted fertile window (when ovulation happens). Or they could be a sign of something else that needs attention.", "Want to check your symptoms and find out?"
- **UI structure:** Stacked bot messages in gray bubbles, natural language conversational format. Pink "Yes, please" pill button.
- **Flow & logic:** Rule-driven triage: bot reads logged symptom + cycle phase (fertile window) and surfaces differential diagnosis to guide self-assessment. Offers explicit choice to continue.

---

## Screen #191 — Medical Disclaimer & Credentials
- **Purpose:** Legal/safety gate before starting self-assessment; establishes expert authority.
- **Text inventory:** "LOWER ABDOMINAL PAIN", "Start self-assessment", expert photo + "Created in collaboration with Barbara Levy, MD, Clinical Professor of OB-GYN, George Washington University, USA", "This self-assessment checks your signs and symptoms against the most common possible causes of lower abdominal pain. Flo does not cover every possible cause.", "Read before starting", warning triangle icon + "This self-assessment is not a substitute for professional medical advice, diagnosis, or treatment. Understand this tool" (link in pink), "About this chat" (disclosure icon + chevron), "Have a read of the info above and let me know if you understand and accept it.", pink "I understand and accept" pill button.
- **UI structure:** Card design with heading, expert credential block (small photo + text), bold medical disclaimer, warning alert (triangle icon + pink link), collapsible disclosure, user acknowledgement request, large pill CTA.
- **Flow & logic:** Explicit informed consent gate. Flo positions tool as credible (named MD) but non-binding (not a substitute for medical advice). Card also surfaces "About this chat" disclosure — secondary-tier legal detail via expandable.

---

## Screen #192 — "About" Disclosure Panel
- **Purpose:** Detailed scope & safety guidance for lower abdominal pain assessment.
- **Text inventory:** Illustration (woman holding abdomen), "About our lower abdominal pain chat", "What will it cover?", (anatomy definition), "This interactive chat will help you understand if you're experiencing any signs and symptoms found in medical research for:", (list of 5 conditions: dysmenorrhea, mittelschmerz, endometriosis, ovarian cysts/uterine fibroids, adenomyosis), (continues...)
- **UI structure:** Full-screen disclosure with hero illustration, text hierarchy (title → question → body), bulleted condition list (pink bullet circles), structured content scrollable.
- **Flow & logic:** Educational preamble: sets scope (covers 5 specific conditions, not "everything"), grounds authority in "medical research", uses precise medical terminology. Precedes self-assessment questionnaire.

---

## Screen #193 — Disclosure Continuation (Red Flags)
- **Purpose:** Second page of "About" — escalation criteria.
- **Text inventory:** (previous content), "Lasts more than a couple of hours", "Happens outside your period", "Gets progressively worse", "Seek immediate medical help if, in addition to abdominal pain, you experience any of the following:", (7 red flags: fever >98.6F, excessive sweating, severe headache/dizziness, heavy period/bleeding outside period, nausea/vomiting, blood in vomit/stool/urine, increased heart rate), "This chat will also not be as helpful if you are currently going through perimenopause (the transition to menopause).", "Learn more", pink links "About Flo Health Assistant", "Privacy policy".
- **UI structure:** Continued disclosure scroll, bulleted warning signs (red pink bullets), footer "Learn more" links.
- **Flow & logic:** Explicit red-flag escalation language. Teaches user when to seek ER care. Narrows scope (perimenopause exclusion). Provides footer exit paths to learn more / privacy.

---

## Screen #194 — Consent Restate in Chat
- **Purpose:** Re-confirm user understanding before questionnaire begins.
- **Text inventory:** (footer of disclaimer card visible), "common possible causes of lower abdominal pain. Flo does not cover every possible cause.", "Read before starting", warning icon + "This self-assessment is not a substitute for professional medical advice, diagnosis, or treatment. Understand this tool" (pink link), "About this chat" (icon + chevron), "Have a read of the info above and let me know if you understand and accept it.", pink "I understand and accept" pill button (clicked), "I'll do my best to make you feel comfortable during the questionnaire. If you find these questions too personal, you can always leave the chat by pressing the exit button ❤️"
- **UI structure:** Chat bubble continuation after button press. Bot acknowledges consent + adds empathetic opt-out message.
- **Flow & logic:** Conversational reiteration of consent gate + reassurance that user can exit anytime (reduce friction, increase trust).

---

## Screen #195 — Symptom Location Picker
- **Purpose:** First diagnostic question — localize pain to narrow differential.
- **Text inventory:** "First, we need to pinpoint the issue.", "Please select the location of the pain. Is it on the right side, the left side, or in the middle? Or is it the entire lower abdomen?", "Lower right side", "Lower left side", "Lower middle area", "Entire lower abdomen", "None of the above", pink "Send" pill button.
- **UI structure:** Bot question in bubble, illustrated female body diagram (4 versions showing pain highlight by location), circular radio buttons (one selected = pink filled), text labels under each body diagram, "None of the above" option, pink Send CTA.
- **Flow & logic:** Visual + textual multi-choice. Diagram removes ambiguity (what is "lower left"?). Radio-only format (single select, not checkboxes — single location focus). Enforces answer before Send.

---

## Screen #196 — Pain Quality & Radiation
- **Purpose:** Second diagnostic question — characterize pain and check for referred pain patterns.
- **Text inventory:** "How would you describe the pain?", user selects "Cramping pain" (pink bubble), illustration showing body pain radiation map with arrows (lower back, bottom, thigh, leg), "Does the pain spread anywhere? (you can select more than one option)", "To the lower back" (checkmark selected), "To the rectum", "To the thigh(s) or leg(s)", "It doesn't spread", pink "Send" pill button.
- **UI structure:** Bot question, quick-reply pill for pain descriptor (cramping selected in pink), secondary illustration showing referred pain zones, multi-select checkboxes (lower back checked), pink Send.
- **Flow & logic:** Branching: pain type (quality) question followed by pain radiation (spread) question. Illustration teaches user anatomy. Multi-select checkboxes for radiation (common to have multiple referred sites). Checkmark visual confirms selection.

---

## CHECKPOINT — 10 screens complete
Initial document created with screens 185–196. Next: read remaining 8 screens (197–203, 279), append detailed documentation, and synthesize findings.

---

## Screen #197 — Final Disclaimer Gate
- **Purpose:** Second consent layer after questionnaire completion — restate non-diagnosis liability before results.
- **Text inventory:** Warning triangle icon + "The results of this questionnaire are not professional medical advice, diagnosis or treatment", (3-paragraph disclaimer: informational only, Flo not licensed, untested accuracy, never disregard medical advice, delay treatment warning, only doctors diagnose, call emergency if medical emergency, Flo doesn't endorse tests/products), pink "I accept. Let's continue" pill button.
- **UI structure:** Yellow alert card (light beige background) with prominent warning icon, multi-paragraph legal text, pink CTA.
- **Flow & logic:** Second gate after collecting data. Reinforces that Flo is not a diagnosis engine — it surfaces possibilities, not conclusions. User must re-confirm acceptance to see results.

---

## Screen #198 — Results Summary + Satisfaction Survey
- **Purpose:** Deliver assessment result and collect feedback on chat quality.
- **Text inventory:** (previous disclaimer visible), "Whatever the cause, if your symptoms prevent you from doing regular activities, a doctor can properly diagnosis you and recommend appropriate treatment.", "I'd love to know how I'm doing, so I have one last question for you.", "How satisfied were you with this chat?", 5-point scale (Extremely dissatisfied → Extremely satisfied), "Skip" option (gray), pink "Send" pill button.
- **UI structure:** Stacked bot messages, satisfaction scale with circular radio buttons (one selected = pink filled), Skip link, Send CTA.
- **Flow & logic:** Satisfaction metric collected at end (NPS-like). Skip option reduces friction. Feedback loop: helps Flo team tune next iterations.

---

## Screen #199 — Post-Survey Engagement
- **Purpose:** After satisfaction response, engage user to continue logging and offer future personalized insights.
- **Text inventory:** (previous messages), user selects "Extremely satisfied", pink bubble reply, checkmark icon + "Keep logging your symptoms and moods in Flo, and I'll come offer you personalized insights.", user: "I'll keep that in mind 🤔", bot: ❤️ "Thanks for your time!"
- **UI structure:** Chat continuation with bot suggestion (checkmark item), user quick-reply (pink pill), bot closing gratitude.
- **Flow & logic:** Conversion hook: connect self-assessment back to logging (habit loop). Promise of insights if user keeps data fresh. Warm closing to increase return engagement.

---

## Screen #200 — Chat Selector / Topic Menu
- **Purpose:** After chat exit, offer user choice of new assessment topics.
- **Text inventory:** "Start a new chat", topic cards: "Sex check-in" (heart icon, Let's talk about chances of conceiving..., Typically 3–6 min), "Cramps" (pain icon, Let's discuss causes..., 3–6 min), "Headaches" (lightning icon, Let's discuss causes and tips..., 3–6 min), "Acne" (face icon, Let's discuss causes and skincare..., 3–6 min), "Mental health" (brain icon, You're not alone..., 3–6 min), "Polycystic ovary syndrome" (ovary icon, Let's work out whether your signs..., 3–6 min).
- **UI structure:** Modal/sheet with title, scrolling vertical list of topic cards, each with icon, title, description, time estimate, right-facing chevron. Topics grouped by symptom/condition.
- **Flow & logic:** Carousel of canned chat topics, all discoverable in one sheet. Time estimate sets expectation (3–6 min = low friction). Each topic has a unique sticker icon + color for visual differentiation. Encourages re-engagement via topic variety.

---

## Screen #201 — Topic Continuation + Upsell
- **Purpose:** Show more topic options and establish trust/expertise claim.
- **Text inventory:** (continued topics), "Polycystic ovary syndrome", "Endometriosis", (illustration: diverse woman with 5 floating sticker icons around her), "Support and guidance anytime", "All chats are made with medical experts and available when you need them.", black "How Assistant works" pill button.
- **UI structure:** Topic list continues, hero illustration (woman + sticker bubbles), trust statement, secondary CTA to learn more about the assistant.
- **Flow & logic:** Reinforce expert credibility (medical experts made chats). Illustration humanizes the product. "How Assistant works" is a deep-dive into the chatbot's design, separate from symptom chats.

---

## Screen #202 — "How Assistant Works" Educational Panel
- **Purpose:** Explain Flo Health Assistant's design philosophy and limitations.
- **Text inventory:** "How Assistant works", pink chat bubble icon, "Flo Health Assistant", "Flo Health Assistant is a chatbot — a friendly interactive tool you can chat with. This means the responses are automated and aren't coming from a real person.", bold "This chatbot is not a medical device.", (2 paragraphs: offers knowledge and person-specific info filtered intelligently; untested accuracy → not professional diagnosis; can help proactively monitor health (checking symptoms, offering info, providing personalized reports); can help you understand body better, ask right questions, have better conversations with healthcare provider), "Your data is stored securely.", (reassurance + pink "Learn more" link).
- **UI structure:** Full-screen modal with title, large icon, bold claim, multi-paragraph educational text, bold section headings, links to secondary resources.
- **Flow & logic:** Transparent positioning: chatbot ≠ medical device. Defines use cases (monitoring, education, conversation prep) vs. disallowed use case (diagnosis). Data security assurance (compliance signal). All "Learn more" links are optional deep-dives.

---

## Screen #203 — Dark Mode Messages Hub
- **Purpose:** Same as #185 but dark theme.
- **Text inventory:** (identical to #185, now displayed in dark theme), "Messages", 4 topic cards listed, timestamps, tab bar.
- **UI structure:** Dark background (charcoal), light text, pink sticker icons pop. Topic cards have dark-mode surface color, gray text. Same layout.
- **Flow & logic:** Demonstrates dark theme parity — no content changes, only theme inversion. Accessibility consideration.

---

## Screen #279 — Messages Hub (Session 2)
- **Purpose:** Same topic list but at a later session — shows conversation persistence and state.
- **Text inventory:** "Messages", "Luteal phase" (top, 2:40 PM, unread dot), "Sex check-in" (2:37 PM, unread dot), "Digestive health" (3:21 PM, subtitle: "When you're ready, let's finish your self-assessment together."), tab bar.
- **UI structure:** Topic cards, some marked unread (pink dot), one has continuation CTA in subtitle (digestive health is in-progress, user can resume).
- **Flow & logic:** Session persistence. Digestive health chat is paused (user exited mid-assessment). On re-entry, Flo offers to resume from where user left off. Unread dots indicate new conversations ready to explore.

---

## Synthesis

### Conversation Architecture
Flo's Health Assistant uses **pre-scripted, templated conversation flows** (not generative AI). Each topic (sex check-in, cramps, headaches, PCOS, endometriosis) is a canned questionnaire tree. Topics are curated from logged symptoms and cycle phase, then presented as a topic list ("Messages" hub). Users choose a topic, consent to a disclaimer, answer 4–6 diagnostic questions (visual + text), rate satisfaction, and exit. The bot guides users through a linear, branching questionnaire with visual aids (body diagrams, pain radiation maps) and natural-language framing (empathetic messages, reassurance that they can exit anytime).

### Medical Safety & Liability Strategy
Flo deploys **three-layer legal protection**: (1) Pre-questionnaire disclaimer + expert credibility (named MD co-author), (2) explicit scope disclosure (covers 5 conditions, not all causes), (3) red-flag escalation (when to call ER), (4) post-questionnaire disclaimer restating non-diagnosis claim, (5) "How Assistant Works" page explaining chatbot ≠ medical device. All disclaimers emphasize Flo is informational only, untested accuracy, never delay medical advice. Liability language is front-loaded, not buried.

### Engagement Mechanics
1. **Topic discovery:** Messages hub surfaces timely topics based on logged data (symptoms, cycle phase). Each topic has a sticker icon, friendly description, and time estimate (3–6 min) to lower friction.
2. **Data feedback loop:** Post-chat, bot prompts user to keep logging: "Keep logging your symptoms and moods in Flo, and I'll come offer you personalized insights." Ties self-assessment back to habit logging.
3. **Session persistence:** Unfinished chats can be resumed. In-progress topics stay unread (pink dot) so users return to finish.
4. **Satisfaction collection:** NPS-like scale at chat end, with skip option to reduce friction.

### Comparison to Guru Grandma (Grandma.app)
Grandma uses **generative AI** (Claude Sonnet) for open-ended conversation across 24 pillar topics (nutrition, exercise, partner relationship, etc.) in 3 journey modes (pre-pregnancy, pregnancy, kids). Flo is **templated questionnaires** for symptom triage in 1 mode (women's reproductive health). 

**Key differences:**
- **Scope:** Flo = narrow triage (5–8 specific conditions). Grandma = broad pillar guidance (career, partner, nutrition, etc.).
- **Conversation type:** Flo = questionnaire (structured, branching). Grandma = open-ended chat (user-driven topics).
- **Medical positioning:** Flo = non-diagnosis liability statements throughout. Grandma = wellness + expert guidance (not medical diagnosis).
- **Content delivery:** Flo = visual diagnostics (body maps, multi-choice UI). Grandma = conversational, text-heavy advice.
- **Reusability:** Flo's templated chats are repeatable & low-cost. Grandma's generative model is flexible but requires LLM API calls.

**Worth stealing:** Flo's **three-layer liability strategy** is tighter than Grandma's current "not medical advice" footer. Flo's **topic discovery hub** (curated by logged data) + **time estimates** keep users engaged. Flo's **visual diagnostics** (body diagrams) reduce ambiguity in symptoms. Grandma could add a "resume paused chat" indicator (like Flo's unread dots) to boost session persistence.